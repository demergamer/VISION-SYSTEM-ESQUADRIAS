import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, MapPin, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import ModalContainer from '@/components/modals/ModalContainer';
import ClienteForm from '@/components/clientes/ClienteForm';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function CorrigirErrosModal({ rota, clientesDB = [], onClose, onCorrigir }) {
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [representantes, setRepresentantes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchRepresentantes = async () => {
      try {
        const reps = await base44.entities.Representante.list('nome', 500);
        setRepresentantes(reps || []);
      } catch (e) {
        console.error('Erro ao buscar representantes:', e);
      }
    };
    fetchRepresentantes();
  }, []);

  // Identifica quais dados faltam para cada cliente
  const clientesComErros = useMemo(() => {
    return (rota.dados_cobranca || []).map(item => {
      const clienteDB = clientesDB.find(c => c.codigo === item.cliente_codigo);
      
      const erros = [];
      if (!item.cliente_cidade && !clienteDB?.cidade) erros.push('Cidade faltando');
      if (!item.cliente_endereco_completo && !clienteDB?.endereco) erros.push('Endereço faltando');
      if (!item.cliente_telefone && !clienteDB?.telefone_1) erros.push('Telefone faltando');
      if (!item.cliente_latitude && !clienteDB?.latitude) erros.push('Latitude faltando');
      if (!item.cliente_longitude && !clienteDB?.longitude) erros.push('Longitude faltando');

      return {
        ...item,
        clienteDB,
        erros,
        temErro: erros.length > 0,
      };
    });
  }, [rota, clientesDB]);

  const clientesComErroFiltrado = clientesComErros.filter(c => c.temErro);

  const handleSalvarCliente = async (dataToSave) => {
    if (!clienteSelecionado?.clienteDB?.id) return;
    
    try {
      await base44.entities.Cliente.update(clienteSelecionado.clienteDB.id, dataToSave);
      toast.success('✅ Cliente atualizado!');
      setClienteSelecionado(null);
    } catch (e) {
      console.error('Erro ao salvar cliente:', e);
      toast.error('Erro ao salvar cliente');
    }
  };

  if (clienteSelecionado?.clienteDB) {
    return (
      <ModalContainer
        open={true}
        onClose={() => setClienteSelecionado(null)}
        title="Editar Cliente"
        description={`Atualize os dados de ${clienteSelecionado.cliente_nome}`}
        size="lg"
      >
        <ClienteForm
          cliente={clienteSelecionado.clienteDB}
          representantes={representantes}
          allClientes={clientesDB}
          todosClientes={clientesDB}
          onSave={handleSalvarCliente}
          onCancel={() => setClienteSelecionado(null)}
          isClientMode={false}
        />
      </ModalContainer>
    );
  }

  return (
    <ModalContainer
      open={true}
      onClose={onClose}
      title="Corrigir Erros da Rota"
      description={`${clientesComErroFiltrado.length} cliente(s) com dados faltantes`}
      size="lg"
    >
      {clientesComErroFiltrado.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-slate-600">✅ Todos os clientes possuem dados válidos para gerar os links de mapas!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {clientesComErroFiltrado.map((cliente, idx) => (
            <div
              key={idx}
              className="border rounded-xl p-4 bg-red-50 border-red-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">{cliente.cliente_nome}</h4>
                  <p className="text-xs text-slate-600 mt-1">Cód: {cliente.cliente_codigo}</p>
                  
                  {/* Erros encontrados */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cliente.erros.map((erro, i) => (
                      <Badge key={i} className="bg-red-100 text-red-700 border border-red-300 text-[10px]">
                        <AlertCircle className="w-3 h-3 mr-1" /> {erro}
                      </Badge>
                    ))}
                  </div>

                  {/* Dados disponíveis */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    {cliente.cliente_cidade && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-green-600" /> {cliente.cliente_cidade}
                      </div>
                    )}
                    {cliente.cliente_telefone && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3 h-3 text-green-600" /> {cliente.cliente_telefone}
                      </div>
                    )}
                  </div>

                  {/* Total de pendências */}
                  <div className="mt-2 text-xs text-slate-600">
                    <strong>Total:</strong> {formatCurrency(cliente.total_cliente)}
                  </div>
                </div>

                {/* Botão de editar */}
                <Button
                  onClick={() => setClienteSelecionado(cliente)}
                  className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700"
                >
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Fechar
        </Button>
        <Button 
          onClick={async () => {
            setIsSaving(true);
            try {
              await onCorrigir();
              onClose();
            } catch (e) {
              toast.error('Erro ao salvar');
            } finally {
              setIsSaving(false);
            }
          }} 
          disabled={isSaving}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar e Gerar Links'}
        </Button>
      </div>
    </ModalContainer>
  );
}