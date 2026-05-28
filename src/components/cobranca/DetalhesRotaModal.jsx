Precisamos unificar e atualizar o componente de Detalhes da Rota para que ele funcione perfeitamente com a nova arquitetura normalizada (onde a entidade RotaCobranca salva apenas `itens_rota` com os IDs, em vez do JSON pesado).

Por favor, substitua todo o conteúdo do `DetalhesRotaModal.jsx` e do `CorrigirErrosModal.jsx` pelos códigos abaixo.

### 1. src/components/cobranca/DetalhesRotaModal.jsx
```jsx
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, CheckCircle2, Loader2, AlertTriangle, Printer, RefreshCw,
  Map as MapIcon, Zap, Save, ChevronDown, Users, Truck
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ModalContainer from '@/components/modals/ModalContainer';
import RotaClienteCard from './RotaClienteCard';
import EditarContatoModal from './EditarContatoModal';
import CorrigirErrosModal from './CorrigirErrosModal';
import ImpressaoRotaPDF from './ImpressaoRotaPDF';
import PreFlightModal from './PreFlightModal';
import { gerarUrlsMaps, getParadasValidas } from './mapsUtils';
import { toast } from 'sonner';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
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
  const queryClient = useQueryClient();
  
  // O estado local reflete a nova entidade (itens_rota)
  const [itensRota, setItensRota] = useState(rota.itens_rota || []);
  const [alterado, setAlterado] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  
  const [resultadoDisparo, setResultadoDisparo] = useState(null);
  const [numerosCorrecao, setNumerosCorrecao] = useState({});
  const [reenvioLoading, setReenvioLoading] = useState({});
  const [reenvioIndividualLoading, setReenvioIndividualLoading] = useState({});
  
  const [showPDF, setShowPDF] = useState(false);
  const [showPreFlight, setShowPreFlight] = useState(false);
  const [preFlightAction, setPreFlightAction] = useState(null);
  const [editarContatoIdx, setEditarContatoIdx] = useState(null);
  const [showCorrigirErros, setShowCorrigirErros] = useState(false);

  // ── Queries para popular a rota em tempo real ──
  const idsPedidos = useMemo(() => itensRota.filter(i => i.tipo === 'pedido').map(i => i.item_id), [itensRota]);
  const idsCheques = useMemo(() => itensRota.filter(i => i.tipo === 'cheque').map(i => i.item_id), [itensRota]);

  const { data: pedidosData = [], isLoading: loadP } = useQuery({
    queryKey: ['rota_pedidos', rota.id],
    queryFn: () => idsPedidos.length ? base44.entities.Pedido.filter({ id: { '$in': idsPedidos } }, '', 1000) : [],
  });

  const { data: chequesData = [], isLoading: loadC } = useQuery({
    queryKey: ['rota_cheques', rota.id],
    queryFn: () => idsCheques.length ? base44.entities.Cheque.filter({ id: { '$in': idsCheques } }, '', 500) : [],
  });

  const { data: clientesData = [], isLoading: loadCli } = useQuery({
    queryKey: ['rota_clientes_detalhes'],
    queryFn: () => base44.entities.Cliente.list('nome', 1000),
  });

  const { data: representantesData = [] } = useQuery({
    queryKey: ['rota_reps_detalhes'],
    queryFn: () => base44.entities.Representante.list('nome', 500),
  });

  const isLoadingData = loadP || loadC || loadCli;

  // ── Agrupamento Dinâmico (Transforma IDs no layout que a UI espera) ──
  const clientesAgrupados = useMemo(() => {
    if (isLoadingData || !itensRota.length) return [];
    const map = new Map();

    itensRota.forEach(rotaItem => {
      const itemDB = rotaItem.tipo === 'pedido'
        ? pedidosData.find(p => p.id === rotaItem.item_id)
        : chequesData.find(c => c.id === rotaItem.item_id);

      if (!itemDB) return;

      const codCli = rotaItem.cliente_codigo || itemDB.cliente_codigo;
      const clienteDB = clientesData.find(c => c.codigo === codCli) || {};
      const repDB = representantesData.find(r => r.codigo === itemDB.representante_codigo) || {};

      const key = codCli || itemDB.cliente_nome || 'sem_cliente';

      if (!map.has(key)) {
        const contatos = [];
        if (clienteDB.telefone_1) contatos.push({ telefone: clienteDB.telefone_1, nome: clienteDB.responsavel_1 || 'Principal' });
        if (clienteDB.telefone_2) contatos.push({ telefone: clienteDB.telefone_2, nome: clienteDB.responsavel_2 || 'Secundário' });
        (clienteDB.contatos_lista || []).forEach(c => {
          if (c.telefone) contatos.push({ telefone: c.telefone, nome: c.nome_responsavel || '' });
        });

        const endParts = [clienteDB.endereco, clienteDB.numero, clienteDB.cidade, clienteDB.estado || 'SP'].filter(Boolean);
        const endereco_completo = clienteDB.cidade ? endParts.join(', ') + ', Brasil' : '';

        map.set(key, {
          cliente_codigo: codCli,
          cliente_nome: clienteDB.nome || itemDB.cliente_nome || 'Desconhecido',
          representante_codigo: repDB.codigo,
          representante_nome: repDB.nome || itemDB.representante_nome || '',
          cliente_telefone: clienteDB.telefone_1 || '',
          todos_telefones: contatos.map(c => c.telefone),
          contatos_nomeados: contatos,
          cliente_cidade: clienteDB.cidade || '',
          cliente_endereco_completo: endereco_completo,
          cliente_latitude: clienteDB.latitude || null,
          cliente_longitude: clienteDB.longitude || null,
          pedidos: [],
          total_cliente: 0,
          recusado: rotaItem.recusado, // O status de recusado do primeiro item define o bloco
          whatsapp_enviado: rotaItem.whatsapp_enviado,
          whatsapp_erro: rotaItem.whatsapp_erro,
        });
      }

      const group = map.get(key);
      const valorSaldo = rotaItem.tipo === 'cheque'
        ? ((itemDB.valor || 0) - (itemDB.valor_pago || 0))
        : (itemDB.saldo_restante ?? itemDB.valor_pedido ?? 0);

      group.pedidos.push({
        pedido_id: itemDB.id,
        tipo_item: rotaItem.tipo,
        numero_pedido: rotaItem.tipo === 'cheque' ? itemDB.numero_cheque : itemDB.numero_pedido,
        valor_saldo: valorSaldo,
        _item_rota_id: rotaItem.item_id
      });
      group.total_cliente += valorSaldo;
    });

    return Array.from(map.values());
  }, [itensRota, pedidosData, chequesData, clientesData, representantesData, isLoadingData]);

  // ── Variáveis Derivadas ──
  const itensAtivos = useMemo(() => clientesAgrupados.filter(c => !c.recusado), [clientesAgrupados]);
  const mapsUrls = useMemo(() => gerarUrlsMaps(getParadasValidas(itensAtivos)), [itensAtivos]);
  const totalAtivo = itensAtivos.reduce((s, c) => s + (c.total_cliente || 0), 0);

  // ── Mutações Locais ──
  const handleMarcarRecusado = (idxCliente) => {
    const clienteAlvo = clientesAgrupados[idxCliente];
    const novoStatus = !clienteAlvo.recusado;

    // Atualiza todos os itens que pertencem a este cliente
    const novosItens = itensRota.map(item => {
      if (item.cliente_codigo === clienteAlvo.cliente_codigo) {
        return { ...item, recusado: novoStatus };
      }
      return item;
    });

    setItensRota(novosItens);
    setAlterado(true);
    toast.info(novoStatus ? '❌ Marcado como recusado' : '✓ Recusa removida');
  };

  const handleSalvarContato = async ({ telefone, nome }) => {
    if (editarContatoIdx === null) return;
    const clienteAlvo = clientesAgrupados[editarContatoIdx];

    if (clienteAlvo.cliente_codigo) {
      const cliDB = clientesData.find(c => c.codigo === clienteAlvo.cliente_codigo);
      if (cliDB) {
        try {
          await base44.entities.Cliente.update(cliDB.id, { telefone_1: telefone.trim() });
          queryClient.invalidateQueries({ queryKey: ['rota_clientes_detalhes'] });
          toast.success('✏️ Telefone atualizado no cadastro do cliente!');
        } catch (e) {
          toast.error('Erro ao atualizar telefone: ' + e.message);
        }
      }
    }
    setEditarContatoIdx(null);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await base44.entities.RotaCobranca.update(rota.id, { itens_rota: itensRota });
      const rotas = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (rotas?.[0]) onUpdated(rotas[0]);
      setAlterado(false);
      toast.success('✓ Alterações salvas!');
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
      toast.success('✓ Rota concluída!');
    } finally {
      setConcluindo(false);
    }
  };

  // ── WhatsApp Lógica ──
  const extrairNumeros = (cliente) => {
    const contatos = cliente.contatos_nomeados?.filter(c => c.telefone) || [];
    return (contatos.length ? contatos.map(c => c.telefone) : cliente.todos_telefones)
      .map(limparNumero)
      .filter(n => n && isNumeroValido(n));
  };

  const construirMensagem = (cliente, responsavel = '') => {
    const linhas = (cliente.pedidos || []).map(p => {
      const tag = p.tipo_item === 'cheque' ? `▪ Cheque ${p.numero_pedido}` : `▪ Pedido ${p.numero_pedido}`;
      return `${tag} — ${formatCurrency(p.valor_saldo)}`;
    }).join('\n');

    const saudacao = responsavel ? `Olá *${responsavel}*! 😊` : `Olá *${cliente.cliente_nome}*! 😊`;

    return `${saudacao}\n\nRepresentando *${cliente.cliente_nome}*.\nCobrador *Gil* na região em *${formatDate(rota.data_rota)}*.\n\n*📋 Pendências:*\n${linhas || 'Consulte o financeiro'}\n\n*💰 Total: ${formatCurrency(cliente.total_cliente)}*\n\nAguardamos! 🙏\n_J&C Esquadrias_`;
  };

  const atualizarEnvioNoEstado = async (codCliente, status, erroMsg = null) => {
    const novosItens = itensRota.map(item => {
      if (item.cliente_codigo === codCliente) {
        return { ...item, whatsapp_enviado: status, whatsapp_erro: erroMsg };
      }
      return item;
    });
    setItensRota(novosItens);
    await base44.entities.RotaCobranca.update(rota.id, { itens_rota: novosItens, whatsapp_disparado: true });
    return novosItens;
  };

  const handleDispararClientes = async () => {
    setDisparando(true);
    setResultadoDisparo(null);
    const enviados = [];
    const falhas = [];

    for (const cliente of clientesAgrupados) {
      if (cliente.recusado) continue;

      const numeros = extrairNumeros(cliente);
      const responsavel = cliente.contatos_nomeados?.[0]?.nome || '';

      if (!numeros.length) {
        falhas.push({ cliente_nome: cliente.cliente_nome, cliente_codigo: cliente.cliente_codigo, numero: '', erro: 'Sem telefone' });
        await atualizarEnvioNoEstado(cliente.cliente_codigo, false, 'Sem telefone');
        continue;
      }

      const texto = construirMensagem(cliente, responsavel);
      let enviou = false;

      for (const numero of numeros) {
        try {
          await enviarWhatsApp(numero, texto);
          enviados.push({ cliente_nome: cliente.cliente_nome, numero });
          await atualizarEnvioNoEstado(cliente.cliente_codigo, true, null);
          enviou = true;
          break;
        } catch (_) {}
      }

      if (!enviou) {
        falhas.push({ cliente_nome: cliente.cliente_nome, cliente_codigo: cliente.cliente_codigo, numero: numeros[0], erro: 'Falha no envio' });
        await atualizarEnvioNoEstado(cliente.cliente_codigo, false, 'Falha no envio');
      }
    }

    setAlterado(false); // Já foi salvo via atualizarEnvioNoEstado
    setResultadoDisparo({ enviados, falhas });
    setDisparando(false);
    toast[falhas.length === 0 ? 'success' : 'warning'](`${enviados.length} enviado(s) ${falhas.length > 0 ? `· ${falhas.length} falha(s)` : ''}`);
  };

  const handleReenviarIndividual = async (idx) => {
    const cliente = clientesAgrupados[idx];
    const numeros = extrairNumeros(cliente);

    if (!numeros.length) return toast.error('Nenhum número válido cadastrado.');

    setReenvioIndividualLoading(prev => ({ ...prev, [idx]: true }));
    const texto = construirMensagem(cliente, cliente.contatos_nomeados?.[0]?.nome || '');
    let enviou = false;

    for (const numero of numeros) {
      try {
        await enviarWhatsApp(numero, texto);
        enviou = true;
        break;
      } catch (_) {}
    }

    if (enviou) {
      await atualizarEnvioNoEstado(cliente.cliente_codigo, true, null);
      toast.success(`✓ Enviado para ${cliente.cliente_nome}`);
    } else {
      toast.error(`Falha ao enviar para ${cliente.cliente_nome}`);
    }
    setReenvioIndividualLoading(prev => ({ ...prev, [idx]: false }));
  };

  const handleDispararRepresentantes = async () => {
    setDisparando(true);
    try {
      const res = await base44.functions.invoke('dispararWhatsAppGilRep', { rota_id: rota.id, destino: 'representantes' });
      toast.success(`✓ Representantes notificados!`);
    } catch (e) { toast.error(`Erro: ${e.message}`); } 
    finally { setDisparando(false); }
  };

  const handleDispararCobrador = async () => {
    setDisparando(true);
    try {
      await base44.functions.invoke('dispararWhatsAppGilRep', { rota_id: rota.id, destino: 'gil' });
      toast.success('✓ Rota enviada para Gil');
    } catch (e) { toast.error(`Erro: ${e.message}`); } 
    finally { setDisparando(false); }
  };

  const executarAposPreFlight = async (action) => {
    const acao = action || preFlightAction;
    setShowPreFlight(false);
    setPreFlightAction(null);
    if (acao === 'clientes') await handleDispararClientes();
    else if (acao === 'representantes') await handleDispararRepresentantes();
    else if (acao === 'cobrador') await handleDispararCobrador();
  };

  const onErrosCorrigidos = () => {
    setShowCorrigirErros(false);
    queryClient.invalidateQueries({ queryKey: ['rota_clientes_detalhes'] });
  };

  return (
    <>
      <ModalContainer
        open={true} onClose={onClose} size="xl"
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span>{rota.codigo_rota}</span>
            <Badge className={rota.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{rota.status}</Badge>
            {rota.whatsapp_disparado && <Badge className="bg-emerald-100 text-emerald-700">✓ WhatsApp</Badge>}
            {alterado && <Badge className="bg-amber-100 text-amber-700">⚠ Não salvo</Badge>}
          </div>
        }
        description={`${formatDate(rota.data_rota)} · ${rota.cobrador_nome || 'Gil'} · ${itensAtivos.length} cliente(s) na rota`}
      >
        {isLoadingData ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" /> Montando rota e agrupando clientes...
          </div>
        ) : (
          <>
            {/* Maps */}
            {mapsUrls.length > 0 && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-semibold text-slate-600 block mb-2">🗺️ Google Maps (Bypassing limite de 10 paradas)</span>
                <div className="flex flex-wrap gap-2">
                  {mapsUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-blue-600 hover:bg-blue-50 shadow-sm">
                      📍 Link da Parte {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Ações Topo */}
            <div className="flex gap-2 flex-wrap mb-4">
              <Button variant="outline" size="sm" onClick={() => setShowCorrigirErros(true)} className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                <Zap className="w-3 h-3" /> Auto-Corrigir Cadastros
              </Button>

              {alterado && (
                <Button size="sm" onClick={handleSalvar} disabled={salvando} className="gap-1 bg-amber-600 hover:bg-amber-700">
                  {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar Mudanças
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={disparando} className="gap-1 bg-green-600 hover:bg-green-700 flex-1">
                    {disparando ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />} Disparar WhatsApp <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => { setPreFlightAction('clientes'); setShowPreFlight(true); }}>
                    <Users className="w-4 h-4 mr-2 text-green-600" /> Para Clientes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setPreFlightAction('representantes'); setShowPreFlight(true); }}>
                    <Users className="w-4 h-4 mr-2 text-blue-600" /> Para Representantes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setPreFlightAction('cobrador'); setShowPreFlight(true); }}>
                    <Truck className="w-4 h-4 mr-2 text-orange-600" /> Para o Cobrador (Gil)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm" onClick={() => setShowPDF(true)} className="gap-1 border-blue-200 text-blue-700 hover:bg-blue-50">
                <Printer className="w-3 h-3" /> Relatório PDF
              </Button>

              {rota.status === 'Aberta' && (
                <Button variant="outline" size="sm" onClick={handleConcluir} disabled={concluindo} className="gap-1">
                  {concluindo ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-green-600" />} Concluir
                </Button>
              )}
            </div>

            {/* Painel de Resultados do Disparo */}
            {resultadoDisparo && (
              <div className="mb-4 space-y-2">
                <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 font-medium">
                  ✓ {resultadoDisparo.enviados.length} clientes receberam o resumo de cobrança!
                </div>
                {resultadoDisparo.falhas?.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                    <p className="text-xs font-bold text-red-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Falharam ({resultadoDisparo.falhas.length})</p>
                    {resultadoDisparo.falhas.map((falha, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-xs">
                        <span className="min-w-[120px] font-medium truncate">{falha.cliente_nome}</span>
                        <Input placeholder="Corrigir Nº" value={numerosCorrecao[falha.cliente_nome] ?? ''} onChange={(e) => setNumerosCorrecao(p => ({ ...p, [falha.cliente_nome]: e.target.value }))} className="h-7 w-32 text-xs" />
                        <Button size="sm" disabled={true} className="h-7 bg-slate-300">Arrume no lápis abaixo ↓</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clientes Listados */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto mb-4 p-1">
              {clientesAgrupados.map((cliente, idx) => (
                <RotaClienteCard
                  key={cliente.cliente_codigo}
                  cliente={cliente}
                  idx={idx}
                  onMarcarRecusado={handleMarcarRecusado}
                  onEditarContato={setEditarContatoIdx}
                  onReenviarIndividual={handleReenviarIndividual}
                  reenvioLoading={reenvioIndividualLoading}
                />
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between shadow-inner">
              <span className="text-sm font-semibold text-slate-600">Total Válido na Rota</span>
              <span className="text-xl font-extrabold text-blue-700">{formatCurrency(totalAtivo)}</span>
            </div>
          </>
        )}
      </ModalContainer>

      {/* Modais Anexos */}
      {showPDF && <ImpressaoRotaPDF rota={{...rota, dados_cobranca: clientesAgrupados}} onClose={() => setShowPDF(false)} />}
      
      {showPreFlight && (
        <PreFlightModal
          itens={itensAtivos}
          clientes={clientesData}
          representantes={representantesData}
          action={preFlightAction}
          onConfirm={executarAposPreFlight}
          onClose={() => { setShowPreFlight(false); setPreFlightAction(null); }}
        />
      )}

      {editarContatoIdx !== null && (
        <EditarContatoModal
          cliente={clientesAgrupados[editarContatoIdx]}
          onSave={handleSalvarContato}
          onClose={() => setEditarContatoIdx(null)}
        />
      )}

      {showCorrigirErros && (
        <CorrigirErrosModal
          clientesAgrupados={clientesAgrupados}
          clientesDB={clientesData}
          onClose={() => setShowCorrigirErros(false)}
          onCorrigido={onErrosCorrigidos}
        />
      )}
    </>
  );
}
