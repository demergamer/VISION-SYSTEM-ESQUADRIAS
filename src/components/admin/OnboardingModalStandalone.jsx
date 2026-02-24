import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, ShieldCheck, Loader2, CheckCircle2, User, Phone, Lock } from 'lucide-react';
import { toast } from 'sonner';

// Mesma função de hash usada no OnboardingModal original
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_jc_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Versão standalone do OnboardingModal — não depende de useAuth/AuthContext.
 * Recebe o registro da entidade já identificada (motorista, representante ou cliente)
 * e o perfil correspondente.
 * 
 * Props:
 *   - registro: objeto da entidade (Motorista, Representante ou Cliente)
 *   - perfil: 'motorista' | 'representante' | 'cliente'
 *   - onComplete(registro): callback chamado após salvar com sucesso
 */
export default function OnboardingModalStandalone({ registro, perfil, onComplete }) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const nomeInicial = registro?.nome_social || registro?.nome || '';
  const primeiroNome = nomeInicial.split(' ')[0] || '';

  const [form, setForm] = useState({
    avatar_url: registro?.foto_url || '',
    preferred_name: primeiroNome,
    phone: registro?.telefone || '',
    pin: '',
    pin_confirm: '',
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, avatar_url: file_url }));
    } catch {
      toast.error('Erro ao fazer upload da foto.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!form.preferred_name.trim()) {
      toast.error('Informe como quer ser chamado.');
      return;
    }
    if (!form.pin || form.pin.length < 4) {
      toast.error('O PIN deve ter no mínimo 4 dígitos.');
      return;
    }
    if (form.pin !== form.pin_confirm) {
      toast.error('Os PINs não conferem.');
      return;
    }

    setIsSaving(true);
    try {
      const pinHash = await hashPin(form.pin);

      const ENTIDADE_MAP = {
        motorista: 'Motorista',
        representante: 'Representante',
        cliente: 'Cliente',
      };

      const entidade = ENTIDADE_MAP[perfil];

      // 1. Atualiza a entidade específica no banco
      const updateData = {
        pin_hash: pinHash,
        nome_social: form.preferred_name.trim(),
        ...(form.avatar_url && { foto_url: form.avatar_url }),
        ...(form.phone && { telefone: form.phone.trim() }),
      };
      await base44.entities[entidade].update(registro.id, updateData);

      // 2. Salva nos metadados do usuário Base44 (para PIN global e LockScreen)
      try {
        await base44.auth.updateMe({
          avatar_url: form.avatar_url,
          preferred_name: form.preferred_name.trim(),
          phone: form.phone.trim(),
          security_pin_hash: pinHash,
        });
      } catch {
        // Falha silenciosa — o dado principal já foi salvo na entidade
      }

      toast.success('Perfil configurado com sucesso!');
      // Retorna o registro atualizado
      onComplete({ ...registro, ...updateData, pin_hash: pinHash });
    } catch {
      toast.error('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (form.preferred_name || nomeInicial || 'A').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header — idêntico ao OnboardingModal do Dashboard */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-xl font-bold">Configuração Inicial</h2>
          </div>
          <p className="text-blue-100 text-sm">Configure seu perfil e PIN de segurança para continuar.</p>
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-all ${step >= 1 ? 'bg-white text-blue-700' : 'bg-blue-500 text-blue-200'}`}>
              <User className="w-3 h-3" /> Perfil
            </div>
            <div className="flex-1 h-px bg-blue-400" />
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-all ${step >= 2 ? 'bg-white text-blue-700' : 'bg-blue-500 text-blue-200'}`}>
              <Lock className="w-3 h-3" /> PIN
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          {step === 1 && (
            <>
              <div className="flex flex-col items-center gap-3 pb-2">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <Avatar className="w-24 h-24 border-4 border-blue-100 shadow-lg">
                    {form.avatar_url && <AvatarImage src={form.avatar_url} className="object-cover" />}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <p className="text-xs text-slate-400">Clique para adicionar foto</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_name" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" /> Como quer ser chamado? *
                </Label>
                <Input
                  id="preferred_name"
                  value={form.preferred_name}
                  onChange={e => setForm(p => ({ ...p, preferred_name: e.target.value }))}
                  placeholder="Ex: João, Ana Paula..."
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" /> Telefone de Contato
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (!form.preferred_name.trim()) { toast.error('Informe como quer ser chamado.'); return; }
                  setStep(2);
                }}
              >
                Próximo: Criar PIN de Segurança
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center pb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-3">
                  <Lock className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800">Crie seu PIN de Segurança</h3>
                <p className="text-sm text-slate-500 mt-1">Será usado para desbloquear a tela após inatividade.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4 a 6 dígitos) *</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="••••"
                  className="text-center text-xl tracking-[0.5em] font-bold"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin_confirm">Confirmar PIN *</Label>
                <Input
                  id="pin_confirm"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin_confirm}
                  onChange={e => setForm(p => ({ ...p, pin_confirm: e.target.value.replace(/\D/g, '') }))}
                  placeholder="••••"
                  className="text-center text-xl tracking-[0.5em] font-bold"
                />
                {form.pin_confirm && form.pin !== form.pin_confirm && (
                  <p className="text-xs text-red-500">PINs não conferem</p>
                )}
                {form.pin_confirm && form.pin === form.pin_confirm && form.pin.length >= 4 && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> PINs conferem</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={isSaving}>
                  Voltar
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><ShieldCheck className="w-4 h-4 mr-2" /> Confirmar</>}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="px-8 pb-5">
          <p className="text-center text-xs text-slate-400">
            Esta configuração é obrigatória e protege o acesso ao seu portal.
          </p>
        </div>
      </div>
    </div>
  );
}