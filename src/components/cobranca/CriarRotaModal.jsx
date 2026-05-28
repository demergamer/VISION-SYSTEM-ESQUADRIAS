import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Truck } from 'lucide-react';
import ModalContainer from '@/components/modals/ModalContainer';
import { toast } from 'sonner';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const STATUS_LABELS = {
  aberto: { label: 'Aberto', color: 'bg-blue-100 text-blue-700' },
  parcial: { label: 'Parcial', color: 'bg-purple-100 text-purple-700' },
  aguardando: { label: 'Em Trânsito', color: 'bg-amber-100 text-amber-700' },
  pago: { label: 'Liquidado', color: 'bg-slate-100 text-slate-500' },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-400' },
  devolvido: { label: 'Devolvido', color: 'bg-red-100 text-red-700' },
};

export default function CriarRotaModal({ onClose, onSaved }) {
  const [dataRota, setDataRota] = useState(new Date().toISOString().split('T')[0]);
  const [cobradorNome, setCobradorNome] = useState('Gil');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState({}); // { clienteKey: [item_id_com_prefixo, ...] }
  const [ticarTransito, setTicarTransito] = useState({}); // { id_do_pedido: boolean }
  const [salvando, setSalvando] = useState(false);
  const [expandirBusca, setExpandirBusca] = useState(false);

  // ── Consultas (Sem precisar de clientes/representantes completos aqui) ──
  const { data: pedidosAtivos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos_cobranca_ativos'],
    queryFn: () => base44.entities.Pedido.filter(
      { status: { '$in': ['aberto', 'parcial', 'aguardando'] } }, 'cliente_nome', 1000
    ),
    refetchInterval: 30000,
  });

  const { data: chequesDevolvidos = [], isLoading: loadingCheques } = useQuery({
    queryKey: ['cheques_devolvidos_rota'],
    queryFn: () => base44.entities.Cheque.filter({ status: 'devolvido' }, 'cliente_nome', 500),
    refetchInterval: 30000,
  });

  const { data: pedidosExtras = [], isLoading: loadingExtras } = useQuery({
    queryKey: ['pedidos_cobranca_extras', busca],
    enabled: expandirBusca && busca.length >= 3,
    queryFn: () => base44.entities.Pedido.list('cliente_nome', 2000),
  });

  // ── Pool Unificado e Agrupamento ──
  const todosItens = useMemo(() => {
    const mapa = new Map();
    pedidosAtivos.forEach(p => mapa.set(`pedido_${p.id}`, { ...p, _tipo: 'pedido' }));
    if (expandirBusca) {
      pedidosExtras
        .filter(p => !['aberto', 'parcial', 'aguardando'].includes(p.status))
        .forEach(p => mapa.set(`pedido_${p.id}`, { ...p, _tipo: 'pedido' }));
    }
    chequesDevolvidos.forEach(c => mapa.set(`cheque_${c.id}`, { ...c, _tipo: 'cheque' }));
    return Array.from(mapa.values());
  }, [pedidosAtivos, pedidosExtras, chequesDevolvidos, expandirBusca]);

  const porCliente = useMemo(() => {
    const acc = {};
    todosItens.forEach(item => {
      const key = item.cliente_codigo || item.cliente_nome || item.emitente || 'sem_cliente';
      if (!acc[key]) {
        acc[key] = {
          cliente_codigo: item.cliente_codigo || '',
          cliente_nome: item.cliente_nome || item.emitente || key,
          representante_nome: item.representante_nome || '',
          itens: [],
        };
      }
      acc[key].itens.push(item);
    });
    return acc;
  }, [todosItens]);

  // ── Lógica de Busca e Seleção ──
  const clientesLista = useMemo(() => {
    if (!busca) return Object.values(porCliente);
    const lower = busca.toLowerCase();
    return Object.values(porCliente).filter(c =>
      c.cliente_nome?.toLowerCase().includes(lower) ||
      c.representante_nome?.toLowerCase().includes(lower) ||
      c.itens.some(i => (i.numero_pedido || i.numero_cheque)?.toString().includes(lower))
    );
  }, [porCliente, busca]);

  const handleBusca = (val) => {
    setBusca(val);
    if (val.length >= 3 && clientesLista.length === 0) setExpandirBusca(true);
    else if (!val) setExpandirBusca(false);
  };

  const isPedidoDisabled = (item) => item._tipo === 'pedido' && (item.status === 'pago' || item.status === 'cancelado');
  const isPedidoTransito = (item) => item._tipo === 'pedido' && item.status === 'aguardando' && !item.confirmado_entrega;
  const getItemKey = (item) => `${item._tipo}_${item.id}`;

  const toggleItem = (clienteKey, item) => {
    if (isPedidoDisabled(item)) return;
    const k = getItemKey(item);
    setSelecionados(prev => {
      const atual = prev[clienteKey] || [];
      return { ...prev, [clienteKey]: atual.includes(k) ? atual.filter(id => id !== k) : [...atual, k] };
    });
  };

  const toggleCliente = (clienteKey) => {
    const cli = porCliente[clienteKey];
    const habilitados = cli.itens.filter(i => !isPedidoDisabled(i)).map(getItemKey);
    const atual = selecionados[clienteKey] || [];
    const todosMarcados = habilitados.length > 0 && habilitados.every(id => atual.includes(id));
    setSelecionados(prev => ({ ...prev, [clienteKey]: todosMarcados ? [] : habilitados }));
  };

  // ── Salvar Rota Normalizada ──
  const handleSalvar = async () => {
    if (!dataRota) return toast.error('Selecione a data da rota');

    const itens_rota = [];
    const pedidosParaTicar = [];
    let valor_total_rota = 0;

    for (const [key, clienteDados] of Object.entries(porCliente)) {
      const sel = selecionados[key] || [];
      if (!sel.length) continue;

      const itensSel = clienteDados.itens.filter(i => sel.includes(getItemKey(i)));

      itensSel.forEach(item => {
        // Separa itens que devem sofrer baixa logística
        if (isPedidoTransito(item) && ticarTransito[item.id]) {
          pedidosParaTicar.push(item.id);
        }

        // Calcula saldo do item
        const valor = item._tipo === 'cheque'
          ? ((item.valor || 0) - (item.valor_pago || 0))
          : (item.saldo_restante ?? item.valor_pedido ?? 0);

        valor_total_rota += valor;

        // Normalização: Apenas IDs e tipo
        itens_rota.push({
          item_id: item.id,
          tipo: item._tipo,
          cliente_codigo: item.cliente_codigo || '',
          recusado: false,
          whatsapp_enviado: false
        });
      });
    }

    if (!itens_rota.length) return toast.error('Selecione pelo menos um item para a rota');

    setSalvando(true);
    try {
      // 1. Gera código sequencial da rota
      const existentes = await base44.entities.RotaCobranca.list('-created_date', 1);
      let proximo = 1;
      if (existentes.length > 0 && existentes[0].codigo_rota) {
        const num = parseInt(existentes[0].codigo_rota.replace(/\D/g, ''));
        if (!isNaN(num)) proximo = num + 1;
      }
      const codigoRota = `ROTA-${String(proximo).padStart(3, '0')}`;

      // 2. Cria a rota normalizada
      const nova = await base44.entities.RotaCobranca.create({
        codigo_rota: codigoRota,
        data_rota: dataRota,
        cobrador_nome: cobradorNome,
        itens_rota: itens_rota,
        valor_total_rota: valor_total_rota,
        status: 'Aberta',
        whatsapp_disparado: false,
      });

      // 3. Efetua a baixa logística (ticar) nos pedidos em trânsito
      if (pedidosParaTicar.length > 0) {
        const now = new Date().toISOString();
        const user = await base44.auth.me();
        await Promise.all(pedidosParaTicar.map(id =>
          base44.entities.Pedido.update(id, {
            confirmado_entrega: true, 
            data_entregue: now,
            usuario_confirmou_entrega: user?.email || 'Sistema de Rotas',
          })
        ));
        toast.success(`✅ ${pedidosParaTicar.length} pedido(s) em trânsito foram marcados como entregues!`);
      }

      toast.success('🛵 Rota criada com sucesso!');
      onSaved(nova);
    } catch (e) {
      toast.error('Erro ao salvar rota: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  // ── Contadores e Interface ──
  const totalSelecionado = useMemo(() =>
    Object.entries(selecionados).reduce((total, [key, ids]) => {
      const cli = porCliente[key];
      if (!cli || !ids.length) return total;
      return total + cli.itens.filter(i => ids.includes(getItemKey(i))).reduce((s, i) =>
        s + (i._tipo === 'cheque' ? (i.valor || 0) - (i.valor_pago || 0) : (i.saldo_restante ?? i.valor_pedido ?? 0)), 0);
    }, 0),
  [selecionados, porCliente]);

  const qtdClientes = Object.values(selecionados).filter(ids => ids.length > 0).length;
  const isLoading = loadingPedidos || loadingCheques;

  return (
    <ModalContainer open={true} onClose={onClose} title="🛵 Nova Rota de Cobrança" description="Selecione pedidos e cheques para gerar a rota de hoje" size="xl">
      
      {/* Cabeçalho Configuração */}
      <div className="flex gap-3 flex-wrap mb-4">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Data da Rota *</label>
          <Input type="date" value={dataRota} onChange={e => setDataRota(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Nome do Cobrador</label>
          <Input value={cobradorNome} onChange={e => setCobradorNome(e.target.value)} placeholder="Ex: Gil" />
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por cliente, representante, nº pedido ou nº cheque..."
          className="pl-9"
          value={busca}
          onChange={e => handleBusca(e.target.value)}
        />
        {expandirBusca && (
          <span className="absolute right-3 top-2.5 text-xs text-amber-600 font-semibold flex items-center gap-1">
            {loadingExtras ? <Loader2 className="w-3 h-3 animate-spin" /> : '⚠️ Pesquisando em todo o histórico'}
          </span>
        )}
      </div>

      {/* Lista de Resultados */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh]">
        {isLoading ? (
          <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> Carregando pendências...
          </div>
        ) : clientesLista.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p>Nenhuma pendência encontrada.</p>
            {!expandirBusca && busca.length >= 3 && (
              <button onClick={() => setExpandirBusca(true)} className="mt-2 text-blue-600 underline text-sm hover:text-blue-800">
                Buscar em pedidos antigos/cancelados
              </button>
            )}
          </div>
        ) : clientesLista.map(cliente => {
          const key = cliente.cliente_codigo || cliente.cliente_nome;
          const sel = selecionados[key] || [];
          const habilitados = cliente.itens.filter(i => !isPedidoDisabled(i)).map(getItemKey);
          const todosMarcados = habilitados.length > 0 && habilitados.every(id => sel.includes(id));
          const algumMarcado = habilitados.some(id => sel.includes(id));

          return (
            <div key={key} className="border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-blue-300">
              {/* Header do Cliente */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 cursor-pointer hover:bg-slate-100" onClick={() => toggleCliente(key)}>
                <Checkbox checked={todosMarcados} data-state={algumMarcado && !todosMarcados ? 'indeterminate' : undefined} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{cliente.cliente_nome}</p>
                  <p className="text-xs text-slate-500">
                    {cliente.representante_nome && `Rep: ${cliente.representante_nome} · `}
                    {cliente.itens.filter(i => i._tipo === 'pedido').length > 0 && `${cliente.itens.filter(i => i._tipo === 'pedido').length} pedido(s)`}
                    {cliente.itens.filter(i => i._tipo === 'cheque').length > 0 && ` · ${cliente.itens.filter(i => i._tipo === 'cheque').length} cheque(s) dev.`}
                  </p>
                </div>
                <span className="text-sm font-bold text-blue-700 shrink-0">
                  {formatCurrency(cliente.itens.filter(i => !isPedidoDisabled(i)).reduce((s, i) =>
                    s + (i._tipo === 'cheque' ? (i.valor || 0) - (i.valor_pago || 0) : (i.saldo_restante ?? i.valor_pedido ?? 0)), 0))}
                </span>
              </div>

              {/* Itens do Cliente */}
              <div className="divide-y divide-slate-100 bg-white">
                {cliente.itens.map(item => {
                  const disabled = isPedidoDisabled(item);
                  const emTransito = isPedidoTransito(item);
                  const saldo = item._tipo === 'cheque'
                    ? (item.valor || 0) - (item.valor_pago || 0)
                    : (item.saldo_restante ?? item.valor_pedido ?? 0);
                  const isSelecionado = sel.includes(getItemKey(item));
                  const statusInfo = STATUS_LABELS[item.status] || { label: item.status, color: 'bg-slate-100 text-slate-500' };

                  return (
                    <div
                      key={getItemKey(item)}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-slate-50'} ${emTransito && !disabled ? 'bg-amber-50/30' : ''}`}
                      onClick={() => toggleItem(key, item)}
                    >
                      <Checkbox checked={isSelecionado} disabled={disabled} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item._tipo === 'cheque' ? (
                            <Badge className="bg-red-100 text-red-800 text-[10px] border-red-200">[CHEQUE DEV #{item.numero_cheque}]</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 text-[10px] border-blue-200">[PEDIDO #{item.numero_pedido}]</Badge>
                          )}
                          <Badge className={`text-[10px] h-4 px-1.5 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          
                          {emTransito && <Truck className="w-3.5 h-3.5 text-amber-600" title="Pedido em trânsito" />}
                          
                          {item._tipo === 'cheque' && item.banco && (
                            <span className="text-xs text-slate-400 font-medium">{item.banco}</span>
                          )}
                        </div>
                        
                        {/* Ação rápida de Baixa Logística */}
                        {emTransito && !disabled && isSelecionado && (
                          <div
                            className="flex items-center gap-1.5 mt-1.5 p-1.5 bg-green-50 border border-green-200 rounded-md w-fit cursor-pointer hover:bg-green-100 transition-colors"
                            onClick={e => { e.stopPropagation(); setTicarTransito(prev => ({ ...prev, [item.id]: !prev[item.id] })); }}
                          >
                            <Checkbox checked={!!ticarTransito[item.id]} className="h-3.5 w-3.5 border-green-600 data-[state=checked]:bg-green-600" />
                            <span className="text-[11px] text-green-800 font-bold">Ticar pedido na hora (Baixa Logística)</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${disabled ? 'text-slate-400' : 'text-slate-800'}`}>
                        {formatCurrency(saldo)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé e Totais */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200 bg-white">
        <div className="text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="font-bold text-slate-800">{qtdClientes}</span> cliente(s) ·{' '}
          <span className="font-extrabold text-blue-700">{formatCurrency(totalSelecionado)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando || qtdClientes === 0} className="bg-blue-600 hover:bg-blue-700 font-semibold gap-2 shadow-sm">
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Rota
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}