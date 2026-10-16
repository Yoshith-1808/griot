'use client';

/**
 * @file packages/demo-client/components/VoiceOrb.tsx
 * @description 60 FPS HTML5 Canvas Organic VoiceOrb.
 * States: 'idle' (breathing), 'listening' (pulsing blue/purple), 'processing' (shimmer), 'speaking' (reactive wave).
 */

import type { VoiceOrbState } from '@griot/shared';
import React, { useEffect, useRef } from 'react';

interface VoiceOrbProps {
  state: VoiceOrbState;
  onClick: () => void;
  className?: string;
}

export function VoiceOrb({ state, onClick, className = '' }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let step = 0;

    const render = () => {
      step += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Dynamic radius and color palette based on voice state
      let baseRadius = 80;
      const waveCount = 4;
      let primaryColor = '139, 92, 246'; // violet
      let secondaryColor = '59, 130, 246'; // blue

      if (state === 'listening') {
        baseRadius = 88 + Math.sin(step * 3) * 8;
        primaryColor = '56, 189, 248'; // sky blue
        secondaryColor = '168, 85, 247'; // purple
      } else if (state === 'processing') {
        baseRadius = 82 + Math.sin(step * 6) * 4;
        primaryColor = '236, 72, 153'; // pink
        secondaryColor = '139, 92, 246';
      } else if (state === 'speaking') {
        baseRadius = 85 + Math.sin(step * 4) * 12;
        primaryColor = '34, 197, 94'; // green
        secondaryColor = '14, 165, 233';
      } else {
        // Idle gentle breath
        baseRadius = 78 + Math.sin(step) * 4;
      }

      // Outer glow rings
      for (let w = waveCount; w >= 1; w--) {
        const ringRadius = baseRadius + w * 18 + Math.sin(step + w) * 6;
        const alpha = (0.2 / w) * (state === 'idle' ? 0.4 : 0.8);

        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          baseRadius * 0.5,
          centerX,
          centerY,
          ringRadius,
        );
        gradient.addColorStop(0, `rgba(${primaryColor}, ${alpha * 1.5})`);
        gradient.addColorStop(0.7, `rgba(${secondaryColor}, ${alpha})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Core Orb
      const coreGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.2,
        centerY - baseRadius * 0.2,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius,
      );
      coreGradient.addColorStop(0, '#ffffff');
      coreGradient.addColorStop(0.3, `rgba(${primaryColor}, 0.9)`);
      coreGradient.addColorStop(0.8, `rgba(${secondaryColor}, 0.7)`);
      coreGradient.addColorStop(1, 'rgba(10, 15, 30, 0.9)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.shadowColor = `rgba(${primaryColor}, 0.6)`;
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative cursor-pointer select-none transition-transform active:scale-95 flex flex-col items-center justify-center bg-transparent border-0 outline-none p-0 ${className}`}
      title="Click orb to speak with Griot"
    >
      <canvas ref={canvasRef} width={340} height={340} className="w-[280px] h-[280px]" />
      <span className="mt-3 text-xs font-medium uppercase tracking-widest text-slate-400/80">
        {state === 'idle' && 'Tap to Speak'}
        {state === 'listening' && 'Listening...'}
        {state === 'processing' && 'Thinking...'}
        {state === 'speaking' && 'Alexa Speaking'}
      </span>
    </button>
  );
}
