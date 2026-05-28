import { useState, useMemo } from 'react';
import { AlertCircle, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ModalContainer from '@/components/modals/ModalContainer';
import ClienteForm from '@/components/clientes/ClienteForm';

export default function CorrigirErrosModal({ clientesAgrupados = [], clientesDB = [], onClose, onCorrigido }) {
  const [clienteSelecionado, setClienteSelecionado] = useState(null);

  // Analisa o array agrupado para detetar faltas
  const clientesComErros = useMemo(() => {
    return clientesAgrupados.map(cliente => {
      const erros = [];
      if (!cliente.cliente_cidade) erros.push('Cidade / Endereço');
      if (!cliente.cliente_telefone) erros.push('Telefone');
      if (!cliente.cliente_latitude || !cliente.cliente_longitude) erros.push('Coordenadas (Maps)');

      return {
        ...cliente,
        clienteDBRef: clientesDB.find(c => c.codigo === cliente.cliente_codigo),
        erros,
        temErro: erros.length > 0,
      };
    }).filter(c => c.temErro);
  }, [clientesAgrupados, clientesDB]);

  // Se ele escolheu editar um, abrimos o formulário mestre de clientes
  if (clienteSelecionado?.clienteDBRef) {
    return (
      <ModalContainer open={true} onClose={() => setClienteSelecionado(null)} title="Editar Cliente" size="lg">
        <ClienteForm
          cliente={clienteSelecionado.clienteDBRef}
          representantes={[]} // Deixe vazio ou passe os reps se quiser permitir trocar o rep aqui
          allClientes={clientesDB}
          onSave={async () => {
            setClienteSelecionado(null);
            onCorrigido(); // Manda o componente pai re-fazer o fetch (sincronizar)
          }}
          onCancel={() => setClienteSelecionado(null)}
          isClientMode={false}
        />
      </ModalContainer>
    );
  }

  return (
    <ModalContainer
      open={true} onClose={onClose}
      title="Corrigir Dados de Cadastro"
      description={`${clientesComErros.length} cliente(s) na rota precisam de correção para o Google Maps ou WhatsApp funcionar.`}
      size="lg"
    >
      {clientesComErros.length === 0 ? (
        <div className="p-8 text-center bg-green-50 rounded-xl border border-green-200">
          <p className="text-green-700 font-bold text-lg mb-1">✅ Tudo perfeito!</p>
          <p className="text-green-600 text-sm">Nenhum cliente tem dados faltantes nesta rota.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {clientesComErros.map((cliente) => (
            <div 
              key={cliente.cliente_codigo} 
              className="border border-red-200 bg-red-50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-red-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 truncate">{cliente.cliente_nome}</h4>
                <p className="text-xs text-slate-600 mb-2 font-mono">Cód: {cliente.cliente_codigo}</p>
                
                {/* Erros encontrados */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {cliente.erros.map((erro, i) => (
                    <Badge key={i} className="bg-red-100 text-red-700 border border-red-200 text-[10px] uppercase">
                      <AlertCircle className="w-3 h-3 mr-1" /> Faltando: {erro}
                    </Badge>
                  ))}
                </div>

                {/* Dados que já temos (para referência) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {cliente.cliente_cidade && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3 text-emerald-600" /> {cliente.cliente_cidade}
                    </div>
                  )}
                  {cliente.cliente_telefone && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Phone className="w-3 h-3 text-emerald-600" /> {cliente.cliente_telefone}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de editar abre o ClienteForm original */}
              <Button
                onClick={() => setClienteSelecionado(cliente)}
                className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 w-full md:w-auto shadow-sm"
              >
                Abrir Cadastro
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onClose} className="px-6 border-slate-300 hover:bg-slate-50 text-slate-700 font-medium">
          Concluir e Voltar para a Rota
        </Button>
      </div>
    </ModalContainer>
  );
}