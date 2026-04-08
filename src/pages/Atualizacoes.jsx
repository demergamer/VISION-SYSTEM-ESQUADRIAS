import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Rocket, Code2, FileText, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 8;

export default function Atualizacoes() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: atualizacoes = [], isLoading } = useQuery({
    queryKey: ['atualizacoes'],
    queryFn: () => base44.entities.Atualizacao.list('-data_publicacao'),
  });

  const visible = atualizacoes.slice(0, visibleCount);
  const hasMore = visibleCount < atualizacoes.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Rocket className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Registro de Atualizações</h1>
          </div>
          <p className="text-slate-500 text-sm ml-[52px]">
            Acompanhe todas as melhorias e novidades do Vision System.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        {atualizacoes.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma atualização registrada ainda.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Linha vertical da timeline */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200 hidden md:block" />

            <div className="space-y-4">
              {visible.map((item, index) => (
                <div key={item.id} className="relative flex gap-5">
                  {/* Dot */}
                  <div className="hidden md:flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 z-10 border-2 ${
                      index === 0
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}>
                      <Rocket className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0">
                    <Accordion type="single" collapsible>
                      <AccordionItem value={item.id} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 [&>svg]:hidden">
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge className={`text-sm font-bold px-3 py-1 ${
                                index === 0
                                  ? 'bg-blue-600 text-white hover:bg-blue-600'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                              }`}>
                                v{item.versao}
                              </Badge>
                              {index === 0 && (
                                <Badge className="bg-green-100 text-green-700 text-xs hover:bg-green-100">
                                  Mais Recente
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium ml-auto">
                              {item.data_publicacao && (
                                <span>
                                  {format(new Date(item.data_publicacao), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </span>
                              )}
                              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5">
                          <div className="space-y-4 pt-2">
                            {/* Visão Geral */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Visão Geral</span>
                              </div>
                              <p className="text-slate-700 text-sm leading-relaxed bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                                {item.descricao_simples}
                              </p>
                            </div>

                            {/* Detalhes Técnicos */}
                            {item.descricao_tecnica && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Code2 className="w-4 h-4 text-slate-500" />
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhes Técnicos</span>
                                </div>
                                <pre className="text-slate-600 text-xs leading-relaxed bg-slate-900 text-green-400 rounded-lg px-4 py-3 font-mono whitespace-pre-wrap overflow-x-auto">
                                  {item.descricao_tecnica}
                                </pre>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              ))}
            </div>

            {/* Carregar mais */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  Carregar mais atualizações...
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}