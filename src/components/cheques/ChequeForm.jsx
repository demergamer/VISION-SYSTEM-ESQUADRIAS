import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, X, Upload, Loader2, Image as ImageIcon, FileText, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from "@/lib/utils";

const BANCOS = [
  { codigo: '001', nome: 'Banco do Brasil S.A.' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '237', nome: 'Banco Bradesco S.A.' },
  { codigo: '341', nome: 'Itaú Unibanco S.A.' },
  { codigo: '033', nome: 'Banco Santander (Brasil) S.A.' },
  { codigo: '748', nome: 'Banco Cooperativo Sicredi S.A.' },
  { codigo: '756', nome: 'Banco Cooperativo do Brasil S.A. (Sicoob)' },
  { codigo: '353', nome: 'Banco Santander (Brasil) S.A. (Antigo Banco Real)' },
  { codigo: '077', nome: 'Banco Inter S.A.' },
  { codigo: '074', nome: 'Banco J. Safra S.A.' },
  { codigo: '707', nome: 'Banco Daycoval S.A.' },
  { codigo: '041', nome: 'Banrisul' },
  { codigo: '021', nome: 'Banestes' },
  { codigo: '070', nome: 'BRB - Banco de Brasília S.A.' },
  { codigo: '389', nome: 'Banco Mercantil do Brasil S.A.' },
];

function BancoCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const bancosFiltrados = BANCOS.filter(b =>
    b.nome.toLowerCase().includes(search.toLowerCase()) ||
    b.codigo.includes(search)
  );
  const bancoPorValor = BANCOS.find(b => b.codigo === value || b.nome === value);
  const displayLabel = bancoPorValor ? `${bancoPorValor.codigo} - ${bancoPorValor.nome}` : (value || 'Selecione o banco');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between h-10 font-normal">
          <span className="truncate">{displayLabel}</span>
          <span className="ml-2 text-slate-400">▼</span>
        </Button>
      </PopoverTrigger>
      {/* 🚀 CORREÇÃO 2: z-[99999] garante que a lista de bancos não fique atrás do modal */}
      <PopoverContent className="w-72 p-0 z-[99999]" align="start">
        <div className="p-2 border-b">
          <Input placeholder="Buscar banco..." value={search} onChange={e => setSearch(e.target.value)} autoFocus className="h-8" />
        </div>
        <div className="max-h-52 overflow-y-auto">
          {bancosFiltrados.map(b => (
            <button key={b.codigo} type="button" className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${value === b.codigo || value === b.nome ? 'bg-blue-50 text-blue-700 font-medium' : ''}`} onClick={() => { onChange(b.codigo); setOpen(false); setSearch(''); }}>
              <span className="font-mono text-xs text-slate-400 mr-2">{b.codigo}</span>
              {b.nome}
            </button>
          ))}
        </div>
        <div className="border-t p-2">
          <button type="button" className="w-full text-xs text-slate-500 hover:text-slate-700 py-1" onClick={() => { if (search) { onChange(search); setOpen(false); setSearch(''); } }}>
            Usar "{search || '...'}" manualmente
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ChequeForm({ cheque, clientes = [], onSave, onCancel, isLoading }) {
  const { data: todosCheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list(), enabled: !cheque });

  const [formData, setFormData] = useState(cheque || {
    numero_cheque: '', banco: '', agencia: '', conta: '', emitente: '', emitente_cpf_cnpj: '',
    cliente_codigo: '', cliente_nome: '', valor: '', data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: '', status: 'normal', observacao: '', 
    anexo_fotos_cheque: [], anexo_microfilmagem: [], anexo_devolucao: [], anexo_video_url: '',
    fornecedor_repassado_nome: '', data_compensacao: ''
  });

  const [uploading, setUploading] = useState({ fotos: false, micro: false, dev: false, video: false });

  const handleClienteChange = (codigoCliente) => {
    const cliente = clientes.find(c => c.codigo === codigoCliente);
    setFormData(prev => ({
      ...prev,
      cliente_codigo: codigoCliente,
      cliente_nome: cliente?.nome || '',
      emitente: prev.emitente || cliente?.nome || '',
      emitente_cpf_cnpj: prev.emitente_cpf_cnpj || cliente?.cnpj || ''
    }));
  };

  const handleSave = () => {
    if (!formData.numero_cheque || !formData.banco || !formData.valor || !formData.data_vencimento) {
        return toast.error("Preencha os campos obrigatórios (*)");
    }

    if (!cheque) {
      const duplicado = todosCheques.find(c => c.banco === formData.banco && c.numero_cheque === formData.numero_cheque && c.status !== 'excluido');
      if (duplicado) return toast.error(`Cheque #${duplicado.numero_cheque} já cadastrado para o cliente ${duplicado.cliente_nome}!`);
    }
    
    const dataToSave = { ...formData, valor: parseFloat(formData.valor) };
    if (dataToSave.status !== 'repassado') { dataToSave.fornecedor_repassado_nome = ''; }
    if (dataToSave.status !== 'compensado') { dataToSave.data_compensacao = ''; }
    if (dataToSave.status !== 'devolvido') { dataToSave.motivo_devolucao = ''; }

    onSave(dataToSave);
  };

  const handleUpload = async (tipo, files) => {
    if (!files || files.length === 0) return;
    setUploading(prev => ({ ...prev, [tipo]: true }));
    try {
      const uploadPromises = Array.from(files).map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);

      const fieldMap = { 'fotos': 'anexo_fotos_cheque', 'micro': 'anexo_microfilmagem', 'dev': 'anexo_devolucao', 'video': 'anexo_video_url' };
      const field = fieldMap[tipo];

      if (tipo === 'video') setFormData(prev => ({ ...prev, [field]: newUrls[0] }));
      else setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), ...newUrls] }));

      toast.success(`${files.length} arquivo(s) anexado(s)!`);
    } catch (error) { toast.error('Erro ao enviar arquivos'); } finally { setUploading(prev => ({ ...prev, [tipo]: false })); }
  };

  const removeAnexo = (tipo, index) => {
      const fieldMap = { 'fotos': 'anexo_fotos_cheque', 'micro': 'anexo_microfilmagem', 'dev': 'anexo_devolucao' };
      const field = fieldMap[tipo];
      const current = [...(formData[field] || [])];
      current.splice(index, 1);
      setFormData({ ...formData, [field]: current });
  };

  const AnexoSlot = ({ tipo, label, icon: Icon, files, single = false }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {single && files ? (
          <div className="relative group mb-2">
             <a href={files} target="_blank" rel="noopener noreferrer" className="block p-3 border rounded-lg bg-slate-50 hover:bg-blue-50 transition flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-600" /> <span className="text-sm truncate max-w-[200px]">Vídeo Anexado</span>
             </a>
             <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-6 w-6 text-red-500 hover:bg-red-100" onClick={() => setFormData({...formData, anexo_video_url: null})}><Trash2 className="w-3 h-3" /></Button>
          </div>
      ) : (
          files && files.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-2">
                {files.map((url, idx) => (
                    <div key={idx} className="relative group">
                        <img src={url} className="w-full h-20 object-cover rounded-lg border" alt="Anexo" />
                        <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAnexo(tipo, idx)}><X className="w-3 h-3" /></Button>
                    </div>
                ))}
            </div>
          )
      )}

      <label className={cn("flex flex-col items-center justify-center gap-1 h-20 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all", uploading[tipo] ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50")}>
        {uploading[tipo] ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : <Icon className="w-5 h-5 text-slate-400" />}
        <span className="text-xs font-medium text-slate-600 text-center">{uploading[tipo] ? 'Enviando...' : 'Adicionar'}</span>
        <input type="file" accept={tipo === 'video' ? "video/*" : "image/*,.pdf"} multiple={!single} onChange={(e) => handleUpload(tipo, e.target.files)} className="hidden" disabled={uploading[tipo]} />
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Número do Cheque *</Label><Input value={formData.numero_cheque} onChange={(e) => setFormData({ ...formData, numero_cheque: e.target.value })} /></div>
        <div><Label>Banco *</Label><BancoCombobox value={formData.banco} onChange={(v) => setFormData({ ...formData, banco: v })} /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div><Label>Agência</Label><Input value={formData.agencia} onChange={(e) => setFormData({ ...formData, agencia: e.target.value })} /></div>
        <div><Label>Conta</Label><Input value={formData.conta} onChange={(e) => setFormData({ ...formData, conta: e.target.value })} /></div>
      </div>

      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <Label>Cliente Vinculado *</Label>
            <Select value={formData.cliente_codigo} onValueChange={handleClienteChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                {/* 🚀 CORREÇÃO 2: z-[99999] garante que a lista de clientes não fique atrás do modal */}
                <SelectContent className="z-[99999]">{clientes.map(c => (<SelectItem key={c.id} value={c.codigo}>{c.nome}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Emitente</Label><Input value={formData.emitente} onChange={(e) => setFormData({ ...formData, emitente: e.target.value })} /></div>
            <div><Label>CPF/CNPJ</Label><Input value={formData.emitente_cpf_cnpj} onChange={(e) => setFormData({ ...formData, emitente_cpf_cnpj: e.target.value })} /></div>
          </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} /></div>
        <div><Label>Emissão</Label><Input type="date" value={formData.data_emissao} onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })} /></div>
        <div><Label>Bom Para *</Label><Input type="date" value={formData.data_vencimento} onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })} /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                {/* 🚀 CORREÇÃO 2: z-[99999] na lista de status também */}
                <SelectContent className="z-[99999]">
                <SelectItem value="normal">Normal (Em Carteira)</SelectItem>
                <SelectItem value="repassado">Repassado</SelectItem>
                <SelectItem value="devolvido">Devolvido</SelectItem>
                <SelectItem value="compensado">Compensado</SelectItem>
                </SelectContent>
            </Select>
          </div>
          
          {formData.status === 'devolvido' && (
              <div><Label>Motivo Devolução</Label><Input value={formData.motivo_devolucao || ''} onChange={(e) => setFormData({...formData, motivo_devolucao: e.target.value})} placeholder="Ex: 11, 12..." /></div>
          )}
          {formData.status === 'repassado' && (
              <div><Label>Destino (Fornecedor)</Label><Input value={formData.fornecedor_repassado_nome || ''} onChange={(e) => setFormData({...formData, fornecedor_repassado_nome: e.target.value})} placeholder="Nome do fornecedor" /></div>
          )}
          {formData.status === 'compensado' && (
              <div><Label>Destino (Depósito)</Label><Input value={formData.fornecedor_repassado_nome || ''} onChange={(e) => setFormData({...formData, fornecedor_repassado_nome: e.target.value})} placeholder="Ex: J&C ESQUADRIAS" /></div>
          )}
      </div>

      <div className="space-y-2">
          <Label className="font-bold text-slate-700">Anexos</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AnexoSlot tipo="fotos" label="Foto Cheque" icon={ImageIcon} files={formData.anexo_fotos_cheque} />
              <AnexoSlot tipo="micro" label="Microfilmagem" icon={FileText} files={formData.anexo_microfilmagem} />
              <AnexoSlot tipo="dev" label="Devolução" icon={FileText} files={formData.anexo_devolucao} />
              <AnexoSlot tipo="video" label="Vídeo" icon={Video} files={formData.anexo_video_url} single={true} />
          </div>
      </div>

      <div><Label>Observações</Label><Textarea value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} rows={2} /></div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
        <Button type="button" onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />} 
            {cheque ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </div>
  );
}
