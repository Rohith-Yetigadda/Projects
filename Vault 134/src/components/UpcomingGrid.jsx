import React from 'react';
import { UPCOMING } from '../data/marvelData';
import PosterCard from './PosterCard';

export default function UpcomingGrid({ openDetail }) {
  return (
    <div className="grid" id="upcomingGrid">
      {UPCOMING.map((item, idx) => (
        <PosterCard 
          key={idx} 
          item={item} 
          isUpcoming={true} 
          openDetail={openDetail}
          isWatched={false}
          toggleWatched={() => {}}
        />
      ))}
    </div>
  );
}
