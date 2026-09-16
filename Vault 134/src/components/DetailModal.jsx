import React, { useState, useEffect } from 'react';
import { FAM_COLOR, family } from '../data/marvelData';
import { fetchImdbData } from '../services/collectApi';
import { posterArtStyle } from './PosterCard';

const PLAY_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const EXT_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const CHECK_ICON = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z"/></svg>;
const LOCK_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 13, height: 13}}><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;

export default function DetailModal({ item, isUpcoming, onClose, watched, toggleWatched }) {
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    if (item) {
      const title = isUpcoming ? item.title : item[2];
      fetchImdbData(title).then(data => {
        if (mounted && data) setApiData(data);
      });
    }
    return () => { mounted = false; };
  }, [item, isUpcoming]);

  if (!item) return null;

  const title = isUpcoming ? item.title : item[2];
  const year = isUpcoming ? null : item[1];
  const ty = isUpcoming ? null : item[3];
  const universe = isUpcoming ? item.universe : item[4];
  const pr = isUpcoming ? null : item[5];
  const syn = isUpcoming ? item.synopsis : item[6];
  const id = isUpcoming ? 1 : item[0];
  const fam = isUpcoming ? 'mcu' : family(universe);
  
  const isW = isUpcoming ? false : watched.has(id);
  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' official trailer')}`;
  const imdbUrl = apiData?.imdbID 
    ? `https://www.imdb.com/title/${apiData.imdbID}/`
    : `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`;

  const art = posterArtStyle(fam, id);

  return (
    <div className="modal-overlay show" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="detail-modal">
        <div className="detail-backdrop">
          <div className="poster-art">
            {apiData && apiData.Poster && apiData.Poster !== "N/A" ? (
              <div style={{ position: 'absolute', inset: '-20%', backgroundImage: `url(${apiData.Poster})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(10px)' }} />
            ) : (
              <>
                <div style={{ position: 'absolute', inset: '-20%', background: art.bg }}></div>
                <div style={{ position: 'absolute', inset: '-20%', backgroundImage: art.pattern, mixBlendMode: 'overlay', opacity: 0.7 }}></div>
              </>
            )}
          </div>
          <div className="detail-scrim"></div>
          <button className="detail-close" onClick={onClose} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <div className="detail-body">
          <h2 className="detail-title">{title}</h2>
          
          <div className="detail-meta">
            <span className="fam-dot" style={{ background: FAM_COLOR[fam] }}></span>
            <span>{universe}</span>
            {!isUpcoming && (
              <>
                <span className="sep">&middot;</span><span>{year}</span>
                <span className="sep">&middot;</span><span>{ty}</span>
                <span className="sep">&middot;</span><span className={`pill ${pr}`}>{pr}</span>
              </>
            )}
          </div>
          
          {isUpcoming && (
            <div className="detail-locked-tag">
              {LOCK_ICON}
              <span>Releases {item.date}</span>
            </div>
          )}
          
          <p className="detail-synopsis">{syn}</p>
          
          <div className="detail-actions">
            {!isUpcoming && (
              <button 
                className={`action-btn primary ${isW ? 'on' : ''}`} 
                onClick={() => toggleWatched(id)}
                type="button"
              >
                {CHECK_ICON} {isW ? 'Watched' : 'Mark watched'}
              </button>
            )}
            <a className="action-btn" target="_blank" rel="noopener noreferrer" href={trailerUrl}>
              {PLAY_ICON} Trailer
            </a>
            <a className="action-btn" target="_blank" rel="noopener noreferrer" href={imdbUrl}>
              {EXT_ICON} IMDb
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
