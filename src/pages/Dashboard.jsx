import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  Wallet, 
  FileText, 
  BarChart3, 
  Briefcase, 
  Banknote, 
  ScrollText, 
  CreditCard,
  Settings,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from "@/components/UserNotRegisteredError";

export default function Dashboard() {
  const { user } = useAuth();
  const { canDo } = usePermissions();

  // Saudação baseada no horário
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Estrutura dos Módulos (Cores e Ícones definidos aqui)
  const menuGroups = [
    {
      title: "Cadastros Gerais",
      color: "bg-blue-600",
      lightColor: "bg-blue-50 text-blue-700",
      items: [
        { name: "Clientes", label: "Clientes", icon: Users, desc: "Gestão de carteira" },
        { name: "Produtos", label: "Produtos", icon: Package, desc: "Catálogo e estoque" },
        { name: "Fornecedores", label: "Fornecedores", icon: Briefcase, desc: "Parceiros e compras" },
        { name: "Representantes", label: "Representantes", icon: Users, desc: "Equipe de vendas" },
        { name: "Usuarios", label: "Usuários", icon: ShieldCheck, desc: "Acesso ao sistema" },
      ]
    },
    {
      title: "Vendas & Comercial",
      color: "bg-amber-500",
      lightColor: "bg-amber-50 text-amber-700",
      items: [
        { name: "Pedidos", label: "Pedidos de Venda", icon: ShoppingCart, desc: "Emissão e acompanhamento" },
        { name: "Orcamentos", label: "Orçamentos", icon: FileText, desc: "Propostas comerciais" },
        { name: "Comissoes", label: "Comissões", icon: Banknote, desc: "Pagamento de representantes" },
      ]
    },
    {
      title: "Financeiro",
      color: "bg-emerald-600",
      lightColor: "bg-emerald-50 text-emerald-700",
      items: [
        { name: "CaixaDiario", label: "Caixa Diário", icon: Wallet, desc: "Movimentação do dia" },
        { name: "Pagamentos", label: "Contas a Pagar", icon: Banknote, desc: "Despesas e boletos" },
        { name: "Cheques", label: "Controle de Cheques", icon: ScrollText, desc: "Custódia e compensação" },
        { name: "Creditos", label: "Créditos", icon: CreditCard, desc: "Haveres de clientes" },
        { name: "EntradaCaucao", label: "Entrada/Caução", icon: Wallet, desc: "Adiantamentos" },
        { name: "Balanco", label: "Balanço", icon: BarChart3, desc: "Resumo contábil" },
      ]
    },
    {
      title: "Gestão & Sistema",
      color: "bg-slate-600",
      lightColor: "bg-slate-50 text-slate-700",
      items: [
        { name: "Relatorios", label: "Relatórios & Dashboards", icon: BarChart3, desc: "Análise de dados" },
        { name: "Logs", label: "Auditoria", icon: ScrollText, desc: "Histórico de ações" },
        { name: "FormasPagamento", label: "Formas Pagto.", icon: CreditCard, desc: "Configuração financeira" },
      ]
    }
  ];

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-1 pb-6 border-b border-slate-100">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          {getGreeting()}, <span className="text-blue-600">{user?.displayName?.split(' ')[0] || 'Usuário'}</span>
        </h1>
        <p className="text-slate-500 text-lg">Selecione um módulo para começar a trabalhar.</p>
      </div>

      {/* Grid de Módulos */}
      <div className="space-y-12">
        {menuGroups.map((group, idx) => {
          // Filtra itens permitidos
          const allowedItems = group.items.filter(item => canDo(item.name, 'visualizar') || item.name === 'Relatorios'); // Relatórios liberado ou conforme regra

          if (allowedItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-6 rounded-full ${group.color}`}></div>
                <h2 className="text-xl font-bold text-slate-700">{group.title}</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {allowedItems.map((item) => (
                  <Link key={item.name} to={`/${item.name}`} className="group h-full">
                    <Card className="h-full border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 group-hover:-translate-y-1 overflow-hidden">
                      <CardHeader className="p-5 pb-2">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${group.lightColor} group-hover:bg-white group-hover:shadow-sm`}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                          {item.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                          {item.desc}
                        </p>
                        <div className="flex items-center text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                          Acessar <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}