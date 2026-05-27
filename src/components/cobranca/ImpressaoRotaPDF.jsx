import React, { useEffect } from 'react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function ImpressaoRotaPDF({ rota, onClose }) {
  // Dados congelados no snapshot JSON da entidade RotaCobranca
  const clientes = rota.dados_cobranca || [];

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Overlay (visível na tela, oculto na impressão) */}
      <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center print:hidden">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
          <p className="text-lg font-bold text-slate-800 mb-2">🖨️ Preparando Relatório PDF...</p>
          <p className="text-sm text-slate-500 mb-4">O diálogo de impressão abrirá automaticamente.</p>
          <button onClick={onClose} className="text-sm text-blue-500 hover:underline">Fechar</button>
        </div>
      </div>

      {/* Conteúdo de impressão */}
      <div className="hidden print:block" id="rota-pdf-content" style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: '0' }}>
        <style>{`
          @media print {
            body > *:not(#rota-pdf-content):not(#rota-pdf-content *) { display: none !important; }
            #rota-pdf-content { display: block !important; }
            @page { margin: 12mm; size: A4 portrait; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        `}</style>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', borderBottom: '2px solid #1e3a8a', paddingBottom: '12px' }}>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
            style={{ height: '44px' }} alt="J&C"
          />
          <div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a' }}>Rota de Cobrança — {rota.codigo_rota}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Data: <strong>{formatDate(rota.data_rota)}</strong> · Cobrador: <strong>{rota.cobrador_nome || 'Gil'}</strong> · Gerado em: {new Date().toLocaleString('pt-BR')}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Total Geral</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e3a8a' }}>{formatCurrency(rota.valor_total_rota)}</div>
          </div>
        </div>

        {/* Resumo rápido */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Clientes', value: clientes.length },
            { label: 'Pedidos', value: clientes.reduce((s, c) => s + (c.pedidos?.length || 0), 0) },
            { label: 'Com WhatsApp', value: clientes.filter(c => c.whatsapp_enviado).length },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e3a8a' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabela de Pedidos por Cliente */}
        {clientes.map((cliente, idx) => (
          <div key={idx} style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
            {/* Header do cliente */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '6px 6px 0 0' }}>
              <div>
                <strong style={{ fontSize: '13px' }}>{idx + 1}. {cliente.cliente_nome}</strong>
                <span style={{ fontSize: '10px', opacity: 0.8, marginLeft: '10px' }}>{cliente.cliente_telefone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {cliente.whatsapp_enviado && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>✓ WhatsApp</span>}
                <strong style={{ fontSize: '13px' }}>{formatCurrency(cliente.total_cliente)}</strong>
              </div>
            </div>

            {/* Tabela de pedidos */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '5px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '80px' }}>Pedido</th>
                  <th style={{ padding: '5px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Entrega Prev.</th>
                  <th style={{ padding: '5px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Status Original</th>
                  <th style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', width: '90px' }}>Saldo (R$)</th>
                  <th style={{ padding: '5px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '130px' }}>Observações / Recibo</th>
                </tr>
              </thead>
              <tbody>
                {(cliente.pedidos || []).map((p, pi) => (
                  <tr key={pi} style={{ background: pi % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '5px 10px', borderBottom: '1px solid #f1f5f9', fontWeight: '700' }}>#{p.numero_pedido}</td>
                    <td style={{ padding: '5px 10px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{formatDate(p.data_entrega)}</td>
                    <td style={{ padding: '5px 10px', borderBottom: '1px solid #f1f5f9', color: p.em_transito ? '#16a34a' : '#64748b' }}>
                      {p.em_transito ? '🚚 Em Trânsito' : (p.status_original || '-')}
                    </td>
                    <td style={{ padding: '5px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                      {formatCurrency(p.valor_saldo)}
                    </td>
                    <td style={{ padding: '5px 10px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}></td>
                  </tr>
                ))}
                {/* Subtotal do cliente */}
                <tr style={{ background: '#f0f4ff' }}>
                  <td colSpan={3} style={{ padding: '5px 10px', fontWeight: '700', fontSize: '11px', color: '#1e3a8a' }}>
                    SUBTOTAL {cliente.cliente_nome}
                  </td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: '900', color: '#1e3a8a' }}>
                    {formatCurrency(cliente.total_cliente)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Total Geral */}
        <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700' }}>💰 TOTAL GERAL DA ROTA {rota.codigo_rota}</span>
          <span style={{ fontSize: '20px', fontWeight: '900' }}>{formatCurrency(rota.valor_total_rota)}</span>
        </div>

        <p style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center', marginTop: '12px' }}>
          J&C One Vision System · Rota {rota.codigo_rota} · {formatDate(rota.data_rota)} · Relatório gerado em {new Date().toLocaleString('pt-BR')} · Dados históricos congelados em {new Date(rota.created_date || Date.now()).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </>
  );
}