
export type Language = 'ar' | 'en';

export interface Establishment {
  id: string;
  name: { ar: string; en: string };
  category: string;
  subCategory: string;
  area: { ar: string; en: string };
  block: string;
  phone: string[];
  googleMapsUrl: string;
  instagramUrl: string;
}

export interface Category {
  id: string;
  name: { ar: string; en: string };
  icon: string;
  subCategories: string[];
}

export interface Advertisement {
  id: string;
  imageUrl: string;
  link: string;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'manager';
}
