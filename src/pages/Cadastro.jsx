import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Grid3x3, List, ArrowLeft, FileText, CheckCircle, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import jsPDF from 'jspdf';

function SolicitacaoCard({ solicitacao, onAprovar, onRejeitar, onImprimir }) {
  const corBadge = solicitacao.solicitante_tipo === 'cliente' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-800">{solicitacao.nome}</h3>
            <p className="text-sm text-slate-500">{solicitacao.email}</p>
            <p className="text-sm text-slate-600 mt-1">{solicitacao.telefone}</p>
          </div>
          <Badge className={corBadge}>
            {solicitacao.solicitante_tipo === 'cliente' ? 'Site/Direto' : 'Portal Rep'}
          </Badge>
        </div>
        {solicitacao.cnpj && (
          <p className="text-sm text-slate-600">CNPJ: {solicitacao.cnpj}</p>
        )}
        {solicitacao.regiao && (
          <p className="text-sm text-slate-600">Região: {solicitacao.regiao}</p>
        )}
        {solicitacao.observacao && (
          <p className="text-sm text-slate-500 italic">{solicitacao.observacao}</p>
        )}
        <div className="flex gap-2 pt-3 border-t">
          <Button size="sm" variant="outline" onClick={() => onImprimir(solicitacao)} className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button size="sm" onClick={() => onAprovar(solicitacao)} className="flex-1 bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovar
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRejeitar(solicitacao)} className="text-red-600 hover:bg-red-50">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ModalAprovar({ solicitacao, onSave, onCancel }) {
  const [codigoCliente, setCodigoCliente] = useState('');

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Aprovar cadastro de <strong>{solicitacao.nome}</strong>
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <p className="text-sm text-blue-800"><strong>Email:</strong> {solicitacao.email}</p>
        <p className="text-sm text-blue-800"><strong>Telefone:</strong> {solicitacao.telefone}</p>
        {solicitacao.cnpj && <p className="text-sm text-blue-800"><strong>CNPJ:</strong> {solicitacao.cnpj}</p>}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Código do Cliente *</label>
        <Input
          value={codigoCliente}
          onChange={(e) => setCodigoCliente(e.target.value)}
          placeholder="Ex: CLI001"
          required
        />
        <p className="text-xs text-slate-500">
          Um convite de acesso será enviado para o email cadastrado
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => codigoCliente && onSave(codigoCliente)} disabled={!codigoCliente} className="bg-green-600 hover:bg-green-700">
          Confirmar Aprovação
        </Button>
      </div>
    </div>
  );
}

