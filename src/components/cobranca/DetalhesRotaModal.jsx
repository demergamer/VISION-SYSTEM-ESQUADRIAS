import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageSquare, FileText, CheckCircle2, Loader2, AlertTriangle, Printer } from 'lucide-react';
import ImpressaoRotaPDF from './ImpressaoRotaPDF';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function DetalhesRotaModal({ rota, onClose, onUpdated }) {
  const [disparando, setDisparando] = useState(false);
  const [confirmarDisparo, setConfirmarDisparo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [concluindo, setConcluindo] = useState(false);
  const [showPDF, setShowPDF] = useState(false);

  const handleDisparar = async () => {
    setDisparando(true);
    setConfirmarDisparo(false);
    try {
      const res = await base44.functions.invoke('dispararWhatsAppRota', { rota_id: rota.id });
      setResultado(res.data);
      // Recarregar dados atualizados
      const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (rotas?.[0]) onUpdated(rotas[0]);
    } catch (e) {
      setResultado({ error: e.message });
    }
    setDisparando(false);
  };

  const handleConcluir = async () => {
    setConcluindo(true);
    await base44.entities.RotaCobranca.update(rota.id, { status: 'Concluída' });
    const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
    if (rotas?.[0]) onUpdated(rotas[0]);
    setConcluindo(false);
  };

  const clientes = rota.dados_cobranca || [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-slate-800">{rota.codigo_rota}</h2>
                <Badge className={rota.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                  {rota.status}
                </Badge>
                {rota.whatsapp_disparado && (
                  <Badge className="bg-green-50 text-green-600 border border-green-200">
                    <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp Enviado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">
                📅 {formatDate(rota.data_rota)} · 👤 {rota.cobrador_nome || 'Gil'} · 👥 {clientes.length} clientes
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>

          {/* Ações */}
          <div className="p-4 border-b border-slate-100 flex gap-2 flex-wrap">
            <Button
              onClick={() => setConfirmarDisparo(true)}
              disabled={disparando || rota.whatsapp_disparado}
              className="gap-2 bg-green-600 hover:bg-green-700 flex-1"
            >
              {disparando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              {rota.whatsapp_disparado ? '✓ WhatsApp Enviado' : 'Disparar WhatsApp'}
            </Button>
            <Button variant="outline" onClick={() => setShowPDF(true)} className="gap-2 flex-1">
              <Printer className="w-4 h-4" /> Gerar PDF
            </Button>
            {rota.status === 'Aberta' && (
              <Button variant="outline" onClick={handleConcluir} disabled={concluindo} className="gap-2">
                {concluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Concluir
              </Button>
            )}
          </div>

          {/* Resultado disparo */}
          {resultado && (
            <div className={`mx-4 mt-3 p-3 rounded-lg text-sm ${resultado.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {resultado.error ? (
                <span><AlertTriangle className="inline w-4 h-4 mr-1" /> Erro: {resultado.error}</span>
              ) : (
                <span>✅ {resultado.enviados} enviado(s), {resultado.erros} erro(s)</span>
              )}
            </div>
          )}

          {/* Confirmação de disparo */}
          {confirmarDisparo && (
            <div className="mx-4 mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="font-semibold text-amber-800 mb-1">⚠️ Confirmar Disparo em Massa</p>
              <p className="text-sm text-amber-700 mb-3">
                Isso enviará mensagens de WhatsApp para <strong>{clientes.length} cliente(s)</strong>. Deseja continuar?
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDisparar} className="bg-green-600 hover:bg-green-700">Sim, disparar!</Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmarDisparo(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {/* Lista clientes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {clientes.map((cliente, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 text-sm">{cliente.cliente_nome}</p>
                      {cliente.whatsapp_enviado && <Badge className="bg-green-100 text-green-700 text-xs">✓ Enviado</Badge>}
                      {cliente.whatsapp_erro && <Badge className="bg-red-100 text-red-700 text-xs">✗ Erro</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">{cliente.cliente_telefone || 'Sem telefone'}</p>
                  </div>
                  <span className="font-bold text-blue-700">{formatCurrency(cliente.total_cliente)}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {(cliente.pedidos || []).map((p, pi) => (
                    <div key={pi} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="text-slate-600">Pedido #{p.numero_pedido}</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(p.valor_saldo)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer total */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
            <span className="text-sm font-semibold text-slate-600">💰 Total da Rota</span>
            <span className="text-xl font-extrabold text-blue-700">{formatCurrency(rota.valor_total_rota)}</span>
          </div>
        </div>
      </div>

      {showPDF && (
        <ImpressaoRotaPDF rota={rota} onClose={() => setShowPDF(false)} />
      )}
    </>
  );
}