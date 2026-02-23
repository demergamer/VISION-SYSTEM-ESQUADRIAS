import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Plus, Eye, Truck, User, Search, Lock, AlertCircle } from "lucide-react";
import SinaisHistorico from "@/components/pedidos/SinaisHistorico";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

// IMPORTS DOS COMPONENTES DE CLIENTE
import ClienteDetails from "@/components/clientes/ClienteDetails";
import ClienteForm from "@/components/clientes/ClienteForm";

export default function PedidoForm({ pedido, clientes = [], onSave, onCancel, onCadastrarCliente, isLoading }) {
  
  const { data: representantes = [] } = useQuery({ 
    queryKey: ['representantes_pedido_form'], 
    queryFn: () => base44.entities.Representante.list() 
  });

  // Busca pedidos para extrair rotas únicas existentes
  const { data: todosPedidos = [] } = useQuery({
    queryKey: ['pedidos_rotas_form'],
    queryFn: () => base44.entities.Pedido.list()
  });

  // Rotas únicas derivadas dos pedidos existentes
  const rotasUnicas = useMemo(() => {
    const map = new Map();
    todosPedidos.forEach(p => {
      if (p.rota_entrega && !map.has(p.rota_entrega)) {
        map.set(p.rota_entrega, {
          rota_entrega: p.rota_entrega,
          motorista_atual: p.motorista_atual || '',
          motorista_codigo: p.motorista_codigo || ''
        });
      }
    });
    return Array.from(map.values());
  }, [todosPedidos]);

  const [form, setForm] = useState({
    cliente_codigo: '',
    cliente_nome: '',
    cliente_regiao: '',
    
    // Representante
    representante_codigo: '',
    representante_nome: '',
    
    data_entrega: '',
    numero_pedido: '',
    valor_pedido: 0,
    saldo_restante: 0,
    observacao: '',
    outras_informacoes: '',
    status: 'aberto',
    porcentagem_comissao: 5,
    
    // Logística (Corrigido mapeamento)
    rota_entrega: '', 
    motorista_codigo: '', // NOVO CAMPO
    motorista_atual: '',
    
    desconto_tipo: 'valor',
    desconto_valor: 0,
    
    // Sinais (novo modelo array)
    sinais_historico: [],
    // Campos legado mantidos para compatibilidade
    valor_sinal_informado: 0,
    arquivos_sinal: []
  });

  // Lógica de Bloqueio do Representante
  // Bloqueia APENAS se estiver editando um pedido existente QUE JÁ TENHA representante definido.
  const isRepresentanteLocked = !!pedido && !!pedido.representante_codigo;

  const [clienteSelecionadoDetalhes, setClienteSelecionadoDetalhes] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState(""); 
  const [novosClientesLocais, setNovosClientesLocais] = useState([]);
  
  
  // NOVO: Estado para loading ao salvar cliente novo
  const [savingCliente, setSavingCliente] = useState(false);

  const todosClientes = useMemo(() => {
    return [...clientes, ...novosClientesLocais];
  }, [clientes, novosClientesLocais]);

  useEffect(() => {
    if (pedido) {
      setForm({
        cliente_codigo: pedido.cliente_codigo || '',
        cliente_nome: pedido.cliente_nome || '',
        cliente_regiao: pedido.cliente_regiao || '',
        
        representante_codigo: pedido.representante_codigo || '',
        representante_nome: pedido.representante_nome || '',
        
        data_entrega: pedido.data_entrega || '',
        numero_pedido: pedido.numero_pedido || '',
        valor_pedido: pedido.valor_pedido || 0,
        saldo_restante: pedido.saldo_restante || 0,
        observacao: pedido.observacao || '',
        outras_informacoes: pedido.outras_informacoes || '',
        status: pedido.status || 'aberto',
        porcentagem_comissao: pedido.porcentagem_comissao || 5,
        
        // Mapeando para os campos corretos da entidade
        rota_entrega: pedido.rota_entrega || '', 
        motorista_codigo: pedido.motorista_codigo || '', // NOVO
        motorista_atual: pedido.motorista_atual || '',
        
        desconto_tipo: pedido.desconto_tipo || 'valor',
        desconto_valor: pedido.desconto_valor || 0,
        
        // Sinais
        sinais_historico: pedido.sinais_historico || [],
        valor_sinal_informado: pedido.valor_sinal_informado || 0,
        arquivos_sinal: pedido.arquivos_sinal || []
      });
    }
  }, [pedido]);

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return todosClientes;
    const termo = buscaCliente.toLowerCase();
    return todosClientes.filter(c => 
      c.nome.toLowerCase().includes(termo) || 
      String(c.codigo).toLowerCase().includes(termo)
    );
  }, [todosClientes, buscaCliente]);

  const handleClienteChange = (codigo) => {
    const cli = todosClientes.find(c => c.codigo === codigo);
    if (cli) {
      setForm(prev => ({
        ...prev,
        cliente_codigo: codigo,
        cliente_nome: cli.nome,
        cliente_regiao: cli.regiao || '',
        // Só puxa o representante do cliente se o campo não estiver bloqueado pelo pedido
        ...(!isRepresentanteLocked ? {
            representante_codigo: cli.representante_codigo || '',
            representante_nome: cli.representante_nome || ''
        } : {}),
        porcentagem_comissao: cli.porcentagem_comissao || 5
      }));
    }
  };

  const handleRepresentanteSelect = (codigo) => {
      const rep = representantes.find(r => r.codigo === codigo);
      setForm(prev => ({
          ...prev,
          representante_codigo: codigo,
          representante_nome: rep?.nome || ''
      }));
  };

  const recalcularSaldo = (baseForm) => {
    const valorTotal = parseFloat(baseForm.valor_pedido) || 0;
    const descontoInput = parseFloat(baseForm.desconto_valor) || 0;
    const valorDescontoReais = baseForm.desconto_tipo === 'valor'
      ? descontoInput
      : (valorTotal * descontoInput) / 100;
    const totalSinais = (baseForm.sinais_historico || []).reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
    return {
      ...baseForm,
      saldo_restante: Math.max(0, valorTotal - valorDescontoReais - totalSinais),
      valor_sinal_informado: totalSinais
    };
  };

  const updateValores = (field, value) => {
    setForm(prev => recalcularSaldo({ ...prev, [field]: value }));
  };

  const handleSinaisChange = (novosSinais) => {
    setForm(prev => recalcularSaldo({ ...prev, sinais_historico: novosSinais }));
  };

  const handleSave = () => {
    onSave(form);
  };

  const openClienteModal = () => {
    const cli = todosClientes.find(c => c.codigo === form.cliente_codigo);
    if (cli) {
      setClienteSelecionadoDetalhes(cli);
      setShowClienteModal(true);
    }
  };

  const inputClass = "h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all";

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* --- CLIENTE --- */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={form.cliente_codigo} onValueChange={handleClienteChange} disabled={!!pedido}>
                    <SelectTrigger className={cn(inputClass, "w-full text-left font-medium")}><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        <div className="p-2 sticky top-0 bg-white z-10 border-b pb-2 mb-1">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input placeholder="Buscar..." value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} className="h-9 pl-8 bg-slate-50" onKeyDown={(e) => e.stopPropagation()} autoFocus />
                            </div>
                        </div>
                        {clientesFiltrados.length === 0 ? <div className="py-6 text-center text-sm text-slate-500">Nenhum cliente encontrado.</div> : 
                            clientesFiltrados.map((cli) => (
                                <SelectItem key={cli.codigo} value={cli.codigo} className="py-3 border-b border-slate-50 last:border-0 cursor-pointer">
                                    <div className="flex flex-col text-left">
                                        <span className="font-bold text-slate-700">{cli.nome}</span>
                                        <span className="text-xs text-slate-400">Cód: {cli.codigo} {cli.regiao ? `• ${cli.regiao}` : ''}</span>
                                    </div>
                                </SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={openClienteModal} disabled={!form.cliente_codigo} className="h-11 w-11 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Eye className="h-5 w-5" /></Button>
              {!pedido && <Button type="button" variant="ghost" size="icon" onClick={() => setShowNovoClienteModal(true)} className="h-11 w-11 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"><Plus className="h-5 w-5" /></Button>}
          </div>
        </div>

        {/* --- REPRESENTANTE (COM LÓGICA DE BLOQUEIO) --- */}
        <div className="space-y-2">
            <Label className="flex items-center gap-2">
                Representante
                {isRepresentanteLocked && <Lock className="w-3 h-3 text-amber-500" />}
            </Label>
            <Select 
                value={form.representante_codigo} 
                onValueChange={handleRepresentanteSelect}
                disabled={isRepresentanteLocked} // Bloqueia se já estiver preenchido no pedido original
            >
                <SelectTrigger className={cn(inputClass, isRepresentanteLocked && "bg-slate-100 opacity-80 cursor-not-allowed")}>
                    <SelectValue placeholder="Sem representante" />
                </SelectTrigger>
                <SelectContent>
                    {representantes.map(rep => (
                        <SelectItem key={rep.codigo} value={rep.codigo}>{rep.nome}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero_pedido">Número do Pedido *</Label>
          <Input id="numero_pedido" value={form.numero_pedido} onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })} placeholder="Ex: PED001" className={inputClass} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_entrega">Data de Entrega *</Label>
          <Input id="data_entrega" type="date" value={form.data_entrega} onChange={(e) => setForm({ ...form, data_entrega: e.target.value })} className={inputClass} />
        </div>

        <div className="space-y-2">
            <Label htmlFor="rota_entrega">Rota de Entrega</Label>
            <Select
                value={form.rota_entrega}
                onValueChange={(val) => {
                    const rotaInfo = rotasUnicas.find(r => r.rota_entrega === val);
                    setForm(prev => ({
                        ...prev,
                        rota_entrega: val,
                        motorista_atual: rotaInfo?.motorista_atual || '',
                        motorista_codigo: rotaInfo?.motorista_codigo || ''
                    }));
                }}
            >
                <SelectTrigger className={cn(inputClass, "w-full")}>
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-slate-400 shrink-0" />
                        <SelectValue placeholder="Selecione uma rota existente" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {rotasUnicas.length === 0 
                        ? <div className="py-4 text-center text-sm text-slate-400">Nenhuma rota cadastrada ainda</div>
                        : rotasUnicas.map(r => (
                            <SelectItem key={r.rota_entrega} value={r.rota_entrega}>
                                <div className="flex flex-col text-left">
                                    <span className="font-semibold">{r.rota_entrega}</span>
                                    {r.motorista_atual && <span className="text-xs text-slate-400">Motorista: {r.motorista_atual}</span>}
                                </div>
                            </SelectItem>
                        ))
                    }
                </SelectContent>
            </Select>
        </div>

        {/* --- MOTORISTA (AUTO-FILL BASEADO NA ROTA) --- */}
        <div className="space-y-2 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <Label className="mb-2 block text-slate-600 font-semibold flex items-center gap-2">
                Dados Logísticos (Motorista)
                {form.rota_entrega && <Lock className="w-3.5 h-3.5 text-amber-500" />}
            </Label>
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                    <Label htmlFor="motorista_codigo" className="text-xs text-slate-400">Cód. Motorista</Label>
                    <Input 
                        id="motorista_codigo" 
                        value={form.motorista_codigo} 
                        readOnly={!!form.rota_entrega}
                        placeholder="000" 
                        className={cn(inputClass, form.rota_entrega && "bg-slate-100 cursor-not-allowed opacity-70")} 
                    />
                </div>
                <div className="col-span-2">
                    <Label htmlFor="motorista_atual" className="text-xs text-slate-400">Nome do Motorista</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            id="motorista_atual" 
                            value={form.motorista_atual} 
                            readOnly={!!form.rota_entrega}
                            placeholder="Nome do motorista responsável" 
                            className={cn(inputClass, "pl-9", form.rota_entrega && "bg-slate-100 cursor-not-allowed opacity-70")} 
                        />
                    </div>
                </div>
            </div>
            {form.rota_entrega && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Motorista preenchido automaticamente pela rota selecionada
                </p>
            )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="porcentagem_comissao">Comissão (%)</Label>
          <div className="relative">
            <Input id="porcentagem_comissao" type="number" min="0" max="100" step="0.1" value={form.porcentagem_comissao} onChange={(e) => setForm({ ...form, porcentagem_comissao: parseFloat(e.target.value) || 0 })} className={cn(inputClass, "pr-8")} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
           </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_pedido">Valor do Pedido (R$) *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
            <Input id="valor_pedido" type="number" min="0" step="0.01" value={form.valor_pedido} onChange={(e) => updateValores('valor_pedido', parseFloat(e.target.value) || 0)} className={cn(inputClass, "pl-9 font-bold text-slate-700")} />
          </div>
        </div>

        <div className="space-y-2">
            <Label>Desconto (Opcional)</Label>
            <div className="flex gap-2">
                <Select value={form.desconto_tipo} onValueChange={(val) => updateValores('desconto_tipo', val)}>
                    <SelectTrigger className={cn(inputClass, "w-24")}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="valor">R$</SelectItem><SelectItem value="porcentagem">%</SelectItem></SelectContent>
                </Select>
                <Input type="number" min="0" step={form.desconto_tipo === 'valor' ? "0.01" : "0.1"} value={form.desconto_valor} onChange={(e) => updateValores('desconto_valor', parseFloat(e.target.value) || 0)} placeholder="0,00" className={cn(inputClass, form.desconto_valor > 0 ? "text-red-600 font-medium" : "")} />
            </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Saldo Restante (A Receber)</Label>
          <div className="h-14 flex items-center justify-between px-4 bg-slate-50 border border-slate-200 rounded-xl">
             <span className="text-sm text-slate-500 font-medium uppercase">Valor Líquido:</span>
             <span className="font-bold text-2xl text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(form.saldo_restante)}</span>
          </div>
        </div>

        {/* SEÇÃO: SINAIS / ADIANTAMENTOS */}
        <div className="md:col-span-2 mt-4 p-6 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 text-lg">Sinais / Adiantamentos</h3>
              <p className="text-xs text-blue-700">Registre um ou mais pagamentos antecipados com comprovantes individuais</p>
            </div>
          </div>
          <SinaisHistorico
            sinais={form.sinais_historico}
            onChange={handleSinaisChange}
            clienteInfo={{ cliente_nome: form.cliente_nome, cliente_codigo: form.cliente_codigo }}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="observacao">Observação</Label>
          <Textarea id="observacao" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Observações sobre o pedido..." rows={3} className={cn(inputClass, "h-auto py-3")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="outras_informacoes">Outras Informações</Label>
          <Textarea id="outras_informacoes" value={form.outras_informacoes} onChange={(e) => setForm({ ...form, outras_informacoes: e.target.value })} placeholder="Informações adicionais..." rows={2} className={cn(inputClass, "h-auto py-3")} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"><X className="w-4 h-4 mr-2" /> Cancelar</Button>
        <Button type="button" onClick={handleSave} disabled={isLoading} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"><Save className="w-4 h-4 mr-2" /> {pedido ? 'Atualizar' : 'Cadastrar'}</Button>
      </div>

      <ModalContainer open={showClienteModal} onClose={() => setShowClienteModal(false)} title={`Ficha do Cliente: ${clienteSelecionadoDetalhes?.nome || ''}`} size="lg">
        {clienteSelecionadoDetalhes && <ClienteDetails cliente={clienteSelecionadoDetalhes} onClose={() => setShowClienteModal(false)} />}
      </ModalContainer>

      {/* --- CORREÇÃO AQUI --- */}
      <ModalContainer open={showNovoClienteModal} onClose={() => setShowNovoClienteModal(false)} title="Cadastrar Novo Cliente" size="xl">
        <ClienteForm 
            // Agora salvamos de verdade no banco antes de devolver o sucesso
            onSave={async (dadosCliente) => {
                setSavingCliente(true);
                try {
                    // 1. CRIA O CLIENTE DE VERDADE NO BANCO
                    const novoCliente = await base44.entities.Cliente.create({
                        ...dadosCliente,
                        status: 'ativo'
                    });

                    // 2. ATUALIZA A LISTA LOCAL E SELECIONA
                    setNovosClientesLocais(prev => [...prev, novoCliente]);
                    setForm(prev => ({
                        ...prev,
                        cliente_codigo: novoCliente.codigo,
                        cliente_nome: novoCliente.nome,
                        cliente_regiao: novoCliente.regiao || '',
                        representante_codigo: novoCliente.representante_codigo || '',
                        representante_nome: novoCliente.representante_nome || '',
                        porcentagem_comissao: novoCliente.porcentagem_comissao || 5
                    }));

                    setShowNovoClienteModal(false);
                    toast.success(`Cliente ${novoCliente.nome} cadastrado com sucesso!`);
                    
                    if (onCadastrarCliente) onCadastrarCliente();

                } catch (error) {
                    console.error("Erro ao cadastrar cliente:", error);
                    toast.error("Erro ao salvar cliente.");
                } finally {
                    setSavingCliente(false);
                }
            }}
            onCancel={() => setShowNovoClienteModal(false)} 
            representantes={representantes} 
            todosClientes={clientes}
            isLoading={savingCliente} // Se seu ClienteForm suportar essa prop
        />
      </ModalContainer>
    </div>
  );
}