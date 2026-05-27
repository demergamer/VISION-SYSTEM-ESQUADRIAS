import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, CheckCircle2, Loader2, AlertTriangle, Printer,
  RefreshCw, Map, Ban, ChevronDown, Users, Truck, Save, Phone, X
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import ModalContainer from '@/components/modals/ModalContainer';
import ImpressaoRotaPDF from './ImpressaoRotaPDF';
import PreFlightModal from './PreFlightModal';
import { gerarUrlsMaps, getParadasValidas } from './mapsUtils';
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

async function enviarWhatsApp(numero, texto) {
  const url = import.meta.env.VITE_EVOLUTION_API_URL;
  const key = import.meta.env.VITE_EVOLUTION_API_KEY;
  const inst = import.meta.env.VITE_EVOLUTION_INSTANCE;
  const resp = await fetch(`${url}/message/sendText/${inst}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': key },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

// ── Mini-modal de edição de contato individual ────────────────────────────────
function EditarContatoModal({ cliente, onSave, onClose }) {
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
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Telefone / WhatsApp *</label>
            <Input
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="Ex: 11999998888"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nome do Responsável</label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
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

export default function DetalhesRotaModal({ rota, onClose, onUpdated }) {
  const [disparando, setDisparando] = useState(false);
  const [resultadoDisparo, setResultadoDisparo] = useState(null);
  const [numerosCorrecao, setNumerosCorrecao] = useState({});
  const [reenvioLoading, setReenvioLoading] = useState({});
  const [concluindo, setConcluindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [preFlightAction, setPreFlightAction] = useState(null);
  const [showPreFlight, setShowPreFlight] = useState(false);
  const [localClientes, setLocalClientes] = useState(rota.dados_cobranca || []);
  const [alterado, setAlterado] = useState(false);
  const [editarContatoIdx, setEditarContatoIdx] = useState(null); // idx do cliente sendo editado
  const [reenvioIndividualLoading, setReenvioIndividualLoading] = useState({});

  const { data: clientesDB = [] } = useQuery({
    queryKey: ['clientes_lista_cobranca'],
    queryFn: () => base44.entities.Cliente.list('nome', 500),
  });
  const { data: representantesDB = [] } = useQuery({
    queryKey: ['representantes_cobranca'],
    queryFn: () => base44.entities.Representante.list('nome', 200),
  });

  const itensAtivos = useMemo(() => localClientes.filter(c => !c.recusado), [localClientes]);
  const mapsUrls = useMemo(() => gerarUrlsMaps(getParadasValidas(itensAtivos)), [itensAtivos]);

  // ── Helpers de mutação local ──────────────────────────────────────────────
  const atualizarLocal = (novosDados) => {
    setLocalClientes(novosDados);
    setAlterado(true);
  };

  // ── Salvar alterações manualmente ─────────────────────────────────────────
  const handleSalvar = async () => {
    setSalvando(true);
    await base44.entities.RotaCobranca.update(rota.id, { dados_cobranca: localClientes });
    onUpdated({ ...rota, dados_cobranca: localClientes });
    setAlterado(false);
    setSalvando(false);
    toast.success('Alterações salvas!');
  };

  // ── Marcar como recusado ──────────────────────────────────────────────────
  const marcarRecusado = (idx) => {
    const novo = localClientes.map((c, i) =>
      i === idx ? { ...c, recusado: !c.recusado } : c
    );
    atualizarLocal(novo);
    toast.info(novo[idx].recusado ? 'Item marcado como recusado.' : 'Recusa removida.');
  };

  // ── Salvar contato editado ────────────────────────────────────────────────
  const handleSalvarContato = ({ telefone, nome }) => {
    const idx = editarContatoIdx;
    const novo = localClientes.map((c, i) => {
      if (i !== idx) return c;
      const contatosNomeados = [{ telefone, nome }, ...(c.contatos_nomeados || []).slice(1)];
      return { ...c, cliente_telefone: telefone, contatos_nomeados: contatosNomeados };
    });
    atualizarLocal(novo);
    setEditarContatoIdx(null);
    toast.success('Contato atualizado! Clique em "Salvar Alterações" para confirmar.');
  };

  // ── Reenvio individual por cliente ────────────────────────────────────────
  const handleReenviarIndividual = async (idx) => {
    const cliente = localClientes[idx];
    const contatosNomeados = cliente.contatos_nomeados?.filter(c => c.telefone) || [];
    const numeros = (contatosNomeados.length
      ? contatosNomeados.map(c => c.telefone)
      : cliente.todos_telefones?.length ? cliente.todos_telefones : [cliente.cliente_telefone]
    ).map(limparNumero).filter(n => n && isNumeroValido(n));

    if (!numeros.length) {
      toast.error('Nenhum número válido para este cliente. Edite o contato primeiro.');
      return;
    }

    const nomeResponsavel = contatosNomeados.find(c => c.nome)?.nome || '';
    const linhasPedidos = (cliente.pedidos || [])
      .map(p => {
        const tag = p.tipo_item === 'cheque' ? `▪ Cheque Dev #${p.numero_pedido}` : `▪ Pedido #${p.numero_pedido}`;
        return `${tag} — ${formatCurrency(p.valor_saldo)}`;
      }).join('\n');

    const saudacao = nomeResponsavel ? `Olá, *${nomeResponsavel}*! 😊` : `Olá, *${cliente.cliente_nome}*! 😊`;
    const texto =
      `${saudacao}\n\n` +
      `Representando *${cliente.cliente_nome}*.\n` +
      `O nosso cobrador *Gil* estará na sua região no dia *${formatDate(rota.data_rota)}*.\n\n` +
      `*📋 Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n` +
      `*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\n` +
      `Aguardamos confirmação! 🙏\n_Equipe J&C Esquadrias_`;

    setReenvioIndividualLoading(prev => ({ ...prev, [idx]: true }));
    let enviou = false;
    for (const numero of numeros) {
      try {
        await enviarWhatsApp(numero, texto);
        enviou = true;
        break;
      } catch (_) {}
    }

    if (enviou) {
      const novo = localClientes.map((c, i) =>
        i === idx ? { ...c, whatsapp_enviado: true, whatsapp_erro: null } : c
      );
      setLocalClientes(novo);
      await base44.entities.RotaCobranca.update(rota.id, { dados_cobranca: novo });
      onUpdated({ ...rota, dados_cobranca: novo });
      toast.success(`✅ Mensagem enviada para ${cliente.cliente_nome}!`);
    } else {
      toast.error(`Falha ao enviar para ${cliente.cliente_nome}`);
    }
    setReenvioIndividualLoading(prev => ({ ...prev, [idx]: false }));
  };

  // ── Pre-flight ────────────────────────────────────────────────────────────
  const iniciarAcao = (acao) => { setPreFlightAction(acao); setShowPreFlight(true); };

  const executarAposPreFlight = async () => {
    setShowPreFlight(false);
    if (preFlightAction === 'clientes') await handleDispararClientes();
    else if (preFlightAction === 'representantes') await handleDispararRepresentantes();
    else if (preFlightAction === 'cobrador') await handleDispararCobrador();
    setPreFlightAction(null);
  };

  // ── Disparo em massa CLIENTES ─────────────────────────────────────────────
  const handleDispararClientes = async () => {
    setDisparando(true);
    setResultadoDisparo(null);

    const enviados = [];
    const falhas = [];
    const dadosAtualizados = [...localClientes];

    for (let i = 0; i < localClientes.length; i++) {
      const cliente = localClientes[i];
      if (cliente.recusado) continue;

      const contatosNomeados = cliente.contatos_nomeados?.filter(c => c.telefone) || [];
      const numeros = (contatosNomeados.length
        ? contatosNomeados.map(c => c.telefone)
        : cliente.todos_telefones?.length ? cliente.todos_telefones : [cliente.cliente_telefone]
      ).map(limparNumero).filter(n => n && isNumeroValido(n));

      const nomeResponsavel = contatosNomeados.find(c => c.nome)?.nome || '';

      if (!numeros.length) {
        falhas.push({ cliente_nome: cliente.cliente_nome, numero: '', erro: 'Número inválido ou ausente' });
        dadosAtualizados[i] = { ...dadosAtualizados[i], whatsapp_enviado: false, whatsapp_erro: 'Número inválido' };
        continue;
      }

      const linhasPedidos = (cliente.pedidos || [])
        .map(p => {
          const tag = p.tipo_item === 'cheque' ? `▪ Cheque Dev #${p.numero_pedido}` : `▪ Pedido #${p.numero_pedido}`;
          return `${tag} — ${formatCurrency(p.valor_saldo)}`;
        }).join('\n');

      const saudacao = nomeResponsavel ? `Olá, *${nomeResponsavel}*! 😊` : `Olá, *${cliente.cliente_nome}*! 😊`;
      const texto =
        `${saudacao}\n\n` +
        `Representando *${cliente.cliente_nome}*.\n` +
        `O nosso cobrador *Gil* estará na sua região no dia *${formatDate(rota.data_rota)}*.\n\n` +
        `*📋 Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n` +
        `*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\n` +
        `Aguardamos confirmação! 🙏\n_Equipe J&C Esquadrias_`;

      let enviou = false;
      for (const numero of numeros) {
        try {
          await enviarWhatsApp(numero, texto);
          enviados.push({ cliente_nome: cliente.cliente_nome, numero });
          dadosAtualizados[i] = { ...dadosAtualizados[i], whatsapp_enviado: true, whatsapp_erro: null };
          enviou = true;
          break;
        } catch (_) {}
      }
      if (!enviou) {
        falhas.push({ cliente_nome: cliente.cliente_nome, numero: numeros[0] || '', erro: 'Falha no envio' });
        dadosAtualizados[i] = { ...dadosAtualizados[i], whatsapp_enviado: false, whatsapp_erro: 'Falha no envio' };
      }
    }

    await base44.entities.RotaCobranca.update(rota.id, {
      whatsapp_disparado: enviados.length > 0,
      dados_cobranca: dadosAtualizados,
    });
    const atualizado = await base44.entities.RotaCobranca.filter({ id: rota.id });
    if (atualizado?.[0]) { onUpdated(atualizado[0]); setLocalClientes(atualizado[0].dados_cobranca || []); setAlterado(false); }

    setResultadoDisparo({ enviados, falhas });
    setDisparando(false);
    falhas.length === 0
      ? toast.success(`✅ WhatsApp enviado para ${enviados.length} cliente(s)!`)
      : toast.warning(`Enviado: ${enviados.length} · Falha: ${falhas.length}`);
  };

  // ── Disparo REPRESENTANTES ────────────────────────────────────────────────
  const handleDispararRepresentantes = async () => {
    setDisparando(true);
    const porRep = {};
    itensAtivos.forEach(item => {
      const repCod = item.representante_codigo || item.representante_nome || 'Sem Rep';
      if (!porRep[repCod]) {
        const repDB = representantesDB.find(r => r.codigo === item.representante_codigo);
        porRep[repCod] = { nome: item.representante_nome || repCod, telefone: repDB?.telefone || '', clientes: [] };
      }
      porRep[repCod].clientes.push(`${item.cliente_nome}${item.cliente_cidade ? ' (' + item.cliente_cidade + ')' : ''}`);
    });

    let enviados = 0;
    for (const [, rep] of Object.entries(porRep)) {
      const numero = limparNumero(rep.telefone);
      if (!isNumeroValido(numero)) continue;
      const texto =
        `Olá *${rep.nome}*! 👋\n\n` +
        `O cobrador *Gil* fará a rota de cobrança no dia *${formatDate(rota.data_rota)}*.\n\n` +
        `Os seus clientes que serão visitados são:\n📍 ${rep.clientes.join(', ')}\n\n` +
        `_Equipe J&C Esquadrias_`;
      try { await enviarWhatsApp(numero, texto); enviados++; } catch (_) {}
    }

    setDisparando(false);
    toast.success(`✅ Mensagens enviadas para ${enviados} representante(s)!`);
  };

  // ── Disparo COBRADOR ──────────────────────────────────────────────────────
  const handleDispararCobrador = async () => {
    setDisparando(true);
    const numeroGil = '5511981264504';
    const cidades = [...new Set(itensAtivos.map(i => i.cliente_cidade).filter(Boolean))].join(', ');
    const listaClientes = itensAtivos.map(i => i.cliente_nome).join(', ');
    const linksTexto = mapsUrls.map((url, i) => `Parte ${i + 1}: ${url}`).join('\n');
    const texto =
      `Olá *Gil*! 🛵\n\n` +
      `Sua rota do dia *${formatDate(rota.data_rota)}* está pronta!\n\n` +
      `🏙️ *Cidades:* ${cidades || '—'}\n\n` +
      `👥 *Clientes:* ${listaClientes || '—'}\n\n` +
      `🗺️ *Links do Maps:*\n${linksTexto || '—'}\n\n` +
      `_Sistema J&C Esquadrias_`;
    try {
      await enviarWhatsApp(numeroGil, texto);
      toast.success('✅ Mensagem enviada para o Gil!');
    } catch (e) { toast.error('Erro ao enviar para o Gil: ' + e.message); }
    setDisparando(false);
  };

  // ── Reenvio da lista de falhas ────────────────────────────────────────────
  const handleReenviarFalha = async (falha) => {
    const numeroCorrigido = limparNumero(numerosCorrecao[falha.cliente_nome] ?? falha.numero);
    if (!isNumeroValido(numeroCorrigido)) { toast.error('Número inválido para reenvio'); return; }
    const cliente = localClientes.find(c => c.cliente_nome === falha.cliente_nome);
    if (!cliente) return;
    setReenvioLoading(prev => ({ ...prev, [falha.cliente_nome]: true }));
    try {
      const res = await base44.functions.invoke('reenviarWhatsAppCliente', {
        rota_id: rota.id, cliente_nome: falha.cliente_nome, numero_corrigido: numeroCorrigido,
      });
      if (res.data?.success) {
        toast.success(`✅ Reenviado para ${falha.cliente_nome}!`);
        setResultadoDisparo(prev => ({
          ...prev,
          enviados: [...(prev.enviados || []), { cliente_nome: falha.cliente_nome, numero: numeroCorrigido }],
          falhas: prev.falhas.filter(f => f.cliente_nome !== falha.cliente_nome),
        }));
        const atualizado = await base44.entities.RotaCobranca.filter({ id: rota.id });
        if (atualizado?.[0]) { onUpdated(atualizado[0]); setLocalClientes(atualizado[0].dados_cobranca || []); }
      } else { toast.error(`Falha: ${res.data?.error || 'Erro desconhecido'}`); }
    } catch (e) { toast.error(e.message); }
    finally { setReenvioLoading(prev => ({ ...prev, [falha.cliente_nome]: false })); }
  };

  // ── Concluir rota ─────────────────────────────────────────────────────────
  const handleConcluir = async () => {
    setConcluindo(true);
    await base44.entities.RotaCobranca.update(rota.id, { status: 'Concluída' });
    const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
    if (rotas?.[0]) onUpdated(rotas[0]);
    setConcluindo(false);
    toast.success('Rota concluída!');
  };

  const totalAtivo = itensAtivos.reduce((s, c) => s + (c.total_cliente || 0), 0);

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
            {alterado && (
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200">⚠ Alterações não salvas</Badge>
            )}
          </div>
        }
        description={`📅 ${formatDate(rota.data_rota)} · 👤 ${rota.cobrador_nome || 'Gil'} · 👥 ${localClientes.length} clientes`}
        size="xl"
      >
        {/* ── Links do Maps ── */}
        {mapsUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 w-full">🗺️ Rota Google Maps:</span>
            {mapsUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm">
                <Map className="w-4 h-4" /> 📍 Maps Parte {i + 1}
              </a>
            ))}
            <span className="text-[10px] text-slate-400 w-full">
              {itensAtivos.filter(c => c.cliente_endereco_completo || c.cliente_cidade).length} paradas válidas · {mapsUrls.length} lote(s)
            </span>
          </div>
        )}

        {/* ── Ações ── */}
        <div className="flex gap-2 flex-wrap mb-4">
          {/* Salvar alterações */}
          {alterado && (
            <Button onClick={handleSalvar} disabled={salvando} className="gap-2 bg-amber-500 hover:bg-amber-600">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          )}

          {/* WhatsApp dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={disparando} className="gap-2 bg-green-600 hover:bg-green-700 flex-1">
                {disparando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {disparando ? 'Enviando...' : 'Disparar WhatsApp'}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => iniciarAcao('clientes')} className="gap-2">
                <Users className="w-4 h-4 text-green-600" /> Para Clientes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => iniciarAcao('representantes')} className="gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Para Representantes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => iniciarAcao('cobrador')} className="gap-2">
                <Truck className="w-4 h-4 text-orange-600" /> Para o Cobrador (Gil)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

        {/* ── Resultado do disparo em massa ── */}
        {resultadoDisparo && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              ✅ Disparo concluído! <strong>{resultadoDisparo.enviados.length}</strong> enviado(s).
              {resultadoDisparo.falhas?.length > 0 && (
                <span className="text-red-600 ml-2">❌ Falha: <strong>{resultadoDisparo.falhas.length}</strong></span>
              )}
            </div>
            {resultadoDisparo.falhas?.length > 0 && (
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
                    <Button size="sm" onClick={() => handleReenviarFalha(falha)}
                      disabled={reenvioLoading[falha.cliente_nome]} className="bg-blue-600 hover:bg-blue-700 h-8 gap-1">
                      {reenvioLoading[falha.cliente_nome] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Reenviar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Lista de clientes ── */}
        <div className="space-y-3 max-h-[45vh] overflow-y-auto">
          {localClientes.map((cliente, idx) => (
            <div key={idx} className={`border rounded-xl overflow-hidden transition-all ${cliente.recusado ? 'border-slate-300 opacity-60' : 'border-slate-200'}`}>
              <div className={`flex items-center gap-3 p-3 ${cliente.recusado ? 'bg-slate-100' : 'bg-slate-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold text-sm ${cliente.recusado ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {cliente.cliente_nome}
                    </p>
                    {cliente.recusado && <Badge className="bg-slate-200 text-slate-500 text-xs">[RECUSADO]</Badge>}
                    {cliente.whatsapp_enviado && !cliente.recusado && <Badge className="bg-green-100 text-green-700 text-xs">✓ Enviado</Badge>}
                    {cliente.whatsapp_erro && !cliente.whatsapp_enviado && !cliente.recusado && <Badge className="bg-red-100 text-red-700 text-xs">✗ Falha</Badge>}
                  </div>
                  {/* Contatos */}
                  {!cliente.recusado && (cliente.contatos_nomeados?.length ? cliente.contatos_nomeados.slice(0, 2) :
                    cliente.cliente_telefone ? [{ telefone: cliente.cliente_telefone, nome: '' }] : []
                  ).map((c, ci) => (
                    <div key={ci} className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5">{c.telefone}</span>
                      {c.nome && <span className="text-xs text-slate-500">{c.nome}</span>}
                    </div>
                  ))}
                  {!cliente.recusado && !cliente.contatos_nomeados?.length && !cliente.cliente_telefone && (
                    <p className="text-xs text-red-400">Sem telefone</p>
                  )}
                </div>

                {/* Ações por cliente */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`font-bold text-sm mr-1 ${cliente.recusado ? 'text-slate-400' : 'text-blue-700'}`}>
                    {formatCurrency(cliente.total_cliente)}
                  </span>

                  {/* Editar contato */}
                  {!cliente.recusado && (
                    <Button
                      size="sm" variant="ghost"
                      title="Editar contato"
                      onClick={() => setEditarContatoIdx(idx)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  {/* Reenviar WhatsApp individual */}
                  {!cliente.recusado && (
                    <Button
                      size="sm" variant="ghost"
                      title="Reenviar WhatsApp"
                      onClick={() => handleReenviarIndividual(idx)}
                      disabled={reenvioIndividualLoading[idx]}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-green-600"
                    >
                      {reenvioIndividualLoading[idx]
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />}
                    </Button>
                  )}

                  {/* Marcar recusado */}
                  <Button
                    size="sm" variant="ghost"
                    title={cliente.recusado ? 'Remover recusa' : 'Marcar como recusado'}
                    onClick={() => marcarRecusado(idx)}
                    className={`h-7 w-7 p-0 ${cliente.recusado ? 'text-green-600 hover:text-green-700' : 'text-slate-400 hover:text-red-500'}`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {(cliente.pedidos || []).map((p, pi) => (
                  <div key={pi} className="flex items-center justify-between px-4 py-2 text-sm gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.tipo_item === 'cheque'
                        ? <Badge className="bg-red-100 text-red-800 text-[10px]">[CHEQUE DEV #{p.numero_pedido}]</Badge>
                        : <Badge className="bg-blue-100 text-blue-800 text-[10px]">[PEDIDO #{p.numero_pedido}]</Badge>
                      }
                    </div>
                    <span className={`font-semibold shrink-0 ${cliente.recusado ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {formatCurrency(p.valor_saldo)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 p-4 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100 flex-wrap gap-2">
          <span className="text-sm font-semibold text-slate-600">💰 Total Ativo da Rota</span>
          <div className="flex items-center gap-3">
            {alterado && (
              <Button onClick={handleSalvar} disabled={salvando} size="sm" className="gap-2 bg-amber-500 hover:bg-amber-600">
                {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Salvar Alterações
              </Button>
            )}
            <span className="text-xl font-extrabold text-blue-700">{formatCurrency(totalAtivo)}</span>
          </div>
        </div>
      </ModalContainer>

      {showPDF && <ImpressaoRotaPDF rota={rota} onClose={() => setShowPDF(false)} />}

      {showPreFlight && (
        <PreFlightModal
          itens={itensAtivos}
          clientes={clientesDB}
          representantes={representantesDB}
          onConfirm={executarAposPreFlight}
          onClose={() => { setShowPreFlight(false); setPreFlightAction(null); }}
        />
      )}

      {editarContatoIdx !== null && (
        <EditarContatoModal
          cliente={localClientes[editarContatoIdx]}
          onSave={handleSalvarContato}
          onClose={() => setEditarContatoIdx(null)}
        />
      )}
    </>
  );
}