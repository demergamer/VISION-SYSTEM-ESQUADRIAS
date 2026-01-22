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
import { FileText, Search, Plus, Grid3x3, List, Upload, CheckCircle, X, ArrowLeft, Loader2, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";

function OrcamentoCard({ orcamento, onAprovar, onCancelar }) {
  const corFundo = orcamento.tipo_origem === 'cliente' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';
  const corBadge = orcamento.tipo_origem === 'cliente' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';

  return (
    <Card className={cn("p-4 border-2", corFundo)}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-lg">#{orcamento.numero_sequencial}</span>
              <Badge className={corBadge}>{orcamento.tipo_origem === 'cliente' ? 'Cliente' : 'Representante'}</Badge>
            </div>
            <p className="font-semibold text-slate-800">{orcamento.cliente_nome}</p>
            <p className="text-sm text-slate-500">{orcamento.cliente_email}</p>
          </div>
        </div>
        {orcamento.descricao && (
          <p className="text-sm text-slate-600 line-clamp-2">{orcamento.descricao}</p>
        )}
        {orcamento.valor_estimado && (
          <p className="text-lg font-bold text-slate-700">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valor_estimado)}
          </p>
        )}
        {orcamento.sinal_comprovante_url && (
          <Badge variant="outline" className="text-green-600 border-green-300">Sinal Anexado</Badge>
        )}
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" className="flex-1" onClick={() => onAprovar(orcamento)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovar
          </Button>
          <Button size="sm" variant="outline" onClick={() => onCancelar(orcamento)} className="text-red-600">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ModalAprovar({ orcamento, onSave, onCancel }) {
  const [numeroPedido, setNumeroPedido] = useState('');

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Orçamento <strong>#{orcamento.numero_sequencial}</strong> de <strong>{orcamento.cliente_nome}</strong></p>
      <div className="space-y-2">
        <Label>Número do Pedido *</Label>
        <Input
          value={numeroPedido}
          onChange={(e) => setNumeroPedido(e.target.value)}
          placeholder="Ex: 60285"
          required
        />
        <p className="text-xs text-slate-500">Insira o número do pedido emitido no sistema</p>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => numeroPedido && onSave(numeroPedido)} disabled={!numeroPedido}>
          Confirmar Aprovação
        </Button>
      </div>
    </div>
  );
}

export default function Orcamentos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState(null);

  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: () => base44.entities.Orcamento.list('-numero_sequencial')
  });

  const aprovarMutation = useMutation({
    mutationFn: async ({ id, numeroPedido }) => {
      const user = await base44.auth.me();
      return base44.entities.Orcamento.update(id, {
        status: 'em_producao',
        numero_pedido: numeroPedido,
        data_aprovacao: new Date().toISOString().split('T')[0],
        aprovado_por: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      setShowAprovarModal(false);
      setOrcamentoSelecionado(null);
      toast.success('Orçamento aprovado!');
    }
  });

  const cancelarMutation = useMutation({
    mutationFn: (id) => base44.entities.Orcamento.update(id, { status: 'cancelado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Orçamento cancelado');
    }
  });

  const filteredOrcamentos = orcamentos.filter(o =>
    o.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.cliente_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(o.numero_sequencial).includes(searchTerm)
  );

  const orcamentosPorStatus = {
    enviado: filteredOrcamentos.filter(o => o.status === 'enviado'),
    em_producao: filteredOrcamentos.filter(o => o.status === 'em_producao'),
    ticagem: filteredOrcamentos.filter(o => o.status === 'ticagem'),
    cancelado: filteredOrcamentos.filter(o => o.status === 'cancelado')
  };

  return (
    <PermissionGuard setor="Orcamentos">
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
                <h1 className="text-3xl font-bold text-slate-800">Orçamentos</h1>
                <p className="text-slate-500 mt-1">Gestão de orçamentos e aprovações</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              placeholder="Buscar por nome, email ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs defaultValue="enviado" className="space-y-4">
            <TabsList>
              <TabsTrigger value="enviado">Enviados ({orcamentosPorStatus.enviado.length})</TabsTrigger>
              <TabsTrigger value="em_producao">Em Produção ({orcamentosPorStatus.em_producao.length})</TabsTrigger>
              <TabsTrigger value="ticagem">Ticagem ({orcamentosPorStatus.ticagem.length})</TabsTrigger>
              <TabsTrigger value="cancelado">Cancelados ({orcamentosPorStatus.cancelado.length})</TabsTrigger>
            </TabsList>

            {Object.entries(orcamentosPorStatus).map(([status, lista]) => (
              <TabsContent key={status} value={status}>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lista.length === 0 ? (
                      <p className="col-span-full text-center text-slate-500 py-8">Nenhum orçamento nesta categoria</p>
                    ) : (
                      lista.map(orc => (
                        <OrcamentoCard
                          key={orc.id}
                          orcamento={orc}
                          onAprovar={(o) => { setOrcamentoSelecionado(o); setShowAprovarModal(true); }}
                          onCancelar={(o) => cancelarMutation.mutate(o.id)}
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
                            <th className="text-left p-4 text-sm font-medium text-slate-600">#</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">Cliente</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">Email</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">Origem</th>
                            <th className="text-left p-4 text-sm font-medium text-slate-600">Valor</th>
                            <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lista.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-500">Nenhum orçamento</td></tr>
                          ) : (
                            lista.map(orc => (
                              <tr key={orc.id} className="hover:bg-slate-50">
                                <td className="p-4"><span className="font-bold">#{orc.numero_sequencial}</span></td>
                                <td className="p-4">{orc.cliente_nome}</td>
                                <td className="p-4"><span className="text-sm text-slate-600">{orc.cliente_email}</span></td>
                                <td className="p-4">
                                  <Badge className={orc.tipo_origem === 'cliente' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}>
                                    {orc.tipo_origem === 'cliente' ? 'Cliente' : 'Rep'}
                                  </Badge>
                                </td>
                                <td className="p-4">{orc.valor_estimado ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orc.valor_estimado) : '-'}</td>
                                <td className="p-4">
                                  <div className="flex justify-end gap-2">
                                    {status === 'enviado' && (
                                      <Button size="sm" onClick={() => { setOrcamentoSelecionado(orc); setShowAprovarModal(true); }}>Aprovar</Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <ModalContainer open={showAprovarModal} onClose={() => { setShowAprovarModal(false); setOrcamentoSelecionado(null); }} title="Aprovar Orçamento" description="Insira o número do pedido emitido">
            {orcamentoSelecionado && (
              <ModalAprovar
                orcamento={orcamentoSelecionado}
                onSave={(numPedido) => aprovarMutation.mutate({ id: orcamentoSelecionado.id, numeroPedido: numPedido })}
                onCancel={() => { setShowAprovarModal(false); setOrcamentoSelecionado(null); }}
              />
            )}
          </ModalContainer>
        </div>
      </div>
    </PermissionGuard>
  );
}