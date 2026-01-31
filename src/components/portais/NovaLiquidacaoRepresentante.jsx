import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  DollarSign, Upload, X, Loader2, CheckCircle, 
  Plus, Trash2, FileText, Image as ImageIcon, Search, Wallet,
  Maximize2, Minimize2, PanelLeftClose, PanelRightClose
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function NovaLiquidacaoRepresentante({ 
  open, 
  onClose, 
  pedidos, 
  onSuccess,
  modoCorrecao = false,
  autorizacaoOriginal = null
}) {
  const [passo, setPasso] = useState(modoCorrecao ? 2 : 1);
  const [selecionados, setSelecionados] = useState(
    modoCorrecao && autorizacaoOriginal?.pedidos_ids ? autorizacaoOriginal.pedidos_ids : []
  );
  
  // Estado para controlar o tamanho do modal
  const [isMaximized, setIsMaximized] = useState(false);

  // Buscar créditos
  const { data: todosCreditos = [] } = useQuery({ 
    queryKey: ['creditos'], 
    queryFn: () => base44.entities.Credito.list(),
    enabled: open 
  });

  const [descontoValor, setDescontoValor] = useState(
    modoCorrecao && autorizacaoOriginal?.descontos_cascata?.[0]?.valor ? String(autorizacaoOriginal.descontos_cascata[0].valor) : ''
  );
  const [devolucaoValor, setDevolucaoValor] = useState(
    modoCorrecao && autorizacaoOriginal?.devolucao_valor ? String(autorizacaoOriginal.devolucao_valor) : ''
  );
  const [devolucaoObs, setDevolucaoObs] = useState(
    modoCorrecao && autorizacaoOriginal?.devolucao_observacao ? autorizacaoOriginal.devolucao_observacao : ''
  );
  
  const [formasPagamento, setFormasPagamento] = useState([{ tipo: 'pix', valor: '' }]);
  const [observacao, setObservacao] = useState('');
  const [arquivos, setArquivos] = useState(
    modoCorrecao && autorizacaoOriginal?.comprovantes_urls ? autorizacaoOriginal.comprovantes_urls : []
  );
  
  const [creditosSelecionados, setCreditosSelecionados] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [buscaPedido, setBuscaPedido] = useState('');

  const clienteSelecionado = useMemo(() => {
    if (selecionados.length === 0) return null;
    const primeiroPedido = pedidos.find(p => p.id === selecionados[0]);
    return primeiroPedido ? primeiroPedido.cliente_codigo : null;
  }, [selecionados, pedidos]);

  const creditosDisponiveis = useMemo(() => {
    if (!clienteSelecionado) return [];
    return todosCreditos.filter(c => 
      c.cliente_codigo === clienteSelecionado && 
      c.status === 'disponivel' && 
      (c.valor > 0)
    );
  }, [todosCreditos, clienteSelecionado]);

  const pedidosFiltrados = useMemo(() => {
    const safePedidos = pedidos || [];
    if (!buscaPedido.trim()) return safePedidos;
    const termo = buscaPedido.toLowerCase();
    return safePedidos.filter(p => 
      p.cliente_nome?.toLowerCase().includes(termo) ||
      p.numero_pedido?.toLowerCase().includes(termo) ||
      p.cliente_codigo?.toLowerCase().includes(termo)
    );
  }, [pedidos, buscaPedido]);

  const calculos = useMemo(() => {
    const safePedidos = pedidos || [];
    const pedidosSelecionados = safePedidos.filter(p => selecionados.includes(p.id));
    const totalOriginal = pedidosSelecionados.reduce((sum, p) => sum + (p.saldo_restante || 0), 0);
    
    const desconto = parseFloat(descontoValor) || 0;
    const devolucao = parseFloat(devolucaoValor) || 0;
    
    const totalCreditosUsados = creditosSelecionados.reduce((sum, id) => {
        const cred = creditosDisponiveis.find(c => c.id === id);
        return sum + (cred ? (cred.valor || 0) : 0);
    }, 0);

    const totalDescontos = desconto + devolucao;
    const totalAPagar = Math.max(0, totalOriginal - totalDescontos - totalCreditosUsados);
    
    const totalPagoDinheiro = formasPagamento.reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
    const totalGeralPago = totalPagoDinheiro + totalCreditosUsados;
    
    // CORREÇÃO LÓGICA:
    // Diferença = (O que pagou) - (O que devia)
    // Se Negativo: Faltou pagar (Dívida)
    // Se Positivo: Pagou a mais (Crédito)
    const diferenca = totalPagoDinheiro - totalAPagar;
    
    return { 
        totalOriginal, 
        desconto, 
        devolucao, 
        totalDescontos, 
        totalCreditosUsados,
        totalAPagar, 
        totalPagoDinheiro,
        totalGeralPago,
        diferenca,
        restante: totalAPagar - totalPagoDinheiro 
    };
  }, [pedidos, selecionados, descontoValor, devolucaoValor, formasPagamento, creditosSelecionados, creditosDisponiveis]);

  const togglePedido = (pedido) => {
    if (selecionados.length > 0 && clienteSelecionado && pedido.cliente_codigo !== clienteSelecionado) {
        if(!window.confirm("Você selecionou um pedido de outro cliente. Deseja limpar a seleção atual e começar com este novo cliente?")) return;
        setSelecionados([pedido.id]);
        return;
    }
    setSelecionados(prev => prev.includes(pedido.id) ? prev.filter(x => x !== pedido.id) : [...prev, pedido.id]);
  };

  const toggleTodos = () => {
    if (pedidosFiltrados.length === 0) return;
    const clienteAlvo = pedidosFiltrados[0].cliente_codigo;
    const pedidosDoCliente = pedidosFiltrados.filter(p => p.cliente_codigo === clienteAlvo);
    if (selecionados.length === pedidosDoCliente.length) setSelecionados([]);
    else setSelecionados(pedidosDoCliente.map(p => p.id));
  };

  const toggleCredito = (id) => {
    setCreditosSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const avancar = () => {
    if (selecionados.length === 0) { toast.error('Selecione pelo menos um pedido'); return; }
    setPasso(2);
  };

  const fazerUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setArquivos(prev => [...prev, ...urls]);
      toast.success(`${files.length} arquivo(s) anexado(s)`);
    } catch (error) { toast.error('Erro ao enviar arquivos'); } 
    finally { setUploading(false); }
  };
  const removerArquivo = (index) => setArquivos(prev => prev.filter((_, i) => i !== index));
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const files = e.dataTransfer.files; if (files?.length > 0) fazerUpload(files); };

  const adicionarForma = () => setFormasPagamento(prev => [...prev, { tipo: 'pix', valor: '' }]);
  const removerForma = (index) => { if (formasPagamento.length > 1) setFormasPagamento(prev => prev.filter((_, i) => i !== index)); };
  const atualizarForma = (index, campo, valor) => {
    const novas = [...formasPagamento];
    novas[index][campo] = valor;
    setFormasPagamento(novas);
  };

  // --- VALIDAÇÃO E ENVIO CORRIGIDOS ---
  const validarEEnviar = async () => {
    const erros = [];
    if (calculos.totalPagoDinheiro > 0 && arquivos.length === 0) erros.push("⚠️ Faltou o comprovante! Anexe o recibo do pagamento.");
    if (calculos.totalPagoDinheiro === 0 && calculos.totalCreditosUsados === 0) erros.push("⚠️ Informe algum valor de pagamento ou use um crédito.");
    if (parseFloat(devolucaoValor) > 0 && !devolucaoObs.trim()) erros.push("⚠️ A devolução requer uma observação explicando o motivo.");

    if (erros.length > 0) { alert("CORRIJA OS SEGUINTES ERROS:\n\n" + erros.join("\n")); return; }

    const dif = calculos.diferenca;

    // Cenário: FALTAM R$ (Dívida)
    if (dif < -0.01) {
        if (!window.confirm(`⚠️ PAGAMENTO PARCIAL?\n\nO valor informado é MENOR que o total.\n\nFaltam: ${formatCurrency(Math.abs(dif))}\n\nO saldo restante continuará em aberto.\nDeseja prosseguir?`)) return;
    }
    
    // Cenário: SOBRAM R$ (Crédito)
    if (dif > 0.01) {
         if (!window.confirm(`💰 GERAR CRÉDITO?\n\nO valor informado é MAIOR que o total.\n\nSobram: ${formatCurrency(dif)}\n\nEsse valor será gerado como CRÉDITO para o cliente.\nDeseja prosseguir?`)) return;
    }

    enviarDadosParaBackend();
  };

  const enviarDadosParaBackend = async () => {
    setEnviando(true);
    try {
      const safePedidos = pedidos || [];
      const pedidosSelecionados = safePedidos.filter(p => selecionados.includes(p.id));
      const descontosCascata = [];
      if (parseFloat(descontoValor) > 0) descontosCascata.push({ tipo: 'reais', valor: parseFloat(descontoValor) });

      if (creditosSelecionados.length > 0) {
          const creds = creditosDisponiveis.filter(c => creditosSelecionados.includes(c.id));
          creds.forEach(c => {
              descontosCascata.push({ tipo: 'credito_uso', valor: c.valor, credito_id: c.id, observacao: `Uso de Crédito Ref. ${c.referencia}` });
          });
      }

      let obsFinal = `Formas: ${formasPagamento.filter(f=>f.valor>0).map(f => `${f.tipo.toUpperCase()}: ${formatCurrency(f.valor)}`).join(', ')}.`;
      if (creditosSelecionados.length > 0) obsFinal += ` | Créditos Usados: ${formatCurrency(calculos.totalCreditosUsados)}`;
      if (observacao) obsFinal += ` | Obs: ${observacao}`;

      const proximoNumero = (await base44.entities.LiquidacaoPendente.list()).length + 1;

      await base44.entities.LiquidacaoPendente.create({
        numero_solicitacao: proximoNumero,
        cliente_codigo: pedidosSelecionados[0].cliente_codigo,
        cliente_nome: pedidosSelecionados[0].cliente_nome,
        pedidos_ids: selecionados,
        valor_total_original: calculos.totalOriginal,
        descontos_cascata: descontosCascata,
        devolucao_valor: parseFloat(devolucaoValor) || 0,
        devolucao_observacao: devolucaoObs || null,
        comprovante_url: arquivos[0],
        comprovantes_urls: arquivos,
        valor_final_proposto: calculos.totalGeralPago,
        status: 'pendente',
        solicitante_tipo: 'representante',
        observacao: obsFinal
      });

      try { await base44.functions.invoke('notificarLiquidacaoPendente', { liquidacao_id: proximoNumero }); } catch (e) {}

      toast.success('Liquidação enviada com sucesso!');
      onSuccess();
      fechar();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar liquidação');
    } finally {
      setEnviando(false);
    }
  };

  const fechar = () => {
    setPasso(1);
    setSelecionados([]);
    setCreditosSelecionados([]);
    setDescontoValor('');
    setDevolucaoValor('');
    setDevolucaoObs('');
    setFormasPagamento([{ tipo: 'pix', valor: '' }]);
    setObservacao('');
    setArquivos([]);
    setIsMaximized(false); 
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent 
        className={cn(
          "p-0 transition-all duration-300 flex flex-col gap-0", // Removi gap padrão
          isMaximized ? "max-w-[98vw] h-[95vh]" : "max-w-4xl max-h-[90vh]"
        )} 
        // Remove o botão de fechar padrão do Dialog para usarmos o nosso customizado
        hideCloseButton={true}
      >
        {/* CABEÇALHO CUSTOMIZADO */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 bg-white rounded-t-lg">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {modoCorrecao ? 
              `✏️ Corrigir Liquidação #${autorizacaoOriginal?.numero_solicitacao}` : 
              `💰 Nova Liquidação - ${passo === 1 ? 'Selecionar Pedidos' : 'Informar Pagamento'}`
            }
          </DialogTitle>
          
          {/* GRUPO DE BOTÕES DE CONTROLE DA JANELA (ESTILO MAC/WINDOWS) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {/* Botão Maximizar/Restaurar */}
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm text-slate-500 transition-all"
                title={isMaximized ? "Restaurar tamanho" : "Maximizar"}
            >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            <div className="w-px h-4 bg-slate-300 mx-0.5" /> {/* Divisor Vertical */}

            {/* Botão Fechar */}
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={fechar}
                className="h-7 w-7 rounded-md hover:bg-red-100 hover:text-red-600 transition-all text-slate-500"
                title="Fechar"
            >
                <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 custom-scrollbar bg-slate-50/30">

        {/* PASSO 1: SELEÇÃO */}
        {passo === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="🔍 Buscar por Cliente ou Nº Pedido..."
                value={buscaPedido}
                onChange={(e) => setBuscaPedido(e.target.value)}
                className="pl-11 pr-4 h-12 text-base border-2 focus:border-blue-400 bg-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button size="sm" variant="outline" onClick={toggleTodos}>
                {selecionados.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos (Mesmo Cliente)'}
              </Button>
              <span className="text-sm text-slate-600">
                {selecionados.length} pedidos selecionados
              </span>
            </div>
            <div className="border border-slate-200 rounded-lg divide-y max-h-96 overflow-y-auto bg-white">
              {pedidosFiltrados.length > 0 ? pedidosFiltrados.map(pedido => (
                <div key={pedido.id} onClick={() => togglePedido(pedido)} className={cn("p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-4", selecionados.includes(pedido.id) && "bg-blue-50")}>
                  <Checkbox checked={selecionados.includes(pedido.id)} />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{pedido.cliente_nome}</p>
                    <p className="text-sm text-slate-500">Pedido #{pedido.numero_pedido}</p>
                  </div>
                  <p className="font-bold text-emerald-600">{formatCurrency(pedido.saldo_restante)}</p>
                </div>
              )) : <div className="p-8 text-center"><Search className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">Nenhum pedido encontrado</p></div>}
            </div>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Total Selecionado:</span>
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculos.totalOriginal)}</span>
              </div>
            </Card>
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={fechar}>Cancelar</Button><Button onClick={avancar} className="bg-blue-600 hover:bg-blue-700">Avançar</Button></div>
          </div>
        )}

        {/* PASSO 2: PAGAMENTO */}
        {passo === 2 && (
          <div className="space-y-5" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            {isDragging && (<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-blue-600/20 backdrop-blur-md"><div className="bg-white rounded-3xl shadow-2xl p-12 border-4 border-dashed border-blue-500"><Upload className="w-20 h-20 text-blue-600 mx-auto mb-4 animate-bounce" /><p className="text-3xl font-bold text-slate-800 text-center">SOLTE OS ARQUIVOS AQUI</p></div></div>)}
            
            {/* TOTALIZADORES */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-blue-50 border-blue-200"><p className="text-xs text-blue-600 font-bold uppercase">Total Original</p><p className="text-2xl font-bold text-blue-700">{formatCurrency(calculos.totalOriginal)}</p></Card>
              <Card className="p-4 bg-amber-50 border-amber-200"><p className="text-xs text-amber-600 font-bold uppercase">Descontos/Devoluções/Créditos</p><p className="text-2xl font-bold text-amber-700">- {formatCurrency(calculos.totalDescontos + calculos.totalCreditosUsados)}</p></Card>
              <Card className="p-4 bg-slate-50 border-slate-200"><p className="text-xs text-slate-600 font-bold uppercase">Total a Pagar</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(calculos.totalAPagar)}</p></Card>
              <Card className="p-4 bg-emerald-50 border-emerald-200"><p className="text-xs text-emerald-600 font-bold uppercase">Pagamento Informado</p><p className="text-2xl font-bold text-emerald-700">{formatCurrency(calculos.totalPagoDinheiro)}</p></Card>
            </div>
            
            {/* STATUS DO SALDO (CORRIGIDO) */}
            {Math.abs(calculos.diferenca) > 0.01 && (
                <Card className={cn("p-4 text-center", calculos.diferenca < 0 ? "bg-red-50 border-red-200" : "bg-indigo-50 border-indigo-200")}>
                    <p className={cn("font-bold text-sm uppercase", calculos.diferenca < 0 ? "text-red-600" : "text-indigo-600")}>
                        {calculos.diferenca < 0 ? "⚠️ Pagamento Parcial (Faltam)" : "💰 Pagamento Excedente (Sobram)"}
                    </p>
                    <p className={cn("text-3xl font-bold", calculos.diferenca < 0 ? "text-red-700" : "text-indigo-700")}>
                        {formatCurrency(Math.abs(calculos.diferenca))}
                    </p>
                </Card>
            )}

            {/* CRÉDITOS */}
            {creditosDisponiveis.length > 0 && (
                <Card className="p-4 bg-indigo-50 border-indigo-200">
                    <h3 className="font-bold text-indigo-800 mb-3 flex items-center gap-2"><Wallet className="w-5 h-5" /> Créditos Disponíveis</h3>
                    <div className="space-y-2">
                        {creditosDisponiveis.map(credito => (
                            <div key={credito.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                <Checkbox id={`cred-${credito.id}`} checked={creditosSelecionados.includes(credito.id)} onCheckedChange={() => toggleCredito(credito.id)} />
                                <Label htmlFor={`cred-${credito.id}`} className="flex-1 cursor-pointer"><div className="flex justify-between items-center"><div><p className="font-bold text-slate-800">Ref: {credito.referencia}</p><p className="text-xs text-slate-500">{credito.descricao}</p></div><p className="font-bold text-indigo-600">{formatCurrency(credito.valor)}</p></div></Label>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* DESCONTOS */}
            <Card className="p-4 bg-amber-50/30 border-amber-200">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-600" /> Descontos & Devoluções</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-sm">Desconto (R$)</Label><Input type="number" step="0.01" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} placeholder="0,00" className="bg-white" /></div>
                <div><Label className="text-sm">Devolução (R$)</Label><Input type="number" step="0.01" value={devolucaoValor} onChange={(e) => setDevolucaoValor(e.target.value)} placeholder="0,00" className="bg-white" /></div>
              </div>
              {parseFloat(devolucaoValor) > 0 && (<div className="mt-2"><Label className="text-sm">Motivo da Devolução *</Label><Textarea value={devolucaoObs} onChange={(e) => setDevolucaoObs(e.target.value)} placeholder="Explique o motivo..." className="h-16 resize-none bg-white" /></div>)}
            </Card>

            {/* PAGAMENTO */}
            <Card className="p-4 bg-emerald-50/30 border-emerald-200">
              <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Formas de Pagamento</h3><Button size="sm" variant="outline" onClick={adicionarForma} className="bg-white"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button></div>
              <div className="space-y-2">
                {formasPagamento.map((forma, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <select value={forma.tipo} onChange={(e) => atualizarForma(idx, 'tipo', e.target.value)} className="col-span-5 h-10 rounded-lg border border-slate-300 px-3 bg-white text-sm"><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option><option value="cheque">Cheque</option><option value="cartao">Cartão</option></select>
                    <Input type="number" step="0.01" value={forma.valor} onChange={(e) => atualizarForma(idx, 'valor', e.target.value)} placeholder="Valor" className="col-span-5 h-10 bg-white" />
                    {formasPagamento.length > 1 && (<Button size="icon" variant="ghost" onClick={() => removerForma(idx)} className="col-span-2 h-10 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>)}
                  </div>
                ))}
              </div>
            </Card>

            {/* ANEXOS */}
            <div className="space-y-3">
              <Label className="font-bold text-slate-800">Comprovantes de Pagamento *</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-white hover:bg-slate-50 transition-colors text-center cursor-pointer relative" onClick={() => document.getElementById('file-input').click()}>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">Arraste e solte ou clique para selecionar</p>
                <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => fazerUpload(e.target.files)} className="hidden" id="file-input" />
              </div>
              {arquivos.length > 0 && (<div className="grid grid-cols-3 gap-2">{arquivos.map((url, idx) => (<div key={idx} className="relative group"><img src={url} alt={`Comprovante ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg border-2 border-slate-200" /><Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" onClick={() => removerArquivo(idx)}><X className="w-3 h-3" /></Button></div>))}</div>)}
              {uploading && <div className="flex items-center justify-center gap-2 text-blue-600"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Enviando arquivos...</span></div>}
            </div>

            <div><Label className="text-sm">Observações</Label><Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Informações adicionais..." className="h-20 resize-none bg-white" /></div>

            <div className="flex justify-between pt-4 border-t"><Button variant="outline" onClick={() => setPasso(1)}>Voltar</Button><div className="flex gap-2"><Button variant="outline" onClick={fechar}>Cancelar</Button><Button onClick={validarEEnviar} disabled={enviando || uploading} className="bg-emerald-600 hover:bg-emerald-700 gap-2">{enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><CheckCircle className="w-4 h-4" /> FINALIZAR LIQUIDAÇÃO ({arquivos.length} anexos)</>}</Button></div></div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}