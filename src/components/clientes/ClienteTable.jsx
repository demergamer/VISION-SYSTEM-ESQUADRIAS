import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Edit, 
  Eye, 
  ShoppingCart, 
  Mail, 
  Copy, 
  MoreHorizontal,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Building2,
  Factory
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/hooks/usePermissions";
import { toast } from "sonner";

export default function ClienteTable({ 
  clientes, 
  stats,
  onEdit, 
  onView,
  onViewPedidos,
  onInvite,
  isLoading 
}) {
  const { canDo } = usePermissions();
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getInitials = (name) => {
    if (!name) return "CL";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-red-100 text-red-700",
      "bg-orange-100 text-orange-700",
      "bg-amber-100 text-amber-700",
      "bg-green-100 text-green-700",
      "bg-emerald-100 text-emerald-700",
      "bg-teal-100 text-teal-700",
      "bg-cyan-100 text-cyan-700",
      "bg-blue-100 text-blue-700",
      "bg-indigo-100 text-indigo-700",
      "bg-violet-100 text-violet-700",
      "bg-purple-100 text-purple-700",
      "bg-fuchsia-100 text-fuchsia-700",
      "bg-pink-100 text-pink-700",
      "bg-rose-100 text-rose-700",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const copyToClipboard = (e, text) => {
    e.stopPropagation(); // Impede que abra o modal ao clicar em copiar
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const getScoreColor = (score) => {
    const s = parseInt(score) || 0;
    if (s >= 800) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (s >= 500) return "text-blue-600 bg-blue-50 border-blue-200";
    if (s >= 300) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 text-sm">Carregando clientes...</p>
      </div>
    );
  }

  if (!clientes || clientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
        <Building2 className="w-12 h-12 text-slate-300" />
        <p className="font-medium">Nenhum cliente encontrado</p>
        <p className="text-sm">Tente ajustar os filtros ou cadastre um novo cliente.</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader className="bg-slate-50/80">
          <TableRow className="hover:bg-slate-50/80">
            <TableHead className="w-[300px] font-semibold text-slate-700">Cliente / Empresa</TableHead>
            <TableHead className="font-semibold text-slate-700">Contato & Representante</TableHead>
            <TableHead className="font-semibold text-slate-700">Financeiro (Resumo)</TableHead>
            <TableHead className="font-semibold text-slate-700 text-center">Score</TableHead>
            <TableHead className="font-semibold text-slate-700 text-center">Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cli) => {
            const cliStats = stats[cli.codigo] || {
              totalPedidosAbertos: 0,
              totalChequesVencer: 0,
              bloqueadoAuto: false,
              compras30k: false,
              ativo: false
            };

            const isBloqueado = cli.bloqueado_manual || cliStats.bloqueadoAuto;

            // --- LÓGICA DE EVENTOS DE ROW ---
            const handleRowClick = (e) => {
                // Se foi um texto selecionado, não dispara
                if (window.getSelection().toString().length > 0) return;
                onView(cli);
            };

            const handleRowDoubleClick = (e) => {
                // Impede a propagação para evitar conflito com single click (embora react dispare ambos)
                e.preventDefault(); 
                if (canDo('Clientes', 'editar')) {
                    onEdit(cli);
                } else {
                    toast.error("Você não tem permissão para editar clientes.");
                }
            };

            const handleContextMenu = (e) => {
                e.preventDefault(); // Impede menu do navegador
                onViewPedidos(cli); // Abre pedidos
                toast.info(`Abrindo pedidos de ${cli.nome}...`, { duration: 1500 });
            };

            return (
              <TableRow 
                key={cli.id} 
                className="group hover:bg-blue-50/30 transition-colors cursor-pointer select-none"
                onClick={handleRowClick}
                onDoubleClick={handleRowDoubleClick}
                onContextMenu={handleContextMenu}
                title="Clique: Detalhes | 2x: Editar | Botão Direito: Pedidos"
              >
                
                {/* COLUNA 1: IDENTIDADE */}
                <TableCell className="align-top py-4">
                  <div className="flex items-start gap-3">
                    <Avatar className={cn("h-10 w-10 border border-slate-100 shadow-sm", getAvatarColor(cli.nome))}>
                      <AvatarFallback className="font-bold text-xs">{getInitials(cli.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 line-clamp-1" title={cli.nome}>{cli.nome}</span>
                        {cli.tem_st && (
                          <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-slate-100 text-slate-500 border-slate-200" title="Possui ST">ST</Badge>
                        )}
                      </div>
                      
                      {(cli.nome_fantasia && cli.nome_fantasia !== cli.nome) && (
                        <span className="text-xs text-slate-500 line-clamp-1">{cli.nome_fantasia}</span>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                            variant="outline" 
                            className="font-mono text-[10px] px-1.5 py-0 h-4 bg-slate-50 text-slate-500 border-slate-200 group-hover:border-blue-200 transition-colors cursor-copy hover:bg-slate-200" 
                            onClick={(e) => copyToClipboard(e, cli.codigo)} 
                            title="Clique para copiar código"
                        >
                          {cli.codigo}
                        </Badge>
                        {cli.cnpj && (
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
                            {cli.cnpj}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* COLUNA 2: CONTATO & REPRESENTANTE */}
                <TableCell className="align-top py-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="font-medium text-slate-700">{cli.regiao || 'Região N/D'}</span>
                      {cli.cidade && <span className="text-slate-400">• {cli.cidade}/{cli.estado}</span>}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 font-normal px-2 py-0.5 h-5">
                        Rep: {cli.representante_nome?.split(' ')[0] || cli.representante_codigo || '-'}
                      </Badge>
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-1 rounded">
                        {cli.porcentagem_comissao}%
                      </span>
                    </div>

                    {cli.telefone && (
                      <div className="text-xs text-slate-500 pl-1">
                        {cli.telefone}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* COLUNA 3: FINANCEIRO COMPACTO */}
                <TableCell className="align-top py-4">
                  <div className="flex flex-col gap-1.5">
                    
                    <div className="flex justify-between items-center text-xs w-full max-w-[180px]">
                      <span className="text-slate-500">Limite:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(cli.limite_credito)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs w-full max-w-[180px]">
                      <span className="text-slate-500">Aberto:</span>
                      <span className={cn("font-semibold", cliStats.totalPedidosAbertos > 0 ? "text-amber-600" : "text-slate-400")}>
                        {formatCurrency(cliStats.totalPedidosAbertos)}
                      </span>
                    </div>

                    {cliStats.totalChequesVencer > 0 && (
                      <div className="flex justify-between items-center text-xs w-full max-w-[180px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                        <span className="text-purple-600">Cheques:</span>
                        <span className="font-bold text-purple-700">{formatCurrency(cliStats.totalChequesVencer)}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* COLUNA 4: SCORE */}
                <TableCell className="align-top py-4 text-center">
                   {cli.score ? (
                     <Badge variant="outline" className={cn("font-mono font-bold", getScoreColor(cli.score))}>
                       {cli.score}
                     </Badge>
                   ) : (
                     <span className="text-xs text-slate-300">-</span>
                   )}
                   <div className="text-[10px] text-slate-400 mt-1">
                     {cli.data_consulta ? 'Consultado' : 'Sem consulta'}
                   </div>
                </TableCell>

                {/* COLUNA 5: STATUS */}
                <TableCell className="align-top py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="outline" className={cn(
                      "text-[10px] px-2 h-5 border shadow-sm",
                      isBloqueado 
                        ? "bg-red-50 text-red-600 border-red-200" 
                        : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    )}>
                      {isBloqueado ? 'BLOQUEADO' : 'LIBERADO'}
                    </Badge>

                    {cliStats.compras30k && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-purple-50 text-purple-600 border-purple-100 border">
                        <TrendingUp className="w-2.5 h-2.5 mr-1" />
                        VIP 30k
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* COLUNA 6: AÇÕES (MENU) */}
                <TableCell className="align-middle text-right pr-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 focus:bg-slate-100">
                        <span className="sr-only">Menu</span>
                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {canDo('Clientes', 'visualizar') && (
                        <DropdownMenuItem onClick={() => onView(cli)}>
                          <Eye className="mr-2 h-4 w-4 text-slate-500" /> Detalhes (1 Clique)
                        </DropdownMenuItem>
                      )}
                      
                      {canDo('Clientes', 'editar') && (
                        <DropdownMenuItem onClick={() => onEdit(cli)}>
                          <Edit className="mr-2 h-4 w-4 text-slate-500" /> Editar (2 Cliques)
                        </DropdownMenuItem>
                      )}

                      {canDo('Clientes', 'visualizar') && (
                        <DropdownMenuItem onClick={() => onViewPedidos(cli)}>
                          <ShoppingCart className="mr-2 h-4 w-4 text-slate-500" /> Ver Pedidos (Btn Direito)
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      {canDo('Clientes', 'adicionar') && (
                        <DropdownMenuItem 
                          onClick={() => onInvite(cli)} 
                          disabled={!cli.email}
                          className={!cli.email ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <Mail className="mr-2 h-4 w-4 text-slate-500" /> 
                          {cli.email ? 'Reenviar Convite' : 'Sem Email'}
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem onClick={(e) => copyToClipboard(e, cli.cnpj || cli.codigo)}>
                        <Copy className="mr-2 h-4 w-4 text-slate-500" /> Copiar CNPJ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}