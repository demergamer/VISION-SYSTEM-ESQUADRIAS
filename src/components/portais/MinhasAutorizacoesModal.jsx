import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Clock, XCircle, CheckCircle, AlertTriangle, 
  FileText, Calendar, DollarSign, Edit, Eye, Loader2 
} from "lucide-react";
import { format } from "date-fns";
import ModalContainer from "@/components/modals/ModalContainer";
import NovaLiquidacaoRepresentante from "@/components/portais/NovaLiquidacaoRepresentante";
import { toast } from "sonner";

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function MinhasAutorizacoesModal({ 
  open, 
  onClose, 
  representanteLogado,
  pedidosAbertos 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCorrigirModal, setShowCorrigirModal] = useState(false);
  const [autorizacaoParaCorrigir, setAutorizacaoParaCorrigir] = useState(null);
  const [pedidosParaCorrigir, setPedidosParaCorrigir] = useState([]);

  const { data: autorizacoes = [], isLoading } = useQuery({
    queryKey: ['minhasAutorizacoes', representanteLogado?.codigo],
    queryFn: async () => {
      if (!representanteLogado?.codigo) return [];
      const todas = await base44.entities.LiquidacaoPendente.list();
      return todas.filter(a => 
        a?.solicitante_tipo === 'representante' &&
        pedidosAbertos.some(p => a?.pedidos_ids?.includes(p?.id))
      );
    },
    enabled: open && !!representanteLogado?.codigo
  });

  // Busca inteligente: filtrar por cliente, número de pedido ou ID da solicitação
  const autorizacoesFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return autorizacoes;
    
    const termo = searchTerm.toLowerCase();
    return autorizacoes.filter(auth => {
      // Buscar por nome do cliente
      if (auth?.cliente_nome?.toLowerCase().includes(termo)) return true;
      
      // Buscar por ID da solicitação
      if (String(auth?.numero_solicitacao)?.includes(termo)) return true;
      
      // Deep Search: buscar pelos números dos pedidos
      const pedidosDaAutorizacao = pedidosAbertos.filter(p => auth?.pedidos_ids?.includes(p?.id));
      return pedidosDaAutorizacao.some(pedido => 
        pedido?.numero_pedido?.toLowerCase().includes(termo)
      );
    });
  }, [autorizacoes, searchTerm, pedidosAbertos]);

  const aguardando = autorizacoesFiltradas.filter(a => a?.status === 'pendente');
  const recusados = autorizacoesFiltradas.filter(a => a?.status === 'rejeitado');
  const aceitos = autorizacoesFiltradas.filter(a => a?.status === 'aprovado');

  const handleCorrigir = (autorizacao) => {
    const pedidos = pedidosAbertos.filter(p => autorizacao?.pedidos_ids?.includes(p?.id));
    setPedidosParaCorrigir(pedidos);
    setAutorizacaoParaCorrigir(autorizacao);
    setShowCorrigirModal(true);
  };

  const renderCard = (autorizacao, tipo) => {
    const pedidosDaAutorizacao = pedidosAbertos.filter(p => autorizacao?.pedidos_ids?.includes(p?.id));
    const numeroPedidos = pedidosDaAutorizacao.map(p => p?.numero_pedido).join(', ');

    return (
      <Card key={autorizacao?.id} className="p-4 hover:shadow-lg transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-800">{autorizacao?.cliente_nome}</h3>
              <Badge variant="outline" className="text-xs">
                Sol. #{autorizacao?.numero_solicitacao}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 truncate">
              Pedidos: {numeroPedidos || 'N/A'}
            </p>
          </div>
          {tipo === 'aguardando' && (
            <Badge className="bg-amber-100 text-amber-700">
              <Clock className="w-3 h-3 mr-1" />
              Em Análise
            </Badge>
          )}
          {tipo === 'recusado' && (
            <Badge className="bg-red-100 text-red-700">
              <XCircle className="w-3 h-3 mr-1" />
              Recusado
            </Badge>
          )}
          {tipo === 'aceito' && (
            <Badge className="bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Aprovado
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-1">Valor Original</p>
            <p className="font-semibold text-slate-700">
              {formatCurrency(autorizacao?.valor_total_original)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Valor Proposto</p>
            <p className="font-bold text-blue-600">
              {formatCurrency(autorizacao?.valor_final_proposto)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-1">Data Envio</p>
            <p className="text-xs font-medium text-slate-600">
              {autorizacao?.created_date ? format(new Date(autorizacao.created_date), 'dd/MM/yyyy HH:mm') : '-'}
            </p>
          </div>
        </div>

        {tipo === 'recusado' && autorizacao?.motivo_rejeicao && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-700 mb-1">Motivo da Recusa:</p>
                <p className="text-xs text-red-600">{autorizacao.motivo_rejeicao}</p>
              </div>
            </div>
          </div>
        )}

        {tipo === 'aceito' && autorizacao?.data_aprovacao && (
          <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-700">
                Aprovado em {format(new Date(autorizacao.data_aprovacao), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {tipo === 'recusado' && (
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => handleCorrigir(autorizacao)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Corrigir e Reenviar
            </Button>
          )}
          {autorizacao?.comprovantes_urls?.[0] && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => window.open(autorizacao.comprovantes_urls[0], '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Comprovante
            </Button>
          )}
          {!autorizacao?.comprovantes_urls?.[0] && autorizacao?.comprovante_url && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => window.open(autorizacao.comprovante_url, '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Comprovante
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const EmptyState = ({ icon: Icon, title, message }) => (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <h3 className="font-semibold text-slate-600 mb-2">{title}</h3>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );

  return (
    <>
      <ModalContainer 
        open={open && !showCorrigirModal} 
        onClose={onClose}
        title="Minhas Autorizações de Liquidação"
        description="Acompanhe suas solicitações de pagamento"
        size="xl"
      >
        <div className="space-y-4">
          {/* BARRA DE BUSCA INTELIGENTE */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="🔍 Buscar por Cliente, Nº Pedido ou ID da Solicitação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-6 text-base border-2 focus:border-blue-400"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-slate-600">Carregando autorizações...</p>
            </div>
          ) : (
            <Tabs defaultValue="aguardando" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="aguardando" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Aguardando
                  {aguardando.length > 0 && (
                    <Badge className="ml-1 bg-amber-500 text-white">{aguardando.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="recusados" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  Recusados
                  {recusados.length > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white">{recusados.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="aceitos" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Aceitos
                  {aceitos.length > 0 && (
                    <Badge className="ml-1 bg-emerald-500 text-white">{aceitos.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="aguardando" className="space-y-3 max-h-[500px] overflow-y-auto mt-4">
                {aguardando.length > 0 ? (
                  aguardando.map(auth => renderCard(auth, 'aguardando'))
                ) : (
                  <EmptyState 
                    icon={Clock}
                    title="Nenhuma solicitação aguardando"
                    message="Suas liquidações aparecerão aqui após o envio"
                  />
                )}
              </TabsContent>

              <TabsContent value="recusados" className="space-y-3 max-h-[500px] overflow-y-auto mt-4">
                {recusados.length > 0 ? (
                  recusados.map(auth => renderCard(auth, 'recusado'))
                ) : (
                  <EmptyState 
                    icon={XCircle}
                    title="Nenhuma solicitação recusada"
                    message="Ótimo! Suas liquidações estão sendo aprovadas"
                  />
                )}
              </TabsContent>

              <TabsContent value="aceitos" className="space-y-3 max-h-[500px] overflow-y-auto mt-4">
                {aceitos.length > 0 ? (
                  aceitos.map(auth => renderCard(auth, 'aceito'))
                ) : (
                  <EmptyState 
                    icon={CheckCircle}
                    title="Nenhuma solicitação aprovada ainda"
                    message="Suas liquidações aprovadas aparecerão aqui"
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </ModalContainer>

      {/* MODAL DE CORREÇÃO */}
      {showCorrigirModal && autorizacaoParaCorrigir && (
        <NovaLiquidacaoRepresentante
          open={showCorrigirModal}
          onClose={() => {
            setShowCorrigirModal(false);
            setAutorizacaoParaCorrigir(null);
            setPedidosParaCorrigir([]);
          }}
          pedidosAbertos={pedidosParaCorrigir}
          representanteLogado={representanteLogado}
          modoCorrecao={true}
          autorizacaoOriginal={autorizacaoParaCorrigir}
        />
      )}
    </>
  );
}