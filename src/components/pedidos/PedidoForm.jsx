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
import { Save, X, Plus, Eye, Truck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer"; // Importe o ModalContainer

// Componente para exibir detalhes do cliente
const ClienteInfoModal = ({ cliente, onClose }) => {
  if (!cliente) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><strong>Código:</strong> {cliente.codigo}</div>
        <div><strong>Nome:</strong> {cliente.nome}</div>
        <div><strong>Região:</strong> {cliente.regiao || '-'}</div>
        <div><strong>Telefone:</strong> {cliente.telefone || '-'}</div>
        <div><strong>Email:</strong> {cliente.email || '-'}</div>
        <div><strong>Endereço:</strong> {cliente.endereco || '-'}</div>
      </div>
      <div className="flex justify-end pt-4">
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
};

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
    // total_pago removido conforme solicitado
    saldo_restante: 0,
    observacao: '',
    outras_informacoes: '',
    status: 'aberto',
    porcentagem_comissao: 5,
    rota: '', // ADICIONADO: campo rota
    motorista: '', // ADICIONADO: campo motorista
    desconto_tipo: 'valor', // ADICIONADO: tipo de desconto (valor ou porcentagem)
    desconto_valor: 0 // ADICIONADO: valor do desconto
  });

  const [clienteSelecionadoDetalhes, setClienteSelecionadoDetalhes] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState(""); // Estado para busca de cliente

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
        // total_pago removido
        saldo_restante: pedido.saldo_restante || 0,
        observacao: pedido.observacao || '',
        outras_informacoes: pedido.outras_informacoes || '',
        status: pedido.status || 'aberto',
        porcentagem_comissao: pedido.porcentagem_comissao || 5,
        rota: pedido.rota || '', // ADICIONADO
        motorista: pedido.motorista || '', // ADICIONADO
        desconto_tipo: pedido.desconto_tipo || 'valor', // ADICIONADO
        desconto_valor: pedido.desconto_valor || 0 // ADICIONADO
      });
    }
  }, [pedido]);

  // Filtragem de clientes melhorada
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes;
    const termo = buscaCliente.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(termo) || 
      c.codigo.toLowerCase().includes(termo)
    );
  }, [clientes, buscaCliente]);

  const handleClienteChange = (codigo) => {
    const cli = clientes.find(c => c.codigo === codigo);
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

  const handleValorChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    // Recalcula saldo restante considerando desconto (se houver lógica futura para abater do saldo)
    // Por enquanto, saldo_restante = valor_pedido pois total_pago foi removido da edição manual direta neste form (assumindo que pagamentos são lançados separadamente ou iniciam zerados)
    // Se desejar aplicar o desconto no valor do pedido ou saldo, ajuste aqui.
    // Exemplo: Saldo = Valor Pedido - Desconto (se aplicável no saldo inicial)
    
    let desconto = 0;
    if (newForm.desconto_tipo === 'valor') {
        desconto = newForm.desconto_valor;
    } else {
        desconto = (newForm.valor_pedido * newForm.desconto_valor) / 100;
    }
    
    // Ajuste simples: Saldo inicial é o valor do pedido menos o desconto
    newForm.saldo_restante = (newForm.valor_pedido || 0) - desconto;

    setForm(newForm);
  };

  const handleSave = () => {
    onSave(form);
  };

  const openClienteModal = () => {
    const cli = clientes.find(c => c.codigo === form.cliente_codigo);
    if (cli) {
      setClienteSelecionadoDetalhes(cli);
      setShowClienteModal(true);
    }
  };

  const inputClass = "h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all";

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Campo Cliente Melhorado */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <div className="flex items-center gap-2">
             {/* Select nativo substituído por combobox simulado ou select com busca se o componente UI permitir, 
                 aqui mantendo Select do shadcn mas adicionando filtro visual se possível ou apenas melhorando a UX */}
              
              <div className="flex-1 relative">
                <Select
                    value={form.cliente_codigo}
                    onValueChange={handleClienteChange}
                    disabled={!!pedido}
                >
                    <SelectTrigger className={cn(inputClass, "w-full")}>
                    <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Input de busca dentro do Select (simulação) */}
                        <div className="p-2 sticky top-0 bg-white z-10 border-b">
                            <Input 
                                placeholder="Buscar cliente..." 
                                value={buscaCliente}
                                onChange={(e) => setBuscaCliente(e.target.value)}
                                className="h-8"
                                onKeyDown={(e) => e.stopPropagation()} // Evita fechar o select ao digitar
                            />
                        </div>
                        {clientesFiltrados.length === 0 ? (
                            <div className="p-2 text-sm text-slate-500 text-center">Nenhum cliente encontrado</div>
                        ) : (
                            clientesFiltrados.map((cli) => (
                                <SelectItem key={cli.codigo} value={cli.codigo}>
                                {cli.codigo} - {cli.nome}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
              </div>

              {/* Botão Olho para ver detalhes */}
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

              {!pedido && onCadastrarCliente && (
                  <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={onCadastrarCliente}
                      className="h-11 w-11 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      title="Cadastrar Novo Cliente"
                  >
                      <Plus className="h-5 w-5" />
                  </Button>
              )}
          </div>
        </div>

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

        {/* Campo Rota */}
        <div className="space-y-2">
            <Label htmlFor="rota">Rota</Label>
            <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    id="rota"
                    value={form.rota}
                    onChange={(e) => setForm({ ...form, rota: e.target.value })}
                    placeholder="Ex: Zona Norte"
                    className={cn(inputClass, "pl-9")}
                />
            </div>
        </div>

        {/* Campo Motorista */}
        <div className="space-y-2">
            <Label htmlFor="motorista">Motorista</Label>
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
                onChange={(e) => handleValorChange('valor_pedido', parseFloat(e.target.value) || 0)}
                className={cn(inputClass, "pl-9 font-medium text-slate-700")}
            />
          </div>
        </div>

        {/* Campo Desconto */}
        <div className="space-y-2">
            <Label>Desconto (Opcional)</Label>
            <div className="flex gap-2">
                <Select
                    value={form.desconto_tipo}
                    onValueChange={(val) => {
                        const newForm = { ...form, desconto_tipo: val };
                        // Recalcula saldo ao mudar tipo
                        let desconto = 0;
                        if (val === 'valor') {
                            desconto = newForm.desconto_valor;
                        } else {
                            desconto = (newForm.valor_pedido * newForm.desconto_valor) / 100;
                        }
                        newForm.saldo_restante = (newForm.valor_pedido || 0) - desconto;
                        setForm(newForm);
                    }}
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
                    onChange={(e) => handleValorChange('desconto_valor', parseFloat(e.target.value) || 0)}
                    placeholder="Valor do desconto"
                    className={inputClass}
                />
            </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Saldo Restante (A Receber)</Label>
          <div className="h-11 flex items-center px-4 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-lg text-slate-700">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(form.saldo_restante)}
          </div>
        </div>

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

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={isLoading} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
          <Save className="w-4 h-4 mr-2" />
          {pedido ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>

      {/* Modal de Detalhes do Cliente */}
      <ModalContainer
        open={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        title="Detalhes do Cliente"
        size="md"
      >
        <ClienteInfoModal cliente={clienteSelecionadoDetalhes} onClose={() => setShowClienteModal(false)} />
      </ModalContainer>
    </div>
  );
}