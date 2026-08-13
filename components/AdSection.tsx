import React from 'react';
import { Ad } from '../types';

interface AdSectionProps {
  ads: Ad[];
  position: 'top' | 'middle' | 'bottom' | 'sidebar';
  selectedCategory?: string | null;
  limit: number;
}

export const AdSection: React.FC<AdSectionProps> = ({ ads, position, selectedCategory, limit }) => {
  const filtered = ads
    .filter(a => a.active && a.position === position && (!a.categoryId || a.categoryId === selectedCategory))
    .slice(0, limit);

  if (filtered.length === 0) return null;

  const gridCols = filtered.length === 1 
    ? 'grid-cols-1' 
    : filtered.length === 2 
      ? 'grid-cols-2' 
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-4 mb-8 w-full`}>
      {filtered.map(ad => (
        <div 
          key={ad.id} 
          className={`w-full ${ad.heightClass} rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative group`}
        >
          {ad.mediaType === 'image' ? (
            <img 
              src={ad.imageUrl} 
              alt={ad.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              loading="lazy"
            />
          ) : (
            <video 
              src={ad.videoUrl} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover" 
            />
          )}
          <a href={ad.link} target="_blank" rel="noreferrer" className="absolute inset-0 z-10" aria-label={`Ad: ${ad.title}`}></a>
          <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-md">AD</div>
        </div>
      ))}
    </div>
  );
};
