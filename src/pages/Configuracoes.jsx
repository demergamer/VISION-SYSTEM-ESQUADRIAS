import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { usePreferences } from '@/components/hooks/usePreferences';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Sun, Moon, Monitor, AlignJustify, AlignLeft, Globe, Eye, EyeOff, Trash2, Save, Loader2, Settings } from 'lucide-react';

const SectionCard = ({ title, icon: Icon, children }) => (
  <Card className="p-6 space-y-5">
    <div className="flex items-center gap-3 pb-3 border-b">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <h2 className="font-bold text-slate-800">{title}</h2>
    </div>
    {children}
  </Card>
);

const OptionButton = ({ active, onClick, icon: Icon, label, sublabel }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all w-full
      ${active
        ? 'border-blue-500 bg-blue-50 text-blue-700'
        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
      }`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-xs font-bold">{label}</span>
    {sublabel && <span className="text-[10px] text-slate-400">{sublabel}</span>}
  </button>
);

export default function Configuracoes() {
  const { preferences, updatePreferences, loading } = usePreferences();
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [localPrefs, setLocalPrefs] = useState(null);
  const prefs = localPrefs || preferences;

  React.useEffect(() => {
    if (!loading && localPrefs === null) {
      setLocalPrefs({ ...preferences });
    }
  }, [preferences, loading]);

  const handleChange = (key, value) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
  };

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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const user = await base44.auth.me();

      // Soft-delete: remove email de entidades vinculadas para impedir novo login,
      // mas preserva todo histórico financeiro
      try {
        const representantes = await base44.entities.Representante.list();
        const rep = representantes.find(r => r.email === user.email);
        if (rep) {
          await base44.entities.Representante.update(rep.id, { email: null, bloqueado: true });
        }
      } catch { /* sem vínculo */ }

      try {
        const clientes = await base44.entities.Cliente.list();
        const cli = clientes.find(c => c.email === user.email);
        if (cli) {
          await base44.entities.Cliente.update(cli.id, { email: null });
        }
      } catch { /* sem vínculo */ }

      // Logout — a conta de autenticação será inacessível após a sessão encerrar
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
              <p className="text-sm text-slate-500">Suas preferências são salvas e sincronizadas entre dispositivos</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>

        {/* Aparência */}
        <SectionCard title="Aparência" icon={Sun}>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Tema</Label>
            <div className="grid grid-cols-3 gap-3">
              <OptionButton active={prefs.theme === 'light'} onClick={() => handleChange('theme', 'light')} icon={Sun} label="Claro" />
              <OptionButton active={prefs.theme === 'dark'} onClick={() => handleChange('theme', 'dark')} icon={Moon} label="Escuro" />
              <OptionButton active={prefs.theme === 'system'} onClick={() => handleChange('theme', 'system')} icon={Monitor} label="Sistema" sublabel="Automático" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Densidade das Tabelas</Label>
            <div className="grid grid-cols-2 gap-3">
              <OptionButton
                active={prefs.density === 'default'}
                onClick={() => handleChange('density', 'default')}
                icon={AlignJustify}
                label="Padrão"
                sublabel="Espaçamento normal"
              />
              <OptionButton
                active={prefs.density === 'compact'}
                onClick={() => handleChange('density', 'compact')}
                icon={AlignLeft}
                label="Compacto"
                sublabel="Mais linhas visíveis"
              />
            </div>
          </div>
        </SectionCard>

        {/* Preferências Regionais */}
        <SectionCard title="Preferências Regionais" icon={Globe}>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Idioma</Label>
            <Select value={prefs.language} onValueChange={v => handleChange('language', v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">Afeta o formato de datas, números e textos da interface.</p>
          </div>
        </SectionCard>

        {/* Privacidade */}
        <SectionCard title="Privacidade e Segurança" icon={Eye}>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
            <div className="flex items-center gap-3">
              {prefs.privacy_mode ? <EyeOff className="w-5 h-5 text-slate-500" /> : <Eye className="w-5 h-5 text-slate-500" />}
              <div>
                <p className="font-semibold text-slate-800 text-sm">Modo Privacidade</p>
                <p className="text-xs text-slate-500">Iniciar com valores financeiros ocultos</p>
              </div>
            </div>
            <Switch
              checked={prefs.privacy_mode}
              onCheckedChange={v => handleChange('privacy_mode', v)}
            />
          </div>
          {prefs.privacy_mode && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
              ⚠️ Os valores financeiros serão ocultados ao abrir o sistema. Clique no ícone do olho para revelá-los.
            </p>
          )}

          <div className="pt-2 border-t mt-2">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
              <div>
                <p className="font-bold text-red-700 text-sm flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Excluir Meu Acesso
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Remove permanentemente seu acesso de login. <strong>Todos os registros financeiros, pedidos e histórico são preservados</strong> e continuam acessíveis para o time administrativo.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
                Encerrar Meu Acesso
              </Button>
            </div>
          </div>
        </SectionCard>

      </div>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">⚠️ Confirmar Encerramento de Acesso</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta ação irá <strong>encerrar permanentemente seu acesso de login</strong> ao sistema.</p>
              <p className="text-green-700 font-medium">✅ Seus dados são preservados: pedidos, histórico financeiro, comissões e registros de cliente/representante permanecem intactos.</p>
              <p className="text-red-600 font-medium">❌ Você não conseguirá mais entrar com este e-mail.</p>
              <p>Se precisar recuperar o acesso, entre em contato com o administrador.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Encerrando...</> : 'Sim, encerrar meu acesso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}