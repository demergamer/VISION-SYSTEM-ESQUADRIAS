import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from "lucide-react";
import ProdutoDetalheModal from "@/components/loja/ProdutoDetalheModal";
import CarrinhoDrawer from "@/components/loja/CarrinhoDrawer";
import LojaHeader from "@/components/loja/LojaHeader";
import LojaSidebar from "@/components/loja/LojaSidebar";
import ProdutoLojaCard from "@/components/loja/ProdutoLojaCard";
import LojaHero from "@/components/loja/LojaHero";
import LojaFooter from "@/components/loja/LojaFooter";
import CategoriasBar from "@/components/loja/CategoriasBar";

function getTabelaPreco(cliente) {
  if (!cliente) return null;
  if (cliente.tipo_preco) return cliente.tipo_preco;
  if (cliente.permite_cobranca_posterior === 'sim') return 'preco_construtora';
  return 'preco_consumidor';
}

export default function LojaJC() {
  const [user, setUser] = useState(null);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [linhaFiltro, setLinhaFiltro] = useState('');
  const [precoMin, setPrecoMin] = useState('');
  const [precoMax, setPrecoMax] = useState('');
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

  const { data: produtos = [], isLoading } = useQuery({
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

  const filteredProdutos = useMemo(() => {
    return produtos.filter(p => {
      const nome = (p.nome_base || p.nome || '').toLowerCase();
      const skus = (p.variacoes || []).map(v => (v.sku || '').toLowerCase());
      const matchSearch = !searchTerm || nome.includes(searchTerm.toLowerCase()) || skus.some(s => s.includes(searchTerm.toLowerCase()));
      const matchCat = !categoriaFiltro || p.categoria === categoriaFiltro;
      const matchLinha = !linhaFiltro || p.linha_produto === linhaFiltro;

      let matchPreco = true;
      if (tabelaPreco && (precoMin || precoMax)) {
        const variacoes = p.variacoes || [];
        const precos = variacoes.map(v => parseFloat(v[tabelaPreco]) || 0).filter(x => x > 0);
        if (precos.length > 0) {
          const menor = Math.min(...precos);
          if (precoMin && menor < parseFloat(precoMin)) matchPreco = false;
          if (precoMax && menor > parseFloat(precoMax)) matchPreco = false;
        }
      }

      return matchSearch && matchCat && matchLinha && matchPreco;
    });
  }, [produtos, searchTerm, categoriaFiltro, linhaFiltro, precoMin, precoMax, tabelaPreco]);

  const handleSelectCliente = (cliente) => {
    if (!cliente) { setClienteSelecionado(null); return; }
    setClienteSelecionado({ ...cliente, _tabela: getTabelaPreco(cliente) });
  };

  const handleAddCarrinho = (item) => setCarrinho(prev => [...prev, item]);
  const handleRemoveCarrinho = (idx) => setCarrinho(prev => prev.filter((_, i) => i !== idx));
  const totalItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* MEGA HEADER */}
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

      {/* BARRA DE CATEGORIAS */}
      <CategoriasBar
        categorias={categorias}
        linhas={linhas}
        categoriaFiltro={categoriaFiltro}
        onCategoria={setCategoriaFiltro}
      />

      {/* HERO BANNER */}
      <div className="max-w-[1400px] mx-auto w-full px-4 mt-6">
        <LojaHero />
      </div>

      {/* CORPO PRINCIPAL */}
      <div className="max-w-[1400px] mx-auto w-full px-4 py-6 flex gap-6 flex-1">

        {/* SIDEBAR DESKTOP */}
        <aside className="hidden lg:block w-64 shrink-0">
          <LojaSidebar
            categorias={categorias}
            linhas={linhas}
            categoriaFiltro={categoriaFiltro}
            linhaFiltro={linhaFiltro}
            precoMin={precoMin}
            precoMax={precoMax}
            onCategoria={setCategoriaFiltro}
            onLinha={setLinhaFiltro}
            onPrecoMin={setPrecoMin}
            onPrecoMax={setPrecoMax}
          />
        </aside>

        {/* SIDEBAR MOBILE */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-bold text-slate-800 text-lg">Filtros</span>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-4">
                <LojaSidebar
                  categorias={categorias}
                  linhas={linhas}
                  categoriaFiltro={categoriaFiltro}
                  linhaFiltro={linhaFiltro}
                  precoMin={precoMin}
                  precoMax={precoMax}
                  onCategoria={v => { setCategoriaFiltro(v); setSidebarOpen(false); }}
                  onLinha={v => { setLinhaFiltro(v); setSidebarOpen(false); }}
                  onPrecoMin={setPrecoMin}
                  onPrecoMax={setPrecoMax}
                />
              </div>
            </div>
          </div>
        )}

        {/* VITRINE */}
        <div className="flex-1 min-w-0">
          {/* Título + contador */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {categoriaFiltro ? `${categoriaFiltro}s` : 'Produtos em Destaque'}
              </h2>
              {!isLoading && (
                <p className="text-sm text-slate-500 mt-0.5">{filteredProdutos.length} resultado(s) encontrado(s)</p>
              )}
            </div>
            {(categoriaFiltro || linhaFiltro || precoMin || precoMax) && (
              <button
                onClick={() => { setCategoriaFiltro(''); setLinhaFiltro(''); setPrecoMin(''); setPrecoMax(''); }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-48">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            </div>
          ) : filteredProdutos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 text-center bg-white rounded-xl border border-slate-100">
              <div className="text-6xl mb-4">🔍</div>
              <p className="font-bold text-slate-700 text-xl">Nenhum produto encontrado</p>
              <p className="text-slate-400 mt-2 text-sm">Tente ajustar os filtros ou buscar por outro termo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

      {/* FOOTER */}
      <LojaFooter />

      {/* MODAIS */}
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