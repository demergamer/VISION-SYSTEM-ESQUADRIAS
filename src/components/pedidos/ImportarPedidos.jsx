import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2, X, Merge, Trash2, ChevronDown, ChevronUp, Plus, Link, Factory, Truck } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { cn } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

function formatarNumeroPedido(num) {
  if (!num) return num;
  const str = String(num).trim().replace(/\./g, '');
  const n = parseInt(str, 10);
  if (isNaN(n)) return str;
  return n.toLocaleString('pt-BR').replace(/,/g, '.');
}

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// ─── PARTE 1: Parser da planilha de PRODUÇÃO (pedidoqt.xlsx) ─────────────────
function parsePlanilhaProducao(arrayBuffer, clientes, pedidosExistentes) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const hoje = new Date().toISOString().split('T')[0];
  let currentPedido = '';
  let currentClienteCodigo = '';
  let currentClienteNome = '';
  const pedidosMap = new Map(); // numero_pedido -> pedido data
  const totalRows = rows.length;

  for (let i = 0; i < totalRows; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const colA = String(row[0]).trim();

    if (colA.toLowerCase().includes('total geral')) break;

    if (colA === 'Pedido:') {
      currentPedido = formatarNumeroPedido(String(row[1]).replace('.0', '').trim());
      currentClienteCodigo = String(row[7] || '').trim();
      currentClienteNome = String(row[8] || '').trim();

      // Fallback: nome do cliente pode estar na próxima linha
      const nextRow = rows[i + 1];
      if (nextRow && (String(nextRow[0]).trim() === 'F' || String(nextRow[0]).trim() === 'J') && nextRow[7]) {
        currentClienteNome = String(nextRow[7]).trim();
      }

      // Capturar observação: procura "Peso Líquido:" e pega 2 linhas acima
      for (let j = i + 1; j < Math.min(i + 30, totalRows); j++) {
        const r = rows[j];
        if (!r) continue;
        const txt = String(r[0] || '').toLowerCase();
        if (txt.includes('peso líquido') || txt.includes('peso liquido')) {
          if (j >= 2) {
            const obsRow = rows[j - 2];
            const obsText = (obsRow || []).map(c => String(c || '').trim()).filter(Boolean).join(' ').trim();
            if (obsText && !pedidosMap.has(currentPedido)) {
              // Guardamos para depois
            }
            if (obsText && currentPedido) {
              const existing = pedidosMap.get(currentPedido);
              if (existing) existing.observacao = obsText;
            }
          }
          break;
        }
      }

      // Criar entrada do pedido se não existir
      if (currentPedido && !pedidosMap.has(currentPedido)) {
        const clienteCadastrado = clientes.find(c => c.codigo === currentClienteCodigo) ||
          clientes.find(c => c.nome?.trim().toLowerCase() === currentClienteNome.trim().toLowerCase());

        const pedidoJaExiste = pedidosExistentes.find(p =>
          String(p.numero_pedido).replace(/\./g, '') === String(currentPedido).replace(/\./g, '')
        );

        // Regra 4: fonte de verdade para o nome do cliente é o cadastro do sistema
        const nomeClienteFinal = clienteCadastrado ? clienteCadastrado.nome : currentClienteNome;

        pedidosMap.set(currentPedido, {
          numero_pedido: currentPedido,
          cliente_codigo: clienteCadastrado?.codigo || currentClienteCodigo || '',
          cliente_nome: nomeClienteFinal,
          cliente_regiao: clienteCadastrado?.regiao || '',
          representante_codigo: clienteCadastrado?.representante_codigo || '',
          representante_nome: clienteCadastrado?.representante_nome || '',
          porcentagem_comissao: clienteCadastrado?.porcentagem_comissao || 5,
          cliente_pendente: !clienteCadastrado,
          data_importado: hoje,
          status: 'emproducao',
          itens_pedido: [],
          observacao: '',
          valor_pedido: 0,
          total_pago: 0,
          saldo_restante: 0,
          confirmado_entrega: false,
          jaExiste: !!pedidoJaExiste,
          pedidoExistenteId: pedidoJaExiste?.id || null,
          source: 'producao'
        });
      }
      continue;
    }

    // Linha de item
    const isItemRow = colA !== '' && colA.length < 15 && /^(\d+(\.\d+)?)$/.test(colA);
    if (currentPedido && isItemRow) {
      const codigoProd = String(row[1] || 'S/C').trim();
      let descricaoProd = String(row[3] || '').trim();
      if (!descricaoProd || descricaoProd.length < 3) {
        descricaoProd = row.find((c, idx) => idx > 1 && typeof c === 'string' && c.trim().length > 5) || 'Produto sem descrição';
      }
      let qtdeProd = parseFloat(row[10]);
      if (isNaN(qtdeProd) || qtdeProd <= 0) {
        for (let c = row.length - 1; c >= 2; c--) {
          if (!isNaN(parseFloat(row[c])) && parseFloat(row[c]) > 0) {
            qtdeProd = parseFloat(row[c]);
            break;
          }
        }
      }
      if (descricaoProd && qtdeProd > 0) {
        const pedEntry = pedidosMap.get(currentPedido);
        if (pedEntry) {
          pedEntry.itens_pedido.push({
            codigo_peca: codigoProd,
            descricao_peca: descricaoProd,
            quantidade: qtdeProd,
            valor_unitario: 0
          });
        }
      }
    }
  }

  return Array.from(pedidosMap.values());
}

