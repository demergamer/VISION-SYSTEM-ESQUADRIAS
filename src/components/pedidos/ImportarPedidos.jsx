import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, X, Merge, Trash2, ChevronDown, ChevronUp, Plus, Link } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { cn } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

// Formata número do pedido com pontos de milhar: 53000 -> 53.000
function formatarNumeroPedido(num) {
  if (!num) return num;
  const str = String(num).trim().replace(/\./g, ''); // remove pontos existentes
  const n = parseInt(str, 10);
  if (isNaN(n)) return str;
  return n.toLocaleString('pt-BR').replace(/,/g, '.');
}

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

function parseExcelFile(arrayBuffer, clientes, pedidosExistentes) {
  const workbook = XLSX.read(arrayBuffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const pedidosImportados = [];
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

    const pedidoJaExiste = pedidosExistentes.find(p => String(p.numero_pedido) === String(numeroPedido));
    let statusExistencia = null;
    let duplicado = false;

    if (pedidoJaExiste) {
      duplicado = true;
      switch (pedidoJaExiste.status) {
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
      numero_pedido: formatarNumeroPedido(numeroPedido),
      valor_pedido: valorPedido,
      cliente_pendente: !clienteCadastrado,
      porcentagem_comissao: clienteCadastrado?.porcentagem_comissao || 5,
      duplicado,
      status_existente: statusExistencia
    });
  }

  return { pedidos: pedidosImportados, rotaCodigo };
}

