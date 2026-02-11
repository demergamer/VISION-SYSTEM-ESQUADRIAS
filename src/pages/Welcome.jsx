import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, ShieldCheck, ChevronRight, Lock } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);

  // --- Navegação ---
  const handleCliente = () => navigate('/PortalCliente');
  const handleAdmin = () => navigate('/Dashboard');
  const handleRepresentante = () => navigate('/PortalDoRepresentante');

  // --- Botão Otimizado ---
  const AccessButton = ({ title, subtitle, icon: Icon, onClick, delay }) => (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group w-full max-w-sm flex items-center justify-between p-4 mb-3 
                 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md 
                 border border-slate-200 dark:border-slate-700/50 
                 rounded-xl shadow-sm hover:shadow-md hover:border-yellow-400/50 
                 transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* --- FUNDO LEVE --- */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-black opacity-80" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-400/10 blur-3xl dark:bg-yellow-600/10" />

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* ÁREA DAS LOGOS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full flex flex-col items-center justify-center mb-8"
        >
          {/* 1. LOGO PRINCIPAL (SISTEMA) NO TOPO */}
          <div className="mb-6 relative z-20">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
              alt="J&C Vision"
              className="h-28 md:h-32 w-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* 2. CONTAINER DAS 3 EMPRESAS (LADO A LADO) */}
          {/* Este container cria um "grupo" visual */}
          <div className="flex items-center justify-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm w-full max-w-[95%]">
            
            {/* Logo J&C Esquadrias */}
            <div className="flex-1 flex justify-center items-center">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/936ba5dbe_logo_JCEsquadrias.png"
                 alt="J&C Esquadrias"
                 className="h-12 md:h-14 w-auto object-contain hover:scale-110 transition-transform duration-300"
                 title="J&C Esquadrias"
               />
            </div>

            {/* Separador Vertical */}
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 opacity-50"></div>
            
            {/* Logo Inovalum (Azul e Cinza) - CENTRO */}
            <div className="flex-1 flex justify-center items-center">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/386f33ec8_INOVALUMTRANSPARENTECOMBORDA.png"
                 alt="Inovalum"
                 className="h-10 md:h-12 w-auto object-contain hover:scale-110 transition-transform duration-300"
                 title="Inovalum"
               />
            </div>

            {/* Separador Vertical */}
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 opacity-50"></div>

            {/* Logo Oliver Extrusora */}
            <div className="flex-1 flex justify-center items-center">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/6dba430e9_LOGOOLIVERTRANSPARENTECOMBORDA.png"
                 alt="Oliver Extrusora"
                 className="h-12 md:h-14 w-auto object-contain hover:scale-110 transition-transform duration-300"
                 title="Oliver Extrusora"
               />
            </div>
          </div>
          
          {/* TÍTULO E SUBTÍTULO */}
          <div className="text-center mt-6 space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              <span className="text-blue-900 dark:text-blue-100">ONE</span> Vision
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium tracking-wide">
              Gestão Integrada | Selecione seu acesso
            </p>
          </div>
        </motion.div>

        {/* BOTÕES DE ACESSO */}
        <div className="w-full flex flex-col gap-3">
          <AccessButton 
            title="Área do Cliente" 
            subtitle="Acompanhe seus pedidos e entregas" 
            icon={User} 
            onClick={handleCliente} 
            delay={0.1}
          />

          <AccessButton 
            title="Portal do Representante" 
            subtitle="Gestão de carteira e vendas" 
            icon={Briefcase} 
            onClick={handleRepresentante} 
            delay={0.2}
          />

          <AccessButton 
            title="Acesso Administrativo" 
            subtitle="Controle financeiro e produção" 
            icon={ShieldCheck} 
            onClick={handleAdmin} 
            delay={0.3}
          />
        </div>

        {/* RODAPÉ */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.8 }}
          className="mt-10 text-center"
        >
          <p className="text-slate-400 dark:text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase">
            Vision System &copy; {new Date().getFullYear()}
          </p>
        </motion.div>

      </div>

      {/* NOTIFICAÇÃO (MANTIDA) */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-10 bg-slate-800 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl z-50 border border-slate-700"
          >
            <Lock size={16} className="text-yellow-400" />
            <span className="text-sm font-medium">Acesso restrito.</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}