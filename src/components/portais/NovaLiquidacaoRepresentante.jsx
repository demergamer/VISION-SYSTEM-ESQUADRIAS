import React, { useState, useMemo } from 'react';
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
  Plus, Trash2, FileText, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function NovaLiquidacaoRepresentante({ open, onClose, pedidos, onSuccess }) {
  const [passo, setPasso] = useState(1);
  const [selecionados, setSelecionados] = useState([]);
  
  // Campos do Passo 2
  const [descontoValor, setDescontoValor] = useState('');
  const [devolucaoValor, setDevolucaoValor] = useState('');
  const [devolucaoObs, setDevolucaoObs] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([{ tipo: 'pix', valor: '' }]);
  const [observacao, setObservacao] = useState('');
  const [arquivos, setArquivos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);

  // Cálculos
  const calculos = useMemo(() => {
    const pedidosSelecionados = pedidos.filter(p => selecionados.includes(p.id));
    const totalOriginal = pedidosSelecionados.reduce((sum, p) => sum + (p.saldo_restante || 0), 0);
    
    const desconto = parseFloat(descontoValor) || 0;
    const devolucao = parseFloat(devolucaoValor) || 0;
    const totalDescontos = desconto + devolucao;
    
    const totalAPagar = totalOriginal - totalDescontos;
    
    const totalPago = formasPagamento.reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
    
    const restante = totalAPagar - totalPago;
    
    return { totalOriginal, desconto, devolucao, totalDescontos, totalAPagar, totalPago, restante };
  }, [pedidos, selecionados, descontoValor, devolucaoValor, formasPagamento]);

  // Toggle Pedido
  const togglePedido = (id) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    setSelecionados(prev => prev.length === pedidos.length ? [] : pedidos.map(p => p.id));
  };

  // Avançar para Passo 2
  const avancar = () => {
    if (selecionados.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    setPasso(2);
  };

  // Upload de Arquivos
  const fazerUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setArquivos(prev => [...prev, ...urls]);
      toast.success(`${files.length} arquivo(s) anexado(s)`);
    } catch (error) {
      toast.error('Erro ao enviar arquivos');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removerArquivo = (index) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  // Drag & Drop Handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      fazerUpload(files);
    }
  };

  // Adicionar/Remover Forma de Pagamento
  const adicionarForma = () => {
    setFormasPagamento(prev => [...prev, { tipo: 'pix', valor: '' }]);
  };

  const removerForma = (index) => {
    if (formasPagamento.length > 1) {
      setFormasPagamento(prev => prev.filter((_, i) => i !== index));
    }
  };

  const atualizarForma = (index, campo, valor) => {
    const novas = [...formasPagamento];
    novas[index][campo] = valor;
    setFormasPagamento(novas);
  };

  // VALIDAÇÃO E ENVIO (CHECK-ON-CLICK)
  const validarEEnviar = async () => {
    const erros = [];

    // Validação 1: Anexos
    if (arquivos.length === 0) {
      erros.push("⚠️ Faltou o comprovante! Anexe pelo menos uma foto ou PDF.");
    }

    // Validação 2: Formas de Pagamento
    const formasComValor = formasPagamento.filter(f => parseFloat(f.valor) > 0);
    if (formasComValor.length === 0) {
      erros.push("⚠️ Nenhuma forma de pagamento informada com valor válido.");
    }

    // Validação 3: Valores
    if (calculos.totalPago <= 0) {
      erros.push("⚠️ O valor total pago deve ser maior que zero.");
    }

    // Validação 4: Cobertura
    if (calculos.restante > 0.01) {
      erros.push(`⚠️ Falta pagar ${formatCurrency(calculos.restante)} para cobrir o total.`);
    }

    // Validação 5: Devolução requer observação
    if (parseFloat(devolucaoValor) > 0 && !devolucaoObs.trim()) {
      erros.push("⚠️ A devolução requer uma observação explicando o motivo.");
    }

    // SE TIVER ERROS: Alertar e Parar
    if (erros.length > 0) {
      alert("CORRIJA OS SEGUINTES ERROS:\n\n" + erros.join("\n"));
      return;
    }

    // SE TUDO OK: Enviar
    enviarDadosParaBackend();
  };

  const enviarDadosParaBackend = async () => {
    setEnviando(true);

    try {
      const user = await base44.auth.me();
      const pedidosSelecionados = pedidos.filter(p => selecionados.includes(p.id));

      // Obter próximo número
      const todasSolicitacoes = await base44.entities.LiquidacaoPendente.list();
      const proximoNumero = todasSolicitacoes.length > 0 
        ? Math.max(...todasSolicitacoes.map(s => s.numero_solicitacao || 0)) + 1 
        : 1;

      // Construir descontos
      const descontosCascata = [];
      if (parseFloat(descontoValor) > 0) {
        descontosCascata.push({ tipo: 'reais', valor: parseFloat(descontoValor) });
      }

      // Criar solicitação
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
        valor_final_proposto: calculos.totalPago,
        status: 'pendente',
        solicitante_tipo: 'representante',
        observacao: `Formas: ${formasPagamento.map(f => `${f.tipo.toUpperCase()}: ${formatCurrency(f.valor)}`).join(', ')}. ${observacao}`
      });

      // Notificar admins
      try {
        await base44.functions.invoke('notificarLiquidacaoPendente', { liquidacao_id: proximoNumero });
      } catch (e) {
        console.log('Erro ao notificar:', e);
      }

      toast.success('Liquidação enviada com sucesso!');
      onSuccess();
      resetarFormulario();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar liquidação');
    } finally {
      setEnviando(false);
    }
  };

  const resetarFormulario = () => {
    setPasso(1);
    setSelecionados([]);
    setDescontoValor('');
    setDevolucaoValor('');
    setDevolucaoObs('');
    setFormasPagamento([{ tipo: 'pix', valor: '' }]);
    setObservacao('');
    setArquivos([]);
  };

  const fechar = () => {
    resetarFormulario();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            💰 Nova Liquidação - {passo === 1 ? 'Selecionar Pedidos' : 'Informar Pagamento'}
          </DialogTitle>
        </DialogHeader>

        {/* PASSO 1: SELEÇÃO */}
        {passo === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button size="sm" variant="outline" onClick={toggleTodos}>
                {selecionados.length === pedidos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
              <span className="text-sm text-slate-600">
                {selecionados.length} de {pedidos.length} selecionados
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y max-h-96 overflow-y-auto">
              {pedidos.map(pedido => (
                <div
                  key={pedido.id}
                  onClick={() => togglePedido(pedido.id)}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-4",
                    selecionados.includes(pedido.id) && "bg-blue-50"
                  )}
                >
                  <Checkbox checked={selecionados.includes(pedido.id)} />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{pedido.cliente_nome}</p>
                    <p className="text-sm text-slate-500">Pedido #{pedido.numero_pedido}</p>
                  </div>
                  <p className="font-bold text-emerald-600">{formatCurrency(pedido.saldo_restante)}</p>
                </div>
              ))}
            </div>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Total Selecionado:</span>
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculos.totalOriginal)}</span>
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={fechar}>Cancelar</Button>
              <Button onClick={avancar} className="bg-blue-600 hover:bg-blue-700">
                Avançar
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 2: PAGAMENTO */}
        {passo === 2 && (
          <div 
            className="space-y-5"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Overlay Drag & Drop */}
            {isDragging && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-blue-600/20 backdrop-blur-md">
                <div className="bg-white rounded-3xl shadow-2xl p-12 border-4 border-dashed border-blue-500">
                  <Upload className="w-20 h-20 text-blue-600 mx-auto mb-4 animate-bounce" />
                  <p className="text-3xl font-bold text-slate-800 text-center">SOLTE OS ARQUIVOS AQUI</p>
                </div>
              </div>
            )}

            {/* TOTALIZADORES (TOPO) */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-xs text-blue-600 font-bold uppercase">Total Original</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(calculos.totalOriginal)}</p>
              </Card>
              <Card className="p-4 bg-amber-50 border-amber-200">
                <p className="text-xs text-amber-600 font-bold uppercase">Descontos/Devoluções</p>
                <p className="text-2xl font-bold text-amber-700">- {formatCurrency(calculos.totalDescontos)}</p>
              </Card>
              <Card className="p-4 bg-slate-50 border-slate-200">
                <p className="text-xs text-slate-600 font-bold uppercase">Total a Pagar</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(calculos.totalAPagar)}</p>
              </Card>
              <Card className="p-4 bg-emerald-50 border-emerald-200">
                <p className="text-xs text-emerald-600 font-bold uppercase">Total Pago</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(calculos.totalPago)}</p>
              </Card>
            </div>

            {calculos.restante !== 0 && (
              <Card className={cn("p-4", calculos.restante > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
                <p className={cn("text-xs font-bold uppercase", calculos.restante > 0 ? "text-red-600" : "text-green-600")}>
                  {calculos.restante > 0 ? "Falta Pagar" : "Excedente"}
                </p>
                <p className={cn("text-2xl font-bold", calculos.restante > 0 ? "text-red-700" : "text-green-700")}>
                  {formatCurrency(Math.abs(calculos.restante))}
                </p>
              </Card>
            )}

            {/* DESCONTOS E DEVOLUÇÕES */}
            <Card className="p-4 bg-amber-50/30 border-amber-200">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Descontos & Devoluções
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Desconto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={descontoValor}
                    onChange={(e) => setDescontoValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label className="text-sm">Devolução (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={devolucaoValor}
                    onChange={(e) => setDevolucaoValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              {parseFloat(devolucaoValor) > 0 && (
                <div className="mt-2">
                  <Label className="text-sm">Motivo da Devolução *</Label>
                  <Textarea
                    value={devolucaoObs}
                    onChange={(e) => setDevolucaoObs(e.target.value)}
                    placeholder="Explique o motivo..."
                    className="h-16 resize-none"
                  />
                </div>
              )}
            </Card>

            {/* FORMAS DE PAGAMENTO */}
            <Card className="p-4 bg-emerald-50/30 border-emerald-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Formas de Pagamento
                </h3>
                <Button size="sm" variant="outline" onClick={adicionarForma}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {formasPagamento.map((forma, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <select
                      value={forma.tipo}
                      onChange={(e) => atualizarForma(idx, 'tipo', e.target.value)}
                      className="col-span-5 h-10 rounded-lg border border-slate-300 px-3 bg-white text-sm"
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="transferencia">Transferência</option>
                      <option value="cheque">Cheque</option>
                      <option value="cartao">Cartão</option>
                    </select>
                    <Input
                      type="number"
                      step="0.01"
                      value={forma.valor}
                      onChange={(e) => atualizarForma(idx, 'valor', e.target.value)}
                      placeholder="Valor"
                      className="col-span-5 h-10"
                    />
                    {formasPagamento.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removerForma(idx)}
                        className="col-span-2 h-10 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* ANEXOS */}
            <div className="space-y-3">
              <Label className="font-bold text-slate-800">Comprovantes de Pagamento *</Label>
              
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition-colors text-center">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">Arraste e solte ou clique para selecionar</p>
                <p className="text-xs text-slate-500 mt-1">Múltiplos arquivos aceitos (Fotos/PDFs)</p>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => fazerUpload(e.target.files)}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input">
                  <Button type="button" size="sm" variant="outline" className="mt-3 cursor-pointer" asChild>
                    <span>Selecionar Arquivos</span>
                  </Button>
                </label>
              </div>

              {/* Preview */}
              {arquivos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {arquivos.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Comprovante ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg border-2 border-slate-200" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"
                        onClick={() => removerArquivo(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploading && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Enviando arquivos...</span>
                </div>
              )}
            </div>

            {/* OBSERVAÇÕES */}
            <div>
              <Label className="text-sm">Observações</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Informações adicionais..."
                className="h-20 resize-none"
              />
            </div>

            {/* BOTÕES */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setPasso(1)}>Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fechar}>Cancelar</Button>
                <Button
                  onClick={validarEEnviar}
                  disabled={enviando || uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      FINALIZAR LIQUIDAÇÃO ({arquivos.length} anexos)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}