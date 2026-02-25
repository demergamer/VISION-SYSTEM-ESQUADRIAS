import React, { useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { X, GripVertical, Settings2, Plus, ShoppingCart, Users, BarChart3, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import PedidosRecentesWidget from './widgets/PedidosRecentesWidget';
import ClientesAtivosWidget from './widgets/ClientesAtivosWidget';
import MetricasVendasWidget from './widgets/MetricasVendasWidget';
import TextoLivreWidget from './widgets/TextoLivreWidget';

const WIDGET_REGISTRY = {
  pedidos_recentes: {
    label: 'Pedidos Recentes',
    icon: ShoppingCart,
    color: 'text-blue-600',
    component: PedidosRecentesWidget,
  },
  clientes_ativos: {
    label: 'Clientes Ativos',
    icon: Users,
    color: 'text-violet-600',
    component: ClientesAtivosWidget,
  },
  metricas_vendas: {
    label: 'Métricas de Vendas',
    icon: BarChart3,
    color: 'text-emerald-600',
    component: MetricasVendasWidget,
  },
  texto_livre: {
    label: 'Notas Livres',
    icon: FileText,
    color: 'text-orange-500',
    component: TextoLivreWidget,
  },
};

function WidgetCard({ widget, editMode, onRemove, onConfigChange, provided, snapshot }) {
  const def = WIDGET_REGISTRY[widget.type];
  if (!def) return null;
  const Comp = def.component;
  const Icon = def.icon;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "rounded-2xl border bg-white/70 backdrop-blur-md shadow-sm ring-1 ring-white/50 overflow-hidden transition-shadow",
        snapshot.isDragging && "shadow-2xl rotate-1 scale-105",
        editMode && "ring-2 ring-blue-300 ring-offset-1"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-1.5 px-3 pt-3 pb-0",
        editMode && "cursor-move"
      )}>
        {editMode && (
          <span {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        <span className={cn("shrink-0", def.color)}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs font-bold text-slate-500 flex-1 truncate">{def.label}</span>
        {editMode && (
          <button
            onClick={() => onRemove(widget.id)}
            className="p-0.5 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {!editMode && <span {...provided.dragHandleProps} />}
      </div>

      {/* Content */}
      <div className="p-4 pt-3">
        <Comp
          config={widget.config || {}}
          onConfigChange={(newConfig) => onConfigChange(widget.id, newConfig)}
          editMode={editMode}
        />
      </div>
    </div>
  );
}

function AddWidgetModal({ onAdd, onClose, existingTypes }) {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-slate-800">Adicionar Widget</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {Object.entries(WIDGET_REGISTRY).map(([type, def]) => {
            const Icon = def.icon;
            const alreadyAdded = existingTypes.filter(t => t === type).length > 0;
            return (
              <button
                key={type}
                onClick={() => { onAdd(type); onClose(); }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  alreadyAdded
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600"
                )}
              >
                <Icon className={cn("w-6 h-6", def.color)} />
                <span className="text-xs font-semibold text-center leading-tight">{def.label}</span>
                {alreadyAdded && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> Adicionado</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const STORAGE_KEY = 'jc_dashboard_widgets';

const DEFAULT_WIDGETS = [
  { id: 'w1', type: 'metricas_vendas', config: {} },
  { id: 'w2', type: 'pedidos_recentes', config: {} },
  { id: 'w3', type: 'clientes_ativos', config: {} },
];

function loadWidgets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_WIDGETS;
}

function saveWidgets(widgets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

export default function WidgetGrid() {
  const [widgets, setWidgets] = useState(() => loadWidgets());
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const updateAndSave = (newWidgets) => {
    setWidgets(newWidgets);
    saveWidgets(newWidgets);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(widgets);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    updateAndSave(items);
  };

  const handleRemove = (id) => {
    updateAndSave(widgets.filter(w => w.id !== id));
  };

  const handleAdd = (type) => {
    const newWidget = {
      id: `w_${Date.now()}`,
      type,
      config: {},
    };
    updateAndSave([...widgets, newWidget]);
  };

  const handleConfigChange = (id, newConfig) => {
    updateAndSave(widgets.map(w => w.id === id ? { ...w, config: newConfig } : w));
  };

  const existingTypes = widgets.map(w => w.type);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Widgets</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
          <button
            onClick={() => setEditMode(e => !e)}
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors",
              editMode ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            {editMode ? 'Concluir' : 'Editar'}
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="widgets">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-4"
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index} isDragDisabled={!editMode}>
                  {(prov, snap) => (
                    <WidgetCard
                      widget={widget}
                      editMode={editMode}
                      onRemove={handleRemove}
                      onConfigChange={handleConfigChange}
                      provided={prov}
                      snapshot={snap}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {widgets.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          <p>Nenhum widget adicionado.</p>
          <button onClick={() => setShowAddModal(true)} className="mt-2 text-blue-600 font-semibold hover:underline text-xs">
            + Adicionar widget
          </button>
        </div>
      )}

      {showAddModal && (
        <AddWidgetModal
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
          existingTypes={existingTypes}
        />
      )}
    </div>
  );
}