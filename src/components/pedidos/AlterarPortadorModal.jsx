import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, FileText, Download, X } from "lucide-react";
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export default function AlterarPortadorModal({ rota, pedidos, onSave, onCancel }) {
  const [novoMotorista, setNovoMotorista] = useState({ codigo: '', nome: '' });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const gerarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO DE ALTERAÇÃO DE PORTADOR', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Informações da Rota
    doc.setFontSize(12);
    doc.text(`Rota: ${rota.codigo_rota}`, 20, yPos);
    yPos += 7;
    doc.text(`Data Importação: ${format(new Date(rota.data_importacao), 'dd/MM/yyyy')}`, 20, yPos);
    yPos += 10;

    // Separador
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Motorista Atual
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('MOTORISTA ATUAL:', 20, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');
    doc.text(`Código: ${rota.motorista_codigo || 'Não informado'}`, 25, yPos);
    yPos += 6;
    doc.text(`Nome: ${rota.motorista_nome || 'Não informado'}`, 25, yPos);
    yPos += 10;

    // Novo Motorista
    doc.setFont(undefined, 'bold');
    doc.text('NOVO MOTORISTA:', 20, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');
    doc.text(`Código: ${novoMotorista.codigo}`, 25, yPos);
    yPos += 6;
    doc.text(`Nome: ${novoMotorista.nome}`, 25, yPos);
    yPos += 12;

    // Separador
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Cabeçalho da tabela
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('PEDIDOS DA ROTA', 20, yPos);
    yPos += 7;

    // Tabela
    doc.setFont(undefined, 'bold');
    doc.text('Nº Pedido', 20, yPos);
    doc.text('Cliente', 60, yPos);
    doc.text('Valor', 150, yPos);
    doc.text('Status', 175, yPos);
    yPos += 6;

    // Linha abaixo do cabeçalho
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;

    // Pedidos
    doc.setFont(undefined, 'normal');
    let totalValor = 0;

    pedidos.forEach((pedido, index) => {
      // Verificar se precisa nova página
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(pedido.numero_pedido || '-', 20, yPos);
      
      // Cliente (truncar se muito longo)
      const clienteNome = pedido.cliente_nome || '-';
      const clienteTruncado = clienteNome.length > 30 
        ? clienteNome.substring(0, 27) + '...' 
        : clienteNome;
      doc.text(clienteTruncado, 60, yPos);
      
      doc.text(formatCurrency(pedido.valor_pedido), 150, yPos);
      
      const status = pedido.confirmado_entrega ? 'Confirmado' : 'Pendente';
      doc.text(status, 175, yPos);
      
      totalValor += pedido.valor_pedido || 0;
      yPos += 6;
    });

    // Total
    yPos += 3;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 7;
    doc.setFont(undefined, 'bold');
    doc.text(`Total de Pedidos: ${pedidos.length}`, 20, yPos);
    doc.text(`Valor Total: ${formatCurrency(totalValor)}`, 150, yPos);

    // Rodapé com data e hora de geração
    yPos += 15;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const dataHora = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
    doc.text(`Gerado em: ${dataHora}`, 20, yPos);

    // Salvar PDF
    const nomeArquivo = `AlteracaoPortador_${rota.codigo_rota.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(nomeArquivo);
  };

  const handleSalvar = () => {
    if (!novoMotorista.codigo || !novoMotorista.nome) {
      alert('Preencha código e nome do novo motorista');
      return;
    }

    // Gerar PDF antes de salvar
    gerarPDF();

    // Salvar alteração
    onSave({
      motorista_codigo: novoMotorista.codigo,
      motorista_nome: novoMotorista.nome
    });
  };

  return (
    <div className="space-y-6">
      {/* Informações Atuais */}
      <Card className="p-4 bg-slate-50">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Motorista Atual
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Código</p>
            <p className="font-medium">{rota.motorista_codigo || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-slate-500">Nome</p>
            <p className="font-medium">{rota.motorista_nome || 'Não informado'}</p>
          </div>
        </div>
      </Card>

      {/* Novo Motorista */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" />
          Novo Motorista
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Código do Motorista *</Label>
            <Input
              value={novoMotorista.codigo}
              onChange={(e) => setNovoMotorista({ ...novoMotorista, codigo: e.target.value })}
              placeholder="Ex: MOT002"
            />
          </div>
          <div className="space-y-2">
            <Label>Nome do Motorista *</Label>
            <Input
              value={novoMotorista.nome}
              onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value })}
              placeholder="Nome completo"
            />
          </div>
        </div>
      </Card>

      {/* Resumo */}
      <Alert className="bg-blue-50 border-blue-200">
        <FileText className="w-4 h-4 text-blue-600" />
        <AlertDescription>
          <p className="font-medium text-blue-800 mb-1">Ao confirmar a alteração:</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Um relatório PDF será gerado automaticamente</li>
            <li>• O motorista da rota será atualizado</li>
            <li>• Total de {pedidos.length} pedidos na rota</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button 
          onClick={handleSalvar}
          disabled={!novoMotorista.codigo || !novoMotorista.nome}
        >
          <Download className="w-4 h-4 mr-2" />
          Gerar PDF e Salvar
        </Button>
      </div>
    </div>
  );
}