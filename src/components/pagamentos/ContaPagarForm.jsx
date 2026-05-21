import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, X, Loader2, Save, Upload, CheckCircle, FileText, Hash, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, addMonths, parseISO } from "date-fns";
import ModalContainer from "@/components/modals/ModalContainer";
import FornecedorForm from "@/components/fornecedores/FornecedorForm";

const CATEGORIAS = [
  { value: 'aluminio', label: '🏗️ Alumínio' },
  { value: 'vidros', label: '💎 Vidros' },
  { value: 'acessorios', label: '🔩 Acessórios' },
  { value: 'servicos_terceiros', label: '🎨 Serviços Terceiros' },
  { value: 'manutencao', label: '🛠️ Manutenção' },
  { value: 'logistica', label: '🚛 Logística' },
  { value: 'administrativas', label: '🏢 Administrativas' },
  { value: 'impostos', label: '⚖️ Impostos' },
  { value: 'folha', label: '👷 Folha' },
  { value: 'vale', label: '🎟️ Vale' },
  { value: 'comissoes', label: '💰 Comissões' },
];

async function gerarProximoSequencial(empresaCodigo) {
  const todas = await base44.entities.ContaPagar.list('-numero_lancamento', 200);
  const daEmpresa = todas.filter(c => c.empresa_codigo === empresaCodigo && c.numero_lancamento);
  let proximo = 1;
  if (daEmpresa.length > 0) {
    const nums = daEmpresa.map(c => {
      const base = (c.numero_lancamento || '').split('/')[0];
      const partes = base.split('-');
      return parseInt(partes[partes.length - 1]) || 0;
    });
    proximo = Math.max(...nums) + 1;
  }
  return proximo;
}

