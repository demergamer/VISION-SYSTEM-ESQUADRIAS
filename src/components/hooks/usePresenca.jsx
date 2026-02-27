import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const HEARTBEAT_INTERVAL = 30 * 1000; // 30 segundos

/**
 * Hook que envia heartbeat de presença enquanto o utilizador está na página.
 * Marca como offline ao sair.
 */
export function usePresenca(user) {
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!user?.email) return;

        const ping = () => {
            base44.functions.invoke('presencaHeartbeat', { plataforma: 'web' }).catch(() => {});
        };

        // Ping imediato ao montar
        ping();

        // Ping periódico
        intervalRef.current = setInterval(ping, HEARTBEAT_INTERVAL);

        // Marca offline ao sair
        const handleOffline = () => {
            base44.functions.invoke('presencaOffline', {}).catch(() => {});
        };

        window.addEventListener('beforeunload', handleOffline);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                base44.functions.invoke('presencaHeartbeat', { plataforma: 'web' }).catch(() => {});
            } else {
                ping();
            }
        });

        return () => {
            clearInterval(intervalRef.current);
            window.removeEventListener('beforeunload', handleOffline);
            handleOffline();
        };
    }, [user?.email]);
}