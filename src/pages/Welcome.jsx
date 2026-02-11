import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, ChevronRight, ChevronLeft, Lock } from 'lucide-react';

// --- CONFIGURAÇÃO DAS EMPRESAS ---
const COMPANIES = [
  {
    id: 'jc',
    name: 'J&C Esquadrias',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/936ba5dbe_logo_JCEsquadrias.png',
    color: 'bg-yellow-500', // Cor de destaque (opcional)
  },
  {
    id: 'inovalum',
    name: 'Inovalum',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/386f33ec8_INOVALUMTRANSPARENTECOMBORDA.png',
    color: 'bg-blue-500',
    scale: 1.4 // Ajuste específico para esta logo
  },
  {
    id: 'oliver',
    name: 'Oliver Extrusora',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/6dba430e9_LOGOOLIVERTRANSPARENTECOMBORDA.png',
    color: 'bg-slate-700',
  }
];

export default function Welcome() {
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState(null); // null = visão geral, 'id' = selecionada

  // --- AÇÕES ---
  const handleCompanyClick = (companyId) => {
    if (selectedCompany === companyId) {
      // LÓGICA DO ADMIN: Se clicar na logo que JÁ está selecionada -> Vai para Admin
      navigate('/Dashboard');
    } else {
      // Seleciona a empresa e inicia a animação
      setSelectedCompany(companyId);
    }
  };

  const handleBack = () => {
    setSelectedCompany(null); // Volta para a visão geral
  };

  const handleCliente = () => navigate('/PortalCliente');
  const handleRepresentante = () => navigate('/PortalDoRepresentante');

  // --- COMPONENTE DE BOTÃO (Reutilizável) ---
  const AccessButton = ({ title, subtitle, icon: Icon, onClick, delay = 0 }) => (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group w-full max-w-sm flex items-center justify-between p-4 mb-3 
                 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm 
                 border border-slate-200 dark:border-slate-700 
                 rounded-xl shadow-lg hover:shadow-2xl hover:border-blue-500/50 
                 transition-all duration-300 relative overflow-hidden z-30"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3 bg-blue-100 dark:bg-slate-800 rounded-lg text-blue-700 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
          <Icon size={20} />
        </div>
        <div className="text-left">
          <h3 className="text-slate-800 dark:text-slate-100 font-bold text-lg leading-tight">{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" size={20} />
    </motion.button>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-6 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-all duration-500">
      
      {/* --- BACKGROUND ANIMADO --- */}
      <style>{`
        @keyframes floatBlue { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; } 50% { transform: translate(40%, 40%) scale(1.4); opacity: 0.8; } }
        @keyframes floatYellow { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; } 50% { transform: translate(-40%, -40%) scale(1.4); opacity: 0.8; } }
        .blob { position: absolute; border-radius: 50%; filter: blur(60px); mix-blend-mode: multiply; will-change: transform, opacity; }
        .dark .blob { mix-blend-mode: screen; opacity: 0.4 !important; }
        .anim-blue { animation: floatBlue 10s ease-in-out infinite; }
        .anim-yellow { animation: floatYellow 12s ease-in-out infinite reverse; }
      `}</style>
      <div className="absolute inset-0 z-0 bg-white dark:bg-slate-950" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob bg-cyan-500 w-[80%] h-[80%] -top-[20%] -left-[20%] anim-blue" />
        <div className="blob bg-yellow-400 w-[80%] h-[80%] -bottom-[20%] -right-[20%] anim-yellow" />
      </div>

      {/* --- HEADER FLUTUANTE (J&C VISION) --- */}
      {/* Se selectedCompany for null, fica no centro. Se tiver selecionado, vai para a esquerda. */}
      <motion.div 
        layout 
        className={`fixed z-40 flex items-center transition-all duration-500 ${selectedCompany ? 'top-6 left-6 flex-row gap-3' : 'top-[15%] flex-col gap-4'}`}
      >
        <motion.img 
          layoutId="main-logo"
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
          alt="J&C Vision"
          className={`object-contain drop-shadow-xl transition-all duration-500 ${selectedCompany ? 'h-12' : 'h-32'}`}
        />
        
        <motion.div layoutId="main-text" className="text-center md:text-left">
          <h1 className={`font-black tracking-tight text-slate-900 dark:text-white transition-all duration-500 ${selectedCompany ? 'text-xl' : 'text-4xl'}`}>
            <span className="text-blue-900 dark:text-blue-200">ONE</span> Vision
          </h1>
          {!selectedCompany && (
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-slate-600 dark:text-slate-300 text-sm font-semibold tracking-wide uppercase mt-2"
            >
              Selecione a empresa
            </motion.p>
          )}
        </motion.div>
      </motion.div>

      {/* --- BOTÃO VOLTAR (Só aparece quando selecionado) --- */}
      <AnimatePresence>
        {selectedCompany && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={handleBack}
            className="fixed top-6 right-6 z-50 p-2 bg-white/50 hover:bg-white rounded-full shadow-sm text-slate-600 transition-all"
          >
            <ChevronLeft size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* --- ÁREA CENTRAL (LOGOS DAS EMPRESAS) --- */}
      <div className={`relative z-10 w-full max-w-4xl flex flex-col items-center justify-center transition-all duration-700 ${selectedCompany ? 'mt-32' : 'mt-[35vh]'}`}>
        
        {/* CONTAINER DE LOGOS */}
        <motion.div 
          layout
          className={`flex items-center justify-center gap-4 transition-all duration-500 
            ${selectedCompany 
              ? 'flex-col' // Quando selecionado, alinha verticalmente (mas só vai sobrar uma)
              : 'flex-row bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-slate-700 shadow-2xl p-6 rounded-3xl' // Estilo cartão original
            }`}
        >
          <AnimatePresence mode='popLayout'>
            {COMPANIES.map((company, index) => {
              // LÓGICA DE EXIBIÇÃO:
              // Se nenhuma selecionada: Mostra todas.
              // Se uma selecionada: Mostra APENAS a selecionada.
              const isSelected = selectedCompany === company.id;
              const isHidden = selectedCompany && !isSelected;

              if (isHidden) return null;

              return (
                <motion.div
                  layoutId={`company-container-${company.id}`}
                  key={company.id}
                  onClick={() => handleCompanyClick(company.id)}
                  className={`relative flex items-center justify-center transition-all duration-500 cursor-pointer
                    ${isSelected ? 'p-0 mb-8 scale-110' : 'flex-1 hover:scale-105'}`
                  }
                >
                  {/* SEPARADOR (Só mostra se não tiver selecionado e não for o último) */}
                  {!selectedCompany && index < COMPANIES.length - 1 && (
                     <div className="absolute -right-2 h-12 w-px bg-slate-300 dark:bg-slate-600 pointer-events-none"></div>
                  )}

                  <motion.img 
                    layoutId={`company-logo-${company.id}`}
                    src={company.logo}
                    alt={company.name}
                    className={`object-contain transition-all duration-500 drop-shadow-md
                      ${isSelected ? 'h-32 md:h-40' : 'h-20 md:h-24'} 
                      ${company.id === 'inovalum' ? 'scale-[1.4]' : ''}
                    `}
                  />
                  
                  {/* Dica para o Admin (Aparece sutilmente quando selecionado) */}
                  {isSelected && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                      className="absolute -bottom-8 flex flex-col items-center"
                    >
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Empresa Selecionada</span>
                      <span className="text-[9px] text-slate-300">(Clique novamente para Admin)</span>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* --- BOTÕES DE ACESSO (Só aparecem quando selecionado) --- */}
        <AnimatePresence>
          {selectedCompany && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-sm flex flex-col gap-3 mt-4"
            >
              <AccessButton 
                title="Área do Cliente" 
                subtitle="Acompanhe pedidos e financeiro" 
                icon={User} 
                onClick={handleCliente} 
                delay={0.2}
              />
              <AccessButton 
                title="Portal do Representante" 
                subtitle="Gestão de vendas e carteira" 
                icon={Briefcase} 
                onClick={handleRepresentante} 
                delay={0.3}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* RODAPÉ */}
        <motion.div 
          layout
          className="fixed bottom-6 text-center"
        >
          <p className="text-slate-400 dark:text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase">
            Vision System &copy; {new Date().getFullYear()}
          </p>
        </motion.div>

      </div>
    </div>
  );
}