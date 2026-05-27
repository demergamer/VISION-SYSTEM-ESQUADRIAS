import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageSquare, CheckCircle2, Loader2, AlertTriangle, Printer, RefreshCw, Map, Navigation } from 'lucide-react';
import ModalContainer from '@/components/modals/ModalContainer';
import ImpressaoRotaPDF from './ImpressaoRotaPDF';
import { toast } from 'sonner';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

function limparNumero(n) {
  if (!n) return '';
  const digits = n.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function isNumeroValido(n) {
  const d = n.replace(/\D/g, '');
  return d.length >= 12 && d.length <= 15;
}

export default function DetalhesRotaModal({ rota, onClose, onUpdated }) {
  const [disparando, setDisparando] = useState(false);
  const [confirmarDisparo, setConfirmarDisparo] = useState(false);
  const [resultadoDisparo, setResultadoDisparo] = useState(null); // { enviados, falhas: [{cliente_nome, numero, erro}] }
  const [numerosCorrecao, setNumerosCorrecao] = useState({}); // { cliente_nome: novo_numero }
  const [reenvioLoading, setReenvioLoading] = useState({});
  const [concluindo, setConcluindo] = useState(false);
  const [showPDF, setShowPDF] = useState(false);

  const clientes = rota.dados_cobranca || [];

  // Monta URLs de navegação baseados no endereço/coordenadas de cada cliente
  const buildNavLinks = () => {
    const origin = encodeURIComponent('Ribeirão Pires, SP, Brasil');

    // Tenta montar paradas por endereço textual
    const stopsTexto = clientes
      .map(c => {
        if (c.cliente_endereco_completo) return c.cliente_endereco_completo;
        const cidade = c.cliente_cidade || c.cliente_regiao;
        if (cidade) return `${cidade}, SP, Brasil`;
        return null;
      })
      .filter(Boolean);

    // Tenta montar paradas por coordenadas lat/lon
    const stopsCoordenada = clientes
      .filter(c => c.cliente_latitude && c.cliente_longitude)
      .map(c => `${c.cliente_latitude},${c.cliente_longitude}`);

    const stops = stopsTexto.length >= clientes.length * 0.5 ? stopsTexto : 
                  stopsCoordenada.length > 0 ? stopsCoordenada : stopsTexto;

    if (stops.length === 0) return { maps: null, waze: null };

    const destination = encodeURIComponent(stops[stops.length - 1]);
    const waypoints = stops.slice(0, -1).map(s => encodeURIComponent(s)).join('|');
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(stops[0])}&navigate=yes`;

    return { maps: mapsUrl, waze: wazeUrl };
  };

  const navLinks = buildNavLinks();

  const handleDisparar = async () => {
    setDisparando(true);
    setConfirmarDisparo(false);
    setResultadoDisparo(null);

    const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;
    const EVOLUTION_INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE;

    const enviados = [];
    const falhas = [];
    const dadosAtualizados = clientes.map(c => ({ ...c }));

    const formatDate2 = (dateStr) => {
      if (!dateStr) return 'em breve';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    for (let i = 0; i < clientes.length; i++) {
      const cliente = clientes[i];
      const numeros = (cliente.todos_telefones?.length ? cliente.todos_telefones : [cliente.cliente_telefone])
        .map(limparNumero)
        .filter(n => n && isNumeroValido(n));

      if (!numeros.length) {
        falhas.push({ cliente_nome: cliente.cliente_nome, numero: cliente.cliente_telefone || '', erro: 'Número inválido ou ausente' });
        dadosAtualizados[i] = { ...dadosAtualizados[i], whatsapp_enviado: false, whatsapp_erro: 'Número inválido' };
        continue;
      }

      const linhasPedidos = (cliente.pedidos || [])
        .map(p => `▪ Pedido #${p.numero_pedido} — ${formatCurrency(p.valor_saldo)}`)
        .join('\n');

      const texto =
        `Olá, *${cliente.cliente_nome}*! 😊\n\n` +
        `O nosso cobrador *Gil* estará na sua região no dia *${formatDate2(rota.data_rota)}*.\n\n` +
        `*📋 Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n` +
        `*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\n` +
        `Aguardamos confirmação! 🙏\n_Equipe J&C Esquadrias_`;

      let enviouAlgum = false;
      for (const numero of numeros) {
        try {
          const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ number: numero, text: texto }),
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          enviados.push({ cliente_nome: cliente.cliente_nome, numero });
          dadosAtualizados[i] = { ...dadosAtualizados[i], whatsapp_enviado: true, whatsapp_erro: null };
          enviouAlgum = true;
          break; // enviou para 1 número com sucesso, passa para o próximo cliente
        } catch (e) {
          // tenta o próximo número
        }
      }

      if (!enviouAlgum) {
        falhas.push({ cliente_nome: cliente.cliente_nome, numero: numeros[0] || '', erro: 'Falha no envio para todos os números' });
        dadosAtualizados[i] = { ...dadosAtualizados[i], whatsapp_enviado: false, whatsapp_erro: 'Falha no envio' };
      }
    }

    // Atualiza entidade com status por cliente
    await base44.entities.RotaCobranca.update(rota.id, {
      whatsapp_disparado: enviados.length > 0,
      dados_cobranca: dadosAtualizados,
    });

    const atualizado = await base44.entities.RotaCobranca.filter({ id: rota.id });
    if (atualizado?.[0]) onUpdated(atualizado[0]);

    setResultadoDisparo({ enviados, falhas });
    setDisparando(false);

    if (falhas.length === 0) {
      toast.success(`✅ WhatsApp enviado para ${enviados.length} cliente(s)!`);
    } else {
      toast.warning(`Enviado: ${enviados.length} · Falha: ${falhas.length}`);
    }
  };

  const handleReenviar = async (falha) => {
    const numeroCorrigido = numerosCorrecao[falha.cliente_nome] !== undefined
      ? numerosCorrecao[falha.cliente_nome]
      : falha.numero;
    const numero = limparNumero(numeroCorrigido);
    if (!isNumeroValido(numero)) {
      toast.error(`Número inválido: "${numeroCorrigido}" → "${numero}" (esperado 12-15 dígitos com DDI 55)`);
      return;
    }

    const cliente = clientes.find(c => c.cliente_nome === falha.cliente_nome);
    if (!cliente) return;

    setReenvioLoading(prev => ({ ...prev, [falha.cliente_nome]: true }));
    try {
      const res = await base44.functions.invoke('reenviarWhatsAppCliente', {
        rota_id: rota.id,
        cliente_nome: falha.cliente_nome,
        numero_corrigido: numero,
      });

      if (res.data?.success) {
        toast.success(`✅ Reenviado para ${cliente.cliente_nome}!`);
        setResultadoDisparo(prev => ({
          ...prev,
          enviados: [...(prev.enviados || []), { cliente_nome: falha.cliente_nome, numero }],
          falhas: prev.falhas.filter(f => f.cliente_nome !== falha.cliente_nome),
        }));
        // Atualiza estado local da rota
        const atualizado = await base44.entities.RotaCobranca.filter({ id: rota.id });
        if (atualizado?.[0]) onUpdated(atualizado[0]);
      } else {
        toast.error(`Falha: ${res.data?.error || 'Erro desconhecido'}`);
      }
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setReenvioLoading(prev => ({ ...prev, [falha.cliente_nome]: false }));
    }
  };

  const handleConcluir = async () => {
    setConcluindo(true);
    await base44.entities.RotaCobranca.update(rota.id, { status: 'Concluída' });
    const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
    if (rotas?.[0]) onUpdated(rotas[0]);
    setConcluindo(false);
    toast.success('Rota concluída!');
  };

  return (
    <>
      <ModalContainer
        open={true}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span>{rota.codigo_rota}</span>
            <Badge className={rota.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
              {rota.status}
            </Badge>
            {rota.whatsapp_disparado && (
              <Badge className="bg-green-50 text-green-600 border border-green-200">
                <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp Enviado
              </Badge>
            )}
          </div>
        }
        description={`📅 ${formatDate(rota.data_rota)} · 👤 ${rota.cobrador_nome || 'Gil'} · 👥 ${clientes.length} clientes`}
        size="xl"
      >
        {/* Links de Navegação */}
        {(navLinks.maps || navLinks.waze) && (
          <div className="flex gap-2 flex-wrap mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 w-full">🗺️ Abrir rota em:</span>
            {navLinks.maps && (
              <a href={navLinks.maps} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm">
                <Map className="w-4 h-4" /> Google Maps
              </a>
            )}
            {navLinks.waze && (
              <a href={navLinks.waze} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300 transition-colors shadow-sm">
                <Navigation className="w-4 h-4" /> Waze
              </a>
            )}
            <span className="text-[10px] text-slate-400 w-full">Rota com {clientes.filter(c => c.cliente_endereco_completo || c.cliente_cidade || c.cliente_regiao).length} paradas na ordem do itinerário</span>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Button
            onClick={() => setConfirmarDisparo(true)}
            disabled={disparando}
            className="gap-2 bg-green-600 hover:bg-green-700 flex-1"
          >
            {disparando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            {disparando ? 'Enviando...' : rota.whatsapp_disparado ? '🔄 Disparar Novamente' : 'Disparar WhatsApp'}
          </Button>
          <Button variant="outline" onClick={() => setShowPDF(true)} className="gap-2 flex-1">
            <Printer className="w-4 h-4" /> Relatório PDF
          </Button>
          {rota.status === 'Aberta' && (
            <Button variant="outline" onClick={handleConcluir} disabled={concluindo} className="gap-2">
              {concluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Concluir
            </Button>
          )}
        </div>

        {/* Confirmação */}
        {confirmarDisparo && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="font-semibold text-amber-800 mb-1">⚠️ Confirmar Disparo em Massa</p>
            <p className="text-sm text-amber-700 mb-3">
              Enviará mensagens para <strong>{clientes.length} cliente(s)</strong>. Tentará todos os números cadastrados.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleDisparar} className="bg-green-600 hover:bg-green-700">Sim, disparar!</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmarDisparo(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Resultado do disparo */}
        {resultadoDisparo && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              ✅ Disparo concluído! <strong>{resultadoDisparo.enviados.length}</strong> cliente(s) receberam.
              {resultadoDisparo.falhas.length > 0 && (
                <span className="text-red-600 ml-2">❌ Falha em <strong>{resultadoDisparo.falhas.length}</strong> cliente(s).</span>
              )}
            </div>

            {resultadoDisparo.falhas.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Falhas — corrija e reenvie:
                </p>
                {resultadoDisparo.falhas.map((falha, fi) => (
                  <div key={fi} className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-red-700 font-medium min-w-[120px]">{falha.cliente_nome}</span>
                    <Input
                      className="h-8 w-40 text-sm"
                      placeholder={falha.numero || 'Nº telefone'}
                      value={numerosCorrecao[falha.cliente_nome] ?? falha.numero}
                      onChange={e => setNumerosCorrecao(prev => ({ ...prev, [falha.cliente_nome]: e.target.value }))}
                    />
                    <span className="text-xs text-red-500">{falha.erro}</span>
                    <Button
                      size="sm"
                      onClick={() => handleReenviar(falha)}
                      disabled={reenvioLoading[falha.cliente_nome]}
                      className="bg-blue-600 hover:bg-blue-700 h-8 gap-1"
                    >
                      {reenvioLoading[falha.cliente_nome] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Reenviar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista clientes */}
        <div className="space-y-3 max-h-[45vh] overflow-y-auto">
          {clientes.map((cliente, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{cliente.cliente_nome}</p>
                    {cliente.whatsapp_enviado && <Badge className="bg-green-100 text-green-700 text-xs">✓ Enviado</Badge>}
                    {cliente.whatsapp_erro && !cliente.whatsapp_enviado && <Badge className="bg-red-100 text-red-700 text-xs">✗ Falha</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">{cliente.cliente_telefone || 'Sem telefone'}</p>
                </div>
                <span className="font-bold text-blue-700 shrink-0">{formatCurrency(cliente.total_cliente)}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {(cliente.pedidos || []).map((p, pi) => (
                  <div key={pi} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-slate-600">#{p.numero_pedido}</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(p.valor_saldo)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer total */}
        <div className="mt-4 p-4 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
          <span className="text-sm font-semibold text-slate-600">💰 Total da Rota</span>
          <span className="text-xl font-extrabold text-blue-700">{formatCurrency(rota.valor_total_rota)}</span>
        </div>
      </ModalContainer>

      {showPDF && <ImpressaoRotaPDF rota={rota} onClose={() => setShowPDF(false)} />}
    </>
  );
}