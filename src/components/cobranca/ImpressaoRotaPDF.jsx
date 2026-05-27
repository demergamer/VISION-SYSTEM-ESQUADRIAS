import React, { useEffect } from 'react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function ImpressaoRotaPDF({ rota, onClose }) {
  const clientes = rota.dados_cobranca || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Overlay para fechar após impressão */}
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center print:hidden">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
          <p className="text-lg font-bold text-slate-800 mb-2">🖨️ Preparando PDF...</p>
          <p className="text-sm text-slate-500 mb-4">O diálogo de impressão será aberto automaticamente.</p>
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 underline">Fechar</button>
        </div>
      </div>

      {/* Conteúdo de impressão */}
      <div className="hidden print:block print-content" style={{ fontFamily: 'Arial, sans-serif', padding: '20px', color: '#000' }}>
        <style>{`
          @media print {
            body > *:not(.print-content) { display: none !important; }
            .print-content { display: block !important; }
            @page { margin: 15mm; size: A4 portrait; }
          }
        `}</style>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '2px solid #1e3a8a', paddingBottom: '16px' }}>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
            style={{ height: '50px' }} alt="J&C"
          />
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>Rota de Cobrança — {rota.codigo_rota}</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Data: {formatDate(rota.data_rota)} · Cobrador: {rota.cobrador_nome || 'Gil'} · Gerado em: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total Clientes', value: clientes.length },
            { label: 'Total Pedidos', value: clientes.reduce((s, c) => s + (c.pedidos?.length || 0), 0) },
            { label: 'Valor Total', value: formatCurrency(rota.valor_total_rota) },
          ].map((s, i) => (
            <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Clientes */}
        {clientes.map((cliente, idx) => (
          <div key={idx} style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', pageBreakInside: 'avoid' }}>
            <div style={{ background: '#1e3a8a', color: 'white', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px' }}>{idx + 1}. {cliente.cliente_nome}</strong>
                <span style={{ fontSize: '11px', opacity: 0.8, marginLeft: '8px' }}>{cliente.cliente_telefone}</span>
              </div>
              <strong style={{ fontSize: '14px' }}>{formatCurrency(cliente.total_cliente)}</strong>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Pedido</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Entrega</th>
                  <th style={{ padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {(cliente.pedidos || []).map((p, pi) => (
                  <tr key={pi}>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9' }}>#{p.numero_pedido}</td>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{formatDate(p.data_entrega) || '-'}</td>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(p.valor_saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Total final */}
        <div style={{ background: '#1e3a8a', color: 'white', padding: '14px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700' }}>💰 TOTAL GERAL DA ROTA</span>
          <span style={{ fontSize: '22px', fontWeight: '900' }}>{formatCurrency(rota.valor_total_rota)}</span>
        </div>

        <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '20px' }}>
          J&C One Vision System · Rota {rota.codigo_rota} · {formatDate(rota.data_rota)}
        </p>
      </div>
    </>
  );
}