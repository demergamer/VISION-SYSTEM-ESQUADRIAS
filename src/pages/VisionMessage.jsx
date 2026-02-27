import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSync } from "@/components/hooks/useRealtimeSync";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
    Search, Send, Paperclip, 
    Check, CheckCheck, Megaphone, Loader2, Eye, Users, ShieldAlert, Briefcase, Database, FileText
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from '@/lib/AuthContext';

export default function VisionMessage() {
    useRealtimeSync();
    
    const { user: currentUser } = useAuth(); 
    
    const [selectedContact, setSelectedContact] = useState('todos'); 
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // 🚀 ESTADOS DO ANEXO
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();

    // 1. BUSCA TODAS AS ENTIDADES
    const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
    const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
    const { data: usuarios = [] } = useQuery({ 
        queryKey: ['usuarios'], 
        queryFn: async () => {
            try { return await base44.entities.Usuario.list(); } catch(e) { return []; }
        } 
    });

    const { data: mensagens = [], isLoading: loadingMsgs, isError: tableError } = useQuery({
        queryKey: ['chat_mensagens'],
        queryFn: async () => {
            const todas = await base44.entities.Mensagem.list('-created_date', 500);
            return todas.reverse(); 
        },
        retry: false 
    });

    const { data: presencas = [] } = useQuery({
        queryKey: ['presencas_status'],
        queryFn: async () => {
            try { return await base44.entities.Presenca.list(); } catch(e) { return []; }
        }
    });

    // 2. CONSOLIDA TODOS OS CONTACTOS
    const contactsList = useMemo(() => {
        if (!currentUser) return [];
        let list = [];

        representantes.forEach(rep => {
            if (rep.email) list.push({ ...rep, id_unico: `rep_${rep.id}`, tipo: 'Representante' });
        });

        usuarios.forEach(usr => {
            if (usr.email && usr.email !== currentUser?.email) {
                list.push({ ...usr, nome: usr.nome || usr.email.split('@')[0], id_unico: `usr_${usr.id}`, tipo: 'Administração' });
            }
        });

        clientes.forEach(cli => {
            if (cli.email) {
                list.push({ ...cli, nome: cli.nome_fantasia || cli.nome, foto_url: cli.logo_url, id_unico: `cli_${cli.id}`, tipo: 'Cliente' });
            }
        });
        
        list = list.map(contact => {
            const contactMsgs = mensagens.filter(m => 
                (m.remetente_email === contact.email && m.destinatario_email !== 'todos') || 
                (m.destinatario_email === contact.email)
            );
            
            const unread = contactMsgs.filter(m => !m.lida && m.remetente_email === contact.email).length;
            const lastMsg = contactMsgs.length > 0 ? contactMsgs[contactMsgs.length - 1] : null;

            const userPresenca = presencas.find(p => p.email === contact.email);
            const isOnline = userPresenca?.status === 'online';

            return { ...contact, unread, lastMsg, isOnline }; 
        });

        if (searchTerm) {
            list = list.filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        list.sort((a, b) => {
            if (a.unread > 0 && b.unread === 0) return -1;
            if (b.unread > 0 && a.unread === 0) return 1;
            if (a.lastMsg && b.lastMsg) return new Date(b.lastMsg.created_date) - new Date(a.lastMsg.created_date);
            if (a.lastMsg && !b.lastMsg) return -1;
            if (!a.lastMsg && b.lastMsg) return 1;
            return a.nome?.localeCompare(b.nome);
        });

        return list;
    }, [representantes, usuarios, clientes, mensagens, searchTerm, currentUser, presencas]);

    const mensagensGerais = useMemo(() => mensagens.filter(m => m.destinatario_email === 'todos'), [mensagens]);

    const activeConversation = useMemo(() => {
        if (selectedContact === 'todos') return mensagensGerais;
        return mensagens.filter(m => 
            (m.remetente_email === selectedContact && m.destinatario_email !== 'todos') || 
            (m.destinatario_email === selectedContact)
        );
    }, [selectedContact, mensagens, mensagensGerais]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        
        if (selectedContact !== 'todos') {
            const mensagensParaMarcar = activeConversation.filter(m => !m.lida && m.remetente_email === selectedContact);
            if (mensagensParaMarcar.length > 0) {
                const promessas = mensagensParaMarcar.map(m => 
                    base44.entities.Mensagem.update(m.id, { lida: true })
                );
                Promise.all(promessas).then(() => queryClient.invalidateQueries({ queryKey: ['chat_mensagens'] }));
            }
        }
    }, [activeConversation.length, selectedContact, queryClient, activeConversation]);

    // 🚀 ENVIO DE MENSAGEM (AGORA COM SUPORTE A ANEXOS)
    const sendMutation = useMutation({
        mutationFn: async ({ conteudo, anexoUrl, anexoNome, anexoTipo }) => {
            return await base44.entities.Mensagem.create({
                conteudo: conteudo || (anexoUrl ? '📎 Arquivo Anexado' : ''),
                remetente_email: currentUser.email,
                remetente_nome: currentUser?.user_metadata?.nome || currentUser?.email?.split('@')[0] || 'Admin',
                destinatario_email: selectedContact, 
                lida: false,
                anexo_url: anexoUrl || null,
                anexo_nome: anexoNome || null,
                anexo_tipo: anexoTipo || null
            });
        },
        onSuccess: () => {
            setNewMessage('');
            setSelectedFile(null); // Limpa o arquivo após enviar
            document.getElementById('admin-chat-input')?.focus();
            queryClient.invalidateQueries({ queryKey: ['chat_mensagens'] });
        },
        onError: (err) => {
            toast.error(err.message || "Erro ao enviar mensagem.");
        }
    });

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        let anexoUrl = null;
        let anexoNome = null;
        let anexoTipo = null;

        // Lógica de Upload do Ficheiro
        if (selectedFile) {
            setIsUploading(true);
            try {
                const ext = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                
                // Faz o upload para o bucket
                const { error } = await base44.storage.from('chat_anexos').upload(fileName, selectedFile);
                if (error) throw error;

                // Pega a URL pública
                const { data: publicUrlData } = base44.storage.from('chat_anexos').getPublicUrl(fileName);
                anexoUrl = publicUrlData.publicUrl;
                anexoNome = selectedFile.name;
                anexoTipo = selectedFile.type.includes('image') ? 'imagem' : 'documento';
                
            } catch (err) {
                console.error("Erro no upload", err);
                toast.error("Falha ao enviar anexo. Verifique se o bucket 'chat_anexos' existe e é público.");
                setIsUploading(false);
                return; 
            }
            setIsUploading(false);
        }

        sendMutation.mutate({ 
            conteudo: newMessage.trim(), 
            anexoUrl, 
            anexoNome, 
            anexoTipo 
        });
    };

    const formatLastMsgTime = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isToday(d)) return format(d, 'HH:mm');
        if (isYesterday(d)) return 'Ontem';
        return format(d, 'dd/MM');
    };

    const getTypeIcon = (tipo) => {
        if (tipo === 'Administração') return <ShieldAlert className="w-3 h-3 text-purple-500" />;
        if (tipo === 'Cliente') return <Users className="w-3 h-3 text-amber-500" />;
        return <Briefcase className="w-3 h-3 text-blue-500" />;
    };

    if (!currentUser) return <div className="p-10 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Carregando perfil...</div>;

    if (tableError) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-80px)] bg-slate-50">
                <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 text-center max-w-lg">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Database className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Módulo Não Instalado</h2>
                    <p className="text-slate-600 mb-8">
                        A tabela <strong>Mensagem</strong> não foi encontrada no banco de dados.
                    </p>
                </div>
            </div>
        );
    }

    const activeContactData = selectedContact === 'todos' ? null : contactsList.find(c => c.email === selectedContact);

    return (
        <div className="flex h-[calc(100vh-80px)] bg-slate-100 p-4 gap-4 max-w-[1600px] mx-auto">
            
            {/* PAINEL ESQUERDO: LISTA DE CONTACTOS */}
            <div className="w-1/3 min-w-[320px] max-w-[400px] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 border-b border-slate-200 text-white">
                    <h2 className="text-xl font-black flex items-center gap-2 mb-4 tracking-tight">
                        <Eye className="w-6 h-6 text-blue-300" /> Vision Message
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Buscar contatos..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white text-slate-900 border-transparent rounded-xl focus-visible:ring-2 focus-visible:ring-blue-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* CANAL GERAL */}
                    <div 
                        onClick={() => setSelectedContact('todos')}
                        className={cn(
                            "flex items-center gap-3 p-4 cursor-pointer border-b border-slate-100 transition-colors",
                            selectedContact === 'todos' ? "bg-blue-50" : "hover:bg-slate-50"
                        )}
                    >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Megaphone className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 truncate">📢 Avisos da Diretoria</h4>
                            <p className="text-xs text-slate-500 truncate">
                                {mensagensGerais.length > 0 ? mensagensGerais[mensagensGerais.length-1].conteudo : 'Canal geral da fábrica'}
                            </p>
                        </div>
                    </div>

                    <div className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                        Todos os Contactos
                    </div>

                    {contactsList.map(contact => (
                        <div 
                            key={contact.id_unico}
                            onClick={() => setSelectedContact(contact.email)}
                            className={cn(
                                "flex items-center gap-3 p-4 cursor-pointer border-b border-slate-100 transition-colors relative",
                                selectedContact === contact.email ? "bg-blue-50" : "hover:bg-slate-50"
                            )}
                        >
                            {selectedContact === contact.email && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
                            
                            <Avatar className="w-12 h-12 shrink-0 relative">
                                {contact.foto_url ? <AvatarImage src={contact.foto_url} className="object-cover" /> : null}
                                <AvatarFallback className="bg-slate-200 text-slate-600 font-bold">
                                    {contact.nome?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                                {/* BOLINHA VERDE DE STATUS ONLINE */}
                                {contact.isOnline && (
                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></span>
                                )}
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-bold text-slate-800 truncate pr-2 flex items-center gap-1">
                                        {contact.nome}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                        {formatLastMsgTime(contact.lastMsg?.created_date)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 mb-1">
                                    {getTypeIcon(contact.tipo)}
                                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{contact.tipo}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={cn("text-xs truncate pr-2", contact.unread > 0 ? "font-bold text-slate-800" : "text-slate-500")}>
                                        {contact.lastMsg ? contact.lastMsg.conteudo : 'Clique para iniciar conversa'}
                                    </p>
                                    {contact.unread > 0 && (
                                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white shrink-0 px-1.5 min-w-[20px] h-5 flex justify-center text-[10px]">
                                            {contact.unread}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PAINEL DIREITO: CONVERSA ATIVA */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                
                {/* Header da Conversa */}
                <div className="h-[88px] bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0 shadow-sm z-10">
                    {selectedContact === 'todos' ? (
                        <>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                                <Megaphone className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Avisos da Diretoria</h3>
                                <p className="text-xs text-slate-500">Todos recebem estas mensagens</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <Avatar className="w-12 h-12 relative">
                                {activeContactData?.foto_url ? <AvatarImage src={activeContactData.foto_url} className="object-cover" /> : null}
                                <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-lg">
                                    {activeContactData?.nome?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                                {activeContactData?.isOnline && (
                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></span>
                                )}
                            </Avatar>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{activeContactData?.nome}</h3>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                    {getTypeIcon(activeContactData?.tipo)} {activeContactData?.tipo}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Área de Mensagens */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    {loadingMsgs ? (
                        <div className="flex justify-center items-center h-full text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : activeConversation.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-full text-slate-400">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                <Eye className="w-8 h-8 text-blue-300" />
                            </div>
                            <p className="font-medium text-slate-500">Nenhuma mensagem com {activeContactData?.nome || 'este contato'}.</p>
                            <p className="text-sm">Envie a primeira mensagem abaixo.</p>
                        </div>
                    ) : (
                        activeConversation.map((msg, idx) => {
                            const isMe = msg.remetente_email === currentUser?.email;
                            const msgDate = new Date(msg.created_date);
                            const prevMsgDate = idx > 0 ? new Date(activeConversation[idx-1].created_date) : null;
                            const showDateDivider = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

                            return (
                                <div key={msg.id || idx} className="space-y-4">
                                    {showDateDivider && (
                                        <div className="flex justify-center my-6">
                                            <span className="bg-white shadow-sm border border-slate-100 text-slate-500 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                                                {format(msgDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                            </span>
                                        </div>
                                    )}
                                    <div className={cn("flex flex-col max-w-[70%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                                        {selectedContact === 'todos' && !isMe && (
                                            <span className="text-[10px] text-slate-500 ml-2 mb-1 font-bold">{msg.remetente_nome}</span>
                                        )}
                                        
                                        <div className={cn(
                                            "px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed relative group flex flex-col gap-2",
                                            isMe ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                                        )}>
                                            {/* RENDERIZADOR DE ANEXOS */}
                                            {msg.anexo_url && msg.anexo_tipo === 'imagem' && (
                                                <a href={msg.anexo_url} target="_blank" rel="noopener noreferrer">
                                                    <img src={msg.anexo_url} alt="Anexo" className="max-w-full sm:max-w-[250px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity border border-black/10" />
                                                </a>
                                            )}
                                            {msg.anexo_url && msg.anexo_tipo !== 'imagem' && (
                                                <a href={msg.anexo_url} target="_blank" rel="noopener noreferrer" className={cn(
                                                    "flex items-center gap-2 p-2.5 rounded-lg transition-colors overflow-hidden",
                                                    isMe ? "bg-blue-700/50 hover:bg-blue-700/70" : "bg-slate-100 hover:bg-slate-200"
                                                )}>
                                                    <FileText className="w-6 h-6 shrink-0" />
                                                    <span className="text-sm font-medium truncate">{msg.anexo_nome || 'Baixar Arquivo'}</span>
                                                </a>
                                            )}
                                            
                                            {/* TEXTO DA MENSAGEM */}
                                            {msg.conteudo && <span>{msg.conteudo}</span>}
                                            
                                            <div className={cn(
                                                "flex items-center gap-1 mt-1 text-[10px] justify-end",
                                                isMe ? "text-blue-200" : "text-slate-400"
                                            )}>
                                                {format(msgDate, "HH:mm")}
                                                {isMe && (
                                                    msg.lida ? <CheckCheck className="w-3.5 h-3.5 text-sky-300" /> : <Check className="w-3 h-3 text-blue-300/50" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* 🚀 FOOTER COM SUPORTE A UPLOAD */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
                    
                    {/* PRÉ-VISUALIZAÇÃO DO ARQUIVO ANTES DE ENVIAR */}
                    {selectedFile && (
                        <div className="bg-white border border-blue-200 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                    <Paperclip className="w-5 h-5" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-bold text-slate-700 truncate">{selectedFile.name}</p>
                                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => setSelectedFile(null)} disabled={isUploading || sendMutation.isPending}>
                                Remover
                            </Button>
                        </div>
                    )}

                    <form onSubmit={handleSend} className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                        
                        {/* INPUT INVISÍVEL (Ativado ao clicar no Clipe) */}
                        <input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            accept="image/*,.pdf,.doc,.docx"
                        />
                        
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className={cn("rounded-xl shrink-0 transition-colors", selectedFile ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100")}
                            title="Anexar arquivo"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || sendMutation.isPending}
                        >
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        
                        <Input 
                            id="admin-chat-input"
                            placeholder={selectedContact === 'todos' ? "Escreva um aviso para todos..." : "Digite sua mensagem..."}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="border-0 shadow-none focus-visible:ring-0 px-2 h-11 text-base"
                            disabled={isUploading || sendMutation.isPending}
                            autoComplete="off"
                        />
                        
                        <Button 
                            type="submit" 
                            size="icon" 
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0 h-11 w-11 shadow-md"
                            disabled={(!newMessage.trim() && !selectedFile) || isUploading || sendMutation.isPending}
                        >
                            {(isUploading || sendMutation.isPending) ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white ml-0.5" />}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}