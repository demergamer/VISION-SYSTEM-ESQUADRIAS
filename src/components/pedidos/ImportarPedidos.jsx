import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  X
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';

export default function ImportarPedidos({ clientes, rotas, onImportComplete, onCancel }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [motorista, setMotorista] = useState({ codigo: '', nome: '' });
  const [modoImportacao, setModoImportacao] = useState('nova'); // 'nova' ou 'adicionar'
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

      // Processar dados da planilha
      const pedidosImportados = [];
      const avisos = [];
      let rotaCodigo = '';

      for (let i = 11; i < jsonData.length; i++) { // Começa na linha 12 (índice 11)
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        // Verificar se é a linha "Total Geral"
        const colA = row[0]?.toString()?.trim() || '';
        if (colA.toLowerCase().includes('total geral')) {
          break;
        }

        // Pular linhas vazias ou sem dados relevantes
        if (!row[9] && !row[7]) continue; // Se não tem número do pedido nem cliente, pula

        // Extrair dados
        const rota = row[0]?.toString()?.trim() || rotaCodigo;
        if (rota) rotaCodigo = rota;

        const clienteNome = row[7]?.toString()?.trim() || ''; // Coluna H
        const numeroPedido = row[9]?.toString()?.trim() || ''; // Coluna J
        let valorPedido = row[12]; // Coluna M

        // Converter valor
        if (typeof valorPedido === 'string') {
          valorPedido = parseFloat(valorPedido.replace(/\./g, '').replace(',', '.')) || 0;
        } else {
          valorPedido = parseFloat(valorPedido) || 0;
        }

        if (!clienteNome || !numeroPedido || valorPedido <= 0) continue;

        // Verificar se cliente está cadastrado
        const clienteCadastrado = clientes.find(c => 
          c.nome?.toLowerCase().includes(clienteNome.toLowerCase()) ||
          clienteNome.toLowerCase().includes(c.nome?.toLowerCase())
        );

        if (!clienteCadastrado) {
          avisos.push(`Cliente "${clienteNome}" não encontrado no cadastro - Pedido ${numeroPedido}`);
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
          porcentagem_comissao: clienteCadastrado?.porcentagem_comissao || 5
        });
      }

      setPreview({
        rota: rotaCodigo,
        pedidos: pedidosImportados,
        totalPedidos: pedidosImportados.length,
        valorTotal: pedidosImportados.reduce((sum, p) => sum + p.valor_pedido, 0)
      });
      setErrors(avisos);

    } catch (error) {
      setErrors(['Erro ao ler o arquivo. Verifique se é um arquivo Excel válido.']);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.pedidos.length === 0) return;

    setLoading(true);
    try {
      let rotaId;

      if (modoImportacao === 'adicionar' && rotaSelecionada) {
        // Adicionar à rota existente
        rotaId = rotaSelecionada.id;
        
        // Atualizar totais da rota existente
        await base44.entities.RotaImportada.update(rotaId, {
          total_pedidos: rotaSelecionada.total_pedidos + preview.totalPedidos,
          valor_total: rotaSelecionada.valor_total + preview.valorTotal,
          motorista_codigo: motorista.codigo || rotaSelecionada.motorista_codigo,
          motorista_nome: motorista.nome || rotaSelecionada.motorista_nome
        });
      } else {
        // Criar nova rota
        const novaRota = await base44.entities.RotaImportada.create({
          codigo_rota: preview.rota,
          data_importacao: new Date().toISOString().split('T')[0],
          motorista_codigo: motorista.codigo,
          motorista_nome: motorista.nome,
          total_pedidos: preview.totalPedidos,
          pedidos_confirmados: 0,
          valor_total: preview.valorTotal,
          status: 'pendente'
        });
        rotaId = novaRota.id;
      }

      // Criar os pedidos
      const pedidosParaCriar = preview.pedidos.map(p => ({
        ...p,
        rota_importada_id: rotaId,
        data_entrega: new Date().toISOString().split('T')[0],
        total_pago: 0,
        saldo_restante: p.valor_pedido,
        status: 'aguardando',
        confirmado_entrega: false
      }));

      await base44.entities.Pedido.bulkCreate(pedidosParaCriar);

      onImportComplete();
    } catch (error) {
      setErrors(['Erro ao importar pedidos. Tente novamente.']);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      {!preview && (
        <div className="space-y-4">
          {/* Modo de Importação */}
          {rotas && rotas.length > 0 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <Label className="block mb-3 font-semibold">Modo de Importação</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={modoImportacao === 'nova' ? 'default' : 'outline'}
                  onClick={() => setModoImportacao('nova')}
                  className="w-full"
                >
                  Nova Rota
                </Button>
                <Button
                  variant={modoImportacao === 'adicionar' ? 'default' : 'outline'}
                  onClick={() => setModoImportacao('adicionar')}
                  className="w-full"
                >
                  Adicionar à Rota Existente
                </Button>
              </div>

              {/* Selecionar Rota Existente */}
              {modoImportacao === 'adicionar' && (
                <div className="mt-4 space-y-2">
                  <Label>Selecione a Rota</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={rotaSelecionada?.id || ''}
                    onChange={(e) => {
                      const rota = rotas.find(r => r.id === e.target.value);
                      setRotaSelecionada(rota);
                      if (rota) {
                        setMotorista({
                          codigo: rota.motorista_codigo || '',
                          nome: rota.motorista_nome || ''
                        });
                      }
                    }}
                  >
                    <option value="">Selecione...</option>
                    {rotas.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.codigo_rota} - {r.motorista_nome || 'Sem motorista'} ({r.total_pedidos} pedidos)
                      </option>
                    ))}
                  </select>
                  {rotaSelecionada && (
                    <p className="text-sm text-blue-700">
                      Os pedidos serão adicionados à rota existente e os totais serão atualizados
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={modoImportacao === 'adicionar' && !rotaSelecionada}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-medium text-slate-700">Clique para selecionar a planilha</p>
              <p className="text-sm text-slate-500 mt-1">Arquivos .xlsx ou .xls</p>
              {modoImportacao === 'adicionar' && !rotaSelecionada && (
                <p className="text-sm text-amber-600 mt-2">Selecione uma rota primeiro</p>
              )}
            </label>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando arquivo...</span>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          {/* Resumo */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Planilha processada com sucesso!</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-600">Rota</p>
                <p className="font-bold text-blue-800">{preview.rota}</p>
              </div>
              <div>
                <p className="text-blue-600">Total de Pedidos</p>
                <p className="font-bold text-blue-800">{preview.totalPedidos}</p>
              </div>
              <div>
                <p className="text-blue-600">Valor Total</p>
                <p className="font-bold text-blue-800">{formatCurrency(preview.valorTotal)}</p>
              </div>
            </div>
          </Card>

          {/* Avisos */}
          {errors.length > 0 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription>
                <p className="font-medium text-amber-800 mb-2">Atenção - Clientes não cadastrados:</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
                <p className="text-sm text-amber-600 mt-2">
                  Os pedidos serão importados, mas ficará pendente o cadastro desses clientes.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Motorista */}
          {modoImportacao === 'nova' && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Dados do Motorista (opcional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código do Motorista</Label>
                  <Input
                    value={motorista.codigo}
                    onChange={(e) => setMotorista({ ...motorista, codigo: e.target.value })}
                    placeholder="Ex: MOT001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Motorista</Label>
                  <Input
                    value={motorista.nome}
                    onChange={(e) => setMotorista({ ...motorista, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Lista de Pedidos */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Pedidos a serem importados ({preview.pedidos.length})</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Nº Pedido</th>
                    <th className="text-left p-2">Cliente</th>
                    <th className="text-right p-2">Valor</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.pedidos.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono">{p.numero_pedido}</td>
                      <td className="p-2">{p.cliente_nome}</td>
                      <td className="p-2 text-right">{formatCurrency(p.valor_pedido)}</td>
                      <td className="p-2 text-center">
                        {p.cliente_pendente ? (
                          <span className="text-amber-600 text-xs">Cliente pendente</span>
                        ) : (
                          <span className="text-emerald-600 text-xs">OK</span>
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

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        {preview && (
          <Button onClick={handleImport} disabled={loading || preview.pedidos.length === 0}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Importar {preview.totalPedidos} Pedidos
          </Button>
        )}
      </div>
    </div>
  );
}