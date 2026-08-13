import React from 'react';
import { ArrowRight, Info, Heart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Business, User } from '../types';
import { BusinessCard } from '../components/BusinessCard';

interface FavoritesProps {
  businesses: Business[];
  favorites: string[];
  currentUser: User | null;
  toggleFavorite: (id: string) => void;
  onSelectBusiness: (b: Business) => void;
  onBackToHome: () => void;
}

export const Favorites: React.FC<FavoritesProps> = ({
  businesses,
  favorites,
  currentUser,
  toggleFavorite,
  onSelectBusiness,
  onBackToHome
}) => {
  const { lang, t } = useLanguage();
  const favoritedListings = businesses.filter(b => favorites.includes(b.id));

  return (
    <div className="animate-fadeIn">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-gray-500 dark:text-slate-450 text-sm md:text-base">
        <button onClick={onBackToHome} className="hover:underline">{t.home}</button>
        <ArrowRight className={`h-4 w-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
        <span className="font-bold text-gray-900 dark:text-slate-100">{t.favorites}</span>
      </div>

      {/* Main Header & Warnings */}
      <div className="mb-6">
        <h2 className="text-xl md:text-3xl font-black text-gray-900 dark:text-slate-100 mb-2">
          {t.favoritesPageTitle}
        </h2>
        {!currentUser && (
          <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/35 text-yellow-800 dark:text-yellow-400 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-yellow-600 shrink-0" />
            <span>
              {lang === 'ar' 
                ? 'تنبيه: أنت تتصفح كزائر. يرجى تسجيل الدخول لحفظ مفضلتك بشكل دائم.' 
                : 'Note: You are browsing as a guest. Log in to save your favorites permanently.'}
            </span>
          </div>
        )}
      </div>

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {favoritedListings.map(b => (
          <BusinessCard 
            key={b.id} 
            business={b} 
            lang={lang} 
            t={t} 
            onClick={() => onSelectBusiness(b)} 
            toggleFavorite={toggleFavorite} 
            favorites={favorites} 
          />
        ))}
      </div>

      {/* Empty State */}
      {favoritedListings.length === 0 && (
        <div className="py-16 md:py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border border-gray-250 dark:border-slate-700">
          <Heart className="h-10 w-10 md:h-12 md:w-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-gray-400 dark:text-slate-500 font-bold text-sm md:text-base">
            {lang === 'ar' ? 'لا توجد منشآت في مفضلتك بعد.' : 'No businesses saved in your favorites yet.'}
          </p>
          <button 
            onClick={onBackToHome} 
            className="mt-4 bg-red-650 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow"
          >
            {lang === 'ar' ? 'اكتشف المنشآت' : 'Explore Businesses'}
          </button>
        </div>
      )}
    </div>
  );
};