// ─── PARTE 2: Parser da planilha de ROTA (relpedsx.xls) ──────────────────────
function parsePlanilhaRota(arrayBuffer, clientes, pedidosExistentes) {
  const workbook = XLSX.read(arrayBuffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const pedidos = [];
  let rotaCodigo = '';
  const hoje = new Date().toISOString().split('T')[0];

  for (let i = 11; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;
    const colA = row[0]?.toString()?.trim() || '';
    if (colA.toLowerCase().includes('total geral')) break;
    if (!row[9] && !row[7]) continue;

    const rota = row[0]?.toString()?.trim() || rotaCodigo;
    if (rota) rotaCodigo = rota;

    const clienteNome = row[7]?.toString()?.trim() || '';
    const numeroPedido = formatarNumeroPedido(row[9]?.toString()?.trim() || '');
    let valorPedido = row[12];
    if (typeof valorPedido === 'string') {
      valorPedido = parseFloat(valorPedido.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      valorPedido = parseFloat(valorPedido) || 0;
    }

    // Coluna F (índice 5) → data_entrega
    let dataEntrega = hoje;
    if (row[5]) {
      try {
        // Excel pode entregar como número serial ou string
        if (typeof row[5] === 'number') {
          const d = XLSX.SSF.parse_date_code(row[5]);
          dataEntrega = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
        } else {
          const parts = String(row[5]).trim().split(/[\/\-]/);
          if (parts.length === 3) {
            // dd/mm/yyyy
            dataEntrega = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          }
        }
      } catch (_) { dataEntrega = hoje; }
    }

    if (!clienteNome || !numeroPedido || valorPedido <= 0) continue;

    const clienteCadastrado = clientes.find(c =>
      c.nome?.toLowerCase().includes(clienteNome.toLowerCase()) ||
      clienteNome.toLowerCase().includes(c.nome?.toLowerCase())
    );

    const sanitize = (str) => String(str || '').replace(/\./g, '').trim();
    const pedidoJaExiste = pedidosExistentes.find(p =>
      sanitize(p.numero_pedido) === sanitize(numeroPedido)
    );

    let statusExistencia = null;
    if (pedidoJaExiste) {
      switch (pedidoJaExiste.status) {
        case 'pago': statusExistencia = 'Liquidado'; break;
        case 'cancelado': statusExistencia = 'Cancelado'; break;
        case 'aguardando': statusExistencia = 'Em Trânsito'; break;
        case 'emproducao': statusExistencia = 'Em Produção'; break;
        default: statusExistencia = 'Aberto';
      }
    }

    pedidos.push({
      rota_codigo: rotaCodigo,
      cliente_nome: clienteNome,
      cliente_codigo: clienteCadastrado?.codigo || pedidoJaExiste?.cliente_codigo || '',
      cliente_regiao: clienteCadastrado?.regiao || pedidoJaExiste?.cliente_regiao || '',
      representante_codigo: clienteCadastrado?.representante_codigo || pedidoJaExiste?.representante_codigo || '',
      representante_nome: clienteCadastrado?.representante_nome || pedidoJaExiste?.representante_nome || '',
      numero_pedido: numeroPedido,
      valor_pedido: valorPedido,
      data_entrega: dataEntrega,
      cliente_pendente: !clienteCadastrado && !pedidoJaExiste?.cliente_codigo,
      porcentagem_comissao: clienteCadastrado?.porcentagem_comissao || pedidoJaExiste?.porcentagem_comissao || 5,
      // Conciliação
      jaExiste: !!pedidoJaExiste,
      pedidoExistenteId: pedidoJaExiste?.id || null,
      statusExistente: statusExistencia,
      source: 'rota'
    });
  }

  return { pedidos, rotaCodigo };
}

// ─── Detectar tipo de planilha ────────────────────────────────────────────────
function detectarTipoArquivo(fileName, rows) {
  const name = fileName.toLowerCase();
  if (name.includes('pedidoqt') || name.includes('producao') || name.includes('produção')) return 'producao';
  if (name.includes('relpeds') || name.includes('rota') || name.includes('entrega')) return 'rota';
  // Heurística: planilha de produção tem "Pedido:" na coluna A
  const temPedidoTag = rows.some(r => String(r?.[0] || '').trim() === 'Pedido:');
  return temPedidoTag ? 'producao' : 'rota';
}

export default function ImportarPedidos({ clientes, pedidosExistentes = [], onImportComplete, onCancel, tipoForcado }) {
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedForMerge, setSelectedForMerge] = useState([]);

  const { data: rotasExistentes = [] } = useQuery({
    queryKey: ['rotas_importar'],
    queryFn: async () => {
      const ROTAS_FIXAS = ['RETIRA', 'BLINDEX', 'SUPREMA'];
      const [recentes, retira, blindex, suprema] = await Promise.all([
        base44.entities.RotaImportada.list('-created_date', 100),
        base44.entities.RotaImportada.filter({ codigo_rota: 'RETIRA' }),
        base44.entities.RotaImportada.filter({ codigo_rota: 'BLINDEX' }),
        base44.entities.RotaImportada.filter({ codigo_rota: 'SUPREMA' })
      ]);
      const todasJuntas = [...recentes, ...retira, ...blindex, ...suprema];
      const rotasUnicas = Array.from(new Map(todasJuntas.map(r => [r.id, r])).values());
      return rotasUnicas.sort((a, b) => {
        const aEhFixa = ROTAS_FIXAS.includes((a.codigo_rota || '').trim().toUpperCase());
        const bEhFixa = ROTAS_FIXAS.includes((b.codigo_rota || '').trim().toUpperCase());
        if (aEhFixa && !bEhFixa) return -1;
        if (!aEhFixa && bEhFixa) return 1;
        return 0;
      });
    }
  });

  const { data: motoristasAtivos = [] } = useQuery({
    queryKey: ['motoristas_ativos'],
    queryFn: async () => {
      const all = await base44.entities.Motorista.list();
      return all.filter(m => m.ativo !== false);
    }
  });

  const handleFilesChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLoadingFile(true);

    const novosArquivos = [];
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        // Detectar tipo
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const tipo = tipoForcado || detectarTipoArquivo(file.name, rows);

        let pedidos = [];
        let rotaCodigo = '';

        if (tipo === 'producao') {
          pedidos = parsePlanilhaProducao(buffer, clientes, pedidosExistentes);
        } else {
          const result = parsePlanilhaRota(buffer, clientes, pedidosExistentes);
          pedidos = result.pedidos;
          rotaCodigo = result.rotaCodigo;
        }

        novosArquivos.push({
          fileName: file.name,
          tipo,
          pedidos,
          rotaCodigo,
          nome_rota: rotaCodigo || '',
          motorista: '',
          motorista_codigo: '',
          codigo_rota: rotaCodigo || '',
          selected: false,
          merged: false,
          modo_rota: 'nova',
          rota_existente_id: ''
        });
      } catch (err) {
        console.error('Erro ao ler:', file.name, err);
        toast.error(`Erro ao processar ${file.name}`);
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
      tipo: 'rota',
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
      const novos = a.pedidos.filter(p => !p.jaExiste || a.tipo === 'rota');
      return novos.length > 0 || a.pedidos.some(p => p.jaExiste);
    });

    if (arquivosValidos.length === 0) {
      toast.error('Nenhum pedido para processar.');
      return;
    }

    setLoading(true);
    try {
      for (const arq of arquivosValidos) {
        const hoje = new Date().toISOString().split('T')[0];

        // ─── PRODUÇÃO: Cria pedidos definitivos ───────────────────────────────
        if (arq.tipo === 'producao') {
          const pedidosNovos = arq.pedidos.filter(p => !p.jaExiste);
          const pedidosParaAtualizar = arq.pedidos.filter(p => p.jaExiste);

          // Criar novos
          if (pedidosNovos.length > 0) {
            const payload = pedidosNovos.map(p => ({
              numero_pedido: p.numero_pedido,
              cliente_codigo: p.cliente_codigo,
              cliente_nome: p.cliente_nome,
              cliente_regiao: p.cliente_regiao,
              representante_codigo: p.representante_codigo,
              representante_nome: p.representante_nome,
              porcentagem_comissao: p.porcentagem_comissao,
              cliente_pendente: p.cliente_pendente,
              data_importado: hoje,
              status: 'emproducao',
              itens_pedido: p.itens_pedido || [],
              observacao: p.observacao || '',
              valor_pedido: 0,
              total_pago: 0,
              saldo_restante: 0,
              confirmado_entrega: false
            }));
            await base44.entities.Pedido.bulkCreate(payload);
          }

          // Atualizar existentes: mesclar itens
          for (const p of pedidosParaAtualizar) {
            await base44.entities.Pedido.update(p.pedidoExistenteId, {
              itens_pedido: p.itens_pedido,
              data_importado: hoje,
              ...(p.observacao ? { observacao: p.observacao } : {})
            });
          }

          toast.success(`Produção: ${pedidosNovos.length} pedidos criados, ${pedidosParaAtualizar.length} atualizados.`);
          continue;
        }

        // ─── ROTA: Conciliar / criar pedidos ─────────────────────────────────
        const pedidosParaConciliar = arq.pedidos.filter(p => p.jaExiste); // update
        const pedidosNovos = arq.pedidos.filter(p => !p.jaExiste);        // create

        // PARTE 3: Trava contra rota vazia
        const totalVincular = pedidosNovos.length + pedidosParaConciliar.length;
        if (totalVincular === 0) {
          toast.warning(`Arquivo "${arq.fileName}" não possui pedidos válidos. Rota não criada.`);
          continue;
        }

        // Criar / pegar rota
        let rotaId;
        const valorTotal = arq.pedidos.reduce((s, p) => s + (p.valor_pedido || 0), 0);

        if (arq.modo_rota === 'existente' && arq.rota_existente_id) {
          rotaId = arq.rota_existente_id;
          const rotaExistente = rotasExistentes.find(r => r.id === rotaId);
          if (rotaExistente) {
            await base44.entities.RotaImportada.update(rotaId, {
              total_pedidos: (rotaExistente.total_pedidos || 0) + pedidosNovos.length,
              valor_total: (rotaExistente.valor_total || 0) + pedidosNovos.reduce((s, p) => s + (p.valor_pedido || 0), 0),
            });
          }
        } else {
          const novaRota = await base44.entities.RotaImportada.create({
            codigo_rota: arq.codigo_rota || arq.rotaCodigo,
            data_importacao: hoje,
            motorista_codigo: arq.motorista_codigo || '',
            motorista_nome: arq.motorista,
            total_pedidos: totalVincular,
            pedidos_confirmados: 0,
            valor_total: valorTotal,
            status: 'pendente'
          });
          rotaId = novaRota.id;
        }

        const rotaInfo = arq.modo_rota === 'existente'
          ? rotasExistentes.find(r => r.id === rotaId)
          : null;
        const rotaNome = rotaInfo ? rotaInfo.codigo_rota : (arq.nome_rota || arq.codigo_rota);
        const motoristaAtual = rotaInfo ? rotaInfo.motorista_nome : arq.motorista;
        const motoristaCodigo = rotaInfo ? rotaInfo.motorista_codigo : (arq.motorista_codigo || '');

        // Conciliar: atualiza pedidos que já existem (de produção)
        for (const p of pedidosParaConciliar) {
          await base44.entities.Pedido.update(p.pedidoExistenteId, {
            valor_pedido: p.valor_pedido,
            saldo_restante: p.valor_pedido,
            status: 'aguardando',
            rota_importada_id: rotaId,
            rota_codigo: arq.codigo_rota || arq.rotaCodigo,
            rota_entrega: rotaNome,
            motorista_atual: motoristaAtual,
            motorista_codigo: motoristaCodigo,
            data_entrega: p.data_entrega,
            data_importado: p.data_importado || hoje,
            cliente_codigo: p.cliente_codigo || undefined,
            cliente_regiao: p.cliente_regiao || undefined,
            representante_codigo: p.representante_codigo || undefined,
            representante_nome: p.representante_nome || undefined
          });
        }

        // Criar pedidos que não passaram pela produção
        if (pedidosNovos.length > 0) {
          const payload = pedidosNovos.map(p => ({
            rota_importada_id: rotaId,
            rota_codigo: arq.codigo_rota || arq.rotaCodigo,
            rota_entrega: rotaNome,
            motorista_atual: motoristaAtual,
            motorista_codigo: motoristaCodigo,
            cliente_nome: p.cliente_nome,
            cliente_codigo: p.cliente_codigo,
            cliente_regiao: p.cliente_regiao,
            representante_codigo: p.representante_codigo,
            representante_nome: p.representante_nome,
            numero_pedido: p.numero_pedido,
            valor_pedido: p.valor_pedido,
            saldo_restante: p.valor_pedido,
            cliente_pendente: p.cliente_pendente,
            porcentagem_comissao: p.porcentagem_comissao,
            data_entrega: p.data_entrega,
            data_importado: hoje,
            total_pago: 0,
            status: 'aguardando',
            confirmado_entrega: false
          }));
          await base44.entities.Pedido.bulkCreate(payload);
        }

        // Atualizar PORTs vinculados
        try {
          const todosPortsAtivos = await base44.entities.Port.list();
          const numerosImportados = arq.pedidos.map(p => String(p.numero_pedido).replace(/\./g, ''));
          const portsParaAtualizar = todosPortsAtivos.filter(port =>
            port.status === 'aguardando_vinculo' &&
            port.itens_port?.some(item =>
              numerosImportados.includes(String(item.numero_pedido_manual || '').replace(/\./g, ''))
            )
          );
          await Promise.all(portsParaAtualizar.map(port =>
            base44.entities.Port.update(port.id, { status: 'em_separacao' })
          ));
        } catch (_) { /* não crítico */ }

        toast.success(`Rota importada: ${pedidosParaConciliar.length} conciliados + ${pedidosNovos.length} novos.`);
      }

      onImportComplete();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalNovos = arquivos.reduce((s, a) => s + a.pedidos.filter(p => !p.jaExiste).length, 0);
  const totalConciliar = arquivos.reduce((s, a) => s + a.pedidos.filter(p => p.jaExiste && a.tipo === 'rota').length, 0);
  const totalValor = arquivos.reduce((s, a) => s + a.pedidos.filter(p => !p.jaExiste).reduce((sv, p) => sv + (p.valor_pedido || 0), 0), 0);

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50">
        <input type="file" accept=".xlsx,.xls" multiple onChange={handleFilesChange} className="hidden" id="file-upload-multi" />
        <label htmlFor="file-upload-multi" className="cursor-pointer flex flex-col items-center gap-2">
          <FileSpreadsheet className="w-10 h-10 text-slate-400" />
          <p className="font-medium text-slate-700">
            {tipoForcado === 'producao'
              ? <>Clique para selecionar <span className="text-blue-600">pedidoqt.xlsx</span></>
              : tipoForcado === 'rota'
              ? <>Clique para selecionar <span className="text-purple-600">relpedsx.xls</span></>
              : <>Clique para selecionar <span className="text-blue-600">pedidoqt.xlsx</span> ou <span className="text-purple-600">relpedsx.xls</span></>
            }
          </p>
          <p className="text-xs text-slate-400">{tipoForcado ? 'Tipo fixado pelo menu.' : 'O tipo é detectado automaticamente. Você pode selecionar vários arquivos.'}</p>
        </label>
        {loadingFile && (
          <div className="flex justify-center items-center gap-2 mt-3 text-slate-500">
            <Loader2 className="animate-spin w-4 h-4" /> Processando arquivos...
          </div>
        )}
      </div>

      {selectedForMerge.length >= 2 && (
        <Button onClick={handleMerge} className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Merge className="w-4 h-4" /> Mesclar {selectedForMerge.length} arquivos selecionados
        </Button>
      )}

      {arquivos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">{arquivos.length} arquivo(s) carregado(s)</h3>
            <p className="text-xs text-slate-400">Selecione 2+ para mesclar</p>
          </div>
          {arquivos.map((arq, index) => {
            const novos = arq.pedidos.filter(p => !p.jaExiste);
            const conciliar = arq.pedidos.filter(p => p.jaExiste);
            const isExpanded = expandedIndex === index;
            const isSelected = selectedForMerge.includes(index);

            return (
              <Card key={index} className={cn("overflow-hidden border-2 transition-all", isSelected ? "border-purple-300 bg-purple-50/30" : "border-slate-200")}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectForMerge(index)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          {arq.tipo === 'producao'
                            ? <Badge className="bg-blue-100 text-blue-700 gap-1"><Factory className="w-3 h-3" /> Produção</Badge>
                            : <Badge className="bg-purple-100 text-purple-700 gap-1"><Truck className="w-3 h-3" /> Rota</Badge>
                          }
                          <p className="font-semibold text-slate-800 truncate text-sm">{arq.fileName}</p>
                          {arq.merged && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">MESCLADO</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-full">{novos.length} novos</span>
                          {conciliar.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{conciliar.length} conciliar</span>}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => handleRemove(index)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Configuração de rota (só para tipo rota) */}
                      {arq.tipo === 'rota' && (
                        <>
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
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione uma rota ativa..." /></SelectTrigger>
                                <SelectContent>
                                  {rotasExistentes.map(r => (
                                    <SelectItem key={r.id} value={r.id}>
                                      <span className="font-semibold">{r.codigo_rota}</span>
                                      {r.motorista_nome && <span className="text-xs text-slate-400 ml-2">· {r.motorista_nome}</span>}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              <div>
                                <Label className="text-xs text-slate-500 mb-1 block">Nome da Rota *</Label>
                                <Input value={arq.nome_rota} onChange={e => updateArquivo(index, 'nome_rota', e.target.value)} placeholder="Ex: Zona Sul A" className="h-8 text-sm" />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs text-slate-500 mb-1 block">Motorista *</Label>
                                <Select
                                  value={arq.motorista_codigo || ''}
                                  onValueChange={(val) => {
                                    const m = motoristasAtivos.find(x => x.codigo === val || x.id === val);
                                    updateArquivo(index, 'motorista', m?.nome_social || m?.nome || '');
                                    updateArquivo(index, 'motorista_codigo', m?.codigo || val);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar motorista..." /></SelectTrigger>
                                  <SelectContent>
                                    {motoristasAtivos.map(m => (
                                      <SelectItem key={m.id} value={m.codigo || m.id}>
                                        <span className="font-medium">{m.nome_social || m.nome}</span>
                                        {m.codigo && <span className="text-xs text-slate-400 ml-2">({m.codigo})</span>}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-slate-500 mb-1 block">Código da Rota *</Label>
                                <Input value={arq.codigo_rota} onChange={e => updateArquivo(index, 'codigo_rota', e.target.value)} placeholder="Ex: 001" className="h-8 text-sm" />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {arq.pedidos.length > 0 && (
                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : index)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Ocultar' : 'Ver'} {arq.pedidos.length} pedidos
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
                          <tr key={i} className={cn("border-t", p.jaExiste && "bg-blue-50/30")}>
                            <td className="p-2 font-mono">{p.numero_pedido}</td>
                            <td className="p-2">{p.cliente_nome}</td>
                            <td className="p-2 text-right">{p.valor_pedido > 0 ? formatCurrency(p.valor_pedido) : '—'}</td>
                            <td className="p-2 text-center">
                              {p.jaExiste
                                ? <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Conciliar: {p.statusExistente}</span>
                                : p.cliente_pendente
                                  ? <span className="text-amber-600 font-medium">Cliente Pendente</span>
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

      {(totalNovos > 0 || totalConciliar > 0) && (
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-emerald-800">
                {totalNovos} novos · {totalConciliar} a conciliar
              </p>
              <p className="text-xs text-emerald-600">Total a importar: {formatCurrency(totalValor)}</p>
            </div>
            <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalValor)}</span>
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button
          onClick={handleImport}
          disabled={loading || (totalNovos === 0 && totalConciliar === 0) ||
            arquivos.some(a => a.tipo === 'rota' && a.modo_rota !== 'existente' && !a.codigo_rota)
          }
        >
          {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Upload className="mr-2 w-4 h-4" />}
          Importar / Conciliar
        </Button>
      </div>
    </div>
  );
}