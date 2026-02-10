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
      
      {/* --- FUNDO LEVE (Estático para performance) --- */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-black opacity-80" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-400/10 blur-3xl dark:bg-yellow-600/10" />

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* CABEÇALHO (LOGOS + TEXTO) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full flex flex-col items-center justify-center mb-10"
        >
          {/* CONTAINER DAS LOGOS LADO A LADO */}
          {/* Ajustei para alinhar pelo centro vertical e horizontal do container */}
          <div className="flex items-center justify-center gap-8 mb-6 w-full">
            
            {/* Logo 1: Vision (Ajustado pela altura h-24 para equilibrar) */}
            <div className="flex items-center justify-center">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
                 alt="J&C Vision"
                 className="h-24 md:h-28 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
               />
            </div>

            {/* Separador Vertical Fino e Centralizado */}
            <div className="h-16 w-[1px] bg-slate-300 dark:bg-slate-700 opacity-60 rounded-full"></div>
            
            {/* Logo 2: Esquadrias (Ajustado pela altura h-20, pois ela é mais larga) */}
            <div className="flex items-center justify-center">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/fa98a5f2b_LOGOJCFUNDOTRANSPARENTE-Copia.png"
                 alt="J&C Esquadrias"
                 className="h-20 md:h-24 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
               />
            </div>
          </div>
          
          {/* TÍTULO CENTRALIZADO */}
          <div className="text-center space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              <span className="text-blue-900 dark:text-blue-100">J&C</span> Vision
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-wide">
              Selecione seu perfil de acesso
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
          className="mt-12 text-center"
        >
          <p className="text-slate-400 dark:text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase">
            Vision System &copy; {new Date().getFullYear()}
          </p>
        </motion.div>

      </div>

      {/* NOTIFICAÇÃO FLUTUANTE */}
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