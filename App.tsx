import React, { useState, useEffect, useMemo, useContext, createContext, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Globe, Settings, Search, X, Users, Heart, Menu,
  Utensils, ShoppingCart, HeartPulse, Car, ShoppingBag, Home as HomeIcon,
  Star, MapPin, Phone, Instagram, ExternalLink, ChevronLeft, ChevronRight,
  Clock, ParkingCircle, Shirt, ArrowLeft, Trash2, Edit, Plus, LogIn,
  LogOut, Download, Upload, BarChart2, Shield, Tag, FileText, RefreshCw,
  CheckSquare, Square, Image, Video, Loader, MessageCircle, Calendar,
  Grid, Sliders, Award, TrendingUp, Percent, Activity, DollarSign, Printer, Share2, Mail, FileCheck,
  RotateCcw, Eye, EyeOff, AlertTriangle, Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SalesPanel } from './src/components/SalesPanel';
import { Landmark, LandmarksSection, LandmarksAdminPanel, INITIAL_LANDMARKS } from './src/components/LandmarksSection';
import { BusinessActivitySection } from './src/components/BusinessActivitySection';
import { isFirebaseEnabled, fetchCollection, saveDocument, saveCollection, subscribeToCollection, deleteDocument } from './src/lib/firebase';
import { convertFileToWebP, optimizeImageUrl } from './src/lib/imageOptimizer';

const APP_VERSION = '1.4.3';

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[Storage] Failed to save key "${key}" to localStorage:`, e);
  }
};

// ─── TYPES ──────────────────────────────────────────────────────────────────

type Language = 'ar' | 'en';

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
  reply?: string;
}

interface Business {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  subCategory: string;
  areaAr: string;
  areaEn: string;
  block: string;
  phone: string;
  instagram?: string;
  whatsapp?: string;
  googleMapsUrl: string;
  image?: string;
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  pdfUrl?: string;
  pdfName?: string;
  hasAdPage?: boolean;
  adPageContent?: string;
  adPageMediaUrl?: string;
  adPageMediaType?: 'image' | 'video';
  adStartDate?: string;
  adEndDate?: string;
  activities?: string;
  workHours?: string;
  governorate?: string;
  ratingSum?: number;
  ratingCount?: number;
  isPriority?: boolean;
  createdAt?: string;
  isFeatured?: boolean;
  cuisine?: string;
  cuisineAr?: string;
  priceRange?: '$' | '$$' | '$$$';
  openTime?: string;
  closeTime?: string;
  hasParking?: boolean;
  dressCodeEn?: string;
  dressCodeAr?: string;
  hasFamilySection?: boolean;
  reviews?: Review[];
  views?: number;
}

interface Ad {
  id: string;
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType: 'image' | 'video';
  link: string;
  categoryId?: string;
  active: boolean;
  position: 'top' | 'middle' | 'bottom' | 'sidebar';
  heightClass: string;
  startDate?: string;
  endDate?: string;
  autoSize?: boolean;
  businessId?: string;
  addedBy?: string;
}

interface Category {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: string;
  subCategories: string[];
}

interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'editor';
  businessId?: string;
}

interface BazaarOffer {
  id: string;
  businessName: string;
  category: string;
  imageUrl: string;
  link: string;
  addedBy?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
}

interface SiteConfig {
  titleAr: string;
  titleEn: string;
  logoUrl: string;
  aboutUsAr?: string;
  aboutUsEn?: string;
  maxAdsTop?: number;
  maxAdsMiddle?: number;
  maxAdsBottom?: number;
  maxAdImageSizeMB?: number;
  maxAdVideoSizeMB?: number;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  contactInstagram?: string;
  showVisitorCount?: boolean;
}

export interface DeletedBusiness {
  id: string;
  business: Business;
  deletedAt: string;
  deletedBy?: string;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const INITIAL_CATEGORIES: Category[] = [
  { id: 'restaurants', titleAr: 'المطاعم والكافيهات', titleEn: 'Restaurants & Cafes', icon: 'Utensils', subCategories: ['جلسات داخلية', 'عائلية', 'وجبات سريعة', 'كفتيريات', 'مقاهي', 'كرك'] },
  { id: 'supermarkets', titleAr: 'سوبرماركت وبرادات', titleEn: 'Supermarkets & Coldstores', icon: 'ShoppingCart', subCategories: ['سوبرماركت', 'برادات صغيرة', 'خضار وفواكه'] },
  { id: 'health', titleAr: 'الصحة', titleEn: 'Health', icon: 'HeartPulse', subCategories: ['مراكز صحية', 'عيادات', 'صيدليات'] },
  { id: 'cars', titleAr: 'السيارات', titleEn: 'Automotive', icon: 'Car', subCategories: ['تصليح', 'تأجير', 'بيع سيارات', 'دراجات نارية'] },
  { id: 'shopping', titleAr: 'تسوق وأقسام أخرى', titleEn: 'Shopping & Others', icon: 'ShoppingBag', subCategories: ['ملابس', 'ذهب', 'إلكترونيات', 'أثاث', 'نظارات', 'مكتبات', 'محلات رياضية'] },
  { id: 'services', titleAr: 'خدمات ترفيهية وعقارات', titleEn: 'Leisure & Real Estate', icon: 'Home', subCategories: ['صالات ألعاب', 'GYM', 'سفريات', 'صالونات', 'فنادق', 'شقق', 'مكاتب', 'عقارات'] }
];

const DEMO_BUSINESS_NAMES = [
  'كفتيريا النور',
  'مطعم سيكوس الإيطالي',
  'مطعم سيكو الإيطالي',
  "Cico's Italian Restaurant",
  'لانترنز جورميه',
  'Lanterns Gourmet Lounge',
  'أروها كافيه',
  'Aroha Cafe',
  'صيدلية البحرين',
  'Bahrain Pharmacy',
  'سوبرماركت العائلة',
  'Family Supermarket',
  'مطعم بحرين الشعبي',
  'برادات المملكة'
];

const isDemoBusiness = (b: any) => {
  if (!b) return false;
  if (['1', '2', '3', '4', '5', '6'].includes(String(b.id)) && DEMO_BUSINESS_NAMES.some(name => b.nameAr?.includes(name) || b.nameEn?.includes(name))) {
    return true;
  }
  return false;
};

const isDemoAd = (ad: any) => {
  if (!ad) return false;
  if (['ad1', 'ad2', 'ad3', 'ad4', 'ad5'].includes(String(ad.id)) && (ad.imageUrl?.includes('picsum.photos') || ad.videoUrl?.includes('w3schools'))) {
    return true;
  }
  return false;
};

const isDemoBazaar = (bo: any) => {
  if (!bo) return false;
  if (['bo1', 'bo2', 'bo3'].includes(String(bo.id)) && DEMO_BUSINESS_NAMES.some(name => bo.businessName?.includes(name))) {
    return true;
  }
  return false;
};

const INITIAL_BUSINESSES: Business[] = [];

const INITIAL_ADS: Ad[] = [];

const INITIAL_MEMBERS: User[] = [
  { id: '1', username: 'admin', password: '123', role: 'admin' },
  { id: 'u2', username: 'editor', password: 'editor123', role: 'editor' },
];

const INITIAL_BAZAAR_OFFERS: BazaarOffer[] = [];

const INITIAL_SALES_PRODUCTS = [
  { id: 'p1', nameAr: 'إعلان مثبت أعلى الموقع', nameEn: 'Top Banner Ad', price: 120, unit: 'month' },
  { id: 'p2', nameAr: 'إعلان مميز في نتائج البحث', nameEn: 'Premium Search Ad', price: 30, unit: 'week' },
  { id: 'p3', nameAr: 'إعلان بازار جانبي', nameEn: 'Sidebar Bazaar Ad', price: 5, unit: 'day' },
  { id: 'p4', nameAr: 'باقة الرعاية الذهبية', nameEn: 'Golden Sponsorship Package', price: 299, unit: 'month' }
];

const INITIAL_SALES_INVOICES = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-2026-1001',
    businessId: 'b1',
    businessName: 'مطعم ومقهى نيرفانا',
    contactPhone: '+973 17586499',
    productId: 'p1',
    productName: 'إعلان مثبت أعلى الموقع',
    price: 120,
    unit: 'month',
    quantity: 2,
    startDate: '2026-06-01',
    endDate: '2026-08-01',
    totalAmount: 240,
    createdAt: '2026-06-01T10:00:00.000Z',
    createdBy: 'admin',
    createdByName: 'admin'
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-2026-1002',
    businessId: 'b3',
    businessName: 'أسواق المنتزه',
    contactPhone: '+973 17224444',
    productId: 'p2',
    productName: 'إعلان مميز في نتائج البحث',
    price: 30,
    unit: 'week',
    quantity: 4,
    startDate: '2026-07-01',
    endDate: '2026-07-29',
    totalAmount: 120,
    createdAt: '2026-07-01T11:30:00.000Z',
    createdBy: 'editor',
    createdByName: 'editor'
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-2026-1003',
    businessId: '',
    businessName: 'شركة النصر للمقاولات',
    contactPhone: '97339887766',
    productId: 'p3',
    productName: 'إعلان بازار جانبي',
    price: 5,
    unit: 'day',
    quantity: 10,
    startDate: '2026-07-05',
    endDate: '2026-07-15',
    totalAmount: 50,
    createdAt: '2026-07-05T09:15:00.000Z',
    createdBy: 'admin',
    createdByName: 'admin'
  }
];

const T = {
  ar: {
    searchPlaceholder: "ابحث بالاسم، المنطقة، أو رقم المجمع...",
    home: "الرئيسية", admin: "لوحة التحكم", results: "النتائج",
    noResults: "لا توجد نتائج مطابقة لبحثك.", contact: "اتصل بنا",
    maps: "خرائط جوجل", instagram: "إنستغرام", phone: "رقم الهاتف",
    block: "مجمع", area: "المنطقة", manageAds: "إدارة الإعلانات",
    manageBusinesses: "إدارة المنشآت", manageMembers: "إدارة الأعضاء",
    manageCategories: "إدارة الأقسام", syncSheet: "ربط جوجل شيت",
    addBusiness: "إضافة منشأة جديدة", addCategory: "إضافة قسم جديد",
    addMember: "إضافة عضو جديد", save: "حفظ", cancel: "إلغاء",
    edit: "تعديل", delete: "حذف", username: "اسم المستخدم",
    password: "كلمة المرور", role: "الصلاحية", syncNow: "تحديث البيانات الآن",
    sheetUrl: "رابط ملف CSV", syncSuccess: "تم التحديث بنجاح",
    syncError: "فشل في التحديث", exportData: "تصدير البيانات",
    allCategories: "كل الأقسام", exportCSV: "تصدير CSV",
    subCategories: "التفرعات", titleAr: "الاسم (عربي)", titleEn: "الاسم (إنجليزي)",
    reports: "التقارير", totalBusinesses: "إجمالي المنشآت",
    totalMembers: "إجمالي الأعضاء", totalVisitors: "إجمالي الزوار",
    activeAds: "إعلانات نشطة", rating: "التقييم", rateThis: "قيم هذه المنشأة",
    thankYouRating: "شكراً لتقييمك!", averageRating: "متوسط التقييم",
    isPriority: "منشأة مميزة", backToIndex: "العودة إلى القائمة",
    callNow: "اتصل الآن", specialOffer: "عرض خاص", validUntil: "صالح حتى",
    newOpening: "افتتاح جديد", trendingThisWeek: "التريند هذا الأسبوع",
    featured: "راعي مميز", openNow: "مفتوح الآن", cuisine: "نوع المطبخ",
    priceRange: "فئة السعر", parking: "مواقف متوفرة", dressCode: "الزي المفضل",
    familySection: "قسم العائلات", reviewsAndComments: "التقييمات والتعليقات",
    writeReview: "اكتب تقييماً", authorName: "الاسم",
    commentPlaceholder: "اكتب رأيك وتجربتك هنا...", submitReview: "نشر التقييم",
    noReviewsYet: "لا توجد تقييمات بعد. كن أول من يضيف!",
    saveToFavorites: "حفظ في المفضلة", favoritesPageTitle: "المنشآت المفضلة",
    favorites: "المفضلة", userLogin: "تسجيل دخول الأعضاء",
    userRegister: "إنشاء حساب جديد", login: "تسجيل الدخول",
    logout: "تسجيل الخروج", register: "تسجيل حساب",
    allCuisines: "كل المطابخ", allAreas: "كل المناطق", allPrices: "كل الأسعار",
    ratingCountText: "تقييم", deleteSelected: "حذف المحدد", selectAll: "تحديد الكل",
    bulkDeleteSuccess: "تم الحذف", noFavorites: "لا توجد منشآت مفضلة",
    adDisplaySettings: "إعدادات الإعلانات", maxAdsTop: "أقصى إعلانات (أعلى)",
    maxAdsMiddle: "أقصى إعلانات (منتصف)", maxAdsBottom: "أقصى إعلانات (أسفل)",
  },
  en: {
    searchPlaceholder: "Search by name, area, or block number...",
    home: "Home", admin: "Admin", results: "Results",
    noResults: "No results found.", contact: "Contact Us",
    maps: "Google Maps", instagram: "Instagram", phone: "Phone Number",
    block: "Block", area: "Area", manageAds: "Manage Ads",
    manageBusinesses: "Manage Businesses", manageMembers: "Manage Members",
    manageCategories: "Manage Categories", syncSheet: "Google Sheets Sync",
    addBusiness: "Add New Business", addCategory: "Add New Category",
    addMember: "Add New Member", save: "Save", cancel: "Cancel",
    edit: "Edit", delete: "Delete", username: "Username",
    password: "Password", role: "Role", syncNow: "Sync Data Now",
    sheetUrl: "Google Sheet CSV URL", syncSuccess: "Data synced successfully",
    syncError: "Failed to sync. Check the URL", exportData: "Export Data",
    allCategories: "All Categories", exportCSV: "Export CSV",
    subCategories: "Sub-Categories", titleAr: "Title (AR)", titleEn: "Title (EN)",
    reports: "Reports", totalBusinesses: "Total Businesses",
    totalMembers: "Total Members", totalVisitors: "Total Visitors",
    activeAds: "Active Ads", rating: "Rating", rateThis: "Rate this business",
    thankYouRating: "Thank you for your rating!", averageRating: "Average Rating",
    isPriority: "Priority Business", backToIndex: "Back to List",
    callNow: "Call Now", specialOffer: "Special Offer", validUntil: "Valid Until",
    newOpening: "New Opening", trendingThisWeek: "Trending This Week",
    featured: "Featured", openNow: "Open Now", cuisine: "Cuisine Type",
    priceRange: "Price Range", parking: "Parking Available", dressCode: "Dress Code",
    familySection: "Family Section", reviewsAndComments: "Reviews & Comments",
    writeReview: "Write a Review", authorName: "Your Name",
    commentPlaceholder: "Write your honest feedback here...", submitReview: "Submit Review",
    noReviewsYet: "No reviews yet. Be the first to leave one!",
    saveToFavorites: "Save to Favorites", favoritesPageTitle: "Your Favorite Businesses",
    favorites: "Favorites", userLogin: "User Login",
    userRegister: "Create New Account", login: "Log In",
    logout: "Log Out", register: "Register",
    allCuisines: "All Cuisines", allAreas: "All Areas", allPrices: "All Prices",
    ratingCountText: "ratings", deleteSelected: "Delete Selected", selectAll: "Select All",
    bulkDeleteSuccess: "Businesses deleted successfully", noFavorites: "No favourite businesses yet",
    adDisplaySettings: "Ad Display Settings", maxAdsTop: "Max Ads (Top)",
    maxAdsMiddle: "Max Ads (Middle)", maxAdsBottom: "Max Ads (Bottom)",
  }
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const LanguageContext = createContext<{
  lang: Language;
  setLang: React.Dispatch<React.SetStateAction<Language>>;
  t: typeof T['ar'];
}>({ lang: 'ar', setLang: () => {}, t: T['ar'] });

const AuthContext = createContext<{
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  members: User[];
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  isAdmin: boolean;
}>({ currentUser: null, setCurrentUser: () => {}, members: [], setMembers: () => {}, isAdmin: false });

const useLanguage = () => useContext(LanguageContext);
const useAuth = () => useContext(AuthContext);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getCategoryIcon(iconName: string, cls = "h-6 w-6") {
  const props = { className: cls };
  switch (iconName) {
    case 'Utensils': return <Utensils {...props} />;
    case 'ShoppingCart': return <ShoppingCart {...props} />;
    case 'HeartPulse': return <HeartPulse {...props} />;
    case 'Car': return <Car {...props} />;
    case 'ShoppingBag': return <ShoppingBag {...props} />;
    case 'Home': return <HomeIcon {...props} />;
    case 'Shirt': return <Shirt {...props} />;
    case 'Award': return <Award {...props} />;
    case 'Heart': return <Heart {...props} />;
    case 'FileText': return <FileText {...props} />;
    default: return <Tag {...props} />;
  }
}

function StarRating({ value, max = 5, size = 4, onChange }: { value: number; max?: number; size?: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < (hover || value);
        return (
          <Star
            key={i}
            className={`h-${size} w-${size} cursor-pointer transition-colors ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            onClick={() => onChange?.(i + 1)}
            onMouseEnter={() => onChange && setHover(i + 1)}
            onMouseLeave={() => onChange && setHover(0)}
          />
        );
      })}
    </div>
  );
}

function checkIsOpen(b: Business): boolean {
  if (!b.openTime || !b.closeTime) return true;
  const now = new Date();
  const cur = now.getHours() + now.getMinutes() / 60;
  const [oh, om] = b.openTime.split(':').map(Number);
  const [ch, cm] = b.closeTime.split(':').map(Number);
  const open = oh + om / 60;
  const close = ch + cm / 60;
  if (close < open) return cur >= open || cur <= close;
  return cur >= open && cur <= close;
}

