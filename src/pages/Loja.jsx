import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, ShoppingCart, Package, Loader2, Store } from "lucide-react";
import ClienteSelectorBar from "@/components/loja/ClienteSelectorBar";
import ProdutoLojaCard from "@/components/loja/ProdutoLojaCard";
import ProdutoDetalheModal from "@/components/loja/ProdutoDetalheModal";
import CarrinhoDrawer from "@/components/loja/CarrinhoDrawer";

const CAT_LABELS = { Porta: "Porta", Janela: "Janela", Servico: "Serviço", Reembalar: "Reembalar", Acessorio: "Acessório" };

// Determina tabela de preço baseado no tipo de cliente
function getTabelaPreco(cliente) {
  if (!cliente) return null;
  // Heurística: tem_st ou não tem código → consumidor
  // Pode ser adaptado conforme regra de negócio
  if (cliente.tipo_preco) return cliente.tipo_preco; // campo explícito se existir
  if (cliente.permite_cobranca_posterior === 'sim') return 'preco_construtora';
  return 'preco_consumidor';
}

export default function Loja() {
  const [user, setUser] = useState(null);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [produtoDetalhe, setProdutoDetalhe] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [showCarrinho, setShowCarrinho] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Se cliente, buscar cadastro
      if (u?.role === 'cliente' || u?.role === 'representante_cliente') {
        // usuário é o próprio cliente, tabela consumidor
        setClienteSelecionado({ nome: u.full_name, email: u.email, _tabela: 'preco_consumidor' });
      }
    }).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';
  const isRepresentante = user?.role === 'representante';
  const isRepresentanteOuAdmin = isAdmin || isRepresentante;

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ['produtos_loja'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true })
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_loja'],
    queryFn: () => base44.entities.Cliente.list(),
    enabled: isRepresentanteOuAdmin
  });

  const tabelaPreco = clienteSelecionado?._tabela || getTabelaPreco(clienteSelecionado);

  const categorias = useMemo(() => {
    const cats = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
    return cats;
  }, [produtos]);

  const filteredProdutos = useMemo(() =>
    produtos.filter(p => {
      const nome = (p.nome_base || p.nome || '').toLowerCase();
      const matchSearch = nome.includes(searchTerm.toLowerCase());
      const matchCat = categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro;
      return matchSearch && matchCat;
    }),
    [produtos, searchTerm, categoriaFiltro]
  );

  const handleSelectCliente = (cliente) => {
    if (!cliente) { setClienteSelecionado(null); return; }
    // Determinar tabela de preço automaticamente
    const tabela = getTabelaPreco(cliente);
    setClienteSelecionado({ ...cliente, _tabela: tabela });
  };

  const handleAddCarrinho = (item) => {
    setCarrinho(prev => [...prev, item]);
  };

  const handleRemoveCarrinho = (idx) => {
    setCarrinho(prev => prev.filter((_, i) => i !== idx));
  };

  const totalItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top Header ── */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">Loja B2B/B2C</h1>
              <p className="text-[10px] text-slate-400">Catálogo de produtos</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="relative gap-2"
            onClick={() => setShowCarrinho(true)}
          >
            <ShoppingCart className="w-4 h-4" />
            Orçamento
            {totalItens > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-blue-600 border-0 text-white rounded-full">
                {totalItens}
              </Badge>
            )}
          </Button>
        </div>

        {/* ── Seletor de Cliente ── */}
        <ClienteSelectorBar
          clientes={clientes}
          clienteSelecionado={clienteSelecionado}
          onSelect={handleSelectCliente}
          tabelaPreco={tabelaPreco}
          isRepresentanteOuAdmin={isRepresentanteOuAdmin}
        />
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 py-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['Todas', ...categorias].map(cat => (
              <button key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  categoriaFiltro === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}>
                {cat === 'Todas' ? 'Todos' : CAT_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid de Produtos ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-5 py-6">
        {loadingProdutos ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredProdutos.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="w-16 h-16 text-slate-200 mb-4" />
            <p className="font-medium text-slate-500">Nenhum produto encontrado</p>
          </Card>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-4">{filteredProdutos.length} produto(s) encontrado(s)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProdutos.map(produto => (
                <ProdutoLojaCard
                  key={produto.id}
                  produto={produto}
                  tabelaPreco={tabelaPreco}
                  clienteSelecionado={clienteSelecionado}
                  onClick={setProdutoDetalhe}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modais ── */}
      <ProdutoDetalheModal
        open={!!produtoDetalhe}
        onClose={() => setProdutoDetalhe(null)}
        produto={produtoDetalhe}
        tabelaPreco={tabelaPreco || 'preco_consumidor'}
        onAddCarrinho={handleAddCarrinho}
      />

      <CarrinhoDrawer
        open={showCarrinho}
        onClose={() => setShowCarrinho(false)}
        itens={carrinho}
        onRemove={handleRemoveCarrinho}
        onLimpar={() => setCarrinho([])}
      />
    </div>
  );
}