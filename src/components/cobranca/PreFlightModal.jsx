import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import ModalContainer from '@/components/modals/ModalContainer';
import { toast } from 'sonner';

/**
 * PreFlightModal – verifica dados faltantes (telefone/endereço do cliente,
 * telefone do representante) e permite correção in-loco antes do disparo.
 *
 * Props:
 *   itens          – array de dados_cobranca filtrados (não recusados)
 *   clientes       – array de entidades Cliente (para atualizar)
 *   representantes – array de entidades Representante
 *   onConfirm      – callback após correção (ou se não havia pendências)
 *   onClose        – fechar sem prosseguir
 */
export default function PreFlightModal({ itens, clientes, representantes, onConfirm, onClose, action }) {
  const [salvando, setSalvando] = useState(false);
  const [correcoes, setCorrecoes] = useState(() => {
    const init = {};
    itens.forEach(item => {
      const cli = clientes.find(c => c.codigo === item.cliente_codigo);
      const rep = representantes.find(r => r.codigo === item.representante_codigo);
      init[item.cliente_codigo || item.cliente_nome] = {
        cliente_id: cli?.id || null,
        representante_id: rep?.id || null,
        telefone: cli?.telefone_1 || item.cliente_telefone || '',
        endereco: cli?.endereco || item.cliente_endereco_completo || '',
        rep_telefone: rep?.telefone || '',
        rep_nome: rep?.nome || item.representante_nome || '',
      };
    });
    return init;
  });

  // Detecta pendências
  const pendencias = itens.map(item => {
    const key = item.cliente_codigo || item.cliente_nome;
    const cor = correcoes[key];
    const problemas = [];
    const temTelefone = cor.telefone || item.cliente_telefone ||
      item.contatos_nomeados?.some(c => c.telefone) || item.todos_telefones?.length > 0;
    if (!temTelefone) problemas.push('telefone');
    if (!cor.endereco && !item.cliente_endereco_completo && !item.cliente_cidade) problemas.push('endereco');
    if (item.representante_codigo && !cor.rep_telefone) problemas.push('rep_telefone');
    return { item, key, cor, problemas };
  }).filter(p => p.problemas.length > 0);

  const setField = (key, field, value) =>
    setCorrecoes(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await Promise.all(
        Object.entries(correcoes).map(async ([key, dados]) => {
          if (dados.cliente_id && dados.telefone) {
            await base44.entities.Cliente.update(dados.cliente_id, { telefone_1: dados.telefone });
          }
          if (dados.representante_id && dados.rep_telefone) {
            await base44.entities.Representante.update(dados.representante_id, { telefone: dados.rep_telefone });
          }
        })
      );
      toast.success('Dados atualizados com sucesso!');
      onConfirm(action);
    } catch (e) {
      toast.error('Erro ao salvar correções: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  useEffect(() => {
    if (pendencias.length === 0) {
      onConfirm();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (pendencias.length === 0) return null;

  return (
    <ModalContainer open={true} onClose={onClose} title="⚠️ Correção Rápida Necessária" description="Preencha os dados ausentes antes de continuar" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{pendencias.length} cliente(s) com dados faltantes. Preencha abaixo para continuar.</span>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {pendencias.map(({ item, key, cor, problemas }) => (
            <div key={key} className="border border-slate-200 rounded-xl p-3 space-y-2">
              <p className="font-semibold text-slate-800 text-sm">{item.cliente_nome}</p>
              {item.representante_nome && (
                <p className="text-xs text-slate-500">Rep: {item.representante_nome}</p>
              )}
              {problemas.includes('telefone') && (
                <div className="space-y-1">
                  <Label className="text-xs text-red-600">📞 Telefone do cliente (ausente)</Label>
                  <Input
                    value={cor.telefone}
                    onChange={e => setField(key, 'telefone', e.target.value)}
                    placeholder="(11) 9xxxx-xxxx"
                    className="h-8 text-sm border-red-200"
                  />
                </div>
              )}
              {problemas.includes('endereco') && (
                <div className="space-y-1">
                  <Label className="text-xs text-red-600">📍 Endereço/Cidade do cliente (ausente)</Label>
                  <Input
                    value={cor.endereco}
                    onChange={e => setField(key, 'endereco', e.target.value)}
                    placeholder="Rua X, 123, Cidade - SP"
                    className="h-8 text-sm border-red-200"
                  />
                </div>
              )}
              {problemas.includes('rep_telefone') && (
                <div className="space-y-1">
                  <Label className="text-xs text-orange-600">📞 Telefone do rep. "{cor.rep_nome}" (ausente)</Label>
                  <Input
                    value={cor.rep_telefone}
                    onChange={e => setField(key, 'rep_telefone', e.target.value)}
                    placeholder="(11) 9xxxx-xxxx"
                    className="h-8 text-sm border-orange-200"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onConfirm(action)} variant="outline" className="text-slate-600">
            Pular e continuar mesmo assim
          </Button>
          <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Salvar e Continuar
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}