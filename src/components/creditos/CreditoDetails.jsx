import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function CreditoDetails({ credito, onClose }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    chave_pix: credito.chave_pix || '',
    comprovante_url: credito.comprovante_url || ''
  });
  const [uploading, setUploading] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    const config = {
      disponivel: { label: 'Disponível', class: 'bg-green-100 text-green-700' },
      usado: { label: 'Usado', class: 'bg-blue-100 text-blue-700' },
      devolvido: { label: 'Devolvido', class: 'bg-slate-100 text-slate-700' }
    };
    return config[status] || config.disponivel;
  };

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Credito.update(credito.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditos'] });
      toast.success('Crédito atualizado!');
      setEditMode(false);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, comprovante_url: file_url });
      toast.success('Comprovante enviado!');
    } catch (error) {
      toast.error('Erro ao enviar comprovante');
    } finally {
      setUploading(false);
    }
  };

  const handleMarcarDevolvido = () => {
    if (!formData.chave_pix) {
      toast.error('Informe a chave PIX');
      return;
    }

    updateMutation.mutate({
      status: 'devolvido',
      chave_pix: formData.chave_pix,
      comprovante_url: formData.comprovante_url
    });
  };

  const statusConfig = getStatusBadge(credito.status);

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Cliente</p>
            <p className="font-bold text-lg">{credito.cliente_nome}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Código</p>
            <p className="font-mono">{credito.cliente_codigo}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Valor do Crédito</p>
            <p className="font-bold text-xl text-green-600">{formatCurrency(credito.valor)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <Badge className={statusConfig.class}>{statusConfig.label}</Badge>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div>
          <Label className="text-slate-600">Origem do Crédito</Label>
          <p className="mt-1 p-3 bg-slate-50 rounded-lg">{credito.origem}</p>
        </div>

        {credito.pedido_uso_id && (
          <div>
            <Label className="text-slate-600">Usado no Pedido</Label>
            <p className="mt-1 p-3 bg-blue-50 rounded-lg text-blue-700 font-mono">
              {credito.pedido_uso_id}
            </p>
          </div>
        )}

        {credito.data_uso && (
          <div>
            <Label className="text-slate-600">Data de Uso</Label>
            <p className="mt-1 p-3 bg-slate-50 rounded-lg">
              {new Date(credito.data_uso).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        {credito.status === 'disponivel' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="chave_pix">Chave PIX para Devolução</Label>
              <Input
                id="chave_pix"
                value={formData.chave_pix}
                onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                placeholder="Digite a chave PIX"
              />
            </div>

            <div className="space-y-2">
              <Label>Comprovante de Devolução</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('comprovante-upload').click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Enviar Comprovante'}
                </Button>
                <input
                  id="comprovante-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              {formData.comprovante_url && (
                <div className="mt-2">
                  <img 
                    src={formData.comprovante_url} 
                    alt="Comprovante" 
                    className="max-w-xs rounded-lg border"
                  />
                </div>
              )}
            </div>

            <Button 
              onClick={handleMarcarDevolvido}
              disabled={updateMutation.isPending || !formData.chave_pix}
              className="w-full"
            >
              Marcar como Devolvido
            </Button>
          </>
        )}

        {credito.status === 'devolvido' && (
          <>
            {credito.chave_pix && (
              <div>
                <Label className="text-slate-600">Chave PIX Utilizada</Label>
                <p className="mt-1 p-3 bg-slate-50 rounded-lg font-mono">{credito.chave_pix}</p>
              </div>
            )}
            {credito.comprovante_url && (
              <div>
                <Label className="text-slate-600">Comprovante</Label>
                <img 
                  src={credito.comprovante_url} 
                  alt="Comprovante" 
                  className="mt-2 max-w-md rounded-lg border"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}