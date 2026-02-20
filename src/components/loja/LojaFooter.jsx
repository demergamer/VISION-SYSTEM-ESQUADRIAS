import React from 'react';
import { Phone, Mail, MapPin, Store, Instagram, Facebook, Globe } from 'lucide-react';

export default function LojaFooter({ config }) {
  const cnpj = config?.cnpj || '00.000.000/0001-00';
  const telefone = config?.telefone_whatsapp || '(11) 0000-0000';
  const nomeLoja = config?.nome_loja || 'Loja B2B/B2C';

  return (
    <footer className="bg-slate-900 text-white mt-12">
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Logo + Atendimento */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {config?.logo_url ? (
                <img src={config.logo_url} alt={nomeLoja} className="h-16 w-auto object-contain" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Store className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-lg leading-tight">{nomeLoja}</h3>
                    <p className="text-xs text-slate-400">Portas & Janelas</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Qualidade e durabilidade em cada produto. Atendemos construtoras, revendas e consumidores finais.
            </p>
            {/* Redes Sociais dinâmicas */}
            {(config?.link_instagram || config?.link_facebook || config?.link_site_institucional) && (
              <div className="flex items-center gap-3">
                {config?.link_instagram && (
                  <a href={config.link_instagram} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-slate-800 hover:bg-pink-600 flex items-center justify-center transition-colors">
                    <Instagram className="w-4 h-4 text-white" />
                  </a>
                )}
                {config?.link_facebook && (
                  <a href={config.link_facebook} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <Facebook className="w-4 h-4 text-white" />
                  </a>
                )}
                {config?.link_site_institucional && (
                  <a href={config.link_site_institucional} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-600 flex items-center justify-center transition-colors">
                    <Globe className="w-4 h-4 text-white" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Atendimento */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Atendimento</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{telefone}</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>contato@loja.com.br</span>
              </li>
              <li className="flex items-start gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Seg–Sex: 8h às 18h<br />Sáb: 8h às 12h</span>
              </li>
            </ul>
          </div>

          {/* Institucional */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Institucional</h4>
            <ul className="space-y-2.5">
              {['Quem Somos', 'Como Comprar', 'Tabela de Preços', 'Trabalhe Conosco', 'Blog'].map(item => (
                <li key={item}>
                  <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Políticas */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Políticas</h4>
            <ul className="space-y-2.5">
              {['Entrega e Prazos', 'Trocas e Devoluções', 'Garantia dos Produtos', 'Privacidade', 'Termos de Uso'].map(item => (
                <li key={item}>
                  <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Linha final */}
        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} {nomeLoja}. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-slate-500 text-xs">CNPJ: {cnpj}</span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-500 text-xs">Desenvolvido com ❤️</span>
          </div>
        </div>
      </div>
    </footer>
  );
}