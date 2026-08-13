import React from 'react';
import { 
  MapPin, 
  Phone, 
  Star, 
  Flame, 
  Car, 
  Shirt, 
  Users, 
  Crown, 
  Clock, 
  Heart, 
  Plus 
} from 'lucide-react';
import { Business, Language } from '../types';

interface BusinessCardProps {
  business: Business;
  lang: Language;
  t: any;
  onClick: () => void;
  toggleFavorite?: (id: string) => void;
  favorites?: string[];
  isTrending?: boolean;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ 
  business, 
  lang, 
  t, 
  onClick, 
  toggleFavorite, 
  favorites = [], 
  isTrending = false 
}) => {
  const isNew = (() => {
    if (!business.createdAt) return false;
    const created = new Date(business.createdAt);
    const current = new Date(); // Dynamic reference to current date
    const diffTime = Math.abs(current.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Support 30-day threshold or fall back to 180 days for the stale mock dates
    return diffDays <= 60;
  })();

  const isFavorited = favorites.includes(business.id);

  return (
    <div 
      onClick={onClick} 
      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative group flex flex-col h-full"
    >
      <div className="h-48 relative overflow-hidden bg-gray-100 dark:bg-slate-900 shrink-0">
        {business.mediaType === 'video' && business.videoUrl ? (
          <video 
            src={business.videoUrl} 
            className="w-full h-full object-cover" 
            muted 
            onMouseOver={e => e.currentTarget.play()} 
            onMouseOut={e => { 
              e.currentTarget.pause(); 
              e.currentTarget.currentTime = 0; 
            }} 
          />
        ) : (
          <img 
            src={business.image || 'https://picsum.photos/seed/placeholder/400/300'} 
            alt={lang === 'ar' ? business.nameAr : business.nameEn}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
            loading="lazy"
          />
        )}
        
        {/* Category Badge */}
        <div className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} bg-red-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm z-10`}>
          {business.subCategory}
        </div>

        {/* Special Offer Badge */}
        {business.hasAdPage && (
          <div 
            className={`absolute top-3 ${lang === 'ar' ? 'left-16' : 'right-16'} bg-yellow-400 text-white p-1.5 rounded-full shadow-lg z-10 animate-bounce`} 
            title={t.specialOffer}
          >
            <Plus className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Heart Favorites Button */}
        {toggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(business.id);
            }}
            className={`absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'} z-20 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 p-2 rounded-full shadow-md backdrop-blur-sm transition-transform hover:scale-110 text-red-500`}
            title={t.saveToFavorites}
            aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
          </button>
        )}

        {/* Featured Pin Badge */}
        {business.isFeatured && (
          <div className="absolute bottom-3 left-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] px-2.5 py-1 rounded-lg font-black shadow-md flex items-center gap-1 z-10 uppercase">
            <Crown className="h-3 w-3" />
            <span>{t.featured}</span>
          </div>
        )}

        {/* New Opening Badge */}
        {isNew && business.category === 'restaurants' && (
          <div className="absolute bottom-3 right-3 bg-green-600 text-white text-[9px] px-2.5 py-1 rounded-lg font-black shadow-md flex items-center gap-1 z-10">
            <Clock className="h-3 w-3 animate-spin-slow" />
            <span>{t.newOpening}</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 mb-2 truncate">
            {lang === 'ar' ? business.nameAr : business.nameEn}
          </h3>
          
          <div className="flex justify-between items-center mb-3">
            <div className="space-y-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-red-400" />
                <span className="truncate max-w-[150px]">
                  {lang === 'ar' ? business.areaAr : business.areaEn} - {t.block} {business.block}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-green-400" />
                <span>{business.phone}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-750 dark:text-yellow-400 px-2 py-1 rounded-lg font-black text-xs border border-yellow-100 dark:border-yellow-900/30">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {business.ratingCount ? (business.ratingSum! / business.ratingCount!).toFixed(1) : "0.0"}
              </div>
              {isTrending && (
                <div className="flex items-center gap-1 text-[9px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-900/20">
                  <Flame className="h-3 w-3 fill-orange-500" />
                  <span>{business.views || 0}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Small Icons for Restaurant Details */}
        {business.category === 'restaurants' && (
          <div className="flex items-center gap-3 border-t border-gray-150 dark:border-slate-700 pt-3 text-gray-400 dark:text-slate-500">
            <div className="flex items-center gap-1" title={t.parking}>
              <Car className={`h-4 w-4 ${business.hasParking ? 'text-green-500' : 'text-gray-300 dark:text-gray-650'}`} />
              <span className="text-[9px] font-bold">{business.hasParking ? (lang === 'ar' ? 'مواقف' : 'Park') : ''}</span>
            </div>
            <div className="flex items-center gap-1" title={t.dressCode}>
              <Shirt className={`h-4 w-4 ${business.dressCodeEn ? 'text-blue-500' : 'text-gray-300 dark:text-gray-650'}`} />
              <span className="text-[9px] font-bold truncate max-w-[50px]">
                {business.dressCodeEn ? (lang === 'ar' ? business.dressCodeAr : business.dressCodeEn) : ''}
              </span>
            </div>
            <div className="flex items-center gap-1" title={t.familySection}>
              <Users className={`h-4 w-4 ${business.hasFamilySection ? 'text-purple-500' : 'text-gray-300 dark:text-gray-650'}`} />
              <span className="text-[9px] font-bold">{business.hasFamilySection ? (lang === 'ar' ? 'عوائل' : 'Fam') : ''}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
