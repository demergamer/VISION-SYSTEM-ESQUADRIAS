import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion } from 'framer-motion';

export default function Welcome() {
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const handleKeyPress = () => {
      navigate(createPageUrl('Dashboard'));
    };

    const handleClick = () => {
      navigate(createPageUrl('Dashboard'));
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#1e3a5f] flex flex-col items-center justify-center p-6 cursor-pointer">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/fa98a5f2b_LOGOJCFUNDOTRANSPARENTE-Copia.png"
          alt="J&C Esquadrias"
          className="w-96 h-auto mx-auto mb-12 drop-shadow-2xl"
        />
        
        <motion.div
          animate={{ 
            scale: pulse ? [1, 1.05, 1] : 1,
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <h1 className="text-white text-3xl md:text-4xl font-bold tracking-wider">
            BEM-VINDO
          </h1>
          <p className="text-yellow-400 text-xl md:text-2xl mt-6 font-semibold animate-pulse">
            APERTE QUALQUER TECLA PARA ENTRAR
          </p>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 text-white/50 text-sm">
        Sistema de Gestão Financeira
      </div>
    </div>
  );
}