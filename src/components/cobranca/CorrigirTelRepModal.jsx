import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Phone } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Modal para corrigir telefones de representantes que falharam no disparo.
 * Ao salvar, atualiza no cadastro do Representante para não ocorrer novamente.
 *
 * Props:
 *   erros: [{ rep: string, motivo: string }]  — representantes com erro
 *   representantesDB: Representante[]
 *   onClose: () => void
 *   onCorrigido: (rep, novoNumero) => void   — callback para reenviar
 */
export default function CorrigirTelRepModal({ erros, representantesDB, onClose, onCorrigido }) {
  const [telefones, setTelefones] = useState(() => {
    const init = {};
    erros.forEach(e => {
      const repDB = representantesDB.find(r => r.nome === e.rep);
      init[e.rep] = repDB?.telefone || '';
    });
    return init;
  });
  const [salvando, setSalvando] = useState({});

  const handleSalvar = async (repNome) => {
    const numero = telefones[repNome]?.trim();
    if (!numero) {
      toast.error('Digite um número válido');
      return;
    }

    setSalvando(prev => ({ ...prev, [repNome]: true }));
    try {
      // Atualiza no cadastro do representante
      const repDB = representantesDB.find(r => r.nome === repNome);
      if (repDB?.id) {
        await base44.entities.Representante.update(repDB.id, { telefone: numero });
      }

      toast.success(`✓ Telefone de ${repNome} atualizado`);
      onCorrigido(repNome, numero);
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSalvando(prev => ({ ...prev, [repNome]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Phone className="w-5 h-5 text-orange-500" />
          Corrigir Telefones dos Representantes
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Os números abaixo estão inválidos. Corrija e salve — o cadastro do representante será atualizado automaticamente.
        </p>

        <div className="space-y-3">
          {erros.map((erro) => (
            <div key={erro.rep} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-semibold text-slate-700 mb-1">{erro.rep}</p>
              <p className="text-xs text-red-500 mb-2">Erro: {erro.motivo}</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 14999990000"
                  value={telefones[erro.rep] || ''}
                  onChange={e => setTelefones(prev => ({ ...prev, [erro.rep]: e.target.value }))}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  size="sm"
                  className="h-8 gap-1 bg-orange-500 hover:bg-orange-600"
                  onClick={() => handleSalvar(erro.rep)}
                  disabled={salvando[erro.rep]}
                >
                  {salvando[erro.rep]
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Save className="w-3 h-3" />}
                  Salvar e Reenviar
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}