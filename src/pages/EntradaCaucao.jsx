import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Search, Plus, Grid3x3, List, ArrowLeft, Loader2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import PortForm from "@/components/entradas/PortForm";
import PortCard from "@/components/entradas/PortCard";
import PortDetalhes from "@/components/entradas/PortDetalhes";

export default function EntradaCaucao() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [portSelecionado, setPortSelecionado] = useState(null);

  const { data: ports = [], isLoading } = useQuery({
    queryKey: ['ports'],
    queryFn: () => base44.entities.Port.list('-numero_port')
  });

  const criarPortMutation = useMutation({
    mutationFn: async (portData) => {
      return base44.entities.Port.create(portData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      setShowNovoModal(false);
      toast.success('PORT criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar PORT');
    }
  });

  const devolverMutation = useMutation({
    mutationFn: async ({ portId, motivo }) => {
      const port = ports.find(p => p.id === portId);
      const user = await base44.auth.me();

      // Criar registro em Contas a Pagar
      const contaPagar = await base44.entities.ContaPagar.create({
        fornecedor_codigo: port.cliente_codigo,
        fornecedor_nome: port.cliente_nome,
        descricao: `Reembolso PORT #${port.numero_port} - ${port.cliente_nome}`,
        valor: port.saldo_disponivel,
        data_vencimento: new Date().toISOString().split('T')[0],
        status: 'pendente',
        observacao: `Devolução de sinal. Motivo: ${motivo}`
      });

      // Atualizar PORT
      await base44.entities.Port.update(portId, {
        status: 'devolvido',
        motivo_devolucao: motivo,
        pagamento_devolucao_id: contaPagar.id,
        data_devolucao: new Date().toISOString().split('T')[0]
      });

      return { port, contaPagar };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      setShowDevolverModal(false);
      setPortSelecionado(null);
      toast.success('PORT devolvido e conta a pagar criada!');
    },
    onError: () => {
      toast.error('Erro ao processar devolução');
    }
  });

  const filteredPorts = ports.filter(p =>
    p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.numero_port).includes(searchTerm) ||
    p.itens_port?.some(item => item.numero_pedido_manual?.includes(searchTerm))
  );

  const portsPorStatus = {
    aguardando_vinculo: filteredPorts.filter(p => p.status === 'aguardando_vinculo'),
    em_separacao: filteredPorts.filter(p => p.status === 'em_separacao'),
    aguardando_liquidacao: filteredPorts.filter(p => p.status === 'aguardando_liquidacao'),
    outros: filteredPorts.filter(p => ['parcialmente_usado', 'finalizado', 'devolvido'].includes(p.status))
  };

  return (
    <PermissionGuard setor="EntradaCaucao">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Gestão de Entradas e Caução</h1>
                <p className="text-slate-500 mt-1">Controle de sinais e pagamentos antecipados (PORTs)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PermissionGuard setor="EntradaCaucao" funcao="adicionar" showBlocked={false}>
                <Button onClick={() => setShowNovoModal(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Novo PORT
                </Button>
              </PermissionGuard>
              <Button variant="outline" size="icon" onClick={() => setViewMode('cards')} className={viewMode === 'cards' ? 'bg-slate-100' : ''}>
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setViewMode('lista')} className={viewMode === 'lista' ? 'bg-slate-100' : ''}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente, nº PORT ou nº pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs defaultValue="aguardando_vinculo" className="space-y-4">
            <TabsList>
              <TabsTrigger value="aguardando_vinculo">Aguardando Vínculo ({portsPorStatus.aguardando_vinculo.length})</TabsTrigger>
              <TabsTrigger value="em_separacao">Em Separação ({portsPorStatus.em_separacao.length})</TabsTrigger>
              <TabsTrigger value="aguardando_liquidacao">Aguard. Liquidação ({portsPorStatus.aguardando_liquidacao.length})</TabsTrigger>
              <TabsTrigger value="outros">Outros ({portsPorStatus.outros.length})</TabsTrigger>
            </TabsList>

            {Object.entries(portsPorStatus).map(([status, lista]) => (
              <TabsContent key={status} value={status}>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lista.length === 0 ? (
                      <p className="col-span-full text-center text-slate-500 py-8">Nenhum PORT nesta categoria</p>
                    ) : (
                      lista.map(port => (
                        <PortCard
                          key={port.id}
                          port={port}
                          onDetalhes={(p) => { setPortSelecionado(p); setShowDetalhesModal(true); }}
                          onDevolver={(p) => { setPortSelecionado(p); setShowDevolverModal(true); }}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">PORT</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">Cliente</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">Pedidos</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">Valor Sinal</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                            <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lista.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-500">Nenhum PORT</td></tr>
                          ) : (
                            lista.map(port => {
                              const config = statusConfig[port.status];
                              return (
                                <tr key={port.id} className="hover:bg-slate-50">
                                  <td className="p-4"><span className="font-bold">#{port.numero_port}</span></td>
                                  <td className="p-4">{port.cliente_nome}</td>
                                  <td className="p-4 text-sm text-slate-600">
                                    {port.itens_port?.map(i => i.numero_pedido_manual).join(', ') || '-'}
                                  </td>
                                  <td className="p-4 font-bold text-emerald-600">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(port.valor_total_sinal)}
                                  </td>
                                  <td className="p-4">
                                    <Badge className={config.color}>{config.label}</Badge>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" onClick={() => { setPortSelecionado(port); setShowDetalhesModal(true); }}>
                                        Ver
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Modal: Novo PORT */}
          <ModalContainer
            open={showNovoModal}
            onClose={() => setShowNovoModal(false)}
            title="Criar Novo PORT"
            description="Registre um sinal/caução recebido"
            size="lg"
          >
            <PortForm
              onSave={(data) => criarPortMutation.mutate(data)}
              onCancel={() => setShowNovoModal(false)}
            />
          </ModalContainer>

          {/* Modal: Detalhes */}
          <ModalContainer
            open={showDetalhesModal}
            onClose={() => { setShowDetalhesModal(false); setPortSelecionado(null); }}
            title="Detalhes do PORT"
            size="lg"
          >
            {portSelecionado && <PortDetalhes port={portSelecionado} />}
          </ModalContainer>

          {/* Modal: Devolver */}
          <ModalContainer
            open={showDevolverModal}
            onClose={() => { setShowDevolverModal(false); setPortSelecionado(null); }}
            title="Devolver Sinal"
            description="Esta ação criará um pagamento pendente no módulo Contas a Pagar"
            size="default"
          >
            {portSelecionado && (
              <DevolverForm
                port={portSelecionado}
                onConfirm={(motivo) => devolverMutation.mutate({ portId: portSelecionado.id, motivo })}
                onCancel={() => { setShowDevolverModal(false); setPortSelecionado(null); }}
                isLoading={devolverMutation.isPending}
              />
            )}
          </ModalContainer>
        </div>
      </div>
    </PermissionGuard>
  );
}

function DevolverForm({ port, onConfirm, onCancel, isLoading }) {
  const [motivo, setMotivo] = useState('');

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-slate-700">
          <strong>PORT #{port.numero_port}</strong> - {port.cliente_nome}
        </p>
        <p className="text-sm text-slate-600 mt-1">
          Saldo disponível: <strong className="text-emerald-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(port.saldo_disponivel)}
          </strong>
        </p>
      </Card>

      <div className="space-y-2">
        <Label>Motivo da Devolução *</Label>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex: Cliente desistiu da compra..."
          rows={4}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-slate-700">
          <FileText className="w-4 h-4 inline mr-1 text-blue-600" />
          Uma conta a pagar será criada automaticamente no módulo <strong>Pagamentos</strong> para reembolso.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={() => motivo && onConfirm(motivo)}
          disabled={!motivo || isLoading}
          className="bg-red-600 hover:bg-red-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            'Confirmar Devolução'
          )}
        </Button>
      </div>
    </div>
  );
}