import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

const CURRENT_VERSION = "1.0.1.685";

export default function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        const data = await response.json();
        if (data.version && data.version !== CURRENT_VERSION) {
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.error("Falha ao verificar atualizações do sistema", error);
      }
    };

    checkForUpdates();
    const intervalId = setInterval(checkForUpdates, 600000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (updateAvailable) {
      toast('Nova versão do Vision System disponível!', {
        description: 'Atualizamos a aplicação. Recarregue a página para acessar as novas funcionalidades e correções.',
        duration: Infinity,
        icon: <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />,
        action: {
          label: 'Atualizar Agora',
          onClick: () => window.location.reload(),
        },
        style: {
          backgroundColor: '#F0F9FF',
          borderColor: '#BAE6FD',
        }
      });
    }
  }, [updateAvailable]);

  return null;
}