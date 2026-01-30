import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2, X, Info } from "lucide-react";
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';

// ADICIONADO: Prop 'pedidosExistentes' para conferência
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

      for (let i = 11; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const colA = row[0]?.toString()?.trim() || '';
        if (colA.toLowerCase().includes('total geral')) break;
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
          // Novos campos de controle
          duplicado: deveIgnorar,
          status_existente: statusExistencia
        });
      }

      // Filtrar apenas os válidos para os totais do preview, mas manter todos na lista visual
      const validos = pedidosImportados.filter(p => !p.duplicado);

      setPreview({
        rota: rotaCodigo,
        pedidos: pedidosImportados, // Mostra todos
        totalPedidos: validos.length,
        valorTotal: validos.reduce((sum, p) => sum + p.valor_pedido, 0)
      });
      setErrors(avisos);

    } catch (error) {
      setErrors(['Erro ao ler o arquivo. Verifique se é um arquivo Excel válido.']);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    
    // Filtra apenas os não duplicados para importar
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
          valor_total: rotaSelecionada.valor_total + preview.valorTotal, // Usa o total recalculado dos válidos
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
        // ... dados do pedido ...
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

  // ... (Resto do JSX igual, alterando apenas a tabela de preview)

  return (
    <div className="space-y-6">
        {/* ... (Partes de upload iguais até a tabela) ... */}
        
        {preview && (
            <div className="space-y-4">
               {/* Resumo atualizado para mostrar Ignorados */}
               <Card className="p-4 bg-blue-50 border-blue-200">
                 {/* ... header do card ... */}
                 <div className="grid grid-cols-4 gap-4 text-sm">
                    {/* ... outros dados ... */}
                    <div>
                        <p className="text-blue-600">Novos Pedidos</p>
                        <p className="font-bold text-blue-800">{preview.totalPedidos}</p>
                    </div>
                    <div>
                        <p className="text-amber-600">Ignorados (Duplicados)</p>
                        <p className="font-bold text-amber-800">{preview.pedidos.length - preview.totalPedidos}</p>
                    </div>
                 </div>
               </Card>

               {/* ... Avisos ... */}

               {/* Lista de Pedidos com Coluna de Status */}
               <Card className="p-4">
                 <h3 className="font-semibold mb-3">Pré-visualização</h3>
                 <div className="max-h-64 overflow-y-auto">
                   <table className="w-full text-sm">
                     <thead className="bg-slate-50 sticky top-0 z-10">
                       <tr>
                         <th className="text-left p-2">Nº Pedido</th>
                         <th className="text-left p-2">Cliente</th>
                         <th className="text-right p-2">Valor</th>
                         <th className="text-center p-2">Validação</th>
                       </tr>
                     </thead>
                     <tbody>
                       {preview.pedidos.map((p, i) => (
                         <tr key={i} className={`border-t ${p.duplicado ? 'bg-slate-50 opacity-60' : ''}`}>
                           <td className="p-2 font-mono">{p.numero_pedido}</td>
                           <td className="p-2">{p.cliente_nome}</td>
                           <td className="p-2 text-right">{formatCurrency(p.valor_pedido)}</td>
                           <td className="p-2 text-center">
                             {p.duplicado ? (
                               <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">
                                 <Info className="w-3 h-3" /> Existe em: {p.status_existente}
                               </span>
                             ) : p.cliente_pendente ? (
                               <span className="text-amber-600 text-xs font-medium">Cliente Pendente</span>
                             ) : (
                               <span className="text-emerald-600 text-xs font-bold flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3"/> Novo</span>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </Card>
            </div>
        )}

        {/* ... Footer Actions ... */}
        <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
            {preview && (
                <Button onClick={handleImport} disabled={loading || preview.totalPedidos === 0}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Importar {preview.totalPedidos} Novos
                </Button>
            )}
        </div>
    </div>
  );
}