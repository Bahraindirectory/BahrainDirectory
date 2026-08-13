import React from 'react';
import * as Icons from 'lucide-react';
import { Category, Language } from '../types';

interface CategoryCardProps {
  category: Category;
  lang: Language;
  onClick: () => void;
}

// Icon mappings based on Category.icon string
const IconMap: Record<string, React.ComponentType<any>> = {
  Utensils: Icons.Utensils,
  ShoppingCart: Icons.ShoppingCart,
  HeartPulse: Icons.HeartPulse,
  Car: Icons.Car,
  ShoppingBag: Icons.ShoppingBag,
  Home: Icons.Home,
  Layers: Icons.Layers,
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, lang, onClick }) => {
  const IconComponent = IconMap[category.icon] || Icons.Layers;

  return (
    <button 
      onClick={onClick} 
      className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all group focus:outline-none focus:ring-2 focus:ring-red-500"
      aria-label={lang === 'ar' ? `قسم ${category.titleAr}` : `Category ${category.titleEn}`}
    >
      <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-red-600 group-hover:text-white dark:group-hover:bg-red-600 dark:group-hover:text-white transition-colors duration-300">
        <IconComponent className="h-8 w-8" />
      </div>
      <h3 className="font-bold text-gray-900 dark:text-slate-100 text-center transition-colors">
        {lang === 'ar' ? category.titleAr : category.titleEn}
      </h3>
    </button>
  );
};
