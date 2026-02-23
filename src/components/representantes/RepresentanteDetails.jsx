import React, { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Phone, 
  MapPin, 
  Mail,
  Users, 
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Edit,
  X,
  Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RepresentanteDetails({ representante, stats, onEdit, onClose, onAvatarUpdate }) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localFotoUrl, setLocalFotoUrl] = useState(representante?.foto_url || '');
  const fileInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Representante.update(representante.id, { foto_url: file_url });
      setLocalFotoUrl(file_url);
      if (onAvatarUpdate) onAvatarUpdate(file_url);
      toast.success('Foto atualizada!');
    } catch (err) {
      toast.error('Erro ao fazer upload da foto.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const repStats = stats || {
    totalClientes: 0,
    clientesAtivos: 0,
    clientesInativos: 0,
    clientesEmAtraso: 0,
    debitosEmDia: 0,
    debitosAtrasados: 0,
    vendas30k: false,
    ativo: false,
    devedor: false
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar Interativo */}
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="w-16 h-16 border-2 border-white shadow-md">
              {localFotoUrl && <AvatarImage src={localFotoUrl} className="object-cover" />}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-lg font-bold">
                {(representante.nome_social || representante.nome || '').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploadingAvatar ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{representante.nome_social || representante.nome}</h2>
            {representante.nome_social && <p className="text-sm text-slate-500">{representante.nome}</p>}
            <div className="flex items-center gap-2 text-slate-500">
               <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-sm">{representante.codigo}</span>
               <span className="text-sm">• {representante.email}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={cn(
            "text-sm px-3 py-1",
            representante.bloqueado 
              ? "bg-red-50 text-red-600 border-red-200" 
              : "bg-emerald-50 text-emerald-600 border-emerald-200"
          )}>
            {representante.bloqueado ? 'Bloqueado' : 'Liberado'}
          </Badge>
          {repStats.ativo && (
            <Badge variant="outline" className="text-sm px-3 py-1 bg-blue-50 text-blue-600 border-blue-200">
              Ativo
            </Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card de Email Adicionado */}
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-slate-400" />
            <div className="overflow-hidden">
              <p className="text-xs text-slate-500 uppercase">Email</p>
              <p className="font-medium text-slate-800 truncate" title={representante.email}>
                {representante.email || 'Não informado'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Região</p>
              <p className="font-medium text-slate-800">{representante.regiao || 'Não informada'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Telefone</p>
              <p className="font-medium text-slate-800">{representante.telefone || 'Não informado'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-blue-100 bg-blue-50/50">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600/70 uppercase">Total Clientes</p>
              <p className="text-2xl font-bold text-blue-700">{repStats.totalClientes}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-emerald-100 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-600/70 uppercase">Clientes Ativos</p>
              <p className="text-2xl font-bold text-emerald-700">{repStats.clientesAtivos}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500/70 uppercase">Inativos</p>
              <p className="text-2xl font-bold text-slate-600">{repStats.clientesInativos}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-red-100 bg-red-50/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-xs text-red-600/70 uppercase">Em Atraso</p>
              <p className="text-2xl font-bold text-red-700">{repStats.clientesEmAtraso}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 border-emerald-100 bg-emerald-50/30">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">Débitos em Dia</p>
          </div>
          <p className="text-3xl font-bold text-emerald-700">{formatCurrency(repStats.debitosEmDia)}</p>
        </Card>
        <Card className="p-5 border-red-100 bg-red-50/30">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700 font-medium">Débitos Atrasados</p>
          </div>
          <p className="text-3xl font-bold text-red-700">{formatCurrency(repStats.debitosAtrasados)}</p>
        </Card>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {repStats.vendas30k && (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            Mais de R$ 30.000 em vendas
          </Badge>
        )}
        {repStats.devedor && (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            Possui clientes devedores
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
        <Button onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Editar Representante
        </Button>
      </div>
    </div>
  );
}