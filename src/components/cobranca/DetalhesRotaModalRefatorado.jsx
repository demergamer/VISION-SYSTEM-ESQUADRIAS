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
  X,
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
import ImpressaoRotaPDF from './ImpressaoRotaPDF';
import PreFlightModal from './PreFlightModal';
import CorrigirErrosModal from './CorrigirErrosModal';
import EditarContatoModal from './EditarContatoModal';
import { gerarUrlsMaps, getParadasValidas, extrairEnderecoItem } from './mapsUtils';
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

export default function DetalhesRotaModalRefatorado({ rota, onClose, onUpdated }) {
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

  // Dados dos clientes e representantes
  const { data: clientesDB = [] } = useQuery({
    queryKey: ['clientes_lista_cobranca'],
    queryFn: () => base44.entities.Cliente.list('nome', 500),
  });

  const { data: representantesDB = [] } = useQuery({
    queryKey: ['representantes_cobranca'],
    queryFn: () => base44.entities.Representante.list('nome', 200),
  });

  // Derivados
  const itensAtivos = useMemo(() => localClientes.filter((c) => !c.recusado), [localClientes]);
  const mapsUrls = useMemo(() => gerarUrlsMaps(getParadasValidas(itensAtivos)), [itensAtivos]);
  const totalAtivo = itensAtivos.reduce((s, c) => s + (c.total_cliente || 0), 0);

  // ─── Mutações Locais ────────────────────────────────────────────────
  const atualizarLocal = (novosDados) => {
    setLocalClientes(novosDados);
    setAlterado(true);
  };

  const marcarRecusado = (idx) => {
    const novo = localClientes.map((c, i) =>
      i === idx ? { ...c, recusado: !c.recusado } : c
    );
    atualizarLocal(novo);
    toast.info(novo[idx].recusado ? 'Item marcado como recusado.' : 'Recusa removida.');
  };

  const handleSalvarContato = ({ telefone, nome }) => {
    const idx = editarContatoIdx;
    if (idx === null) return;

    const novo = [...localClientes];
    const contatosNomeados = [
      { telefone: telefone?.trim(), nome: nome?.trim() || '' },
      ...(novo[idx].contatos_nomeados || []).filter((_, i) => i > 0),
    ].filter((c) => c.telefone);

    novo[idx] = {
      ...novo[idx],
      cliente_telefone: telefone?.trim(),
      contatos_nomeados: contatosNomeados,
    };

    atualizarLocal(novo);
    setEditarContatoIdx(null);
    toast.success('✏️ Contato atualizado! Clique em "Salvar Alterações" para confirmar.');
  };

  // ─── WhatsApp ──────────────────────────────────────────────────────
  const construirTextoCliente = (cliente, nomeResponsavel = '') => {
    const linhasPedidos = (cliente.pedidos || [])
      .map((p) => {
        const tag = p.tipo_item === 'cheque' ? `▪ Cheque Dev #${p.numero_pedido}` : `▪ Pedido #${p.numero_pedido}`;
        return `${tag} — ${formatCurrency(p.valor_saldo)}`;
      })
      .join('\n');

    const saudacao = nomeResponsavel
      ? `Olá, *${nomeResponsavel}*! 😊`
      : `Olá, *${cliente.cliente_nome}*! 😊`;

    return (
      `${saudacao}\n\n` +
      `Representando *${cliente.cliente_nome}*.\n` +
      `O nosso cobrador *Gil* estará na sua região no dia *${formatDate(rota.data_rota)}*.\n\n` +
      `*📋 Pendências:*\n${linhasPedidos || '▪ Consulte nosso financeiro'}\n\n` +
      `*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\n` +
      `Aguardamos confirmação! 🙏\n_Equipe J&C Esquadrias_`
    );
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

  const handleReenviarIndividual = async (idx) => {
    const cliente = localClientes[idx];
    const numeros = extrairNumeros(cliente);

    if (!numeros.length) {
      toast.error('Nenhum número válido para este cliente. Edite o contato primeiro.');
      return;
    }

    const nomeResponsavel = cliente.contatos_nomeados?.find((c) => c.nome)?.nome || '';
    const texto = construirTextoCliente(cliente, nomeResponsavel);

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
      setLocalClientes(novo);
      await base44.entities.RotaCobranca.update(rota.id, { dados_cobranca: novo });
      onUpdated({ ...rota, dados_cobranca: novo });
      toast.success(`✅ Mensagem enviada para ${cliente.cliente_nome}!`);
    } else {
      toast.error(`Falha ao enviar para ${cliente.cliente_nome}`);
    }

    setReenvioIndividualLoading((prev) => ({ ...prev, [idx]: false }));
  };

  const iniciarAcao = (acao) => {
    setPreFlightAction(acao);
    setShowPreFlight(true);
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
      const nomeResponsavel = cliente.contatos_nomeados?.find((c) => c.nome)?.nome || '';

      if (!numeros.length) {
        falhas.push({ cliente_nome: cliente.cliente_nome, numero: '', erro: 'Número inválido ou ausente' });
        dadosAtualizados[i] = {
          ...dadosAtualizados[i],
          whatsapp_enviado: false,
          whatsapp_erro: 'Número inválido',
        };
        continue;
      }

      const texto = construirTextoCliente(cliente, nomeResponsavel);
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
        dadosAtualizados[i] = {
          ...dadosAtualizados[i],
          whatsapp_enviado: false,
          whatsapp_erro: 'Falha no envio',
        };
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
    falhas.length === 0
      ? toast.success(`✅ WhatsApp enviado para ${enviados.length} cliente(s)!`)
      : toast.warning(`Enviado: ${enviados.length} · Falha: ${falhas.length}`);
  };

  const handleDispararRepresentantes = async () => {
    setDisparando(true);
    try {
      const res = await base44.functions.invoke('dispararWhatsAppGilRep', {
        rota_id: rota.id,
        destino: 'representantes',
      });
      const enviados = res.data?.enviados ?? 0;
      const resultados = res.data?.resultados || [];
      const erros = resultados.filter(r => r.status === 'erro');
      if (erros.length > 0) {
        toast.warning(`${enviados} representante(s) notificado(s) · ${erros.length} sem telefone válido`);
      } else {
        toast.success(`✅ ${enviados} representante(s) notificado(s)!`);
      }
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setDisparando(false);
    }
  };

  const handleDispararCobrador = async () => {
    setDisparando(true);
    try {
      await base44.functions.invoke('dispararWhatsAppGilRep', {
        rota_id: rota.id,
        destino: 'gil',
      });
      toast.success('✅ Mensagem enviada para o Gil!');
    } catch (e) {
      toast.error(`Erro ao enviar para o Gil: ${e.message}`);
    } finally {
      setDisparando(false);
    }
  };

  const executarAposPreFlight = async (action) => {
    const acao = action || preFlightAction;
    setShowPreFlight(false);
    setPreFlightAction(null);
    if (acao === 'clientes') await handleDispararClientes();
    else if (acao === 'representantes') await handleDispararRepresentantes();
    else if (acao === 'cobrador') await handleDispararCobrador();
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const payload = { dados_cobranca: localClientes };
      await base44.entities.RotaCobranca.update(rota.id, payload);
      const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (rotas?.[0]) onUpdated(rotas[0]);
      setAlterado(false);
      toast.success('✅ Alterações salvas!');
    } catch (e) {
      toast.error(`Erro ao salvar: ${e.message}`);
    } finally {
      setSalvando(false);
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

  const handleReenviarFalha = async (falha) => {
    const numeroCorrigido = limparNumero(numerosCorrecao[falha.cliente_nome] ?? falha.numero);
    if (!isNumeroValido(numeroCorrigido)) {
      toast.error('Número inválido para reenvio');
      return;
    }

    const cliente = localClientes.find((c) => c.cliente_nome === falha.cliente_nome);
    if (!cliente) return;

    setReenvioLoading((prev) => ({ ...prev, [falha.cliente_nome]: true }));
    try {
      const res = await base44.functions.invoke('reenviarWhatsAppCliente', {
        rota_id: rota.id,
        cliente_nome: falha.cliente_nome,
        numero_corrigido: numeroCorrigido,
      });

      if (res.data?.success) {
        toast.success(`✅ Reenviado para ${falha.cliente_nome}!`);
        setResultadoDisparo((prev) => ({
          ...prev,
          enviados: [...(prev.enviados || []), { cliente_nome: falha.cliente_nome, numero: numeroCorrigido }],
          falhas: prev.falhas.filter((f) => f.cliente_nome !== falha.cliente_nome),
        }));
        const atualizado = await base44.entities.RotaCobranca.filter({ id: rota.id });
        if (atualizado?.[0]) {
          onUpdated(atualizado[0]);
          setLocalClientes(atualizado[0].dados_cobranca || []);
        }
      } else {
        toast.error(`Falha: ${res.data?.error || 'Erro desconhecido'}`);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReenvioLoading((prev) => ({ ...prev, [falha.cliente_nome]: false }));
    }
  };

  const handleCorrigirErros = async () => {
    setShowCorrigirErros(true);
  };

  const handleErrosCorrigidos = async () => {
    const clientesDBAtualizado = await base44.entities.Cliente.list('codigo', 500);

    let corrigidos = 0;
    const dadosAtualizados = (localClientes || []).map((item) => {
      const clienteDB = clientesDBAtualizado.find((c) => c.codigo === item.cliente_codigo);
      if (clienteDB) {
        const endereco = [clienteDB.endereco, clienteDB.numero].filter(Boolean).join(', ');
        const endereco_completo =
          [endereco, clienteDB.cidade, clienteDB.estado || 'SP'].filter(Boolean).join(', ') +
          ', Brasil';

        const atualizado = {
          ...item,
          cliente_cidade: clienteDB.cidade || item.cliente_cidade || '',
          cliente_estado: clienteDB.estado || 'SP',
          cliente_endereco_completo: endereco_completo,
          cliente_latitude: clienteDB.latitude || item.cliente_latitude || null,
          cliente_longitude: clienteDB.longitude || item.cliente_longitude || null,
        };

        if (atualizado.cliente_cidade !== item.cliente_cidade) corrigidos++;
        return atualizado;
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
      toast.success(`✅ ${corrigidos} cliente(s) sincronizado(s) e salvos!`);
    } catch (e) {
      toast.error(`Erro ao salvar: ${e.message}`);
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
            <Badge
              className={
                rota.status === 'Concluída'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }
            >
              {rota.status}
            </Badge>
            {rota.whatsapp_disparado && (
              <Badge className="bg-green-50 text-green-600 border border-green-200">
                <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp Enviado
              </Badge>
            )}
            {alterado && (
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
                ⚠ Alterações não salvas
              </Badge>
            )}
          </div>
        }
        description={`📅 ${formatDate(rota.data_rota)} · 👤 ${
          rota.cobrador_nome || 'Gil'
        } · 👥 ${localClientes.length} clientes`}
        size="xl"
      >
        {/* Maps */}
        {mapsUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 w-full">🗺️ Rota Google Maps:</span>
            {mapsUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm"
              >
                <Map className="w-4 h-4" /> 📍 Maps Parte {i + 1}
              </a>
            ))}
            <span className="text-[10px] text-slate-400 w-full">
              {itensAtivos.filter((c) => c.cliente_endereco_completo || c.cliente_cidade).length}{' '}
              paradas válidas · {mapsUrls.length} lote(s)
            </span>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Button
            onClick={handleCorrigirErros}
            variant="outline"
            className="gap-2"
            title="Editar dados faltantes dos clientes"
          >
            <Zap className="w-4 h-4" />
            Corrigir Erros
          </Button>

          {alterado && (
            <Button onClick={handleSalvar} disabled={salvando} className="gap-2 bg-amber-500 hover:bg-amber-600">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={disparando}
                className="gap-2 bg-green-600 hover:bg-green-700 flex-1"
              >
                {disparando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
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
            <Button
              variant="outline"
              onClick={handleConcluir}
              disabled={concluindo}
              className="gap-2"
            >
              {concluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Concluir
            </Button>
          )}
        </div>

        {/* Resultado do disparo */}
        {resultadoDisparo && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              ✅ Disparo concluído!{' '}
              <strong>{resultadoDisparo.enviados.length}</strong> enviado(s).
              {resultadoDisparo.falhas?.length > 0 && (
                <span className="text-red-600 ml-2">
                  ❌ Falha: <strong>{resultadoDisparo.falhas.length}</strong>
                </span>
              )}
            </div>

            {resultadoDisparo.falhas?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Falhas — corrija e reenvie:
                </p>
                {resultadoDisparo.falhas.map((falha, fi) => (
                  <div key={fi} className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-red-700 font-medium min-w-[120px]">
                      {falha.cliente_nome}
                    </span>
                    <Input
                      className="h-8 w-40 text-sm"
                      placeholder={falha.numero || 'Nº telefone'}
                      value={numerosCorrecao[falha.cliente_nome] ?? falha.numero}
                      onChange={(e) =>
                        setNumerosCorrecao((prev) => ({
                          ...prev,
                          [falha.cliente_nome]: e.target.value,
                        }))
                      }
                    />
                    <span className="text-xs text-red-500">{falha.erro}</span>
                    <Button
                      size="sm"
                      onClick={() => handleReenviarFalha(falha)}
                      disabled={reenvioLoading[falha.cliente_nome]}
                      className="bg-blue-600 hover:bg-blue-700 h-8 gap-1"
                    >
                      {reenvioLoading[falha.cliente_nome] ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Reenviar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de clientes */}
        <div className="space-y-3 max-h-[45vh] overflow-y-auto">
          {localClientes.map((cliente, idx) => (
            <RotaClienteCard
              key={idx}
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
        <div className="mt-4 p-4 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100 flex-wrap gap-2">
          <span className="text-sm font-semibold text-slate-600">💰 Total Ativo da Rota</span>
          <div className="flex items-center gap-3">
            {alterado && (
              <Button
                onClick={handleSalvar}
                disabled={salvando}
                size="sm"
                className="gap-2 bg-amber-500 hover:bg-amber-600"
              >
                {salvando ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Salvar Alterações
              </Button>
            )}
            <span className="text-xl font-extrabold text-blue-700">{formatCurrency(totalAtivo)}</span>
          </div>
        </div>
      </ModalContainer>

      {/* Modais secundários */}
      {showPDF && <ImpressaoRotaPDF rota={rota} onClose={() => setShowPDF(false)} />}

      {showPreFlight && (
        <PreFlightModal
          itens={itensAtivos}
          clientes={clientesDB}
          representantes={representantesDB}
          action={preFlightAction}
          onConfirm={executarAposPreFlight}
          onClose={() => {
            setShowPreFlight(false);
            setPreFlightAction(null);
          }}
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