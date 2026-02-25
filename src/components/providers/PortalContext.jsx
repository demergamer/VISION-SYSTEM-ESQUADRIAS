import { createContext, useContext } from 'react';

// Contexto que armazena o elemento DOM onde portais devem ser renderizados.
// Dentro de janelas OS, será o div da janela. Fora, será o body (padrão).
export const PortalContext = createContext(null);

export function usePortalContainer() {
  return useContext(PortalContext); // null = body (padrão do Radix)
}