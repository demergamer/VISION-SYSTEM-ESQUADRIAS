import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Loader2, Layers } from "lucide-react";
import { toast } from "sonner";

export default function GerenciarLinhasModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [novaLinha, setNovaLinha] = useState('');

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ['linhas_produto'],
    queryFn: () => base44.entities.LinhaProduto.list(),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: (nome) => base44.entities.LinhaProduto.create({ nome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linhas_produto'] });
      setNovaLinha('');
      toast.success('Linha adicionada!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LinhaProduto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linhas_produto'] });
      toast.success('Linha removida!');
    }
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!novaLinha.trim()) return;
    createMutation.mutate(novaLinha.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" /> Gerenciar Linhas
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="flex gap-2 mt-1">
          <Input
            value={novaLinha}
            onChange={e => setNovaLinha(e.target.value)}
            placeholder="Ex: Pop, Suprema..."
            className="flex-1 h-9"
          />
          <Button type="submit" size="sm" className="h-9 gap-1" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Adicionar
          </Button>
        </form>

        <div className="space-y-1.5 max-h-72 overflow-y-auto mt-2">
          {isLoading ? (
            <p className="text-center text-sm text-slate-400 py-4">Carregando...</p>
          ) : linhas.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">Nenhuma linha cadastrada</p>
          ) : (
            linhas.map(linha => (
              <div key={linha.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-sm font-medium text-slate-700">{linha.nome}</span>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(linha.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}