import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2, Save, Trash2, Upload, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, addMonths, parseISO } from "date-fns";

const CATEGORIAS = [
  { value: 'aluminio', label: '🏗️ Matéria-Prima: Alumínio' },
  { value: 'vidros', label: '💎 Matéria-Prima: Vidros' },
  { value: 'acessorios', label: '🔩 Acessórios & Ferragens' },
  { value: 'servicos_terceiros', label: '🎨 Serviços de Terceiros' },
  { value: 'manutencao', label: '🛠️ Manutenção de Maquinário' },
  { value: 'logistica', label: '🚛 Logística e Frete' },
  { value: 'administrativas', label: '🏢 Despesas Administrativas' },
  { value: 'impostos', label: '⚖️ Impostos e Taxas' },
  { value: 'folha', label: '👷 Folha de Pagamento' },
  { value: 'vale', label: '🎟️ Vale' },
  { value: 'comissoes', label: '💰 Comissões' },
];

async function gerarNumeroLancamento(empresaCodigo) {
  try {
    const todas = await base44.entities.ContaPagar.list('-numero_lancamento', 100);
    const daEmpresa = todas.filter(c => c.empresa_codigo === empresaCodigo && c.numero_lancamento);
    let proximo = 1;
    if (daEmpresa.length > 0) {
      const numeros = daEmpresa.map(c => {
        const partes = (c.numero_lancamento || '').split('-');
        return parseInt(partes[partes.length - 1]) || 0;
      });
      proximo = Math.max(...numeros) + 1;
    }
    return `${empresaCodigo}-${String(proximo).padStart(4, '0')}`;
  } catch {
    return `${empresaCodigo}-${Date.now()}`;
  }
}

