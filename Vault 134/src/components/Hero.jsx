import React, { useEffect, useRef, useState } from 'react';
import { TOTAL, ESSENTIAL_TOTAL, DATA, THEMES } from '../data/marvelData';

export default function Hero({ watched, theme, setTheme }) {
  const [days, setDays] = useState('...');
  const canvasRef = useRef(null);

  useEffect(() => {
    const doomsday = new Date('2026-12-18T00:00:00');
    const update = () => {
      const diff = doomsday - new Date();
      setDays(diff <= 0 ? '0' : Math.floor(diff / 86400000));
    };
    update();
    const interval = setInterval(update, 3600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hero = canvas.parentElement;
    
    let stars = [];
    let animationFrameId;

    const resize = () => {
      canvas.width = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
      const count = Math.min(90, Math.floor((canvas.width * canvas.height) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.3,
        s: Math.random() * 0.4 + 0.1,
        phase: Math.random() * Math.PI * 2
      }));
    };

    let t = 0;
    const tick = () => {
      if (REDUCE_MOTION) return;
      t += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      stars.forEach(st => {
        const alpha = 0.3 + 0.5 * Math.abs(Math.sin(t * st.s + st.phase));
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    if (!REDUCE_MOTION) tick();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const watchedCount = watched.size;
  const pct = TOTAL ? Math.round((watchedCount / TOTAL) * 100) : 0;
  const essWatched = DATA.filter(d => d[5] === 'Essential' && watched.has(d[0])).length;

  let status;
  if (watchedCount === 0) status = "Not started yet.";
  else if (essWatched >= ESSENTIAL_TOTAL && watchedCount < TOTAL) status = <span><b>Essential path complete</b> — recommended and optional titles remain.</span>;
  else if (watchedCount >= TOTAL) status = <span><b>Every title watched.</b> All caught up before Doomsday.</span>;
  else status = <span><b>{watchedCount}</b> of {TOTAL} watched overall.</span>;

  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
        <div className="blob blob3"></div>
      </div>
      <canvas id="stars" ref={canvasRef}></canvas>
      <div className="hero-vignette"></div>

      <div className="hero-content">
        <div className="brandbar">
          <div className="wordmark">MARVEL</div>
          <div className="theme-dots">
            {THEMES.map(t => (
              <button
                key={t.id || 'default'}
                type="button"
                className={`theme-dot ${theme === t.id ? 'active' : ''}`}
                style={{ background: t.color }}
                onClick={() => setTheme(t.id)}
              />
            ))}
          </div>
        </div>

        <h1>Every Marvel movie and series, in release order.</h1>
        <p className="sub">1992 to 2026 — a working list for the crew before Doomsday.</p>

        <div className="stat-row">
          <div className="stat-big">{pct}<span className="unit">%</span></div>
          <div className="stat-mini">
            <span className="num">{essWatched}/{ESSENTIAL_TOTAL}</span>
            <span className="lbl">Essential</span>
          </div>
          <div className="stat-mini">
            <span className="num">{days}</span>
            <span className="lbl">Days to Doomsday</span>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }}></div>
        </div>
        <p className="status-line">{status}</p>
      </div>
    </section>
  );
}
