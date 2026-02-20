import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

const banners = [
  {
    titulo: "🏠 Linha Suprema",
    subtitulo: "Portas e Janelas de Alto Padrão",
    descricao: "Qualidade premium com acabamento superior. Ideal para obras de alto padrão.",
    cta: "Ver Linha Suprema",
    bg: "from-blue-800 to-blue-600",
    badge: "DESTAQUE"
  },
  {
    titulo: "🚪 Linha Pop",
    subtitulo: "A melhor relação custo-benefício",
    descricao: "Durabilidade e estética para todos os projetos residenciais e comerciais.",
    cta: "Explorar Linha Pop",
    bg: "from-slate-800 to-slate-600",
    badge: "MAIS VENDIDO"
  },
  {
    titulo: "🎉 Frete Especial",
    subtitulo: "Condições exclusivas para revendas",
    descricao: "Consulte nossa tabela de revendas e construtoras. Preços diferenciados por volume.",
    cta: "Consultar Tabelas",
    bg: "from-emerald-800 to-emerald-600",
    badge: "PROMOÇÃO"
  }
];

export default function LojaHero() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, []);

  const banner = banners[idx];

  return (
    <div className={cn("relative w-full aspect-[3/1] md:aspect-[5/1] rounded-2xl overflow-hidden bg-gradient-to-r shadow-xl", banner.bg, "transition-all duration-500")}>
      {/* Conteúdo */}
      <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16">
        <span className="inline-block bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-full mb-3 w-fit tracking-widest">
          {banner.badge}
        </span>
        <h2 className="text-white text-2xl md:text-4xl font-extrabold leading-tight mb-1">{banner.titulo}</h2>
        <p className="text-white/90 text-sm md:text-lg font-semibold mb-1">{banner.subtitulo}</p>
        <p className="text-white/70 text-xs md:text-sm mb-5 max-w-md hidden md:block">{banner.descricao}</p>
        <button className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold px-6 py-2.5 rounded-xl text-sm w-fit transition-colors shadow-md">
          {banner.cta} →
        </button>
      </div>

      {/* Decoração */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 w-24 h-24 md:w-40 md:h-40 opacity-10 rounded-3xl bg-white rotate-12 hidden md:block" />
      <div className="absolute right-16 top-1/4 w-12 h-12 md:w-20 md:h-20 opacity-5 rounded-2xl bg-white -rotate-12 hidden md:block" />

      {/* Controles */}
      <button onClick={() => setIdx(i => (i - 1 + banners.length) % banners.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full p-2 transition-all">
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button onClick={() => setIdx(i => (i + 1) % banners.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full p-2 transition-all">
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={cn("h-2 rounded-full transition-all", i === idx ? "w-6 bg-white" : "w-2 bg-white/40")} />
        ))}
      </div>
    </div>
  );
}