export default function ContaPagarForm({ conta, fornecedores, empresas, onSave, onCancel, isLoading }) {
  const queryClient = useQueryClient();
  const [showAddFornecedor, setShowAddFornecedor] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Recorrência: 'inativo' | 'ativo'
  const [recorrencia, setRecorrencia] = useState(() => {
    if (conta?.tipo_lancamento === 'recorrente') return 'ativo';
    return 'inativo';
  });

  // Parcelas: número >= 1. Se > 1 e recorrência inativo => parcelado
  const [qtdParcelas, setQtdParcelas] = useState(
    conta?.total_parcelas || 1
  );
  const [isValorVariavel, setIsValorVariavel] = useState(false);

  const tipoLancamento = recorrencia === 'ativo' ? 'recorrente' : (qtdParcelas > 1 ? 'parcelado' : 'unica');

  const [form, setForm] = useState({
    empresa_codigo: conta?.empresa_codigo || empresas?.[0]?.codigo || '',
    empresa_nome: conta?.empresa_nome || empresas?.[0]?.nome || '',
    fornecedor_codigo: conta?.fornecedor_codigo || '',
    fornecedor_nome: conta?.fornecedor_nome || '',
    descricao: conta?.descricao || '',
    observacao: conta?.observacao || '',
    nf_origem: conta?.nf_origem || '',
    valor: conta?.valor || '',
    data_vencimento: conta?.data_vencimento || '',
    status: conta?.status || 'pendente',
    categoria_financeira: conta?.categoria_financeira || 'aluminio',
    // Impostos
    irrf: conta?.irrf || '',
    icms: conta?.icms || '',
    iss: conta?.iss || '',
    outros_impostos: conta?.outros_impostos || '',
  });

  const [parcelas, setParcelas] = useState([]);
  const [anexos, setAnexos] = useState(() => {
    if (conta?.anexos_complexos?.length) return conta.anexos_complexos;
    if (conta?.comprovante_url) return [{ url: conta.comprovante_url, observacao: '', nome: 'Comprovante' }];
    return [];
  });

  const recalcularParcelas = (valor, qtd, dataBase) => {
    if (!valor || !qtd || !dataBase) return;
    const total = parseFloat(valor) || 0;
    const n = parseInt(qtd) || 1;
    if (n <= 1) { setParcelas([]); return; }
    const base = Math.floor((total / n) * 100) / 100;
    const resto = Math.round((total - base * n) * 100) / 100;
    const novas = Array.from({ length: n }, (_, i) => ({
      valor: i === 0 ? parseFloat((base + resto).toFixed(2)) : base,
      data_vencimento: format(addMonths(parseISO(dataBase), i), 'yyyy-MM-dd')
    }));
    setParcelas(novas);
  };

  const handleValorChange = (val) => {
    setForm(f => ({ ...f, valor: val }));
    if (tipoLancamento === 'parcelado' && form.data_vencimento) {
      recalcularParcelas(val, qtdParcelas, form.data_vencimento);
    }
  };

  const handleQtdParcelasChange = (qtd) => {
    const n = parseInt(qtd) || 1;
    setQtdParcelas(n);
    if (recorrencia === 'inativo' && n > 1 && form.valor && form.data_vencimento) {
      recalcularParcelas(form.valor, n, form.data_vencimento);
    } else if (n <= 1) {
      setParcelas([]);
    }
  };

  const handleEmpresaChange = (codigo) => {
    const emp = empresas.find(e => e.codigo === codigo);
    setForm(f => ({ ...f, empresa_codigo: codigo, empresa_nome: emp?.nome || '' }));
  };

  const handleFornecedorChange = (codigo) => {
    const forn = fornecedores.find(f => f.codigo === codigo);
    setForm(f => ({ ...f, fornecedor_codigo: codigo, fornecedor_nome: forn?.nome || '' }));
  };

  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(Array.from(files).map(file =>
        base44.integrations.Core.UploadFile({ file }).then(r => ({ url: r.file_url, observacao: '', nome: file.name }))
      ));
      setAnexos(prev => [...prev, ...uploads]);
      toast.success(`${uploads.length} arquivo(s) adicionado(s)!`);
    } catch { toast.error('Erro ao enviar arquivo'); }
    finally { setUploading(false); }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(e.dataTransfer.files);
  }, []);

  const createFornecedorMutation = useMutation({
    mutationFn: (data) => base44.entities.Fornecedor.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      setForm(f => ({ ...f, fornecedor_codigo: data.codigo, fornecedor_nome: data.nome }));
      setShowAddFornecedor(false);
      toast.success('Fornecedor cadastrado!');
    },
    onError: () => toast.error('Erro ao cadastrar fornecedor')
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.empresa_codigo) { toast.error('Selecione a empresa'); return; }
    if (!form.fornecedor_codigo) { toast.error('Selecione o fornecedor'); return; }

    const baseData = {
      ...form,
      tipo_lancamento: tipoLancamento,
      anexos_complexos: anexos,
      // limpa campos de impostos se vazios
      irrf: parseFloat(form.irrf) || 0,
      icms: parseFloat(form.icms) || 0,
      iss: parseFloat(form.iss) || 0,
      outros_impostos: parseFloat(form.outros_impostos) || 0,
    };

    if (tipoLancamento === 'unica') {
      const seq = conta?.numero_lancamento || `${form.empresa_codigo}-${String(await gerarProximoSequencial(form.empresa_codigo)).padStart(4, '0')}`;
      onSave({ ...baseData, numero_lancamento: seq });
      return;
    }

    if (tipoLancamento === 'recorrente') {
      const grupoId = `REC-${Date.now()}`;
      const n = parseInt(qtdParcelas) || 2;
      const valorParc = parseFloat(form.valor) || 0;
      const dataBase = parseISO(form.data_vencimento);
      const seq = await gerarProximoSequencial(form.empresa_codigo);
      const registros = Array.from({ length: n }, (_, i) => ({
        ...baseData,
        recorrencia_grupo_id: grupoId,
        parcela_numero: i + 1,
        total_parcelas: n,
        valor: (i === 0 || !isValorVariavel) ? valorParc : 0,
        status: (i === 0 || !isValorVariavel) ? 'pendente' : 'pendente_preenchimento',
        data_vencimento: format(addMonths(dataBase, i), 'yyyy-MM-dd'),
        numero_lancamento: `${form.empresa_codigo}-${String(seq + i).padStart(4, '0')}`
      }));
      try {
        await base44.entities.ContaPagar.bulkCreate(registros);
        toast.success(`${n} recorrências criadas!`);
        onCancel();
      } catch { toast.error('Erro ao criar recorrências'); }
      return;
    }

    if (tipoLancamento === 'parcelado') {
      const grupoId = `PARC-${Date.now()}`;
      const seq = await gerarProximoSequencial(form.empresa_codigo);
      const registros = parcelas.map((p, i) => ({
        ...baseData,
        recorrencia_grupo_id: grupoId,
        parcela_numero: i + 1,
        total_parcelas: parcelas.length,
        valor: parseFloat(p.valor) || 0,
        data_vencimento: p.data_vencimento,
        status: 'pendente',
        numero_lancamento: `${form.empresa_codigo}-${String(seq).padStart(4, '0')}/${i + 1}`
      }));
      try {
        await base44.entities.ContaPagar.bulkCreate(registros);
        toast.success(`${parcelas.length} parcelas criadas!`);
        onCancel();
      } catch { toast.error('Erro ao criar parcelas'); }
    }
  };

  const labelParcelas = recorrencia === 'ativo' ? 'Quantidade de Recorrências' : 'Nº de Parcelas';

  return (
    <>
      <ModalContainer open={showAddFornecedor} onClose={() => setShowAddFornecedor(false)} title="Cadastro Rápido de Fornecedor" description="Adicione um novo fornecedor" size="md">
        <FornecedorForm
          onSave={(data) => createFornecedorMutation.mutate(data)}
          onCancel={() => setShowAddFornecedor(false)}
          isLoading={createFornecedorMutation.isPending}
        />
      </ModalContainer>

      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Empresa */}
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Empresa *</Label>
            <Select value={form.empresa_codigo} onValueChange={handleEmpresaChange}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
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
          <div className="space-y-1">
            <Label className="text-xs">Fornecedor *</Label>
            <div className="flex gap-2">
              <Select value={form.fornecedor_codigo} onValueChange={handleFornecedorChange}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f.codigo} value={f.codigo}>{f.codigo} - {f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" size="icon" variant="outline" onClick={() => setShowAddFornecedor(true)} className="shrink-0 h-9 w-9" title="Cadastrar novo fornecedor"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1">
            <Label className="text-xs">Categoria *</Label>
            <Select value={form.categoria_financeira} onValueChange={v => setForm(f => ({ ...f, categoria_financeira: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* NF Origem */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><Hash className="w-3 h-3" />NF de Origem</Label>
            <Input value={form.nf_origem} onChange={e => setForm(f => ({ ...f, nf_origem: e.target.value }))} placeholder="Ex: NF-001234" className="h-9" />
          </div>

          {/* Valor */}
          <div className="space-y-1">
            <Label className="text-xs">Valor Total (R$) *</Label>
            <Input type="number" step="0.01" value={form.valor} onChange={e => handleValorChange(e.target.value)} className="h-9" required />
          </div>

          {/* Data */}
          <div className="space-y-1">
            <Label className="text-xs">{tipoLancamento === 'parcelado' ? 'Vencimento 1ª Parcela *' : tipoLancamento === 'recorrente' ? 'Vencimento 1ª Recorrência *' : 'Vencimento *'}</Label>
            <Input type="date" value={form.data_vencimento} onChange={e => {
              setForm(f => ({ ...f, data_vencimento: e.target.value }));
              if (tipoLancamento === 'parcelado') recalcularParcelas(form.valor, qtdParcelas, e.target.value);
            }} className="h-9" required />
          </div>

          {/* Recorrência + Parcelas (lado a lado) */}
          <div className="space-y-1">
            <Label className="text-xs">Recorrência</Label>
            <Select value={recorrencia} onValueChange={v => { setRecorrencia(v); if (v === 'ativo' && qtdParcelas < 2) setQtdParcelas(2); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inativo">⏸️ Inativo</SelectItem>
                <SelectItem value="ativo">🔄 Ativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{labelParcelas}</Label>
            <Input
              type="number"
              min="1"
              max="60"
              value={qtdParcelas}
              onChange={e => handleQtdParcelasChange(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Checkbox valor variável para recorrente */}
          {recorrencia === 'ativo' && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl md:col-span-2">
              <Checkbox checked={isValorVariavel} onCheckedChange={setIsValorVariavel} id="valor-variavel" className="mt-0.5" />
              <div>
                <Label htmlFor="valor-variavel" className="cursor-pointer font-semibold text-amber-900 text-sm">Valor Variável (A definir mês a mês)</Label>
                <p className="text-xs text-amber-700 mt-0.5">Parcelas 2 a {qtdParcelas} criadas com R$ 0,00 e status "A Definir".</p>
              </div>
            </div>
          )}
        </div>

        {/* Preview de parcelas — aparece logo após configurações */}
        {tipoLancamento === 'parcelado' && parcelas.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">📅 Parcelas — ajuste valores se necessário</Label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {parcelas.map((p, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                  <span className="text-xs font-mono font-bold text-blue-600 w-8 shrink-0">{i + 1}x</span>
                  <Input type="number" step="0.01" value={p.valor} onChange={e => setParcelas(prev => prev.map((pp, ii) => ii === i ? { ...pp, valor: e.target.value } : pp))} className="h-7 text-xs w-28" />
                  <Input type="date" value={p.data_vencimento} onChange={e => setParcelas(prev => prev.map((pp, ii) => ii === i ? { ...pp, data_vencimento: e.target.value } : pp))} className="h-7 text-xs flex-1" />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Total: R$ {parcelas.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0).toFixed(2)} |
              Esperado: R$ {parseFloat(form.valor || 0).toFixed(2)}
            </p>
          </div>
        )}

        {/* Acordeão de Impostos */}
        <Accordion type="single" collapsible className="border rounded-xl overflow-hidden">
          <AccordionItem value="impostos" className="border-0">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-slate-700 hover:no-underline hover:bg-slate-50">
              ⚖️ Detalhamento de Impostos (IRRF, ICMS, ISS...)
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">IRRF (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.irrf} onChange={e => setForm(f => ({ ...f, irrf: e.target.value }))} placeholder="0,00" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ICMS (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.icms} onChange={e => setForm(f => ({ ...f, icms: e.target.value }))} placeholder="0,00" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ISS (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.iss} onChange={e => setForm(f => ({ ...f, iss: e.target.value }))} placeholder="0,00" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Outros Impostos (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.outros_impostos} onChange={e => setForm(f => ({ ...f, outros_impostos: e.target.value }))} placeholder="0,00" className="h-8 text-xs" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Total impostos: R$ {(
                  (parseFloat(form.irrf) || 0) +
                  (parseFloat(form.icms) || 0) +
                  (parseFloat(form.iss) || 0) +
                  (parseFloat(form.outros_impostos) || 0)
                ).toFixed(2)}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="grid grid-cols-1 gap-3">
          {/* Descrição — Info Estrita */}
          <div className="space-y-1">
            <Label className="text-xs">
              Descrição *
              <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-normal">📋 Info Estrita — aparece em extratos</span>
            </Label>
            <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} required className="text-sm" />
          </div>

          {/* Observação — Info Interna */}
          <div className="space-y-1">
            <Label className="text-xs">
              Observações
              <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-normal">🔒 Info Interna — não aparece em extratos</span>
            </Label>
            <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2} className="text-sm" />
          </div>
        </div>

        {/* Anexos com Drag & Drop e observação individual */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">📎 Anexos com Observação Individual</Label>
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-2 min-h-16 px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer",
              isDragging ? "border-blue-500 bg-blue-50 scale-[1.01]" : "border-slate-300 bg-white hover:border-blue-400"
            )}
            onClick={() => document.getElementById('anexo-input-conta')?.click()}
          >
            {uploading ? (
              <><Loader2 className="w-5 h-5 animate-spin text-blue-600" /><span className="text-sm text-blue-700">Enviando...</span></>
            ) : (
              <><Upload className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-500">Arraste arquivos aqui ou clique para selecionar</span><span className="text-xs text-slate-400">PDF, Imagens, Excel</span></>
            )}
          </div>
          <input id="anexo-input-conta" type="file" multiple accept="image/*,.pdf,.xlsx,.xls" onChange={e => uploadFiles(e.target.files)} className="hidden" />

          {anexos.length > 0 && (
            <div className="space-y-2">
              {anexos.map((anexo, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-1 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate flex-1">
                        <FileText className="w-3 h-3 inline mr-1" />{anexo.nome || `Anexo ${idx + 1}`}
                      </a>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setAnexos(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 h-5 w-5 p-0 shrink-0"><X className="w-3 h-3" /></Button>
                    </div>
                    <Input
                      value={anexo.observacao}
                      onChange={e => setAnexos(prev => prev.map((a, i) => i === idx ? { ...a, observacao: e.target.value } : a))}
                      placeholder="Observação sobre este arquivo..."
                      className="h-6 text-xs border-green-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}><X className="w-4 h-4 mr-2" />Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              : <><Save className="w-4 h-4 mr-2" />{tipoLancamento === 'parcelado' ? 'Criar Parcelas' : tipoLancamento === 'recorrente' ? 'Criar Recorrências' : 'Salvar'}</>
            }
          </Button>
        </div>
      </form>
    </>
  );
}