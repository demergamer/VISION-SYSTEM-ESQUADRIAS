import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2, X, Info } from "lucide-react";
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';

export default function ImportarPedidos({ clientes, rotas, pedidosExistentes = [], onImportComplete, onCancel }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [motorista, setMotorista] = useState({ codigo: '', nome: '' });
  const [modoImportacao, setModoImportacao] = useState('nova');
  const [rotaSelecionada, setRotaSelecionada] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setErrors([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const pedidosImportados = [];
      const avisos = [];
      let rotaCodigo = '';

      // Começa na linha 12 (índice 11) conforme seu padrão
      for (let i = 11; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const colA = row[0]?.toString()?.trim() || '';
        if (colA.toLowerCase().includes('total geral')) break;
        
        // Se não tem número do pedido (col J) nem cliente (col H), pula
        if (!row[9] && !row[7]) continue;

        const rota = row[0]?.toString()?.trim() || rotaCodigo;
        if (rota) rotaCodigo = rota;

        const clienteNome = row[7]?.toString()?.trim() || '';
        const numeroPedido = row[9]?.toString()?.trim() || '';
        let valorPedido = row[12];

        if (typeof valorPedido === 'string') {
          valorPedido = parseFloat(valorPedido.replace(/\./g, '').replace(',', '.')) || 0;
        } else {
          valorPedido = parseFloat(valorPedido) || 0;
        }

        if (!clienteNome || !numeroPedido || valorPedido <= 0) continue;

        const clienteCadastrado = clientes.find(c => 
          c.nome?.toLowerCase().includes(clienteNome.toLowerCase()) ||
          clienteNome.toLowerCase().includes(c.nome?.toLowerCase())
        );

        if (!clienteCadastrado) {
          avisos.push(`Cliente "${clienteNome}" não encontrado - Pedido ${numeroPedido}`);
        }

        // VERIFICAÇÃO DE DUPLICIDADE
        const pedidoJaExiste = pedidosExistentes.find(p => String(p.numero_pedido) === String(numeroPedido));
        let statusExistencia = null;
        let deveIgnorar = false;

        if (pedidoJaExiste) {
            deveIgnorar = true;
            switch(pedidoJaExiste.status) {
                case 'pago': statusExistencia = 'Liquidado'; break;
                case 'cancelado': statusExistencia = 'Cancelado'; break;
                case 'aguardando': statusExistencia = 'Em Trânsito'; break;
                default: statusExistencia = 'Aberto';
            }
        }

        pedidosImportados.push({
          rota_codigo: rotaCodigo,
          cliente_nome: clienteNome,
          cliente_codigo: clienteCadastrado?.codigo || '',
          cliente_regiao: clienteCadastrado?.regiao || '',
          representante_codigo: clienteCadastrado?.representante_codigo || '',
          representante_nome: clienteCadastrado?.representante_nome || '',
          numero_pedido: numeroPedido,
          valor_pedido: valorPedido,
          cliente_pendente: !clienteCadastrado,
          porcentagem_comissao: clienteCadastrado?.porcentagem_comissao || 5,
          duplicado: deveIgnorar,
          status_existente: statusExistencia
        });
      }

      const validos = pedidosImportados.filter(p => !p.duplicado);

      setPreview({
        rota: rotaCodigo,
        pedidos: pedidosImportados,
        totalPedidos: validos.length,
        valorTotal: validos.reduce((sum, p) => sum + p.valor_pedido, 0)
      });
      setErrors(avisos);

    } catch (error) {
      console.error(error);
      setErrors(['Erro ao ler o arquivo. Verifique se é um arquivo Excel válido.']);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    
    const pedidosParaImportar = preview.pedidos.filter(p => !p.duplicado);
    if (pedidosParaImportar.length === 0) {
        alert("Todos os pedidos da planilha já existem no sistema.");
        return;
    }

    setLoading(true);
    try {
      let rotaId;

      if (modoImportacao === 'adicionar' && rotaSelecionada) {
        rotaId = rotaSelecionada.id;
        await base44.entities.RotaImportada.update(rotaId, {
          total_pedidos: rotaSelecionada.total_pedidos + pedidosParaImportar.length,
          valor_total: rotaSelecionada.valor_total + preview.valorTotal,
          motorista_codigo: motorista.codigo || rotaSelecionada.motorista_codigo,
          motorista_nome: motorista.nome || rotaSelecionada.motorista_nome
        });
      } else {
        const novaRota = await base44.entities.RotaImportada.create({
          codigo_rota: preview.rota,
          data_importacao: new Date().toISOString().split('T')[0],
          motorista_codigo: motorista.codigo,
          motorista_nome: motorista.nome,
          total_pedidos: pedidosParaImportar.length,
          pedidos_confirmados: 0,
          valor_total: preview.valorTotal,
          status: 'pendente'
        });
        rotaId = novaRota.id;
      }

      const payload = pedidosParaImportar.map(p => ({
        rota_importada_id: rotaId,
        cliente_nome: p.cliente_nome,
        cliente_codigo: p.cliente_codigo,
        cliente_regiao: p.cliente_regiao,
        representante_codigo: p.representante_codigo,
        representante_nome: p.representante_nome,
        numero_pedido: p.numero_pedido,
        valor_pedido: p.valor_pedido,
        cliente_pendente: p.cliente_pendente,
        porcentagem_comissao: p.porcentagem_comissao,
        data_entrega: new Date().toISOString().split('T')[0],
        total_pago: 0,
        saldo_restante: p.valor_pedido,
        status: 'aguardando',
        confirmado_entrega: false
      }));

      await base44.entities.Pedido.bulkCreate(payload);
      onImportComplete();
    } catch (error) {
      setErrors(['Erro ao importar pedidos. Tente novamente.']);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="space-y-6">
      {!preview && (
        <div className="space-y-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <Label className="block mb-3 font-semibold">Modo de Importação</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button variant={modoImportacao === 'nova' ? 'default' : 'outline'} onClick={() => setModoImportacao('nova')} className="w-full">Nova Rota</Button>
              <Button variant={modoImportacao === 'adicionar' ? 'default' : 'outline'} onClick={() => setModoImportacao('adicionar')} className="w-full">Adicionar à Existente</Button>
            </div>
            {modoImportacao === 'adicionar' && (
              <div className="mt-4 space-y-2">
                <Label>Selecione a Rota</Label>
                <select className="w-full p-2 border rounded-md" value={rotaSelecionada?.id || ''} onChange={(e) => { const r = rotas.find(x => x.id === e.target.value); setRotaSelecionada(r); if(r) setMotorista({ codigo: r.motorista_codigo, nome: r.motorista_nome }); }}>
                  <option value="">Selecione...</option>
                  {rotas && rotas.map(r => <option key={r.id} value={r.id}>{r.codigo_rota} - {r.motorista_nome}</option>)}
                </select>
              </div>
            )}
          </Card>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="file-upload" disabled={modoImportacao === 'adicionar' && !rotaSelecionada} />
            <label htmlFor="file-upload" className="cursor-pointer">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-medium text-slate-700">Clique para selecionar planilha</p>
            </label>
          </div>
          {loading && <div className="flex justify-center gap-2"><Loader2 className="animate-spin" /> Processando...</div>}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
           <Card className="p-4 bg-blue-50 border-blue-200">
             <div className="grid grid-cols-4 gap-4 text-sm">
                <div><p className="text-blue-600">Novos Pedidos</p><p className="font-bold text-blue-800">{preview.totalPedidos}</p></div>
                <div><p className="text-amber-600">Ignorados</p><p className="font-bold text-amber-800">{preview.pedidos.length - preview.totalPedidos}</p></div>
                <div><p className="text-blue-600">Rota</p><p className="font-bold text-blue-800">{preview.rota}</p></div>
                <div><p className="text-blue-600">Valor Total</p><p className="font-bold text-blue-800">{formatCurrency(preview.valorTotal)}</p></div>
             </div>
           </Card>

           <Card className="p-4">
             <h3 className="font-semibold mb-3">Pré-visualização</h3>
             <div className="max-h-64 overflow-y-auto">
               <table className="w-full text-sm">
                 <thead className="bg-slate-50 sticky top-0 z-10">
                   <tr>
                     <th className="text-left p-2">Nº Pedido</th>
                     <th className="text-left p-2">Cliente</th>
                     <th className="text-right p-2">Valor</th>
                     <th className="text-center p-2">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {preview.pedidos.map((p, i) => (
                     <tr key={i} className={`border-t ${p.duplicado ? 'bg-slate-50 opacity-60' : ''}`}>
                       <td className="p-2 font-mono">{p.numero_pedido}</td>
                       <td className="p-2">{p.cliente_nome}</td>
                       <td className="p-2 text-right">{formatCurrency(p.valor_pedido)}</td>
                       <td className="p-2 text-center">
                         {p.duplicado ? <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">Existe: {p.status_existente}</span> : 
                          p.cliente_pendente ? <span className="text-amber-600 text-xs">Pendente</span> : 
                          <span className="text-emerald-600 text-xs font-bold">Novo</span>}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </Card>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        {preview && (
            <Button onClick={handleImport} disabled={loading || preview.totalPedidos === 0}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 w-4 h-4" />}
                Importar {preview.totalPedidos} Novos
            </Button>
        )}
      </div>
    </div>
  );
}