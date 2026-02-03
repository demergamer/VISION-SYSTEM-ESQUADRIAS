import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Upload, Loader2, Image as ImageIcon, FileText, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from "@/lib/utils";

export default function ChequeForm({ cheque, clientes = [], onSave, onCancel }) {
  const { data: todosCheques = [] } = useQuery({
    queryKey: ['cheques'],
    queryFn: () => base44.entities.Cheque.list()
  });

  const [formData, setFormData] = useState(cheque || {
    numero_cheque: '',
    banco: '',
    agencia: '',
    conta: '',
    emitente: '',
    emitente_cpf_cnpj: '',
    cliente_codigo: '',
    cliente_nome: '',
    valor: '',
    data_emissao: '',
    data_vencimento: '',
    status: 'normal',
    observacao: '',
    // Novos campos de anexo (Arrays de URLs)
    anexo_fotos_cheque: [], // Foto real frente/verso
    anexo_microfilmagem: [], // Microfilmagem frente/verso
    anexo_devolucao: [], // Print devolução/extrato
    // Mantendo compatibilidade com antigos se houver
    anexo_video_url: null 
  });

  const [uploading, setUploading] = useState({ fotos: false, micro: false, dev: false, video: false });
  const [isDragging, setIsDragging] = useState(false);

  // --- HANDLERS DE DADOS ---
  const handleClienteChange = (codigoCliente) => {
    const cliente = clientes.find(c => c.codigo === codigoCliente);
    setFormData({
      ...formData,
      cliente_codigo: codigoCliente,
      cliente_nome: cliente?.nome || '',
      emitente: formData.emitente || cliente?.nome || '',
      emitente_cpf_cnpj: formData.emitente_cpf_cnpj || cliente?.cnpj || ''
    });
  };

  const handleSave = () => {
    // Validação de duplicidade
    if (!cheque) {
      const duplicado = todosCheques.find(c => 
        c.banco === formData.banco && 
        c.agencia === formData.agencia && 
        c.conta === formData.conta && 
        c.numero_cheque === formData.numero_cheque
      );

      if (duplicado) {
        toast.error('Cheque já cadastrado!', {
          description: `Cheque #${duplicado.numero_cheque} do cliente ${duplicado.cliente_nome}`
        });
        return;
      }
    }
    
    onSave(formData);
  };

  // --- HANDLERS DE UPLOAD ---
  const handleUpload = async (tipo, files) => {
    if (!files || files.length === 0) return;

    setUploading(prev => ({ ...prev, [tipo]: true }));
    
    try {
      const uploadPromises = Array.from(files).map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);

      const fieldMap = {
        'fotos': 'anexo_fotos_cheque',
        'micro': 'anexo_microfilmagem',
        'dev': 'anexo_devolucao',
        'video': 'anexo_video_url' // Vídeo é único por enquanto
      };

      const field = fieldMap[tipo];

      if (tipo === 'video') {
          setFormData(prev => ({ ...prev, [field]: newUrls[0] }));
      } else {
          // Garante que seja array e adiciona
          const current = Array.isArray(formData[field]) ? formData[field] : (formData[field] ? [formData[field]] : []);
          setFormData(prev => ({ ...prev, [field]: [...current, ...newUrls] }));
      }

      toast.success(`${files.length} arquivo(s) anexado(s)!`);
    } catch (error) {
      toast.error('Erro ao enviar arquivos');
      console.error(error);
    } finally {
      setUploading(prev => ({ ...prev, [tipo]: false }));
    }
  };

  const removeAnexo = (tipo, index) => {
      const fieldMap = {
        'fotos': 'anexo_fotos_cheque',
        'micro': 'anexo_microfilmagem',
        'dev': 'anexo_devolucao'
      };
      const field = fieldMap[tipo];
      const current = [...(formData[field] || [])];
      current.splice(index, 1);
      setFormData({ ...formData, [field]: current });
  };

  // --- DRAG AND DROP ---
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      setIsDragging(false);
      // Por padrão joga nas fotos reais se arrastar solto na tela
      const files = e.dataTransfer.files;
      if (files?.length > 0) handleUpload('fotos', files);
  };

  // --- COMPONENTE SLOT DE ANEXO ---
  const AnexoSlot = ({ tipo, label, icon: Icon, files, single = false }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Lista de Arquivos Já Anexados */}
      {single && files ? (
          <div className="relative group mb-2">
             <a href={files} target="_blank" rel="noopener noreferrer" className="block p-3 border rounded-lg bg-slate-50 hover:bg-blue-50 transition flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-600" /> <span className="text-sm truncate max-w-[200px]">Vídeo Anexado</span>
             </a>
             <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-6 w-6 text-red-500 hover:bg-red-100" onClick={() => setFormData({...formData, anexo_video_url: null})}>
                <Trash2 className="w-3 h-3" />
             </Button>
          </div>
      ) : (
          files && files.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-2">
                {files.map((url, idx) => (
                    <div key={idx} className="relative group">
                        <img src={url} className="w-full h-20 object-cover rounded-lg border" alt="Anexo" />
                        <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAnexo(tipo, idx)}>
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                ))}
            </div>
          )
      )}

      {/* Botão de Upload */}
      <label className={cn(
        "flex flex-col items-center justify-center gap-1 h-20 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
        uploading[tipo] ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50"
      )}>
        {uploading[tipo] ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : <Icon className="w-5 h-5 text-slate-400" />}
        <span className="text-xs font-medium text-slate-600 text-center">
          {uploading[tipo] ? 'Enviando...' : 'Adicionar'}
        </span>
        <input 
            type="file" 
            accept={tipo === 'video' ? "video/*" : "image/*,.pdf"} 
            multiple={!single} 
            onChange={(e) => handleUpload(tipo, e.target.files)} 
            className="hidden" 
            disabled={uploading[tipo]} 
        />
      </label>
    </div>
  );

  return (
    <div 
        className="space-y-6 relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      {/* Overlay de Drag & Drop */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-blue-500 border-dashed rounded-xl flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
                <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold text-slate-800">Solte as Fotos Aqui</h3>
                <p className="text-slate-500">Serão adicionadas como "Foto Real"</p>
            </div>
        </div>
      )}

      {/* DADOS BANCÁRIOS */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Número do Cheque *</Label>
          <Input value={formData.numero_cheque} onChange={(e) => setFormData({ ...formData, numero_cheque: e.target.value })} />
        </div>
        <div>
          <Label>Banco *</Label>
          <Select value={formData.banco} onValueChange={(v) => setFormData({ ...formData, banco: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {['ITAÚ', 'BRADESCO', 'SANTANDER', 'BANCO DO BRASIL', 'CAIXA', 'NUBANK', 'INTER', 'C6', 'SICOOB', 'SICREDI'].map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
              <SelectItem value="OUTROS">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div><Label>Agência</Label><Input value={formData.agencia} onChange={(e) => setFormData({ ...formData, agencia: e.target.value })} /></div>
        <div><Label>Conta</Label><Input value={formData.conta} onChange={(e) => setFormData({ ...formData, conta: e.target.value })} /></div>
      </div>

      {/* DADOS DO CLIENTE / EMITENTE */}
      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <Label>Cliente Vinculado *</Label>
            <Select value={formData.cliente_codigo} onValueChange={handleClienteChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                {clientes.map(c => (<SelectItem key={c.id} value={c.codigo}>{c.nome}</SelectItem>))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Emitente (se diferente)</Label><Input value={formData.emitente} onChange={(e) => setFormData({ ...formData, emitente: e.target.value })} placeholder="Nome no cheque" /></div>
            <div><Label>CPF/CNPJ Emitente</Label><Input value={formData.emitente_cpf_cnpj} onChange={(e) => setFormData({ ...formData, emitente_cpf_cnpj: e.target.value })} placeholder="000.000.000-00" /></div>
          </div>
      </div>

      {/* VALORES E DATAS */}
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} /></div>
        <div><Label>Emissão</Label><Input type="date" value={formData.data_emissao} onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })} /></div>
        <div><Label>Vencimento (Bom Para) *</Label><Input type="date" value={formData.data_vencimento} onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })} /></div>
      </div>

      {/* STATUS */}
      <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                <SelectItem value="normal">Normal (Em Carteira)</SelectItem>
                <SelectItem value="compensado">Compensado</SelectItem>
                <SelectItem value="devolvido">Devolvido</SelectItem>
                <SelectItem value="pago">Pago (Resgatado)</SelectItem>
                <SelectItem value="repassado">Repassado</SelectItem>
                </SelectContent>
            </Select>
          </div>
          {formData.status === 'devolvido' && (
              <div><Label>Motivo Devolução</Label><Input value={formData.motivo_devolucao} onChange={(e) => setFormData({...formData, motivo_devolucao: e.target.value})} placeholder="Ex: Alínea 11" /></div>
          )}
      </div>

      {/* ÁREA DE ANEXOS (3 TIPOS + VÍDEO) */}
      <div className="space-y-2">
          <Label className="font-bold text-slate-700">Anexos e Documentos</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AnexoSlot tipo="fotos" label="Foto Real (Frente/Verso)" icon={ImageIcon} files={formData.anexo_fotos_cheque} />
              <AnexoSlot tipo="micro" label="Microfilmagem" icon={FileText} files={formData.anexo_microfilmagem} />
              <AnexoSlot tipo="dev" label="Print Devolução" icon={FileText} files={formData.anexo_devolucao} />
              <AnexoSlot tipo="video" label="Vídeo" icon={Video} files={formData.anexo_video_url} single={true} />
          </div>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} rows={3} placeholder="Informações adicionais..." />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
        <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" /> {cheque ? 'Atualizar' : 'Cadastrar'} Cheque</Button>
      </div>
    </div>
  );
}