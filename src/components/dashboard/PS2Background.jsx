import { useEffect, useRef } from 'react';

export default function PS2Background() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Configuração de partículas/torres estilo PS2
    const towers = [];
    const numTowers = 50;
    
    for (let i = 0; i < numTowers; i++) {
      towers.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        height: Math.random() * 100 + 50,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    let animationId;

    const animate = () => {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      towers.forEach(tower => {
        // Gradiente vertical para as "torres"
        const gradient = ctx.createLinearGradient(tower.x, tower.y, tower.x, tower.y + tower.height);
        gradient.addColorStop(0, `rgba(59, 130, 246, ${tower.opacity})`);
        gradient.addColorStop(1, `rgba(99, 102, 241, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(tower.x, tower.y, 3, tower.height);

        // Movimento flutuante
        tower.y -= tower.speed;
        
        // Reset quando sair da tela
        if (tower.y + tower.height < 0) {
          tower.y = canvas.height;
          tower.x = Math.random() * canvas.width;
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'linear-gradient(to bottom, #f8fafc, #e2e8f0)' }}
    />
  );
}