import React, { useState, useEffect, useRef } from 'react';
import { FAM_LABEL, FAM_COLOR } from '../data/marvelData';
import { Search, ChevronDown } from 'lucide-react';

function Dropdown({ label, value, options, onChange, defaultLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="dropdown" ref={ref}>
      <button 
        className={`dd-btn ${isOpen ? 'open' : ''} ${value !== 'all' ? 'set' : ''}`} 
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
      >
        <span>{value === 'all' ? defaultLabel : options.find(o => o.value === value)?.label}</span>
        <ChevronDown size={14} strokeWidth={2.5} />
      </button>
      <div className={`dd-panel ${isOpen ? 'open' : ''}`}>
        {options.map(opt => (
          <div 
            key={opt.value} 
            className={`dd-item ${value === opt.value ? 'sel' : ''}`}
            onClick={() => { onChange(opt.value); setIsOpen(false); }}
          >
            <span className="item-left">
              {opt.dot && <span className="fam-dot" style={{ background: opt.dot }}></span>}
              {opt.label}
            </span>
            <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FilterBar({ search, setSearch, fam, setFam, ty, setTy, pr, setPr, hideWatched, setHideWatched, isCompact }) {
  
  const famOptions = [{label: 'All universes', value: 'all'}].concat(
    Object.keys(FAM_LABEL).map(f => ({ label: FAM_LABEL[f], value: f, dot: FAM_COLOR[f] }))
  );
  
  const tyOptions = [
    {label: 'All types', value: 'all'},
    {label: 'Movie', value: 'Movie'},
    {label: 'Series', value: 'Series'},
    {label: 'Special', value: 'Special'}
  ];
  
  const prOptions = [
    {label: 'All priorities', value: 'all'},
    {label: 'Essential', value: 'Essential'},
    {label: 'Recommended', value: 'Recommended'},
    {label: 'Optional', value: 'Optional'}
  ];

  return (
    <div className={`filterbar ${isCompact ? 'compact' : ''}`}>
      <div className="search-field">
        <Search size={14} />
        <input 
          type="text" 
          placeholder="Search titles…" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      
      <Dropdown label="Universe" value={fam} options={famOptions} onChange={setFam} defaultLabel="Universe" />
      <Dropdown label="Type" value={ty} options={tyOptions} onChange={setTy} defaultLabel="Type" />
      <Dropdown label="Priority" value={pr} options={prOptions} onChange={setPr} defaultLabel="Priority" />
      
      <div className="toggle-mini" onClick={() => setHideWatched(!hideWatched)}>
        <span>Hide watched</span>
        <div className={`switch ${hideWatched ? 'on' : ''}`}></div>
      </div>
    </div>
  );
}
