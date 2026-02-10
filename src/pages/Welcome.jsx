import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, ShieldCheck, ChevronRight, Lock } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);

  // --- Lógica de Navegação (CORRIGIDA) ---
  // Agora usa o roteamento interno do React, muito mais rápido
  
  const handleCliente = () => {
    navigate('/PortalCliente');
  };

  const handleAdmin = () => {
    navigate('/Dashboard');
  };

  const handleRepresentante = () => {
    navigate('/PortalDoRepresentante');
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
                 rounded-2xl shadow-lg transition-all duration-300 relative z-20"
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 overflow-hidden">
      
      {/* --- EFEITO VAGALUME INTENSO (Nebulosa) --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{
            scale: [0.5, 4, 0.5], // Cresce muito (invade a tela) e diminui
            opacity: [0, 0.7, 0], // Vai do PRETO TOTAL (0) ao AZUL (0.7) e volta ao PRETO
          }}
          transition={{
            duration: 10, // Bem lento (10 segundos o ciclo)
            repeat: Infinity,
            ease: "easeInOut", // Suavidade na ida e na volta
          }}
          className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-blue-700 rounded-full blur-[120px]"
        />
      </div>

      {/* Camada de Blur para suavizar tudo */}
      <div className="absolute inset-0 backdrop-blur-3xl z-0 pointer-events-none" />

      {/* --- CONTEÚDO DA PÁGINA --- */}
      
      {/* Logo e Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center z-10 mb-8 relative"
      >
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/d0ec91d59_Gemini_Generated_Image_9b7i6p9b7i6p9b7i.png"
          alt="J&C Vision"
          className="w-48 md:w-64 h-auto mx-auto mb-4 drop-shadow-2xl"
        />
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/936ba5dbe_logo_JCEsquadrias.png"
          alt="J&C Esquadrias"
          className="w-40 md:w-48 h-auto mx-auto mb-6 drop-shadow-2xl"
        />
        
        <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-lg">
          <span className="text-yellow-400">J&C</span> <span className="text-white/90">Esquadrias</span>
        </h1>
        
        <p className="text-white/60 text-sm mt-2 font-light tracking-wide">
          Selecione seu perfil de acesso
        </p>
      </motion.div>

      {/* Botões */}
      <div className="w-full flex flex-col items-center z-10 gap-1 relative">
        
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
        className="absolute bottom-8 text-white/30 text-xs font-light tracking-widest uppercase z-10"
      >
        Segurança J&C System
      </motion.div>

      {/* Notificação (Mantida caso precise) */}
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