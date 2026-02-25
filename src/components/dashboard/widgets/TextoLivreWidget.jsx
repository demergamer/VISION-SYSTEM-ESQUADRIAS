import React, { useState } from 'react';
import { FileText } from 'lucide-react';

export default function TextoLivreWidget({ config = {}, onConfigChange, editMode }) {
  const [localText, setLocalText] = useState(config.text || 'Escreva aqui suas anotações...');

  const handleBlur = () => {
    if (onConfigChange) onConfigChange({ ...config, text: localText });
  };

  return (
    <div className="space-y-2 h-full">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-orange-500" />
        <span className="font-bold text-slate-700 text-sm">{config.title || 'Notas'}</span>
      </div>
      <textarea
        className="w-full h-[160px] text-sm text-slate-700 bg-transparent resize-none border-none outline-none placeholder:text-slate-400 leading-relaxed"
        value={localText}
        onChange={e => setLocalText(e.target.value)}
        onBlur={handleBlur}
        placeholder="Escreva suas anotações aqui..."
      />
    </div>
  );
}