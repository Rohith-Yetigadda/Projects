import React, { useState, useEffect } from 'react';
import { FAM_COLOR, FAM_COLOR2, family } from '../data/marvelData';
import { fetchImdbData } from '../services/collectApi';

const TYPE_ICON = {
  Movie: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="14" rx="1.5"/><path d="M7 6l2.5-3h5L12 6"/></svg>,
  Series: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="13" rx="1.5"/><path d="M8 21h8"/></svg>,
  Special: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z"/></svg>
};
const CHECK_ICON = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z"/></svg>;

export function posterArtStyle(fam, id) {
  const c1 = FAM_COLOR[fam] || FAM_COLOR.other;
  const c2 = FAM_COLOR2[fam] || FAM_COLOR2.other;
  const seed = id % 4;
  const patterns = [
    'repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 14px)',
    'repeating-linear-gradient(65deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 14px)',
    'repeating-radial-gradient(circle at 50% 40%, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 16px)',
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 18px)'
  ];
  return {
    bg: `radial-gradient(circle at 25% 15%, ${c2} 0%, transparent 45%), radial-gradient(circle at 80% 85%, ${c1} 0%, transparent 55%), linear-gradient(160deg, ${c1}, #0a0a0d 75%)`,
    pattern: patterns[seed]
  };
}

export default function PosterCard({ item, isWatched, toggleWatched, openDetail, isUpcoming = false }) {
  const [transform, setTransform] = useState('perspective(700px)');
  const [glossPos, setGlossPos] = useState({ mx: '50%', my: '50%' });
  const [apiData, setApiData] = useState(null);

  const isLocked = isUpcoming;
  const title = isUpcoming ? item.title : item[2];
  const year = isUpcoming ? null : item[1];
  const ty = isUpcoming ? null : item[3];
  const universe = isUpcoming ? item.universe : item[4];
  const pr = isUpcoming ? null : item[5];
  const id = isUpcoming ? 1 : item[0];
  const fam = isUpcoming ? 'mcu' : family(universe);

  useEffect(() => {
    let mounted = true;
    async function loadApiData() {
      const data = await fetchImdbData(title);
      if (mounted && data) {
        setApiData(data);
      }
    }
    loadApiData();
    return () => { mounted = false; };
  }, [title]);

  const handleMouseMove = (e) => {
    const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (REDUCE_MOTION) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 14;
    const rotX = (0.5 - py) * 14;
    setTransform(`perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.04)`);
    setGlossPos({ mx: `${px * 100}%`, my: `${py * 100}%` });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(700px)');
  };

  const art = posterArtStyle(fam, id);

  return (
    <div 
      className={`poster ${isWatched ? 'watched' : ''} ${isLocked ? 'locked' : ''}`}
      style={{ transform }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => openDetail(item, isUpcoming)}
    >
      <div className="poster-art">
        {apiData && apiData.Poster && apiData.Poster !== "N/A" ? (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${apiData.Poster})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : (
          <>
            <div style={{ position: 'absolute', inset: 0, background: art.bg }}></div>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: art.pattern, mixBlendMode: 'overlay', opacity: 0.7 }}></div>
          </>
        )}
      </div>
      
      <div className="poster-gloss" style={{ '--mx': glossPos.mx, '--my': glossPos.my }}></div>
      <div className="poster-scrim"></div>
      
      {!isLocked && (
        <div 
          className="poster-priority" 
          style={{ 
            background: pr === 'Essential' ? FAM_COLOR[fam] : 'transparent',
            opacity: pr === 'Essential' ? 1 : pr === 'Recommended' ? 0.35 : 0.15 
          }}
        />
      )}
      
      {!isLocked && (
        <div className="poster-top">
          <span className="poster-year">{year}</span>
          <span className="poster-type">{TYPE_ICON[ty]}</span>
        </div>
      )}

      {!isLocked && (
        <button 
          className="poster-check" 
          type="button" 
          aria-label="Mark watched"
          onClick={(e) => { e.stopPropagation(); toggleWatched(id); }}
        >
          {CHECK_ICON}
        </button>
      )}

      {isLocked && (
        <div className="lock-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        </div>
      )}

      <div className="poster-title">{title}</div>
    </div>
  );
}
