import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, Percent, Wallet, Loader2, Plus, X, Upload, FileText, Trash2, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";
import AdicionarChequeModal from "@/components/pedidos/AdicionarChequeModal";
import { toast } from "sonner";

export default function LiquidacaoMassa({ pedidos, onSave, onCancel, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [descontoTipo, setDescontoTipo] = useState('reais');
  const [descontoValor, setDescontoValor] = useState('');
  const [devolucao, setDevolucao] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([{ tipo: 'dinheiro', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [] }]);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [chequeModalIndex, setChequeModalIndex] = useState(0);
  const [creditoDisponivelTotal, setCreditoDisponivelTotal] = useState(0);
  const [creditoAUsar, setCreditoAUsar] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [comprovantes, setComprovantes] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef(null);
  
  // Sinais injetados como formas de pagamento read-only (um por pedido com sinal)
  const [sinaisInjetados, setSinaisInjetados] = useState([]);

  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos', selectedPedidos[0]?.cliente_codigo],
    queryFn: async () => {
      if (!selectedPedidos[0]?.cliente_codigo) return [];
      const todosCreditos = await base44.entities.Credito.list();
      return todosCreditos.filter(c => c?.cliente_codigo === selectedPedidos[0]?.cliente_codigo && c?.status === 'disponivel');
    },
    enabled: selectedPedidos.length > 0 && !!selectedPedidos[0]?.cliente_codigo
  });

  const { data: todosPortsDisponiveis = [] } = useQuery({
    queryKey: ['ports-massa'],
    queryFn: async () => {
      const allPorts = await base44.entities.Port.list();
      return allPorts.filter(port => 
        port && 
        (port?.saldo_disponivel || 0) > 0 &&
        !['devolvido', 'finalizado'].includes(port?.status)
      );
    }
  });

  const [usarPortsAutomatico, setUsarPortsAutomatico] = useState(false);

  React.useEffect(() => {
    const total = creditos.reduce((sum, c) => sum + (c?.valor || 0), 0);
    setCreditoDisponivelTotal(total);
  }, [creditos]);

  // ✨ PIVOT: Injeta sinais como formas de pagamento read-only e usa valor_pedido integral como base
  React.useEffect(() => {
    if (selectedPedidos.length === 0) {
      setSinaisInjetados([]);
      setFormasPagamento([{ tipo: 'dinheiro', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [] }]);
      setComprovantes([]);
      return;
    }

    // Monta linhas de sinal read-only (uma por pedido com sinal)
    const novosSinais = selectedPedidos
      .filter(p => parseFloat(p.valor_sinal_informado) > 0)
      .map(p => ({
        id: `sinal-${p.id}`,
        forma: 'Sinal / Adiantamento',
        valor: parseFloat(p.valor_sinal_informado),
        referencia: `Pedido #${p.numero_pedido}`,
        comprovantes: p.arquivos_sinal || [],
        isReadOnly: true
      }));
    setSinaisInjetados(novosSinais);

    // Mantém apenas formas manuais (sem sinais anteriores)
    setFormasPagamento(prev => {
      const formasManuais = prev.filter(fp => !fp.isReadOnly);
      return formasManuais.length > 0
        ? formasManuais
        : [{ tipo: 'dinheiro', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [] }];
    });

    // Comprovantes: mantém manuais + adiciona arquivos dos sinais
    const arquivosSinais = selectedPedidos.flatMap(p => p.arquivos_sinal || []);
    setComprovantes(prev => {
      const manuais = prev.filter(url => !selectedPedidos.some(p => (p.arquivos_sinal || []).includes(url)));
      return [...manuais, ...arquivosSinais];
    });

    if (novosSinais.length > 0) {
      const totalSinal = novosSinais.reduce((sum, s) => sum + s.valor, 0);
      toast.info(`💰 ${novosSinais.length} sinal(is) injetado(s) automaticamente (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSinal)}). Já contabilizados no Total Pago.`, { duration: 5000 });
    }
  }, [selectedPedidos]);

  const pedidosComPort = useMemo(() => {
    const pedidosIds = selectedPedidos.map(p => p?.id).filter(Boolean);
    return todosPortsDisponiveis.filter(port => 
      port?.pedidos_ids?.some(pid => pedidosIds.includes(pid))
    );
  }, [selectedPedidos, todosPortsDisponiveis]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(p => 
      p && 
      (['aberto', 'parcial', 'aguardando'].includes(p?.status)) &&
      (p?.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p?.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p?.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [pedidos, searchTerm]);

  const togglePedido = (pedido) => {
    setSelectedPedidos(prev => {
      const exists = prev.find(p => p.id === pedido.id);
      if (exists) return prev.filter(p => p.id !== pedido.id);
      return [...prev, pedido];
    });
  };

  const toggleAll = () => {
    if (selectedPedidos.length === filteredPedidos.length) {
      setSelectedPedidos([]);
    } else {
      setSelectedPedidos(filteredPedidos);
    }
  };

  const calcularTotais = () => {
    // Base integral: usa valor_pedido (sinal não subtraído aqui, pois será contabilizado como forma de pagamento)
    const totalOriginal = selectedPedidos.reduce((sum, p) => sum + (p?.valor_pedido || 0), 0);
    let desconto = 0;
    if (descontoValor) {
      if (descontoTipo === 'reais') {
        desconto = parseFloat(descontoValor) || 0;
      } else {
        desconto = (totalOriginal * (parseFloat(descontoValor) || 0)) / 100;
      }
    }
    const devolucaoValor = parseFloat(devolucao) || 0;
    const totalComDesconto = totalOriginal - desconto - devolucaoValor;
    // Total pago = sinais injetados (read-only) + formas manuais + crédito
    const totalSinais = sinaisInjetados.reduce((sum, s) => sum + s.valor, 0);
    const totalFormasManuais = formasPagamento
      .filter(fp => !fp.isReadOnly)
      .reduce((sum, fp) => sum + (parseFloat(fp?.valor) || 0), 0);
    const totalPago = totalSinais + totalFormasManuais + (creditoAUsar || 0);
    return { totalOriginal, desconto, devolucaoValor, totalComDesconto, totalPago };
  };

  const handleSaveCheque = async (chequeData) => {
    const novoCheque = await base44.entities.Cheque.create(chequeData);
    const novasFormas = [...formasPagamento];
    novasFormas[chequeModalIndex].chequesSalvos.push(novoCheque);
    const totalCheques = novasFormas[chequeModalIndex].chequesSalvos.reduce((sum, ch) => sum + (parseFloat(ch.valor) || 0), 0);
    novasFormas[chequeModalIndex].valor = String(totalCheques);
    setFormasPagamento(novasFormas);
    setShowChequeModal(false);
    toast.success('Cheque cadastrado!');
  };

  const handleSaveChequeAndAddAnother = async (chequeData) => {
    const novoCheque = await base44.entities.Cheque.create(chequeData);
    const novasFormas = [...formasPagamento];
    novasFormas[chequeModalIndex].chequesSalvos.push(novoCheque);
    const totalCheques = novasFormas[chequeModalIndex].chequesSalvos.reduce((sum, ch) => sum + (parseFloat(ch.valor) || 0), 0);
    novasFormas[chequeModalIndex].valor = String(totalCheques);
    setFormasPagamento(novasFormas);
    toast.success('Cheque cadastrado! Adicione outro.');
  };

  const adicionarFormaPagamento = () => {
    setFormasPagamento([...formasPagamento, { tipo: 'dinheiro', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [] }]);
  };

  const removerFormaPagamento = (index) => {
    if (formasPagamento.length > 1) setFormasPagamento(formasPagamento.filter((_, i) => i !== index));
  };

  const atualizarFormaPagamento = (index, campo, valor) => {
    const novasFormas = [...formasPagamento];
    if (campo.includes('.')) {
      const [obj, prop] = campo.split('.');
      novasFormas[index][obj][prop] = valor;
    } else {
      novasFormas[index][campo] = valor;
    }
    setFormasPagamento(novasFormas);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setComprovantes(prev => [...prev, ...urls]);
      toast.success(`${files.length} arquivo(s) anexado(s)!`);
    } catch (error) {
      toast.error('Erro ao enviar arquivo(s)');
    } finally {
      setUploadingFile(false);
    }
  };

  const removerComprovante = (index) => {
    setComprovantes(prev => prev.filter((_, i) => i !== index));
    toast.success('Arquivo removido');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setComprovantes(prev => [...prev, ...urls]);
      toast.success(`${files.length} arquivo(s) anexado(s)!`);
    } catch (error) {
      toast.error('Erro ao enviar arquivo(s)');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleLiquidar = async () => {
    if (selectedPedidos.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }

    // ── INSTRUÇÃO 1: ISOLAMENTO DO "DINHEIRO NOVO" ──
    // Filtra formas de pagamento ignorando qualquer item com isSinal ou que venha de sinaisInjetados.
    // O sinal já está descontado no saldo_restante do banco; ele NÃO deve entrar no pool de abatimento.
    const formasManuaisAtivas = formasPagamento.filter(fp => !fp.isReadOnly && !fp.isSinal);
    const dinheirNovoTotal = formasManuaisAtivas.reduce((sum, fp) => sum + (parseFloat(fp?.valor) || 0), 0);
    const totalSinaisInjetados = sinaisInjetados.reduce((sum, s) => sum + s.valor, 0);

    const totais = calcularTotais();

    // ── INSTRUÇÃO 2: VALIDAÇÃO CORRETA ──
    // Permite prosseguir se houver dinheiro novo, crédito, desconto, devolução OU sinais injetados.
    const temAlgumPagamento = dinheirNovoTotal > 0 || creditoAUsar > 0 || totais.desconto > 0 || totais.devolucaoValor > 0 || totalSinaisInjetados > 0;
    if (!temAlgumPagamento) {
      toast.error('Informe algum valor (pagamento, crédito, desconto ou devolução)');
      return;
    }

    setIsSaving(true);

    try {
      const user = await base44.auth.me();

      // Pools de abatimento: usa APENAS o dinheiro novo (não inclui sinais)
      let devolucaoRestante = totais.devolucaoValor;
      let descontoRestante = totais.desconto;
      let creditoRestante = creditoAUsar;
      let pagamentoRestante = dinheirNovoTotal; // ← SEM sinais

      // Preparar PORTs se usar automático
      const portsUsados = [];
      const portsParaUsar = usarPortsAutomatico ? [...pedidosComPort] : [];

      const pedidosProcessados = [];

      // Processar cada pedido em sequência abatendo sobre o saldo_restante atual (já descontado do sinal no DB)
      for (const pedido of selectedPedidos) {
        if (!pedido?.id) continue;

        // Base = saldo_restante que já vem do banco (sinal já abatido)
        let saldoAtual = pedido?.saldo_restante ?? Math.max(0, (pedido?.valor_pedido || 0) - (pedido?.total_pago || 0));

        let devolucaoAplicada = 0;
        let descontoAplicado = 0;
        let portAplicado = 0;
        let creditoAplicado = 0;
        let pagamentoAplicado = 0;
        let portUsadoInfo = null;

        // **PASSO 1: DEVOLUÇÃO**
        if (devolucaoRestante > 0 && saldoAtual > 0) {
          const v = Math.min(saldoAtual, devolucaoRestante);
          devolucaoAplicada = v;
          saldoAtual -= v;
          devolucaoRestante -= v;
        }

        // **PASSO 2: DESCONTO**
        if (descontoRestante > 0 && saldoAtual > 0) {
          const v = Math.min(saldoAtual, descontoRestante);
          descontoAplicado = v;
          saldoAtual -= v;
          descontoRestante -= v;
        }

        // **PASSO 3: PORT (Se automático)**
        if (usarPortsAutomatico && saldoAtual > 0) {
          const portParaEstePedido = portsParaUsar.find(port =>
            port?.pedidos_ids?.includes(pedido?.id) && (port?.saldo_disponivel || 0) > 0
          );
          if (portParaEstePedido) {
            const valorUsar = Math.min(saldoAtual, portParaEstePedido?.saldo_disponivel || 0);
            portAplicado = valorUsar;
            saldoAtual -= valorUsar;
            portParaEstePedido.saldo_disponivel -= valorUsar;
            portUsadoInfo = { id: portParaEstePedido?.id, numero: portParaEstePedido?.numero_port, valorUsado: valorUsar };
            const portJaUsado = portsUsados.find(p => p?.id === portParaEstePedido?.id);
            if (portJaUsado) {
              portJaUsado.valorTotal += valorUsar;
            } else {
              portsUsados.push({
                id: portParaEstePedido?.id,
                numero: portParaEstePedido?.numero_port,
                valorTotal: valorUsar,
                saldoRestante: portParaEstePedido?.saldo_disponivel || 0,
                comprovantes_urls: portParaEstePedido?.comprovantes_urls || []
              });
            }
          }
        }

        // **PASSO 4: CRÉDITO**
        if (creditoRestante > 0 && saldoAtual > 0) {
          const v = Math.min(saldoAtual, creditoRestante);
          creditoAplicado = v;
          saldoAtual -= v;
          creditoRestante -= v;
        }

        // **PASSO 5: PAGAMENTO NOVO (Dinheiro/Cheque/Pix — sem sinais)**
        if (pagamentoRestante > 0 && saldoAtual > 0) {
          const v = Math.min(saldoAtual, pagamentoRestante);
          pagamentoAplicado = v;
          saldoAtual -= v;
          pagamentoRestante -= v;
        }

        const novoTotalPago = (pedido?.total_pago || 0) + pagamentoAplicado + creditoAplicado + devolucaoAplicada + portAplicado;
        const novoDescontoTotal = (pedido?.desconto_dado || 0) + descontoAplicado;
        const novoSaldo = Math.max(0, saldoAtual);

        pedidosProcessados.push({
          pedido,
          novoTotalPago,
          novoDescontoTotal,
          novoSaldo,
          devolucaoAplicada,
          descontoAplicado,
          portAplicado,
          portUsadoInfo,
          creditoAplicado,
          pagamentoAplicado
        });
      }

      // Verificar sobras de dinheiro NOVO (sinais não entram aqui)
      const sobraTotal = devolucaoRestante + descontoRestante + creditoRestante + pagamentoRestante;
      if (sobraTotal > 0.01) {
        const confirmar = window.confirm(`⚠️ ATENÇÃO!\n\nTodos os pedidos foram quitados.\nSobrou ${formatCurrency(sobraTotal)} que será convertido em CRÉDITO.\n\nDeseja continuar?`);
        if (!confirmar) {
          setIsSaving(false);
          return;
        }
      }

      // ── INSTRUÇÃO 3: RECOMPOSIÇÃO NO BORDERÔ ──
      const todosBorderos = await base44.entities.Bordero.list();
      const proximoNumeroBordero = todosBorderos.length > 0 ? Math.max(...todosBorderos.map(b => b.numero_bordero || 0)) + 1 : 1;

      let todosChequesUsados = [];
      const formasManuaisStr = formasManuaisAtivas.filter(fp => parseFloat(fp.valor) > 0).map(fp => {
        let str = `${fp.tipo.toUpperCase()}: ${formatCurrency(parseFloat(fp.valor))}`;
        if (fp.tipo === 'credito' && fp.parcelas !== '1') str += ` (${fp.parcelas}x)`;
        if (fp.tipo === 'cheque' && fp.dadosCheque.numero) str += ` | Cheque: ${fp.dadosCheque.numero} - ${fp.dadosCheque.banco}`;
        if (fp.chequesSalvos && fp.chequesSalvos.length > 0) {
          str += ` | ${fp.chequesSalvos.length} cheque(s)`;
          todosChequesUsados = [...todosChequesUsados, ...fp.chequesSalvos];
        }
        return str;
      }).join(' | ');

      // Sinais históricos incluídos na string de forma de pagamento do borderô (ex: "SINAL (Histórico): R$ 1.453,50")
      const sinaisStr = sinaisInjetados.map(s => `SINAL (Histórico) · ${s.referencia}: ${formatCurrency(s.valor)}`).join(' | ');

      const creditoEfetivamenteUsado = creditoAUsar - creditoRestante;
      const totalPortUsado = portsUsados.reduce((sum, p) => sum + p.valorTotal, 0);

      let formasFinal = [sinaisStr, formasManuaisStr].filter(Boolean).join(' | ');
      if (totalPortUsado > 0) formasFinal += ` | SINAL PORT (${portsUsados.map(p => `#${p.numero}`).join(', ')}): ${formatCurrency(totalPortUsado)}`;
      if (creditoEfetivamenteUsado > 0) formasFinal += ` | CRÉDITO: ${formatCurrency(creditoEfetivamenteUsado)}`;
      if (totais.desconto > 0) formasFinal += ` | DESCONTO: ${formatCurrency(totais.desconto)}`;
      if (totais.devolucaoValor > 0) formasFinal += ` | DEVOLUÇÃO: ${formatCurrency(totais.devolucaoValor)}`;

      const chequesAnexos = todosChequesUsados.map(ch => ({
        numero: ch.numero_cheque, banco: ch.banco, agencia: ch.agencia,
        conta: ch.conta, emitente: ch.emitente, valor: ch.valor,
        data_vencimento: ch.data_vencimento, anexo_foto_url: ch.anexo_foto_url, anexo_video_url: ch.anexo_video_url
      }));

      let comprovantesFinais = [...comprovantes];
      portsUsados.forEach(port => { if (port.comprovantes_urls) comprovantesFinais = [...comprovantesFinais, ...port.comprovantes_urls]; });

      // valor_total do Borderô = Pagamento Novo + Crédito + PORTs + Sinal Histórico
      const valorTotalBordero = dinheirNovoTotal + creditoEfetivamenteUsado + totalPortUsado + totalSinaisInjetados;

      await base44.entities.Bordero.create({
        numero_bordero: proximoNumeroBordero,
        tipo_liquidacao: 'massa',
        cliente_codigo: selectedPedidos[0]?.cliente_codigo || '',
        cliente_nome: selectedPedidos[0]?.cliente_nome || '',
        pedidos_ids: selectedPedidos.map(p => p?.id).filter(Boolean),
        valor_total: valorTotalBordero,
        forma_pagamento: formasFinal,
        comprovantes_urls: comprovantesFinais,
        cheques_anexos: chequesAnexos,
        observacao: `Desconto: ${formatCurrency(totais.desconto)} | Devolução: ${formatCurrency(totais.devolucaoValor)} | ${selectedPedidos.length} pedidos${totalPortUsado > 0 ? ` | PORTs usados: ${portsUsados.map(p => `#${p?.numero || 'N/A'}`).join(', ')}` : ''}`,
        liquidado_por: user?.email || ''
      });

      // Atualizar cada pedido
      for (const proc of pedidosProcessados) {
        if (!proc?.pedido?.id) continue;
        const historicoPort = (proc?.portAplicado || 0) > 0 ? ` | PORT=${formatCurrency(proc.portAplicado)}` : '';
        await base44.entities.Pedido.update(proc.pedido.id, {
          total_pago: proc?.novoTotalPago || 0,
          desconto_dado: proc?.novoDescontoTotal || 0,
          saldo_restante: proc?.novoSaldo || 0,
          status: (proc?.novoSaldo || 0) <= 0 ? 'pago' : 'parcial',
          data_pagamento: (proc?.novoSaldo || 0) <= 0 ? new Date().toISOString().split('T')[0] : proc?.pedido?.data_pagamento,
          mes_pagamento: (proc?.novoSaldo || 0) <= 0 ? new Date().toISOString().slice(0, 7) : proc?.pedido?.mes_pagamento,
          bordero_numero: proximoNumeroBordero,
          outras_informacoes: (proc?.pedido?.outras_informacoes || '') + `\n[${new Date().toLocaleDateString('pt-BR')}] Borderô #${proximoNumeroBordero}: Dev=${formatCurrency(proc?.devolucaoAplicada || 0)} | Desc=${formatCurrency(proc?.descontoAplicado || 0)}${historicoPort} | Créd=${formatCurrency(proc?.creditoAplicado || 0)} | Pago=${formatCurrency(proc?.pagamentoAplicado || 0)}`
        });
      }

      // Atualizar PORTs usados
      for (const portUsado of portsUsados) {
        if (!portUsado?.id) continue;
        const novoStatusPort = (portUsado?.saldoRestante || 0) <= 0 ? 'finalizado' : 'parcialmente_usado';
        const portOriginal = await base44.entities.Port.get(portUsado.id);
        
        await base44.entities.Port.update(portUsado.id, {
          saldo_disponivel: portUsado?.saldoRestante || 0,
          status: novoStatusPort,
          observacao: `${portOriginal?.observacao || ''}\n[${new Date().toLocaleDateString('pt-BR')}] Usado ${formatCurrency(portUsado?.valorTotal || 0)} no Borderô #${proximoNumeroBordero}`.trim()
        });
      }

      // Marcar créditos como usados
      if (creditoEfetivamenteUsado > 0) {
        let valorAMarcar = creditoEfetivamenteUsado;
        for (const credito of creditos) {
          if (!credito?.id || valorAMarcar <= 0) break;
          const valorUsar = Math.min(credito?.valor || 0, valorAMarcar);
          await base44.entities.Credito.update(credito.id, {
            status: 'usado',
            pedido_uso_id: selectedPedidos[0]?.id || '',
            data_uso: new Date().toISOString().split('T')[0]
          });
          valorAMarcar -= valorUsar;
        }
      }

      // Gerar crédito se sobrou
      if (sobraTotal > 0.01) {
        const todosCreditos = await base44.entities.Credito.list();
        const proximoNumero = todosCreditos.length > 0 ? Math.max(...todosCreditos.map(c => c?.numero_credito || 0)) + 1 : 1;
        
        await base44.entities.Credito.create({
          numero_credito: proximoNumero,
          cliente_codigo: selectedPedidos[0]?.cliente_codigo || '',
          cliente_nome: selectedPedidos[0]?.cliente_nome || '',
          valor: sobraTotal,
          origem: `Excedente Liquidação Massa - Borderô #${proximoNumeroBordero}`,
          status: 'disponivel'
        });
        toast.success(`Crédito #${proximoNumero} de ${formatCurrency(sobraTotal)} gerado!`);
      }

      await onSave();
      toast.success(`Borderô #${proximoNumeroBordero} criado! ${pedidosProcessados.filter(p => p.novoSaldo <= 0).length} pedidos quitados.`);
    } catch (error) {
      toast.error('Erro ao processar liquidação: ' + error.message);
      console.error(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const totais = calcularTotais();

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por cliente, código ou número do pedido..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="selectAll" checked={selectedPedidos.length === filteredPedidos.length && filteredPedidos.length > 0} onCheckedChange={toggleAll} />
        <Label htmlFor="selectAll" className="cursor-pointer">Selecionar todos ({selectedPedidos.length}/{filteredPedidos.length})</Label>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredPedidos.map((pedido) => {
          const saldo = pedido?.saldo_restante || ((pedido?.valor_pedido || 0) - (pedido?.total_pago || 0));
          const isSelected = selectedPedidos.find(p => p?.id === pedido?.id);
          const temPort = todosPortsDisponiveis.some(port => port?.pedidos_ids?.includes(pedido?.id));
          
          return (
            <Card key={pedido?.id} className={cn("p-4 cursor-pointer transition-all relative", isSelected ? "bg-blue-50 border-blue-300" : "hover:bg-slate-50")} onClick={() => togglePedido(pedido)}>
              <div className="absolute top-2 right-2 flex gap-1">
                {pedido?.status === 'aguardando' && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">🚚 Em Trânsito</Badge>
                )}
                {temPort && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs">💰 PORT</Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Checkbox checked={!!isSelected} />
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div><p className="text-xs text-slate-500">Nº Pedido</p><p className="font-mono text-sm font-medium">{pedido?.numero_pedido || '-'}</p></div>
                  <div><p className="text-xs text-slate-500">Cliente</p><p className="font-medium text-sm truncate">{pedido?.cliente_nome || 'Sem nome'}</p></div>
                  <div><p className="text-xs text-slate-500">Código</p><p className="text-sm">{pedido?.cliente_codigo || '-'}</p></div>
                  <div><p className="text-xs text-slate-500">Data Entrega</p><p className="text-sm">{pedido?.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-'}</p></div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Saldo</p>
                    <p className="font-bold text-sm">{formatCurrency(saldo)}</p>
                    {Number(pedido.valor_sinal_informado) > 0 && (
                      <div className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                        💰 Sinal retido: {formatCurrency(pedido.valor_sinal_informado)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedPedidos.length > 0 && (
        <>
          {/* Aviso: base agora é valor_pedido integral */}
          {sinaisInjetados.length > 0 && (
            <Card className="p-3 bg-blue-50 border-blue-200 border flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                O valor a liquidar usa o <strong>valor integral do pedido</strong>. Os sinais/adiantamentos foram injetados automaticamente como formas de pagamento abaixo.
              </p>
            </Card>
          )}

          {pedidosComPort.length > 0 && (
            <Card className="p-4 bg-amber-50 border-amber-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-bold text-amber-700">💰 Sinais Disponíveis Detectados</p>
                    <p className="text-xs text-slate-600">
                      {pedidosComPort.length} PORT(s) vinculado(s) aos pedidos selecionados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="usarPorts"
                    checked={usarPortsAutomatico}
                    onCheckedChange={setUsarPortsAutomatico}
                  />
                  <Label htmlFor="usarPorts" className="cursor-pointer font-medium">
                    Abater automaticamente
                  </Label>
                </div>
              </div>
              {usarPortsAutomatico && (
                <div className="mt-3 pt-3 border-t border-amber-300 space-y-1">
                  {pedidosComPort.map(port => (
                    <div key={port.id} className="flex justify-between text-xs">
                      <span>PORT #{port.numero_port}</span>
                      <span className="font-bold">{formatCurrency(port.saldo_disponivel)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="p-4 bg-slate-50 space-y-4">
            <h3 className="font-semibold">Ajustes de Pagamento</h3>
            <div className="space-y-2">
              <Label>Desconto</Label>
              <RadioGroup value={descontoTipo} onValueChange={setDescontoTipo} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="reais" id="reais" /><Label htmlFor="reais">Em Reais (R$)</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="porcentagem" id="porcentagem" /><Label htmlFor="porcentagem">Em Porcentagem (%)</Label></div>
              </RadioGroup>
              <div className="relative">
                {descontoTipo === 'reais' ? <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                <Input type="number" step="0.01" min="0" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Devolução (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="number" step="0.01" min="0" value={devolucao} onChange={(e) => setDevolucao(e.target.value)} className="pl-10" />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Formas de Pagamento</Label>
                <Button type="button" size="sm" variant="outline" onClick={adicionarFormaPagamento}><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
              </div>

              {/* Linhas read-only de Sinal (uma por pedido) */}
              {sinaisInjetados.map(sinal => (
                <Card key={sinal.id} className="p-3 bg-amber-50 border-amber-200 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-amber-800">💰 {sinal.forma}</span>
                      <Badge className="bg-amber-400 text-white text-[10px] px-2 py-0.5">Auto · {sinal.referencia}</Badge>
                    </div>
                    <span className="font-bold text-amber-700">{formatCurrency(sinal.valor)}</span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1">Pré-pagamento registrado. Não pode ser editado ou removido.</p>
                </Card>
              ))}

              {formasPagamento.map((fp, index) => (
                <Card key={index} className="bg-white p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Forma {index + 1}</span>
                      </div>
                      {formasPagamento.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removerFormaPagamento(index)} className="text-red-600 h-6"><X className="w-3 h-3" /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={fp.tipo} onValueChange={(v) => atualizarFormaPagamento(index, 'tipo', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="servicos">Serviços</SelectItem>
                            <SelectItem value="debito">Débito</SelectItem>
                            <SelectItem value="credito">Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <Input type="number" step="0.01" value={fp.valor} onChange={(e) => atualizarFormaPagamento(index, 'valor', e.target.value)} disabled={fp.tipo === 'cheque' && fp.chequesSalvos.length > 0} />
                      </div>
                    </div>

                    {fp.tipo === 'credito' && (
                      <div className="space-y-2">
                        <Label>Parcelas</Label>
                        <Select value={fp.parcelas} onValueChange={(v) => atualizarFormaPagamento(index, 'parcelas', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({length: 18}, (_, i) => i + 1).map(n => (<SelectItem key={n} value={String(n)}>{n}x</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    )}

                    {fp.tipo === 'cheque' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div><Label className="text-xs">Nº Cheque</Label><Input value={fp.dadosCheque.numero} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.numero', e.target.value)} /></div>
                          <div><Label className="text-xs">Banco</Label><Input value={fp.dadosCheque.banco} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.banco', e.target.value)} /></div>
                          <div><Label className="text-xs">Agência</Label><Input value={fp.dadosCheque.agencia} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.agencia', e.target.value)} /></div>
                        </div>
                        <Button type="button" variant="outline" onClick={() => { setChequeModalIndex(index); setShowChequeModal(true); }} className="w-full text-xs h-8">
                          {fp.chequesSalvos.length > 0 ? `${fp.chequesSalvos.length} Cheque(s) Salvos - Adicionar` : 'Cadastrar Cheque Completo'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {creditoDisponivelTotal > 0 && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-green-700"/><span className="font-bold text-green-700">Crédito Disponível: {formatCurrency(creditoDisponivelTotal)}</span></div>
                <div className="flex items-center gap-2">
                  <Label>Usar:</Label>
                  <Input type="number" className="w-32 h-8" value={creditoAUsar} onChange={(e) => setCreditoAUsar(parseFloat(e.target.value)||0)} max={creditoDisponivelTotal} />
                </div>
              </Card>
            )}

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm"><span>Valor Integral dos Pedidos:</span><span className="font-medium">{formatCurrency(totais.totalOriginal)}</span></div>
              {sinaisInjetados.length > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>💰 Sinais / Adiantamentos:</span>
                  <span>- {formatCurrency(sinaisInjetados.reduce((s, x) => s + x.valor, 0))}</span>
                </div>
              )}
              {totais.desconto > 0 && <div className="flex justify-between text-sm text-red-600"><span>Desconto:</span><span>- {formatCurrency(totais.desconto)}</span></div>}
              {totais.devolucaoValor > 0 && <div className="flex justify-between text-sm text-orange-600"><span>Devolução:</span><span>- {formatCurrency(totais.devolucaoValor)}</span></div>}
              <div className="flex justify-between font-bold text-lg text-blue-700 border-t pt-2"><span>Total a Pagar:</span><span>{formatCurrency(totais.totalComDesconto)}</span></div>
              <div className="flex justify-between font-bold text-lg text-green-700"><span>Total Pago:</span><span>{formatCurrency(totais.totalPago)}</span></div>
                      {totais.totalPago < totais.totalComDesconto && (
                <div className="flex justify-between font-bold text-base text-amber-600 border-t pt-2 border-amber-100">
                  <span>Falta Pagar:</span>
                  <span>{formatCurrency(totais.totalComDesconto - totais.totalPago)}</span>
                </div>
              )}
              {totais.totalPago < totais.totalComDesconto && totais.totalPago > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  ⚠️ Liquidação parcial — o pedido ficará com status <strong>Parcial</strong>.
                </p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* SEÇÃO DE ANEXOS DO BORDERÔ */}
      {selectedPedidos.length > 0 && (
        <Card className="p-6 space-y-4 bg-gradient-to-br from-slate-50 to-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Comprovantes do Borderô
              </h3>
              <p className="text-xs text-slate-500 mt-1">Anexe comprovantes de pagamento desta liquidação em massa</p>
            </div>
            <div>
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept="image/*,.pdf" 
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden" 
              />
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                disabled={uploadingFile}
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingFile ? 'Enviando...' : 'Anexar Arquivos'}
              </Button>
            </div>
          </div>

          {comprovantes.length > 0 && (
            <div className="space-y-2">
              {comprovantes.map((url, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Comprovante {index + 1}</p>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">
                        Ver arquivo
                      </a>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removerComprovante(index)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {comprovantes.length === 0 && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "text-center py-8 border-2 border-dashed rounded-lg transition-all cursor-pointer",
                isDragging 
                  ? "border-emerald-400 bg-emerald-50/50 scale-[1.02]" 
                  : uploadingFile 
                    ? "border-slate-300 bg-slate-50" 
                    : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
              )}
              onClick={() => !uploadingFile && fileInputRef.current?.click()}
            >
              {uploadingFile ? (
                <>
                  <Loader2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-spin" />
                  <p className="text-sm font-medium text-slate-600">Enviando arquivos...</p>
                </>
              ) : isDragging ? (
                <>
                  <Upload className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-emerald-700">Solte os arquivos aqui</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600 mb-1">Arraste arquivos aqui ou clique para selecionar</p>
                  <p className="text-xs text-slate-400">Suporta PDF, JPG, PNG</p>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading || isSaving}>Cancelar</Button>
        <Button
          onClick={handleLiquidar}
          disabled={
            isLoading ||
            isSaving ||
            selectedPedidos.length === 0 ||
            totais.totalPago <= 0 ||
            totais.totalPago > totais.totalComDesconto
          }
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> : 'Liquidar em Massa'}
        </Button>
      </div>

      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <div className="text-center"><h3 className="text-lg font-bold text-slate-800">Processando Liquidação em Massa</h3><p className="text-sm text-slate-500">Gerando Borderô e atualizando {selectedPedidos.length} pedidos...</p></div>
          </div>
        </div>
      )}

      <ModalContainer open={showChequeModal} onClose={() => setShowChequeModal(false)} title="Adicionar Cheque" size="lg">
        {selectedPedidos[0] && (
          <AdicionarChequeModal
            clienteInfo={{ cliente_codigo: selectedPedidos[0].cliente_codigo, cliente_nome: selectedPedidos[0].cliente_nome }}
            onSave={handleSaveCheque}
            onSaveAndAddAnother={handleSaveChequeAndAddAnother}
            onCancel={() => setShowChequeModal(false)}
          />
        )}
      </ModalContainer>
    </div>
  );
}