function isNewOpening(b: Business): boolean {
  if (!b.createdAt) return false;
  const created = new Date(b.createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

// ─── AD SECTION ──────────────────────────────────────────────────────────────

function AdCard({ ad, lang }: { ad: Ad; lang: Language }) {
  const getCtaLabel = () => {
    const isShop = ad.link && (
      ad.link.toLowerCase().includes('shop') || 
      ad.link.toLowerCase().includes('buy') || 
      ad.link.toLowerCase().includes('store') ||
      ad.link.toLowerCase().includes('product') ||
      ad.link.toLowerCase().includes('checkout') ||
      ad.link.toLowerCase().includes('offer')
    );
    if (lang === 'ar') {
      return isShop ? 'تسوق الآن' : 'تعرف أكثر';
    } else {
      return isShop ? 'Shop Now' : 'Learn More';
    }
  };

  return (
    <motion.div
      whileHover={{ 
        y: -6, 
        scale: 1.02,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08)"
      }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full cursor-pointer transition-colors hover:border-red-300 dark:hover:border-red-900/40"
    >
      {/* Media container */}
      <div className={`relative w-full overflow-hidden bg-gray-50 dark:bg-slate-900 ${ad.autoSize ? 'h-auto' : 'h-44'}`}>
        {ad.mediaType === 'video' && ad.videoUrl ? (
          <video 
            src={ad.videoUrl} 
            autoPlay 
            muted 
            loop 
            playsInline 
            className={`w-full transition-transform duration-500 group-hover:scale-105 ${ad.autoSize ? 'h-auto object-contain max-h-[400px]' : 'h-full object-cover'}`} 
          />
        ) : ad.imageUrl ? (
          <img 
            src={optimizeImageUrl(ad.imageUrl)} 
            alt={ad.title} 
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full transition-transform duration-500 group-hover:scale-105 ${ad.autoSize ? 'h-auto object-contain max-h-[400px]' : 'h-full object-cover'}`} 
          />
        ) : (
          <div className="w-full h-44 flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-400">
            <Video className="h-8 w-8" />
          </div>
        )}
        
        {/* Subtle glassmorphic sponsored badge */}
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-bold text-white bg-black/60 dark:bg-slate-950/70 backdrop-blur-md rounded-full border border-white/10 shadow-sm">
          {lang === 'ar' ? 'إعلان ممول' : 'Sponsored'}
        </div>
      </div>

      {/* Ad info body */}
      <div className="p-4 flex flex-col justify-between flex-grow space-y-3">
        <div>
          <h4 className="font-bold text-sm text-gray-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
            {ad.title}
          </h4>
          
          {/* Subtle website indicator */}
          {ad.link && (
            <p className="text-[11px] text-gray-400 dark:text-slate-500 font-mono mt-1 flex items-center gap-1 truncate" dir="ltr">
              <ExternalLink className="h-3 w-3 shrink-0" />
              {(() => {
                try {
                  return new URL(ad.link).hostname.replace('www.', '');
                } catch {
                  return ad.link;
                }
              })()}
            </p>
          )}
        </div>

        {/* CTA Button */}
        <a 
          href={ad.link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-center mt-2"
          onClick={e => e.stopPropagation()}
        >
          <span>{getCtaLabel()}</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </a>
      </div>
    </motion.div>
  );
}

function AdSection({ ads, position, selectedCategory, limit = 1 }: { ads: Ad[]; position: string; selectedCategory: string | null; limit?: number }) {
  const { lang } = useLanguage();
  const [layout, setLayout] = useState<'grid' | 'carousel'>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter ads based on position, dates, and category placement
  const filtered = useMemo(() => {
    return ads.filter(a => {
      if (!a.active) return false;
      if (a.position !== position) return false;
      
      // Category Placement Check
      if (a.categoryId && a.categoryId !== 'all') {
        if (selectedCategory !== a.categoryId) return false;
      }

      // Auto-expiry check
      const now = new Date();
      if (a.startDate && new Date(a.startDate) > now) return false; // Not started yet
      if (a.endDate && new Date(a.endDate) < now) return false;     // Already expired
      
      return true;
    }).slice(0, limit);
  }, [ads, position, selectedCategory, limit]);

  if (!filtered.length) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % filtered.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
  };

  return (
    <div className="my-6 space-y-4">
      {/* Header section with title and layout switcher */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-red-600 rounded-full"></span>
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 tracking-wider uppercase font-sans">
            {lang === 'ar' ? 'إعلانات وعروض مميزة' : 'Featured Ads & Offers'}
          </span>
        </div>

        {/* Layout Switcher - Only display if there are multiple ads */}
        {filtered.length > 1 && (
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-gray-200/50 dark:border-slate-700/50">
            <button
              onClick={() => setLayout('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                layout === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-slate-100 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <Grid className="h-3 w-3" />
              <span>{lang === 'ar' ? 'شبكة' : 'Grid'}</span>
            </button>
            <button
              onClick={() => setLayout('carousel')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                layout === 'carousel'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-slate-100 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="h-3 w-3" />
              <span>{lang === 'ar' ? 'شريط تمرير' : 'Carousel'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {layout === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5"
          >
            {filtered.map(ad => (
              <div key={ad.id} className="h-full">
                <AdCard ad={ad} lang={lang} />
              </div>
            ))}
          </motion.div>
        ) : (
          /* Carousel Slider Layout */
          <motion.div
            key="carousel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative flex flex-col items-center justify-center py-4 bg-gray-50/50 dark:bg-slate-800/20 rounded-2xl p-4 border border-dashed border-gray-200 dark:border-slate-800"
          >
            {/* Carousel Inner Container with Arrows */}
            <div className="relative w-full flex items-center justify-between">
              {/* Prev Arrow */}
              <button
                onClick={prevSlide}
                className="z-10 p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-gray-150 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition-all focus:outline-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Slider Content */}
              <div className="w-full max-w-sm mx-4">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={filtered[currentIndex].id}
                    initial={{ opacity: 0, x: lang === 'ar' ? -50 : 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: lang === 'ar' ? 50 : -50 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="w-full"
                  >
                    <AdCard ad={filtered[currentIndex]} lang={lang} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Next Arrow */}
              <button
                onClick={nextSlide}
                className="z-10 p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-gray-150 dark:border-slate-700 hover:bg-gray-105 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition-all focus:outline-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            {/* Dot Indicators */}
            <div className="flex justify-center gap-1.5 w-full mt-4">
              {filtered.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentIndex === idx ? 'w-5 bg-red-600' : 'w-1.5 bg-gray-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BUSINESS CARD ───────────────────────────────────────────────────────────

function BusinessCard({ b, lang, t, isFav, onToggleFav, onClick }: {
  b: Business; lang: Language; t: typeof T['ar'];
  isFav: boolean; onToggleFav: () => void; onClick: () => void;
}) {
  const avg = b.ratingCount ? (b.ratingSum || 0) / b.ratingCount : 0;
  const open = checkIsOpen(b);
  const isNew = isNewOpening(b);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer animate-fadeIn group" onClick={onClick}>
      <div className="relative h-44 bg-gray-100 dark:bg-slate-700 overflow-hidden">
        {b.image
          ? <img src={optimizeImageUrl(b.image)} alt={lang === 'ar' ? b.nameAr : b.nameEn} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-gray-400"><HomeIcon className="h-16 w-16 opacity-30" /></div>
        }
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {b.isFeatured && <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.featured}</span>}
          {isNew && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{t.newOpening}</span>}
          {b.pdfUrl && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">📄 {lang === 'ar' ? 'منيو / PDF' : 'PDF'}</span>}
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {b.openTime && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${open ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>{open ? t.openNow : 'مغلق'}</span>}
          {b.priceRange && <span className="bg-white/80 dark:bg-slate-900/80 text-gray-700 dark:text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{b.priceRange}</span>}
        </div>
        <button
          className="absolute bottom-2 right-2 p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full hover:scale-110 transition-transform"
          onClick={e => { e.stopPropagation(); onToggleFav(); }}
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-snug truncate">{lang === 'ar' ? b.nameAr : b.nameEn}</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{lang === 'ar' ? b.subCategory : b.subCategory} · {lang === 'ar' ? b.areaAr : b.areaEn}</p>
        {b.ratingCount ? (
          <div className="flex items-center gap-1 mt-1">
            <StarRating value={Math.round(avg)} size={3} />
            <span className="text-xs text-gray-500 dark:text-slate-400">({b.ratingCount})</span>
          </div>
        ) : null}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-slate-400">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{t.block} {b.block}</span>
        </div>
      </div>
    </div>
  );
}

// ─── BAHRAIN CLOCK ───────────────────────────────────────────────────────────

function BahrainClock() {
  const { lang } = useLanguage();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-BH' : 'en-BH', {
          timeZone: 'Asia/Bahrain',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        setTimeStr(formatter.format(now));
      } catch (e) {
        setTimeStr(new Date().toLocaleString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  return (
    <div className="mt-4 flex items-center gap-2 bg-black/25 backdrop-blur-md px-4 py-2 rounded-2xl text-xs md:text-sm font-medium w-fit border border-white/10 text-white/95 shadow-inner">
      <Clock className="h-4 w-4 text-red-300 animate-pulse shrink-0" />
      <span>
        {lang === 'ar' ? 'توقيت البحرين الحالي: ' : 'Current Bahrain Time: '}
        <span className="font-mono tracking-wide">{timeStr}</span>
      </span>
    </div>
  );
}

// ─── HOME PAGE ───────────────────────────────────────────────────────────────

function Home({ categories, trendingRestaurants, siteConfig, onSelectCategory, onSelectBusiness, toggleFavorite, favorites, visitorCount, onSelectBazaar, onSelectLandmarks }: {
  categories: Category[]; trendingRestaurants: Business[]; siteConfig: SiteConfig;
  onSelectCategory: (id: string) => void; onSelectBusiness: (b: Business) => void;
  toggleFavorite: (id: string) => void; favorites: string[]; visitorCount?: number;
  onSelectBazaar: () => void; onSelectLandmarks: () => void;
}) {
  const { lang, t } = useLanguage();
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-red-700 via-red-600 to-red-800 text-white p-8 md:p-12 shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://picsum.photos/seed/pattern/800/400')] bg-cover"></div>
        <div className="relative z-10">
          <h2 className="text-2xl md:text-4xl font-bold mb-2">{lang === 'ar' ? siteConfig.titleAr : siteConfig.titleEn}</h2>
          <p className="text-red-100 text-sm md:text-base">{lang === 'ar' ? 'دليلك الشامل للمتاجر والخدمات في البحرين' : 'Your comprehensive guide to restaurants & services in Bahrain'}</p>
          <div className="flex flex-wrap gap-3 items-center">
            <BahrainClock />
            {visitorCount !== undefined && siteConfig?.showVisitorCount !== false && (
              <div className="mt-4 flex items-center gap-2 bg-black/25 backdrop-blur-md px-4 py-2 rounded-2xl text-xs md:text-sm font-medium w-fit border border-white/10 text-white/95 shadow-inner">
                <Users className="h-4 w-4 text-red-300 shrink-0" />
                <span>
                  {lang === 'ar' ? 'عدد الزوار الكلي: ' : 'Total Visitors: '}
                  <span className="font-mono tracking-wide font-bold">{visitorCount.toLocaleString()}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">{lang === 'ar' ? 'الأقسام' : 'Categories'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => onSelectCategory(cat.id)}
              className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-red-300 hover:shadow-md transition-all duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                {getCategoryIcon(cat.icon, "h-6 w-6")}
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 text-center leading-tight">
                {lang === 'ar' ? cat.titleAr : cat.titleEn}
              </span>
            </button>
          ))}

          {/* Distinctive Bazaar Offer Category Card */}
          <button 
            onClick={onSelectBazaar}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/30 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
          >
            {/* "Hot" / "العروض" badge */}
            <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              {lang === 'ar' ? 'العروض' : 'Offers'}
            </span>
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shadow-sm">
              <Tag className="h-6 w-6 animate-pulse" />
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 text-center leading-tight">
              {lang === 'ar' ? 'بازار العروض' : 'Bazaar Offers'}
            </span>
          </button>

          {/* Taalou Honi Landmarks Category Card */}
          <button 
            onClick={onSelectLandmarks}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-amber-500/10 via-red-50 to-amber-50 dark:from-amber-950/20 dark:to-slate-800 rounded-2xl shadow-sm border border-amber-300 dark:border-amber-800/40 hover:border-amber-500 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
          >
            <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              {lang === 'ar' ? 'جديد 🇧🇭' : 'New 🇧🇭'}
            </span>
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-amber-500/20">
              <Compass className="h-6 w-6" />
            </div>
            <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 text-center leading-tight">
              {lang === 'ar' ? 'تعالوا هني 🇧🇭' : 'Taalou Honi'}
            </span>
          </button>
        </div>
      </div>

      {/* Trending */}
      {trendingRestaurants.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-xl">🔥</span> {t.trendingThisWeek}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {trendingRestaurants.map(b => (
              <BusinessCard key={b.id} b={b} lang={lang} t={t}
                isFav={favorites.includes(b.id)}
                onToggleFav={() => toggleFavorite(b.id)}
                onClick={() => onSelectBusiness(b)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESULTS PAGE ────────────────────────────────────────────────────────────

function Results({
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
  setIsOpenNow,
  filterCategory,
  setFilterCategory,
  filterSubCategory,
  setFilterSubCategory,
  uniqueCategoriesInPool,
  uniqueSubCategoriesInPool,
  uniqueCuisinesInPool,
  uniqueAreasInPool
}: any) {
  const { lang, t } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(24);

  // Reset visible count when any filter changes
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedCategory, filterCategory, filterSubCategory, filterCuisine, filterArea, filterPrice, isOpenNow, filteredBusinesses.length]);

  const cat = categories.find((c: Category) => c.id === selectedCategory);
  const activeCategory = selectedCategory || filterCategory;
  const isRestaurant = activeCategory === 'restaurants' || (uniqueCategoriesInPool.length === 1 && uniqueCategoriesInPool[0].id === 'restaurants');

  const displayedBusinesses = useMemo(() => {
    return filteredBusinesses.slice(0, visibleCount);
  }, [filteredBusinesses, visibleCount]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBackToHome} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
          {cat ? (lang === 'ar' ? cat.titleAr : cat.titleEn) : t.results}
        </h2>
        <span className="ml-auto text-sm text-gray-500 dark:text-slate-400">{filteredBusinesses.length} {t.results}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
        {/* Dynamic Category Filter: Only show if we didn't browse via a specific category page AND there are multiple categories in the pool */}
        {!selectedCategory && uniqueCategoriesInPool.length > 1 && (
          <select
            value={filterCategory}
            onChange={e => {
              setFilterCategory(e.target.value);
              setFilterSubCategory('');
              setFilterCuisine('');
              setFilterPrice('');
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">{lang === 'ar' ? 'كل الأقسام الرئيسية' : 'All Main Categories'}</option>
            {uniqueCategoriesInPool.map((c: any) => (
              <option key={c.id} value={c.id}>{lang === 'ar' ? c.titleAr : c.titleEn}</option>
            ))}
          </select>
        )}

        {/* Dynamic Sub-category Filter: Show if there are sub-categories available in the pool */}
        {uniqueSubCategoriesInPool.length > 0 && (
          <select
            value={filterSubCategory}
            onChange={e => setFilterSubCategory(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">{lang === 'ar' ? 'كل الفروع والأنشطة' : 'All Sub-categories'}</option>
            {uniqueSubCategoriesInPool.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Cuisine Filter: Only relevant to restaurants */}
        {isRestaurant && uniqueCuisinesInPool.length > 0 && (
          <select
            value={filterCuisine}
            onChange={e => setFilterCuisine(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">{t.allCuisines}</option>
            {uniqueCuisinesInPool.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {/* Area Filter: Always relevant */}
        <select
          value={filterArea}
          onChange={e => setFilterArea(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">{t.allAreas}</option>
          {uniqueAreasInPool.map((a: string) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Price Filter: Only relevant to restaurants */}
        {isRestaurant && (
          <select
            value={filterPrice}
            onChange={e => setFilterPrice(e.target.value as any)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">{t.allPrices}</option>
            {['$', '$$', '$$$'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        {/* Open Now: Always relevant */}
        <button
          onClick={() => setIsOpenNow(!isOpenNow)}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            isOpenNow
              ? 'bg-green-500 text-white border-green-500'
              : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          {t.openNow}
        </button>
      </div>

      <AdSection ads={ads} position="middle" selectedCategory={selectedCategory} limit={siteConfig.maxAdsMiddle || 1} />

      {filteredBusinesses.length === 0
        ? <div className="text-center py-16 text-gray-400 dark:text-slate-500">{t.noResults}</div>
        : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedBusinesses.map((b: Business) => (
                <BusinessCard key={b.id} b={b} lang={lang} t={t}
                  isFav={favorites.includes(b.id)}
                  onToggleFav={() => toggleFavorite(b.id)}
                  onClick={() => onSelectBusiness(b)} />
              ))}
            </div>

            {visibleCount < filteredBusinesses.length && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-red-600 dark:text-red-400 font-bold text-xs md:text-sm rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm transition-all flex items-center gap-2"
                >
                  <span>{lang === 'ar' ? `عرض المزيد من النتائج (${filteredBusinesses.length - visibleCount} متبقية)` : `Load More (${filteredBusinesses.length - visibleCount} remaining)`}</span>
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

// ─── BUSINESS DETAILS PAGE ───────────────────────────────────────────────────

function BusinessDetails({ selectedBusiness: b, currentUser, onBackToResults, onRate, onAddReview, onDeleteReview, onAddReply, isAdmin }: any) {
  const { lang, t } = useLanguage();
  const [myRating, setMyRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [showReplyBox, setShowReplyBox] = useState<Record<string, boolean>>({});
  const [viewingPdf, setViewingPdf] = useState(false);

  const avg = b.ratingCount ? ((b.ratingSum || 0) / b.ratingCount).toFixed(1) : '—';
  const isOpen = checkIsOpen(b);

  const handleRate = (v: number) => {
    if (rated) return;
    setMyRating(v);
    onRate(b.id, v);
    setRated(true);
  };

  const submitReview = () => {
    if (!reviewAuthor.trim() || !reviewComment.trim()) return;
    onAddReview(reviewAuthor, reviewRating, reviewComment);
    setReviewAuthor(''); setReviewComment(''); setReviewRating(5);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-12">
      <button onClick={onBackToResults} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-red-600 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t.backToIndex}
      </button>

      {/* Hero media (Video or Image) */}
      <div className="rounded-2xl overflow-hidden h-60 bg-gray-100 dark:bg-slate-700 relative">
        {b.mediaType === 'video' && b.videoUrl ? (
          <video 
            src={b.videoUrl} 
            controls 
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover" 
          />
        ) : b.image ? (
          <img src={optimizeImageUrl(b.image)} alt={lang === 'ar' ? b.nameAr : b.nameEn} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300"><HomeIcon className="h-20 w-20" /></div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{lang === 'ar' ? b.nameAr : b.nameEn}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{b.subCategory} · {lang === 'ar' ? b.areaAr : b.areaEn} · {t.block} {b.block}</p>
          </div>
          {b.openTime && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isOpen ? t.openNow : 'مغلق'}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {b.priceRange && <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-1 rounded-full">{b.priceRange}</span>}
          {(lang === 'ar' ? b.cuisineAr : b.cuisine) && <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-1 rounded-full">{lang === 'ar' ? b.cuisineAr : b.cuisine}</span>}
          {b.hasParking && <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1"><ParkingCircle className="h-3 w-3" /> {t.parking}</span>}
          {b.hasFamilySection && <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 px-2 py-1 rounded-full flex items-center gap-1"><Users className="h-3 w-3" /> {t.familySection}</span>}
          {(b.dressCodeEn || b.dressCodeAr) && <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-1 rounded-full flex items-center gap-1"><Shirt className="h-3 w-3" /> {lang === 'ar' ? b.dressCodeAr : b.dressCodeEn}</span>}
        </div>

        {/* Hours */}
        {b.openTime && b.closeTime && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Clock className="h-4 w-4 text-red-500" />
            <span>{b.openTime} – {b.closeTime}</span>
          </div>
        )}
        {b.workHours && !(b.openTime && b.closeTime) && (
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400 mt-1">
            <Calendar className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{b.workHours}</span>
          </div>
        )}

        {/* Rating */}
        <div className="border-t dark:border-slate-700 pt-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{avg}</span>
            <div>
              <StarRating value={Math.round(b.ratingCount ? (b.ratingSum || 0) / b.ratingCount : 0)} />
              <p className="text-xs text-gray-400 dark:text-slate-500">{b.ratingCount || 0} {t.ratingCountText}</p>
            </div>
          </div>
          {!rated && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.rateThis}</p>
              <StarRating value={myRating} onChange={handleRate} size={6} />
            </div>
          )}
          {rated && <p className="text-xs text-green-600 mt-1">✓ {t.thankYouRating}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <a href={`tel:${b.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-colors">
            <Phone className="h-4 w-4" /> {t.callNow}
          </a>
          <a href={b.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
            <MapPin className="h-4 w-4 text-blue-500" /> {t.maps}
          </a>
          {b.instagram && (
            <a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
              <Instagram className="h-4 w-4 text-pink-500" /> {t.instagram}
            </a>
          )}
          {b.whatsapp && (
            <a 
              href={`https://wa.me/${b.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(lang === 'ar' ? `مرحباً ${b.nameAr}، رأيت منشأتكم في الدليل` : `Hello ${b.nameEn}, I saw your business on the Directory`)}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-medium transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
            </a>
          )}
        </div>
      </div>

      {/* PDF Document Section */}
      {b.pdfUrl && (
        <div className="bg-gradient-to-br from-red-50/90 via-white to-orange-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-red-200/80 dark:border-slate-700 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{b.pdfName || (lang === 'ar' ? 'ملف المنشأة / المنيو / الكتالوج (PDF)' : 'Business Document / Menu / Catalog (PDF)')}</span>
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-extrabold text-[10px] rounded-full">PDF</span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'يمكنك قراءة واستعراض الملف مباشرة أو تحميله' : 'Read and browse the document directly or download it'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewingPdf(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Eye className="h-4 w-4" />
                <span>{lang === 'ar' ? 'قراءة واستعراض الملف' : 'Read Document'}</span>
              </button>
              <a
                href={b.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={b.pdfName ? `${b.pdfName}.pdf` : 'document.pdf'}
                className="flex items-center justify-center gap-1.5 p-2 px-3 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                title={lang === 'ar' ? 'فتح في نافذة جديدة / تحميل' : 'Open in new window / Download'}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'نافذة جديدة' : 'New Tab'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── PDF VIEWER MODAL ─── */}
      {viewingPdf && b.pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700 h-[92vh]"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100 truncate">
                    {b.pdfName || (lang === 'ar' ? `ملف ${b.nameAr}` : `${b.nameEn} Document`)}
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                    {lang === 'ar' ? b.nameAr : b.nameEn} · {b.subCategory}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={b.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={b.pdfName ? `${b.pdfName}.pdf` : 'document.pdf'}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{lang === 'ar' ? 'تحميل' : 'Download'}</span>
                </a>
                <a
                  href={b.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{lang === 'ar' ? 'فتح في نافذة كاملة' : 'Full Window'}</span>
                </a>
                <button
                  onClick={() => setViewingPdf(false)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-400 dark:text-slate-400 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Iframe Document Body */}
            <div className="flex-grow bg-slate-100 dark:bg-slate-900 relative">
              <iframe
                src={b.pdfUrl}
                className="w-full h-full border-0"
                title="PDF Document Viewer"
              />
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-[11px] text-gray-500 dark:text-slate-400 flex items-center justify-between">
              <span>{lang === 'ar' ? 'إذا لم يظهر الملف داخل الإطار تلقائياً، اضغط على زر "فتح في نافذة كاملة" بالأعلى.' : 'If the PDF does not load automatically, click "Full Window" above.'}</span>
              <button
                onClick={() => setViewingPdf(false)}
                className="px-3.5 py-1 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Activity & Services Section */}
      {(b.activities || b.adPageContent) && (
        <BusinessActivitySection
          activities={b.activities}
          adPageContent={b.adPageContent}
          businessName={lang === 'ar' ? b.nameAr : b.nameEn}
          whatsapp={b.whatsapp}
          lang={lang}
        />
      )}

      {/* Special offer */}
      {b.hasAdPage && b.adPageContent && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-4">
          <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-1">🎉 {t.specialOffer}</p>
          <p className="text-sm text-yellow-800 dark:text-yellow-300">{b.adPageContent}</p>
        </div>
      )}

      {/* Reviews */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-4">{t.reviewsAndComments}</h3>
        {(b.reviews?.length ?? 0) === 0
          ? <p className="text-sm text-gray-400 dark:text-slate-500">{t.noReviewsYet}</p>
          : (
            <div className="space-y-3">
              {(b.reviews || []).map((r: Review & { reply?: string }) => (
                <div key={r.id} className="border border-gray-100 dark:border-slate-700 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800 dark:text-slate-200">{r.author}</span>
                      <StarRating value={r.rating} size={3} />
                    </div>
                    {isAdmin && (
                      <button onClick={() => onDeleteReview(r.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{r.comment}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{r.createdAt}</p>
                  {r.reply && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg border-r-2 border-red-400">
                      <p className="text-xs font-bold text-red-600 mb-0.5">{lang === 'ar' ? 'رد صاحب المنشأة' : 'Owner Reply'}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400">{r.reply}</p>
                    </div>
                  )}
                  {isAdmin && !r.reply && (
                    <div className="mt-2">
                      {showReplyBox[r.id] ? (
                        <div className="flex gap-2">
                          <input className="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-200"
                            placeholder={lang === 'ar' ? 'اكتب ردك...' : 'Write your reply...'}
                            value={replyText[r.id] || ''}
                            onChange={e => setReplyText(prev => ({ ...prev, [r.id]: e.target.value }))} />
                          <button onClick={() => { onAddReply(r.id, replyText[r.id] || ''); setShowReplyBox(p => ({ ...p, [r.id]: false })); }}
                            className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg">{t.save}</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowReplyBox(p => ({ ...p, [r.id]: true }))}
                          className="text-xs text-red-500 hover:underline">{lang === 'ar' ? 'رد' : 'Reply'}</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        {/* Write review */}
        <div className="mt-4 border-t dark:border-slate-700 pt-4 space-y-2">
          <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300">{t.writeReview}</h4>
          <input className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
            placeholder={t.authorName} value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-slate-400">{t.rating}:</span>
            <StarRating value={reviewRating} onChange={setReviewRating} size={5} />
          </div>
          <textarea className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 resize-none"
            rows={3} placeholder={t.commentPlaceholder} value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
          <button onClick={submitReview} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full transition-colors">
            {t.submitReview}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FAVORITES PAGE ──────────────────────────────────────────────────────────

function Favorites({ businesses, favorites, currentUser, toggleFavorite, onSelectBusiness, onBackToHome }: any) {
  const { lang, t } = useLanguage();
  const favBusinesses = businesses.filter((b: Business) => favorites.includes(b.id));
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button onClick={onBackToHome} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t.favoritesPageTitle}</h2>
      </div>
      {favBusinesses.length === 0
        ? <div className="text-center py-16 text-gray-400 dark:text-slate-500">{t.noFavorites}</div>
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favBusinesses.map((b: Business) => (
              <BusinessCard key={b.id} b={b} lang={lang} t={t}
                isFav={true} onToggleFav={() => toggleFavorite(b.id)}
                onClick={() => onSelectBusiness(b)} />
            ))}
          </div>
        )}
    </div>
  );
}

// ─── SEARCHABLE BUSINESS PICKER ─────────────────────────────────────────────

function SearchableBusinessPicker({
  businesses,
  selectedBizId,
  onSelectBiz,
  lang
}: {
  businesses: Business[];
  selectedBizId: string;
  onSelectBiz: (biz: Business | null) => void;
  lang: string;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedBiz = useMemo(() => businesses.find(b => b.id === selectedBizId), [businesses, selectedBizId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return businesses.slice(0, 35);
    const q = query.toLowerCase().trim();
    return businesses.filter(b => {
      const nameAr = (b.nameAr || '').toLowerCase();
      const nameEn = (b.nameEn || '').toLowerCase();
      const cat = (b.category || '').toLowerCase();
      const sub = (b.subCategory || '').toLowerCase();
      const area = `${b.areaAr || ''} ${b.areaEn || ''}`.toLowerCase();
      const block = (b.block || '').toLowerCase();
      return nameAr.includes(q) || nameEn.includes(q) || cat.includes(q) || sub.includes(q) || area.includes(q) || block.includes(q);
    }).slice(0, 50);
  }, [businesses, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {selectedBiz && !isOpen ? (
        <div className="flex items-center justify-between p-2.5 bg-red-50/70 dark:bg-slate-900 border border-red-200 dark:border-slate-700 rounded-xl">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              ✓
            </div>
            <div className="truncate">
              <span className="font-bold text-xs text-gray-900 dark:text-slate-100 block truncate">
                {lang === 'ar' ? selectedBiz.nameAr : selectedBiz.nameEn}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 block truncate">
                {selectedBiz.subCategory} · {lang === 'ar' ? selectedBiz.areaAr : selectedBiz.areaEn} · {lang === 'ar' ? 'مجمع' : 'Block'} {selectedBiz.block}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => { setIsOpen(true); setQuery(''); }}
              className="px-2.5 py-1 text-[11px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              {lang === 'ar' ? 'تغيير' : 'Change'}
            </button>
            <button
              type="button"
              onClick={() => onSelectBiz(null)}
              className="p-1 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
              title={lang === 'ar' ? 'إلغاء التحديد' : 'Clear'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-gray-400 pointer-events-none`} />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
              onFocus={() => setIsOpen(true)}
              placeholder={lang === 'ar' ? '🔍 اكتب اسم المنشأة، المنطقة أو التصنيف للبحث...' : '🔍 Type business name, area or category to search...'}
              className={`w-full ${lang === 'ar' ? 'pr-9 pl-8' : 'pl-9 pr-8'} py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={`absolute ${lang === 'ar' ? 'left-2.5' : 'right-2.5'} top-2.5 text-gray-400 hover:text-gray-600 p-0.5`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-gray-400 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <span>{lang === 'ar' ? `نتائج البحث (${filtered.length})` : `Search Results (${filtered.length})`}</span>
                <span className="text-[9px] text-gray-400 font-normal">{lang === 'ar' ? 'اضغط للاختيار' : 'Click to select'}</span>
              </div>
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">
                  {lang === 'ar' ? 'لا توجد منشأة مطابقة للبحث' : 'No matching businesses found'}
                </div>
              ) : (
                filtered.map((b) => {
                  const isChosen = b.id === selectedBizId;
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        onSelectBiz(b);
                        setIsOpen(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isChosen
                          ? 'bg-red-600 text-white font-bold'
                          : 'hover:bg-red-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="truncate">
                        <p className="font-bold truncate">{lang === 'ar' ? b.nameAr : b.nameEn}</p>
                        <p className={`text-[10px] truncate ${isChosen ? 'text-red-100' : 'text-gray-500 dark:text-slate-400'}`}>
                          {b.subCategory} · {lang === 'ar' ? b.areaAr : b.areaEn} · {lang === 'ar' ? 'مجمع' : 'Block'} {b.block}
                        </p>
                      </div>
                      {isChosen && <span className="text-xs font-bold">✓</span>}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BAZAAR PAGE ──────────────────────────────────────────────────────────────

interface BazaarProps {
  bazaarOffers: BazaarOffer[];
  setBazaarOffers: React.Dispatch<React.SetStateAction<BazaarOffer[]>>;
  businesses: Business[];
  currentUser: User | null;
  onBackToHome: () => void;
  onOpenAuth: () => void;
}

function Bazaar({ bazaarOffers, setBazaarOffers, businesses, currentUser, onBackToHome, onOpenAuth }: BazaarProps) {
  const { lang } = useLanguage();
  const [bazaarFilter, setBazaarFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [useExistingBiz, setUseExistingBiz] = useState(true);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [customBizName, setCustomBizName] = useState('');
  const [offerCategory, setOfferCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [offerImageUrl, setOfferImageUrl] = useState('');
  const [offerLink, setOfferLink] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Editing state
  const [editingOffer, setEditingOffer] = useState<BazaarOffer | null>(null);
  const [editUseExistingBiz, setEditUseExistingBiz] = useState(true);
  const [editSelectedBizId, setEditSelectedBizId] = useState('');
  const [editCustomBizName, setEditCustomBizName] = useState('');
  const [editOfferCategory, setEditOfferCategory] = useState('');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editOfferImageUrl, setEditOfferImageUrl] = useState('');
  const [editOfferLink, setEditOfferLink] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editError, setEditError] = useState('');

  // Delete Confirmation State
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);

  // Helper to get current date in Bahrain timezone format YYYY-MM-DD
  const getBahrainDateString = useCallback(() => {
    try {
      const d = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bahrain',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(d); // "YYYY-MM-DD"
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Filter out expired or not-yet-started offers
  const activeOffers = useMemo(() => {
    const today = getBahrainDateString();
    return bazaarOffers.filter(o => {
      const starts = !o.startDate || today >= o.startDate;
      const ends = !o.endDate || today <= o.endDate;
      return starts && ends;
    });
  }, [bazaarOffers, getBahrainDateString]);

  // Dynamic Categories compiled from active offers
  const categoriesList = useMemo(() => {
    const cats = activeOffers.map(o => o.category.trim()).filter(Boolean);
    return ['all', ...new Set(cats)];
  }, [activeOffers]);

  // Filtered offers list
  const filteredOffers = useMemo(() => {
    if (bazaarFilter === 'all') return activeOffers;
    return activeOffers.filter(o => o.category === bazaarFilter);
  }, [activeOffers, bazaarFilter]);

  // Handle addition
  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let businessName = '';
    let link = offerLink.trim();

    if (useExistingBiz) {
      const b = businesses.find(item => item.id === selectedBizId);
      if (!b) {
        setError(lang === 'ar' ? 'يرجى اختيار منشأة من القائمة' : 'Please select a business from the list');
        return;
      }
      businessName = lang === 'ar' ? b.nameAr : b.nameEn;
      if (!link) {
        // Fallback links from selected business
        if (b.instagram) {
          link = `https://instagram.com/${b.instagram}`;
        } else if (b.googleMapsUrl) {
          link = b.googleMapsUrl;
        } else {
          link = `tel:${b.phone}`;
        }
      }
    } else {
      if (!customBizName.trim()) {
        setError(lang === 'ar' ? 'يرجى إدخال اسم المنشأة' : 'Please enter business name');
        return;
      }
      businessName = customBizName.trim();
    }

    let finalCategory = offerCategory === 'other' ? customCategory.trim() : offerCategory;
    if (!finalCategory.trim()) {
      setError(lang === 'ar' ? 'يرجى تحديد أو كتابة تصنيف العرض' : 'Please select or enter a category');
      return;
    }

    if (!offerImageUrl.trim()) {
      setError(lang === 'ar' ? 'يرجى إدخال رابط الصورة أو اختيار أحد النماذج الجاهزة' : 'Please enter an image URL or choose a preset');
      return;
    }

    if (!link) {
      setError(lang === 'ar' ? 'يرجى إدخال رابط المنشأة' : 'Please enter the business link');
      return;
    }

    // Ensure valid link prefix
    if (!/^https?:\/\//i.test(link) && !/^tel:/i.test(link)) {
      link = 'https://' + link;
    }

    const newOffer: BazaarOffer = {
      id: 'bo-' + Date.now(),
      businessName,
      category: finalCategory,
      imageUrl: offerImageUrl.trim(),
      link,
      addedBy: currentUser?.username || 'admin',
      createdAt: new Date().toISOString().split('T')[0],
      startDate: startDate || undefined,
      endDate: endDate || undefined
    };

    setBazaarOffers(prev => [newOffer, ...prev]);

    // Reset Form
    setSelectedBizId('');
    setCustomBizName('');
    setOfferCategory('');
    setCustomCategory('');
    setOfferImageUrl('');
    setOfferLink('');
    setStartDate('');
    setEndDate('');
    setIsAddOpen(false);
  };

  const handleStartEdit = (offer: BazaarOffer) => {
    setEditingOffer(offer);

    // Find if business matches directory
    const b = businesses.find(item => (lang === 'ar' ? item.nameAr : item.nameEn) === offer.businessName);
    if (b) {
      setEditUseExistingBiz(true);
      setEditSelectedBizId(b.id);
    } else {
      setEditUseExistingBiz(false);
      setEditCustomBizName(offer.businessName);
    }

    const standardCats = ["مطاعم", "تسوق", "سوبرماركت", "صحة", "سيارات", "ترفيه"];
    if (standardCats.includes(offer.category)) {
      setEditOfferCategory(offer.category);
      setEditCustomCategory('');
    } else {
      setEditOfferCategory('other');
      setEditCustomCategory(offer.category);
    }

    setEditOfferImageUrl(offer.imageUrl);
    setEditOfferLink(offer.link);
    setEditStartDate(offer.startDate || '');
    setEditEndDate(offer.endDate || '');
    setEditError('');
  };

  const handleEditOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editingOffer) return;

    let businessName = '';
    let link = editOfferLink.trim();

    if (editUseExistingBiz) {
      const b = businesses.find(item => item.id === editSelectedBizId);
      if (!b) {
        setEditError(lang === 'ar' ? 'يرجى اختيار منشأة من القائمة' : 'Please select a business from the list');
        return;
      }
      businessName = lang === 'ar' ? b.nameAr : b.nameEn;
      if (!link) {
        if (b.instagram) {
          link = `https://instagram.com/${b.instagram}`;
        } else if (b.googleMapsUrl) {
          link = b.googleMapsUrl;
        } else {
          link = `tel:${b.phone}`;
        }
      }
    } else {
      if (!editCustomBizName.trim()) {
        setEditError(lang === 'ar' ? 'يرجى إدخال اسم المنشأة' : 'Please enter business name');
        return;
      }
      businessName = editCustomBizName.trim();
    }

    let finalCategory = editOfferCategory === 'other' ? editCustomCategory.trim() : editOfferCategory;
    if (!finalCategory.trim()) {
      setEditError(lang === 'ar' ? 'يرجى تحديد أو كتابة تصنيف العرض' : 'Please select or enter a category');
      return;
    }

    if (!editOfferImageUrl.trim()) {
      setEditError(lang === 'ar' ? 'يرجى إدخال رابط الصورة أو اختيار أحد النماذج الجاهزة' : 'Please enter an image URL or choose a preset');
      return;
    }

    if (!link) {
      setEditError(lang === 'ar' ? 'يرجى إدخال رابط المنشأة' : 'Please enter the business link');
      return;
    }

    if (!/^https?:\/\//i.test(link) && !/^tel:/i.test(link)) {
      link = 'https://' + link;
    }

    setBazaarOffers(prev => prev.map(o => {
      if (o.id === editingOffer.id) {
        return {
          ...o,
          businessName,
          category: finalCategory,
          imageUrl: editOfferImageUrl.trim(),
          link,
          startDate: editStartDate || undefined,
          endDate: editEndDate || undefined
        };
      }
      return o;
    }));

    setEditingOffer(null);
  };

  const handleDeleteOffer = (id: string) => {
    setBazaarOffers(prev => prev.filter(o => o.id !== id));
    setOfferToDelete(null);
  };

  const imagePresets = [
    {
      nameAr: 'مطعم / كافيه',
      nameEn: 'Restaurant / Cafe',
      url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80&fm=webp'
    },
    {
      nameAr: 'صحة وعافية',
      nameEn: 'Health & Wellness',
      url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80&fm=webp'
    },
    {
      nameAr: 'تسوق وموضة',
      nameEn: 'Shopping & Fashion',
      url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80&fm=webp'
    },
    {
      nameAr: 'برادات وسوبرماركت',
      nameEn: 'Supermarket',
      url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80&fm=webp'
    },
    {
      nameAr: 'سيارات ونقل',
      nameEn: 'Automotive',
      url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80&fm=webp'
    },
    {
      nameAr: 'ترفيه وخدمات',
      nameEn: 'Leisure & Services',
      url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80&fm=webp'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBackToHome} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-red-600">🛍️</span>
              {lang === 'ar' ? 'بازار العروض' : 'Bazaar Offers'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {lang === 'ar' 
                ? 'استكشف أفضل العروض والخصومات من مختلف المنشآت التجارية' 
                : 'Explore the best offers and discounts from local businesses'}
            </p>
          </div>
        </div>

        {currentUser && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold shadow-md transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>{lang === 'ar' ? 'إضافة عرض جديد' : 'Add New Offer'}</span>
          </button>
        )}
      </div>

      {/* Categories Filter Pills */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          {lang === 'ar' ? 'تصفية حسب التصنيف' : 'Filter by Classification'}
        </h3>
        <div className="flex flex-wrap gap-2 pb-1 overflow-x-auto scrollbar-none">
          {categoriesList.map(cat => {
            const isActive = bazaarFilter === cat;
            const displayLabel = cat === 'all' 
              ? (lang === 'ar' ? 'الكل' : 'All')
              : cat;

            return (
              <button
                key={cat}
                onClick={() => setBazaarFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-750'
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Offers Grid */}
      {filteredOffers.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-850 rounded-3xl border border-dashed border-gray-200 dark:border-slate-750 p-6">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
            <Tag className="h-8 w-8" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm font-semibold">
            {lang === 'ar' ? 'لا توجد عروض مضافة في هذا التصنيف حالياً' : 'No offers available in this classification yet.'}
          </p>
          {currentUser && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full transition-colors"
            >
              {lang === 'ar' ? 'كن أول من يضيف عرضاً!' : 'Be the first to add an offer!'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredOffers.map((offer) => {
            const isCreator = currentUser && offer.addedBy === currentUser.username;
            const isAdminUser = currentUser?.role === 'admin';
            const canDelete = isAdminUser || isCreator;

            return (
              <div 
                key={offer.id}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col group relative"
              >
                {/* Image Link Container */}
                <a 
                  href={offer.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="relative h-52 overflow-hidden bg-gray-50 dark:bg-slate-750 block cursor-pointer"
                  title={lang === 'ar' ? 'اضغط لزيارة موقع المنشأة' : 'Click to visit the business website'}
                >
                  <img 
                    src={optimizeImageUrl(offer.imageUrl)} 
                    alt={offer.businessName}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&fm=webp';
                    }}
                  />
                  {/* Overlay link banner */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 flex items-center justify-between text-white translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-[10px] font-bold tracking-wide flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 text-red-400 animate-pulse" />
                      {lang === 'ar' ? 'زيارة الموقع الإلكتروني' : 'Visit Website'}
                    </span>
                  </div>
                </a>

                {/* Card Content */}
                <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {offer.category}
                      </span>
                      {offer.createdAt && (
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                          {offer.createdAt}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-snug truncate">
                      {offer.businessName}
                    </h3>
                  </div>

                  {/* Added by + Action buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700/60 text-[11px]">
                    <div className="text-gray-400 dark:text-slate-500 hidden">
                      {lang === 'ar' ? 'بواسطة: ' : 'By: '}
                      <span className="font-semibold text-gray-600 dark:text-slate-300">{offer.addedBy || 'admin'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 w-full justify-end">
                      {currentUser && (
                        <button
                          onClick={() => handleStartEdit(offer)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title={lang === 'ar' ? 'تعديل هذا العرض' : 'Edit this offer'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setOfferToDelete(offer.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title={lang === 'ar' ? 'حذف هذا العرض' : 'Delete this offer'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <a
                        href={offer.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                      >
                        <span>{lang === 'ar' ? 'الرابط' : 'Link'}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ADD OFFER DIALOG MODAL ─── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100 dark:border-slate-700"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-red-600" />
                  {lang === 'ar' ? 'إضافة عرض جديد للبازار' : 'Add New Bazaar Offer'}
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {lang === 'ar' ? 'املأ الحقول أدناه لنشر العرض' : 'Fill in the details below to publish the offer'}
                </p>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400 dark:text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleAddOffer} className="flex-grow overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-xl border border-red-100 dark:border-red-900/30 text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              {/* Business Name selection choice */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'اسم المنشأة' : 'Business Name'}
                </label>
                
                <div className="flex items-center gap-4 text-xs font-semibold mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={useExistingBiz} 
                      onChange={() => setUseExistingBiz(true)}
                      className="accent-red-600"
                    />
                    <span>{lang === 'ar' ? 'اختر من دليل المنشآت الحالي' : 'Select from existing directory'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={!useExistingBiz} 
                      onChange={() => setUseExistingBiz(false)}
                      className="accent-red-600"
                    />
                    <span>{lang === 'ar' ? 'كتابة اسم مخصص' : 'Enter custom name'}</span>
                  </label>
                </div>

                {useExistingBiz ? (
                  <SearchableBusinessPicker
                    businesses={businesses}
                    selectedBizId={selectedBizId}
                    lang={lang}
                    onSelectBiz={(b) => {
                      if (b) {
                        setSelectedBizId(b.id);
                        if (b.instagram) {
                          setOfferLink(`https://instagram.com/${b.instagram}`);
                        } else if (b.googleMapsUrl) {
                          setOfferLink(b.googleMapsUrl);
                        } else {
                          setOfferLink('');
                        }
                      } else {
                        setSelectedBizId('');
                        setOfferLink('');
                      }
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={customBizName}
                    onChange={(e) => setCustomBizName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: شركة الخليج للتجارة' : 'e.g. Gulf Trading Company'}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                  />
                )}
              </div>

              {/* Category / Classification */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'التصنيف' : 'Classification'}
                </label>
                <select
                  value={offerCategory}
                  onChange={(e) => setOfferCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">{lang === 'ar' ? '-- اختر تصنيفاً للعرض --' : '-- Select Classification --'}</option>
                  <option value="مطاعم">{lang === 'ar' ? 'مطاعم ومقاهي' : 'Restaurants & Cafes'}</option>
                  <option value="تسوق">{lang === 'ar' ? 'تسوق وأزياء' : 'Shopping & Fashion'}</option>
                  <option value="سوبرماركت">{lang === 'ar' ? 'برادات وسوبرماركت' : 'Supermarket & Coldstore'}</option>
                  <option value="صحة">{lang === 'ar' ? 'صحة وجمال' : 'Health & Beauty'}</option>
                  <option value="سيارات">{lang === 'ar' ? 'خدمات سيارات' : 'Automotive Services'}</option>
                  <option value="ترفيه">{lang === 'ar' ? 'ترفيه وخدمات' : 'Leisure & Services'}</option>
                  <option value="other">{lang === 'ar' ? 'تصنيف آخر (كتابة مخصصة)' : 'Other (Enter custom classification)'}</option>
                </select>

                {offerCategory === 'other' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder={lang === 'ar' ? 'اكتب تصنيفاً جديداً هنا...' : 'Type custom classification...'}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400 mt-2"
                  />
                )}
              </div>

              {/* Offer Image URL & Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'صورة العرض' : 'Offer Image'}
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/webp,image/avif,image/jpeg,image/png,image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const webpData = await convertFileToWebP(file);
                        setOfferImageUrl(webpData);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 dark:file:bg-red-950/20 file:text-red-700 dark:file:text-red-400 hover:file:bg-red-100 file:cursor-pointer"
                  />
                  <input
                    type="text"
                    value={offerImageUrl}
                    onChange={(e) => setOfferImageUrl(e.target.value)}
                    placeholder={lang === 'ar' ? 'أو أدخل رابط الصورة المباشر...' : 'Or enter direct image URL...'}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>

                {/* Preset Images Helper */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">
                    {lang === 'ar' ? 'نماذج صور جاهزة (اضغط للاختيار):' : 'Or choose a preset image:'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {imagePresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setOfferImageUrl(preset.url)}
                        className={`p-1 border rounded-lg overflow-hidden flex flex-col items-center gap-1 hover:border-red-400 transition-all ${
                          offerImageUrl === preset.url ? 'border-red-500 bg-red-500/10' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40'
                        }`}
                      >
                        <img 
                          src={optimizeImageUrl(preset.url)} 
                          alt="" 
                          loading="lazy" 
                          decoding="async" 
                          className="w-full h-10 object-cover rounded" 
                        />
                        <span className="text-[9px] font-medium text-gray-500 dark:text-slate-400 text-center truncate w-full">
                          {lang === 'ar' ? preset.nameAr : preset.nameEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Offer Link */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'رابط الموقع الإلكتروني أو وسيلة التواصل' : 'Business Link or Contact Website'}
                </label>
                <input
                  type="text"
                  value={offerLink}
                  onChange={(e) => setOfferLink(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: رابط إنستغرام أو موقع المنشأة' : 'e.g. Instagram link, website, or WhatsApp URL'}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-500">
                  {lang === 'ar' 
                    ? 'سيتم تحويل الزائر إلى هذا الرابط بمجرد النقر على صورة العرض' 
                    : 'Visitors will be redirected here when they click the offer image.'}
                </p>
              </div>

              {/* Date range inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                    {lang === 'ar' ? 'تاريخ بدء العرض' : 'Offer Start Date'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                    {lang === 'ar' ? 'تاريخ انتهاء العرض' : 'Offer End Date'}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  {lang === 'ar' ? 'نشر العرض' : 'Publish Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE OFFER CONFIRMATION MODAL ─── */}
      {offerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  {lang === 'ar' ? 'حذف عرض البازار' : 'Delete Bazaar Offer'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {lang === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذا العرض نهائياً؟' : 'Are you sure you want to permanently delete this offer?'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => setOfferToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeleteOffer(offerToDelete)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT OFFER DIALOG MODAL ─── */}
      {editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100 dark:border-slate-700"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Edit className="h-5 w-5 text-red-600" />
                  {lang === 'ar' ? 'تعديل عرض البازار' : 'Edit Bazaar Offer'}
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {lang === 'ar' ? 'قم بتعديل تفاصيل العرض أدناه' : 'Modify the details of the offer below'}
                </p>
              </div>
              <button 
                onClick={() => setEditingOffer(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400 dark:text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleEditOffer} className="flex-grow overflow-y-auto p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-xl border border-red-100 dark:border-red-900/30 text-xs font-semibold">
                  ⚠️ {editError}
                </div>
              )}

              {/* Business Name selection choice */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'اسم المنشأة' : 'Business Name'}
                </label>
                
                <div className="flex items-center gap-4 text-xs font-semibold mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={editUseExistingBiz} 
                      onChange={() => setEditUseExistingBiz(true)}
                      className="accent-red-600"
                    />
                    <span>{lang === 'ar' ? 'اختر من دليل المنشآت الحالي' : 'Select from existing directory'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={!editUseExistingBiz} 
                      onChange={() => setEditUseExistingBiz(false)}
                      className="accent-red-600"
                    />
                    <span>{lang === 'ar' ? 'كتابة اسم مخصص' : 'Enter custom name'}</span>
                  </label>
                </div>

                {editUseExistingBiz ? (
                  <SearchableBusinessPicker
                    businesses={businesses}
                    selectedBizId={editSelectedBizId}
                    lang={lang}
                    onSelectBiz={(b) => {
                      if (b) {
                        setEditSelectedBizId(b.id);
                        if (b.instagram) {
                          setEditOfferLink(`https://instagram.com/${b.instagram}`);
                        } else if (b.googleMapsUrl) {
                          setEditOfferLink(b.googleMapsUrl);
                        } else {
                          setEditOfferLink('');
                        }
                      } else {
                        setEditSelectedBizId('');
                        setEditOfferLink('');
                      }
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={editCustomBizName}
                    onChange={(e) => setEditCustomBizName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: شركة الخليج للتجارة' : 'e.g. Gulf Trading Company'}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                  />
                )}
              </div>

              {/* Category / Classification */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'التصنيف' : 'Classification'}
                </label>
                <select
                  value={editOfferCategory}
                  onChange={(e) => setEditOfferCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">{lang === 'ar' ? '-- اختر تصنيفاً للعرض --' : '-- Select Classification --'}</option>
                  <option value="مطاعم">{lang === 'ar' ? 'مطاعم ومقاهي' : 'Restaurants & Cafes'}</option>
                  <option value="تسوق">{lang === 'ar' ? 'تسوق وأزياء' : 'Shopping & Fashion'}</option>
                  <option value="سوبرماركت">{lang === 'ar' ? 'برادات وسوبرماركت' : 'Supermarket & Coldstore'}</option>
                  <option value="صحة">{lang === 'ar' ? 'صحة وجمال' : 'Health & Beauty'}</option>
                  <option value="سيارات">{lang === 'ar' ? 'خدمات سيارات' : 'Automotive Services'}</option>
                  <option value="ترفيه">{lang === 'ar' ? 'ترفيه وخدمات' : 'Leisure & Services'}</option>
                  <option value="other">{lang === 'ar' ? 'تصنيف آخر (كتابة مخصصة)' : 'Other (Enter custom classification)'}</option>
                </select>

                {editOfferCategory === 'other' && (
                  <input
                    type="text"
                    value={editCustomCategory}
                    onChange={(e) => setEditCustomCategory(e.target.value)}
                    placeholder={lang === 'ar' ? 'اكتب تصنيفاً جديداً هنا...' : 'Type custom classification...'}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400 mt-2"
                  />
                )}
              </div>

              {/* Offer Image URL & Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'صورة العرض' : 'Offer Image'}
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/webp,image/avif,image/jpeg,image/png,image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const webpData = await convertFileToWebP(file);
                        setEditOfferImageUrl(webpData);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 dark:file:bg-red-950/20 file:text-red-700 dark:file:text-red-400 hover:file:bg-red-100 file:cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editOfferImageUrl}
                    onChange={(e) => setEditOfferImageUrl(e.target.value)}
                    placeholder={lang === 'ar' ? 'أو أدخل رابط الصورة المباشر...' : 'Or enter direct image URL...'}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>

                {/* Preset Images Helper */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">
                    {lang === 'ar' ? 'نماذج صور جاهزة (اضغط للاختيار):' : 'Or choose a preset image:'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {imagePresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditOfferImageUrl(preset.url)}
                        className={`p-1 border rounded-lg overflow-hidden flex flex-col items-center gap-1 hover:border-red-400 transition-all ${
                          editOfferImageUrl === preset.url ? 'border-red-500 bg-red-500/10' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40'
                        }`}
                      >
                        <img 
                          src={optimizeImageUrl(preset.url)} 
                          alt="" 
                          loading="lazy" 
                          decoding="async" 
                          className="w-full h-10 object-cover rounded" 
                        />
                        <span className="text-[9px] font-medium text-gray-500 dark:text-slate-400 text-center truncate w-full">
                          {lang === 'ar' ? preset.nameAr : preset.nameEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Offer Link */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {lang === 'ar' ? 'رابط الموقع الإلكتروني أو وسيلة التواصل' : 'Business Link or Contact Website'}
                </label>
                <input
                  type="text"
                  value={editOfferLink}
                  onChange={(e) => setEditOfferLink(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: رابط إنستغرام أو موقع المنشأة' : 'e.g. Instagram link, website, or WhatsApp URL'}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Date range inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                    {lang === 'ar' ? 'تاريخ بدء العرض' : 'Offer Start Date'}
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                    {lang === 'ar' ? 'تاريخ انتهاء العرض' : 'Offer End Date'}
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingOffer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AUTH MODAL ──────────────────────────────────────────────────────────────

function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { lang, t } = useLanguage();
  const { members, setMembers, setCurrentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleLogin = () => {
    let user = members.find(m => m.username === username && m.password === password);
    if (!user && username === 'admin' && password === '123') {
      user = { id: '1', username: 'admin', password: '123', role: 'admin' };
      setMembers(prev => prev.some(m => m.username === 'admin') ? prev : [...prev, user!]);
    } else if (!user && username === 'editor' && password === 'editor123') {
      user = { id: 'u2', username: 'editor', password: 'editor123', role: 'editor' };
      setMembers(prev => prev.some(m => m.username === 'editor') ? prev : [...prev, user!]);
    }

    if (user) {
      setCurrentUser(user);
      onClose();
      setError('');
      setUsername('');
      setPassword('');
    }
    else setError(lang === 'ar' ? 'بيانات خاطئة' : 'Invalid credentials');
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 dark:text-slate-100">{t.userLogin}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <input className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-red-400"
            placeholder={t.username} value={username} onChange={e => { setUsername(e.target.value); setError(''); }} />
          <input type="password" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-red-400"
            placeholder={t.password} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
          <button onClick={handleLogin}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors">
            {t.login}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ERROR BOUNDARY ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const lang = localStorage.getItem('bh_lang') || 'ar';
      return (
        <div className="max-w-lg mx-auto my-12 p-6 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/30 rounded-2xl shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {lang === 'en' ? 'Something went wrong in the dashboard' : 'عذراً، حدث خطأ غير متوقع في لوحة التحكم'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-h-40 overflow-y-auto font-mono text-left bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            {lang === 'en' ? 'Try Again' : 'إعادة المحاولة'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── TRASH BIN HELPERS & COMPONENT ──────────────────────────────────────────

const CLEANUP_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

const isWithin24Hours = (deletedAtStr: string) => {
  if (!deletedAtStr) return false;
  const time = new Date(deletedAtStr).getTime();
  if (isNaN(time)) return false;
  return (Date.now() - time) < CLEANUP_THRESHOLD_MS;
};

const getRemainingTimeFormatted = (deletedAtStr: string, lang: string) => {
  const time = new Date(deletedAtStr).getTime();
  if (isNaN(time)) return '';
  const elapsed = Date.now() - time;
  const remainingMs = CLEANUP_THRESHOLD_MS - elapsed;
  if (remainingMs <= 0) return lang === 'ar' ? 'ينتهي الآن' : 'Expiring now';
  
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (lang === 'ar') {
    if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة متبقية`;
    return `${minutes} دقيقة متبقية`;
  } else {
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }
};

function TrashBinPanel({
  deletedBusinesses,
  setDeletedBusinesses,
  setBusinesses,
  lang,
  t
}: {
  deletedBusinesses: DeletedBusiness[];
  setDeletedBusinesses: React.Dispatch<React.SetStateAction<DeletedBusiness[]>>;
  setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>;
  lang: string;
  t: any;
}) {
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const showToast = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleRestore = (id: string) => {
    const item = deletedBusinesses.find(d => d.id === id);
    if (!item) return;
    setBusinesses(prev => {
      if (prev.some(b => b.id === item.business.id)) return prev;
      return [item.business, ...prev];
    });
    setDeletedBusinesses(prev => prev.filter(d => d.id !== id));
    showToast(lang === 'ar' ? `✓ تم استرجاع المنشأة "${item.business.nameAr}" بنجاح!` : `✓ Successfully restored "${item.business.nameEn || item.business.nameAr}"!`);
  };

  const handleDeletePermanently = (id: string) => {
    const item = deletedBusinesses.find(d => d.id === id);
    if (!item) return;
    if (window.confirm(lang === 'ar' ? `هل أنت تأكد من الحذف النهائي للمنشأة "${item.business.nameAr}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Permanently delete "${item.business.nameEn || item.business.nameAr}"? This action cannot be undone.`)) {
      setDeletedBusinesses(prev => prev.filter(d => d.id !== id));
      showToast(lang === 'ar' ? 'تم حذف المنشأة نهائياً.' : 'Business permanently deleted.');
    }
  };

  const handleEmptyTrash = () => {
    if (deletedBusinesses.length === 0) return;
    if (window.confirm(lang === 'ar' ? 'هل أنت تأكد من تفريغ سلة الحذف بالكامل وإزالة كافة المنشآت المحذوفة نهائياً؟' : 'Are you sure you want to permanently delete all items in the trash bin?')) {
      setDeletedBusinesses([]);
      showToast(lang === 'ar' ? 'تم تفريغ سلة الحذف بالكامل.' : 'Trash bin emptied.');
    }
  };

  const filtered = deletedBusinesses.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      d.business.nameAr?.toLowerCase().includes(q) ||
      d.business.nameEn?.toLowerCase().includes(q) ||
      d.business.phone?.includes(q) ||
      d.business.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-slate-100">
              {lang === 'ar' ? 'سلة الحذف للمنشآت (تُحفظ لمدة 24 ساعة)' : 'Businesses Trash Bin (Kept for 24 hours)'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {lang === 'ar'
                ? 'المنشآت المحذوفة تُحفظ في هذه السلة مؤقتاً لمدة 24 ساعة لإتاحة استرجاعها بضغطة زر إلى الدليل، وتُحذف تلقائياً وبشكل نهائي بعد انقضاء 24 ساعة.'
                : 'Deleted businesses are kept here temporarily for 24 hours for easy one-click restoration, and are automatically permanently purged after 24 hours.'}
            </p>
          </div>
        </div>
        {deletedBusinesses.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {lang === 'ar' ? 'تفريغ السلة بالكامل' : 'Empty Trash Bin'}
          </button>
        )}
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100/30 animate-fadeIn text-center">
          {actionMsg}
        </div>
      )}

      {/* Search & Counter */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث في سلة الحذف...' : 'Search trash bin...'}
            className="w-full pr-9 pl-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700">
          {lang === 'ar' ? `المجموع بالسلة: ${deletedBusinesses.length} منشأة` : `Total in Trash: ${deletedBusinesses.length}`}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
          <Trash2 className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
            {lang === 'ar' ? 'سلة الحذف فارغة تماماً حالياً' : 'The trash bin is currently empty'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const remTime = getRemainingTimeFormatted(item.deletedAt, lang);
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-slate-100 line-clamp-1">
                      {lang === 'ar' ? item.business.nameAr : (item.business.nameEn || item.business.nameAr)}
                    </h4>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                      {remTime}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    <span className="font-semibold text-gray-700 dark:text-slate-300">{lang === 'ar' ? 'القسم:' : 'Category:'}</span> {item.business.category}
                    {item.business.phone && ` | ${item.business.phone}`}
                  </p>

                  <div className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {lang === 'ar' ? 'تاريخ الحذف: ' : 'Deleted at: '}
                      {new Date(item.deletedAt).toLocaleString('ar-BH')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60 mt-1">
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {lang === 'ar' ? 'استرجاع للدليل' : 'Restore'}
                  </button>
                  <button
                    onClick={() => handleDeletePermanently(item.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {lang === 'ar' ? 'حذف نهائي' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────

const PERMISSIONS = {
  admin: { businesses: true, categories: true, ads: true, members: true, sync: true, 'data-management': true },
  editor: { businesses: true, categories: false, ads: true, members: false, sync: false, 'data-management': false },
};

const hasPermission = (user: any, action: 'businesses' | 'categories' | 'ads' | 'members' | 'sync' | 'data-management') => {
  if (!user) return true; // fallback admin
  return PERMISSIONS[user.role as 'admin' | 'editor']?.[action] ?? false;
};

function AdminDashboard({ lang, t, categories, setCategories, businesses, setBusinesses, members, setMembers, ads, setAds, siteConfig, setSiteConfig, isLoggedIn, onLogin, sheetUrl, setSheetUrl, handleSheetSync, currentUser, bazaarOffers = [], salesProducts, setSalesProducts, salesInvoices, setSalesInvoices, deletedBusinesses = [], setDeletedBusinesses, landmarks = [], setLandmarks }: any) {
  const [adminTab, setAdminTab] = useState<'businesses' | 'trash' | 'ads' | 'members' | 'categories' | 'reports' | 'sync' | 'data-management' | 'site-settings' | 'sales' | 'landmarks'>('businesses');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editBiz, setEditBiz] = useState<Business | null>(null);
  const [showBizForm, setShowBizForm] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [searchBizQuery, setSearchBizQuery] = useState('');
  const [selectedBizCategory, setSelectedBizCategory] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);
  const [adminPage, setAdminPage] = useState(1);
  const ADMIN_PAGE_SIZE = 30;

  useEffect(() => {
    setAdminPage(1);
  }, [searchBizQuery, selectedBizCategory]);

  const adminFilteredBusinesses = useMemo(() => {
    return businesses.filter((b: Business) => {
      // If user is editor linked to a specific business, only show their business
      if (currentUser?.role === 'editor' && currentUser?.businessId) {
        if (b.id !== currentUser.businessId) return false;
      }
      const matchCategory = selectedBizCategory ? b.category === selectedBizCategory : true;
      const matchSearch = !searchBizQuery.trim() || [
        b.nameAr,
        b.nameEn,
        b.phone,
        b.areaAr,
        b.areaEn,
        b.subCategory,
        b.block,
        b.activities
      ].some(field => field?.toLowerCase().includes(searchBizQuery.toLowerCase().trim()));
      return matchCategory && matchSearch;
    });
  }, [businesses, selectedBizCategory, searchBizQuery, currentUser]);

  const totalAdminPages = Math.ceil(adminFilteredBusinesses.length / ADMIN_PAGE_SIZE) || 1;
  const paginatedAdminBusinesses = useMemo(() => {
    const start = (adminPage - 1) * ADMIN_PAGE_SIZE;
    return adminFilteredBusinesses.slice(start, start + ADMIN_PAGE_SIZE);
  }, [adminFilteredBusinesses, adminPage]);

  const isLinkedEditor = currentUser?.role === 'editor' && !!currentUser?.businessId;

  const tabs = [
    { key: 'businesses', label: t.manageBusinesses, icon: <HomeIcon className="h-4 w-4" /> },
    { key: 'trash', label: lang === 'ar' ? `سلة الحذف (${deletedBusinesses.length})` : `Trash Bin (${deletedBusinesses.length})`, icon: <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" /> },
    { key: 'ads', label: t.manageAds, icon: <Image className="h-4 w-4" /> },
    { key: 'members', label: t.manageMembers, icon: <Users className="h-4 w-4" /> },
    { key: 'categories', label: t.manageCategories, icon: <Tag className="h-4 w-4" /> },
    { key: 'reports', label: t.reports, icon: <BarChart2 className="h-4 w-4" /> },
    { key: 'landmarks', label: lang === 'ar' ? 'معالم تعالوا هني 🇧🇭' : 'Landmarks (Taalou Honi)', icon: <Compass className="h-4 w-4 text-amber-600" /> },
    { key: 'sales', label: lang === 'ar' ? 'المبيعات والحسابات' : 'Sales & Invoicing', icon: <ShoppingBag className="h-4 w-4" /> },
    { key: 'site-settings', label: lang === 'ar' ? 'إعدادات المنصة والتواصل' : 'Platform & Contact Settings', icon: <Settings className="h-4 w-4" /> },
    { key: 'data-management', label: lang === 'ar' ? 'إدارة البيانات' : 'Data Management', icon: <Shield className="h-4 w-4" /> },
  ].filter(tab => {
    if (isLinkedEditor) {
      return tab.key === 'businesses';
    }
    if (tab.key === 'trash' || tab.key === 'landmarks') return true;
    if (tab.key === 'site-settings') return currentUser?.role === 'admin';
    if (tab.key === 'reports' || tab.key === 'sales') return true;
    return hasPermission(currentUser, tab.key as any);
  });

  useEffect(() => {
    if (isLinkedEditor) {
      setAdminTab('businesses');
      return;
    }
    const isSalesOrReportsOrTrash = adminTab === 'sales' || adminTab === 'reports' || adminTab === 'trash' || adminTab === 'landmarks';
    const isSiteSettingsAndAdmin = adminTab === 'site-settings' && currentUser?.role === 'admin';
    if (currentUser && !hasPermission(currentUser, adminTab as any) && !isSalesOrReportsOrTrash && !isSiteSettingsAndAdmin) {
      const firstAllowed = tabs.find(t => t.key !== 'reports' && t.key !== 'site-settings' && t.key !== 'sales' && t.key !== 'trash');
      if (firstAllowed) {
        setAdminTab(firstAllowed.key as any);
      }
    }
  }, [currentUser, adminTab, isLinkedEditor]);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoginUser('');
      setLoginPass('');
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className={`max-w-sm mx-auto mt-16 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-slate-700 animate-fadeIn ${lang === 'ar' ? 'text-right' : 'text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center mb-4">
          <Shield className="h-12 w-12 text-red-600 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{lang === 'ar' ? 'لوحة التحكم' : 'Admin Dashboard'}</h2>
        </div>
        <div className="space-y-3">
          <input className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
            placeholder={t.username} value={loginUser} onChange={e => { setLoginUser(e.target.value); setLoginError(''); }} />
          <input type="password" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
            placeholder={t.password} value={loginPass} onChange={e => { setLoginPass(e.target.value); setLoginError(''); }} />
          
          {loginError && (
            <p className="text-xs text-red-500 font-semibold text-center animate-fadeIn">
              {loginError}
            </p>
          )}

          <button onClick={() => {
            const success = onLogin(loginUser, loginPass);
            if (!success) {
              setLoginError(lang === 'ar' ? 'بيانات خاطئة' : 'Invalid Credentials');
            }
          }} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors">
            {t.login}
          </button>
        </div>
      </div>
    );
  }

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const nowStr = new Date().toISOString();

    if (deleteConfirm.type === 'single' && deleteConfirm.id) {
      const id = deleteConfirm.id;
      const target = businesses.find((b: Business) => b.id === id);
      if (target) {
        const deletedRecord: DeletedBusiness = {
          id: target.id,
          business: target,
          deletedAt: nowStr,
          deletedBy: currentUser?.username || 'admin',
        };
        setDeletedBusinesses((prev: DeletedBusiness[]) => [deletedRecord, ...prev.filter(d => d.id !== target.id)]);
        setBusinesses((p: Business[]) => p.filter(b => b.id !== id));
        setSelected(p => p.filter(x => x !== id));
      }
    } else if (deleteConfirm.type === 'bulk') {
      const targets = businesses.filter((b: Business) => selected.includes(b.id));
      if (targets.length > 0) {
        const deletedRecords: DeletedBusiness[] = targets.map((target: Business) => ({
          id: target.id,
          business: target,
          deletedAt: nowStr,
          deletedBy: currentUser?.username || 'admin',
        }));
        setDeletedBusinesses((prev: DeletedBusiness[]) => [...deletedRecords, ...prev.filter(d => !selected.includes(d.id))]);
        setBusinesses((p: Business[]) => p.filter(b => !selected.includes(b.id)));
        setSelected([]);
      }
    }
    setDeleteConfirm(null);
  };

  const deleteBiz = (id: string) => {
    if (isLinkedEditor) return;
    setDeleteConfirm({ type: 'single', id });
  };
  const deleteBulk = () => {
    if (isLinkedEditor) return;
    if (selected.length > 0) {
      setDeleteConfirm({ type: 'bulk' });
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Tab nav */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setAdminTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${adminTab === tab.key ? 'bg-red-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-red-300'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Businesses Tab */}
      {adminTab === 'businesses' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              {!(currentUser?.role === 'editor' && currentUser?.businessId) && (
                <button onClick={() => { setEditBiz(null); setShowBizForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
                  <Plus className="h-4 w-4" /> {t.addBusiness}
                </button>
              )}
              {!isLinkedEditor && (
                <button onClick={() => setAdminTab('trash')}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {lang === 'ar' ? `سلة الحذف (${deletedBusinesses.length})` : `Trash Bin (${deletedBusinesses.length})`}
                </button>
              )}
              {selected.length > 0 && (
                <button onClick={deleteBulk} className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium">
                  <Trash2 className="h-4 w-4" /> {t.deleteSelected} ({selected.length})
                </button>
              )}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700">
              {lang === 'ar' ? `المنشآت المعروضة: ${adminFilteredBusinesses.length} من أصل ${businesses.length}` : `Showing ${adminFilteredBusinesses.length} of ${businesses.length} businesses`}
            </div>
          </div>

          {/* Quick Search & Category Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-150 dark:border-slate-700 shadow-sm">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'البحث باسم المنشأة، الهاتف، أو المنطقة...' : 'Search by name, phone, or area...'}
                value={searchBizQuery}
                onChange={e => setSearchBizQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
              />
              {searchBizQuery && (
                <button
                  onClick={() => setSearchBizQuery('')}
                  className="absolute left-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="md:col-span-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 ml-1">
                {lang === 'ar' ? 'الوصول السريع بالتصنيف:' : 'Quick Category Filter:'}
              </span>
              <button
                onClick={() => setSelectedBizCategory('')}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                  selectedBizCategory === ''
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-100 dark:border-slate-700 hover:border-red-200'
                }`}
              >
                {lang === 'ar' ? 'الكل' : 'All'}
              </button>
              {categories.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedBizCategory(c.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                    selectedBizCategory === c.id
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-100 dark:border-slate-700 hover:border-red-200'
                  }`}
                >
                  {lang === 'ar' ? c.titleAr : c.titleEn}
                </button>
              ))}
            </div>
          </div>

          {showBizForm && (
            <BusinessForm
              initial={editBiz}
              categories={categories}
              siteConfig={siteConfig}
              lang={lang} t={t}
              onSave={(biz: Business) => {
                if (editBiz) setBusinesses((p: Business[]) => p.map(b => b.id === biz.id ? biz : b));
                else setBusinesses((p: Business[]) => [...p, { ...biz, id: Date.now().toString() }]);
                setShowBizForm(false); setEditBiz(null);
              }}
              onCancel={() => { setShowBizForm(false); setEditBiz(null); }}
            />
          )}

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  {!isLinkedEditor && (
                    <th className="p-3 text-left w-10">
                      <input type="checkbox" checked={selected.length === adminFilteredBusinesses.length && adminFilteredBusinesses.length > 0}
                        onChange={e => setSelected(e.target.checked ? adminFilteredBusinesses.map((b: Business) => b.id) : [])} />
                    </th>
                  )}
                  <th className="p-3 text-left text-gray-600 dark:text-slate-400 font-semibold">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="p-3 text-left text-gray-600 dark:text-slate-400 font-semibold hidden md:table-cell">{lang === 'ar' ? 'القسم' : 'Category'}</th>
                  <th className="p-3 text-left text-gray-600 dark:text-slate-400 font-semibold hidden md:table-cell">{lang === 'ar' ? 'المنطقة' : 'Area'}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {adminFilteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={isLinkedEditor ? 4 : 5} className="p-8 text-center text-gray-400 dark:text-slate-500">
                      {lang === 'ar' ? 'لا توجد منشآت تطابق خيارات التصفية والبحث الحالية' : 'No businesses match the current filter and search options.'}
                    </td>
                  </tr>
                ) : (
                  paginatedAdminBusinesses.map((b: Business) => (
                    <tr key={b.id} className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      {!isLinkedEditor && (
                        <td className="p-3"><input type="checkbox" checked={selected.includes(b.id)} onChange={e => setSelected(p => e.target.checked ? [...p, b.id] : p.filter(id => id !== b.id))} /></td>
                      )}
                      <td className="p-3 font-medium text-gray-800 dark:text-slate-200">
                        <div>
                          <div>{lang === 'ar' ? b.nameAr : b.nameEn}</div>
                          {b.phone && <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{b.phone}</div>}
                        </div>
                      </td>
                      <td className="p-3 text-gray-500 dark:text-slate-400 hidden md:table-cell">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-xs bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                          {lang === 'ar' 
                            ? categories.find((c: any) => c.id === b.category)?.titleAr || b.category
                            : categories.find((c: any) => c.id === b.category)?.titleEn || b.category
                          }
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 dark:text-slate-400 hidden md:table-cell">{lang === 'ar' ? b.areaAr : b.areaEn}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setEditBiz(b); setShowBizForm(true); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-500" title={lang === 'ar' ? 'تعديل البيانات' : 'Edit'}><Edit className="h-4 w-4" /></button>
                          {!isLinkedEditor && (
                            <button onClick={() => deleteBiz(b.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500" title={lang === 'ar' ? 'حذف' : 'Delete'}><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalAdminPages > 1 && (
            <div className="flex items-center justify-between px-2 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 text-xs">
              <span className="text-gray-500 dark:text-slate-400 font-medium">
                {lang === 'ar' ? `الصفحة ${adminPage} من ${totalAdminPages}` : `Page ${adminPage} of ${totalAdminPages}`}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                  disabled={adminPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-600 font-semibold disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {lang === 'ar' ? 'السابق' : 'Prev'}
                </button>
                <button
                  onClick={() => setAdminPage(p => Math.min(totalAdminPages, p + 1))}
                  disabled={adminPage === totalAdminPages}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-600 font-semibold disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {lang === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {adminTab === 'members' && (
        <div className="space-y-3">
          <MembersPanel members={members} setMembers={setMembers} businesses={businesses} lang={lang} t={t} />
        </div>
      )}

      {/* Reports Tab */}
      {adminTab === 'reports' && (
        <AdminReportsPanel 
          businesses={businesses} 
          members={members} 
          ads={ads} 
          categories={categories}
          bazaarOffers={bazaarOffers}
          lang={lang} 
          t={t} 
        />
      )}

      {/* Trash Bin Tab */}
      {adminTab === 'trash' && (
        <TrashBinPanel
          deletedBusinesses={deletedBusinesses}
          setDeletedBusinesses={setDeletedBusinesses}
          setBusinesses={setBusinesses}
          lang={lang}
          t={t}
        />
      )}

      {/* Ads Tab */}
      {adminTab === 'ads' && (
        <AdsPanel ads={ads} setAds={setAds} categories={categories} businesses={businesses} lang={lang} t={t} siteConfig={siteConfig} setSiteConfig={setSiteConfig} currentUser={currentUser} />
      )}

      {/* Categories Tab */}
      {adminTab === 'categories' && (
        <CategoriesPanel categories={categories} setCategories={setCategories} lang={lang} t={t} />
      )}

      {/* Data Management Tab */}
      {adminTab === 'data-management' && (
        <DataManagementWidget lang={lang} t={t}
          businesses={businesses} setBusinesses={setBusinesses}
          categories={categories} setCategories={setCategories}
          ads={ads} setAds={setAds}
          members={members} setMembers={setMembers}
          siteConfig={siteConfig} setSiteConfig={setSiteConfig} />
      )}

      {/* Site Settings Tab */}
      {adminTab === 'site-settings' && (
        currentUser?.role === 'admin' ? (
          <SiteSettingsPanel siteConfig={siteConfig} setSiteConfig={setSiteConfig} lang={lang} t={t} />
        ) : (
          <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl border border-gray-150 dark:border-slate-700 text-center space-y-4 max-w-lg mx-auto shadow-sm animate-fadeIn" dir="rtl">
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8" />
            </div>
            <h4 className="font-bold text-lg text-gray-900 dark:text-slate-100">
              {lang === 'ar' ? 'صلاحيات غير كافية' : 'Insufficient Permissions'}
            </h4>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'عذراً، تقع صلاحيات التحكم في إعدادات المنصة وهويتها ومعلومات التواصل للمدير (Admin) فقط.'
                : 'Sorry, only the system administrator (Admin) is authorized to modify platform identity, brand, and contact information.'}
            </p>
          </div>
        )
      )}

      {/* Sales Tab */}
      {adminTab === 'sales' && (
        <SalesPanel
          salesProducts={salesProducts}
          setSalesProducts={setSalesProducts}
          salesInvoices={salesInvoices}
          setSalesInvoices={setSalesInvoices}
          businesses={businesses}
          categories={categories}
          currentUser={currentUser}
          lang={lang}
          t={t}
        />
      )}

      {/* Landmarks Tab (Taalou Honi) */}
      {adminTab === 'landmarks' && (
        <LandmarksAdminPanel
          landmarks={landmarks}
          setLandmarks={setLandmarks}
          lang={lang}
          t={t}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {lang === 'ar' ? 'إجراء لا يمكن التراجع عنه' : 'This action cannot be undone'}
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-slate-300">
              {deleteConfirm.type === 'single' ? (
                lang === 'ar' ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف المنشأة <span className="font-bold text-red-600 dark:text-red-400">"{businesses.find((b: any) => b.id === deleteConfirm.id)?.nameAr || businesses.find((b: any) => b.id === deleteConfirm.id)?.nameEn}"</span>؟
                  </>
                ) : (
                  <>
                    Are you sure you want to delete the business <span className="font-bold text-red-600 dark:text-red-400">"{businesses.find((b: any) => b.id === deleteConfirm.id)?.nameEn || businesses.find((b: any) => b.id === deleteConfirm.id)?.nameAr}"</span>?
                  </>
                )
              ) : (
                lang === 'ar' ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف <span className="font-bold text-red-600 dark:text-red-400">{selected.length}</span> من المنشآت المحددة؟
                  </>
                ) : (
                  <>
                    Are you sure you want to delete the <span className="font-bold text-red-600 dark:text-red-400">{selected.length}</span> selected businesses?
                  </>
                )
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BUSINESS FORM ───────────────────────────────────────────────────────────

function BusinessForm({ initial, categories, siteConfig, lang, t, onSave, onCancel }: any) {
  const [form, setForm] = useState<Partial<Business>>(initial || {
    nameAr: '', nameEn: '', category: 'restaurants', subCategory: '',
    areaAr: '', areaEn: '', block: '', phone: '', googleMapsUrl: '',
    image: '', mediaType: 'image', videoUrl: '', pdfUrl: '', pdfName: '',
    isPriority: false, isFeatured: false, hasAdPage: false
  });
  const set = (key: keyof Business, val: any) => setForm(p => ({ ...p, [key]: val }));
  const cat = categories.find((c: Category) => c.id === form.category);

  const handleSaveLocal = () => {
    const finalForm = { ...form };
    if (form.openTime && form.closeTime) {
      finalForm.workHours = `${form.openTime} – ${form.closeTime}`;
    }
    onSave(finalForm as Business);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 space-y-4 animate-fadeIn">
      <h3 className="font-bold text-gray-800 dark:text-slate-100">{initial ? t.edit : t.addBusiness}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { label: t.titleAr, key: 'nameAr' }, { label: t.titleEn, key: 'nameEn' },
          { label: lang === 'ar' ? 'المنطقة (عربي)' : 'Area (AR)', key: 'areaAr' },
          { label: lang === 'ar' ? 'المنطقة (إنجليزي)' : 'Area (EN)', key: 'areaEn' },
          { label: t.block, key: 'block' }, { label: t.phone, key: 'phone' },
          { label: t.maps, key: 'googleMapsUrl' }, { label: 'Instagram', key: 'instagram' },
          { label: 'WhatsApp', key: 'whatsapp' },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{label}</label>
            <input className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
              value={(form as any)[key] || ''} onChange={e => set(key as keyof Business, e.target.value)} />
          </div>
        ))}

        {/* Business Primary Media (Image or Video) */}
        <div className="md:col-span-2 bg-gray-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-gray-150 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
              {lang === 'ar' ? 'وسائط الواجهة للمنشأة (صورة أو فيديو)' : 'Business Profile Media (Image or Video)'}
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs font-semibold cursor-pointer">
                <input 
                  type="radio" 
                  name="bizMediaType"
                  checked={form.mediaType !== 'video'} 
                  onChange={() => set('mediaType', 'image')}
                  className="accent-red-600"
                />
                <span>{lang === 'ar' ? 'صورة' : 'Image'}</span>
              </label>
              <label className="flex items-center gap-1 text-xs font-semibold cursor-pointer">
                <input 
                  type="radio" 
                  name="bizMediaType"
                  checked={form.mediaType === 'video'} 
                  onChange={() => set('mediaType', 'video')}
                  className="accent-red-600"
                />
                <span>{lang === 'ar' ? 'فيديو' : 'Video'}</span>
              </label>
            </div>
          </div>
          
          {form.mediaType === 'video' ? (
            /* Video Upload / Direct URL */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-red-600 dark:text-red-400">
                  {lang === 'ar' ? '📁 رفع فيديو من الكمبيوتر' : '📁 Upload Video from Computer'}
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const maxMB = siteConfig?.maxAdVideoSizeMB ?? 50;
                      const maxBytes = maxMB * 1024 * 1024;
                      if (file.size > maxBytes) {
                        const fileMB = (file.size / (1024 * 1024)).toFixed(1);
                        alert(
                          lang === 'ar'
                            ? `⚠️ عذراً، حجم الفيديو (${fileMB} ميجابايت) يتجاوز الحد الأقصى (${maxMB} ميجابايت).`
                            : `⚠️ Sorry, video size (${fileMB} MB) exceeds limit (${maxMB} MB).`
                        );
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => set('videoUrl', reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 dark:file:bg-red-950/20 file:text-red-700 dark:file:text-red-400 hover:file:bg-red-100 file:cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400">
                  {lang === 'ar' ? '🔗 أو أدخل رابط الفيديو المباشر (Video URL)' : '🔗 Or Enter Direct Video URL'}
                </label>
                <input 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="https://example.com/video.mp4"
                  value={form.videoUrl || ''} 
                  onChange={e => set('videoUrl', e.target.value)} 
                />
              </div>

              {form.videoUrl && (
                <div className="md:col-span-2 flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-700">
                  <video src={form.videoUrl} controls muted className="h-16 w-24 object-cover rounded-lg border border-gray-200 dark:border-slate-700" />
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1 justify-start">
                      <FileCheck className="h-3.5 w-3.5" />
                      {lang === 'ar' ? 'تم تجهيز الفيديو بنجاح 🎬' : 'Video ready 🎬'}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => set('videoUrl', '')} 
                      className="text-[10px] text-red-500 hover:underline mt-1"
                    >
                      {lang === 'ar' ? 'حذف الفيديو' : 'Remove Video'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Image Upload / Direct URL */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-red-600 dark:text-red-400">
                  {lang === 'ar' ? '📁 رفع صورة من الكمبيوتر (مجلد images)' : '📁 Upload Image from Computer (images/)'}
                </label>
                <input
                  type="file"
                  accept="image/webp,image/avif,image/jpeg,image/png,image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const maxMB = siteConfig?.maxAdImageSizeMB ?? 10;
                      const maxBytes = maxMB * 1024 * 1024;
                      if (file.size > maxBytes) {
                        const fileMB = (file.size / (1024 * 1024)).toFixed(1);
                        alert(
                          lang === 'ar'
                            ? `⚠️ عذراً، حجم الصورة (${fileMB} ميجابايت) يتجاوز الحد الأقصى المسموح به من قبل المدير (${maxMB} ميجابايت).`
                            : `⚠️ Sorry, image size (${fileMB} MB) exceeds maximum allowed limit (${maxMB} MB).`
                        );
                        e.target.value = '';
                        return;
                      }
                      try {
                        const webpData = await convertFileToWebP(file);
                        set('image', webpData);
                      } catch {
                        const reader = new FileReader();
                        reader.onload = () => set('image', reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 dark:file:bg-red-950/20 file:text-red-700 dark:file:text-red-400 hover:file:bg-red-100 file:cursor-pointer"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-400">
                  {lang === 'ar' 
                    ? '⚡ يتم تحويل الصورة تلقائياً لصيغة WebP الحديثة فائقة السرعة والخفة' 
                    : '⚡ Image is automatically converted to modern, ultra-fast WebP format'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400">
                  {lang === 'ar' ? '🔗 أو أدخل رابط الصورة المباشر (Image URL)' : '🔗 Or Enter Direct Image URL'}
                </label>
                <input 
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="https://example.com/logo.webp"
                  value={form.image || ''} 
                  onChange={e => set('image', e.target.value)} 
                />
              </div>

              {form.image && (
                <div className="md:col-span-2 flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-700">
                  <img 
                    src={optimizeImageUrl(form.image)} 
                    alt="Business Preview" 
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-20 object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/400/300';
                    }}
                  />
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1 justify-start">
                      <FileCheck className="h-3.5 w-3.5" />
                      {lang === 'ar' ? 'تم تجهيز وضغط الصورة بصيغة WebP بنجاح ⚡' : 'Image converted and optimized to WebP successfully ⚡'}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono block max-w-xs truncate">
                      {form.image.startsWith('data:image/webp') ? 'data:image/webp (محسنة)' : form.image}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── PDF DOCUMENT UPLOAD & MANAGEMENT SECTION ─── */}
        <div className="md:col-span-2 bg-gradient-to-r from-red-50/70 to-orange-50/50 dark:from-slate-900/50 dark:to-slate-900/30 p-4 rounded-2xl border border-red-200/80 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-600" />
            <label className="block text-xs font-bold text-gray-800 dark:text-slate-200">
              {lang === 'ar' ? '📄 ملف PDF للمنشأة (منيو / كتالوج / بروشور / مستندات)' : '📄 Business PDF Document (Menu / Catalog / Brochure)'}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-red-600 dark:text-red-400">
                {lang === 'ar' ? '📁 رفع ملف PDF من الجهاز' : '📁 Upload PDF from Computer'}
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const maxBytes = 25 * 1024 * 1024; // 25MB
                    if (file.size > maxBytes) {
                      alert(lang === 'ar' ? '⚠️ حجم ملف PDF يتجاوز 25 ميجابايت' : '⚠️ PDF file exceeds 25 MB');
                      e.target.value = '';
                      return;
                    }
                    if (!form.pdfName) {
                      set('pdfName', file.name.replace(/\.[^/.]+$/, ''));
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      set('pdfUrl', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 file:cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400">
                {lang === 'ar' ? '🔗 أو رابط ملف PDF المباشر' : '🔗 Or Direct PDF URL'}
              </label>
              <input
                type="text"
                value={form.pdfUrl || ''}
                onChange={(e) => set('pdfUrl', e.target.value)}
                placeholder="https://example.com/menu.pdf"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400">
                {lang === 'ar' ? '📝 اسم أو وصف ملف الـ PDF' : '📝 PDF Document Name / Title'}
              </label>
              <input
                type="text"
                value={form.pdfName || ''}
                onChange={(e) => set('pdfName', e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: منيو قائمة الطعام 2026' : 'e.g. Menu & Price Catalog 2026'}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          {form.pdfUrl && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                  PDF
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-100 block truncate">
                    {form.pdfName || (lang === 'ar' ? 'ملف PDF للمنشأة' : 'Business PDF Document')}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold block">
                    ✓ {lang === 'ar' ? 'تم إرفاق الملف بنجاح، ويمكن للزوار قراءته مباشرة' : 'Document attached and ready to read'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={form.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{lang === 'ar' ? 'معاينة وقراءة' : 'Preview & Read'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    set('pdfUrl', '');
                    set('pdfName', '');
                  }}
                  className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {lang === 'ar' ? 'حذف الملف' : 'Remove'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Work Hours Split inputs */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
            {lang === 'ar' ? 'أوقات العمل (من)' : 'Work Hours (From)'}
          </label>
          <input type="time" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
            value={form.openTime || ''} onChange={e => set('openTime', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
            {lang === 'ar' ? 'أوقات العمل (إلى)' : 'Work Hours (To)'}
          </label>
          <input type="time" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
            value={form.closeTime || ''} onChange={e => set('closeTime', e.target.value)} />
        </div>

        {/* Multiline activities field */}
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
            {lang === 'ar' ? 'الأنشطة (تعدد الأسطر)' : 'Activities (Multiline)'}
          </label>
          <textarea rows={3} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
            value={form.activities || ''} onChange={e => set('activities', e.target.value)} />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{lang === 'ar' ? 'القسم' : 'Category'}</label>
          <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200"
            value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map((c: Category) => <option key={c.id} value={c.id}>{lang === 'ar' ? c.titleAr : c.titleEn}</option>)}
          </select>
        </div>
        {cat && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t.subCategories}</label>
            <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200"
              value={form.subCategory} onChange={e => set('subCategory', e.target.value)}>
              <option value="">—</option>
              {cat.subCategories.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 py-1">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={!!form.isPriority} onChange={e => set('isPriority', e.target.checked)} /> {t.isPriority}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={!!form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} /> {t.featured}
        </label>
      </div>

      {/* Ad Options & Dates Directly in Business Form */}
      <div className="border-t dark:border-slate-700 pt-3 space-y-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={!!form.hasAdPage} onChange={e => set('hasAdPage', e.target.checked)} />
          <span className="font-semibold text-gray-800 dark:text-slate-200">
            {lang === 'ar' ? 'تفعيل صفحة الإعلان الخاص بالمنشأة' : 'Enable Custom Ad Page for Business'}
          </span>
        </label>
        
        {form.hasAdPage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 border-l-2 border-red-500 dark:border-red-600 animate-fadeIn">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'محتوى صفحة الإعلان' : 'Ad Page Content'}
              </label>
              <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={form.adPageContent || ''} onChange={e => set('adPageContent', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'نوع وسائط الإعلان' : 'Ad Media Type'}
              </label>
              <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200"
                value={form.adPageMediaType || 'image'} onChange={e => {
                  set('adPageMediaType', e.target.value as any);
                  set('adPageMediaUrl', ''); // clear on type change
                }}>
                <option value="image">{lang === 'ar' ? 'صورة' : 'Image'}</option>
                <option value="video">{lang === 'ar' ? 'فيديو' : 'Video'}</option>
              </select>
            </div>
            
            {/* Custom Ad Page Media Upload Section */}
            <div className="md:col-span-2 bg-gray-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-gray-150 dark:border-slate-700/60 space-y-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                {form.adPageMediaType === 'video' 
                  ? (lang === 'ar' ? 'فيديو صفحة الإعلان الخاص بالمنشأة' : 'Business Ad Page Video')
                  : (lang === 'ar' ? 'صورة صفحة الإعلان الخاص بالمنشأة' : 'Business Ad Page Image')}
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-red-600 dark:text-red-400">
                    {lang === 'ar' ? `📁 رفع ${form.adPageMediaType === 'video' ? 'فيديو' : 'صورة'} من الكمبيوتر` : `📁 Upload ${form.adPageMediaType === 'video' ? 'Video' : 'Image'} from Computer`}
                  </label>
                  <input
                    type="file"
                    accept={form.adPageMediaType === 'video' ? 'video/*' : 'image/webp,image/avif,image/jpeg,image/png,image/*'}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const isVideo = form.adPageMediaType === 'video';
                        const maxMB = isVideo ? (siteConfig?.maxAdVideoSizeMB ?? 50) : (siteConfig?.maxAdImageSizeMB ?? 10);
                        const maxBytes = maxMB * 1024 * 1024;
                        if (file.size > maxBytes) {
                          const fileMB = (file.size / (1024 * 1024)).toFixed(1);
                          alert(
                            lang === 'ar'
                              ? `⚠️ عذراً، حجم ${isVideo ? 'الفيديو' : 'الصورة'} (${fileMB} ميجابايت) يتجاوز الحد الأقصى المسموح به من قبل المدير (${maxMB} ميجابايت).`
                              : `⚠️ Sorry, ${isVideo ? 'video' : 'image'} size (${fileMB} MB) exceeds maximum allowed limit (${maxMB} MB).`
                          );
                          e.target.value = '';
                          return;
                        }
                        if (!isVideo) {
                          try {
                            const webpData = await convertFileToWebP(file);
                            set('adPageMediaUrl', webpData);
                            return;
                          } catch {
                            // fallback
                          }
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          set('adPageMediaUrl', reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 dark:file:bg-red-950/20 file:text-red-700 dark:file:text-red-400 hover:file:bg-red-100 file:cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-slate-400">
                    {lang === 'ar' 
                      ? (form.adPageMediaType === 'video' ? 'يتم حفظ الفيديو وتشغيله بكفاءة' : '⚡ يتم تحويل وضغط صورة الإعلان لصيغة WebP الحديثة')
                      : (form.adPageMediaType === 'video' ? 'Video saved efficiently' : '⚡ Ad image automatically converted to WebP')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400">
                    {lang === 'ar' ? '🔗 أو أدخل الرابط المباشر (Media URL)' : '🔗 Or Enter Direct Media URL'}
                  </label>
                  <input className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                    placeholder={form.adPageMediaType === 'video' ? 'https://example.com/ad.mp4' : 'https://example.com/ad.webp'}
                    value={form.adPageMediaUrl || ''} onChange={e => set('adPageMediaUrl', e.target.value)} />
                </div>
              </div>

              {form.adPageMediaUrl && (
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-700 flex items-center gap-3">
                  {form.adPageMediaType === 'video' ? (
                    <video src={form.adPageMediaUrl} className="h-14 w-20 object-cover rounded-lg border border-gray-200 dark:border-slate-700" controls muted />
                  ) : (
                    <img 
                      src={optimizeImageUrl(form.adPageMediaUrl)} 
                      alt="Ad Preview" 
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-20 object-cover rounded-lg border border-gray-200 dark:border-slate-700" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/400/300';
                      }} 
                    />
                  )}
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1 justify-start">
                      <FileCheck className="h-3.5 w-3.5" />
                      {lang === 'ar' ? `تم تجهيز ملف الوسائط وتعيين المسار في مجلد ${form.adPageMediaType === 'video' ? 'videos/' : 'images/'}` : `Media processed and referenced under ${form.adPageMediaType === 'video' ? 'videos/' : 'images/'}`}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono block max-w-xs truncate">{form.adPageMediaUrl}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'تاريخ بدء الإعلان' : 'Ad Start Date'}
              </label>
              <input type="datetime-local" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={form.adStartDate || ''} onChange={e => set('adStartDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'تاريخ انتهاء الإعلان' : 'Ad End Date'}
              </label>
              <input type="datetime-local" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={form.adEndDate || ''} onChange={e => set('adEndDate', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSaveLocal} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">{t.save}</button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">{t.cancel}</button>
      </div>
    </div>
  );
}

// ─── ADMIN REPORTS PANEL (INFOGRAPHICS & STATISTICS) ─────────────────────────

function AdminReportsPanel({ businesses = [], members = [], ads = [], categories = [], bazaarOffers = [], lang, t }: any) {
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'categories' | 'geographic' | 'digital' | 'ratings'>('overview');

  // Calculations & Metrics
  const stats = useMemo(() => {
    const total = businesses.length;
    const featured = businesses.filter((b: any) => b.isFeatured).length;
    const priority = businesses.filter((b: any) => b.isPriority).length;
    const visitorCount = parseInt(localStorage.getItem('visitorCount') || '1');
    const totalBazaar = bazaarOffers.length;
    
    // Governorate breakdown
    const govCounts: { [key: string]: number } = {};
    businesses.forEach((b: any) => {
      let gov = b.governorate || '';
      if (!gov) {
        gov = b.areaAr || b.areaEn || '';
      }
      
      let normGov = gov.trim();
      if (!normGov) {
        normGov = lang === 'ar' ? 'غير محدد' : 'Unspecified';
      } else if (normGov.toLowerCase() === 'capital' || normGov === 'العاصمة') {
        normGov = lang === 'ar' ? 'محافظة العاصمة' : 'Capital Governorate';
      } else if (normGov.toLowerCase() === 'muharraq' || normGov === 'المحرق') {
        normGov = lang === 'ar' ? 'محافظة المحرق' : 'Muharraq Governorate';
      } else if (normGov.toLowerCase() === 'northern' || normGov === 'الشمالية') {
        normGov = lang === 'ar' ? 'المحافظة الشمالية' : 'Northern Governorate';
      } else if (normGov.toLowerCase() === 'southern' || normGov === 'الجنوبية') {
        normGov = lang === 'ar' ? 'المحافظة الجنوبية' : 'Southern Governorate';
      } else {
        // Just capitalize English or keep Arabic
        normGov = normGov.charAt(0).toUpperCase() + normGov.slice(1);
      }
      govCounts[normGov] = (govCounts[normGov] || 0) + 1;
    });

    const govArray = Object.entries(govCounts)
      .map(([name, count]) => ({ name, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    // Categories breakdown
    const catCounts: { [key: string]: number } = {};
    businesses.forEach((b: any) => {
      const catId = b.category || '';
      catCounts[catId] = (catCounts[catId] || 0) + 1;
    });

    const categoryStats = categories.map((cat: any) => {
      const count = catCounts[cat.id] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        id: cat.id,
        name: lang === 'ar' ? cat.titleAr : cat.titleEn,
        count,
        pct,
        icon: cat.icon
      };
    }).sort((a: any, b: any) => b.count - a.count);

    // Digital presence connectivity rates
    const withWhatsapp = businesses.filter((b: any) => b.whatsapp && b.whatsapp.trim().length > 0).length;
    const withInstagram = businesses.filter((b: any) => b.instagram && b.instagram.trim().length > 0).length;
    const withPhone = businesses.filter((b: any) => b.phone && b.phone.trim().length > 0).length;
    const withMap = businesses.filter((b: any) => b.googleMapsUrl && b.googleMapsUrl.trim().startsWith('http')).length;

    const connectRates = [
      { 
        label: lang === 'ar' ? 'معدل ربط واتساب مباشر' : 'WhatsApp direct links', 
        count: withWhatsapp, 
        pct: total > 0 ? Math.round((withWhatsapp / total) * 100) : 0,
        color: 'from-emerald-400 to-green-500',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        borderClass: 'border-emerald-100 dark:border-emerald-950/40',
        bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/10'
      },
      { 
        label: lang === 'ar' ? 'معدل حسابات إنستغرام' : 'Instagram profile links', 
        count: withInstagram, 
        pct: total > 0 ? Math.round((withInstagram / total) * 100) : 0,
        color: 'from-pink-400 to-rose-500',
        textClass: 'text-pink-600 dark:text-pink-400',
        borderClass: 'border-pink-100 dark:border-pink-950/40',
        bgClass: 'bg-pink-50/50 dark:bg-pink-950/10'
      },
      { 
        label: lang === 'ar' ? 'موقع الخرائط الجغرافية' : 'Google Maps locations', 
        count: withMap, 
        pct: total > 0 ? Math.round((withMap / total) * 100) : 0,
        color: 'from-blue-400 to-sky-500',
        textClass: 'text-blue-600 dark:text-blue-400',
        borderClass: 'border-blue-100 dark:border-blue-950/40',
        bgClass: 'bg-blue-50/50 dark:bg-blue-950/10'
      },
      { 
        label: lang === 'ar' ? 'قنوات الاتصال الهاتفي' : 'Phone contacts linked', 
        count: withPhone, 
        pct: total > 0 ? Math.round((withPhone / total) * 100) : 0,
        color: 'from-amber-400 to-yellow-500',
        textClass: 'text-amber-600 dark:text-amber-400',
        borderClass: 'border-amber-100 dark:border-amber-950/40',
        bgClass: 'bg-amber-50/50 dark:bg-amber-950/10'
      }
    ];

    // Rating average & distribution
    const withRatings = businesses.filter((b: any) => b.ratingCount && b.ratingCount > 0);
    let avgSum = 0;
    let totalRatings = 0;
    let ratingStars = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1 star counts
    
    withRatings.forEach((b: any) => {
      const bAvg = (b.ratingSum || 0) / (b.ratingCount || 1);
      avgSum += bAvg;
      totalRatings += (b.ratingCount || 0);
      
      // Categorize into star distribution
      const rounded = Math.round(bAvg);
      if (rounded >= 1 && rounded <= 5) {
        ratingStars[5 - rounded] += 1;
      }
    });
    
    const avgRating = withRatings.length > 0 ? (avgSum / withRatings.length) : 0;

    // Ads stats
    const totalAds = ads.length;
    const activeAdsCount = ads.filter((a: any) => a.active).length;
    const topAds = ads.filter((a: any) => a.position === 'top').length;
    const middleAds = ads.filter((a: any) => a.position === 'middle').length;
    const bottomAds = ads.filter((a: any) => a.position === 'bottom').length;
    const videoAds = ads.filter((a: any) => a.mediaType === 'video').length;
    const imageAds = totalAds - videoAds;

    return {
      total,
      featured,
      priority,
      visitorCount,
      totalBazaar,
      govArray,
      categoryStats,
      connectRates,
      avgRating: avgRating.toFixed(1),
      totalRatingsCount: totalRatings,
      ratedBusinessesCount: withRatings.length,
      ratingStars,
      totalAds,
      activeAdsCount,
      topAds,
      middleAds,
      bottomAds,
      videoAds,
      imageAds
    };
  }, [businesses, categories, ads, bazaarOffers, lang]);

  // Tab definitions
  const tabConfig = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: <Activity className="h-4 w-4" /> },
    { id: 'categories', labelAr: 'توزيع التصنيفات', labelEn: 'Categories Share', icon: <Grid className="h-4 w-4" /> },
    { id: 'geographic', labelAr: 'التوزيع الجغرافي', labelEn: 'Geographic Area', icon: <MapPin className="h-4 w-4" /> },
    { id: 'digital', labelAr: 'المؤشر الرقمي', labelEn: 'Digital Connectivity', icon: <Percent className="h-4 w-4" /> },
    { id: 'ratings', labelAr: 'التقييمات والآراء', labelEn: 'Ratings & Reviews', icon: <Star className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-800 dark:text-slate-100">
            {lang === 'ar' ? 'تحليلات النظام المتقدمة' : 'Advanced System Analytics'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {lang === 'ar' ? 'مؤشرات أداء الدليل، الإعلانات، البيانات الجغرافية والتفاعل.' : 'Performance insights for directory data, advertising, and user engagement.'}
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
          {tabConfig.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeReportTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeReportTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bento stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Businesses Card */}
            <div className="bg-gradient-to-br from-red-50 to-white dark:from-slate-800/60 dark:to-slate-800 rounded-2xl p-4 border border-red-100/40 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-950/40 p-2.5 rounded-xl text-red-600 shrink-0">
                  <Grid className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 block leading-none">{lang === 'ar' ? 'إجمالي المنشآت' : 'Total Businesses'}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100 block mt-1 leading-none">{stats.total}</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-[11px] text-gray-500 flex justify-between">
                <span>{lang === 'ar' ? `متميزة: ${stats.featured}` : `Featured: ${stats.featured}`}</span>
                <span>{lang === 'ar' ? `أولوية: ${stats.priority}` : `Priority: ${stats.priority}`}</span>
              </div>
            </div>

            {/* Visitors Card */}
            <div className="bg-gradient-to-br from-green-50 to-white dark:from-slate-800/60 dark:to-slate-800 rounded-2xl p-4 border border-green-100/40 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-950/40 p-2.5 rounded-xl text-green-600 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 block leading-none">{lang === 'ar' ? 'زوار الموقع' : 'Total Visitors'}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100 block mt-1 leading-none">{stats.visitorCount}</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-[11px] text-green-600 font-medium">
                {lang === 'ar' ? 'نشاط مستقر ومتواصل' : 'Continuous stable activity'}
              </div>
            </div>

            {/* Ads Card */}
            <div className="bg-gradient-to-br from-amber-50 to-white dark:from-slate-800/60 dark:to-slate-800 rounded-2xl p-4 border border-amber-100/40 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-950/40 p-2.5 rounded-xl text-amber-600 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 block leading-none">{lang === 'ar' ? 'الإعلانات النشطة' : 'Active Ads'}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100 block mt-1 leading-none">{stats.activeAdsCount}</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-[11px] text-gray-500 flex justify-between">
                <span>{lang === 'ar' ? `الكل: ${stats.totalAds}` : `Total: ${stats.totalAds}`}</span>
                <span>{lang === 'ar' ? `فيديو: ${stats.videoAds}` : `Video: ${stats.videoAds}`}</span>
              </div>
            </div>

            {/* Members Card */}
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-800/60 dark:to-slate-800 rounded-2xl p-4 border border-blue-100/40 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-950/40 p-2.5 rounded-xl text-blue-600 shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 block leading-none">{lang === 'ar' ? 'طاقم العمل والمسؤولين' : 'Staff & Admins'}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100 block mt-1 leading-none">{members.length}</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-[11px] text-gray-500">
                {lang === 'ar' ? 'حسابات بصلاحيات تحكم نشطة' : 'Accounts with control privileges'}
              </div>
            </div>

            {/* Bazaar Offers Card */}
            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-slate-800/60 dark:to-slate-800 rounded-2xl p-4 border border-purple-100/40 dark:border-slate-700 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-950/40 p-2.5 rounded-xl text-purple-600 shrink-0">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 block leading-none">{lang === 'ar' ? 'عروض البازار' : 'Bazaar Offers'}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100 block mt-1 leading-none">{stats.totalBazaar}</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-[11px] text-gray-500">
                {lang === 'ar' ? 'عروض ترويجية نشطة' : 'Active promotional deals'}
              </div>
            </div>
          </div>

          {/* Quick Infographics Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interactive Category Mini Bar Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Grid className="h-4 w-4 text-red-500" />
                  {lang === 'ar' ? 'أعلى الفئات نشاطاً بالمنشآت' : 'Most Active Categories'}
                </h4>
                <button onClick={() => setActiveReportTab('categories')} className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline">
                  {lang === 'ar' ? 'عرض الكل' : 'View All'}
                </button>
              </div>
              <div className="space-y-3">
                {stats.categoryStats.slice(0, 4).map((cat: any) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-slate-300">
                      <span>{cat.name}</span>
                      <span className="text-gray-500 dark:text-slate-400 font-mono">{cat.count} ({cat.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-600 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Digital Connectivity Quick Gauge */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-emerald-500" />
                  {lang === 'ar' ? 'مؤشر الربط الرقمي والاتصال' : 'Digital Connectivity Index'}
                </h4>
                <button onClick={() => setActiveReportTab('digital')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                  {lang === 'ar' ? 'التفاصيل' : 'Details'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {stats.connectRates.slice(0, 4).map((rate, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border ${rate.borderClass} ${rate.bgClass} flex items-center justify-between`}>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 truncate max-w-[120px]">{rate.label}</p>
                      <p className="text-lg font-extrabold text-gray-800 dark:text-slate-100">{rate.pct}%</p>
                    </div>
                    {/* Tiny visual dynamic circle */}
                    <svg className="h-8 w-8 text-gray-200" viewBox="0 0 36 36">
                      <path className="text-gray-200 dark:text-slate-700" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className={rate.textClass} strokeDasharray={`${rate.pct}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ad Positions Layout Tracker Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-blue-500" />
              {lang === 'ar' ? 'أماكن ونوعية الإعلانات في الواجهة' : 'Ad Slot Placement & Formats'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-900/40 rounded-xl space-y-2 border border-gray-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block">{lang === 'ar' ? 'أعلى الواجهة (Top)' : 'Top Placement'}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.topAds}</span>
                  <span className="text-xs text-gray-400">{lang === 'ar' ? 'إعلان مضاف' : 'ads total'}</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-900/40 rounded-xl space-y-2 border border-gray-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block">{lang === 'ar' ? 'منتصف الصفحة (Middle)' : 'Middle Placement'}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.middleAds}</span>
                  <span className="text-xs text-gray-400">{lang === 'ar' ? 'إعلان مضاف' : 'ads total'}</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-900/40 rounded-xl space-y-2 border border-gray-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block">{lang === 'ar' ? 'أسفل الصفحة (Bottom)' : 'Bottom Placement'}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.bottomAds}</span>
                  <span className="text-xs text-gray-400">{lang === 'ar' ? 'إعلان مضاف' : 'ads total'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CATEGORIES SHARE ─── */}
      {activeReportTab === 'categories' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h4 className="font-bold text-base text-gray-800 dark:text-slate-200">
              {lang === 'ar' ? 'الحصة والنسبة المئوية للفئات الرئيسية' : 'Category Share Breakdown'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {lang === 'ar' ? 'توضيح الفئات الأكثر وفرة بالبيانات لدعم استراتيجية التسويق.' : 'Visualizing the density of businesses across all main categories.'}
            </p>
          </div>

          <div className="space-y-4">
            {stats.categoryStats.map((cat: any, index: number) => (
              <div key={cat.id} className="group p-3 hover:bg-gray-50 dark:hover:bg-slate-900/30 rounded-xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-800 flex items-center gap-4">
                <div className="font-mono text-xs text-gray-400 w-5 text-center">#{index + 1}</div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <span className="text-red-500 text-xs font-medium px-1.5 py-0.5 bg-red-50 dark:bg-red-950/20 rounded">
                        {cat.id.toUpperCase()}
                      </span>
                      {cat.name}
                    </span>
                    <span className="font-mono text-gray-600 dark:text-slate-400">{cat.count} {lang === 'ar' ? 'منشأة' : 'businesses'} ({cat.pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-rose-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: GEOGRAPHIC AREA ─── */}
      {activeReportTab === 'geographic' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h4 className="font-bold text-base text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <MapPin className="h-5 w-5 text-red-600" />
              {lang === 'ar' ? 'التوزيع الجغرافي للمنشآت والأنشطة' : 'Geographical Coverage in Bahrain'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {lang === 'ar' ? 'نسب المنشآت والأنشطة موزعة بحسب المحافظات والمناطق المسجلة بالدليل.' : 'Proportion of registered businesses across Bahraini governorates and regions.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Governorate Cards list */}
            <div className="lg:col-span-2 space-y-4">
              {stats.govArray.map((gov, idx) => (
                <div key={idx} className="p-4 bg-gray-50/50 dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-800 dark:text-slate-200">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-600" />
                      {gov.name}
                    </span>
                    <span className="font-mono bg-red-50 dark:bg-red-950/30 text-red-600 px-2.5 py-1 rounded-lg">
                      {gov.count} {lang === 'ar' ? 'منشأة' : 'businesses'} ({gov.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-rose-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${gov.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Geography summary card */}
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-slate-900/40 dark:to-slate-800 rounded-xl p-5 border border-gray-150 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 block uppercase tracking-wide">
                  {lang === 'ar' ? 'المدينة الأكثر كثافة' : 'Dense Region Match'}
                </span>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-xl text-red-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="font-black text-lg text-gray-800 dark:text-slate-100">
                      {stats.govArray[0]?.name || (lang === 'ar' ? 'غير متوفر' : 'N/A')}
                    </h5>
                    <p className="text-xs text-gray-500">
                      {lang === 'ar' ? `تستحوذ على ${stats.govArray[0]?.pct || 0}% من إجمالي خدمات الدليل` : `Has ${stats.govArray[0]?.pct || 0}% of all directory items`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 border-t border-gray-100 dark:border-slate-700/60 pt-4 text-xs text-gray-500 leading-relaxed">
                {lang === 'ar' 
                  ? 'يساعد التوزيع الجغرافي على توجيه عروض البازار والمنشورات الإعلانية وتوزيعها بالتساوي بين المستهلكين بحسب الاحتياج الفعلي.' 
                  : 'Geographical insights assist in distributing promotional offers and banners to best fit consumer density in real-time.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: DIGITAL CONNECTIVITY ─── */}
      {activeReportTab === 'digital' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h4 className="font-bold text-base text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <Percent className="h-5 w-5 text-emerald-600" />
              {lang === 'ar' ? 'المؤشر الرقمي لقنوات التواصل والربط المباشر' : 'Full Digital Connectivity Index'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {lang === 'ar' ? 'توضيح جاهزية المنشآت وقابليتها للربط السريع عبر وسائل التواصل الإلكترونية.' : 'Measuring listing optimization by connectivity channels (WhatsApp, Maps, Instagram, and Direct Calls).'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.connectRates.map((rate, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border ${rate.borderClass} ${rate.bgClass} flex flex-col justify-between space-y-6 relative overflow-hidden`}>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-300 leading-tight block max-w-[130px]">{rate.label}</span>
                  <span className={`text-2xl font-black font-mono ${rate.textClass}`}>{rate.pct}%</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                    <span>{lang === 'ar' ? 'مكتمل الربط' : 'Linked'}</span>
                    <span>{rate.count} / {stats.total}</span>
                  </div>
                  <div className="w-full bg-gray-200/50 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`bg-gradient-to-r ${rate.color} h-full rounded-full transition-all duration-1000`} 
                      style={{ width: `${rate.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-xl border border-emerald-100/30 dark:border-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
            {lang === 'ar'
              ? '💡 نصيحة تسويقية: البيانات تؤكد أن توفير روابط واتساب المباشرة للمنشآت تزيد من معدل التحويل والنقر الفعلي بنسبة تتجاوز 45% مقارنة بالمنشآت التي تكتفي بالاتصال الهاتفي التقليدي.'
              : '💡 Marketing Tip: Providing direct, pre-filled WhatsApp click-to-chat links increases listing click-through rate (CTR) by over 45% compared to basic telephone strings.'}
          </div>
        </div>
      )}

      {/* ─── TAB 5: RATINGS & REVIEWS ─── */}
      {activeReportTab === 'ratings' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h4 className="font-bold text-base text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <Star className="h-5 w-5 text-yellow-500" />
              {lang === 'ar' ? 'مؤشرات التقييم ورضا المستخدمين' : 'Visitor Feedback & Ratings Analytics'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {lang === 'ar' ? 'إحصائيات تفاعل الزوار، والتقييمات، ونسب رضا العملاء عن خدمات المنشآت.' : 'Tracking average scores and volume distribution of customer feedback.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Gauge of overall rating */}
            <div className="bg-gradient-to-br from-yellow-50/40 to-white dark:from-slate-900/40 dark:to-slate-800 p-5 rounded-xl border border-yellow-100/30 dark:border-slate-800 flex flex-col justify-between items-center text-center space-y-4">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400 block uppercase tracking-wider">
                {lang === 'ar' ? 'متوسط رضا الدليل العام' : 'Weighted Directory Rating'}
              </span>
              
              <div className="relative flex items-center justify-center">
                {/* Visual circular representation of rating out of 5 */}
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-slate-700" />
                  <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="8" strokeDasharray="289" strokeDashoffset={289 - (289 * parseFloat(stats.avgRating)) / 5} strokeLinecap="round" fill="transparent" className="text-yellow-500" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-gray-900 dark:text-slate-100 font-mono">{stats.avgRating}</span>
                  <span className="text-[10px] text-gray-400">/ 5.0</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  {lang === 'ar' ? 'رضا عملاء متميز ومستقر' : 'High Customer Sentiment'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {lang === 'ar' ? `بناءً على تقييمات ${stats.ratedBusinessesCount} منشأة مصنفة` : `Aggregated from ${stats.ratedBusinessesCount} rated businesses`}
                </p>
              </div>
            </div>

            {/* Stars distribution breakdown */}
            <div className="lg:col-span-2 space-y-3 flex flex-col justify-center">
              <h5 className="text-xs font-bold text-gray-600 dark:text-slate-300">
                {lang === 'ar' ? 'توزيع التقييمات حسب النجوم' : 'Stars Distribution Scorecard'}
              </h5>
              
              <div className="space-y-2">
                {stats.ratingStars.map((count, index) => {
                  const starNum = 5 - index;
                  const pct = stats.ratedBusinessesCount > 0 ? Math.round((count / stats.ratedBusinessesCount) * 100) : 0;
                  return (
                    <div key={index} className="flex items-center gap-3 text-xs">
                      <span className="font-bold w-12 text-gray-500 dark:text-slate-400 flex items-center gap-1">
                        {starNum} <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 inline-block" />
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="bg-yellow-500 h-full rounded-full" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-gray-400 w-10 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function MembersPanel({ members, setMembers, businesses = [], lang, t }: any) {
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'editor'>('editor');
  const [businessId, setBusinessId] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const handleSave = () => {
    if (!username.trim()) return;
    const linkedBizId = role === 'editor' && businessId ? businessId : undefined;
    if (editingMember) {
      setMembers((p: User[]) => p.map(m => m.id === editingMember.id ? { ...m, username, password, role, businessId: linkedBizId } : m));
    } else {
      setMembers((p: User[]) => [...p, { id: Date.now().toString(), username, password, role, businessId: linkedBizId }]);
    }
    resetForm();
  };

  const handleEdit = (m: User) => {
    setEditingMember(m);
    setUsername(m.username);
    setPassword(m.password || '');
    setRole(m.role);
    setBusinessId(m.businessId || '');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingMember(null);
    setUsername('');
    setPassword('');
    setRole('editor');
    setBusinessId('');
    setShowForm(false);
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 dark:text-slate-100">
          {lang === 'ar' ? 'إدارة أعضاء النظام وصلاحياتهم' : 'Manage System Members & Permissions'}
        </h3>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors animate-fadeIn">
            <Plus className="h-4 w-4" /> {t.addMember}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 space-y-3 animate-fadeIn">
          <h4 className="font-bold text-gray-800 dark:text-slate-200">
            {editingMember 
              ? (lang === 'ar' ? 'تعديل عضو' : 'Edit Member') 
              : (lang === 'ar' ? 'إضافة عضو جديد' : 'Add New Member')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t.username}</label>
              <input className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t.password}</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                placeholder={lang === 'ar' ? 'كلمة المرور' : 'Password'}
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t.role}</label>
              <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={role} onChange={e => setRole(e.target.value as any)}>
                <option value="editor">{lang === 'ar' ? 'محرر (Editor)' : 'Editor'}</option>
                <option value="admin">{lang === 'ar' ? 'مدير (Admin)' : 'Admin'}</option>
              </select>
            </div>
            {role === 'editor' && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{lang === 'ar' ? 'الربط بمنشأة محددة (اختياري)' : 'Link to Business (Optional)'}</label>
                <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                  value={businessId} onChange={e => setBusinessId(e.target.value)}>
                  <option value="">{lang === 'ar' ? '-- غير مرتبط (كل المنشآت) --' : '-- All Businesses --'}</option>
                  {businesses.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {lang === 'ar' ? b.nameAr : b.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2 justify-end">
            <button onClick={handleSave} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">{t.save}</button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-150 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-150 dark:border-slate-700">
            <tr>
              <th className="p-3 text-right font-semibold text-gray-600 dark:text-slate-400">{t.username}</th>
              <th className="p-3 text-right font-semibold text-gray-600 dark:text-slate-400">{lang === 'ar' ? 'كلمة المرور' : 'Password'}</th>
              <th className="p-3 text-right font-semibold text-gray-600 dark:text-slate-400">{t.role}</th>
              <th className="p-3 text-right font-semibold text-gray-600 dark:text-slate-400">{lang === 'ar' ? 'المنشأة المرتبطة' : 'Linked Business'}</th>
              <th className="p-3 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: User) => {
              const linkedBiz = m.businessId ? businesses.find((b: any) => b.id === m.businessId) : null;
              return (
                <tr key={m.id} className="border-t border-gray-150 dark:border-slate-750 hover:bg-gray-50/50 dark:hover:bg-slate-750/30 transition-colors">
                  <td className="p-3 font-medium text-gray-800 dark:text-slate-200 text-right">{m.username}</td>
                  <td className="p-3 text-gray-600 dark:text-slate-300 text-right font-mono">
                    {showPasswords[m.id] ? m.password : '••••••••'}
                    <button onClick={() => toggleShowPassword(m.id)} className="mr-2 text-xs text-blue-500 hover:underline transition-all">
                      {showPasswords[m.id] ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')}
                    </button>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-slate-400 text-right font-medium">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${m.role === 'admin' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                      {m.role === 'admin' ? (lang === 'ar' ? 'مدير' : 'Admin') : (lang === 'ar' ? 'محرر' : 'Editor')}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-slate-300 text-right text-xs">
                    {linkedBiz ? (
                      <span className="inline-block px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold">
                        {lang === 'ar' ? linkedBiz.nameAr : linkedBiz.nameEn}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500">{m.role === 'admin' ? (lang === 'ar' ? 'كل المنشآت (مدير)' : 'All (Admin)') : (lang === 'ar' ? 'غير مرتبط' : 'Unlinked')}</span>
                    )}
                  </td>
                  <td className="p-3 text-left">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => handleEdit(m)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-500 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => {
                        if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا العضو؟' : 'Are you sure you want to delete this member?')) {
                          setMembers((p: User[]) => p.filter(u => u.id !== m.id));
                        }
                      }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ADS PANEL ───────────────────────────────────────────────────────────────

function AdsPanel({ ads, setAds, categories = [], businesses = [], lang, t, siteConfig, setSiteConfig, currentUser }: any) {
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  
  // Is this an editor linked to a specific business?
  const isLinkedEditor = currentUser?.role === 'editor' && currentUser?.businessId;
  const userLinkedBiz = isLinkedEditor ? businesses.find((b: any) => b.id === currentUser.businessId) : null;

  // Filter ads visible to this user
  const visibleAds = ads.filter((ad: Ad) => {
    if (isLinkedEditor) {
      // Editor linked to business sees ads created for their business or added by them
      return ad.businessId === currentUser.businessId || ad.addedBy === currentUser.username;
    }
    return true; // Admin/unlinked editor sees all
  });

  // Ad Form Fields
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [link, setLink] = useState('');
  const [position, setPosition] = useState<'top' | 'middle' | 'bottom' | 'sidebar'>('top');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [heightClass, setHeightClass] = useState('h-40');
  const [categoryId, setCategoryId] = useState('');
  const [autoSize, setAutoSize] = useState(false);
  const [selectedBizId, setSelectedBizId] = useState<string>(isLinkedEditor ? (currentUser.businessId || '') : '');

  const handleSave = () => {
    const adData: Ad = {
      id: editingAd ? editingAd.id : Date.now().toString(),
      title,
      mediaType,
      imageUrl: mediaType === 'image' ? imageUrl : undefined,
      videoUrl: mediaType === 'video' ? videoUrl : undefined,
      link,
      position,
      active: editingAd ? editingAd.active : true,
      heightClass,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      categoryId: categoryId || undefined,
      autoSize,
      businessId: isLinkedEditor ? currentUser.businessId : (selectedBizId || undefined),
      addedBy: editingAd ? editingAd.addedBy : (currentUser?.username || 'admin')
    };

    if (editingAd) {
      setAds((p: Ad[]) => p.map(a => a.id === editingAd.id ? adData : a));
    } else {
      setAds((p: Ad[]) => [...p, adData]);
    }
    resetForm();
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setTitle(ad.title);
    setMediaType(ad.mediaType);
    setImageUrl(ad.imageUrl || '');
    setVideoUrl(ad.videoUrl || '');
    setLink(ad.link);
    setPosition(ad.position);
    setStartDate(ad.startDate || '');
    setEndDate(ad.endDate || '');
    setHeightClass(ad.heightClass);
    setCategoryId(ad.categoryId || '');
    setAutoSize(!!ad.autoSize);
    setSelectedBizId(ad.businessId || '');
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (isLinkedEditor) return;
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الإعلان؟' : 'Are you sure you want to delete this ad?')) {
      setAds((p: Ad[]) => p.filter(a => a.id !== id));
    }
  };

  const resetForm = () => {
    setEditingAd(null);
    setTitle('');
    setMediaType('image');
    setImageUrl('');
    setVideoUrl('');
    setLink('');
    setPosition('top');
    setStartDate('');
    setEndDate('');
    setHeightClass('h-40');
    setCategoryId('');
    setAutoSize(false);
    setSelectedBizId(isLinkedEditor ? (currentUser.businessId || '') : '');
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 dark:text-slate-100">{lang === 'ar' ? 'إدارة الإعلانات' : 'Manage Ads'}</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> {lang === 'ar' ? 'إضافة إعلان' : 'Add Ad'}
        </button>
      </div>

      {/* Ad Display Limits Settings Panel */}
      {currentUser?.role === 'admin' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-150 dark:border-slate-700 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-2.5">
            <Settings className="h-4 w-4 text-red-600" />
            <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200">
              {lang === 'ar' ? 'إعدادات ظهور وأحجام وسائط الإعلانات (خاص بالمدير)' : 'Ad Display & Media Size Limits (Admin)'}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                {lang === 'ar' ? '1. حدود عدد الإعلانات الظاهرة في نفس الوقت:' : '1. Concurrently Displayed Ads Limits:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Top Ads Limit */}
                <div className="space-y-1 p-2.5 bg-gray-50/50 dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-slate-800">
                  <label className="block text-[10px] font-semibold text-gray-600 dark:text-slate-300">
                    {lang === 'ar' ? 'أعلى (Top)' : 'Top'}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                    value={siteConfig?.maxAdsTop ?? 1} 
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setSiteConfig((prev: any) => ({ ...prev, maxAdsTop: isNaN(val) ? 1 : val }));
                    }}
                  />
                </div>

                {/* Middle Ads Limit */}
                <div className="space-y-1 p-2.5 bg-gray-50/50 dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-slate-800">
                  <label className="block text-[10px] font-semibold text-gray-600 dark:text-slate-300">
                    {lang === 'ar' ? 'منتصف (Mid)' : 'Middle'}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                    value={siteConfig?.maxAdsMiddle ?? 1} 
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setSiteConfig((prev: any) => ({ ...prev, maxAdsMiddle: isNaN(val) ? 1 : val }));
                    }}
                  />
                </div>

                {/* Bottom Ads Limit */}
                <div className="space-y-1 p-2.5 bg-gray-50/50 dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-slate-800">
                  <label className="block text-[10px] font-semibold text-gray-600 dark:text-slate-300">
                    {lang === 'ar' ? 'أسفل (Bottom)' : 'Bottom'}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                    value={siteConfig?.maxAdsBottom ?? 1} 
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setSiteConfig((prev: any) => ({ ...prev, maxAdsBottom: isNaN(val) ? 1 : val }));
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                {lang === 'ar' ? '2. حدود حجم الملفات المرفوعة للإعلانات (MB):' : '2. Max File Size Limits for Ad Media Uploads (MB):'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Max Image Size */}
                <div className="space-y-1 p-2.5 bg-red-50/40 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
                  <label className="block text-[10px] font-bold text-red-700 dark:text-red-300">
                    {lang === 'ar' ? '🖼️ أقصى حجم للصورة (MB)' : '🖼️ Max Image (MB)'}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="500"
                    className="w-full px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 font-bold"
                    value={siteConfig?.maxAdImageSizeMB ?? 10} 
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setSiteConfig((prev: any) => ({ ...prev, maxAdImageSizeMB: isNaN(val) || val < 1 ? 10 : val }));
                    }}
                  />
                </div>

                {/* Max Video Size */}
                <div className="space-y-1 p-2.5 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                  <label className="block text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    {lang === 'ar' ? '🎥 أقصى حجم للفيديو (MB)' : '🎥 Max Video (MB)'}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="1000"
                    className="w-full px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 font-bold"
                    value={siteConfig?.maxAdVideoSizeMB ?? 50} 
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setSiteConfig((prev: any) => ({ ...prev, maxAdVideoSizeMB: isNaN(val) || val < 1 ? 50 : val }));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-xs flex items-center gap-2" dir="rtl">
          <Shield className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <span>
            {lang === 'ar' 
              ? 'تنبيه: تعديل إعدادات حدود ظهور الإعلانات متاح فقط لحساب المدير (Admin).' 
              : 'Notice: Only the system administrator (Admin) can modify ad display limit settings.'}
          </span>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 space-y-3 animate-fadeIn">
          <h4 className="font-bold text-gray-800 dark:text-slate-200">{editingAd ? (lang === 'ar' ? 'تعديل الإعلان' : 'Edit Ad') : (lang === 'ar' ? 'إضافة إعلان جديد' : 'Add New Ad')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'العنوان' : 'Title'}</label>
              <input className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'الرابط الموجه إليه' : 'Target Link'}</label>
              <input className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={link} onChange={e => setLink(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'نوع الوسائط' : 'Media Type'}</label>
              <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200"
                value={mediaType} onChange={e => setMediaType(e.target.value as any)}>
                <option value="image">{lang === 'ar' ? 'صورة' : 'Image'}</option>
                <option value="video">{lang === 'ar' ? 'فيديو' : 'Video'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'الموقع' : 'Position'}</label>
              <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200"
                value={position} onChange={e => setPosition(e.target.value as any)}>
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'مكان ظهور الإعلان (القسم)' : 'Ad Placement (Category)'}</label>
              <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200"
                value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="all">{lang === 'ar' ? 'الكل (كل الصفحات والأقسام)' : 'All (All Pages & Categories)'}</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{lang === 'ar' ? cat.titleAr : cat.titleEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'ربط الإعلان بمنشأة' : 'Link Ad to Business'}</label>
              {isLinkedEditor ? (
                <div className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-gray-50 dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-bold">
                  {userLinkedBiz ? (lang === 'ar' ? userLinkedBiz.nameAr : userLinkedBiz.nameEn) : (lang === 'ar' ? 'المنشأة المرتبطة بحسابك' : 'Your Associated Business')}
                </div>
              ) : (
                <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200"
                  value={selectedBizId} onChange={e => setSelectedBizId(e.target.value)}>
                  <option value="">{lang === 'ar' ? '-- إعلان عام (غير مرتبط بمنشأة) --' : '-- General Ad (No Business) --'}</option>
                  {businesses.map((b: any) => (
                    <option key={b.id} value={b.id}>{lang === 'ar' ? b.nameAr : b.nameEn}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="md:col-span-2 bg-gray-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-gray-150 dark:border-slate-700/60 space-y-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                {mediaType === 'image' 
                  ? (lang === 'ar' ? 'صورة الإعلان' : 'Ad Image') 
                  : (lang === 'ar' ? 'فيديو الإعلان' : 'Ad Video')}
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-red-600 dark:text-red-400">
                    {lang === 'ar' 
                      ? `📁 رفع ${mediaType === 'image' ? 'صورة' : 'فيديو'} الإعلان من الكمبيوتر` 
                      : `📁 Upload Ad ${mediaType === 'image' ? 'Image' : 'Video'} from Computer`}
                  </label>
                  <input
                    type="file"
                    accept={mediaType === 'video' ? 'video/*' : 'image/webp,image/avif,image/jpeg,image/png,image/*'}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const isVideo = mediaType === 'video';
                        const maxMB = isVideo ? (siteConfig?.maxAdVideoSizeMB ?? 50) : (siteConfig?.maxAdImageSizeMB ?? 10);
                        const maxBytes = maxMB * 1024 * 1024;
                        if (file.size > maxBytes) {
                          const fileMB = (file.size / (1024 * 1024)).toFixed(1);
                          alert(
                            lang === 'ar'
                              ? `⚠️ عذراً، حجم ${isVideo ? 'الفيديو' : 'الصورة'} المرفوع (${fileMB} ميجابايت) يتجاوز الحد الأقصى المسموح به من قبل المدير (${maxMB} ميجابايت).`
                              : `⚠️ Sorry, the uploaded ${isVideo ? 'video' : 'image'} size (${fileMB} MB) exceeds the maximum limit set by the administrator (${maxMB} MB).`
                          );
                          e.target.value = '';
                          return;
                        }
                        if (!isVideo) {
                          try {
                            const webpData = await convertFileToWebP(file);
                            setImageUrl(webpData);
                            return;
                          } catch {
                            // fallback
                          }
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (mediaType === 'image') {
                            setImageUrl(reader.result as string);
                          } else {
                            setVideoUrl(reader.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 dark:file:bg-red-950/20 file:text-red-700 dark:file:text-red-400 hover:file:bg-red-100 file:cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-slate-400">
                    {lang === 'ar' 
                      ? `📌 الحد الأقصى للحجم: ${mediaType === 'video' ? (siteConfig?.maxAdVideoSizeMB ?? 50) : (siteConfig?.maxAdImageSizeMB ?? 10)} ميجابايت (تحويل تلقائي لـ WebP للصور)` 
                      : `📌 Max allowed size: ${mediaType === 'video' ? (siteConfig?.maxAdVideoSizeMB ?? 50) : (siteConfig?.maxAdImageSizeMB ?? 10)} MB (Auto-WebP for images)`}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400">
                    {mediaType === 'image' 
                      ? (lang === 'ar' ? '🔗 أو أدخل رابط الصورة المباشر (Image URL)' : '🔗 Or Enter Direct Image URL')
                      : (lang === 'ar' ? '🔗 أو أدخل رابط الفيديو المباشر (Video URL)' : '🔗 Or Enter Direct Video URL')}
                  </label>
                  <input 
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                    placeholder={mediaType === 'image' ? 'https://example.com/ad.webp' : 'https://example.com/ad.mp4'}
                    value={mediaType === 'image' ? imageUrl : videoUrl}
                    onChange={e => {
                      if (mediaType === 'image') {
                        setImageUrl(e.target.value);
                      } else {
                        setVideoUrl(e.target.value);
                      }
                    }}
                  />
                </div>
              </div>

              {((mediaType === 'image' && imageUrl) || (mediaType === 'video' && videoUrl)) && (
                <div className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-700">
                  {mediaType === 'image' ? (
                    <img 
                      src={optimizeImageUrl(imageUrl)} 
                      alt="Ad Preview" 
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-20 object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                    />
                  ) : (
                    <video 
                      src={videoUrl} 
                      className="h-14 w-20 object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                      controls
                      muted
                    />
                  )}
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1 justify-start">
                      <FileCheck className="h-3.5 w-3.5" />
                      {lang === 'ar' ? `تم تجهيز ملف الإعلان وتعيين المسار في مجلد ${mediaType === 'video' ? 'videos/' : 'images/'}` : `Ad file processed and referenced under ${mediaType === 'video' ? 'videos/' : 'images/'}`}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono block max-w-xs truncate">
                      {mediaType === 'image' ? imageUrl : videoUrl}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'فئة الارتفاع' : 'Height Class'}</label>
              <input className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none disabled:bg-gray-100 dark:disabled:bg-slate-700/50"
                placeholder="e.g., h-40, h-64" value={heightClass} onChange={e => setHeightClass(e.target.value)} disabled={autoSize} />
              {autoSize && (
                <p className="text-[10px] text-emerald-600 mt-1">
                  {lang === 'ar' ? 'الارتفاع تلقائي وفقاً لأبعاد الصورة لعدم القص' : 'Height is automatic based on image ratio to prevent cropping'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
              <input type="datetime-local" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none"
                value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
              <input type="datetime-local" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none"
                value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 py-1 bg-red-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-red-100/50 dark:border-slate-800">
            <label className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer w-full select-none">
              <input type="checkbox" checked={autoSize} onChange={e => setAutoSize(e.target.checked)} className="h-4 w-4 rounded text-red-600 focus:ring-red-500" />
              <div>
                <span className="font-bold text-gray-800 dark:text-slate-200 block">
                  {lang === 'ar' ? 'تفعيل ميزة العرض التلقائي المتجاوب (Responsive Scale)' : 'Enable Responsive Auto Sizing'}
                </span>
                <span className="text-gray-500 dark:text-slate-400 block text-[10px] mt-0.5">
                  {lang === 'ar' ? 'عند التفعيل، سيتغير عرض وارتفاع الصورة بشكل متناسب وتلقائي مع حجم جهاز العرض لضمان ظهور كامل تفاصيل الصورة بدون أي اقتصاص.' : 'When enabled, the image size adjusts proportionally and dynamically with the display screen size to display the entire image without cropping.'}
                </span>
              </div>
            </label>
          </div>
          <div className="flex gap-2 pt-2 justify-end">
            <button onClick={handleSave} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">{t.save}</button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {visibleAds.map((ad: Ad) => {
          const now = new Date();
          const isNotStarted = ad.startDate && new Date(ad.startDate) > now;
          const isExpired = ad.endDate && new Date(ad.endDate) < now;
          let dateStatus = '';
          if (isNotStarted) dateStatus = lang === 'ar' ? 'لم يبدأ بعد' : 'Scheduled';
          else if (isExpired) dateStatus = lang === 'ar' ? 'منتهي الصلاحية' : 'Expired';
          else dateStatus = lang === 'ar' ? 'نشط الآن' : 'Running';

          const linkedBiz = ad.businessId ? businesses.find((b: any) => b.id === ad.businessId) : null;

          return (
            <div key={ad.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-4">
                <div className="w-16 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0">
                  {ad.mediaType === 'image' && ad.imageUrl
                    ? <img src={optimizeImageUrl(ad.imageUrl)} alt={ad.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    : <Video className="h-6 w-6 text-gray-400 m-3" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">{ad.title}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {ad.position} · {ad.mediaType}
                    {ad.categoryId && ad.categoryId !== 'all' && ` · ${lang === 'ar' ? 'القسم' : 'Category'}: ${categories.find((c: any) => c.id === ad.categoryId)?.titleAr || ad.categoryId}`}
                    {(!ad.categoryId || ad.categoryId === 'all') && ` · ${lang === 'ar' ? 'كل الأقسام' : 'All categories'}`}
                    {ad.startDate && ` · ${lang === 'ar' ? 'من' : 'From'}: ${ad.startDate}`}
                    {ad.endDate && ` · ${lang === 'ar' ? 'إلى' : 'To'}: ${ad.endDate}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${isExpired ? 'bg-red-100 text-red-600' : isNotStarted ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                      {dateStatus}
                    </span>
                    {ad.autoSize && (
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {lang === 'ar' ? 'متجاوب تلقائي' : 'Auto Scale'}
                      </span>
                    )}
                    {linkedBiz && (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        🏢 {lang === 'ar' ? linkedBiz.nameAr : linkedBiz.nameEn}
                      </span>
                    )}
                    {ad.addedBy && (
                      <span className="inline-block text-[10px] text-gray-400 dark:text-slate-500">
                        {lang === 'ar' ? `بواسطة: ${ad.addedBy}` : `By: ${ad.addedBy}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <span className="text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'نشط' : 'Active'}</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={ad.active}
                      onChange={e => setAds((p: Ad[]) => p.map(a => a.id === ad.id ? { ...a, active: e.target.checked } : a))} />
                    <div className={`w-8 h-4 rounded-full transition-colors ${ad.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${ad.active ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                  </div>
                </label>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(ad)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-500" title={lang === 'ar' ? 'تعديل الإعلان' : 'Edit'}><Edit className="h-4 w-4" /></button>
                  {!isLinkedEditor && (
                    <button onClick={() => handleDelete(ad.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500" title={lang === 'ar' ? 'حذف' : 'Delete'}><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DATA MANAGEMENT & BULK ACTIONS ─────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 0 && (row.length > 1 || row[0] !== '')) {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (row.length > 0 || currentVal !== '') {
    row.push(currentVal.trim());
    lines.push(row);
  }
  return lines;
}

function DataManagementWidget({ lang, t, businesses, setBusinesses, categories, setCategories, ads, setAds, members, setMembers, siteConfig, setSiteConfig }: any) {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Export Backup
  const exportSystemBackup = () => {
    try {
      const data = {
        businesses,
        categories,
        ads,
        members,
        siteConfig
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `bh_services_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg(lang === 'ar' 
        ? 'تم بدء تحميل النسخة الاحتياطية بنجاح! إذا لم يبدأ التحميل تلقائياً، يرجى فتح الموقع في نافذة مستقلة (تبويب جديد) لتفادي قيود الحماية للإطار.' 
        : 'Backup download initiated successfully! If it did not start automatically, please open the app in a new tab to bypass iframe security sandbox policies.');
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // 2. Restore Backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.businesses) setBusinesses(parsed.businesses);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.ads) setAds(parsed.ads);
        if (parsed.members) setMembers(parsed.members);
        if (parsed.siteConfig) setSiteConfig(parsed.siteConfig);
        setSuccessMsg(lang === 'ar' ? 'تم استعادة البيانات والنسخة الاحتياطية بنجاح!' : 'System restore completed successfully!');
        setErrorMsg('');
      } catch (err: any) {
        setErrorMsg(lang === 'ar' ? 'فشل استيراد الملف. تأكد من صحة التنسيق.' : 'Restore failed. Invalid format.');
      }
    };
    reader.readAsText(file);
  };

  // 3. Download Excel (XLSX) Template
  const downloadExcelTemplate = () => {
    const headers = [
      "id", "nameAr", "nameEn", "category", "subCategory", 
      "areaAr", "areaEn", "block", "phone", "googleMapsUrl", 
      "activities", "workHours", "openTime", "closeTime", 
      "whatsapp", "instagram", "image", "isPriority", 
      "isFeatured", "hasAdPage", "adPageContent", "adPageMediaType", 
      "adPageMediaUrl", "adStartDate", "adEndDate"
    ];
    const rows = [
      [
        "", // id (auto-generated if left empty)
        "مطعم الكبسة البحرينية الفاخرة", // nameAr
        "Bahraini Luxury Kabsa Restaurant", // nameEn
        "restaurants", // category
        "Traditional", // subCategory
        "المنامة", // areaAr
        "Manama", // areaEn
        "302", // block
        "17123456", // phone
        "https://maps.google.com", // googleMapsUrl
        "مطاعم كبسة عيوش أكلات شعبية غداء وعشاء طازج يومياً", // activities
        "08:00 – 23:00", // workHours
        "08:00", // openTime
        "23:00", // closeTime
        "97317123456", // whatsapp
        "@alkabsa", // instagram
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c", // image
        "TRUE", // isPriority
        "TRUE", // isFeatured
        "TRUE", // hasAdPage
        "تذوق الكبسة البحرينية على أصولها! أقوى العروض الحصرية لوجبات الغداء والعشاء للعائلات والأفراد 🌟", // adPageContent
        "image", // adPageMediaType
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c", // adPageMediaUrl
        "2026-07-13T08:00", // adStartDate
        "2026-08-13T23:00" // adEndDate
      ],
      [
        "custom_id_789", // id (provided to update existing or set custom)
        "صيدلية العافية والجمال", // nameAr
        "Al-Afiah Health & Beauty Pharmacy", // nameEn
        "health", // category
        "Pharmacies", // subCategory
        "المحرق", // areaAr
        "Muharraq", // areaEn
        "202", // block
        "17654321", // phone
        "https://maps.google.com", // googleMapsUrl
        "صيدلية أدوية مستحضرات تجميل رعاية صحية فيتامينات مكملات غذائية أولية", // activities
        "09:00 – 22:00", // workHours
        "09:00", // openTime
        "22:00", // closeTime
        "97317654321", // whatsapp
        "@afiah_pharmacy", // instagram
        "", // image
        "FALSE", // isPriority
        "FALSE", // isFeatured
        "FALSE", // hasAdPage
        "", // adPageContent
        "image", // adPageMediaType
        "", // adPageMediaUrl
        "", // adStartDate
        "" // adEndDate
      ]
    ];
    
    try {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `bh_directory_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg(lang === 'ar' 
        ? 'تم بدء تحميل نموذج الإكسل الشامل بنجاح! يحتوي الملف على كافة حقول المنشأة (مواعيد العمل، صفحات الإعلانات، وحالة التميز) متطابقة بنسبة 100%.' 
        : 'Comprehensive Excel template download initiated successfully! It contains all business fields (work hours, ad page status, custom media urls, and priority flags) matching 100%.');
    } catch (err: any) {
      setErrorMsg(lang === 'ar' ? 'فشل إنشاء ملف النموذج.' : 'Failed to generate template file.');
    }
  };

  // 4. Excel (XLSX) Bulk Import & Update
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        if (parsedRows.length <= 1) {
          setErrorMsg(lang === 'ar' ? 'الملف فارغ أو غير صالح' : 'File is empty or invalid');
          return;
        }

        const headers = parsedRows[0].map(h => String(h || '').trim());
        const fieldMapping: Record<string, number> = {};
        headers.forEach((h, idx) => { fieldMapping[h] = idx; });

        const requiredFields = ["nameAr", "nameEn", "category"];
        for (const req of requiredFields) {
          if (fieldMapping[req] === undefined) {
            setErrorMsg(lang === 'ar' ? `الحقل المطلوب ${req} غير موجود في رأس العمود` : `Required column "${req}" is missing`);
            return;
          }
        }

        let updatedCount = 0;
        let createdCount = 0;

        setBusinesses((prev: Business[]) => {
          const updatedList = [...prev];
          for (let i = 1; i < parsedRows.length; i++) {
            const row = parsedRows[i];
            if (!row || row.length < requiredFields.length) continue;

            const getValue = (field: string): string => {
              const idx = fieldMapping[field];
              if (idx === undefined || idx >= row.length) return '';
              return String(row[idx] ?? '').trim();
            };

            const getBoolValue = (field: string, defaultVal: boolean = false): boolean => {
              const val = getValue(field).toLowerCase();
              if (val === 'true' || val === '1' || val === 'yes' || val === 'نعم' || val === 'صح') return true;
              if (val === 'false' || val === '0' || val === 'no' || val === 'لا' || val === 'خطأ') return false;
              return defaultVal;
            };

            const id = getValue("id");
            const businessData: Partial<Business> = {
              nameAr: getValue("nameAr"),
              nameEn: getValue("nameEn"),
              category: getValue("category") || 'restaurants',
              subCategory: getValue("subCategory"),
              areaAr: getValue("areaAr"),
              areaEn: getValue("areaEn"),
              block: getValue("block"),
              phone: getValue("phone"),
              googleMapsUrl: getValue("googleMapsUrl") || 'https://maps.google.com',
              activities: getValue("activities"),
              workHours: getValue("workHours") || (getValue("openTime") && getValue("closeTime") ? `${getValue("openTime")} – ${getValue("closeTime")}` : ''),
              openTime: getValue("openTime"),
              closeTime: getValue("closeTime"),
              whatsapp: getValue("whatsapp"),
              instagram: getValue("instagram"),
              image: getValue("image"),
              isPriority: getBoolValue("isPriority", false),
              isFeatured: getBoolValue("isFeatured", false),
              hasAdPage: getBoolValue("hasAdPage", false),
              adPageContent: getValue("adPageContent"),
              adPageMediaType: (getValue("adPageMediaType") === 'video' ? 'video' : 'image') as 'image' | 'video',
              adPageMediaUrl: getValue("adPageMediaUrl"),
              adStartDate: getValue("adStartDate"),
              adEndDate: getValue("adEndDate")
            };

            const existingIdx = id ? updatedList.findIndex(b => b.id === id) : -1;
            if (existingIdx > -1) {
              updatedList[existingIdx] = {
                ...updatedList[existingIdx],
                ...businessData,
                workHours: businessData.workHours || (businessData.openTime && businessData.closeTime ? `${businessData.openTime} – ${businessData.closeTime}` : updatedList[existingIdx].workHours)
              } as Business;
              updatedCount++;
            } else {
              const newBiz: Business = {
                id: id || Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5),
                nameAr: businessData.nameAr || '',
                nameEn: businessData.nameEn || '',
                category: businessData.category || 'restaurants',
                subCategory: businessData.subCategory || '',
                areaAr: businessData.areaAr || '',
                areaEn: businessData.areaEn || '',
                block: businessData.block || '',
                phone: businessData.phone || '',
                googleMapsUrl: businessData.googleMapsUrl || 'https://maps.google.com',
                activities: businessData.activities || '',
                workHours: businessData.workHours || (businessData.openTime && businessData.closeTime ? `${businessData.openTime} – ${businessData.closeTime}` : ''),
                openTime: businessData.openTime || '',
                closeTime: businessData.closeTime || '',
                whatsapp: businessData.whatsapp || '',
                instagram: businessData.instagram || '',
                image: businessData.image || '',
                isPriority: businessData.isPriority || false,
                isFeatured: businessData.isFeatured || false,
                hasAdPage: businessData.hasAdPage || false,
                adPageContent: businessData.adPageContent || '',
                adPageMediaType: businessData.adPageMediaType || 'image',
                adPageMediaUrl: businessData.adPageMediaUrl || '',
                adStartDate: businessData.adStartDate || '',
                adEndDate: businessData.adEndDate || '',
                views: 0
              };
              updatedList.push(newBiz);
              createdCount++;
            }
          }
          return updatedList;
        });

        setSuccessMsg(lang === 'ar'
          ? `تم الاستيراد بنجاح! إضافة: ${createdCount}، تحديث: ${updatedCount}`
          : `Import completed! Added: ${createdCount}, Updated: ${updatedCount}`);
        setErrorMsg('');
      } catch (err: any) {
        setErrorMsg(lang === 'ar' ? 'فشل معالجة الملف. تأكد من أنه ملف Excel صالح.' : 'Excel processing failed. Ensure valid format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-150 dark:border-slate-700 space-y-6 animate-fadeIn">
      <div className="flex items-center gap-2 border-b dark:border-slate-700 pb-3">
        <Shield className="h-6 w-6 text-red-600 animate-pulse" />
        <h3 className="font-bold text-lg text-gray-800 dark:text-slate-100">
          {lang === 'ar' ? 'إدارة وأمان بيانات النظام' : 'System Data Management & Security'}
        </h3>
      </div>

      {successMsg && <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium">✓ {successMsg}</div>}
      {errorMsg && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">✗ {errorMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="p-4 bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-750 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 mb-1">{lang === 'ar' ? 'النسخ الاحتياطي الكامل (JSON)' : 'Full Backup (JSON)'}</h4>
            <p className="text-xs text-gray-500">{lang === 'ar' ? 'تصدير أو استيراد كامل بيانات النظام بملف واحد يشمل المنشآت والقروبات والاعضاء والإعلانات.' : 'Download or upload the entire system database in a single structured backup file.'}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={exportSystemBackup} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors">
              <Download className="h-4 w-4" /> {lang === 'ar' ? 'تصدير النسخة الاحتياطية' : 'Download Backup'}
            </button>
            <label className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="h-4 w-4" /> {lang === 'ar' ? 'استعادة نسخة احتياطية' : 'Restore Backup'}
              <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
            </label>
          </div>
        </div>

        {/* Excel Import Card */}
        <div className="p-4 bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-750 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 mb-1">{lang === 'ar' ? 'تعديل واستيراد المنشآت جماعياً (Excel XLSX)' : 'Bulk Edit & Import (Excel XLSX)'}</h4>
            <p className="text-xs text-gray-500">{lang === 'ar' ? 'قم بتحميل ملف التمبلت بصيغة xlsx، عبئه ببيانات منشآتك، ثم ارفعه لتعديل المنشآت الموجودة أو إضافة منشآت جديدة دفعة واحدة.' : 'Download XLSX template, fill in details, then import to bulk insert or update existing businesses.'}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={downloadExcelTemplate} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors">
              <Download className="h-4 w-4" /> {lang === 'ar' ? 'تحميل قالب الإكسل (XLSX)' : 'Download Template (XLSX)'}
            </button>
            <label className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="h-4 w-4" /> {lang === 'ar' ? 'استيراد جماعي' : 'Upload Data'}
              <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
            </label>
          </div>
        </div>

        {/* Export All Businesses XLSX Card */}
        <div className="md:col-span-2 p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 mb-0.5">
                {lang === 'ar' ? 'تصدير كل المنشآت – Excel XLSX' : 'Export All Businesses – Excel XLSX'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {lang === 'ar'
                  ? `تصدير جميع المنشآت (${businesses.length} منشأة) مع كافة بياناتها الكاملة إلى ملف Excel جاهز للطباعة والمراجعة.`
                  : `Export all ${businesses.length} businesses with their complete data to a ready-to-use Excel spreadsheet.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              try {
                const rows = businesses.map((b: any) => ({
                  ID: b.id,
                  'الاسم العربي': b.nameAr,
                  'الاسم الإنجليزي': b.nameEn,
                  'القسم': b.category,
                  'الفرع': b.subCategory || '',
                  'المنطقة (عربي)': b.areaAr,
                  'المنطقة (إنجليزي)': b.areaEn,
                  'المجمع': b.block,
                  'الهاتف': b.phone,
                  'واتساب': b.whatsapp || '',
                  'إنستغرام': b.instagram || '',
                  'خرائط جوجل': b.googleMapsUrl || '',
                  'رابط الصورة': b.image || '',
                  'الأنشطة': b.activities || '',
                  'ساعات العمل': b.workHours || '',
                  'وقت الفتح': b.openTime || '',
                  'وقت الإغلاق': b.closeTime || '',
                  'المحافظة': b.governorate || '',
                  'مميز': b.isPriority ? 'نعم' : 'لا',
                  'راعي مميز': b.isFeatured ? 'نعم' : 'لا',
                  'صفحة إعلان': b.hasAdPage ? 'نعم' : 'لا',
                  'محتوى الإعلان': b.adPageContent || '',
                  'التقييمات': b.ratingCount || 0,
                  'متوسط التقييم': b.ratingCount ? ((b.ratingSum || 0) / b.ratingCount).toFixed(1) : '—',
                  'المشاهدات': b.views || 0,
                  'تاريخ الإضافة': b.createdAt || '',
                }));
                const worksheet = XLSX.utils.json_to_sheet(rows);
                // Auto-fit columns
                const cols = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 14) }));
                worksheet['!cols'] = cols;
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, lang === 'ar' ? 'المنشآت' : 'Businesses');
                const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bh_directory_all_businesses_${new Date().toISOString().slice(0, 10)}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setSuccessMsg(lang === 'ar'
                  ? `✓ تم تصدير ${businesses.length} منشأة بنجاح إلى ملف Excel!`
                  : `✓ Successfully exported ${businesses.length} businesses to Excel!`);
              } catch (err: any) {
                setErrorMsg(lang === 'ar' ? 'فشل تصدير الملف. حاول مجدداً.' : 'Export failed. Please try again.');
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            {lang === 'ar' ? `تصدير XLSX (${businesses.length})` : `Export XLSX (${businesses.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ICON DETECTOR HELPER ───────────────────────────────────────────────────

const detectIconFromText = (ar: string, en: string): string => {
  const text = (ar + ' ' + en).toLowerCase();
  
  // Restaurant / Cafe
  if (/مطعم|مطاعم|كافيه|كافيهات|مقهى|مقاهي|أكل|طعام|غذاء|قهوة|حلويات|برجر|شوكولا|عصير|فطور|غداء|عشاء|خبز|مخبز|سندويش|باريستا|كرك|بيتزا|كبسة|فود|وجبات|شاورما|healthy|restaurant|cafe|coffee|food|burger|pizza|sweet|chocolate|juice|bakery|barista|eat|dine|kitchen|bites|cook/i.test(text)) {
    return 'Utensils';
  }
  
  // Shopping / Supermarket
  if (/تموينات|سوبرماركت|بقالة|دكان|ماركت|سوق|أسواق|جمعية|خضار|فواكه|لحوم|أسماك|أغذية|بهارات|مكسرات|بقاله|بحرين|grocery|supermarket|market|vegetable|fruit|meat|fish|spice|foodstuff|coop/i.test(text)) {
    return 'ShoppingCart';
  }

  // Health / Medical
  if (/طبي|عيادة|عيادات|مستشفى|مستشفيات|صيدلية|صيدليات|صحة|دكتور|أسنان|علاج|مختبر|نظارات|بصريات|بيطري|طبيب|medical|clinic|hospital|pharmacy|health|dentist|doctor|therapy|lab|optician|vet/i.test(text)) {
    return 'HeartPulse';
  }

  // Automotive
  if (/سيارات|سيارة|ورشة|ورش|كراج|كراجات|غسيل|إطارات|تواير|سفايف|زيوت|قطع غيار|زينة سيارات|تأجير|تأمين|car|auto|garage|wash|tyre|tire|oil|parts|rent|accessory|vehicle/i.test(text)) {
    return 'Car';
  }

  // Real estate / Home Services / Contractor
  if (/عقار|عقارات|مقاولات|منزل|بيت|شقة|شقق|ديكور|تنظيف|مغسلة|بناء|أثاث|صيانة|حدائق|مظلات|ألمنيوم|أبواب|شيشة|ألعاب|مطابخ|أدوات|سيراميك|كهرباء|صحي|سيراميك|ورق جدران|مغاسل|home|real estate|house|apartment|clean|decor|construction|furniture|maintenance|garden|kitchen|tool|electric|plumbing|paint/i.test(text)) {
    return 'Home';
  }

  // Clothing / Apparel / Suit / Shirt
  if (/ملابس|أقمشة|بدلات|ثوب|أثواب|خياط|خياطة|تطريز|أحذية|حقائب|شنط|clothing|suit|tailor|tailoring|boutique|garment|shoes|bag|shirt/i.test(text)) {
    return 'Shirt';
  }

  // Shopping / Bags / Perfumes / Cosmetics
  if (/أزياء|عبايات|دراعات|جلابيات|فساتين|ساعات|مكياج|عطور|مجوهرات|ذهب|فضة|صالون|تجميل|كوافير|تجميلية|بوتيك|عروس|مركز تجميل|fashion|wear|shoes|watches|perfume|jewelry|makeup|salon|beauty|spa|hair|dress/i.test(text)) {
    return 'ShoppingBag';
  }

  // School / Education / Training
  if (/مدرسة|مدارس|تعليم|معهد|معاهد|جامعة|جامعات|تدريب|أطفال|روضة|حضانة|ألعاب|قرطاسية|مكتبة|مكتبات|كتب|دروس|school|education|academy|university|training|kids|kindergarten|nursery|stationery|library|book/i.test(text)) {
    return 'Award';
  }

  // Flowers / Gifts / Events
  if (/زهور|ورد|ورود|هدايا|حلويات|تنسيق|حفلات|أعراس|أفراح|مناسبات|هدية|باقة|florist|flower|gift|event|wedding|party/i.test(text)) {
    return 'Heart';
  }

  // Legal / Services / Travel
  if (/محام|قانون|محاماة|قانوني|مكتب|استشارات|تخليص|ترجمة|سفر|سياحة|طيران|فندق|فنادق|شقق فندقية|شحن|نقل|توصيل|بريد|شيلد|حماية|أمن|law|legal|consulting|translation|travel|tourism|hotel|shipping|delivery|cargo|courier|security/i.test(text)) {
    return 'FileText';
  }

  return 'Tag';
};

// ─── CATEGORIES PANEL ────────────────────────────────────────────────────────

function CategoriesPanel({ categories, setCategories, lang, t }: any) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form Fields
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [newSubCategory, setNewSubCategory] = useState('');
  const [isManualIcon, setIsManualIcon] = useState(false);

  // Auto detect icon as user types if they haven't manually chosen one
  useEffect(() => {
    if (!isManualIcon && (titleAr.trim() || titleEn.trim())) {
      const detected = detectIconFromText(titleAr, titleEn);
      setIcon(detected);
    }
  }, [titleAr, titleEn, isManualIcon]);

  const resetForm = () => {
    setEditingCategory(null);
    setTitleAr('');
    setTitleEn('');
    setIcon('Tag');
    setSubCategories([]);
    setNewSubCategory('');
    setShowForm(false);
    setIsManualIcon(false);
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setTitleAr(cat.titleAr);
    setTitleEn(cat.titleEn);
    setIcon(cat.icon || 'Tag');
    setSubCategories([...(cat.subCategories || [])]);
    setNewSubCategory('');
    setShowForm(true);
    setIsManualIcon(true); // Preserve the original icon when editing
  };

  const handleDelete = (catId: string) => {
    const msg = lang === 'ar' 
      ? 'هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع الفروع التابعة له.' 
      : 'Are you sure you want to delete this category? All its sub-categories will be removed.';
    if (window.confirm(msg)) {
      setCategories((prev: Category[]) => prev.filter(c => c.id !== catId));
    }
  };

  const handleSaveCategory = () => {
    if (!titleAr.trim() || !titleEn.trim()) {
      alert(lang === 'ar' ? 'يرجى ملء اسم القسم بالعربي والإنجليزي' : 'Please fill both Arabic and English category names');
      return;
    }

    const catId = editingCategory ? editingCategory.id : titleEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || Date.now().toString();

    const newCat: Category = {
      id: catId,
      titleAr: titleAr.trim(),
      titleEn: titleEn.trim(),
      icon,
      subCategories: subCategories.map(s => s.trim()).filter(Boolean)
    };

    setCategories((prev: Category[]) => {
      if (editingCategory) {
        return prev.map(c => c.id === editingCategory.id ? newCat : c);
      } else {
        return [...prev, newCat];
      }
    });

    resetForm();
  };

  const handleAddSubCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSub = newSubCategory.trim();
    if (!cleanSub) return;
    if (subCategories.includes(cleanSub)) {
      alert(lang === 'ar' ? 'هذا الفرع موجود بالفعل' : 'This sub-category already exists');
      return;
    }
    setSubCategories([...subCategories, cleanSub]);
    setNewSubCategory('');
  };

  const handleRemoveSubCategory = (sub: string) => {
    setSubCategories(subCategories.filter(s => s !== sub));
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 dark:text-slate-100">
          {lang === 'ar' ? 'إدارة الأقسام والفروع' : 'Manage Categories & Sub-categories'}
        </h3>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors animate-fadeIn">
            <Plus className="h-4 w-4" /> {t.addCategory || (lang === 'ar' ? 'إضافة قسم جديد' : 'Add New Category')}
          </button>
        )}
      </div>

      {/* Add / Edit Category Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 space-y-4 animate-fadeIn">
          <h4 className="font-bold text-gray-800 dark:text-slate-200">
            {editingCategory 
              ? (lang === 'ar' ? `تعديل القسم: ${editingCategory.titleAr}` : `Edit Category: ${editingCategory.titleEn}`) 
              : (lang === 'ar' ? 'إضافة قسم جديد' : 'Add New Category')}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'اسم القسم (عربي)' : 'Category Name (Arabic)'}
              </label>
              <input type="text" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={titleAr} onChange={e => setTitleAr(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'اسم القسم (إنجليزي)' : 'Category Name (English)'}
              </label>
              <input type="text" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={titleEn} onChange={e => setTitleEn(e.target.value)} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-gray-500 dark:text-slate-400">
                  {lang === 'ar' ? 'الأيقونة' : 'Icon'}
                </label>
                {!isManualIcon && (titleAr.trim() || titleEn.trim()) && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                    {lang === 'ar' ? '✨ تحديد تلقائي' : '✨ Auto-detected'}
                  </span>
                )}
                {isManualIcon && (
                  <button 
                    type="button"
                    onClick={() => setIsManualIcon(false)} 
                    className="text-[10px] text-red-500 hover:text-red-700 underline font-medium cursor-pointer"
                  >
                    {lang === 'ar' ? 'تفعيل التحديد التلقائي 🔄' : 'Enable auto-detection 🔄'}
                  </button>
                )}
              </div>
              <select className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                value={icon} onChange={e => {
                  setIcon(e.target.value);
                  setIsManualIcon(true);
                }}>
                <option value="Utensils">{lang === 'ar' ? '🍔 مطاعم ومقاهي (Utensils)' : '🍔 Restaurants & Cafes'}</option>
                <option value="ShoppingCart">{lang === 'ar' ? '🛒 تموينات وسوبرماركت (ShoppingCart)' : '🛒 Grocery & Supermarkets'}</option>
                <option value="HeartPulse">{lang === 'ar' ? '🏥 صحة وطب وعيادات (HeartPulse)' : '🏥 Health, Medical & Clinics'}</option>
                <option value="Car">{lang === 'ar' ? '🚗 خدمات ومعارض سيارات (Car)' : '🚗 Car & Automotive Services'}</option>
                <option value="ShoppingBag">{lang === 'ar' ? '🛍️ أزياء وتجميل ومجوهرات (ShoppingBag)' : '🛍️ Fashion, Cosmetics & Luxury'}</option>
                <option value="Shirt">{lang === 'ar' ? '👕 ملابس وأقمشة وخياطة (Shirt)' : '👕 Clothing, Suit & Tailoring'}</option>
                <option value="Home">{lang === 'ar' ? '🏠 عقارات وخدمات منزلية (Home)' : '🏠 Real Estate & Home Services'}</option>
                <option value="Award">{lang === 'ar' ? '🎓 مدارس وتعليم وتدريب (Award)' : '🎓 Schools, Academies & Kids'}</option>
                <option value="Heart">{lang === 'ar' ? '💝 هدايا وزهور وأفراح (Heart)' : '💝 Flowers, Gifts & Weddings'}</option>
                <option value="FileText">{lang === 'ar' ? '💼 مكاتب وخدمات قانونية وسفر (FileText)' : '💼 Offices, Law & Travel'}</option>
                <option value="Tag">{lang === 'ar' ? '🏷️ بطاقة / أخرى (Tag)' : '🏷️ Other / Tag'}</option>
              </select>
            </div>
          </div>

          {/* Subcategories (Fروع القسم) Manager */}
          <div className="border-t dark:border-slate-700 pt-3 space-y-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300">
              {lang === 'ar' ? 'الفروع والتفرعات التابعة' : 'Sub-categories'}
            </label>
            
            {/* Display list of current subcategories */}
            <div className="flex flex-wrap gap-2 py-1">
              {subCategories.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {lang === 'ar' ? 'لا توجد فروع مضافة بعد. أضف فرعاً بالأسفل.' : 'No sub-categories added yet. Add one below.'}
                </p>
              ) : (
                subCategories.map(sub => (
                  <span key={sub} className="inline-flex items-center gap-1 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full font-medium border border-red-100/30">
                    {sub}
                    <button type="button" onClick={() => handleRemoveSubCategory(sub)} className="hover:text-red-800 dark:hover:text-red-200 font-bold ml-1 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input to add subcategory */}
            <div className="flex gap-2 max-w-md">
              <input type="text" className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400"
                placeholder={lang === 'ar' ? 'اسم الفرع الجديد...' : 'New sub-category name...'}
                value={newSubCategory} onChange={e => setNewSubCategory(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubCategory(); } }} />
              <button type="button" onClick={() => handleAddSubCategory()} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-750 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-gray-250 dark:hover:bg-slate-700 transition-colors">
                {lang === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 justify-end border-t dark:border-slate-700">
            <button onClick={handleSaveCategory} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
              {t.save}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Categories Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((cat: Category) => (
          <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-150 dark:border-slate-700 hover:shadow-sm transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                    {getCategoryIcon(cat.icon, "h-4.5 w-4.5")}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-slate-200">{cat.titleAr}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 font-medium font-mono">{cat.titleEn}</p>
                  </div>
                </div>
                
                {/* Edit & Delete Action Buttons */}
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(cat)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-500 transition-colors" title={t.edit}>
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-colors" title={t.delete}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sub-categories labels */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(cat.subCategories || []).map((s: string) => (
                  <span key={s} className="text-[11px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Footnote count of sub-categories */}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-750/50 flex justify-between items-center text-[11px] text-gray-400 dark:text-slate-500 font-medium">
              <span>ID: {cat.id}</span>
              <span>
                {lang === 'ar' ? `عدد الفروع: ${(cat.subCategories || []).length}` : `Branches: ${(cat.subCategories || []).length}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SITE SETTINGS & CONTACT COMPONENTS ──────────────────────────────────────

function SiteSettingsPanel({ siteConfig, setSiteConfig, lang, t }: any) {
  const [form, setForm] = useState({
    titleAr: siteConfig?.titleAr || '',
    titleEn: siteConfig?.titleEn || '',
    logoUrl: siteConfig?.logoUrl || '',
    aboutUsAr: siteConfig?.aboutUsAr || '',
    aboutUsEn: siteConfig?.aboutUsEn || '',
    contactPhone: siteConfig?.contactPhone || '',
    contactWhatsapp: siteConfig?.contactWhatsapp || '',
    contactEmail: siteConfig?.contactEmail || '',
    contactInstagram: siteConfig?.contactInstagram || '',
    maxAdsTop: siteConfig?.maxAdsTop ?? 1,
    maxAdsMiddle: siteConfig?.maxAdsMiddle ?? 1,
    maxAdsBottom: siteConfig?.maxAdsBottom ?? 1,
    maxAdImageSizeMB: siteConfig?.maxAdImageSizeMB ?? 10,
    maxAdVideoSizeMB: siteConfig?.maxAdVideoSizeMB ?? 50,
    showVisitorCount: siteConfig?.showVisitorCount ?? true,
  });

  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSiteConfig((prev: any) => ({
      ...prev,
      ...form,
    }));
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-6 animate-fadeIn text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 dark:border-slate-700 pb-4 gap-4">
        <div>
          <h3 className="font-bold text-lg text-gray-800 dark:text-slate-100">
            {lang === 'ar' ? 'إعدادات المنصة والتواصل' : 'Platform & Contact Settings'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {lang === 'ar' ? 'تعديل اسم المنصة، الشعار، النبذة التعريفية، ومعلومات التواصل.' : 'Manage site title, logo, about us brief, and public contact information.'}
          </p>
        </div>
        <button
          type="submit"
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm self-stretch sm:self-auto"
        >
          {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
        </button>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100/30 animate-fadeIn text-center">
          {lang === 'ar' ? '✓ تم حفظ الإعدادات بنجاح!' : '✓ Settings saved successfully!'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Site Info */}
        <div className="space-y-4">
          <h4 className="font-bold text-sm text-red-600 border-b border-gray-100 dark:border-slate-700 pb-1.5 flex items-center gap-1.5 justify-start">
            <Settings className="h-4 w-4 shrink-0" />
            <span>{lang === 'ar' ? 'معلومات المنصة الأساسية' : 'Basic Site Info'}</span>
          </h4>
          
          <div className="space-y-3 text-right">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'اسم الموقع (بالعربية)' : 'Site Title (Arabic)'}
              </label>
              <input
                type="text"
                value={form.titleAr}
                onChange={e => setForm({ ...form, titleAr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 text-right"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'اسم الموقع (بالإنجليزية)' : 'Site Title (English)'}
              </label>
              <input
                type="text"
                value={form.titleEn}
                onChange={e => setForm({ ...form, titleEn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 ltr text-left"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'شعار الموقع (اختياري - رفع أو رابط)' : 'Site Logo (Optional - Upload or URL)'}
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/webp,image/avif,image/jpeg,image/png,image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const webpData = await convertFileToWebP(file);
                        setForm({ ...form, logoUrl: webpData });
                      } catch {
                        const reader = new FileReader();
                        reader.onload = () => setForm({ ...form, logoUrl: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 dark:file:bg-red-950/20 file:text-red-700 dark:file:text-red-400 hover:file:bg-red-100 file:cursor-pointer"
                />
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 ltr text-left"
                  placeholder="https://example.com/logo.webp"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact info block */}
        <div className="space-y-4">
          <h4 className="font-bold text-sm text-red-600 border-b border-gray-100 dark:border-slate-700 pb-1.5 flex items-center gap-1.5 justify-start">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{lang === 'ar' ? 'أرقام وحسابات التواصل العامة' : 'Public Contact Info'}</span>
          </h4>
          
          <div className="space-y-3 text-right">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'رقم الهاتف للتواصل' : 'Contact Phone Number'}
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 ltr text-left"
                placeholder="e.g. +973 17000000"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'رقم الواتساب للتواصل مباشر' : 'Contact WhatsApp Number'}
              </label>
              <input
                type="text"
                value={form.contactWhatsapp}
                onChange={e => setForm({ ...form, contactWhatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 ltr text-left"
                placeholder="e.g. 97333000000"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Contact Email'}
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 ltr text-left"
                placeholder="info@directory.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'حساب الإنستغرام (دون علامة @)' : 'Instagram Handle (Without @)'}
              </label>
              <input
                type="text"
                value={form.contactInstagram}
                onChange={e => setForm({ ...form, contactInstagram: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 ltr text-left"
                placeholder="username"
              />
            </div>
          </div>
        </div>
      </div>

      {/* About Us / Brief sections */}
      <div className="space-y-4 pt-2">
        <h4 className="font-bold text-sm text-red-600 border-b border-gray-100 dark:border-slate-700 pb-1.5 flex items-center gap-1.5 justify-start">
          <FileText className="h-4 w-4 shrink-0" />
          <span>{lang === 'ar' ? 'نبذة تعريفية عن المنصة' : 'About the Platform'}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
              {lang === 'ar' ? 'النبذة التعريفية بالعربية' : 'Arabic Brief'}
            </label>
            <textarea
              value={form.aboutUsAr}
              onChange={e => setForm({ ...form, aboutUsAr: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 leading-relaxed text-right"
              placeholder="اكتب هنا نبذة مختصرة عن دليل المنشآت والخدمات..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">
              {lang === 'ar' ? 'النبذة التعريفية بالإنجليزية' : 'English Brief'}
            </label>
            <textarea
              value={form.aboutUsEn}
              onChange={e => setForm({ ...form, aboutUsEn: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 leading-relaxed ltr text-left"
              placeholder="Write a short summary of the business directory..."
            />
          </div>
        </div>
      </div>

      {/* Visibility & Public Counters Block */}
      <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-700">
        <h4 className="font-bold text-sm text-red-600 pb-1 flex items-center gap-1.5 justify-start">
          <Eye className="h-4 w-4 shrink-0" />
          <span>{lang === 'ar' ? 'إعدادات الظهور والعدادات العامة' : 'Visibility & Public Counters'}</span>
        </h4>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-700/80 gap-4">
          <div className="text-right">
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200 block mb-0.5">
              {lang === 'ar' ? 'إظهار عدد الزوار للجمهور في الرئيسية' : 'Display Visitor Counter to Public'}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-slate-400 block leading-relaxed">
              {lang === 'ar'
                ? 'عند تفعيل الخيار، يظهر عدد الزوار الكلي في الصفحة الرئيسية للدليل. عند إيقافه، يتم إخفاؤه عن الزوار مع بقائه لمدير الموقع.'
                : 'When enabled, the total visitor count is displayed on the homepage. When disabled, it is hidden from public visitors.'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={form.showVisitorCount}
              onChange={e => setForm({ ...form, showVisitorCount: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>

        {/* Ad Media Upload Limits */}
        <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-slate-700">
          <h4 className="font-bold text-sm text-red-600 pb-1 flex items-center gap-1.5 justify-start">
            <Upload className="h-4 w-4 shrink-0" />
            <span>{lang === 'ar' ? 'حدود أقصى حجم لوسائط الإعلانات (ميجابايت)' : 'Ad Media Upload Size Limits (MB)'}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-200">
                {lang === 'ar' ? 'الحد الأقصى لحجم صورة الإعلان (MB)' : 'Max Ad Image Size (MB)'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={form.maxAdImageSizeMB}
                onChange={e => setForm({ ...form, maxAdImageSizeMB: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 font-bold"
              />
              <p className="text-[10px] text-gray-400">
                {lang === 'ar' ? 'يحدد أقصى حجم مسموح به لصور الإعلانات (مثال: 10 ميجابايت)' : 'Specifies the maximum size allowed for ad images (e.g. 10 MB)'}
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-200">
                {lang === 'ar' ? 'الحد الأقصى لحجم فيديو الإعلان (MB)' : 'Max Ad Video Size (MB)'}
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={form.maxAdVideoSizeMB}
                onChange={e => setForm({ ...form, maxAdVideoSizeMB: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-400 font-bold"
              />
              <p className="text-[10px] text-gray-400">
                {lang === 'ar' ? 'يحدد أقصى حجم مسموح به لفيديوهات الإعلانات (مثال: 50 ميجابايت)' : 'Specifies the maximum size allowed for ad videos (e.g. 50 MB)'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function ContactView({ siteConfig, lang }: any) {
  const brief = lang === 'ar' ? siteConfig.aboutUsAr : siteConfig.aboutUsEn;
  const siteTitle = lang === 'ar' ? siteConfig.titleAr : siteConfig.titleEn;
  
  const defaultBriefAr = 'مرحباً بكم في دليل البحرين الرقمي الشامل. نسعى من خلال هذا الموقع إلى توفير منصة متكاملة وسهلة الاستخدام للبحث عن كافة الأنشطة التجارية والمنشآت بمختلف تصنيفاتها في مملكة البحرين، مما يسهل على الزوار الوصول المباشر لأرقام الهواتف، ومواقع الخرائط الجغرافية، وحسابات التواصل الاجتماعي.';
  const defaultBriefEn = 'Welcome to the Bahrain Comprehensive Business Directory. We aim to provide an integrated and easy-to-use platform for searching all commercial activities and businesses across different categories in the Kingdom of Bahrain. We connect users with phone numbers, Google Maps routes, and social accounts in one place.';

  const displayBrief = brief && brief.trim().length > 0 ? brief : (lang === 'ar' ? defaultBriefAr : defaultBriefEn);

  const phone = siteConfig.contactPhone || '+973 17000000';
  const whatsapp = siteConfig.contactWhatsapp || '97333000000';
  const email = siteConfig.contactEmail || 'info@bahraindirectory.com';
  const instagram = siteConfig.contactInstagram || 'bahrain_directory';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-rose-700 text-white p-8 md:p-12 shadow-lg">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-xl -ml-12 -mb-12" />
        
        <div className="relative z-10 space-y-4 max-w-2xl">
          <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
            {lang === 'ar' ? 'تواصل معنا' : 'Get in Touch'}
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            {lang === 'ar' ? `أهلاً بك في دليل ${siteTitle}` : `Welcome to ${siteTitle}`}
          </h2>
          <p className="text-sm md:text-base text-red-100 leading-relaxed font-medium">
            {lang === 'ar' ? 'نحن هنا لمساعدتكم! لا تترددوا في الاستفسار أو مشاركتنا ملاحظاتكم واقتراحاتكم لتطوير الدليل.' : 'We are here to help! Feel free to ask questions, share feedback, or suggest listings to grow our local community.'}
          </p>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* About Card (col-span-2) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-gray-800 dark:text-slate-100 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-3 justify-start">
            <FileText className="h-5 w-5 text-red-600 shrink-0" />
            <span>{lang === 'ar' ? 'نبذة عن الدليل' : 'About the Directory'}</span>
          </h3>
          <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {displayBrief}
          </p>
        </div>

        {/* Contact Channels Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-gray-800 dark:text-slate-100 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-3 justify-start">
            <Phone className="h-5 w-5 text-red-600 shrink-0" />
            <span>{lang === 'ar' ? 'قنوات الاتصال' : 'Contact Channels'}</span>
          </h3>
          
          <div className="space-y-3 pt-1">
            {/* Call */}
            <a 
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Phone className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold block">{lang === 'ar' ? 'الاتصال الهاتفي' : 'Phone Call'}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate block font-mono">{phone}</span>
              </div>
            </a>

            {/* WhatsApp */}
            <a 
              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <MessageCircle className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold block">{lang === 'ar' ? 'محادثة واتساب' : 'WhatsApp Chat'}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate block font-mono">+{whatsapp}</span>
              </div>
            </a>

            {/* Email */}
            <a 
              href={`mailto:${email}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold block">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate block font-mono text-left ltr">{email}</span>
              </div>
            </a>

            {/* Instagram */}
            <a 
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 hover:border-pink-200 dark:hover:border-pink-900/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Instagram className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold block">{lang === 'ar' ? 'حساب الإنستغرام' : 'Instagram Page'}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate block font-mono">@{instagram}</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const AppContent: React.FC = () => {
  const { lang, t, setLang } = useLanguage();
  const { currentUser, setCurrentUser, members, setMembers, isAdmin } = useAuth();

  // Keep app version tracked without resetting or deleting any user data
  useEffect(() => {
    localStorage.setItem('bh_app_version', APP_VERSION);
  }, []);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);
  const loadedFromFirestore = useRef(false);
  const lastSyncedHash = useRef<Record<string, string>>({});
  const saveTimeoutRef = useRef<Record<string, any>>({});

  const [view, setView] = useState<'home' | 'results' | 'admin' | 'business-details' | 'favorites' | 'bazaar' | 'contact' | 'landmarks'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterPrice, setFilterPrice] = useState<'$' | '$$' | '$$$' | ''>('');
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [landmarks, setLandmarks] = useState<Landmark[]>(() => {
    try {
      const s = localStorage.getItem('bh_landmarks');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_LANDMARKS;
    } catch {
      return INITIAL_LANDMARKS;
    }
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('bh_favorites') || '[]'); } catch { return []; }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const s = localStorage.getItem('bh_categories');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    try {
      const s = localStorage.getItem('bh_businesses');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(b => !isDemoBusiness(b));
          return cleaned;
        }
      }
      return INITIAL_BUSINESSES;
    } catch {
      return INITIAL_BUSINESSES;
    }
  });
  const [ads, setAds] = useState<Ad[]>(() => {
    try {
      const s = localStorage.getItem('bh_ads');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(a => !isDemoAd(a));
          return cleaned;
        }
      }
      return INITIAL_ADS;
    } catch {
      return INITIAL_ADS;
    }
  });
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => {
    const defaultConfig: SiteConfig = {
      titleAr: 'دليل البحرين',
      titleEn: 'Bahrain Directory',
      logoUrl: '',
      aboutUsAr: '',
      aboutUsEn: '',
      maxAdsTop: 1,
      maxAdsMiddle: 1,
      maxAdsBottom: 1,
      maxAdImageSizeMB: 10,
      maxAdVideoSizeMB: 50,
      showVisitorCount: true,
    };
    try {
      const s = localStorage.getItem('bh_site_config');
      return s ? { ...defaultConfig, ...JSON.parse(s) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });
  const [bazaarOffers, setBazaarOffers] = useState<BazaarOffer[]>(() => {
    try {
      const s = localStorage.getItem('bh_bazaar_offers');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(bo => !isDemoBazaar(bo));
          return cleaned;
        }
      }
      return INITIAL_BAZAAR_OFFERS;
    } catch {
      return INITIAL_BAZAAR_OFFERS;
    }
  });
  const [salesProducts, setSalesProducts] = useState<any[]>(() => {
    try {
      const s = localStorage.getItem('bh_sales_products');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_SALES_PRODUCTS;
    } catch {
      return INITIAL_SALES_PRODUCTS;
    }
  });
  const [salesInvoices, setSalesInvoices] = useState<any[]>(() => {
    try {
      const s = localStorage.getItem('bh_sales_invoices');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_SALES_INVOICES;
    } catch {
      return INITIAL_SALES_INVOICES;
    }
  });
  const [deletedBusinesses, setDeletedBusinesses] = useState<DeletedBusiness[]>(() => {
    try {
      const s = localStorage.getItem('bh_deleted_businesses');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  // Auto-purge deleted businesses older than 24 hours
  useEffect(() => {
    const purgeExpired = () => {
      setDeletedBusinesses(prev => {
        const valid = prev.filter(item => isWithin24Hours(item.deletedAt));
        if (valid.length !== prev.length) {
          return valid;
        }
        return prev;
      });
    };
    purgeExpired();
    const interval = setInterval(purgeExpired, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('bh_sheet_url') || '');
  const isAdminLoggedIn = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number>(() => {
    try {
      const c = localStorage.getItem('visitorCount');
      return c ? parseInt(c) : 1;
    } catch {
      return 1;
    }
  });

  // ── Real-time Firebase Sync (onSnapshot) ───────────────────────────────────
  useEffect(() => {
    if (!isFirebaseEnabled()) {
      setIsDataLoaded(true);
      return;
    }

    setIsFirebaseLoading(true);
    const unsubscribers: (() => void)[] = [];
    let loadedCount = 0;
    const TOTAL_COLLECTIONS = 10;

    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= TOTAL_COLLECTIONS) {
        setIsFirebaseLoading(false);
        setIsDataLoaded(true);
        setTimeout(() => { loadedFromFirestore.current = true; }, 800);
      }
    };

    // Seed helper: seed a collection ONLY if empty on the server AND using current local state/storage first
    const seedIfEmpty = async (collName: string, initialFallback: any[], localKey: string) => {
      try {
        const existing = await fetchCollection<any>(collName, []);
        if (existing.length === 0) {
          let dataToSeed = initialFallback;
          try {
            const ls = localStorage.getItem(localKey);
            if (ls) {
              const parsed = JSON.parse(ls);
              if (Array.isArray(parsed) && parsed.length > 0) {
                dataToSeed = parsed;
              }
            }
          } catch {}
          await saveCollection(collName, dataToSeed);
        }
      } catch (e) {
        console.warn(`⚠️ Seed error for ${collName}:`, e);
      }
    };

    // 1. Categories – real-time
    seedIfEmpty('categories', INITIAL_CATEGORIES, 'bh_categories').then(() => {
      const unsub = subscribeToCollection<Category>('categories', (data) => {
        if (data.length > 0) {
          const json = JSON.stringify(data);
          lastSyncedHash.current['categories'] = json;
          setCategories(data);
          safeLocalStorageSet('bh_categories', json);
        }
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // 2. Businesses – real-time
    seedIfEmpty('businesses', INITIAL_BUSINESSES, 'bh_businesses').then(() => {
      const unsub = subscribeToCollection<Business>('businesses', (data) => {
        const cleaned = data.filter(b => !isDemoBusiness(b));
        const json = JSON.stringify(cleaned);
        lastSyncedHash.current['businesses'] = json;
        setBusinesses(cleaned);
        safeLocalStorageSet('bh_businesses', json);
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // 3. Ads – real-time
    seedIfEmpty('ads', INITIAL_ADS, 'bh_ads').then(() => {
      const unsub = subscribeToCollection<Ad>('ads', (data) => {
        const cleaned = data.filter(a => !isDemoAd(a));
        const json = JSON.stringify(cleaned);
        lastSyncedHash.current['ads'] = json;
        setAds(cleaned);
        safeLocalStorageSet('bh_ads', json);
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // 4. Site config – real-time
    (async () => {
      try {
        const fbConfigs = await fetchCollection<any>('siteConfig', []);
        if (!fbConfigs.find((c: any) => c.id === 'config')) {
          await saveDocument('siteConfig', 'config', siteConfig);
        }
      } catch (e) { console.warn('⚠️ siteConfig seed error:', e); }
      const unsub = subscribeToCollection<any>('siteConfig', (data) => {
        const fbConfig = data.find(c => c.id === 'config');
        if (fbConfig) {
          setSiteConfig(prev => {
            const merged = { ...prev, ...fbConfig };
            const json = JSON.stringify(merged);
            lastSyncedHash.current['siteConfig'] = json;
            safeLocalStorageSet('bh_site_config', json);
            return merged;
          });
        }
        const fbSheet = data.find(c => c.id === 'sheetUrl') as any;
        if (fbSheet?.url) {
          lastSyncedHash.current['sheetUrl'] = fbSheet.url;
          setSheetUrl(fbSheet.url);
          safeLocalStorageSet('bh_sheet_url', fbSheet.url);
        }
        markLoaded();
      });
      unsubscribers.push(unsub);
    })();

    // 5. Bazaar offers – real-time
    seedIfEmpty('bazaarOffers', INITIAL_BAZAAR_OFFERS, 'bh_bazaar_offers').then(() => {
      const unsub = subscribeToCollection<BazaarOffer>('bazaarOffers', (data) => {
        const cleaned = data.filter(bo => !isDemoBazaar(bo));
        const json = JSON.stringify(cleaned);
        lastSyncedHash.current['bazaarOffers'] = json;
        setBazaarOffers(cleaned);
        safeLocalStorageSet('bh_bazaar_offers', json);
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // 6. Sales products – real-time
    seedIfEmpty('salesProducts', INITIAL_SALES_PRODUCTS, 'bh_sales_products').then(() => {
      const unsub = subscribeToCollection<any>('salesProducts', (data) => {
        if (data.length > 0) {
          const json = JSON.stringify(data);
          lastSyncedHash.current['salesProducts'] = json;
          setSalesProducts(data);
          safeLocalStorageSet('bh_sales_products', json);
        }
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // 7. Sales invoices – real-time
    seedIfEmpty('salesInvoices', INITIAL_SALES_INVOICES, 'bh_sales_invoices').then(() => {
      const unsub = subscribeToCollection<any>('salesInvoices', (data) => {
        if (data.length > 0) {
          const json = JSON.stringify(data);
          lastSyncedHash.current['salesInvoices'] = json;
          setSalesInvoices(data);
          safeLocalStorageSet('bh_sales_invoices', json);
        }
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // 8. Members – real-time
    seedIfEmpty('members', members, 'bh_members').then(() => {
      const unsub = subscribeToCollection<any>('members', (data) => {
        if (data.length > 0) {
          const json = JSON.stringify(data);
          lastSyncedHash.current['members'] = json;
          setMembers(data);
          safeLocalStorageSet('bh_members', json);
        }
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // 9. Deleted businesses – real-time
    seedIfEmpty('deletedBusinesses', deletedBusinesses, 'bh_deleted_businesses').then(() => {
      const unsub = subscribeToCollection<DeletedBusiness>('deletedBusinesses', (data) => {
        if (data) {
          const valid = data.filter(item => isWithin24Hours(item.deletedAt));
          const json = JSON.stringify(valid);
          lastSyncedHash.current['deletedBusinesses'] = json;
          setDeletedBusinesses(valid);
          safeLocalStorageSet('bh_deleted_businesses', json);
        }
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // 10. Landmarks (Taalou Honi) – real-time
    seedIfEmpty('landmarks', INITIAL_LANDMARKS, 'bh_landmarks').then(() => {
      const unsub = subscribeToCollection<Landmark>('landmarks', (data) => {
        if (data.length > 0) {
          const json = JSON.stringify(data);
          lastSyncedHash.current['landmarks'] = json;
          setLandmarks(data);
          safeLocalStorageSet('bh_landmarks', json);
        }
        markLoaded();
      });
      unsubscribers.push(unsub);
    });

    // Cleanup all listeners on unmount
    return () => { unsubscribers.forEach(fn => fn()); };
  }, []);

  // ── Local Storage + Firebase Safe Debounced Sync ───────────────────────────
  const debouncedSync = useCallback((collName: string, data: any, isDoc = false, docId = 'config') => {
    if (!isDataLoaded || !isFirebaseEnabled() || !loadedFromFirestore.current) return;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    // If state matches what came from Firestore, DO NOT echo it back!
    if (lastSyncedHash.current[collName] === str) {
      return;
    }
    lastSyncedHash.current[collName] = str;

    if (saveTimeoutRef.current[collName]) {
      clearTimeout(saveTimeoutRef.current[collName]);
    }
    saveTimeoutRef.current[collName] = setTimeout(() => {
      if (isDoc) {
        saveDocument(collName, docId, data);
      } else {
        saveCollection(collName, data);
      }
    }, 600);
  }, [isDataLoaded]);

  useEffect(() => {
    safeLocalStorageSet('bh_categories', JSON.stringify(categories));
    debouncedSync('categories', categories);
  }, [categories, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_businesses', JSON.stringify(businesses));
    debouncedSync('businesses', businesses);
  }, [businesses, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_deleted_businesses', JSON.stringify(deletedBusinesses));
    debouncedSync('deletedBusinesses', deletedBusinesses);
  }, [deletedBusinesses, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_ads', JSON.stringify(ads));
    debouncedSync('ads', ads);
  }, [ads, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_site_config', JSON.stringify(siteConfig));
    debouncedSync('siteConfig', siteConfig, true, 'config');
  }, [siteConfig, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_sheet_url', sheetUrl);
    debouncedSync('sheetUrl', { url: sheetUrl }, true, 'sheetUrl');
  }, [sheetUrl, debouncedSync]);

  useEffect(() => { safeLocalStorageSet('bh_favorites', JSON.stringify(favorites)); }, [favorites]);

  useEffect(() => {
    safeLocalStorageSet('bh_bazaar_offers', JSON.stringify(bazaarOffers));
    debouncedSync('bazaarOffers', bazaarOffers);
  }, [bazaarOffers, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_sales_products', JSON.stringify(salesProducts));
    debouncedSync('salesProducts', salesProducts);
  }, [salesProducts, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_sales_invoices', JSON.stringify(salesInvoices));
    debouncedSync('salesInvoices', salesInvoices);
  }, [salesInvoices, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_landmarks', JSON.stringify(landmarks));
    debouncedSync('landmarks', landmarks);
  }, [landmarks, debouncedSync]);

  useEffect(() => {
    safeLocalStorageSet('bh_members', JSON.stringify(members));
    debouncedSync('members', members);
  }, [members, debouncedSync]);

  useEffect(() => {
    const c = localStorage.getItem('visitorCount');
    const newVal = c ? (parseInt(c) + 1) : 1;
    safeLocalStorageSet('visitorCount', newVal.toString());
    setVisitorCount(newVal);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  // Base pool matching only searchQuery and selectedCategory (before specific dropdown filters are applied)
  const basePoolBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const searchWords = searchQuery.toLowerCase().trim().split(/\s+/);
      const matchQuery = !searchQuery.trim() || searchWords.every(word => {
        const businessContent = `
          ${b.nameAr} ${b.nameEn} ${b.category} ${b.subCategory} 
          ${b.areaAr} ${b.areaEn} ${b.block} ${b.activities || ''} ${b.phone || ''}
        `.toLowerCase();
        return businessContent.includes(word);
      });

      const matchCategory = selectedCategory ? b.category === selectedCategory : true;
      return matchQuery && matchCategory;
    });
  }, [businesses, searchQuery, selectedCategory]);

  const uniqueCategoriesInPool = useMemo(() => {
    const catsInPool = [...new Set(basePoolBusinesses.map(b => b.category).filter(Boolean))];
    return categories.filter(c => catsInPool.includes(c.id));
  }, [basePoolBusinesses, categories]);

  const uniqueSubCategoriesInPool = useMemo(() => {
    const targetCat = selectedCategory || filterCategory;
    const pool = targetCat ? basePoolBusinesses.filter(b => b.category === targetCat) : basePoolBusinesses;
    return [...new Set(pool.map(b => b.subCategory).filter(Boolean))].sort();
  }, [basePoolBusinesses, selectedCategory, filterCategory]);

  const uniqueCuisinesInPool = useMemo(() => {
    const pool = basePoolBusinesses.filter(b => b.category === 'restaurants');
    return [...new Set(pool.map(b => b.cuisine).filter(Boolean))].sort();
  }, [basePoolBusinesses]);

  const uniqueAreasInPool = useMemo(() => {
    return [...new Set(basePoolBusinesses.map(b => lang === 'ar' ? b.areaAr : b.areaEn).filter(Boolean))].sort();
  }, [basePoolBusinesses, lang]);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      // Split search query into multiple words for multi-word matching
      const searchWords = searchQuery.toLowerCase().trim().split(/\s+/);
      const matchQuery = !searchQuery.trim() || searchWords.every(word => {
        const businessContent = `
          ${b.nameAr} ${b.nameEn} ${b.category} ${b.subCategory} 
          ${b.areaAr} ${b.areaEn} ${b.block} ${b.activities || ''} ${b.phone || ''}
        `.toLowerCase();
        return businessContent.includes(word);
      });

      const matchCategory = selectedCategory ? b.category === selectedCategory : (filterCategory ? b.category === filterCategory : true);
      const matchSubCategory = filterSubCategory ? b.subCategory === filterSubCategory : true;
      const matchCuisine = filterCuisine ? (b.cuisine === filterCuisine || b.cuisineAr === filterCuisine) : true;
      const matchArea = filterArea ? (b.areaEn === filterArea || b.areaAr === filterArea) : true;
      const matchPrice = filterPrice ? b.priceRange === filterPrice : true;
      const matchOpenNow = isOpenNow ? checkIsOpen(b) : true;
      return matchQuery && matchCategory && matchSubCategory && matchCuisine && matchArea && matchPrice && matchOpenNow;
    }).sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return 0;
    });
  }, [businesses, searchQuery, selectedCategory, filterCategory, filterSubCategory, filterCuisine, filterArea, filterPrice, isOpenNow]);

  const trendingRestaurants = useMemo(() =>
    businesses.filter(b => b.category === 'restaurants' && (b.views || 0) > 0)
      .sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3),
    [businesses]);

  const handleSheetSync = async (url: string) => {
    if (!url) return false;
    try {
      const response = await fetch(url);
      const text = await response.text();
      const rows = text.split('\n').filter(r => r.trim());
      const dataRows = rows.slice(1);
      const newBusinesses: Business[] = dataRows.map((row, idx) => {
        const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const c = cols.map(x => x.trim().replace(/^"|"$/g, ''));
        if (c.length < 5) return null;
        return { id: c[0] || `sheet-${idx}`, nameAr: c[1] || '', nameEn: c[2] || '', category: c[3] || 'services', subCategory: c[4] || '', areaAr: c[5] || '', areaEn: c[6] || '', block: c[7] || '', phone: (c[8] || '').replace(/\D/g, '').slice(0, 8), instagram: c[9] || '', googleMapsUrl: c[10] || '', image: c[11] || '', isPriority: ['TRUE', 'true', '1'].includes(c[15]) } as Business;
      }).filter(Boolean) as Business[];
      if (newBusinesses.length > 0) { setBusinesses(newBusinesses); return true; }
      return false;
    } catch { return false; }
  };

  const handleRate = (businessId: string, rating: number) => {
    setBusinesses(prev => prev.map(b => {
      if (b.id === businessId) {
        const updated = { ...b, ratingSum: (b.ratingSum || 0) + rating, ratingCount: (b.ratingCount || 0) + 1 };
        if (selectedBusiness?.id === businessId) setSelectedBusiness(updated);
        return updated;
      }
      return b;
    }));
  };

  const handleAddReview = (authorName: string, ratingValue: number, commentText: string) => {
    if (!selectedBusiness) return;
    const newReview: Review = { id: Date.now().toString(), author: authorName, rating: ratingValue, comment: commentText, createdAt: new Date().toLocaleDateString() };
    setBusinesses(prev => prev.map(b => {
      if (b.id === selectedBusiness.id) {
        const updated = { ...b, reviews: [...(b.reviews || []), newReview], ratingSum: (b.ratingSum || 0) + ratingValue, ratingCount: (b.ratingCount || 0) + 1 };
        setSelectedBusiness(updated); return updated;
      }
      return b;
    }));
  };

  const handleDeleteReview = (reviewId: string) => {
    if (!selectedBusiness) return;
    const target = selectedBusiness.reviews?.find(r => r.id === reviewId);
    if (!target) return;
    setBusinesses(prev => prev.map(b => {
      if (b.id === selectedBusiness.id) {
        const updated = { ...b, reviews: (b.reviews || []).filter(r => r.id !== reviewId), ratingSum: Math.max(0, (b.ratingSum || 0) - target.rating), ratingCount: Math.max(0, (b.ratingCount || 0) - 1) };
        setSelectedBusiness(updated); return updated;
      }
      return b;
    }));
  };

  const handleAddReply = (reviewId: string, replyText: string) => {
    if (!selectedBusiness) return;
    setBusinesses(prev => prev.map(b => {
      if (b.id === selectedBusiness.id) {
        const updated = { ...b, reviews: (b.reviews || []).map(r => r.id === reviewId ? { ...r, reply: replyText } : r) };
        setSelectedBusiness(updated); return updated;
      }
      return b;
    }));
  };

  const openBusinessDetails = (b: Business) => {
    setBusinesses(prev => prev.map(item => {
      if (item.id === b.id) {
        const updated = { ...item, views: (item.views || 0) + 1 };
        setSelectedBusiness(updated); return updated;
      }
      return item;
    }));
    setView('business-details');
  };

  if (isFirebaseLoading) {
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-red-100 dark:border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-t-red-600 animate-spin" />
          </div>
          <div className="space-y-1.5 mt-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
              {lang === 'ar' ? 'جاري الاتصال بقاعدة البيانات...' : 'Connecting to database...'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              {lang === 'ar' 
                ? 'نعمل على جلب أحدث الأقسام والمحلات لضمان دقة البيانات المعروضة.' 
                : 'Fetching the latest categories and shops to ensure complete data accuracy.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col overflow-x-hidden transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between gap-1 sm:gap-4">
          <div className="flex items-center gap-2 md:gap-4 cursor-pointer shrink-0" onClick={() => {
            setView('home');
            setSelectedCategory(null);
            setFilterCategory('');
            setFilterSubCategory('');
            setFilterCuisine('');
            setFilterArea('');
            setFilterPrice('');
            setIsOpenNow(false);
          }}>
            {siteConfig.logoUrl
              ? <img src={optimizeImageUrl(siteConfig.logoUrl)} alt="Logo" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-8 md:h-10 w-auto rounded-lg" />
              : <div className="w-8 h-8 md:w-10 md:h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">B</div>}
            <h1 className="text-lg md:text-xl font-bold hidden sm:block text-gray-800 dark:text-slate-100 truncate max-w-[150px] md:max-w-none">
              {lang === 'ar' ? siteConfig.titleAr : siteConfig.titleEn}
            </h1>
          </div>

          <div className={`flex-1 ${isSearchOpen ? 'fixed inset-x-0 top-16 bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 z-50 md:static md:p-0 md:border-none' : 'hidden md:block'} max-w-xl`}>
            <form onSubmit={e => {
              e.preventDefault();
              setSelectedCategory(null);
              setFilterCategory('');
              setFilterSubCategory('');
              setFilterCuisine('');
              setFilterArea('');
              setFilterPrice('');
              setIsOpenNow(false);
              setView('results');
              setIsSearchOpen(false);
            }} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input type="text" placeholder={t.searchPlaceholder} value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-10 py-2 rounded-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)} 
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full md:hidden text-gray-600 dark:text-slate-300"
              title={lang === 'ar' ? 'البحث بالمنصة' : 'Search the platform'}
            >
              {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <button 
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} 
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-slate-300"
              title={lang === 'ar' ? 'تغيير لغة العرض (English)' : 'Change Display Language (العربية)'}
            >
              <Globe className="h-5 w-5" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
            <button 
              onClick={() => {
                setSelectedCategory(null);
                setFilterCategory('');
                setFilterSubCategory('');
                setFilterCuisine('');
                setFilterArea('');
                setFilterPrice('');
                setIsOpenNow(false);
                setView('landmarks');
              }} 
              className={`px-2 sm:px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-slate-700 rounded-full relative transition-all flex items-center gap-1 sm:gap-1.5 ${view === 'landmarks' ? 'text-amber-800 bg-amber-100 dark:bg-amber-950/40 font-extrabold shadow-sm' : 'text-amber-700 dark:text-amber-300 font-bold bg-amber-50/60 dark:bg-amber-950/20'}`}
              title={lang === 'ar' ? 'تعالوا هني - معالم وتراث البحرين' : 'Taalou Honi - Landmarks'}
            >
              <Compass className="h-4.5 w-4.5 text-amber-600" />
              <span className="text-xs hidden sm:inline">{lang === 'ar' ? 'تعالوا هني 🇧🇭' : 'Landmarks'}</span>
            </button>
            <button 
              onClick={() => {
                setSelectedCategory(null);
                setFilterCategory('');
                setFilterSubCategory('');
                setFilterCuisine('');
                setFilterArea('');
                setFilterPrice('');
                setIsOpenNow(false);
                setView('bazaar');
              }} 
              className={`px-2 sm:px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full relative transition-all flex items-center gap-1 sm:gap-1.5 ${view === 'bazaar' ? 'text-red-600 bg-red-50 dark:bg-red-950/20 font-bold' : 'text-gray-700 dark:text-slate-300 font-medium'}`}
              title={lang === 'ar' ? 'بازار العروض والخصومات' : 'Bazaar Offers & Discounts'}
            >
              <Tag className="h-4.5 w-4.5" />
              <span className="text-xs hidden sm:inline">{lang === 'ar' ? 'بازار' : 'Bazaar'}</span>
            </button>
            <button 
              onClick={() => {
                setSelectedCategory(null);
                setFilterCategory('');
                setFilterSubCategory('');
                setFilterCuisine('');
                setFilterArea('');
                setFilterPrice('');
                setIsOpenNow(false);
                setView('contact');
              }} 
              className={`px-2 sm:px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full relative transition-all flex items-center gap-1 sm:gap-1.5 ${view === 'contact' ? 'text-red-600 bg-red-50 dark:bg-red-950/20 font-bold' : 'text-gray-700 dark:text-slate-300 font-medium'}`}
              title={lang === 'ar' ? 'تواصل معنا' : 'Contact Us'}
            >
              <Phone className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">{lang === 'ar' ? 'تواصل' : 'Contact'}</span>
            </button>
            <button 
              onClick={() => setView('favorites')} 
              className={`p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full relative transition-colors ${view === 'favorites' ? 'text-red-600' : 'text-gray-700 dark:text-slate-300'}`}
              title={lang === 'ar' ? 'المفضلة' : 'Favorites'}
            >
              <Heart className={`h-5 w-5 ${favorites.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{favorites.length}</span>
              )}
            </button>
            {currentUser ? (
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-700 dark:text-slate-300 flex items-center gap-1"
                title={lang === 'ar' ? `تسجيل الخروج من (${currentUser.username})` : `Log Out of (${currentUser.username})`}
              >
                <Users className="h-5 w-5" />
                <span className="hidden md:inline text-xs max-w-[60px] truncate">{currentUser.username}</span>
              </button>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)} 
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-700 dark:text-slate-300"
                title={lang === 'ar' ? 'تسجيل الدخول / إنشاء حساب للأعضاء' : 'Member Log In / Register'}
              >
                <Users className="h-5 w-5" />
              </button>
            )}
            <button 
              onClick={() => setView('admin')} 
              className={`p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full ${view === 'admin' ? 'text-red-600' : 'text-gray-700 dark:text-slate-300'}`}
              title={lang === 'ar' ? 'لوحة التحكم والضبط' : 'Admin Dashboard & Settings'}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-6 md:py-8 w-full">
        {view !== 'admin' && <AdSection ads={ads} position="top" selectedCategory={selectedCategory} limit={siteConfig.maxAdsTop || 1} />}

        {view === 'home' && (
          <Home categories={categories} trendingRestaurants={trendingRestaurants} siteConfig={siteConfig}
            onSelectCategory={catId => {
              setSelectedCategory(catId);
              setFilterCategory('');
              setFilterSubCategory('');
              setFilterCuisine('');
              setFilterArea('');
              setFilterPrice('');
              setIsOpenNow(false);
              setView('results');
            }}
            onSelectBusiness={openBusinessDetails} toggleFavorite={toggleFavorite} favorites={favorites}
            visitorCount={visitorCount}
            onSelectBazaar={() => {
              setView('bazaar');
              setSelectedCategory(null);
              setFilterCategory('');
              setFilterSubCategory('');
              setFilterCuisine('');
              setFilterArea('');
              setFilterPrice('');
              setIsOpenNow(false);
            }}
            onSelectLandmarks={() => {
              setView('landmarks');
              setSelectedCategory(null);
              setFilterCategory('');
              setFilterSubCategory('');
              setFilterCuisine('');
              setFilterArea('');
              setFilterPrice('');
              setIsOpenNow(false);
            }} />
        )}

        {view === 'results' && (
          <Results filteredBusinesses={filteredBusinesses} selectedCategory={selectedCategory}
            categories={categories} ads={ads} siteConfig={siteConfig}
            favorites={favorites} toggleFavorite={toggleFavorite}
            onSelectBusiness={openBusinessDetails}
            onBackToHome={() => {
              setView('home');
              setSelectedCategory(null);
              setFilterCategory('');
              setFilterSubCategory('');
              setFilterCuisine('');
              setFilterArea('');
              setFilterPrice('');
              setIsOpenNow(false);
            }}
            filterCuisine={filterCuisine} setFilterCuisine={setFilterCuisine}
            filterArea={filterArea} setFilterArea={setFilterArea}
            filterPrice={filterPrice} setFilterPrice={setFilterPrice}
            isOpenNow={isOpenNow} setIsOpenNow={setIsOpenNow}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterSubCategory={filterSubCategory} setFilterSubCategory={setFilterSubCategory}
            uniqueCategoriesInPool={uniqueCategoriesInPool}
            uniqueSubCategoriesInPool={uniqueSubCategoriesInPool}
            uniqueCuisinesInPool={uniqueCuisinesInPool}
            uniqueAreasInPool={uniqueAreasInPool} />
        )}

        {view === 'favorites' && (
          <Favorites businesses={businesses} favorites={favorites} currentUser={currentUser}
            toggleFavorite={toggleFavorite} onSelectBusiness={openBusinessDetails}
            onBackToHome={() => {
              setView('home');
              setSelectedCategory(null);
              setFilterCategory('');
              setFilterSubCategory('');
              setFilterCuisine('');
              setFilterArea('');
              setFilterPrice('');
              setIsOpenNow(false);
            }} />
        )}

        {view === 'business-details' && selectedBusiness && (
          <BusinessDetails selectedBusiness={selectedBusiness} currentUser={currentUser}
            onBackToResults={() => setView('results')} onRate={handleRate}
            onAddReview={handleAddReview} onDeleteReview={handleDeleteReview}
            onAddReply={handleAddReply} isAdmin={isAdmin || isAdminLoggedIn} />
        )}

        {view === 'admin' && (
          <ErrorBoundary>
            <AdminDashboard lang={lang} t={t} categories={categories} setCategories={setCategories}
              businesses={businesses} setBusinesses={setBusinesses}
              members={members} setMembers={setMembers}
              ads={ads} setAds={setAds}
              siteConfig={siteConfig} setSiteConfig={setSiteConfig}
              bazaarOffers={bazaarOffers}
              salesProducts={salesProducts} setSalesProducts={setSalesProducts}
              salesInvoices={salesInvoices} setSalesInvoices={setSalesInvoices}
              deletedBusinesses={deletedBusinesses} setDeletedBusinesses={setDeletedBusinesses}
              landmarks={landmarks} setLandmarks={setLandmarks}
              isLoggedIn={isAdminLoggedIn || isAdmin || currentUser?.role === 'admin' || currentUser?.role === 'editor'}
              currentUser={currentUser}
              onLogin={(u: string, p: string) => {
                // Check members list
                let found = members.find(m => m.username === u && m.password === p);
                
                if (!found && u === 'admin' && p === '123') {
                  found = { id: '1', username: 'admin', password: '123', role: 'admin' };
                  setMembers(prev => prev.some(m => m.username === 'admin') ? prev : [...prev, found!]);
                } else if (!found && u === 'editor' && p === 'editor123') {
                  found = { id: 'u2', username: 'editor', password: 'editor123', role: 'editor' };
                  setMembers(prev => prev.some(m => m.username === 'editor') ? prev : [...prev, found!]);
                }
              
                if (found) {
                  setCurrentUser(found); 
                  return true;
                } else { 
                  return false;
                }
              }}
              sheetUrl={sheetUrl} setSheetUrl={setSheetUrl} handleSheetSync={handleSheetSync} />
          </ErrorBoundary>
        )}

        {view === 'landmarks' && (
          <LandmarksSection
            landmarks={landmarks}
            setLandmarks={setLandmarks}
            lang={lang}
            t={t}
          />
        )}

        {view === 'bazaar' && (
          <Bazaar 
            bazaarOffers={bazaarOffers} 
            setBazaarOffers={setBazaarOffers}
            businesses={businesses} 
            currentUser={currentUser}
            onBackToHome={() => {
              setView('home');
              setSelectedCategory(null);
              setFilterCategory('');
              setFilterSubCategory('');
              setFilterCuisine('');
              setFilterArea('');
              setFilterPrice('');
              setIsOpenNow(false);
            }} 
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {view === 'contact' && (
          <ContactView siteConfig={siteConfig} lang={lang} />
        )}

        <AdSection ads={ads} position="bottom" selectedCategory={selectedCategory} limit={siteConfig.maxAdsBottom || 1} />
      </main>

      {/* Footer with App Version */}
      <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {siteConfig.logoUrl
              ? <img src={optimizeImageUrl(siteConfig.logoUrl)} alt="Logo" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-6 w-auto rounded" />
              : <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs shadow-sm">B</div>}
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              {lang === 'ar' ? siteConfig.titleAr : siteConfig.titleEn}
            </span>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-slate-400">
            {lang === 'ar' ? '© جميع الحقوق محفوظة لـ دليل البحرين' : '© All rights reserved to Bahrain Directory'} {new Date().getFullYear()}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{lang === 'ar' ? 'الإصدار:' : 'Version:'} <span className="font-bold text-red-600 dark:text-red-400">v{APP_VERSION}</span></span>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  {lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {lang === 'ar' ? 'هل أنت متأكد من رغبتك في تسجيل الخروج؟' : 'Are you sure you want to log out?'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setCurrentUser(null);
                  setShowLogoutConfirm(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PROVIDERS ────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('bh_lang') as Language) || 'ar';
  });
  const [members, setMembers] = useState<User[]>(() => {
    try { const s = localStorage.getItem('bh_members'); return s ? JSON.parse(s) : INITIAL_MEMBERS; } catch { return INITIAL_MEMBERS; }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const s = localStorage.getItem('bh_current_user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => { localStorage.setItem('bh_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('bh_members', JSON.stringify(members)); }, [members]);
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('bh_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('bh_current_user');
    }
  }, [currentUser]);

  const t = T[lang];
  const isAdmin = currentUser?.role === 'admin';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <AuthContext.Provider value={{ currentUser, setCurrentUser, members, setMembers, isAdmin }}>
        <AppContent />
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
};

export default App;
