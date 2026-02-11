'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import './tilt-card.css';

/* Utility helpers for tilt math */
const clamp = (v: number, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v: number, p = 3) => parseFloat(v.toFixed(p));
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Glow color behind the card */
  glowColor?: string;
  /** Inner gradient overlay */
  innerGradient?: string;
}

/**
 * TiltCard — 3D tilt + holographic shine card effect
 * Adapted from reactbits.dev ProfileCard component
 */
export function TiltCard({
  children,
  className = '',
  glowColor = 'rgba(125, 190, 255, 0.67)',
  innerGradient = 'linear-gradient(145deg, #60496e8c 0%, #71C4FF44 100%)',
}: TiltCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveRafRef = useRef<number | null>(null);

  /* Tilt animation engine — smooth pointer-following via rAF */
  const tiltEngine = useMemo(() => {
    let rafId: number | null = null;
    let running = false;
    let lastTs = 0;
    let currentX = 0, currentY = 0, targetX = 0, targetY = 0;
    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVars = (x: number, y: number) => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;
      const w = shell.clientWidth || 1;
      const h = shell.clientHeight || 1;
      const px = clamp((100 / w) * x);
      const py = clamp((100 / h) * y);
      const cx = px - 50;
      const cy = py - 50;
      const props: Record<string, string> = {
        '--pointer-x': `${px}%`,
        '--pointer-y': `${py}%`,
        '--background-x': `${adjust(px, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(py, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(py - 50, px - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${py / 100}`,
        '--pointer-from-left': `${px / 100}`,
        '--rotate-x': `${round(-(cx / 5))}deg`,
        '--rotate-y': `${round(cy / 4)}deg`,
      };
      for (const [k, v] of Object.entries(props)) wrap.style.setProperty(k, v);
    };

    const step = (ts: number) => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);
      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;
      setVars(currentX, currentY);
      const far = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;
      if (far || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x: number, y: number) { currentX = x; currentY = y; setVars(x, y); },
      setTarget(x: number, y: number) { targetX = x; targetY = y; start(); },
      toCenter() {
        const s = shellRef.current;
        if (s) this.setTarget(s.clientWidth / 2, s.clientHeight / 2);
      },
      beginInitial(ms: number) { initialUntil = performance.now() + ms; start(); },
      getCurrent() { return { x: currentX, y: currentY, tx: targetX, ty: targetY }; },
      cancel() { if (rafId) cancelAnimationFrame(rafId); rafId = null; running = false; lastTs = 0; },
    };
  }, []);

  const offsets = (e: PointerEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMove = useCallback((e: PointerEvent) => {
    const s = shellRef.current;
    if (!s) return;
    const { x, y } = offsets(e, s);
    tiltEngine.setTarget(x, y);
  }, [tiltEngine]);

  const onEnter = useCallback((e: PointerEvent) => {
    const s = shellRef.current;
    if (!s) return;
    s.classList.add('tc-active', 'tc-entering');
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    enterTimerRef.current = setTimeout(() => s.classList.remove('tc-entering'), 180);
    const { x, y } = offsets(e, s);
    tiltEngine.setTarget(x, y);
  }, [tiltEngine]);

  const onLeave = useCallback(() => {
    const s = shellRef.current;
    if (!s) return;
    tiltEngine.toCenter();
    const check = () => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      if (Math.hypot(tx - x, ty - y) < 0.6) {
        s.classList.remove('tc-active');
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(check);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(check);
  }, [tiltEngine]);

  useEffect(() => {
    const s = shellRef.current;
    if (!s) return;
    s.addEventListener('pointerenter', onEnter);
    s.addEventListener('pointermove', onMove);
    s.addEventListener('pointerleave', onLeave);
    const ix = (s.clientWidth || 0) - 70;
    tiltEngine.setImmediate(ix, 60);
    tiltEngine.toCenter();
    tiltEngine.beginInitial(1200);
    return () => {
      s.removeEventListener('pointerenter', onEnter);
      s.removeEventListener('pointermove', onMove);
      s.removeEventListener('pointerleave', onLeave);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
    };
  }, [tiltEngine, onEnter, onMove, onLeave]);

  const style = {
    '--tc-glow-color': glowColor,
    '--tc-inner-gradient': innerGradient,
  } as React.CSSProperties;

  return (
    <div ref={wrapRef} className={`tc-wrap ${className}`} style={style}>
      {/* Glow behind card */}
      <div className="tc-behind" />
      <div ref={shellRef} className="tc-shell" style={{ touchAction: 'none' }}>
        <div className="tc-card">
          <div className="tc-inside">
            <div className="tc-shine" />
            <div className="tc-glare" />
            {/* Content rendered on top */}
            <div className="tc-content">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
