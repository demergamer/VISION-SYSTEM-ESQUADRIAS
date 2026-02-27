import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Clock, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        base44.auth.me().then(user => setCurrentUser(user)).catch(console.error);
    }, []);

    const { data: mensagens = [], isLoading } = useQuery({
        queryKey: ['chat_mensagens'],
        queryFn: async () => {
            const todas = await base44.entities.Mensagem.list('-created_date', 100);
            return todas.reverse(); 
        },
        enabled: !!currentUser
    });

    const mensagensDoChat = mensagens.filter(m => {
        if (!currentUser) return false;
        const isAdmin = currentUser.email.includes('admin') || currentUser.email === 'diretoria@jcesquadrias.com';
        if (isAdmin) return true; 
        return m.remetente_email === currentUser.email || m.destinatario_email === currentUser.email || m.destinatario_email === 'todos';
    });

    const unreadCount = mensagensDoChat.filter(m => !m.lida && m.remetente_email !== currentUser?.email).length;

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            if (unreadCount > 0) {
                const marcarLidas = mensagensDoChat
                    .filter(m => !m.lida && m.remetente_email !== currentUser?.email)
                    .map(m => base44.entities.Mensagem.update(m.id, { lida: true }));
                
                Promise.all(marcarLidas).then(() => queryClient.invalidateQueries({ queryKey: ['chat_mensagens'] }));
            }
        }
    }, [mensagensDoChat.length, isOpen, unreadCount, queryClient, currentUser]);

    const sendMutation = useMutation({
        mutationFn: async (conteudo) => {
            const isAdmin = currentUser.email.includes('admin') || currentUser.email === 'diretoria@jcesquadrias.com';
            return base44.entities.Mensagem.create({
                conteudo,
                remetente_email: currentUser.email,
                remetente_nome: currentUser.user_metadata?.nome || currentUser.email.split('@')[0],
                destinatario_email: isAdmin ? 'todos' : 'admin@jcesquadrias.com', 
                lida: false
            });
        },
        onSuccess: () => {
            setNewMessage('');
            document.getElementById('chat-input')?.focus();
        }
    });

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMutation.mutate(newMessage.trim());
    };

    if (!currentUser) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end">
            {isOpen && (
                <div className="bg-white w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-200 flex flex-col mb-4 overflow-hidden animate-in zoom-in-95 origin-bottom-right duration-200">
                    {/* HEADER COM A NOVA MARCA: VISION MESSAGE */}
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-4 text-white flex justify-between items-center shadow-sm z-10">
                        <div>
                            <h3 className="font-extrabold text-lg flex items-center gap-2 tracking-tight">
                                <Eye className="w-5 h-5 text-blue-300" />
                                Vision Message
                            </h3>
                            <p className="text-blue-200 text-[11px] mt-0.5 font-medium flex items-center gap-1 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse block"></span>
                                Fábrica J&C Online
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex-1 bg-slate-50/50 p-4 overflow-y-auto space-y-5 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : mensagensDoChat.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full text-slate-400 text-center space-y-2">
                                <Eye className="w-10 h-10 opacity-20" />
                                <p className="text-sm">Bem-vindo ao Vision Message.<br/>Envie um "Olá" para a fábrica!</p>
                            </div>
                        ) : (
                            mensagensDoChat.map((msg, idx) => {
                                const isMe = msg.remetente_email === currentUser.email;
                                const msgDate = new Date(msg.created_date);
                                const prevMsgDate = idx > 0 ? new Date(mensagensDoChat[idx-1].created_date) : null;
                                const showDateDivider = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

                                return (
                                    <div key={msg.id || idx} className="space-y-4">
                                        {showDateDivider && (
                                            <div className="flex justify-center my-4">
                                                <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                    {format(msgDate, "dd 'de' MMMM")}
                                                </span>
                                            </div>
                                        )}
                                        <div className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                                            {!isMe && <span className="text-[10px] text-slate-500 ml-1 mb-1 font-medium">{msg.remetente_nome}</span>}
                                            <div className={cn(
                                                "px-4 py-2.5 rounded-2xl shadow-sm relative text-sm",
                                                isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                                            )}>
                                                {msg.conteudo}
                                            </div>
                                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1">
                                                <Clock className="w-3 h-3" />
                                                {format(msgDate, "HH:mm")}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-white border-t border-slate-200">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input 
                                id="chat-input"
                                placeholder="Digite sua mensagem..." 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="rounded-full bg-slate-100 border-transparent focus-visible:ring-blue-500 shadow-inner h-11"
                                disabled={sendMutation.isPending}
                                autoComplete="off"
                            />
                            <Button 
                                type="submit" 
                                size="icon" 
                                className="rounded-full bg-blue-600 hover:bg-blue-700 shrink-0 h-11 w-11 shadow-md hover:shadow-lg transition-all"
                                disabled={!newMessage.trim() || sendMutation.isPending}
                            >
                                {sendMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white ml-0.5" />}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border-2",
                    isOpen ? "bg-slate-800 border-slate-700" : "bg-blue-900 border-blue-700"
                )}
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : (
                    <div className="relative">
                        <Eye className="w-7 h-7 text-white" />
                        {unreadCount > 0 && (
                            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white border-2 border-blue-900 px-1.5 min-w-[20px] h-5 flex items-center justify-center text-[10px] rounded-full">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        )}
                    </div>
                )}
            </button>
        </div>
    );
}
