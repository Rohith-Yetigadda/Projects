import React, { useState, useEffect, useCallback } from 'react';
import Hero from './components/Hero';
import FilterBar from './components/FilterBar';
import PosterGrid from './components/PosterGrid';
import UpcomingGrid from './components/UpcomingGrid';
import DetailModal from './components/DetailModal';
import { DATA, THEMES } from './data/marvelData';

function App() {
  const [watched, setWatched] = useState(new Set());
  const [search, setSearch] = useState('');
  const [fam, setFam] = useState('all');
  const [ty, setTy] = useState('all');
  const [pr, setPr] = useState('all');
  const [hideWatched, setHideWatched] = useState(false);
  const [theme, setTheme] = useState('');
  
  const [detailItem, setDetailItem] = useState(null);
  const [isUpcomingModal, setIsUpcomingModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastTimer, setToastTimer] = useState(null);
  
  // Compact state for FilterBar scroll
  const [isCompact, setIsCompact] = useState(false);
  const [showFloatPill, setShowFloatPill] = useState(false);

  useEffect(() => {
    async function loadState() {
      try {
        if (window.storage) {
          const res = await window.storage.get('marvel-tracker-v4', false);
          if (res && res.value) {
            const p = JSON.parse(res.value);
            if (p.watched) setWatched(new Set(p.watched));
            if (p.theme !== undefined) setTheme(p.theme);
          }
        }
      } catch (e) {}
    }
    loadState();
  }, []);

  const saveState = useCallback(async (newWatched, newTheme) => {
    try {
      if (window.storage) {
        await window.storage.set('marvel-tracker-v4', JSON.stringify({
          watched: Array.from(newWatched),
          theme: newTheme
        }), false);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    saveState(watched, theme);
  }, [theme, watched, saveState]);

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector('.hero');
      const heroBottom = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 0;
      setIsCompact(window.scrollY > 40);
      setShowFloatPill(window.scrollY > heroBottom - 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleWatched = (id) => {
    const newWatched = new Set(watched);
    if (newWatched.has(id)) {
      newWatched.delete(id);
    } else {
      newWatched.add(id);
    }
    setWatched(newWatched);
  };

  const handleReset = () => {
    setWatched(new Set());
    setShowResetModal(false);
    showToast('Progress reset');
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const timer = setTimeout(() => setToastMsg(''), 2200);
    setToastTimer(timer);
  };

  const openDetail = (item, upcoming) => {
    setDetailItem(item);
    setIsUpcomingModal(upcoming);
    document.body.style.overflow = 'hidden';
  };

  const closeDetail = () => {
    setDetailItem(null);
    document.body.style.overflow = '';
  };

  return (
    <>
      <div className="wrap">
        <Hero 
          watched={watched} 
          theme={theme} 
          setTheme={setTheme} 
        />
        
        <FilterBar 
          search={search} setSearch={setSearch}
          fam={fam} setFam={setFam}
          ty={ty} setTy={setTy}
          pr={pr} setPr={setPr}
          hideWatched={hideWatched} setHideWatched={setHideWatched}
          isCompact={isCompact}
        />
        
        <div className="decade-nav" id="decadeNav">
          {[{label:"1990s",from:1990,to:1999}, {label:"2000s",from:2000,to:2009}, {label:"2010s",from:2010,to:2019}, {label:"2020s",from:2020,to:2029}].map(dec => (
            <button 
              key={dec.label} 
              className="decade-pill" 
              type="button"
              onClick={() => {
                const target = [...document.querySelectorAll('.year-row')].find(el => {
                  const y = parseInt(el.textContent, 10);
                  return y >= dec.from && y <= dec.to;
                });
                const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (target) target.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: 'start' });
              }}
            >
              {dec.label}
            </button>
          ))}
        </div>

        <PosterGrid 
          watched={watched} 
          toggleWatched={toggleWatched}
          search={search}
          fam={fam}
          ty={ty}
          pr={pr}
          hideWatched={hideWatched}
          openDetail={openDetail}
        />

        <div className="upcoming">
          <h3>On the horizon</h3>
          <p className="sub">Not released yet — don't spoil the order for yourself.</p>
          <UpcomingGrid openDetail={openDetail} />
        </div>

        <div className="foot">
          <button className="reset-link" onClick={() => setShowResetModal(true)} type="button">
            Reset progress
          </button>
        </div>
      </div>

      <div className={`float-pill ${showFloatPill ? 'show' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <span className="dot"></span>
        <span>{watched.size}/{DATA.length}</span>
      </div>

      <DetailModal 
        item={detailItem} 
        isUpcoming={isUpcomingModal} 
        onClose={closeDetail} 
        watched={watched}
        toggleWatched={toggleWatched}
      />

      <div className={`modal-bg ${showResetModal ? 'show' : ''}`} onClick={(e) => { if (e.target.classList.contains('modal-bg')) setShowResetModal(false) }}>
        <div className="modal">
          <p>Reset all watched progress? This can't be undone.</p>
          <div className="modal-btns">
            <button onClick={() => setShowResetModal(false)} type="button">Cancel</button>
            <button className="danger" onClick={handleReset} type="button">Reset</button>
          </div>
        </div>
      </div>

      <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
    </>
  );
}

export default App;
