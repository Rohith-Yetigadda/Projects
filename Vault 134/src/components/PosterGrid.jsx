import React from 'react';
import { DATA, family } from '../data/marvelData';
import PosterCard from './PosterCard';

export default function PosterGrid({ watched, toggleWatched, search, fam, ty, pr, hideWatched, openDetail }) {
  const filtered = DATA.filter(item => {
    const [id, year, title, itemTy, universe, itemPr] = item;
    if (search && title.toLowerCase().indexOf(search.toLowerCase()) === -1) return false;
    if (fam !== 'all' && family(universe) !== fam) return false;
    if (ty !== 'all' && itemTy !== ty) return false;
    if (pr !== 'all' && itemPr !== pr) return false;
    if (hideWatched && watched.has(id)) return false;
    return true;
  });

  if (filtered.length === 0) {
    return <div id="list"><div className="empty">Nothing matches those filters.</div></div>;
  }

  // Group by year
  const grouped = [];
  let currentYear = null;
  let currentGroup = null;

  filtered.forEach(item => {
    const year = item[1];
    if (year !== currentYear) {
      currentGroup = { year, items: [] };
      grouped.push(currentGroup);
      currentYear = year;
    }
    currentGroup.items.push(item);
  });

  return (
    <div id="list">
      {grouped.map(group => (
        <React.Fragment key={`year-${group.year}`}>
          <div className="year-row">
            <span>{group.year}</span>
            <span className="ln"></span>
          </div>
          <div className="grid">
            {group.items.map(item => (
              <PosterCard 
                key={item[0]} 
                item={item}
                isWatched={watched.has(item[0])}
                toggleWatched={toggleWatched}
                openDetail={openDetail}
              />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
