import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ShoppingBag, Briefcase, ChevronDown, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <a href={createPageUrl('Welcome')} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl hover:bg-blue-600 transition-colors">
        <User className="w-6 h-6 text-white" />
        <span className="text-[10px] text-blue-200 font-medium hidden sm:block">Entrar</span>
      </a>
    );
  }

  const isAdmin = user.role === 'admin';
  const isCliente = user.role === 'cliente' || user.role === 'representante_cliente';
  const isRepresentante = user.role === 'representante';

  const initials = (user.full_name || user.email || 'U').substring(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl hover:bg-blue-600 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 font-extrabold text-xs flex items-center justify-center shadow">
          {initials}
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-blue-200 font-medium hidden sm:block max-w-20 truncate">
            {user.full_name?.split(' ')[0] || 'Usuário'}
          </span>
          <ChevronDown className={cn("w-3 h-3 text-blue-300 hidden sm:block transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[70] overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
            <p className="font-bold text-slate-800 text-sm truncate">{user.full_name || 'Usuário'}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold capitalize">
              {user.role}
            </span>
          </div>

          {/* Links por role */}
          <div className="py-2 px-1">
            {isCliente && (
              <a href={createPageUrl('PortalCliente')} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-700 text-sm font-medium transition-colors">
                <ShoppingBag className="w-4 h-4 text-blue-500" />
                Meu Portal do Cliente
                <ExternalLink className="w-3 h-3 text-slate-300 ml-auto" />
              </a>
            )}

            {isRepresentante && (
              <a href={createPageUrl('PortalDoRepresentante')} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-700 text-sm font-medium transition-colors">
                <Briefcase className="w-4 h-4 text-emerald-500" />
                Portal do Representante
                <ExternalLink className="w-3 h-3 text-slate-300 ml-auto" />
              </a>
            )}

            {isAdmin && (
              <a href={createPageUrl('Dashboard')} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-700 text-sm font-medium transition-colors">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Painel Administrativo
                <ExternalLink className="w-3 h-3 text-slate-300 ml-auto" />
              </a>
            )}
          </div>

          {/* Sair */}
          <div className="border-t border-slate-100 p-2">
            <button
              onClick={() => base44.auth.logout(createPageUrl('Welcome'))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}