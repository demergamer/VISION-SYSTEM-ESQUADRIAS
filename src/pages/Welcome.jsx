import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';

// --- CONFIGURAÇÃO DAS EMPRESAS ---
const COMPANIES = [
  {
    id: 'jc',
    name: 'J&C Esquadrias',
    desc: 'Portas e Janelas',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/936ba5dbe_logo_JCEsquadrias.png',
  },
  {
    id: 'inovalum',
    name: 'Inovalum',
    desc: 'Perfis e Acessórios',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/386f33ec8_INOVALUMTRANSPARENTECOMBORDA.png',
    scale: 1.4 
  },
  {
    id: 'oliver',
    name: 'Oliver Extrusora',
    desc: 'Perfis',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/6dba430e9_LOGOOLIVERTRANSPARENTECOMBORDA.png',
  }
];

export default function Welcome() {
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState(null); 

  // --- AÇÕES ---
  const handleCompanyClick = (companyId) => {
    if (selectedCompany === companyId) {
      navigate('/Dashboard'); // Admin access
    } else {
      setSelectedCompany(companyId);
    }
  };

  const handleBack = () => setSelectedCompany(null);
  const handleCliente = () => navigate('/PortalCliente');
  const handleRepresentante = () => navigate('/PortalDoRepresentante');

  // --- COMPONENTE DE BOTÃO ---
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
                 bg-white/95 backdrop-blur-sm 
                 border border-slate-300
                 rounded-xl shadow-lg hover:shadow-2xl hover:border-blue-500/50 
                 transition-all duration-300 relative overflow-hidden z-30"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3 bg-slate-800 rounded-lg text-white group-hover:bg-blue-600 transition-colors duration-300">
          <Icon size={20} />
        </div>
        <div className="text-left">
          <h3 className="text-slate-800 font-bold text-lg leading-tight">{title}</h3>
          <p className="text-slate-500 text-xs font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="text-slate-400 group-hover:text-blue-600 transition-colors" size={20} />
    </motion.button>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-6 relative overflow-hidden transition-all duration-500">
      
      {/* --- FUNDO CINZA CHUMBO / CIMENTO QUEIMADO --- */}
      {/* Usando um gradiente sutil de cinza escuro para simular a textura e profundidade */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900" />
      
      {/* (Opcional) Uma leve textura de ruído ou luz para não ficar "chapado" demais */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-40 pointer-events-none"></div>

      {/* --- HEADER FLUTUANTE (LOGO CUBO) --- */}
      <motion.div 
        layout 
        className={`fixed z-40 flex items-center transition-all duration-500 ${selectedCompany ? 'top-6 left-6 flex-row gap-3' : 'top-[5%] flex-col gap-4'}`}
      >
        <motion.img 
          layoutId="main-logo"
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
          alt="J&C Vision"
          className={`object-contain drop-shadow-2xl transition-all duration-500 ${selectedCompany ? 'h-12' : 'h-28 mb-2'}`}
        />
        
        {/* Quando selecionado, o Título vai para o header */}
        {selectedCompany && (
           <motion.div layoutId="main-text" className="text-left">
             <h1 className="font-black tracking-tight text-white text-xl drop-shadow-md">
               <span className="text-blue-200">ONE</span> Vision
             </h1>
           </motion.div>
        )}
      </motion.div>

      {/* --- BOTÃO VOLTAR --- */}
      <AnimatePresence>
        {selectedCompany && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={handleBack}
            className="fixed top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full shadow-sm transition-all border border-white/20"
          >
            <ChevronLeft size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* --- ÁREA CENTRAL (CONTAINER BRANCO) --- */}
      <div className={`relative z-10 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-700 ${selectedCompany ? 'mt-32' : 'mt-[25vh]'}`}>
        
        {/* CARTÃO BRANCO PRINCIPAL */}
        <motion.div 
          layout
          className={`flex items-center justify-center transition-all duration-500 
            ${selectedCompany 
              ? 'flex-col bg-transparent' 
              : 'flex-col bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl p-10 rounded-[2.5rem]' 
            }`}
        >
          
          {/* 1. TÍTULO E SUBTÍTULO */}
          {!selectedCompany && (
             <motion.div 
                layoutId="main-text" 
                className="text-center mb-10 w-full border-b border-slate-200/60 pb-6"
             >
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 drop-shadow-sm mb-2">
                  <span className="text-blue-900">ONE</span> Vision
                </h1>
                
                {/* SUBTÍTULO GRANDE E EM NEGRITO */}
                <motion.p 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-slate-700 text-lg md:text-xl font-extrabold tracking-wide uppercase mt-3"
                >
                  SELECIONE A EMPRESA PARA ACESSAR
                </motion.p>
             </motion.div>
          )}

          {/* 2. LOGOS DAS EMPRESAS */}
          <div className="flex items-start justify-center gap-6 md:gap-12">
            <AnimatePresence mode='popLayout'>
              {COMPANIES.map((company) => {
                const isSelected = selectedCompany === company.id;
                const isHidden = selectedCompany && !isSelected;

                if (isHidden) return null;

                return (
                  <motion.div
                    layoutId={`company-container-${company.id}`}
                    key={company.id}
                    onClick={() => handleCompanyClick(company.id)}
                    className={`relative flex flex-col items-center justify-center transition-all duration-500 cursor-pointer group
                      ${isSelected ? 'p-0 mb-8 scale-110' : 'flex-1 hover:scale-105'}`
                    }
                  >
                    {/* LOGO DA EMPRESA */}
                    <motion.img 
                      layoutId={`company-logo-${company.id}`}
                      src={company.logo}
                      alt={company.name}
                      className={`object-contain transition-transform duration-500 drop-shadow-md
                        ${isSelected ? 'h-32 md:h-40 filter drop-shadow-2xl' : 'h-20 md:h-24'} 
                        ${company.id === 'inovalum' ? 'scale-[1.4]' : ''}
                      `}
                    />
                    
                    {/* DESCRIÇÃO (Aparece embaixo da logo) */}
                    {!selectedCompany && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            className="mt-6 text-center"
                        >
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                {company.desc}
                            </p>
                        </motion.div>
                    )}

                    {/* Dica para o Admin (Só aparece quando selecionado) */}
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                        className="absolute -bottom-10 flex flex-col items-center whitespace-nowrap"
                      >
                        <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Empresa Selecionada</span>
                        <span className="text-[9px] text-white/40">(Clique novamente para Admin)</span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

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
          <p className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase opacity-60">
            Vision System &copy; {new Date().getFullYear()}
          </p>
        </motion.div>

      </div>
    </div>
  );
}