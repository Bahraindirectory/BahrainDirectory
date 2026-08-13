
import React from 'react';
import { 
  Utensils, 
  ShoppingBag, 
  HeartPulse, 
  Car, 
  MoreHorizontal, 
  Home, 
  Search, 
  Settings, 
  Users,
  Coffee,
  Store,
  Stethoscope,
  Wrench,
  Grid
} from 'lucide-react';
import { Category, Establishment, Advertisement } from './types';

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    name: { ar: 'المطاعم والكافيهات', en: 'Restaurants & Cafes' },
    icon: 'Utensils',
    subCategories: ['جلسات داخلية', 'عائلية', 'وجبات سريعة', 'كفتيريات', 'مقاهي', 'كرك']
  },
  {
    id: 'supermarket',
    name: { ar: 'سوبرماركت وبرادات', en: 'Supermarkets & Groceries' },
    icon: 'Store',
    subCategories: ['سوبرماركت', 'برادات صغيرة', 'خضار وفواكه']
  },
  {
    id: 'health',
    name: { ar: 'الصحة', en: 'Health & Wellness' },
    icon: 'HeartPulse',
    subCategories: ['مراكز صحية', 'عيادات', 'صيدليات']
  },
  {
    id: 'cars',
    name: { ar: 'قسم السيارات', en: 'Automotive' },
    icon: 'Car',
    subCategories: ['تصليح', 'تأجير', 'بيع سيارات', 'دراجات نارية']
  },
  {
    id: 'others',
    name: { ar: 'أقسام أخرى', en: 'Others' },
    icon: 'Grid',
    subCategories: ['ملابس', 'ذهب', 'إلكترونيات', 'أثاث', 'نظارات', 'مكتبات', 'محلات رياضية', 'صالات ألعاب', 'GYM', 'سفريات', 'صالونات رجالية/نسائية', 'فنادق', 'شقق', 'مكاتب', 'عقارات']
  }
];

export const INITIAL_LISTINGS: Establishment[] = [
  {
    id: '1',
    name: { ar: 'مطعم بحرين الشعبي', en: 'Bahrain Local Restaurant' },
    category: 'food',
    subCategory: 'عائلية',
    area: { ar: 'الرفاع', en: 'Riffa' },
    block: '901',
    phone: ['+973 17000000'],
    googleMapsUrl: 'https://maps.google.com',
    instagramUrl: 'https://instagram.com'
  },
  {
    id: '2',
    name: { ar: 'برادات المملكة', en: 'Kingdom Coldstore' },
    category: 'supermarket',
    subCategory: 'برادات صغيرة',
    area: { ar: 'المنامة', en: 'Manama' },
    block: '304',
    phone: ['+973 17111111'],
    googleMapsUrl: 'https://maps.google.com',
    instagramUrl: 'https://instagram.com'
  }
];

export const INITIAL_ADS: Advertisement[] = [
  { id: 'ad1', imageUrl: 'https://picsum.photos/seed/ad1/800/200', link: '#', active: true },
  { id: 'ad2', imageUrl: 'https://picsum.photos/seed/ad2/800/200', link: '#', active: true },
  { id: 'ad3', imageUrl: 'https://picsum.photos/seed/ad3/800/200', link: '#', active: true },
  { id: 'ad4', imageUrl: 'https://picsum.photos/seed/ad4/800/200', link: '#', active: true },
  { id: 'ad5', imageUrl: 'https://picsum.photos/seed/ad5/800/200', link: '#', active: true },
];

export const getIcon = (iconName: string, className?: string) => {
  switch (iconName) {
    case 'Utensils': return <Utensils className={className} />;
    case 'Store': return <Store className={className} />;
    case 'HeartPulse': return <HeartPulse className={className} />;
    case 'Car': return <Car className={className} />;
    case 'Grid': return <Grid className={className} />;
    case 'Search': return <Search className={className} />;
    case 'Settings': return <Settings className={className} />;
    case 'Users': return <Users className={className} />;
    default: return <MoreHorizontal className={className} />;
  }
};