export default function ContaPagarForm({ conta, fornecedores, empresas, onSave, onCancel, isLoading }) {
  const queryClient = useQueryClient();
  const [isRecorrente, setIsRecorrente] = useState(conta?.tipo_lancamento === 'recorrente' || false);
  const [isValorVariavel, setIsValorVariavel] = useState(false);
  const [showAddFornecedor, setShowAddFornecedor] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', codigo: '' });
  const [savingFornecedor, setSavingFornecedor] = useState(false);

  const [form, setForm] = useState({
    empresa_codigo: conta?.empresa_codigo || empresas?.[0]?.codigo || '',
    empresa_nome: conta?.empresa_nome || empresas?.[0]?.nome || '',
    fornecedor_codigo: conta?.fornecedor_codigo || '',
    fornecedor_nome: conta?.fornecedor_nome || '',
    descricao: conta?.descricao || '',
    observacao: conta?.observacao || '',
    valor: conta?.valor || '',
    data_vencimento: conta?.data_vencimento || '',
    status: conta?.status || 'pendente',
    categoria_financeira: conta?.categoria_financeira || 'aluminio',
    tipo_lancamento: conta?.tipo_lancamento || 'unica',
    total_parcelas: conta?.total_parcelas || 2
  });

  const [anexos, setAnexos] = useState(conta?.anexos_urls || (conta?.comprovante_url ? [conta.comprovante_url] : []));
  const [uploading, setUploading] = useState(false);

  const handleEmpresaChange = (codigo) => {
    const emp = empresas.find(e => e.codigo === codigo);
    setForm(f => ({ ...f, empresa_codigo: codigo, empresa_nome: emp?.nome || '' }));
  };

  const handleFornecedorChange = (codigo) => {
    const forn = fornecedores.find(f => f.codigo === codigo);
    setForm(f => ({ ...f, fornecedor_codigo: codigo, fornecedor_nome: forn?.nome || '' }));
  };

  const handleUploadAnexo = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file })));
      const urls = uploads.map(u => u.file_url);
      setAnexos(prev => [...prev, ...urls]);
      toast.success(`${urls.length} arquivo(s) anexado(s)!`);
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddFornecedor = async () => {
    if (!novoFornecedor.nome || !novoFornecedor.codigo) {
      toast.error('Preencha nome e código do fornecedor');
      return;
    }
    setSavingFornecedor(true);
    try {
      await base44.entities.Fornecedor.create({ nome: novoFornecedor.nome, codigo: novoFornecedor.codigo });
      setForm(f => ({ ...f, fornecedor_codigo: novoFornecedor.codigo, fornecedor_nome: novoFornecedor.nome }));
      setShowAddFornecedor(false);
      setNovoFornecedor({ nome: '', codigo: '' });
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor cadastrado!');
    } catch {
      toast.error('Erro ao cadastrar fornecedor');
    } finally {
      setSavingFornecedor(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.empresa_codigo) { toast.error('Selecione a empresa'); return; }
    if (!form.fornecedor_codigo) { toast.error('Selecione o fornecedor'); return; }

    const baseData = { ...form, anexos_urls: anexos };

    if (!isRecorrente) {
      const numero = conta?.numero_lancamento || await gerarNumeroLancamento(form.empresa_codigo);
      onSave({ ...baseData, tipo_lancamento: 'unica', numero_lancamento: numero });
      return;
    }

    // Recorrente: criar N parcelas
    const grupoId = `REC-${Date.now()}`;
    const valorParcela = parseFloat(form.valor) || 0;
    const totalParcelas = parseInt(form.total_parcelas) || 2;
    const dataBase = parseISO(form.data_vencimento);

    const parcelas = [];
    for (let i = 1; i <= totalParcelas; i++) {
      const numero = await gerarNumeroLancamento(form.empresa_codigo);
      parcelas.push({
        ...baseData,
        tipo_lancamento: 'recorrente',
        recorrencia_grupo_id: grupoId,
        parcela_numero: i,
        total_parcelas: totalParcelas,
        valor: (i === 1 || !isValorVariavel) ? valorParcela : 0,
        status: (i === 1 || !isValorVariavel) ? 'pendente' : 'pendente_preenchimento',
        data_vencimento: format(addMonths(dataBase, i - 1), 'yyyy-MM-dd'),
        numero_lancamento: numero
      });
    }

    try {
      await base44.entities.ContaPagar.bulkCreate(parcelas);
      toast.success(`${totalParcelas} parcelas criadas!`);
      onCancel();
    } catch {
      toast.error('Erro ao criar recorrência');
    }
  };

  return (
    <>
      {showAddFornecedor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Cadastro Rápido de Fornecedor</h3>
              <Button type="button" size="icon" variant="ghost" onClick={() => setShowAddFornecedor(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={novoFornecedor.nome} onChange={e => setNovoFornecedor(f => ({ ...f, nome: e.target.value }))} placeholder="Razão Social / Nome Fantasia" autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Código / CNPJ *</Label>
                <Input value={novoFornecedor.codigo} onChange={e => setNovoFornecedor(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: FORN001" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddFornecedor(false)} disabled={savingFornecedor}>Cancelar</Button>
              <Button type="button" onClick={handleAddFornecedor} disabled={savingFornecedor}>
                {savingFornecedor ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </Card>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Recorrente */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Switch checked={isRecorrente} onCheckedChange={setIsRecorrente} id="recorrente-toggle" />
            <Label htmlFor="recorrente-toggle" className="cursor-pointer font-semibold">Lançamento Recorrente</Label>
          </div>
          {isRecorrente && <Badge className="bg-blue-100 text-blue-700">{form.total_parcelas || 2}x</Badge>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Empresa */}
          <div className="space-y-2 md:col-span-2">
            <Label>Empresa *</Label>
            <Select value={form.empresa_codigo} onValueChange={handleEmpresaChange}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {empresas.map(emp => (
                  <SelectItem key={emp.codigo} value={emp.codigo}>
                    <span className="font-mono text-xs text-slate-400 mr-2">{emp.codigo}</span>{emp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fornecedor */}
          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            <div className="flex gap-2">
              <Select value={form.fornecedor_codigo} onValueChange={handleFornecedorChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => (
                    <SelectItem key={f.codigo} value={f.codigo}>{f.codigo} - {f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="icon" variant="outline" onClick={() => setShowAddFornecedor(true)} className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={form.categoria_financeira} onValueChange={v => setForm(f => ({ ...f, categoria_financeira: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label>Valor (R$) {isRecorrente && isValorVariavel ? '(1ª Parcela)' : '*'}</Label>
            <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required />
          </div>

          {/* Data Vencimento */}
          <div className="space-y-2">
            <Label>Vencimento {isRecorrente ? '(1ª Parcela)' : '*'}</Label>
            <Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} required />
          </div>

          {isRecorrente && (
            <>
              <div className="space-y-2">
                <Label>Quantidade de Parcelas *</Label>
                <Input type="number" min="2" max="60" value={form.total_parcelas} onChange={e => setForm(f => ({ ...f, total_parcelas: e.target.value }))} required />
              </div>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Checkbox checked={isValorVariavel} onCheckedChange={setIsValorVariavel} id="valor-variavel" className="mt-1" />
                <div>
                  <Label htmlFor="valor-variavel" className="cursor-pointer font-semibold text-amber-900">Valor Variável (A definir mês a mês)</Label>
                  <p className="text-xs text-amber-700 mt-1">Ideal para Luz, Água. Parcelas 2 a {form.total_parcelas} com valor R$ 0,00.</p>
                </div>
              </div>
            </>
          )}

          {/* Descrição (Info Estrita) */}
          <div className="space-y-2 md:col-span-2">
            <Label>
              Descrição *
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">📋 Informação Estrita (aparece em extratos)</span>
            </Label>
            <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o item/serviço conforme aparecerá nos extratos" rows={2} required />
          </div>

          {/* Observação (Info Interna) */}
          <div className="space-y-2 md:col-span-2">
            <Label>
              Observações
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-normal">🔒 Informação Interna (não aparece em extratos)</span>
            </Label>
            <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Anotações internas, referências, observações..." rows={2} />
          </div>

          {/* Upload Múltiplo */}
          <div className="space-y-3 md:col-span-2">
            <Label>📎 Anexos (Boletos, Faturas, PDFs, Imagens) — Múltiplos arquivos</Label>
            <label className={cn(
              "flex items-center justify-center gap-2 h-14 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
              uploading ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30"
            )}>
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span className="text-blue-700 font-medium">Enviando...</span></>
              ) : (
                <><Upload className="w-4 h-4 text-slate-400" /><span className="text-slate-500 font-medium">Clique ou arraste arquivos (PDF, Excel, Imagens)</span></>
              )}
              <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.doc,.docx" onChange={handleUploadAnexo} className="hidden" disabled={uploading} />
            </label>

            {anexos.length > 0 && (
              <div className="space-y-2">
                {anexos.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate">
                      <FileText className="w-3 h-3 inline mr-1" />Anexo {idx + 1}
                    </a>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAnexos(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 h-6 w-6 p-0 shrink-0">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}><X className="w-4 h-4 mr-2" />Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />{isRecorrente ? 'Criar Recorrência' : 'Salvar'}</>}
          </Button>
        </div>
      </form>
    </>
  );
}