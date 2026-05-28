import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Printer,
  RefreshCw,
  Map,
  Zap,
  Save,
  Phone,
  ChevronDown,
  Users,
  Truck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ModalContainer from '@/components/modals/ModalContainer';
import RotaClienteCard from './RotaClienteCard';
import EditarContatoModal from './EditarContatoModal';
import CorrigirErrosModal from './CorrigirErrosModal';
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

const limparNumero = (n) => {
  if (!n) return '';
  const digits = n.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const isNumeroValido = (n) => {
  const d = n.replace(/\D/g, '');
  return d.length >= 12 && d.length <= 15;
};

async function enviarWhatsApp(numero, texto) {
  const url = import.meta.env.VITE_EVOLUTION_API_URL;
  const key = import.meta.env.VITE_EVOLUTION_API_KEY;
  const inst = import.meta.env.VITE_EVOLUTION_INSTANCE;
  const resp = await fetch(`${url}/message/sendText/${inst}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

export default function DetalhesRotaModal({ rota, onClose, onUpdated }) {
  const [localClientes, setLocalClientes] = useState(rota.dados_cobranca || []);
  const [alterado, setAlterado] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [resultadoDisparo, setResultadoDisparo] = useState(null);
  const [numerosCorrecao, setNumerosCorrecao] = useState({});
  const [reenvioLoading, setReenvioLoading] = useState({});
  const [reenvioIndividualLoading, setReenvioIndividualLoading] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [showPreFlight, setShowPreFlight] = useState(false);
  const [preFlightAction, setPreFlightAction] = useState(null);
  const [editarContatoIdx, setEditarContatoIdx] = useState(null);
  const [showCorrigirErros, setShowCorrigirErros] = useState(false);

  const { data: clientesDB = [] } = useQuery({
    queryKey: ['clientes_detalhes_rota'],
    queryFn: () => base44.entities.Cliente.list('nome', 500),
  });

  const { data: representantesDB = [] } = useQuery({
    queryKey: ['representantes_detalhes_rota'],
    queryFn: () => base44.entities.Representante.list('nome', 200),
  });

  const itensAtivos = useMemo(() => localClientes.filter((c) => !c.recusado), [localClientes]);
  const mapsUrls = useMemo(() => gerarUrlsMaps(getParadasValidas(itensAtivos)), [itensAtivos]);
  const totalAtivo = itensAtivos.reduce((s, c) => s + (c.total_cliente || 0), 0);

  // Funções de mutação
  const atualizarLocal = (novosDados) => {
    setLocalClientes(novosDados);
    setAlterado(true);
  };

  const marcarRecusado = async (idx) => {
    const novo = localClientes.map((c, i) =>
      i === idx ? { ...c, recusado: !c.recusado } : c
    );
    setLocalClientes(novo);
    setAlterado(true);
    
    try {
      await base44.entities.RotaCobranca.update(rota.id, { dados_cobranca: novo });
      const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (rotas?.[0]) onUpdated(rotas[0]);
      setAlterado(false);
      toast.success(novo[idx].recusado ? '❌ Marcado como recusado' : '✓ Recusa removida');
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const handleSalvarContato = async ({ telefone, nome }) => {
    if (editarContatoIdx === null) return;
    const novo = [...localClientes];
    novo[editarContatoIdx] = {
      ...novo[editarContatoIdx],
      cliente_telefone: telefone?.trim(),
      contatos_nomeados: [{ telefone: telefone?.trim(), nome: nome?.trim() || '' }],
    };
    
    try {
      await base44.entities.RotaCobranca.update(rota.id, { dados_cobranca: novo });
      const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (rotas?.[0]) onUpdated(rotas[0]);
      setLocalClientes(novo);
      setEditarContatoIdx(null);
      toast.success('✏️ Contato atualizado e salvo');
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const extrairNumeros = (cliente) => {
    const contatosNomeados = cliente.contatos_nomeados?.filter((c) => c.telefone) || [];
    return (contatosNomeados.length
      ? contatosNomeados.map((c) => c.telefone)
      : cliente.todos_telefones?.length
        ? cliente.todos_telefones
        : [cliente.cliente_telefone]
    )
      .map(limparNumero)
      .filter((n) => n && isNumeroValido(n));
  };

  const construirMensagem = (cliente, responsavel = '') => {
    const linhas = (cliente.pedidos || [])
      .map((p) => {
        const tag = p.tipo_item === 'cheque' ? `▪ Cheque ${p.numero_pedido}` : `▪ Pedido ${p.numero_pedido}`;
        return `${tag} — ${formatCurrency(p.valor_saldo)}`;
      })
      .join('\n');

    const saudacao = responsavel ? `Olá *${responsavel}*! 😊` : `Olá *${cliente.cliente_nome}*! 😊`;

    return (
      `${saudacao}\n\n` +
      `Representando *${cliente.cliente_nome}*.\n` +
      `Cobrador *Gil* na região em *${formatDate(rota.data_rota)}*.\n\n` +
      `*📋 Pendências:*\n${linhas || '▪ Consulte nosso financeiro'}\n\n` +
      `*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\n` +
      `Aguardamos! 🙏\n_J&C Esquadrias_`
    );
  };

  const handleReenviarIndividual = async (idx) => {
    const cliente = localClientes[idx];
    const numeros = extrairNumeros(cliente);

    if (!numeros.length) {
      toast.error('Nenhum número válido');
      return;
    }

    const responsavel = cliente.contatos_nomeados?.find((c) => c.nome)?.nome || '';
    const texto = construirMensagem(cliente, responsavel);

    setReenvioIndividualLoading((prev) => ({ ...prev, [idx]: true }));
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
      
      try {
        await base44.entities.RotaCobranca.update(rota.id, { dados_cobranca: novo });
        const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
        if (rotas?.[0]) {
          onUpdated(rotas[0]);
          setLocalClientes(rotas[0].dados_cobranca || []);
        }
        toast.success(`✓ Enviado para ${cliente.cliente_nome}`);
      } catch (e) {
        toast.error(`Erro ao salvar: ${e.message}`);
      }
    } else {
      toast.error(`Erro ao enviar para ${cliente.cliente_nome}`);
    }

    setReenvioIndividualLoading((prev) => ({ ...prev, [idx]: false }));
  };

  const handleDispararClientes = async () => {
    setDisparando(true);
    setResultadoDisparo(null);

    const enviados = [];
    const falhas = [];
    const dadosAtualizados = [...localClientes];

    for (let i = 0; i < localClientes.length; i++) {
      const cliente = localClientes[i];
      if (cliente.recusado) continue;

      const numeros = extrairNumeros(cliente);
      const responsavel = cliente.contatos_nomeados?.find((c) => c.nome)?.nome || '';

      if (!numeros.length) {
        falhas.push({ cliente_nome: cliente.cliente_nome, numero: '', erro: 'Sem telefone' });
        dadosAtualizados[i] = { ...dadosAtualizados[i], whatsapp_enviado: false, whatsapp_erro: 'Sem telefone' };
        continue;
      }

      const texto = construirMensagem(cliente, responsavel);
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
        falhas.push({ cliente_nome: cliente.cliente_nome, numero: numeros[0] || '', erro: 'Falha' });
        dadosAtualizados[i] = { ...dadosAtualizados[i], whatsapp_enviado: false, whatsapp_erro: 'Falha' };
      }
    }

    await base44.entities.RotaCobranca.update(rota.id, {
      whatsapp_disparado: enviados.length > 0,
      dados_cobranca: dadosAtualizados,
    });

    const atualizado = await base44.entities.RotaCobranca.filter({ id: rota.id });
    if (atualizado?.[0]) {
      onUpdated(atualizado[0]);
      setLocalClientes(atualizado[0].dados_cobranca || []);
      setAlterado(false);
    }

    setResultadoDisparo({ enviados, falhas });
    setDisparando(false);
    toast[falhas.length === 0 ? 'success' : 'warning'](
      `${enviados.length} enviado(s) ${falhas.length > 0 ? `· ${falhas.length} falha(s)` : ''}`
    );
  };

  const handleDispararRepresentantes = async () => {
    setDisparando(true);
    const porRep = {};

    itensAtivos.forEach((item) => {
      const repCod = item.representante_codigo || 'Sem Rep';
      if (!porRep[repCod]) {
        const repDB = representantesDB.find((r) => r.codigo === item.representante_codigo);
        porRep[repCod] = {
          nome: item.representante_nome || repCod,
          telefone: repDB?.telefone || '',
          clientes: [],
        };
      }
      porRep[repCod].clientes.push({
        nome: item.cliente_nome,
        cidade: item.cliente_cidade || '',
      });
    });

    let enviados = 0;
    for (const [, rep] of Object.entries(porRep)) {
      const numero = limparNumero(rep.telefone);
      if (!isNumeroValido(numero)) continue;

      const listaClientes = rep.clientes
        .map((c) => `▪ ${c.nome}${c.cidade ? ` (${c.cidade})` : ''}`)
        .join('\n');

      const texto =
        `Olá *${rep.nome}*! 👋\n\n` +
        `O cobrador *Gil* fará a rota de cobrança no dia *${formatDate(rota.data_rota)}*.\n\n` +
        `Os seus clientes que serão visitados são:\n${listaClientes}\n\n` +
        `_J&C Esquadrias_`;

      try {
        await enviarWhatsApp(numero, texto);
        enviados++;
      } catch (_) {}
    }

    setDisparando(false);
    toast.success(`${enviados} representante(s) notificado(s)`);
  };

  const handleDispararCobrador = async () => {
    setDisparando(true);
    const numeroGil = '5511981264504';

    const cidades = [...new Set(itensAtivos.map((i) => i.cliente_cidade).filter(Boolean))].join(', ');
    const listaClientes = itensAtivos.map((i) => i.cliente_nome).join(', ');
    const linksTexto = mapsUrls.map((url, i) => `Parte ${i + 1}: ${url}`).join('\n');

    const texto =
      `Olá *Gil*! 🛵\n\n` +
      `Sua rota do dia *${formatDate(rota.data_rota)}* está pronta!\n\n` +
      `🏙️ Cidades: ${cidades || '—'}\n\n` +
      `👥 Clientes: ${listaClientes || '—'}\n\n` +
      `🗺️ Links das rotas no Maps:\n${linksTexto || '—'}\n\n` +
      `_Sistema J&C_`;

    try {
      await enviarWhatsApp(numeroGil, texto);
      toast.success('✓ Rota enviada para Gil');
    } catch (e) {
      toast.error('Erro ao enviar para Gil');
    }

    setDisparando(false);
  };

  const executarAposPreFlight = async () => {
    setShowPreFlight(false);
    if (preFlightAction === 'clientes') await handleDispararClientes();
    else if (preFlightAction === 'representantes') await handleDispararRepresentantes();
    else if (preFlightAction === 'cobrador') await handleDispararCobrador();
    setPreFlightAction(null);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await base44.entities.RotaCobranca.update(rota.id, { dados_cobranca: localClientes });
      const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (rotas?.[0]) onUpdated(rotas[0]);
      setAlterado(false);
      toast.success('✓ Alterações salvas');
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleConcluir = async () => {
    setConcluindo(true);
    try {
      await base44.entities.RotaCobranca.update(rota.id, { status: 'Concluída' });
      const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (rotas?.[0]) onUpdated(rotas[0]);
      toast.success('✓ Rota concluída');
    } finally {
      setConcluindo(false);
    }
  };

  const handleReenviarFalha = async (falha) => {
    const numeroCorrigido = limparNumero(numerosCorrecao[falha.cliente_nome] ?? falha.numero);
    if (!isNumeroValido(numeroCorrigido)) {
      toast.error('Número inválido');
      return;
    }

    setReenvioLoading((prev) => ({ ...prev, [falha.cliente_nome]: true }));
    try {
      const res = await base44.functions.invoke('reenviarWhatsAppCliente', {
        rota_id: rota.id,
        cliente_nome: falha.cliente_nome,
        numero_corrigido: numeroCorrigido,
      });

      if (res.data?.success) {
        toast.success(`✓ Reenviado para ${falha.cliente_nome}`);
        setResultadoDisparo((prev) => ({
          ...prev,
          enviados: [...(prev.enviados || []), { cliente_nome: falha.cliente_nome, numero: numeroCorrigido }],
          falhas: prev.falhas.filter((f) => f.cliente_nome !== falha.cliente_nome),
        }));
      } else {
        toast.error(res.data?.error || 'Erro');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReenvioLoading((prev) => ({ ...prev, [falha.cliente_nome]: false }));
    }
  };

  const handleErrosCorrigidos = async () => {
    const clientesDBAtualizado = await base44.entities.Cliente.list('codigo', 500);
    const dadosAtualizados = (localClientes || []).map((item) => {
      const clienteDB = clientesDBAtualizado.find((c) => c.codigo === item.cliente_codigo);
      if (clienteDB) {
        const endereco = [clienteDB.endereco, clienteDB.numero].filter(Boolean).join(', ');
        const endereco_completo =
          [endereco, clienteDB.cidade, clienteDB.estado || 'SP'].filter(Boolean).join(', ') + ', Brasil';
        return {
          ...item,
          cliente_cidade: clienteDB.cidade || item.cliente_cidade || '',
          cliente_estado: clienteDB.estado || 'SP',
          cliente_endereco_completo: endereco_completo,
          cliente_latitude: clienteDB.latitude || item.cliente_latitude,
          cliente_longitude: clienteDB.longitude || item.cliente_longitude,
        };
      }
      return item;
    });

    setLocalClientes(dadosAtualizados);
    setAlterado(true);
    setShowCorrigirErros(false);

    setSalvando(true);
    try {
      await base44.entities.RotaCobranca.update(rota.id, { dados_cobranca: dadosAtualizados });
      const atualizado = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (atualizado?.[0]) onUpdated(atualizado[0]);
      setAlterado(false);
      toast.success('✓ Sincronizado e salvo');
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSalvando(false);
    }
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
            {rota.whatsapp_disparado && <Badge className="bg-emerald-100 text-emerald-700">✓ WhatsApp</Badge>}
            {alterado && <Badge className="bg-amber-100 text-amber-700">⚠ Não salvo</Badge>}
          </div>
        }
        description={`${formatDate(rota.data_rota)} · ${rota.cobrador_nome || 'Gil'} · ${itensAtivos.length} ativo(s)`}
        size="xl"
      >
        {/* Maps */}
        {mapsUrls.length > 0 && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-semibold text-slate-600 block mb-2">🗺️ Google Maps</span>
            <div className="flex flex-wrap gap-2">
              {mapsUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-blue-600 hover:bg-blue-50"
                >
                  📍 Parte {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Button variant="outline" size="sm" onClick={() => setShowCorrigirErros(true)} className="gap-1">
            <Zap className="w-3 h-3" /> Corrigir Erros
          </Button>

          {alterado && (
            <Button size="sm" onClick={handleSalvar} disabled={salvando} className="gap-1 bg-amber-600 hover:bg-amber-700">
              {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Salvar
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={disparando} className="gap-1 bg-green-600 hover:bg-green-700 flex-1">
                {disparando ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                WhatsApp
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => { setPreFlightAction('clientes'); setShowPreFlight(true); }}>
                <Users className="w-4 h-4 mr-2" /> Clientes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPreFlightAction('representantes'); setShowPreFlight(true); }}>
                <Users className="w-4 h-4 mr-2" /> Representantes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPreFlightAction('cobrador'); setShowPreFlight(true); }}>
                <Truck className="w-4 h-4 mr-2" /> Gil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => setShowPDF(true)} className="gap-1">
            <Printer className="w-3 h-3" /> PDF
          </Button>

          {rota.status === 'Aberta' && (
            <Button variant="outline" size="sm" onClick={handleConcluir} disabled={concluindo} className="gap-1">
              {concluindo ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Concluir
            </Button>
          )}
        </div>

        {/* Resultado disparo */}
        {resultadoDisparo && (
          <div className="mb-4 space-y-2">
            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              ✓ {resultadoDisparo.enviados.length} enviado(s)
              {resultadoDisparo.falhas?.length > 0 && ` · ❌ ${resultadoDisparo.falhas.length} falha(s)`}
            </div>

            {resultadoDisparo.falhas?.length > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded space-y-1">
                {resultadoDisparo.falhas.map((falha, fi) => (
                  <div key={fi} className="flex items-center gap-1 text-xs">
                    <span className="min-w-[100px]">{falha.cliente_nome}</span>
                    <Input
                      placeholder="Nº"
                      value={numerosCorrecao[falha.cliente_nome] ?? ''}
                      onChange={(e) =>
                        setNumerosCorrecao((prev) => ({
                          ...prev,
                          [falha.cliente_nome]: e.target.value,
                        }))
                      }
                      className="h-6 w-24 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleReenviarFalha(falha)}
                      disabled={reenvioLoading[falha.cliente_nome]}
                      className="h-6 gap-1 bg-blue-600"
                    >
                      {reenvioLoading[falha.cliente_nome] ? <Loader2 className="w-2 h-2 animate-spin" /> : <RefreshCw className="w-2 h-2" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clientes */}
        <div className="space-y-2 max-h-[40vh] overflow-y-auto mb-4">
          {localClientes.map((cliente, idx) => (
            <RotaClienteCard
              key={`${cliente.cliente_codigo}-${cliente.recusado}-${cliente.whatsapp_enviado}`}
              cliente={cliente}
              idx={idx}
              onMarcarRecusado={marcarRecusado}
              onEditarContato={setEditarContatoIdx}
              onReenviarIndividual={handleReenviarIndividual}
              reenvioLoading={reenvioIndividualLoading}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
          <span className="text-sm font-semibold">Total Ativo</span>
          <span className="text-xl font-bold text-blue-700">{formatCurrency(totalAtivo)}</span>
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

      {showCorrigirErros && (
        <CorrigirErrosModal
          rota={rota}
          clientesDB={clientesDB}
          onClose={() => setShowCorrigirErros(false)}
          onCorrigir={handleErrosCorrigidos}
        />
      )}
    </>
  );
}