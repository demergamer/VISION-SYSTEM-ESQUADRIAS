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
  const [dataRota, setDataRota] = useState('');
  const [cobradorNome, setCobradorNome] = useState('Gil');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState({}); // { key: [item_id, ...] }
  const [ticarTransito, setTicarTransito] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [expandirBusca, setExpandirBusca] = useState(false);

  // ── Pedidos ativos ──────────────────────────────────────────────────────
  const { data: pedidosAtivos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos_cobranca_ativos'],
    queryFn: () => base44.entities.Pedido.filter(
      { status: { '$in': ['aberto', 'parcial', 'aguardando'] } }, 'cliente_nome', 1000
    ),
    refetchInterval: 30000,
  });

  // ── Cheques devolvidos ──────────────────────────────────────────────────
  const { data: chequesDevolvidos = [], isLoading: loadingCheques } = useQuery({
    queryKey: ['cheques_devolvidos_rota'],
    queryFn: () => base44.entities.Cheque.filter({ status: 'devolvido' }, 'cliente_nome', 500),
    refetchInterval: 30000,
  });

  // ── Pedidos extras (busca expandida) ───────────────────────────────────
  const { data: pedidosExtras = [], isLoading: loadingExtras } = useQuery({
    queryKey: ['pedidos_cobranca_extras', busca],
    enabled: expandirBusca && busca.length >= 3,
    queryFn: () => base44.entities.Pedido.list('cliente_nome', 2000),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_lista_cobranca'],
    queryFn: () => base44.entities.Cliente.list('nome', 500),
  });

  const { data: representantes = [] } = useQuery({
    queryKey: ['representantes_cobranca'],
    queryFn: () => base44.entities.Representante.list('nome', 200),
  });

  // ── Pool de itens unificados (pedidos + cheques) ───────────────────────
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

  // ── Agrupamento por cliente ────────────────────────────────────────────
  const porCliente = useMemo(() => {
    const acc = {};
    todosItens.forEach(item => {
      const key = item.cliente_codigo || item.cliente_nome || item.emitente || 'sem_cliente';
      if (!acc[key]) {
        const cli = clientes.find(c => c.codigo === (item.cliente_codigo)) || {};
        const rep = representantes.find(r => r.codigo === item.representante_codigo) || {};
        acc[key] = {
          cliente_codigo: item.cliente_codigo || '',
          cliente_nome: item.cliente_nome || item.emitente || key,
          representante_codigo: item.representante_codigo || '',
          representante_nome: item.representante_nome || rep.nome || '',
          cliente_telefone: cli.telefone_1 || cli.contatos_lista?.[0]?.telefone || '',
          todos_telefones: [cli.telefone_1, cli.telefone_2, cli.telefone_3,
            ...(cli.contatos_lista || []).map(c => c.telefone)].filter(Boolean),
          contatos_nomeados: [
            cli.telefone_1 ? { telefone: cli.telefone_1, nome: cli.responsavel_1 || '' } : null,
            cli.telefone_2 ? { telefone: cli.telefone_2, nome: cli.responsavel_2 || '' } : null,
            cli.telefone_3 ? { telefone: cli.telefone_3, nome: cli.responsavel_3 || '' } : null,
            ...(cli.contatos_lista || []).map(c => ({ telefone: c.telefone, nome: c.nome_responsavel || '' })),
          ].filter(Boolean),
          cliente_cidade: cli.cidade || item.cliente_regiao || item.cliente_cidade || '',
          cliente_estado: cli.estado || '',
          cliente_endereco: cli.endereco || '',
          cliente_numero: cli.numero || '',
          cliente_latitude: cli.latitude || null,
          cliente_longitude: cli.longitude || null,
          itens: [],
        };
      }
      acc[key].itens.push(item);
    });
    return acc;
  }, [todosItens, clientes, representantes]);

  // ── Filtro de busca ────────────────────────────────────────────────────
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

  const isPedidoDisabled = (item) =>
    item._tipo === 'pedido' && (item.status === 'pago' || item.status === 'cancelado');
  const isPedidoTransito = (item) =>
    item._tipo === 'pedido' && item.status === 'aguardando' && !item.confirmado_entrega;

  const getItemKey = (item) => `${item._tipo}_${item.id}`;

  const toggleItem = (clienteKey, item) => {
    if (isPedidoDisabled(item)) return;
    const k = getItemKey(item);
    setSelecionados(prev => {
      const atual = prev[clienteKey] || [];
      const jatem = atual.includes(k);
      return { ...prev, [clienteKey]: jatem ? atual.filter(id => id !== k) : [...atual, k] };
    });
  };

  const toggleCliente = (clienteKey) => {
    const cli = porCliente[clienteKey];
    const habilitados = cli.itens.filter(i => !isPedidoDisabled(i)).map(getItemKey);
    const atual = selecionados[clienteKey] || [];
    const todosMarcados = habilitados.every(id => atual.includes(id));
    setSelecionados(prev => ({ ...prev, [clienteKey]: todosMarcados ? [] : habilitados }));
  };

  const handleSalvar = async () => {
    if (!dataRota) { toast.error('Selecione a data da rota'); return; }

    const dadosCobranca = [];
    const pedidosParaTicar = [];

    for (const [key, clienteDados] of Object.entries(porCliente)) {
      const sel = selecionados[key] || [];
      if (!sel.length) continue;

      const itensSel = clienteDados.itens.filter(i => sel.includes(getItemKey(i)));

      const pedidosSnap = itensSel.map(item => {
        if (item._tipo === 'pedido' && isPedidoTransito(item) && ticarTransito[item.id]) {
          pedidosParaTicar.push(item.id);
        }
        return {
          tipo_item: item._tipo,
          numero_pedido: item._tipo === 'cheque' ? (item.numero_cheque || item.id) : item.numero_pedido,
          valor_saldo: item._tipo === 'cheque'
            ? ((item.valor || 0) - (item.valor_pago || 0))
            : (item.saldo_restante ?? item.valor_pedido ?? 0),
          data_entrega: item.data_entrega || item.data_vencimento || '',
          pedido_id: item.id,
          status_original: item.status,
          em_transito: isPedidoTransito(item),
        };
      });

      const cidadeValida = clienteDados.cliente_cidade?.trim();
      const endParts = [clienteDados.cliente_endereco, clienteDados.cliente_numero,
        cidadeValida, clienteDados.cliente_estado].filter(Boolean);
      const enderecoCompleto = cidadeValida
        ? (endParts.length >= 2 ? endParts.join(', ') : cidadeValida) + ', Brasil'
        : null;

      dadosCobranca.push({
        cliente_codigo: clienteDados.cliente_codigo,
        cliente_nome: clienteDados.cliente_nome,
        representante_codigo: clienteDados.representante_codigo,
        representante_nome: clienteDados.representante_nome,
        cliente_telefone: clienteDados.cliente_telefone,
        todos_telefones: clienteDados.todos_telefones,
        contatos_nomeados: clienteDados.contatos_nomeados || [],
        cliente_cidade: clienteDados.cliente_cidade || '',
        cliente_regiao: clienteDados.cliente_cidade || '',
        cliente_endereco_completo: enderecoCompleto || '',
        cliente_latitude: clienteDados.cliente_latitude || null,
        cliente_longitude: clienteDados.cliente_longitude || null,
        pedidos: pedidosSnap,
        total_cliente: pedidosSnap.reduce((s, p) => s + p.valor_saldo, 0),
        whatsapp_enviado: false,
        whatsapp_erro: null,
        recusado: false,
      });
    }

    if (!dadosCobranca.length) { toast.error('Selecione pelo menos um item'); return; }

    setSalvando(true);
    try {
      const existentes = await base44.entities.RotaCobranca.list('-created_date', 1);
      let proximo = 1;
      if (existentes.length > 0) {
        const ultimo = existentes[0].codigo_rota || 'ROTA-000';
        proximo = (parseInt(ultimo.replace('ROTA-', '')) || 0) + 1;
      }
      const codigoRota = `ROTA-${String(proximo).padStart(3, '0')}`;
      const totalRota = dadosCobranca.reduce((s, c) => s + c.total_cliente, 0);

      const nova = await base44.entities.RotaCobranca.create({
        codigo_rota: codigoRota,
        data_rota: dataRota,
        cobrador_nome: cobradorNome,
        dados_cobranca: dadosCobranca,
        valor_total_rota: totalRota,
        status: 'Aberta',
        whatsapp_disparado: false,
      });

      if (pedidosParaTicar.length) {
        const now = new Date().toISOString();
        const user = await base44.auth.me();
        await Promise.all(pedidosParaTicar.map(id =>
          base44.entities.Pedido.update(id, {
            confirmado_entrega: true, data_entregue: now,
            usuario_confirmou_entrega: user?.email || '',
          })
        ));
        toast.success(`✅ ${pedidosParaTicar.length} pedido(s) em trânsito baixados!`);
      }

      onSaved(nova);
    } finally { setSalvando(false); }
  };

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
    <ModalContainer open={true} onClose={onClose} title="🛵 Nova Rota de Cobrança" description="Selecione pedidos e cheques devolvidos" size="xl">
      <div className="flex gap-3 flex-wrap mb-4">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Data da Rota *</label>
          <Input type="date" value={dataRota} onChange={e => setDataRota(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Cobrador</label>
          <Input value={cobradorNome} onChange={e => setCobradorNome(e.target.value)} />
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por cliente, representante, nº pedido ou nº cheque..."
          className="pl-9"
          value={busca}
          onChange={e => handleBusca(e.target.value)}
        />
        {expandirBusca && (
          <span className="absolute right-3 top-2.5 text-xs text-amber-600 font-semibold">
            {loadingExtras ? '...' : '⚠️ Mostrando todos os status'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh]">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Carregando...</div>
        ) : clientesLista.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>Nenhum resultado.</p>
            {!expandirBusca && busca.length >= 3 && (
              <button onClick={() => setExpandirBusca(true)} className="mt-2 text-blue-600 underline text-sm">
                Buscar em todos os pedidos
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
            <div key={key} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-slate-50 cursor-pointer hover:bg-slate-100" onClick={() => toggleCliente(key)}>
                <Checkbox checked={todosMarcados} data-state={algumMarcado && !todosMarcados ? 'indeterminate' : undefined} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{cliente.cliente_nome}</p>
                  <p className="text-xs text-slate-400">
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

              <div className="divide-y divide-slate-50">
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
                      className={`flex items-center gap-3 px-4 py-2.5 ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-slate-50'} ${emTransito && !disabled ? 'bg-green-50/50' : ''}`}
                      onClick={() => toggleItem(key, item)}
                    >
                      <Checkbox checked={isSelecionado} disabled={disabled} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item._tipo === 'cheque' ? (
                            <Badge className="bg-red-100 text-red-800 text-[10px]">[CHEQUE DEV #{item.numero_cheque}]</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 text-[10px]">[PEDIDO #{item.numero_pedido}]</Badge>
                          )}
                          <Badge className={`text-[10px] h-4 px-1.5 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          {emTransito && <Truck className="w-3 h-3 text-green-600" />}
                          {item._tipo === 'cheque' && item.banco && (
                            <span className="text-xs text-slate-400">{item.banco}</span>
                          )}
                        </div>
                        {emTransito && !disabled && isSelecionado && (
                          <div
                            className="flex items-center gap-1.5 mt-1"
                            onClick={e => { e.stopPropagation(); setTicarTransito(prev => ({ ...prev, [item.id]: !prev[item.id] })); }}
                          >
                            <Checkbox checked={!!ticarTransito[item.id]} className="h-3 w-3" />
                            <span className="text-[11px] text-green-700 font-medium">Ticar pedido (baixa logística)</span>
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

      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
        <div className="text-sm text-slate-600">
          <span className="font-bold text-slate-800">{qtdClientes}</span> cliente(s) ·{' '}
          <span className="font-bold text-blue-700">{formatCurrency(totalSelecionado)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando || qtdClientes === 0} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Rota
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}