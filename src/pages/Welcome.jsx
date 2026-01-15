import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, ShieldCheck, ChevronRight, Lock } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);

  // --- Lógica de Navegação ---
  
  const handleCliente = () => {
    // Redireciona para o Portal do Cliente
    // Se for rota interna: navigate('/PortalCliente')
    // Se for link completo: window.location.href = '...'
    window.location.href = 'https://gestor-financeiro-pro-8984498a.base44.app/PortalCliente';
  };

  const handleAdmin = () => {
    // Redireciona para o Dashboard
    window.location.href = 'https://gestor-financeiro-pro-8984498a.base44.app/Dashboard';
  };

  const handleRepresentante = () => {
    // Exibe notificação de "Em breve"
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  // --- Componente de Botão Premium ---
  const AppleButton = ({ title, subtitle, icon: Icon, onClick, delay }) => (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay }}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group w-full max-w-sm flex items-center justify-between p-4 mb-3 
                 bg-white/10 backdrop-blur-xl border border-white/10 
                 rounded-2xl shadow-lg transition-all duration-300"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/10 rounded-full text-white group-hover:bg-white group-hover:text-black transition-colors duration-300">
          <Icon size={20} />
        </div>
        <div className="text-left">
          <h3 className="text-white font-semibold text-lg leading-tight">{title}</h3>
          <p className="text-white/50 text-xs font-medium tracking-wide">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="text-white/30 group-hover:text-white transition-colors" size={20} />
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decorativo (Glow estilo Apple) */}
      <div className="absolute top-[-20%] left-1/2 transform -translate-x-1/2 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Logo e Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center z-10 mb-12"
      >
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/fa98a5f2b_LOGOJCFUNDOTRANSPARENTE-Copia.png"
          alt="J&C Esquadrias"
          className="w-48 md:w-64 h-auto mx-auto mb-6 drop-shadow-2xl"
        />
        <h1 className="text-white text-2xl font-medium tracking-tight">
          J&C <span className="text-gray-500">Esquadrias</span>
        </h1>
        <p className="text-white/40 text-sm mt-2 font-light">
          Selecione seu perfil de acesso
        </p>
      </motion.div>

      {/* Botões */}
      <div className="w-full flex flex-col items-center z-10 gap-1">
        
        <AppleButton 
          title="Cliente" 
          subtitle="Área de pedidos e entregas" 
          icon={User} 
          onClick={handleCliente} 
          delay={0.2}
        />

        <AppleButton 
          title="Representante" 
          subtitle="Acesso restrito a vendas" 
          icon={Briefcase} 
          onClick={handleRepresentante} 
          delay={0.3}
        />

        <AppleButton 
          title="Administrador" 
          subtitle="Gestão e controle financeiro" 
          icon={ShieldCheck} 
          onClick={handleAdmin} 
          delay={0.4}
        />

      </div>

      {/* Rodapé Premium */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-white/20 text-xs font-light tracking-widest uppercase"
      >
        Segurança J&C System
      </motion.div>

      {/* Notificação Flutuante (Toast) para Representante */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 bg-white/20 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl z-50"
          >
            <Lock size={16} />
            <span className="text-sm font-medium">Módulo em desenvolvimento</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}