export default function ImportarPedidos({ clientes, pedidosExistentes = [], onImportComplete, onCancel }) {
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedForMerge, setSelectedForMerge] = useState([]);

  const { data: rotasExistentes = [] } = useQuery({
    queryKey: ['rotas_importar'],
    queryFn: () => base44.entities.RotaImportada.filter({ status: 'pendente' })
  });

  const handleFilesChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLoadingFile(true);

    const novosArquivos = [];
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const { pedidos, rotaCodigo } = parseExcelFile(buffer, clientes, pedidosExistentes);
        novosArquivos.push({
          fileName: file.name,
          pedidos,
          rotaCodigo,
          nome_rota: rotaCodigo || '',
          motorista: '',
          motorista_codigo: '',
          codigo_rota: rotaCodigo || '',
          selected: false,
          merged: false,
          modo_rota: 'nova', // 'nova' ou 'existente'
          rota_existente_id: ''
        });
      } catch (err) {
        console.error('Erro ao ler:', file.name, err);
      }
    }

    setArquivos(prev => [...prev, ...novosArquivos]);
    setLoadingFile(false);
    e.target.value = '';
  }, [clientes, pedidosExistentes]);

  const handleRemove = (index) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
    setSelectedForMerge(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const toggleSelectForMerge = (index) => {
    setSelectedForMerge(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleMerge = () => {
    if (selectedForMerge.length < 2) return;
    const toMerge = selectedForMerge.map(i => arquivos[i]);
    const mergedPedidos = toMerge.flatMap(a => a.pedidos);
    const merged = {
      fileName: toMerge.map(a => a.fileName).join(' + '),
      pedidos: mergedPedidos,
      rotaCodigo: toMerge[0].rotaCodigo,
      nome_rota: toMerge[0].nome_rota,
      motorista: toMerge[0].motorista,
      motorista_codigo: toMerge[0].motorista_codigo || '',
      codigo_rota: toMerge[0].codigo_rota,
      selected: false,
      merged: true,
      modo_rota: 'nova',
      rota_existente_id: ''
    };
    const remaining = arquivos.filter((_, i) => !selectedForMerge.includes(i));
    setArquivos([...remaining, merged]);
    setSelectedForMerge([]);
  };

  const updateArquivo = (index, field, value) => {
    setArquivos(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleImport = async () => {
    const arquivosValidos = arquivos.filter(a => {
      const novos = a.pedidos.filter(p => !p.duplicado);
      return novos.length > 0;
    });

    if (arquivosValidos.length === 0) {
      alert('Nenhum pedido novo para importar.');
      return;
    }

    setLoading(true);
    try {
      for (const arq of arquivosValidos) {
        const pedidosParaImportar = arq.pedidos.filter(p => !p.duplicado);
        const valorTotal = pedidosParaImportar.reduce((s, p) => s + p.valor_pedido, 0);

        let rotaId;
        if (arq.modo_rota === 'existente' && arq.rota_existente_id) {
          // Adicionar à rota existente: atualiza contagem
          rotaId = arq.rota_existente_id;
          const rotaExistente = rotasExistentes.find(r => r.id === rotaId);
          if (rotaExistente) {
            await base44.entities.RotaImportada.update(rotaId, {
              total_pedidos: (rotaExistente.total_pedidos || 0) + pedidosParaImportar.length,
              valor_total: (rotaExistente.valor_total || 0) + valorTotal,
            });
          }
        } else {
          // Criar nova rota
          const novaRota = await base44.entities.RotaImportada.create({
            codigo_rota: arq.codigo_rota || arq.rotaCodigo,
            data_importacao: new Date().toISOString().split('T')[0],
            motorista_codigo: arq.motorista_codigo || '',
            motorista_nome: arq.motorista,
            total_pedidos: pedidosParaImportar.length,
            pedidos_confirmados: 0,
            valor_total: valorTotal,
            status: 'pendente'
          });
          rotaId = novaRota.id;
        }

        const rotaInfo = arq.modo_rota === 'existente'
          ? rotasExistentes.find(r => r.id === rotaId)
          : null;

        const payload = pedidosParaImportar.map(p => ({
          rota_importada_id: rotaId,
          rota_codigo: rotaInfo ? rotaInfo.codigo_rota : (arq.codigo_rota || arq.rotaCodigo),
          rota_entrega: rotaInfo ? rotaInfo.codigo_rota : (arq.nome_rota || arq.codigo_rota),
          motorista_atual: rotaInfo ? rotaInfo.motorista_nome : arq.motorista,
          motorista_codigo: rotaInfo ? rotaInfo.motorista_codigo : (arq.motorista_codigo || ''),
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
      }
      onImportComplete();
    } catch (error) {
      console.error(error);
      alert('Erro ao importar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const totalNovos = arquivos.reduce((s, a) => s + a.pedidos.filter(p => !p.duplicado).length, 0);
  const totalValor = arquivos.reduce((s, a) => s + a.pedidos.filter(p => !p.duplicado).reduce((sv, p) => sv + p.valor_pedido, 0), 0);

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50">
        <input type="file" accept=".xlsx,.xls" multiple onChange={handleFilesChange} className="hidden" id="file-upload-multi" />
        <label htmlFor="file-upload-multi" className="cursor-pointer flex flex-col items-center gap-2">
          <FileSpreadsheet className="w-10 h-10 text-slate-400" />
          <p className="font-medium text-slate-700">Clique para selecionar <span className="text-blue-600">um ou mais arquivos Excel</span></p>
          <p className="text-xs text-slate-400">Você pode selecionar vários arquivos de uma vez</p>
        </label>
        {loadingFile && <div className="flex justify-center items-center gap-2 mt-3 text-slate-500"><Loader2 className="animate-spin w-4 h-4" /> Processando arquivos...</div>}
      </div>

      {/* Merge button */}
      {selectedForMerge.length >= 2 && (
        <Button onClick={handleMerge} className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Merge className="w-4 h-4" /> Mesclar {selectedForMerge.length} arquivos selecionados em uma única rota
        </Button>
      )}

      {/* Lista de arquivos */}
      {arquivos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">{arquivos.length} arquivo(s) carregado(s)</h3>
            <p className="text-xs text-slate-400">Selecione 2+ para mesclar</p>
          </div>
          {arquivos.map((arq, index) => {
            const novos = arq.pedidos.filter(p => !p.duplicado);
            const duplicados = arq.pedidos.filter(p => p.duplicado);
            const isExpanded = expandedIndex === index;
            const isSelected = selectedForMerge.includes(index);

            return (
              <Card key={index} className={cn("overflow-hidden border-2 transition-all", isSelected ? "border-purple-300 bg-purple-50/30" : "border-slate-200")}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectForMerge(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                          <p className="font-semibold text-slate-800 truncate text-sm">{arq.fileName}</p>
                          {arq.merged && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">MESCLADO</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-full">{novos.length} novos</span>
                          {duplicados.length > 0 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{duplicados.length} duplicados</span>}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => handleRemove(index)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Modo de rota */}
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => updateArquivo(index, 'modo_rota', 'nova')}
                          className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                            arq.modo_rota !== 'existente' ? "bg-blue-50 border-blue-300 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          <Plus className="w-3 h-3" /> Nova Rota
                        </button>
                        <button
                          onClick={() => updateArquivo(index, 'modo_rota', 'existente')}
                          className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                            arq.modo_rota === 'existente' ? "bg-purple-50 border-purple-300 text-purple-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          <Link className="w-3 h-3" /> Adicionar a Rota Existente
                        </button>
                      </div>

                      {/* Inputs obrigatórios */}
                      {arq.modo_rota === 'existente' ? (
                        <div className="mb-3">
                          <Label className="text-xs text-slate-500 mb-1 block">Selecionar Rota Existente *</Label>
                          <Select
                            value={arq.rota_existente_id}
                            onValueChange={(val) => {
                              const r = rotasExistentes.find(r => r.id === val);
                              setArquivos(prev => prev.map((a, i) => i === index ? {
                                ...a,
                                rota_existente_id: val,
                                nome_rota: r?.codigo_rota || '',
                                motorista: r?.motorista_nome || '',
                                motorista_codigo: r?.motorista_codigo || '',
                                codigo_rota: r?.codigo_rota || '',
                              } : a));
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Selecione uma rota ativa..." />
                            </SelectTrigger>
                            <SelectContent>
                              {rotasExistentes.map(r => (
                                <SelectItem key={r.id} value={r.id}>
                                  <span className="font-semibold">{r.codigo_rota}</span>
                                  {r.motorista_nome && <span className="text-xs text-slate-400 ml-2">· {r.motorista_nome}</span>}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {arq.rota_existente_id && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div><Label className="text-[10px] text-slate-400 block">Motorista (auto)</Label><Input value={arq.motorista} readOnly className="h-7 text-xs bg-slate-100 opacity-70" /></div>
                              <div><Label className="text-[10px] text-slate-400 block">Cód. Motorista (auto)</Label><Input value={arq.motorista_codigo} readOnly className="h-7 text-xs bg-slate-100 opacity-70" /></div>
                              <div><Label className="text-[10px] text-slate-400 block">Cód. Rota (auto)</Label><Input value={arq.codigo_rota} readOnly className="h-7 text-xs bg-slate-100 opacity-70" /></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Nome da Rota *</Label>
                            <Input value={arq.nome_rota} onChange={e => updateArquivo(index, 'nome_rota', e.target.value)} placeholder="Ex: Zona Sul A" className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Motorista *</Label>
                            <Input value={arq.motorista} onChange={e => updateArquivo(index, 'motorista', e.target.value)} placeholder="Nome do motorista" className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Cód. Motorista</Label>
                            <Input value={arq.motorista_codigo} onChange={e => updateArquivo(index, 'motorista_codigo', e.target.value)} placeholder="Ex: 045" className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Código da Rota *</Label>
                            <Input value={arq.codigo_rota} onChange={e => updateArquivo(index, 'codigo_rota', e.target.value)} placeholder="Ex: 001" className="h-8 text-sm" />
                          </div>
                        </div>
                      )}

                      {/* Preview toggle */}
                      {arq.pedidos.length > 0 && (
                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : index)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Ocultar' : 'Ver'} {arq.pedidos.length} pedidos · {formatCurrency(novos.reduce((s, p) => s + p.valor_pedido, 0))}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Nº Pedido</th>
                          <th className="text-left p-2">Cliente</th>
                          <th className="text-right p-2">Valor</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arq.pedidos.map((p, i) => (
                          <tr key={i} className={cn("border-t", p.duplicado && "opacity-50 bg-slate-50")}>
                            <td className="p-2 font-mono">{p.numero_pedido}</td>
                            <td className="p-2">{p.cliente_nome}</td>
                            <td className="p-2 text-right">{formatCurrency(p.valor_pedido)}</td>
                            <td className="p-2 text-center">
                              {p.duplicado
                                ? <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">Existe: {p.status_existente}</span>
                                : p.cliente_pendente
                                  ? <span className="text-amber-600 font-medium">Pendente</span>
                                  : <span className="text-emerald-600 font-bold">Novo</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo total */}
      {totalNovos > 0 && (
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-emerald-800">{arquivos.length} rota(s) · {totalNovos} pedidos novos</p>
              <p className="text-xs text-emerald-600">Total a importar: {formatCurrency(totalValor)}</p>
            </div>
            <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalValor)}</span>
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button onClick={handleImport} disabled={loading || totalNovos === 0 || arquivos.some(a => !a.codigo_rota)}>
          {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Upload className="mr-2 w-4 h-4" />}
          Importar {totalNovos} Pedidos em {arquivos.length} Rota(s)
        </Button>
      </div>
    </div>
  );
}