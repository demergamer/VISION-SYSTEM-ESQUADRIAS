import { useState } from 'react';
import { Phone, RefreshCw, Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function RotaClienteCard({
  cliente,
  idx,
  onMarcarRecusado,
  onEditarContato,
  onReenviarIndividual,
  reenvioLoading = {}
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        cliente.recusado ? 'border-slate-300 opacity-60 bg-slate-50' : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`font-semibold text-sm cursor-pointer ${
                cliente.recusado ? 'line-through text-slate-400' : 'text-slate-800'
              }`}
              onClick={() => setExpanded(!expanded)}
            >
              {cliente.cliente_nome}
            </p>
            {cliente.recusado && (
              <Badge className="bg-slate-200 text-slate-500 text-xs">[RECUSADO]</Badge>
            )}
            {cliente.whatsapp_enviado && !cliente.recusado && (
              <Badge className="bg-green-100 text-green-700 text-xs">✓ Enviado</Badge>
            )}
            {cliente.whatsapp_erro && !cliente.whatsapp_enviado && !cliente.recusado && (
              <Badge className="bg-red-100 text-red-700 text-xs">✗ Falha</Badge>
            )}
          </div>

          {/* Contatos exibidos */}
          {!cliente.recusado && (
            <div className="mt-1 space-y-0.5">
              {(cliente.contatos_nomeados?.slice(0, 2) ||
                (cliente.cliente_telefone
                  ? [{ telefone: cliente.cliente_telefone, nome: '' }]
                  : [])
              ).map((c, ci) => (
                <div key={ci} className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5">
                    {c.telefone}
                  </span>
                  {c.nome && <span className="text-xs text-slate-500">{c.nome}</span>}
                </div>
              ))}
              {!cliente.contatos_nomeados?.length && !cliente.cliente_telefone && (
                <p className="text-xs text-red-400">Sem telefone</p>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`font-bold text-sm mr-1 ${
              cliente.recusado ? 'text-slate-400' : 'text-blue-700'
            }`}
          >
            {formatCurrency(cliente.total_cliente)}
          </span>

          {!cliente.recusado && (
            <>
              <Button
                size="sm"
                variant="ghost"
                title="Editar contato"
                onClick={() => onEditarContato(idx)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
              >
                <Phone className="w-3.5 h-3.5" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                title="Reenviar WhatsApp"
                onClick={() => onReenviarIndividual(idx)}
                disabled={reenvioLoading[idx]}
                className="h-7 w-7 p-0 text-slate-400 hover:text-green-600"
              >
                {reenvioLoading[idx] ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            title={cliente.recusado ? 'Remover recusa' : 'Marcar como recusado'}
            onClick={() => onMarcarRecusado(idx)}
            className={`h-7 w-7 p-0 ${
              cliente.recusado
                ? 'text-green-600 hover:text-green-700'
                : 'text-slate-400 hover:text-red-500'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Pedidos */}
      {expanded && (
        <div className="divide-y divide-slate-50">
          {(cliente.pedidos || []).map((p, pi) => (
            <div key={pi} className="flex items-center justify-between px-4 py-2 text-sm gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {p.tipo_item === 'cheque' ? (
                  <Badge className="bg-red-100 text-red-800 text-[10px]">
                    [CHEQUE DEV #{p.numero_pedido}]
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                    [PEDIDO #{p.numero_pedido}]
                  </Badge>
                )}
              </div>
              <span
                className={`font-semibold shrink-0 ${
                  cliente.recusado
                    ? 'text-slate-400 line-through'
                    : 'text-slate-800'
                }`}
              >
                {formatCurrency(p.valor_saldo)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}