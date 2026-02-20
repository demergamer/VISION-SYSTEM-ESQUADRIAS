import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MessageCircle, Wrench } from 'lucide-react';

export default function LojaManutencao({ telefone }) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(createPageUrl('Welcome'));
    }, 30000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const numero = (telefone || '').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/55${numero}?text=Olá! Gostaria de mais informações sobre a loja.`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Fundo com blur */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

      {/* Card central */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-md mx-4 p-8 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Wrench className="w-8 h-8 text-orange-500" />
        </div>

        <h2 className="text-xl font-extrabold text-slate-800 mb-3">Loja em Manutenção</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Infelizmente essa loja está fechada para manutenções e logo estará ativa novamente.
          Para mais informações, entre em contato.
        </p>

        {numero && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-md mb-4"
          >
            <MessageCircle className="w-5 h-5" />
            Falar no WhatsApp
          </a>
        )}

        <p className="text-xs text-slate-400 mt-4">
          Você será redirecionado automaticamente em 30 segundos.
        </p>
      </div>
    </div>
  );
}