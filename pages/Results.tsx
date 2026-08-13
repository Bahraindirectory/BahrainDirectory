import React from 'react';
import { ArrowRight, Info, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Business, Category, Ad, SiteConfig } from '../types';
import { BusinessCard } from '../components/BusinessCard';
import { AdSection } from '../components/AdSection';

interface ResultsProps {
  filteredBusinesses: Business[];
  selectedCategory: string | null;
  categories: Category[];
  ads: Ad[];
  siteConfig: SiteConfig;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  onSelectBusiness: (b: Business) => void;
  onBackToHome: () => void;
  
  // Filter states
  filterCuisine: string;
  setFilterCuisine: (c: string) => void;
  filterArea: string;
  setFilterArea: (a: string) => void;
  filterPrice: '$' | '$$' | '$$$' | '';
  setFilterPrice: (p: '$' | '$$' | '$$$' | '') => void;
  isOpenNow: boolean;
  setIsOpenNow: (o: boolean) => void;
}

export const Results: React.FC<ResultsProps> = ({
  filteredBusinesses,
  selectedCategory,
  categories,
  ads,
  siteConfig,
  favorites,
  toggleFavorite,
  onSelectBusiness,
  onBackToHome,
  filterCuisine,
  setFilterCuisine,
  filterArea,
  setFilterArea,
  filterPrice,
  setFilterPrice,
  isOpenNow,
  setIsOpenNow
}) => {
  const { lang, t } = useLanguage();

  return (
    <div className="animate-fadeIn">
      {/* Breadcrumbs and Quick Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 md:mb-8 text-gray-600 dark:text-slate-400">
        <div className="flex items-center gap-2 text-sm md:text-base">
          <button onClick={onBackToHome} className="hover:underline hover:text-red-650 transition-colors">{t.home}</button>
          <ArrowRight className={`h-4 w-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          <span className="font-bold text-gray-900 dark:text-slate-100 truncate">
            {selectedCategory 
              ? (lang === 'ar' 
                  ? categories.find(c => c.id === selectedCategory)?.titleAr 
                  : categories.find(c => c.id === selectedCategory)?.titleEn) 
              : t.results}
          </span>
        </div>
        {selectedCategory && (
          <select
            className="p-2 border border-gray-250 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-auto"
            onChange={(e) => {
              const business = filteredBusinesses.find(b => b.id === e.target.value);
              if (business) onSelectBusiness(business);
            }}
            value=""
          >
            <option value="">{lang === 'ar' ? 'اختر منشأة...' : 'Choose business...'}</option>
            {filteredBusinesses.map(b => (
              <option key={b.id} value={b.id}>
                {lang === 'ar' ? b.nameAr : b.nameEn}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6 flex flex-wrap items-center gap-4 animate-fadeIn">
        {/* Cuisine Filter */}
        <div className="flex flex-col gap-1 min-w-[130px] flex-1 sm:flex-none">
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{t.cuisine}</label>
          <select
            className="p-2 border border-gray-200 dark:border-slate-750 rounded-xl bg-gray-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-750 dark:text-slate-350"
            value={filterCuisine}
            onChange={(e) => setFilterCuisine(e.target.value)}
          >
            <option value="">{t.allCuisines}</option>
            {(lang === 'ar' 
              ? ['وجبات سريعة', 'إيطالي', 'هندي', 'مقاهي', 'عربي'] 
              : ['Fast Food', 'Italian', 'Indian', 'Cafe', 'Arabic']
            ).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Area Filter */}
        <div className="flex flex-col gap-1 min-w-[130px] flex-1 sm:flex-none">
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{t.area}</label>
          <select
            className="p-2 border border-gray-200 dark:border-slate-750 rounded-xl bg-gray-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-755 dark:text-slate-355"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
          >
            <option value="">{t.allAreas}</option>
            {(lang === 'ar' 
              ? ['المنامة', 'الرفاع', 'المحرق', 'الجفير', 'سار'] 
              : ['Manama', 'Riffa', 'Muharraq', 'Juffair', 'Saar']
            ).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Price Range Filter */}
        <div className="flex flex-col gap-1 flex-1 sm:flex-none">
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{t.priceRange}</label>
          <div className="flex gap-1.5">
            {['$', '$$', '$$$'].map(p => (
              <button
                key={p}
                onClick={() => setFilterPrice(filterPrice === p ? '' : p as any)}
                className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                  filterPrice === p 
                    ? 'bg-red-600 text-white border-red-650 shadow-md shadow-red-100 dark:shadow-none' 
                    : 'bg-gray-55 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-750'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Open Now Toggle */}
        <div className="flex items-center gap-2 mt-4 sm:mt-0 flex-1 sm:flex-none justify-end sm:justify-start">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-750 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl transition-all">
            <Clock className={`h-4.5 w-4.5 ${isOpenNow ? 'text-green-600' : 'text-gray-400 dark:text-slate-500'}`} />
            <span>{t.openNow}</span>
            <input
              type="checkbox"
              checked={isOpenNow}
              onChange={(e) => setIsOpenNow(e.target.checked)}
              className="w-4 h-4 text-red-650 rounded cursor-pointer accent-red-600"
            />
          </label>
        </div>

        {/* Reset Filters */}
        {(filterCuisine || filterArea || filterPrice || isOpenNow) && (
          <button
            onClick={() => {
              setFilterCuisine('');
              setFilterArea('');
              setFilterPrice('');
              setIsOpenNow(false);
            }}
            className="text-xs font-bold text-red-600 hover:underline mt-4 sm:mt-0"
          >
            {lang === 'ar' ? 'مسح الفلاتر' : 'Reset Filters'}
          </button>
        )}
      </div>

      {/* Middle Banner Advertisement */}
      <AdSection ads={ads} position="middle" selectedCategory={selectedCategory} limit={siteConfig.maxAdsMiddle || 1} />

      {/* Results Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredBusinesses.map(b => (
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

      {/* Empty States */}
      {filteredBusinesses.length === 0 && (
        <div className="col-span-full py-16 md:py-20 text-center">
          <Info className="h-10 w-10 md:h-12 md:w-12 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg md:text-xl text-gray-400 dark:text-slate-550">{t.noResults}</p>
        </div>
      )}
    </div>
  );
};
