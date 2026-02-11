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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* --- CSS: ANIMAÇÕES ALEATÓRIAS E MISTURA --- */}
      <style>{`
        /* Movimento A: Lento e Amplo */
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(30px, -30px) scale(1.1); opacity: 0.8; }
        }
        /* Movimento B: Médio e Lateral */
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0) scale(1.1); opacity: 0.5; }
          50% { transform: translate(-20px, 40px) scale(1); opacity: 0.7; }
        }
        /* Movimento C: Respiração Profunda */
        @keyframes floatC {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.9; }
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px); /* Menos blur para mais nitidez */
          mix-blend-mode: multiply; /* EFEITO MISTURA DE TINTAS (No branco) */
          will-change: transform, opacity;
        }
        
        /* Ajuste para modo escuro (Multiply some no preto, Screen soma luz) */
        .dark .blob {
          mix-blend-mode: screen; 
          opacity: 0.4 !important; /* Mais suave no escuro para não ofuscar */
        }

        .anim-a { animation: floatA 8s ease-in-out infinite; }
        .anim-b { animation: floatB 10s ease-in-out infinite reverse; }
        .anim-c { animation: floatC 7s ease-in-out infinite; }
      `}</style>

      {/* --- FUNDO BASE --- */}
      <div className="absolute inset-0 z-0 bg-white dark:bg-slate-950" />
      
      {/* --- BOLAS COLORIDAS (Tintas) --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        
        {/* 1. AZUL (Canto Superior Esquerdo) */}
        <div className="blob bg-blue-500 w-[60%] h-[60%] -top-[10%] -left-[10%] anim-a" />
        
        {/* 2. ÂMBAR (Canto Inferior Direito) */}
        <div className="blob bg-amber-500 w-[60%] h-[60%] -bottom-[10%] -right-[10%] anim-b" />

        {/* 3. VERDE (Canto Inferior Esquerdo) - Novo */}
        <div className="blob bg-emerald-500 w-[50%] h-[50%] bottom-[5%] -left-[15%] anim-c" style={{ animationDelay: '1s' }} />

        {/* 4. LARANJA (Canto Superior Direito) - Novo */}
        <div className="blob bg-orange-500 w-[50%] h-[50%] -top-[5%] -right-[15%] anim-a" style={{ animationDelay: '4s' }} />

      </div>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* ÁREA DAS LOGOS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full flex flex-col items-center justify-center mb-10"
        >
          {/* LOGO PRINCIPAL */}
          <div className="mb-8 relative z-20 drop-shadow-2xl">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/358a3c910_Gemini_Generated_Image_9b7i6p9b7i6p9b7i-removebg-preview.png"
              alt="J&C Vision"
              className="h-32 md:h-36 w-auto object-contain hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* CONTAINER DAS 3 EMPRESAS */}
          <div className="flex items-center justify-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-slate-700 shadow-2xl p-6 rounded-3xl w-full z-20">
            
            {/* J&C */}
            <div className="flex-1 flex justify-center items-center">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/936ba5dbe_logo_JCEsquadrias.png"
                 alt="J&C Esquadrias"
                 className="h-20 md:h-24 w-auto object-contain hover:scale-110 transition-transform duration-300"
               />
            </div>

            <div className="h-12 w-px bg-slate-300 dark:bg-slate-600"></div>
            
            {/* Inovalum */}
            <div className="flex-1 flex justify-center items-center overflow-visible">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/386f33ec8_INOVALUMTRANSPARENTECOMBORDA.png"
                 alt="Inovalum"
                 className="h-20 md:h-24 w-auto object-contain scale-[1.4] hover:scale-[1.5] transition-transform duration-300"
               />
            </div>

            <div className="h-12 w-px bg-slate-300 dark:bg-slate-600"></div>

            {/* Oliver */}
            <div className="flex-1 flex justify-center items-center">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/6dba430e9_LOGOOLIVERTRANSPARENTECOMBORDA.png"
                 alt="Oliver Extrusora"
                 className="h-20 md:h-24 w-auto object-contain hover:scale-110 transition-transform duration-300"
               />
            </div>
          </div>
          
          {/* TÍTULO */}
          <div className="text-center mt-10 space-y-2 relative z-20">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
              <span className="text-blue-900 dark:text-blue-200">ONE</span> Vision
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold tracking-wide uppercase">
              Gestão Integrada | Selecione seu acesso
            </p>
          </div>
        </motion.div>

        {/* BOTÕES DE ACESSO */}
        <div className="w-full flex flex-col gap-3 items-center z-20">
          <AccessButton title="Área do Cliente" subtitle="Acompanhe seus pedidos e entregas" icon={User} onClick={handleCliente} delay={0.1} />
          <AccessButton title="Portal do Representante" subtitle="Gestão de carteira e vendas" icon={Briefcase} onClick={handleRepresentante} delay={0.2} />
          <AccessButton title="Acesso Administrativo" subtitle="Controle financeiro e produção" icon={ShieldCheck} onClick={handleAdmin} delay={0.3} />
        </div>

        {/* RODAPÉ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-12 text-center relative z-20">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase">Vision System &copy; {new Date().getFullYear()}</p>
        </motion.div>

      </div>

      <AnimatePresence>
        {showNotification && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-10 bg-slate-800 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl z-50 border border-slate-700">
            <Lock size={16} className="text-yellow-400" /><span className="text-sm font-medium">Acesso restrito.</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}