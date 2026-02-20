import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Package, Loader2, Store, SlidersHorizontal, X } from "lucide-react";
import ProdutoDetalheModal from "@/components/loja/ProdutoDetalheModal";
import CarrinhoDrawer from "@/components/loja/CarrinhoDrawer";
import LojaHeader from "@/components/loja/LojaHeader.jsx";
import LojaSidebar from "@/components/loja/LojaSidebar.jsx";
import ProdutoLojaCard from "@/components/loja/ProdutoLojaCard";

function getTabelaPreco(cliente) {
  if (!cliente) return null;
  if (cliente.tipo_preco) return cliente.tipo_preco;
  if (cliente.permite_cobranca_posterior === 'sim') return 'preco_construtora';
  return 'preco_consumidor';
}

export default function Loja() {
  const [user, setUser] = useState(null);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [linhaFiltro, setLinhaFiltro] = useState('');
  const [produtoDetalhe, setProdutoDetalhe] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role === 'cliente' || u?.role === 'representante_cliente') {
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

  const categorias = useMemo(() => [...new Set(produtos.map(p => p.categoria).filter(Boolean))], [produtos]);
  const linhas = useMemo(() => [...new Set(produtos.map(p => p.linha_produto).filter(v => v && v !== '—'))], [produtos]);

  const filteredProdutos = useMemo(() =>
    produtos.filter(p => {
      const nome = (p.nome_base || p.nome || '').toLowerCase();
      const skus = (p.variacoes || []).map(v => (v.sku || '').toLowerCase());
      const matchSearch = !searchTerm || nome.includes(searchTerm.toLowerCase()) || skus.some(s => s.includes(searchTerm.toLowerCase()));
      const matchCat = !categoriaFiltro || p.categoria === categoriaFiltro;
      const matchLinha = !linhaFiltro || p.linha_produto === linhaFiltro;
      return matchSearch && matchCat && matchLinha;
    }),
    [produtos, searchTerm, categoriaFiltro, linhaFiltro]
  );

  const handleSelectCliente = (cliente) => {
    if (!cliente) { setClienteSelecionado(null); return; }
    setClienteSelecionado({ ...cliente, _tabela: getTabelaPreco(cliente) });
  };

  const handleAddCarrinho = (item) => setCarrinho(prev => [...prev, item]);
  const handleRemoveCarrinho = (idx) => setCarrinho(prev => prev.filter((_, i) => i !== idx));
  const totalItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0);

  const hasFilters = !!categoriaFiltro || !!linhaFiltro;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── HEADER ── */}
      <LojaHeader
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        clientes={clientes}
        clienteSelecionado={clienteSelecionado}
        onSelectCliente={handleSelectCliente}
        tabelaPreco={tabelaPreco}
        isRepresentanteOuAdmin={isRepresentanteOuAdmin}
        totalItens={totalItens}
        onOpenCarrinho={() => setShowCarrinho(true)}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />

      {/* ── BODY (sidebar + grid) ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex gap-6">

        {/* ── SIDEBAR DESKTOP ── */}
        <aside className="hidden lg:block w-60 shrink-0">
          <LojaSidebar
            categorias={categorias}
            linhas={linhas}
            categoriaFiltro={categoriaFiltro}
            linhaFiltro={linhaFiltro}
            onCategoria={setCategoriaFiltro}
            onLinha={setLinhaFiltro}
          />
        </aside>

        {/* ── SIDEBAR MOBILE (offcanvas) ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-slate-800">Filtros</span>
                <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <LojaSidebar
                categorias={categorias}
                linhas={linhas}
                categoriaFiltro={categoriaFiltro}
                linhaFiltro={linhaFiltro}
                onCategoria={v => { setCategoriaFiltro(v); setSidebarOpen(false); }}
                onLinha={v => { setLinhaFiltro(v); setSidebarOpen(false); }}
              />
            </div>
          </div>
        )}

        {/* ── GRID PRINCIPAL ── */}
        <div className="flex-1 min-w-0">
          {/* Barra de resultado */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-slate-500">
              {loadingProdutos ? 'Carregando...' : `${filteredProdutos.length} produto(s) encontrado(s)`}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setCategoriaFiltro(''); setLinhaFiltro(''); }}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>

          {loadingProdutos ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
          ) : filteredProdutos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 text-center">
              <Package className="w-20 h-20 text-slate-200 mb-4" />
              <p className="font-semibold text-slate-500 text-lg">Nenhum produto encontrado</p>
              <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
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
          )}
        </div>
      </div>

      {/* ── MODAIS ── */}
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