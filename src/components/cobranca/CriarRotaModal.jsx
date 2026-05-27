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
};

export default function CriarRotaModal({ onClose, onSaved }) {
  const [dataRota, setDataRota] = useState('');
  const [cobradorNome, setCobradorNome] = useState('Gil');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState({}); // { key: [pedido_id, ...] }
  const [ticarTransito, setTicarTransito] = useState({}); // { pedido_id: bool }
  const [salvando, setSalvando] = useState(false);
  const [expandirBusca, setExpandirBusca] = useState(false);

  // Pedidos ativos (aberto, parcial, aguardando/trânsito)
  const { data: pedidosAtivos = [], isLoading } = useQuery({
    queryKey: ['pedidos_cobranca_ativos'],
    queryFn: () => base44.entities.Pedido.filter(
      { status: { '$in': ['aberto', 'parcial', 'aguardando'] } }, 'cliente_nome', 1000
    ),
    refetchInterval: 30000,
  });

  // Pedidos pagos/cancelados — carregados apenas se busca expandida
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

  // Pool de pedidos a exibir
  const todosPedidos = useMemo(() => {
    const mapa = new Map();
    pedidosAtivos.forEach(p => mapa.set(p.id, p));
    if (expandirBusca) {
      pedidosExtras
        .filter(p => !['aberto', 'parcial', 'aguardando'].includes(p.status))
        .forEach(p => mapa.set(p.id, p));
    }
    return Array.from(mapa.values());
  }, [pedidosAtivos, pedidosExtras, expandirBusca]);

  // Agrupar por cliente
  const porCliente = useMemo(() => {
    const base = todosPedidos;
    const acc = {};
    base.forEach(p => {
      const key = p.cliente_codigo || p.cliente_nome;
      if (!acc[key]) {
        const cli = clientes.find(c => c.codigo === p.cliente_codigo) || {};
        const rep = representantes.find(r => r.codigo === p.representante_codigo) || {};
        acc[key] = {
          cliente_codigo: p.cliente_codigo,
          cliente_nome: p.cliente_nome,
          representante_nome: p.representante_nome || rep.nome || '',
          cliente_telefone: cli.telefone_1 || cli.contatos_lista?.[0]?.telefone || '',
          todos_telefones: [
            cli.telefone_1,
            cli.telefone_2,
            cli.telefone_3,
            ...(cli.contatos_lista || []).map(c => c.telefone),
          ].filter(Boolean),
          contatos_nomeados: [
            cli.telefone_1 ? { telefone: cli.telefone_1, nome: cli.responsavel_1 || '' } : null,
            cli.telefone_2 ? { telefone: cli.telefone_2, nome: cli.responsavel_2 || '' } : null,
            cli.telefone_3 ? { telefone: cli.telefone_3, nome: cli.responsavel_3 || '' } : null,
            ...(cli.contatos_lista || []).map(c => ({ telefone: c.telefone, nome: c.nome_responsavel || '' })),
          ].filter(Boolean),
          cliente_cidade: cli.cidade || p.cliente_regiao || '',
          cliente_estado: cli.estado || '',
          cliente_endereco: cli.endereco || '',
          cliente_numero: cli.numero || '',
          cliente_latitude: cli.latitude || null,
          cliente_longitude: cli.longitude || null,
          pedidos: [],
        };
      }
      acc[key].pedidos.push(p);
    });
    return acc;
  }, [todosPedidos, clientes, representantes]);

  // Filtro inteligente único
  const clientesLista = useMemo(() => {
    if (!busca) return Object.values(porCliente);
    const lower = busca.toLowerCase();
    return Object.values(porCliente).filter(c =>
      c.cliente_nome?.toLowerCase().includes(lower) ||
      c.representante_nome?.toLowerCase().includes(lower) ||
      c.pedidos.some(p => p.numero_pedido?.toString().includes(lower))
    );
  }, [porCliente, busca]);

  // Auto-expandir busca se não encontrou nada nos ativos
  const handleBusca = (val) => {
    setBusca(val);
    if (val.length >= 3 && clientesLista.length === 0) setExpandirBusca(true);
    else if (!val) setExpandirBusca(false);
  };

  const isPedidoDisabled = (p) => p.status === 'pago' || p.status === 'cancelado';
  const isPedidoTransito = (p) => p.status === 'aguardando' && !p.confirmado_entrega;

  const togglePedido = (key, pedido) => {
    if (isPedidoDisabled(pedido)) return;
    setSelecionados(prev => {
      const atual = prev[key] || [];
      const jatem = atual.includes(pedido.id);
      return { ...prev, [key]: jatem ? atual.filter(id => id !== pedido.id) : [...atual, pedido.id] };
    });
  };

  const toggleCliente = (key) => {
    const cliente = porCliente[key];
    const habilitados = cliente.pedidos.filter(p => !isPedidoDisabled(p)).map(p => p.id);
    const atual = selecionados[key] || [];
    const todosMarcados = habilitados.every(id => atual.includes(id));
    setSelecionados(prev => ({ ...prev, [key]: todosMarcados ? [] : habilitados }));
  };

  const handleSalvar = async () => {
    if (!dataRota) { toast.error('Selecione a data da rota'); return; }

    const dadosCobranca = [];
    const pedidosParaTicar = [];

    for (const [key, clienteDados] of Object.entries(porCliente)) {
      const pedidosSel = selecionados[key] || [];
      if (!pedidosSel.length) continue;

      const pedidosSnap = clienteDados.pedidos
        .filter(p => pedidosSel.includes(p.id))
        .map(p => {
          if (isPedidoTransito(p) && ticarTransito[p.id]) pedidosParaTicar.push(p.id);
          return {
            numero_pedido: p.numero_pedido,
            valor_saldo: p.saldo_restante ?? p.valor_pedido ?? 0,
            data_entrega: p.data_entrega || '',
            pedido_id: p.id,
            status_original: p.status,
            em_transito: isPedidoTransito(p),
          };
        });

      // Monta endereço completo para link de navegação
      const endParts = [clienteDados.cliente_endereco, clienteDados.cliente_numero, clienteDados.cliente_cidade, clienteDados.cliente_estado].filter(Boolean);
      const enderecoCompleto = endParts.length >= 2 ? endParts.join(', ') + ', Brasil' : (clienteDados.cliente_cidade ? `${clienteDados.cliente_cidade}, ${clienteDados.cliente_estado || 'SP'}, Brasil` : null);

      dadosCobranca.push({
        cliente_codigo: clienteDados.cliente_codigo,
        cliente_nome: clienteDados.cliente_nome,
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
      });
    }

    if (!dadosCobranca.length) { toast.error('Selecione pelo menos um pedido'); return; }

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

      // Ticar pedidos em trânsito
      if (pedidosParaTicar.length) {
        const now = new Date().toISOString();
        const user = await base44.auth.me();
        await Promise.all(pedidosParaTicar.map(id =>
          base44.entities.Pedido.update(id, {
            confirmado_entrega: true,
            data_entregue: now,
            usuario_confirmou_entrega: user?.email || '',
          })
        ));
        toast.success(`✅ ${pedidosParaTicar.length} pedido(s) em trânsito baixados!`);
      }

      onSaved(nova);
    } finally {
      setSalvando(false);
    }
  };

  const totalSelecionado = useMemo(() =>
    Object.entries(selecionados).reduce((total, [key, ids]) => {
      const cli = porCliente[key];
      if (!cli || !ids.length) return total;
      return total + cli.pedidos.filter(p => ids.includes(p.id)).reduce((s, p) => s + (p.saldo_restante ?? p.valor_pedido ?? 0), 0);
    }, 0),
  [selecionados, porCliente]);

  const qtdClientes = Object.values(selecionados).filter(ids => ids.length > 0).length;

  return (
    <ModalContainer open={true} onClose={onClose} title="🛵 Nova Rota de Cobrança" description="Selecione os pedidos que o Gil vai cobrar" size="xl">
      {/* Campos de data e cobrador */}
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

      {/* Barra de busca inteligente única */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por cliente, representante ou nº pedido..."
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

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh]">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Carregando pedidos...</div>
        ) : clientesLista.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>Nenhum resultado.</p>
            {!expandirBusca && busca.length >= 3 && (
              <button onClick={() => setExpandirBusca(true)} className="mt-2 text-blue-600 underline text-sm">
                Buscar em todos os pedidos (incluindo liquidados)
              </button>
            )}
          </div>
        ) : clientesLista.map(cliente => {
          const key = cliente.cliente_codigo || cliente.cliente_nome;
          const sel = selecionados[key] || [];
          const habilitados = cliente.pedidos.filter(p => !isPedidoDisabled(p)).map(p => p.id);
          const todosMarcados = habilitados.length > 0 && habilitados.every(id => sel.includes(id));
          const algumMarcado = habilitados.some(id => sel.includes(id));

          return (
            <div key={key} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-slate-50 cursor-pointer hover:bg-slate-100" onClick={() => toggleCliente(key)}>
                <Checkbox checked={todosMarcados} data-state={algumMarcado && !todosMarcados ? 'indeterminate' : undefined} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{cliente.cliente_nome}</p>
                  <p className="text-xs text-slate-400">{cliente.representante_nome && `Rep: ${cliente.representante_nome} · `}{cliente.pedidos.length} pedido(s)</p>
                </div>
                <span className="text-sm font-bold text-blue-700 shrink-0">
                  {formatCurrency(cliente.pedidos.filter(p => !isPedidoDisabled(p)).reduce((s, p) => s + (p.saldo_restante ?? p.valor_pedido ?? 0), 0))}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {cliente.pedidos.map(pedido => {
                  const disabled = isPedidoDisabled(pedido);
                  const emTransito = isPedidoTransito(pedido);
                  const saldo = pedido.saldo_restante ?? pedido.valor_pedido ?? 0;
                  const statusInfo = STATUS_LABELS[pedido.status] || { label: pedido.status, color: 'bg-slate-100 text-slate-500' };
                  const isSelecionado = sel.includes(pedido.id);

                  return (
                    <div
                      key={pedido.id}
                      className={`flex items-center gap-3 px-4 py-2.5 ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-slate-50'} ${emTransito && !disabled ? 'bg-green-50/50' : ''}`}
                      onClick={() => togglePedido(key, pedido)}
                    >
                      <Checkbox checked={isSelecionado} disabled={disabled} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${disabled ? 'text-slate-400' : emTransito ? 'text-green-700' : 'text-slate-700'}`}>
                            #{pedido.numero_pedido}
                          </p>
                          <Badge className={`text-[10px] h-4 px-1.5 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          {emTransito && <Truck className="w-3 h-3 text-green-600" />}
                        </div>
                        {pedido.data_entrega && <p className="text-xs text-slate-400">Entrega: {pedido.data_entrega}</p>}
                        {/* Opção ticar pedido em trânsito */}
                        {emTransito && !disabled && isSelecionado && (
                          <div
                            className="flex items-center gap-1.5 mt-1"
                            onClick={e => { e.stopPropagation(); setTicarTransito(prev => ({ ...prev, [pedido.id]: !prev[pedido.id] })); }}
                          >
                            <Checkbox checked={!!ticarTransito[pedido.id]} className="h-3 w-3" />
                            <span className="text-[11px] text-green-700 font-medium">Ticar pedido (baixa logística)</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${disabled ? 'text-slate-400' : 'text-slate-800'}`}>{formatCurrency(saldo)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
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