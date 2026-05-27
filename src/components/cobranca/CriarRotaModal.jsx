import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Search, Loader2 } from 'lucide-react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function CriarRotaModal({ onClose, onSaved }) {
  const [dataRota, setDataRota] = useState('');
  const [cobradorNome, setCobradorNome] = useState('Gil');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState({}); // { cliente_codigo: [pedido_id, ...] }
  const [salvando, setSalvando] = useState(false);

  // Carregar pedidos com saldo > 0
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos_cobranca'],
    queryFn: () => base44.entities.Pedido.filter({
      status: { '$in': ['aberto', 'parcial'] }
    }, 'cliente_nome', 500),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_lista_cobranca'],
    queryFn: () => base44.entities.Cliente.list('nome', 500),
  });

  // Agrupar pedidos por cliente
  const porCliente = pedidos.reduce((acc, p) => {
    const key = p.cliente_codigo || p.cliente_nome;
    if (!acc[key]) {
      const cli = clientes.find(c => c.codigo === p.cliente_codigo) || {};
      acc[key] = {
        cliente_codigo: p.cliente_codigo,
        cliente_nome: p.cliente_nome,
        cliente_telefone: cli.telefone_1 || cli.contatos_lista?.[0]?.telefone || '',
        pedidos: [],
      };
    }
    acc[key].pedidos.push(p);
    return acc;
  }, {});

  const clientesLista = Object.values(porCliente).filter(c =>
    !busca || c.cliente_nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const togglePedido = (clienteCodigo, pedidoId) => {
    setSelecionados(prev => {
      const atual = prev[clienteCodigo] || [];
      const jatem = atual.includes(pedidoId);
      return {
        ...prev,
        [clienteCodigo]: jatem ? atual.filter(id => id !== pedidoId) : [...atual, pedidoId],
      };
    });
  };

  const toggleCliente = (clienteKey) => {
    const cliente = porCliente[clienteKey];
    const todos = cliente.pedidos.map(p => p.id);
    const atual = selecionados[clienteKey] || [];
    const todosMarcados = todos.every(id => atual.includes(id));
    setSelecionados(prev => ({
      ...prev,
      [clienteKey]: todosMarcados ? [] : todos,
    }));
  };

  const handleSalvar = async () => {
    if (!dataRota) { alert('Selecione a data da rota'); return; }

    const dadosCobranca = [];
    for (const [key, clienteDados] of Object.entries(porCliente)) {
      const pedidosSelecionados = (selecionados[key] || []);
      if (pedidosSelecionados.length === 0) continue;
      const pedidosSnap = clienteDados.pedidos
        .filter(p => pedidosSelecionados.includes(p.id))
        .map(p => ({
          numero_pedido: p.numero_pedido,
          valor_saldo: p.saldo_restante || p.valor_pedido || 0,
          data_entrega: p.data_entrega || '',
          pedido_id: p.id,
        }));
      const total = pedidosSnap.reduce((s, p) => s + p.valor_saldo, 0);
      dadosCobranca.push({
        cliente_codigo: clienteDados.cliente_codigo,
        cliente_nome: clienteDados.cliente_nome,
        cliente_telefone: clienteDados.cliente_telefone,
        pedidos: pedidosSnap,
        total_cliente: total,
        whatsapp_enviado: false,
        whatsapp_erro: null,
      });
    }

    if (dadosCobranca.length === 0) { alert('Selecione pelo menos um pedido'); return; }

    setSalvando(true);

    // Gerar código sequencial
    const existentes = await base44.entities.RotaCobranca.list('-codigo_rota', 1);
    let proximo = 1;
    if (existentes.length > 0) {
      const ultimo = existentes[0].codigo_rota || 'ROTA-000';
      const num = parseInt(ultimo.replace('ROTA-', '')) || 0;
      proximo = num + 1;
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

    setSalvando(false);
    onSaved(nova);
  };

  const totalSelecionado = Object.entries(selecionados).reduce((total, [key, pedidoIds]) => {
    if (!pedidoIds.length) return total;
    const cli = porCliente[key];
    if (!cli) return total;
    return total + cli.pedidos
      .filter(p => pedidoIds.includes(p.id))
      .reduce((s, p) => s + (p.saldo_restante || p.valor_pedido || 0), 0);
  }, 0);

  const qtdClientes = Object.values(selecionados).filter(ids => ids.length > 0).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-extrabold text-lg text-slate-800">🛵 Nova Rota de Cobrança</h2>
            <p className="text-sm text-slate-500">Selecione os clientes e pedidos que o Gil vai cobrar</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        {/* Form */}
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Data da Rota *</label>
            <Input type="date" value={dataRota} onChange={e => setDataRota(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Cobrador</label>
            <Input value={cobradorNome} onChange={e => setCobradorNome(e.target.value)} />
          </div>
        </div>

        {/* Busca */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar cliente..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </div>

        {/* Lista clientes/pedidos */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Carregando pedidos...</div>
          ) : clientesLista.length === 0 ? (
            <div className="text-center py-8 text-slate-400">Nenhum cliente com saldo pendente</div>
          ) : clientesLista.map(cliente => {
            const key = cliente.cliente_codigo || cliente.cliente_nome;
            const sel = selecionados[key] || [];
            const todos = cliente.pedidos.map(p => p.id);
            const todosMarcados = todos.every(id => sel.includes(id));
            const algumMarcado = todos.some(id => sel.includes(id));
            const totalCliente = cliente.pedidos.reduce((s, p) => s + (p.saldo_restante || p.valor_pedido || 0), 0);

            return (
              <div key={key} className="border border-slate-200 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 p-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleCliente(key)}
                >
                  <Checkbox checked={todosMarcados} data-state={algumMarcado && !todosMarcados ? 'indeterminate' : undefined} />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{cliente.cliente_nome}</p>
                    <p className="text-xs text-slate-500">{cliente.pedidos.length} pedido(s) · {cliente.cliente_telefone || 'Sem telefone'}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(totalCliente)}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {cliente.pedidos.map(pedido => {
                    const saldo = pedido.saldo_restante || pedido.valor_pedido || 0;
                    return (
                      <div
                        key={pedido.id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50"
                        onClick={() => togglePedido(key, pedido.id)}
                      >
                        <Checkbox checked={sel.includes(pedido.id)} />
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">Pedido #{pedido.numero_pedido}</p>
                          {pedido.data_entrega && <p className="text-xs text-slate-400">Entrega: {pedido.data_entrega}</p>}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(saldo)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            <span className="font-bold text-slate-800">{qtdClientes}</span> cliente(s) ·{' '}
            <span className="font-bold text-blue-700">{formatCurrency(totalSelecionado)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando || qtdClientes === 0} className="bg-blue-600 hover:bg-blue-700 gap-2">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar Rota
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}