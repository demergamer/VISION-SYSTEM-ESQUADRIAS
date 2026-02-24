import React, { useState, useEffect, useRef } from 'react';

/**
 * Motor visual do fundo do Dashboard.
 * - tipo_fundo === 'cor': aplica cor sólida
 * - tipo_fundo === 'imagem': slideshow com transição suave a cada 30s
 */
export default function DashboardBackground({ tipofundo, valorfundo }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  const images = Array.isArray(valorfundo) ? valorfundo.filter(Boolean) : [];

  useEffect(() => {
    if (tipofundo !== 'imagem' || images.length < 2) return;

    timerRef.current = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
        setNextIndex(prev => (prev + 1) % images.length);
        setTransitioning(false);
      }, 1000);
    }, 30000);

    return () => clearInterval(timerRef.current);
  }, [tipofundo, images.length]);

  if (tipofundo === 'cor' && valorfundo && typeof valorfundo === 'string') {
    return (
      <div
        className="fixed inset-0 z-0 transition-colors duration-1000"
        style={{ backgroundColor: valorfundo }}
      />
    );
  }

  if (tipofundo === 'imagem' && images.length > 0) {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Imagem atual */}
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${images[currentIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: transitioning ? 0 : 1,
          }}
        />
        {/* Imagem seguinte (pré-carregada atrás) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${images[nextIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: transitioning ? 1 : 0,
            transition: 'opacity 1000ms ease-in-out',
          }}
        />
        {/* Overlay escuro suave para legibilidade */}
        <div className="absolute inset-0 bg-black/20" />
      </div>
    );
  }

  // Fallback: fundo padrão (PS2Background é renderizado pelo pai)
  return null;
}