export default function Cadastro() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoesCadastro'],
    queryFn: () => base44.entities.SolicitacaoCadastroCliente.list('-created_date')
  });

  const { data: representantes = [] } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list()
  });

  const aprovarMutation = useMutation({
    mutationFn: async ({ id, codigoCliente, solicitacao }) => {
      const user = await base44.auth.me();
      
      // Determinar representante
      let repCodigo = 'JEC001';
      let repNome = 'J&C Esquadrias';
      
      if (solicitacao.solicitante_tipo === 'representante' && solicitacao.representante_solicitante_codigo) {
        const rep = representantes.find(r => r.codigo === solicitacao.representante_solicitante_codigo);
        if (rep) {
          repCodigo = rep.codigo;
          repNome = rep.nome;
        }
      }

      // Criar cliente
      await base44.entities.Cliente.create({
        codigo: codigoCliente,
        nome: solicitacao.nome,
        email: solicitacao.email,
        telefone: solicitacao.telefone,
        cnpj: solicitacao.cnpj,
        regiao: solicitacao.regiao,
        representante_codigo: repCodigo,
        representante_nome: repNome
      });

      // Enviar convite
      await base44.users.inviteUser(solicitacao.email, 'user');

      // Atualizar solicitação
      return base44.entities.SolicitacaoCadastroCliente.update(id, {
        status: 'aprovado',
        aprovado_por: user.email,
        data_aprovacao: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoesCadastro'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowAprovarModal(false);
      setSolicitacaoSelecionada(null);
      toast.success('Solicitação aprovada e convite enviado!');
    },
    onError: () => toast.error('Erro ao aprovar solicitação')
  });

  const rejeitarMutation = useMutation({
    mutationFn: (id) => base44.entities.SolicitacaoCadastroCliente.update(id, { status: 'rejeitado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoesCadastro'] });
      setShowRejectDialog(false);
      setSolicitacaoSelecionada(null);
      toast.success('Solicitação rejeitada');
    }
  });

  const handleImprimir = (solicitacao) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Ficha de Cadastro - Cliente', 20, 20);

    doc.setFontSize(12);
    doc.text(`Nome: ${solicitacao.nome}`, 20, 40);
    doc.text(`Email: ${solicitacao.email}`, 20, 50);
    doc.text(`Telefone: ${solicitacao.telefone}`, 20, 60);
    
    if (solicitacao.cnpj) doc.text(`CNPJ: ${solicitacao.cnpj}`, 20, 70);
    if (solicitacao.regiao) doc.text(`Região: ${solicitacao.regiao}`, 20, 80);
    if (solicitacao.observacao) {
      doc.text(`Observações:`, 20, 90);
      const obs = doc.splitTextToSize(solicitacao.observacao, 170);
      doc.text(obs, 20, 100);
    }

    doc.save(`Ficha_${solicitacao.nome.replace(/\s/g, '_')}.pdf`);
  };

  const filteredSolicitacoes = solicitacoes.filter(s =>
    s.status === 'pendente' && (
      s.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <PermissionGuard setor="SolicitacaoCadastro">
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
                <h1 className="text-3xl font-bold text-slate-800">Solicitações de Cadastro</h1>
                <p className="text-slate-500 mt-1">Gerencie prospects e novos clientes</p>
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
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <p className="col-span-full text-center text-slate-500 py-8">Carregando...</p>
              ) : filteredSolicitacoes.length === 0 ? (
                <p className="col-span-full text-center text-slate-500 py-8">Nenhuma solicitação pendente</p>
              ) : (
                filteredSolicitacoes.map(sol => (
                  <SolicitacaoCard
                    key={sol.id}
                    solicitacao={sol}
                    onAprovar={(s) => { setSolicitacaoSelecionada(s); setShowAprovarModal(true); }}
                    onRejeitar={(s) => { setSolicitacaoSelecionada(s); setShowRejectDialog(true); }}
                    onImprimir={handleImprimir}
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
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Nome</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Telefone</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Origem</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-500">Carregando...</td></tr>
                    ) : filteredSolicitacoes.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-500">Nenhuma solicitação pendente</td></tr>
                    ) : (
                      filteredSolicitacoes.map(sol => (
                        <tr key={sol.id} className="hover:bg-slate-50">
                          <td className="p-4"><span className="font-semibold">{sol.nome}</span></td>
                          <td className="p-4"><span className="text-sm text-slate-600">{sol.email}</span></td>
                          <td className="p-4"><span className="text-sm">{sol.telefone}</span></td>
                          <td className="p-4">
                            <Badge className={sol.solicitante_tipo === 'cliente' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                              {sol.solicitante_tipo === 'cliente' ? 'Direto' : 'Rep'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleImprimir(sol)}>
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button size="sm" onClick={() => { setSolicitacaoSelecionada(sol); setShowAprovarModal(true); }} className="bg-green-600 hover:bg-green-700">
                                Aprovar
                              </Button>
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

          <ModalContainer open={showAprovarModal} onClose={() => { setShowAprovarModal(false); setSolicitacaoSelecionada(null); }} title="Aprovar Cadastro" description="Insira o código do cliente">
            {solicitacaoSelecionada && (
              <ModalAprovar
                solicitacao={solicitacaoSelecionada}
                onSave={(codigo) => aprovarMutation.mutate({ id: solicitacaoSelecionada.id, codigoCliente: codigo, solicitacao: solicitacaoSelecionada })}
                onCancel={() => { setShowAprovarModal(false); setSolicitacaoSelecionada(null); }}
              />
            )}
          </ModalContainer>

          <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rejeitar Solicitação</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja rejeitar a solicitação de <strong>{solicitacaoSelecionada?.nome}</strong>?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSolicitacaoSelecionada(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => rejeitarMutation.mutate(solicitacaoSelecionada.id)} className="bg-red-600 hover:bg-red-700">
                  Rejeitar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </PermissionGuard>
  );
}