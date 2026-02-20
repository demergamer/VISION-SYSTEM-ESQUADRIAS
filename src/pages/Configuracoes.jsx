import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePreferences } from '@/components/hooks/usePreferences';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Sun, Moon, Monitor, AlignJustify, AlignLeft,
  Globe, Eye, EyeOff, Trash2, Save, Loader2,
  Settings, Bell, BellOff, BellRing, Home,
  ShoppingCart, DollarSign, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────

const SectionCard = ({ title, icon: Icon, iconColor = 'text-blue-600', iconBg = 'bg-blue-50', children }) => (
  <Card className="overflow-hidden">
    <div className={cn("flex items-center gap-3 px-6 py-4 border-b bg-slate-50/70")}>
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <h2 className="font-bold text-slate-800">{title}</h2>
    </div>
    <div className="px-6 py-5 space-y-5">
      {children}
    </div>
  </Card>
);

const OptionButton = ({ active, onClick, icon: Icon, label, sublabel }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all w-full",
      active
        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="text-xs font-bold leading-tight">{label}</span>
    {sublabel && <span className="text-[10px] text-slate-400">{sublabel}</span>}
  </button>
);

const ToggleRow = ({ icon: Icon, title, description, checked, onCheckedChange }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div>
        <p className="font-semibold text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────

export default function Configuracoes() {
  const { preferences, updatePreferences, loading } = usePreferences();
  const [localPrefs, setLocalPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Inicializa localPrefs quando as preferências chegam do servidor
  useEffect(() => {
    if (!loading && localPrefs === null) {
      setLocalPrefs({ ...preferences });
    }
  }, [preferences, loading]);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email || '')).catch(() => {});
  }, []);

  const prefs = localPrefs || preferences;

  const set = (key, value) => setLocalPrefs(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences(prefs);
      toast.success('Preferências salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar preferências.');
    } finally {
      setSaving(false);
    }
  };

  // Soft-delete: preserva histórico, apenas bloqueia o acesso
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const user = await base44.auth.me();

      try {
        const reps = await base44.entities.Representante.list();
        const rep = reps.find(r => r.email === user.email);
        if (rep) await base44.entities.Representante.update(rep.id, { email: null, bloqueado: true });
      } catch { /* sem vínculo de representante */ }

      try {
        const clis = await base44.entities.Cliente.list();
        const cli = clis.find(c => c.email === user.email);
        if (cli) await base44.entities.Cliente.update(cli.id, { email: null });
      } catch { /* sem vínculo de cliente */ }

      toast.success('Acesso encerrado. Seus dados históricos foram preservados.');
      setTimeout(() => base44.auth.logout('/'), 2000);
    } catch {
      toast.error('Erro ao encerrar acesso.');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading || localPrefs === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
              <p className="text-sm text-slate-500">Preferências sincronizadas entre dispositivos</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>

        {/* ── 🎨 Aparência ── */}
        <SectionCard title="Aparência" icon={Sun} iconColor="text-amber-600" iconBg="bg-amber-50">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Tema</Label>
            <div className="grid grid-cols-3 gap-3">
              <OptionButton active={prefs.theme === 'light'} onClick={() => set('theme', 'light')} icon={Sun} label="Claro" />
              <OptionButton active={prefs.theme === 'dark'} onClick={() => set('theme', 'dark')} icon={Moon} label="Escuro" />
              <OptionButton active={prefs.theme === 'system'} onClick={() => set('theme', 'system')} icon={Monitor} label="Sistema" sublabel="Automático" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Densidade das Tabelas</Label>
            <div className="grid grid-cols-2 gap-3">
              <OptionButton
                active={prefs.density === 'default'}
                onClick={() => set('density', 'default')}
                icon={AlignJustify}
                label="Padrão"
                sublabel="Espaçamento normal"
              />
              <OptionButton
                active={prefs.density === 'compact'}
                onClick={() => set('density', 'compact')}
                icon={AlignLeft}
                label="Compacto"
                sublabel="Mais linhas visíveis"
              />
            </div>
          </div>
        </SectionCard>

        {/* ── ⚙️ Geral ── */}
        <SectionCard title="Geral" icon={Settings} iconColor="text-slate-600" iconBg="bg-slate-100">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Idioma</Label>
            <Select value={prefs.language} onValueChange={v => set('language', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">Afeta formatos de data, número e textos da interface.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Tela Inicial Padrão</Label>
            <div className="grid grid-cols-3 gap-3">
              <OptionButton
                active={prefs.tela_inicial === '/Dashboard'}
                onClick={() => set('tela_inicial', '/Dashboard')}
                icon={Home}
                label="Dashboard"
              />
              <OptionButton
                active={prefs.tela_inicial === '/Comissoes'}
                onClick={() => set('tela_inicial', '/Comissoes')}
                icon={DollarSign}
                label="Comissões"
              />
              <OptionButton
                active={prefs.tela_inicial === '/Pedidos'}
                onClick={() => set('tela_inicial', '/Pedidos')}
                icon={ShoppingCart}
                label="Pedidos"
              />
            </div>
            <p className="text-xs text-slate-400">Página que abrirá automaticamente ao entrar no sistema.</p>
          </div>
        </SectionCard>

        {/* ── 🔒 Privacidade e Notificações ── */}
        <SectionCard title="Privacidade e Notificações" icon={Eye} iconColor="text-purple-600" iconBg="bg-purple-50">
          <ToggleRow
            icon={prefs.privacy_mode ? EyeOff : Eye}
            title="Modo Privacidade"
            description="Oculta valores financeiros ao abrir o sistema"
            checked={prefs.privacy_mode}
            onCheckedChange={v => set('privacy_mode', v)}
          />
          {prefs.privacy_mode && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              ⚠️ Os valores financeiros ficarão ocultos. Clique no ícone do olho para revelá-los temporariamente.
            </p>
          )}

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Preferências de Notificação</Label>
            <div className="grid grid-cols-3 gap-3">
              <OptionButton
                active={prefs.notificacoes === 'todas'}
                onClick={() => set('notificacoes', 'todas')}
                icon={BellRing}
                label="Todas"
                sublabel="Som + tela"
              />
              <OptionButton
                active={prefs.notificacoes === 'apenas_tela'}
                onClick={() => set('notificacoes', 'apenas_tela')}
                icon={Bell}
                label="Apenas tela"
                sublabel="Sem som"
              />
              <OptionButton
                active={prefs.notificacoes === 'silenciadas'}
                onClick={() => set('notificacoes', 'silenciadas')}
                icon={BellOff}
                label="Silenciadas"
                sublabel="Nenhuma"
              />
            </div>
          </div>
        </SectionCard>

        {/* ── ⚠️ Zona de Risco ── */}
        <Card className="overflow-hidden border-red-200">
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-red-50">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="font-bold text-red-700">Zona de Risco</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            {userEmail && (
              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border">
                Conta atual: <span className="font-semibold text-slate-700">{userEmail}</span>
              </div>
            )}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
              <div>
                <p className="font-bold text-red-700 text-sm">Excluir Meu Acesso</p>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  Remove permanentemente seu acesso de login ao sistema.{' '}
                  <strong>Todos os registros financeiros, pedidos, comissões e histórico são preservados</strong>{' '}
                  e continuam acessíveis para o time administrativo.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 bg-red-600 hover:bg-red-700"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
                Encerrar Meu Acesso
              </Button>
            </div>
          </div>
        </Card>

        {/* Botão salvar final (repetido para facilidade) */}
        <div className="flex justify-end pb-4">
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 gap-2 px-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Preferências
          </Button>
        </div>
      </div>

      {/* ── Diálogo de confirmação de exclusão ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirmar Encerramento de Acesso
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>Esta ação irá <strong>encerrar permanentemente seu acesso de login</strong> ao sistema.</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
                  ✅ <strong>Seus dados são preservados:</strong> pedidos, histórico financeiro, comissões e registros de cliente/representante permanecem intactos.
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600">
                  ❌ <strong>Você não conseguirá mais entrar</strong> com este e-mail. Para recuperar o acesso, contate o administrador.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Encerrando...</>
                : 'Sim, encerrar meu acesso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}