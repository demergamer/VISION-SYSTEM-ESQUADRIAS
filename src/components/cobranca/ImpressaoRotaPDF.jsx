import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function ImpressaoRotaPDF({ rota, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const conteudo = printRef.current.innerHTML;
    const janela = window.open('', '_blank');
    janela.document.write(`
      <html>
        <head>
          <title>Rota ${rota.codigo_rota}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 20px; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            h2 { font-size: 14px; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; font-weight: bold; }
            .total { font-weight: bold; text-align: right; font-size: 14px; margin-top: 12px; }
            .recusado { opacity: 0.4; text-decoration: line-through; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>${conteudo}</body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    janela.print();
    janela.close();
  };

  const clientes = rota.dados_cobranca || [];
  const ativos = clientes.filter((c) => !c.recusado);
  const totalGeral = ativos.reduce((s, c) => s + (c.total_cliente || 0), 0);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Relatório — {rota.codigo_rota}</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </Button>
            <Button variant="outline" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="overflow-auto flex-1 p-6">
          <div ref={printRef}>
            <h1>🛵 Rota de Cobrança — {rota.codigo_rota}</h1>
            <p>Data: {formatDate(rota.data_rota)} &nbsp;|&nbsp; Cobrador: {rota.cobrador_nome || 'Gil'} &nbsp;|&nbsp; Status: {rota.status}</p>
            <p>Total de clientes: {clientes.length} &nbsp;|&nbsp; Ativos: {ativos.length}</p>

            <h2>Clientes da Rota</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Cidade</th>
                  <th>Representante</th>
                  <th>Pedidos</th>
                  <th>Total</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr key={i} className={c.recusado ? 'recusado' : ''}>
                    <td>{i + 1}</td>
                    <td>{c.cliente_nome}</td>
                    <td>{c.cliente_cidade || '—'}</td>
                    <td>{c.representante_nome || '—'}</td>
                    <td>
                      {(c.pedidos || []).map((p, pi) => (
                        <div key={pi}>
                          {p.tipo_item === 'cheque' ? `Cheque ${p.numero_pedido}` : `Pedido ${p.numero_pedido}`}: {formatCurrency(p.valor_saldo)}
                        </div>
                      ))}
                    </td>
                    <td>{formatCurrency(c.total_cliente)}</td>
                    <td>{c.recusado ? 'Recusado' : c.whatsapp_enviado ? '✓ WhatsApp' : 'Pendente'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="total">Total Geral: {formatCurrency(totalGeral)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}