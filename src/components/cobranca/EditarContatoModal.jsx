import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, X } from 'lucide-react';

export default function EditarContatoModal({ cliente, onSave, onClose }) {
  const [telefone, setTelefone] = useState(
    cliente.contatos_nomeados?.[0]?.telefone || cliente.cliente_telefone || ''
  );
  const [nome, setNome] = useState(
    cliente.contatos_nomeados?.[0]?.nome || ''
  );

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" /> Editar Contato
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3 font-medium">{cliente.cliente_nome}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Telefone / WhatsApp *
            </label>
            <Input
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="Ex: 11999998888"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Nome do Responsável
            </label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => onSave({ telefone: telefone.trim(), nome: nome.trim() })}
            disabled={!telefone.trim()}
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}