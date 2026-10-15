import React, { useEffect, useRef } from 'react';

interface KitchenParticleCanvasProps {
  isCooking: boolean;
  isVipFlame: boolean;
  isRushHour?: boolean;
  isFireEmergency?: boolean;
  isServing?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  type: 'steam' | 'spark' | 'fire' | 'gold';
  oscillation: number;
  oscSpeed: number;
}

/**
 * Sistema de partículas ligero en Canvas para OBS.
 * Ejecuta en un único canvas GPU-accelerated con un número estrictamente acotado (máx 35 partículas)
 * para garantizar 60 FPS fijos sin saturación de memoria durante streams de más de 8 horas.
 */
export const KitchenParticleCanvas: React.FC<KitchenParticleCanvasProps> = ({
  isCooking,
  isVipFlame,
  isRushHour = false,
  isFireEmergency = false,
  isServing = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let lastSpawn = 0;

    const spawnParticles = (now: number) => {
      // Limitar tasa de spawn (cada 80ms)
      if (now - lastSpawn < 80) return;
      lastSpawn = now;

      const potCenterX = canvas.width * 0.5;
      const potCenterY = canvas.height * 0.85;

      // 1. Vapor de cocción realista
      if (isCooking || isServing) {
        if (particles.length < 28) {
          particles.push({
            x: potCenterX + (Math.random() - 0.5) * 44,
            y: potCenterY,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -(0.7 + Math.random() * 0.9),
            radius: 5 + Math.random() * 4,
            alpha: 0.28 + Math.random() * 0.15,
            decay: 0.005 + Math.random() * 0.004,
            type: 'steam',
            oscillation: Math.random() * Math.PI * 2,
            oscSpeed: 0.04 + Math.random() * 0.03,
          });
        }
      }

      // 2. Chispas de aceite caliente y burbujas al saltear
      if (isCooking && (isVipFlame || Math.random() > 0.4)) {
        if (particles.length < 32) {
          particles.push({
            x: potCenterX + (Math.random() - 0.5) * 36,
            y: potCenterY + 4,
            vx: (Math.random() - 0.5) * 2.2,
            vy: -(1.6 + Math.random() * 2.0),
            radius: 1.2 + Math.random() * 1.4,
            alpha: 0.9,
            decay: 0.03 + Math.random() * 0.02,
            type: 'spark',
            oscillation: 0,
            oscSpeed: 0,
          });
        }
      }

      // 3. Brasas y llamas fluidas en modo VIP o emergencia de fuego
      if (isFireEmergency || isVipFlame) {
        if (particles.length < 34) {
          particles.push({
            x: potCenterX + (Math.random() - 0.5) * (isFireEmergency ? 70 : 40),
            y: potCenterY + 10,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -(1.4 + Math.random() * 1.8),
            radius: 2.5 + Math.random() * 3,
            alpha: 0.85,
            decay: 0.02 + Math.random() * 0.015,
            type: 'fire',
            oscillation: Math.random() * Math.PI,
            oscSpeed: 0.08,
          });
        }
      }

      // 4. Destellos dorados en Fiebre Dorada / Rush Hour o al servir
      if (isRushHour || isServing) {
        if (particles.length < 34) {
          particles.push({
            x: potCenterX + (Math.random() - 0.5) * 80,
            y: potCenterY - 10 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(0.5 + Math.random() * 0.8),
            radius: 1.5 + Math.random() * 2,
            alpha: 0.95,
            decay: 0.018 + Math.random() * 0.012,
            type: 'gold',
            oscillation: Math.random() * Math.PI,
            oscSpeed: 0.1,
          });
        }
      }
    };

    const render = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      spawnParticles(now);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx + Math.sin(p.oscillation) * 0.4;
        p.y += p.vy;
        p.oscillation += p.oscSpeed;
        p.alpha -= p.decay;

        if (p.type === 'steam') {
          p.radius += 0.22; // El vapor se expande al ascender
        }

        if (p.alpha <= 0 || p.y < 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        if (p.type === 'steam') {
          // Gradiente radial suave para simular voluta de vapor difusa
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
          grad.addColorStop(0.5, 'rgba(240, 245, 255, 0.2)');
          grad.addColorStop(1, 'rgba(240, 245, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'spark') {
          // Chispita de aceite caliente
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'fire') {
          // Partícula de fuego / brasa incandescente
          ctx.fillStyle = p.alpha > 0.4 ? '#f97316' : '#dc2626';
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'gold') {
          // Destello dorado de estrella
          ctx.fillStyle = '#facc15';
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      particles = [];
    };
  }, [isCooking, isVipFlame, isRushHour, isFireEmergency, isServing]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={180}
      className={`pointer-events-none select-none z-30 ${className}`}
      style={{ willChange: 'transform' }}
    />
  );
};
