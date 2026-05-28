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
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  const semPrefixo = digits.startsWith('55') && digits.length < 12 ? digits.slice(2) : digits;
  return `55${semPrefixo}`;
};
const isNumeroValido = (n) => {
  const d = n.replace(/\D/g, '');
  return d.length >= 12 && d.length <= 15;
};

export default function DetalhesRotaModal({ rota, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  
  // Suporte ao formato legado (dados_cobranca) e ao novo (itens_rota)
  const usaFormatoLegado = (!rota.itens_rota || rota.itens_rota.length === 0) && (rota.dados_cobranca?.length > 0);
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

  const isLoadingData = !usaFormatoLegado && (loadP || loadC || loadCli);

  // ── Agrupamento Legado (dados_cobranca) ──
  const clientesAgrupadosLegado = useMemo(() => {
    if (!usaFormatoLegado) return null;
    return (rota.dados_cobranca || []);
  }, [usaFormatoLegado, rota.dados_cobranca]);

  // ── Agrupamento Dinâmico (Transforma IDs no layout que a UI espera) ──
  const clientesAgrupados = useMemo(() => {
    // Se é formato legado, retorna direto sem precisar de queries
    if (usaFormatoLegado) return clientesAgrupadosLegado || [];
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
    if (editarContatoIdx === null && editarContatoIdx !== 0) return;
    const clienteAlvo = clientesAgrupados[editarContatoIdx];
    if (!clienteAlvo) return;

    const cliDB = clientesData.find(c => c.codigo === clienteAlvo.cliente_codigo);
    if (cliDB?.id) {
      try {
        await base44.entities.Cliente.update(cliDB.id, { telefone_1: telefone.trim(), responsavel_1: nome.trim() || cliDB.responsavel_1 });
        queryClient.invalidateQueries({ queryKey: ['rota_clientes_detalhes'] });
        toast.success('✏️ Telefone atualizado no cadastro do cliente!');
      } catch (e) {
        toast.error('Erro ao atualizar telefone: ' + e.message);
      }
    } else {
      toast.warning('Cliente não encontrado no banco para atualizar.');
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
    try {
      const res = await base44.functions.invoke('dispararWhatsAppClientes', { rota_id: rota.id });
      const { enviados = [], falhas = [] } = res.data || {};
      // Recarregar itens_rota atualizados do banco
      const rotasAtualizadas = await base44.entities.RotaCobranca.filter({ id: rota.id });
      if (rotasAtualizadas?.[0]) {
        setItensRota(rotasAtualizadas[0].itens_rota || itensRota);
        onUpdated(rotasAtualizadas[0]);
      }
      setResultadoDisparo({ enviados, falhas });
      toast[falhas.length === 0 ? 'success' : 'warning'](`${enviados.length} enviado(s)${falhas.length > 0 ? ` · ${falhas.length} falha(s)` : ''}`);
    } catch (e) {
      toast.error(`Erro ao disparar: ${e.message}`);
    } finally {
      setDisparando(false);
    }
  };

  const handleReenviarIndividual = async (idx) => {
    const cliente = clientesAgrupados[idx];
    const numeros = extrairNumeros(cliente);
    if (!numeros.length) return toast.error('Nenhum número válido cadastrado.');

    setReenvioIndividualLoading(prev => ({ ...prev, [idx]: true }));
    try {
      const res = await base44.functions.invoke('reenviarWhatsAppCliente', {
        rota_id: rota.id,
        cliente_codigo: cliente.cliente_codigo,
        cliente_nome: cliente.cliente_nome,
        numero_corrigido: numeros[0],
      });
      if (res.data?.success) {
        await atualizarEnvioNoEstado(cliente.cliente_codigo, true, null);
        toast.success(`✓ Enviado para ${cliente.cliente_nome}`);
      } else {
        toast.error(`Falha: ${res.data?.error || 'Erro desconhecido'}`);
      }
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setReenvioIndividualLoading(prev => ({ ...prev, [idx]: false }));
    }
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
                    {resultadoDisparo.falhas.map((falha, fi) => {
                     const numeroCorrigido = numerosCorrecao[falha.cliente_nome] ?? '';
                     const idxCliente = clientesAgrupados.findIndex(c => c.cliente_codigo === falha.cliente_codigo || c.cliente_nome === falha.cliente_nome);
                     return (
                       <div key={fi} className="flex items-center gap-2 text-xs">
                         <span className="min-w-[120px] font-medium truncate">{falha.cliente_nome}</span>
                         <Input
                           placeholder="Corrigir Nº"
                           value={numeroCorrigido}
                           onChange={(e) => setNumerosCorrecao(p => ({ ...p, [falha.cliente_nome]: e.target.value }))}
                           className="h-7 w-36 text-xs"
                         />
                         <Button
                           size="sm"
                           disabled={reenvioLoading[falha.cliente_nome] || !numeroCorrigido.trim()}
                           className="h-7 bg-blue-600 hover:bg-blue-700 text-white"
                           onClick={async () => {
                               const numLimpo = limparNumero(numeroCorrigido);
                               if (!isNumeroValido(numLimpo)) return toast.error('Número inválido (mín. 12 dígitos com DDI)');
                               setReenvioLoading(p => ({ ...p, [falha.cliente_nome]: true }));
                               try {
                                 const res = await base44.functions.invoke('reenviarWhatsAppCliente', {
                                   rota_id: rota.id,
                                   cliente_codigo: falha.cliente_codigo,
                                   cliente_nome: falha.cliente_nome,
                                   numero_corrigido: numLimpo,
                                 });
                                 if (res.data?.success) {
                                   await atualizarEnvioNoEstado(falha.cliente_codigo, true, null);
                                   setResultadoDisparo(prev => ({
                                     ...prev,
                                     enviados: [...prev.enviados, { cliente_nome: falha.cliente_nome, numero: numLimpo }],
                                     falhas: prev.falhas.filter((_, i) => i !== fi),
                                   }));
                                   toast.success(`✓ Enviado para ${falha.cliente_nome}`);
                                 } else {
                                   toast.error(`Falha: ${res.data?.error || 'Erro desconhecido'}`);
                                 }
                               } catch (e) {
                                 toast.error(`Erro: ${e.message}`);
                               } finally {
                                 setReenvioLoading(p => ({ ...p, [falha.cliente_nome]: false }));
                               }
                             }}
                         >
                           {reenvioLoading[falha.cliente_nome] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reenviar'}
                         </Button>
                       </div>
                     );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Clientes Listados */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto mb-4 p-1">
              {clientesAgrupados.map((cliente, idx) => (
                <RotaClienteCard
                  key={`${cliente.cliente_codigo || cliente.cliente_nome}-${idx}`}
                  cliente={cliente}
                  idx={idx}
                  onMarcarRecusado={handleMarcarRecusado}
                  onEditarContato={(i) => setEditarContatoIdx(i)}
                  onReenviarIndividual={(i) => handleReenviarIndividual(i)}
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

      {editarContatoIdx !== null && editarContatoIdx !== undefined && clientesAgrupados[editarContatoIdx] && (
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