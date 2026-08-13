import React from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Category, Business, SiteConfig } from '../types';
import { CategoryCard } from '../components/CategoryCard';
import { BusinessCard } from '../components/BusinessCard';

interface HomeProps {
  categories: Category[];
  trendingRestaurants: Business[];
  siteConfig: SiteConfig;
  onSelectCategory: (catId: string) => void;
  onSelectBusiness: (business: Business) => void;
  toggleFavorite: (businessId: string) => void;
  favorites: string[];
}

export const Home: React.FC<HomeProps> = ({
  categories,
  trendingRestaurants,
  siteConfig,
  onSelectCategory,
  onSelectBusiness,
  toggleFavorite,
  favorites
}) => {
  const { lang, t } = useLanguage();

  return (
    <div className="space-y-6 md:space-y-10 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-slate-100 mb-2 px-2">
          {lang === 'ar' ? 'ماذا تبحث عنه اليوم؟' : 'What are you looking for today?'}
        </h2>
        <p className="text-sm md:text-base text-gray-500 dark:text-slate-400 px-4">
          {lang === 'ar' ? 'اكتشف أفضل الخدمات والمحلات في مملكة البحرين' : 'Discover the best services and shops in Bahrain'}
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
        {categories.map((cat) => (
          <CategoryCard 
            key={cat.id} 
            category={cat} 
            lang={lang} 
            onClick={() => onSelectCategory(cat.id)} 
          />
        ))}
      </div>

      {/* Trending Section */}
      {trendingRestaurants.length > 0 && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
            <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
            <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-slate-100">
              {t.trendingThisWeek}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {trendingRestaurants.map(b => (
              <BusinessCard 
                key={b.id} 
                business={b} 
                lang={lang} 
                t={t} 
                onClick={() => onSelectBusiness(b)} 
                toggleFavorite={toggleFavorite} 
                favorites={favorites} 
                isTrending 
              />
            ))}
          </div>
        </div>
      )}

      {/* About Us Section */}
      {(siteConfig.aboutUsAr || siteConfig.aboutUsEn) && (
        <div className="mt-16 bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-slate-700 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500"></div>
          <h3 className="text-3xl font-black mb-6 text-gray-900 dark:text-slate-100">
            {lang === 'ar' ? 'من نحن' : 'About Us'}
          </h3>
          <div className="max-w-3xl mx-auto">
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
              {lang === 'ar' ? siteConfig.aboutUsAr : siteConfig.aboutUsEn}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-8 text-center text-gray-400 dark:text-slate-500 border-t border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-center gap-2 mb-2">
          {siteConfig.logoUrl ? (
            <img src={siteConfig.logoUrl} alt="logo" className="h-6 w-auto opacity-50 grayscale" />
          ) : (
            <div className="w-6 h-6 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center text-xs font-bold text-gray-500">B</div>
          )}
          <span className="font-bold text-gray-700 dark:text-slate-400">
            {lang === 'ar' ? siteConfig.titleAr : siteConfig.titleEn}
          </span>
        </div>
        <p className="text-xs">&copy; {new Date().getFullYear()} All Rights Reserved.</p>
      </footer>
    </div>
  );
};
