import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, ShieldCheck, ChevronRight, Lock } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);

  // --- Navegação via React Router (Rápida e sem recarregar) ---
  const handleCliente = () => navigate('/PortalCliente');
  const handleAdmin = () => navigate('/Dashboard');
  const handleRepresentante = () => navigate('/PortalDoRepresentante');

  // --- Componente de Botão Otimizado ---
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
      {/* Efeito Hover Sutil e Leve */}
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
    // Container principal com cores para tema claro e escuro
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* --- FUNDO LEVE (CSS PURO - Sem animações pesadas) --- */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-black opacity-80" />
      {/* Luzes estáticas leves */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-400/10 blur-3xl dark:bg-yellow-600/10" />

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* ÁREA DAS LOGOS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-8 flex flex-col items-center"
        >
          {/* 1. Logo J&C VISION (Olho) */}
          {/* VERIFIQUE SE ESTA URL ESTÁ FUNCIONANDO. Se quebrar, gere um novo link público no Supabase */}
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/f70ce9703_image_113f55.png"
            alt="J&C Vision"
            className="w-32 md:w-40 h-auto mb-2 drop-shadow-md"
          />
          
          {/* 2. Logo J&C ESQUADRIAS (Brasão) */}
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/fa98a5f2b_LOGOJCFUNDOTRANSPARENTE-Copia.png"
            alt="J&C Esquadrias"
            className="w-40 md:w-48 h-auto mb-4 drop-shadow-md"
          />
          
          {/* Títulos */}
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            J&C Esquadrias
          </h1>
          
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium tracking-wide">
            Selecione seu perfil de acesso
          </p>
        </motion.div>

        {/* BOTÕES DE ACESSO */}
        <div className="w-full flex flex-col gap-2">
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
          <p className="text-slate-400 dark:text-slate-600 text-[10px] font-bold tracking-widest uppercase">
            Powered by J&C Vision &copy; {new Date().getFullYear()}
          </p>
        </motion.div>

      </div>
    </div>
  );
}