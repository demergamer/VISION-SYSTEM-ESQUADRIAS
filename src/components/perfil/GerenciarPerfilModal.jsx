import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, KeyRound, ChevronDown, Loader2, CheckCircle2, Mail } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GerenciarPerfilModal({ open, onClose, user }) {
  const [nome, setNome] = useState(user?.preferred_name || user?.full_name || '');
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState('normal'); // 'normal' | 'esqueci' | 'reset'
  const [pinAtual, setPinAtual] = useState('');
  const [pinNovo, setPinNovo] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpEnviado, setOtpEnviado] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const initials = (user?.preferred_name || user?.full_name || user?.email || 'U')
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    setUploadingFoto(false);
    toast.success('Foto atualizada!');
  };

  const handleTelefone = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let m = raw;
    if (raw.length > 10) m = raw.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (raw.length > 6) m = raw.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (raw.length > 2) m = raw.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    else m = raw;
    setTelefone(m);
  };

  const handleSalvar = async () => {
    setSaving(true);
    await base44.auth.updateMe({ preferred_name: nome, telefone, avatar_url: avatarUrl });
    setSaving(false);
    toast.success('Perfil atualizado!');
    onClose();
  };

  // PIN hashing simples via SHA-256
  const hashPin = async (pin) => {
    const enc = new TextEncoder().encode(pin);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSalvarPin = async () => {
    if (pinNovo !== pinConfirm) { toast.error('Os PINs não coincidem!'); return; }
    if (pinNovo.length < 4) { toast.error('PIN deve ter ao menos 4 dígitos.'); return; }
    setSavingPin(true);
    const hashAtual = await hashPin(pinAtual);
    if (hashAtual !== user?.pin_hash) { toast.error('PIN atual incorreto!'); setSavingPin(false); return; }
    const novoHash = await hashPin(pinNovo);
    await base44.auth.updateMe({ pin_hash: novoHash });
    toast.success('PIN alterado com sucesso!');
    setSavingPin(false);
    setPinAtual(''); setPinNovo(''); setPinConfirm('');
    setPinOpen(false);
  };

  const handleEnviarOtp = async () => {
    setSendingOtp(true);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpEnviado(code);
    await base44.integrations.Core.SendEmail({
      to: user?.email,
      subject: 'Código de redefinição de PIN - J&C Vision',
      body: `Seu código de verificação é: <strong>${code}</strong><br>Válido por 10 minutos.`,
    });
    setSendingOtp(false);
    setPinMode('reset');
    toast.success('Código enviado para ' + user?.email);
  };

  const handleResetPin = async () => {
    if (otpCode !== otpEnviado) { toast.error('Código inválido!'); return; }
    if (pinNovo !== pinConfirm) { toast.error('Os PINs não coincidem!'); return; }
    if (pinNovo.length < 4) { toast.error('PIN deve ter ao menos 4 dígitos.'); return; }
    setSavingPin(true);
    const novoHash = await hashPin(pinNovo);
    await base44.auth.updateMe({ pin_hash: novoHash });
    toast.success('PIN redefinido com sucesso!');
    setSavingPin(false);
    setPinMode('normal');
    setOtpCode(''); setPinNovo(''); setPinConfirm(''); setOtpEnviado('');
    setPinOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* FOTO */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-white shadow-md">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 shadow hover:bg-blue-700 transition-colors"
              >
                {uploadingFoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
            </div>
            <p className="text-xs text-slate-400">Clique na câmera para trocar a foto</p>
          </div>

          {/* DADOS */}
          <div className="space-y-3">
            <div>
              <Label>Nome de Preferência</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Como prefere ser chamado(a)" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={telefone} onChange={handleTelefone} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={user?.email || ''} disabled className="bg-slate-50 text-slate-400" />
            </div>
          </div>

          {/* SEÇÃO PIN */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => { setPinOpen(!pinOpen); setPinMode('normal'); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <KeyRound className="w-4 h-4 text-amber-500" /> Alterar PIN de Segurança
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", pinOpen && "rotate-180")} />
            </button>

            {pinOpen && (
              <div className="p-4 space-y-3 border-t border-slate-200">
                {pinMode === 'normal' && (
                  <>
                    <div>
                      <Label>PIN Atual</Label>
                      <Input type="password" inputMode="numeric" maxLength={8} value={pinAtual} onChange={e => setPinAtual(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                    </div>
                    <div>
                      <Label>Novo PIN</Label>
                      <Input type="password" inputMode="numeric" maxLength={8} value={pinNovo} onChange={e => setPinNovo(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                    </div>
                    <div>
                      <Label>Confirmar Novo PIN</Label>
                      <Input type="password" inputMode="numeric" maxLength={8} value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button onClick={() => setPinMode('esqueci')} className="text-xs text-blue-600 hover:underline">
                        Esqueci meu PIN atual
                      </button>
                      <Button size="sm" onClick={handleSalvarPin} disabled={savingPin}>
                        {savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar PIN'}
                      </Button>
                    </div>
                  </>
                )}

                {pinMode === 'esqueci' && (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-slate-600">Enviaremos um código de 6 dígitos para <strong>{user?.email}</strong></p>
                    <Button onClick={handleEnviarOtp} disabled={sendingOtp} className="w-full">
                      {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                      Enviar código por e-mail
                    </Button>
                    <button onClick={() => setPinMode('normal')} className="text-xs text-slate-400 hover:underline">Voltar</button>
                  </div>
                )}

                {pinMode === 'reset' && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4" /> Código enviado para {user?.email}
                    </div>
                    <div>
                      <Label>Código de 6 dígitos</Label>
                      <Input inputMode="numeric" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
                    </div>
                    <div>
                      <Label>Novo PIN</Label>
                      <Input type="password" inputMode="numeric" maxLength={8} value={pinNovo} onChange={e => setPinNovo(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                    </div>
                    <div>
                      <Label>Confirmar Novo PIN</Label>
                      <Input type="password" inputMode="numeric" maxLength={8} value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                    </div>
                    <Button onClick={handleResetPin} disabled={savingPin} className="w-full">
                      {savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redefinir PIN'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Perfil'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}