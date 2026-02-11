import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Plus, Eye, Truck, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";

// IMPORTS DOS COMPONENTES DE CLIENTE
import ClienteDetails from "@/components/clientes/ClienteDetails";
import ClienteForm from "@/components/clientes/ClienteForm";

export default function PedidoForm({ pedido, clientes = [], onSave, onCancel, onCadastrarCliente, isLoading }) {
  const [form, setForm] = useState({
    cliente_codigo: '',
    cliente_nome: '',
    cliente_regiao: '',
    representante_codigo: '',
    representante_nome: '',
    data_entrega: '',
    numero_pedido: '',
    valor_pedido: 0,
    saldo_restante: 0,
    observacao: '',
    outras_informacoes: '',
    status: 'aberto',
    porcentagem_comissao: 5,
    rota: '', 
    motorista: '',
    desconto_tipo: 'valor',
    desconto_valor: 0
  });

  // Estados para Modais e Buscas
  const [clienteSelecionadoDetalhes, setClienteSelecionadoDetalhes] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false); // Modal de Cadastro
  const [buscaCliente, setBuscaCliente] = useState(""); 
  
  // Estado para armazenar clientes criados AGORA (para aparecerem na lista sem F5)
  const [novosClientesLocais, setNovosClientesLocais] = useState([]);

  // Combina clientes do banco com os recém-criados localmente
  const todosClientes = useMemo(() => {
    return [...clientes, ...novosClientesLocais];
  }, [clientes, novosClientesLocais]);

  useEffect(() => {
    if (pedido) {
      setForm({
        cliente_codigo: pedido.cliente_codigo || '',
        cliente_nome: pedido.cliente_nome || '',
        cliente_regiao: pedido.cliente_regiao || '',
        representante_codigo: pedido.representante_codigo || '',
        representante_nome: pedido.representante_nome || '',
        data_entrega: pedido.data_entrega || '',
        numero_pedido: pedido.numero_pedido || '',
        valor_pedido: pedido.valor_pedido || 0,
        saldo_restante: pedido.saldo_restante || 0,
        observacao: pedido.observacao || '',
        outras_informacoes: pedido.outras_informacoes || '',
        status: pedido.status || 'aberto',
        porcentagem_comissao: pedido.porcentagem_comissao || 5,
        rota: pedido.rota || '', 
        motorista: pedido.motorista || '',
        desconto_tipo: pedido.desconto_tipo || 'valor',
        desconto_valor: pedido.desconto_valor || 0
      });
    }
  }, [pedido]);

  // Filtra a lista combinada
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return todosClientes;
    const termo = buscaCliente.toLowerCase();
    return todosClientes.filter(c => 
      c.nome.toLowerCase().includes(termo) || 
      String(c.codigo).toLowerCase().includes(termo)
    );
  }, [todosClientes, buscaCliente]);

  const handleClienteChange = (codigo) => {
    const cli = todosClientes.find(c => c.codigo === codigo);
    if (cli) {
      setForm({
        ...form,
        cliente_codigo: codigo,
        cliente_nome: cli.nome,
        cliente_regiao: cli.regiao || '',
        representante_codigo: cli.representante_codigo || '',
        representante_nome: cli.representante_nome || '',
        porcentagem_comissao: cli.porcentagem_comissao || 5
      });
    }
  };

  const updateValores = (field, value) => {
    const newForm = { ...form, [field]: value };
    let valorDescontoReais = 0;
    const valorTotal = parseFloat(newForm.valor_pedido) || 0;
    const descontoInput = parseFloat(newForm.desconto_valor) || 0;

    if (newForm.desconto_tipo === 'valor') {
        valorDescontoReais = descontoInput;
    } else {
        valorDescontoReais = (valorTotal * descontoInput) / 100;
    }
    newForm.saldo_restante = Math.max(0, valorTotal - valorDescontoReais);
    setForm(newForm);
  };

  const handleSave = () => {
    onSave(form);
  };

  const openClienteModal = () => {
    const cli = todosClientes.find(c => c.codigo === form.cliente_codigo);
    if (cli) {
      setClienteSelecionadoDetalhes(cli);
      setShowClienteModal(true);
    }
  };

  // Callback quando um novo cliente é criado com sucesso
  const handleSuccessNovoCliente = (novoCliente) => {
    // Adiciona na lista local para aparecer imediatamente no Select
    setNovosClientesLocais(prev => [...prev, novoCliente]);
    
    // Seleciona ele automaticamente no formulário
    setForm(prev => ({
        ...prev,
        cliente_codigo: novoCliente.codigo,
        cliente_nome: novoCliente.nome,
        cliente_regiao: novoCliente.regiao || '',
        representante_codigo: novoCliente.representante_codigo || '',
        representante_nome: novoCliente.representante_nome || '',
        porcentagem_comissao: novoCliente.porcentagem_comissao || 5
    }));

    setShowNovoClienteModal(false);
    
    // Se a página pai passou uma função de recarregar, chama ela também
    if (onCadastrarCliente) onCadastrarCliente();
  };

  const inputClass = "h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all";

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SELEÇÃO DE CLIENTE */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                    value={form.cliente_codigo}
                    onValueChange={handleClienteChange}
                    disabled={!!pedido}
                >
                    <SelectTrigger className={cn(inputClass, "w-full text-left font-medium")}>
                       <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    
                    <SelectContent className="max-h-[300px]">
                        <div className="p-2 sticky top-0 bg-white z-10 border-b pb-2 mb-1">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    placeholder="Buscar por nome ou código..." 
                                    value={buscaCliente}
                                    onChange={(e) => setBuscaCliente(e.target.value)}
                                    className="h-9 pl-8 bg-slate-50"
                                    onKeyDown={(e) => e.stopPropagation()} 
                                    autoFocus
                                />
                            </div>
                        </div>

                        {clientesFiltrados.length === 0 ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                                Nenhum cliente encontrado.
                            </div>
                        ) : (
                            clientesFiltrados.map((cli) => (
                                <SelectItem key={cli.codigo} value={cli.codigo} className="py-3 border-b border-slate-50 last:border-0 cursor-pointer">
                                    <div className="flex flex-col text-left">
                                        <span className="font-bold text-slate-700">{cli.nome}</span>
                                        <span className="text-xs text-slate-400">Cód: {cli.codigo} {cli.regiao ? `• ${cli.regiao}` : ''}</span>
                                    </div>
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
              </div>

              {/* Botão Olho: Ver Detalhes */}
              <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={openClienteModal}
                  disabled={!form.cliente_codigo}
                  className="h-11 w-11 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  title="Ver Detalhes do Cliente"
              >
                  <Eye className="h-5 w-5" />
              </Button>

              {/* Botão Plus: Novo Cliente (Chama o Modal Agora) */}
              {!pedido && (
                  <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowNovoClienteModal(true)}
                      className="h-11 w-11 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                      title="Cadastrar Novo Cliente"
                  >
                      <Plus className="h-5 w-5" />
                  </Button>
              )}
          </div>
        </div>

        {/* NÚMERO DO PEDIDO */}
        <div className="space-y-2">
          <Label htmlFor="numero_pedido">Número do Pedido *</Label>
          <Input
            id="numero_pedido"
            value={form.numero_pedido}
            onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })}
            placeholder="Ex: PED001"
            className={inputClass}
          />
        </div>

        {/* DATA DE ENTREGA */}
        <div className="space-y-2">
          <Label htmlFor="data_entrega">Data de Entrega *</Label>
          <Input
            id="data_entrega"
            type="date"
            value={form.data_entrega}
            onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* ROTA */}
        <div className="space-y-2">
            <Label htmlFor="rota">Rota de Entrega</Label>
            <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    id="rota"
                    value={form.rota}
                    onChange={(e) => setForm({ ...form, rota: e.target.value })}
                    placeholder="Ex: Zona Norte / Interior"
                    className={cn(inputClass, "pl-9")}
                />
            </div>
        </div>

        {/* MOTORISTA */}
        <div className="space-y-2">
            <Label htmlFor="motorista">Motorista Responsável</Label>
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    id="motorista"
                    value={form.motorista}
                    onChange={(e) => setForm({ ...form, motorista: e.target.value })}
                    placeholder="Nome do motorista"
                    className={cn(inputClass, "pl-9")}
                />
            </div>
        </div>

        {/* COMISSÃO */}
        <div className="space-y-2">
          <Label htmlFor="porcentagem_comissao">Comissão (%)</Label>
          <div className="relative">
            <Input
                id="porcentagem_comissao"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.porcentagem_comissao}
                onChange={(e) => setForm({ ...form, porcentagem_comissao: parseFloat(e.target.value) || 0 })}
                className={cn(inputClass, "pr-8")}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
           </div>
        </div>

        {/* VALOR DO PEDIDO */}
        <div className="space-y-2">
          <Label htmlFor="valor_pedido">Valor do Pedido (R$) *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
            <Input
                id="valor_pedido"
                type="number"
                min="0"
                step="0.01"
                value={form.valor_pedido}
                onChange={(e) => updateValores('valor_pedido', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, "pl-9 font-bold text-slate-700")}
            />
          </div>
        </div>

        {/* DESCONTO */}
        <div className="space-y-2">
            <Label>Desconto (Opcional)</Label>
            <div className="flex gap-2">
                <Select
                    value={form.desconto_tipo}
                    onValueChange={(val) => updateValores('desconto_tipo', val)}
                >
                    <SelectTrigger className={cn(inputClass, "w-24")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="valor">R$</SelectItem>
                        <SelectItem value="porcentagem">%</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    type="number"
                    min="0"
                    step={form.desconto_tipo === 'valor' ? "0.01" : "0.1"}
                    value={form.desconto_valor}
                    onChange={(e) => updateValores('desconto_valor', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className={cn(inputClass, form.desconto_valor > 0 ? "text-red-600 font-medium" : "")}
                />
            </div>
        </div>

        {/* SALDO RESTANTE */}
        <div className="space-y-2 md:col-span-2">
          <Label>Valor Líquido (A Receber)</Label>
          <div className="h-14 flex items-center justify-between px-4 bg-slate-50 border border-slate-200 rounded-xl">
             <span className="text-sm text-slate-500 font-medium uppercase">Total c/ Desconto:</span>
             <span className="font-bold text-2xl text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(form.saldo_restante)}
             </span>
          </div>
        </div>

        {/* OBSERVAÇÃO */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="observacao">Observação</Label>
          <Textarea
            id="observacao"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Observações sobre o pedido..."
            rows={3}
            className={cn(inputClass, "h-auto py-3")}
          />
        </div>

        {/* OUTRAS INFORMAÇÕES */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="outras_informacoes">Outras Informações</Label>
          <Textarea
            id="outras_informacoes"
            value={form.outras_informacoes}
            onChange={(e) => setForm({ ...form, outras_informacoes: e.target.value })}
            placeholder="Informações adicionais..."
            rows={2}
            className={cn(inputClass, "h-auto py-3")}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={isLoading} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
          <Save className="w-4 h-4 mr-2" />
          {pedido ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>

      {/* MODAL 1: DETALHES DO CLIENTE */}
      <ModalContainer
        open={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        title={`Ficha do Cliente: ${clienteSelecionadoDetalhes?.nome || ''}`}
        size="lg"
      >
        {clienteSelecionadoDetalhes && (
            <ClienteDetails 
                cliente={clienteSelecionadoDetalhes} 
                onClose={() => setShowClienteModal(false)}
            />
        )}
      </ModalContainer>

      {/* MODAL 2: NOVO CLIENTE (Reutilizando ClienteForm) */}
      <ModalContainer
        open={showNovoClienteModal}
        onClose={() => setShowNovoClienteModal(false)}
        title="Cadastrar Novo Cliente"
        size="xl"
      >
        {/* Passando onSuccess para capturar o novo cliente criado */}
        <ClienteForm 
            onSuccess={handleSuccessNovoCliente}
            onCancel={() => setShowNovoClienteModal(false)}
        />
      </ModalContainer>
    </div>
  );
}