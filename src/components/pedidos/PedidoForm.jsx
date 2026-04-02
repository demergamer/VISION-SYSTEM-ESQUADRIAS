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
import { Save, X, Plus, Eye, Truck, User, Search, Lock, AlertCircle, Trash2, Package } from "lucide-react";
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

  const { data: motoristasAtivos = [] } = useQuery({
    queryKey: ['motoristas_ativos_form'],
    queryFn: async () => {
      const all = await base44.entities.Motorista.list();
      return all.filter(m => m.ativo !== false);
    }
  });

  // Busca pedidos para extrair rotas únicas existentes e VALIDAR DUPLICIDADE
  const { data: todosPedidos = [] } = useQuery({
    queryKey: ['pedidos_rotas_form'],
    queryFn: () => base44.entities.Pedido.list()
  });

  const { data: portsDisponiveis = [] } = useQuery({
    queryKey: ['ports_pedido_form'],
    queryFn: async () => {
      const allPorts = await base44.entities.Port.list();
      return allPorts.filter(p => (p.saldo_disponivel || 0) > 0 && !['devolvido', 'finalizado'].includes(p.status));
    }
  });

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
    rota_entrega: '', 
    motorista_codigo: '',
    motorista_atual: '',
    desconto_tipo: 'valor',
    desconto_valor: 0,
    sinais_historico: [],
    valor_sinal_informado: 0,
    arquivos_sinal: [],
    itens_pedido: []
  });

  const isRepresentanteLocked = !!pedido && !!pedido.representante_codigo;

  const [clienteSelecionadoDetalhes, setClienteSelecionadoDetalhes] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState(""); 
  const [novosClientesLocais, setNovosClientesLocais] = useState([]);
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
        rota_entrega: pedido.rota_entrega || '', 
        motorista_codigo: pedido.motorista_codigo || '',
        motorista_atual: pedido.motorista_atual || '',
        desconto_tipo: pedido.desconto_tipo || 'valor',
        desconto_valor: pedido.desconto_valor || 0,
        sinais_historico: pedido.sinais_historico || [],
        valor_sinal_informado: pedido.valor_sinal_informado || 0,
        arquivos_sinal: pedido.arquivos_sinal || [],
        itens_pedido: (pedido.itens_pedido || []).map(item => ({
          codigo_peca: item.codigo_peca || '',
          descricao_peca: item.descricao_peca || item.descricao || '',
          quantidade: item.quantidade || 0,
          valor_unitario: item.valor_unitario || 0
        }))
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

  // 🚀 LÓGICA DE BLOQUEIO DE SALVAMENTO DE DUPLICADOS
  const handleSave = () => {
    const raw = String(form.numero_pedido).trim();
    if (!raw) {
      toast.error("Preencha o número do pedido antes de salvar.");
      return;
    }

    const semPontos = raw.replace(/\./g, '');
    const n = parseInt(semPontos, 10);
    const formatado = !isNaN(n) ? n.toLocaleString('pt-BR').replace(/,/g, '.') : raw;

    // Procura se já existe outro pedido com esse número exato
    const duplicado = todosPedidos.find(p => 
      p.id !== pedido?.id && (
        String(p.numero_pedido) === formatado || 
        String(p.numero_pedido) === raw ||
        String(p.numero_pedido).replace(/\./g, '') === semPontos
      )
    );

    if (duplicado) {
      toast.error(`AÇÃO BLOQUEADA: O Pedido #${formatado} já existe para o cliente ${duplicado.cliente_nome}!`, { 
        duration: 8000,
        style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171', fontWeight: 'bold' }
      });
      return; // IMPEDE A GRAVAÇÃO TOTALMENTE
    }

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
                    <SelectContent className="max-h-[300px] z-[99999]">
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

        {/* --- REPRESENTANTE --- */}
        <div className="space-y-2">
            <Label className="flex items-center gap-2">
                Representante
                {isRepresentanteLocked && <Lock className="w-3 h-3 text-amber-500" />}
            </Label>
            <Select 
                value={form.representante_codigo} 
                onValueChange={handleRepresentanteSelect}
                disabled={isRepresentanteLocked}
            >
                <SelectTrigger className={cn(inputClass, isRepresentanteLocked && "bg-slate-100 opacity-80 cursor-not-allowed")}>
                    <SelectValue placeholder="Sem representante" />
                </SelectTrigger>
                <SelectContent className="z-[99999]">
                    {representantes.map(rep => (
                        <SelectItem key={rep.codigo} value={rep.codigo}>{rep.nome}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* --- NÚMERO DO PEDIDO + INTEGRAÇÃO DE PORT --- */}
        <div className="space-y-2">
          <Label htmlFor="numero_pedido">Número do Pedido *</Label>
          <Input 
            id="numero_pedido" 
            value={form.numero_pedido} 
            onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })} 
            onBlur={(e) => {
              const raw = e.target.value.trim();
              if (!raw) return;
              
              const semPontos = raw.replace(/\./g, '');
              const n = parseInt(semPontos, 10);
              const formatado = !isNaN(n) ? n.toLocaleString('pt-BR').replace(/,/g, '.') : raw;
              
              // 1. Verifica duplicidade (Para aviso ao sair do campo)
              const duplicado = todosPedidos.find(p => 
                p.id !== pedido?.id && (
                  String(p.numero_pedido) === formatado || 
                  String(p.numero_pedido) === raw ||
                  String(p.numero_pedido).replace(/\./g, '') === semPontos
                )
              );
              
              if (duplicado) {
                toast.error(`Pedido #${formatado} já existe no sistema! (Status: ${duplicado.status})`, { duration: 5000 });
              }

              // 2. BUSCA DE PORT AUTOMÁTICA
              const portsEncontrados = portsDisponiveis.filter(port =>
                port.itens_port?.some(item => String(item.numero_pedido_manual).replace(/\./g, '') === semPontos)
              );

              let novosSinais = [...(form.sinais_historico || [])];
              let portAdicionado = false;

              portsEncontrados.forEach(port => {
                const itemPort = port.itens_port.find(i => String(i.numero_pedido_manual).replace(/\./g, '') === semPontos);
                const valorSinal = parseFloat(itemPort?.valor_alocado || port.saldo_disponivel || 0);

                const jaExiste = novosSinais.some(s => s._portId === port.id || String(s.referencia).includes(`PORT #${port.numero_port}`));

                if (!jaExiste && valorSinal > 0) {
                  novosSinais.push({
                    id: `port-${port.id}-${Date.now()}`,
                    _portId: port.id,
                    tipo_pagamento: port.forma_pagamento?.tipo || 'Caução',
                    forma: `PORT #${port.numero_port}`,
                    valor: valorSinal,
                    referencia: `PORT #${port.numero_port}`,
                    comprovante_url: port.comprovantes_urls?.[0] || '',
                    data: new Date().toISOString().split('T')[0]
                  });
                  portAdicionado = true;
                }
              });

              if (portAdicionado) {
                 toast.success('💰 PORT encontrado e vinculado como sinal automaticamente!');
                 const formAtualizado = { ...form, numero_pedido: formatado, sinais_historico: novosSinais };
                 setForm(recalcularSaldo(formAtualizado));
              } else {
                 setForm(prev => ({ ...prev, numero_pedido: formatado }));
              }
            }}
            placeholder="Ex: 53.000" 
            className={inputClass} 
          />
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
                <SelectContent className="z-[99999]">
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

        {/* --- MOTORISTA --- */}
        <div className="space-y-2 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <Label className="mb-2 block text-slate-600 font-semibold flex items-center gap-2">
                <User className="w-4 h-4" /> Motorista Responsável
                {form.rota_entrega && <Lock className="w-3.5 h-3.5 text-amber-500" />}
            </Label>
            {form.rota_entrega ? (
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <Label className="text-xs text-slate-400">Cód. Motorista</Label>
                        <Input value={form.motorista_codigo} readOnly className={cn(inputClass, "bg-slate-100 cursor-not-allowed opacity-70")} />
                    </div>
                    <div className="col-span-2">
                        <Label className="text-xs text-slate-400">Nome do Motorista</Label>
                        <Input value={form.motorista_atual} readOnly className={cn(inputClass, "bg-slate-100 cursor-not-allowed opacity-70")} />
                    </div>
                    <p className="col-span-3 text-xs text-amber-600 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Preenchido automaticamente pela rota selecionada
                    </p>
                </div>
            ) : (
                <Select
                    value={form.motorista_codigo || ''}
                    onValueChange={(val) => {
                        const m = motoristasAtivos.find(x => x.codigo === val || x.id === val);
                        setForm(prev => ({
                            ...prev,
                            motorista_codigo: m?.codigo || val,
                            motorista_atual: m?.nome_social || m?.nome || ''
                        }));
                    }}
                >
                    <SelectTrigger className={inputClass}>
                        <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-slate-400 shrink-0" />
                            <SelectValue placeholder="Selecionar motorista..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="z-[99999]">
                        {motoristasAtivos.length === 0
                            ? <div className="py-4 text-center text-sm text-slate-400">Nenhum motorista ativo cadastrado</div>
                            : motoristasAtivos.map(m => (
                                <SelectItem key={m.id} value={m.codigo || m.id}>
                                    <div className="flex flex-col text-left">
                                        <span className="font-semibold">{m.nome_social || m.nome}</span>
                                        {m.codigo && <span className="text-xs text-slate-400">Cód: {m.codigo}</span>}
                                    </div>
                                </SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
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
                    <SelectContent className="z-[99999]"><SelectItem value="valor">R$</SelectItem><SelectItem value="porcentagem">%</SelectItem></SelectContent>
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

        {/* SEÇÃO: ITENS / PEÇAS DO PEDIDO */}
        <div className="md:col-span-2 mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-slate-700 font-semibold">
              <Package className="w-4 h-4" /> Peças / Itens do Pedido
              {form.itens_pedido.length > 0 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{form.itens_pedido.length} item(s)</span>}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm(prev => ({
                ...prev,
                itens_pedido: [...prev.itens_pedido, { codigo_peca: '', descricao_peca: '', quantidade: 1, valor_unitario: 0 }]
              }))}
              className="h-8 text-xs gap-1 border-dashed"
            >
              <Plus className="w-3 h-3" /> Adicionar Peça
            </Button>
          </div>

          {form.itens_pedido.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2 w-24">Código</th>
                    <th className="text-left px-3 py-2">Descrição</th>
                    <th className="text-right px-3 py-2 w-20">Qtd</th>
                    <th className="text-right px-3 py-2 w-28">Vl. Unit. (R$)</th>
                    <th className="text-right px-3 py-2 w-24">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {form.itens_pedido.map((item, idx) => {
                    const total = (item.quantidade || 0) * (item.valor_unitario || 0);
                    const updateItem = (field, value) => {
                      setForm(prev => {
                        const novos = [...prev.itens_pedido];
                        novos[idx] = { ...novos[idx], [field]: value };
                        return { ...prev, itens_pedido: novos };
                      });
                    };
                    return (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">
                          <Input value={item.codigo_peca} onChange={e => updateItem('codigo_peca', e.target.value)} className="h-8 text-xs font-mono" placeholder="S/C" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={item.descricao_peca} onChange={e => updateItem('descricao_peca', e.target.value)} className="h-8 text-xs" placeholder="Descrição da peça" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" value={item.quantidade} onChange={e => updateItem('quantidade', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="0.01" value={item.valor_unitario} onChange={e => updateItem('valor_unitario', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" />
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setForm(prev => ({ ...prev, itens_pedido: prev.itens_pedido.filter((_, i) => i !== idx) }))}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

      <ModalContainer open={showNovoClienteModal} onClose={() => setShowNovoClienteModal(false)} title="Cadastrar Novo Cliente" size="xl">
        <ClienteForm 
            onSave={async (dadosCliente) => {
                setSavingCliente(true);
                try {
                    const novoCliente = await base44.entities.Cliente.create({
                        ...dadosCliente,
                        status: 'ativo'
                    });

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
            isLoading={savingCliente}
        />
      </ModalContainer>
    </div>
  );
}