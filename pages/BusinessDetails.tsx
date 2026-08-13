import React from 'react';
import { 
  ArrowRight, 
  Instagram, 
  MapPin, 
  Phone, 
  Clock, 
  Settings, 
  Car, 
  Shirt, 
  Users, 
  Star, 
  Plus, 
  MessageSquare, 
  Share2 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Business, User } from '../types';
import { ReviewList } from '../components/ReviewList';

interface BusinessDetailsProps {
  selectedBusiness: Business;
  currentUser: User | null;
  onBackToResults: () => void;
  onRate: (businessId: string, rating: number) => void;
  onAddReview: (author: string, rating: number, comment: string) => void;
  onDeleteReview: (reviewId: string) => void;
  onAddReply: (reviewId: string, replyText: string) => void;
  isAdmin: boolean;
}

export const BusinessDetails: React.FC<BusinessDetailsProps> = ({
  selectedBusiness,
  currentUser,
  onBackToResults,
  onRate,
  onAddReview,
  onDeleteReview,
  onAddReply,
  isAdmin
}) => {
  const { lang, t } = useLanguage();

  // Share functionality using Navigator Web Share API
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: lang === 'ar' ? selectedBusiness.nameAr : selectedBusiness.nameEn,
        text: lang === 'ar' ? `اكتشف ${selectedBusiness.nameAr} على دليل البحرين` : `Check out ${selectedBusiness.nameEn} on Bahrain Directory`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert(lang === 'ar' ? 'تم نسخ الرابط إلى الحافظة!' : 'Link copied to clipboard!');
    }
  };

  const hasSpecialOffer = (() => {
    if (!selectedBusiness.hasAdPage) return false;
    const now = new Date();
    const start = selectedBusiness.adStartDate ? new Date(selectedBusiness.adStartDate) : null;
    const end = selectedBusiness.adEndDate ? new Date(selectedBusiness.adEndDate) : null;
    return (!start || now >= start) && (!end || now <= end);
  })();

  const averageRating = selectedBusiness.ratingCount 
    ? (selectedBusiness.ratingSum! / selectedBusiness.ratingCount!).toFixed(1) 
    : "0.0";

  return (
    <div className="animate-fadeIn px-1 md:px-0">
      <button 
        onClick={onBackToResults} 
        className="mb-4 md:mb-6 flex items-center gap-2 text-gray-500 hover:text-red-650 transition-colors text-sm md:text-base font-bold"
      >
        <ArrowRight className={`h-4 w-4 ${lang === 'ar' ? '' : 'rotate-180'}`} />
        {t.backToIndex}
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Banner Asset View */}
          <div className="h-64 sm:h-80 md:h-auto bg-gray-100 dark:bg-slate-900 relative">
            {selectedBusiness.mediaType === 'video' && selectedBusiness.videoUrl ? (
              <video 
                src={selectedBusiness.videoUrl} 
                className="w-full h-full object-cover" 
                controls 
                autoPlay 
                muted
              />
            ) : (
              <img 
                src={selectedBusiness.image || 'https://picsum.photos/seed/placeholder/600/400'} 
                alt={lang === 'ar' ? selectedBusiness.nameAr : selectedBusiness.nameEn}
                className="w-full h-full object-cover" 
              />
            )}
          </div>

          {/* Details Content Panel */}
          <div className="p-6 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6 gap-4">
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-full text-[10px] md:text-xs font-bold mb-2 md:mb-3">
                    {selectedBusiness.subCategory}
                  </span>
                  <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-slate-100 leading-tight">
                    {lang === 'ar' ? selectedBusiness.nameAr : selectedBusiness.nameEn}
                  </h2>
                  
                  {/* Cuisine & Price Badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedBusiness.cuisine && (
                      <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-md text-[10px] md:text-xs font-bold border border-amber-100 dark:border-amber-900/30">
                        {lang === 'ar' ? selectedBusiness.cuisineAr : selectedBusiness.cuisine}
                      </span>
                    )}
                    {selectedBusiness.priceRange && (
                      <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] md:text-xs font-bold border border-emerald-100 dark:border-emerald-900/30">
                        {selectedBusiness.priceRange}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {selectedBusiness.instagram && (
                    <a 
                      href={`https://instagram.com/${selectedBusiness.instagram}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-2 md:p-3 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-650 text-white rounded-xl md:rounded-2xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
                      aria-label="Visit Instagram page"
                    >
                      <Instagram className="h-5 w-5 md:h-6 md:w-6" />
                    </a>
                  )}
                </div>
              </div>

              {/* Business Description */}
              {(selectedBusiness.adPageContent) && (
                <div className="mb-6">
                  <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'ar' ? selectedBusiness.activities : selectedBusiness.activities}
                  </p>
                </div>
              )}

              {/* Core Details Grid */}
              <div className="space-y-4 md:space-y-6 mb-8">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-red-50 dark:bg-red-950/20 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-slate-100 text-sm md:text-base">
                      {lang === 'ar' ? selectedBusiness.areaAr : selectedBusiness.areaEn}
                    </p>
                    <p className="text-xs md:text-sm text-gray-400 dark:text-slate-500">{t.block} {selectedBusiness.block}</p>
                    {selectedBusiness.governorate && (
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 font-bold">
                        {lang === 'ar' ? 'المحافظة: ' : 'Governorate: '}
                        {lang === 'ar' 
                          ? (selectedBusiness.governorate === 'Capital' ? 'العاصمة' : selectedBusiness.governorate === 'Muharraq' ? 'المحرق' : selectedBusiness.governorate === 'Northern' ? 'الشمالية' : 'الجنوبية')
                          : selectedBusiness.governorate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-green-50 dark:bg-green-950/20 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-slate-100 text-sm md:text-base">{selectedBusiness.phone}</p>
                    <p className="text-xs md:text-sm text-gray-400 dark:text-slate-500">{t.callNow}</p>
                  </div>
                </div>

                {selectedBusiness.workHours && (
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-50 dark:bg-blue-950/20 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-blue-650 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-slate-100 text-sm md:text-base">{selectedBusiness.workHours}</p>
                      <p className="text-xs md:text-sm text-gray-400 dark:text-slate-500">{lang === 'ar' ? 'ساعات العمل' : 'Working Hours'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Amenities & Features Panel */}
              {(selectedBusiness.category === 'restaurants' || selectedBusiness.hasParking !== undefined || selectedBusiness.hasFamilySection !== undefined || selectedBusiness.dressCodeEn !== undefined) && (
                <div className="grid grid-cols-3 gap-2 border-t border-b border-gray-100 dark:border-slate-700 py-4 my-6">
                  <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-gray-50 dark:bg-slate-900/55 border border-gray-100 dark:border-slate-750">
                    <Car className={`h-5 w-5 mb-1 ${selectedBusiness.hasParking ? 'text-green-600' : 'text-gray-300 dark:text-slate-700'}`} />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{t.parking}</span>
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-medium">
                      {selectedBusiness.hasParking ? (lang === 'ar' ? 'متوفر' : 'Yes') : (lang === 'ar' ? 'غير متوفر' : 'No')}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-gray-50 dark:bg-slate-900/55 border border-gray-100 dark:border-slate-750">
                    <Shirt className={`h-5 w-5 mb-1 ${selectedBusiness.dressCodeEn ? 'text-blue-655' : 'text-gray-300 dark:text-slate-700'}`} />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{t.dressCode}</span>
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-medium truncate max-w-[85px]">
                      {selectedBusiness.dressCodeEn 
                        ? (lang === 'ar' ? selectedBusiness.dressCodeAr : selectedBusiness.dressCodeEn) 
                        : (lang === 'ar' ? 'أي زي' : 'Any')}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-gray-50 dark:bg-slate-900/55 border border-gray-100 dark:border-slate-750">
                    <Users className={`h-5 w-5 mb-1 ${selectedBusiness.hasFamilySection ? 'text-purple-600' : 'text-gray-300 dark:text-slate-700'}`} />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{t.familySection}</span>
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-medium">
                      {selectedBusiness.hasFamilySection ? (lang === 'ar' ? 'متوفر' : 'Yes') : (lang === 'ar' ? 'غير متوفر' : 'No')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Connect Buttons */}
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {selectedBusiness.googleMapsUrl && (
                  <a 
                    href={selectedBusiness.googleMapsUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-colors shadow"
                  >
                    <MapPin className="h-4 w-4" /> 
                    <span>{t.googleMaps}</span>
                  </a>
                )}
                <button 
                  onClick={handleShare} 
                  className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-250 dark:bg-slate-700 dark:hover:bg-slate-650 text-gray-700 dark:text-slate-200 py-3.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-colors"
                >
                  <Share2 className="h-4 w-4" /> 
                  <span>{lang === 'ar' ? 'مشاركة' : 'Share'}</span>
                </button>
              </div>

              {/* Commercial High Conversion WhatsApp & Call CTAs */}
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={`tel:${selectedBusiness.phone}`} 
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-750 text-white py-3.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-colors shadow"
                >
                  <Phone className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'اتصال مباشر' : 'Click to Call'}</span>
                </a>
                <a 
                  href={`https://wa.me/973${selectedBusiness.phone}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-colors shadow"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Quick Ratings Evaluator */}
            <div className="mt-8 md:mt-10 pt-6 border-t border-gray-100 dark:border-slate-700 text-center">
              <h4 className="text-sm md:text-base font-bold mb-3 dark:text-slate-200">{t.rateThis}</h4>
              <div className="flex justify-center gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => onRate(selectedBusiness.id, star)}
                    className="p-1 hover:scale-110 transition-transform focus:outline-none"
                    aria-label={`Evaluate ${star} Stars`}
                  >
                    <Star 
                      className={`h-8 w-8 md:h-9 md:w-9 ${
                        star <= Math.round((selectedBusiness.ratingSum || 0) / (selectedBusiness.ratingCount || 1)) 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300 dark:text-slate-650'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              {selectedBusiness.ratingCount ? (
                <p className="text-gray-400 dark:text-slate-500 text-xs md:text-sm">
                  {t.averageRating}: {averageRating} ({selectedBusiness.ratingCount} {t.ratingCountText})
                </p>
              ) : (
                <p className="text-gray-400 dark:text-slate-500 text-xs">{lang === 'ar' ? 'لا توجد تقييمات بعد' : 'No evaluations yet'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Listing Section */}
        <ReviewList
          reviews={selectedBusiness.reviews}
          lang={lang}
          t={t}
          currentUser={currentUser}
          onAddReview={onAddReview}
          onDeleteReview={onDeleteReview}
          onAddReply={onAddReply}
          isAdmin={isAdmin}
        />

        {/* Special Offer / Banner Ad Integration */}
        {hasSpecialOffer && (
          <div className="p-6 md:p-12 bg-yellow-50 dark:bg-yellow-950/20 border-t border-yellow-100 dark:border-yellow-900/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-400 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                <Plus className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-slate-100">{t.specialOffer}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
              <div className="prose dark:prose-invert max-w-none text-sm md:text-base">
                <p className="text-gray-750 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedBusiness.adPageContent}
                </p>
              </div>
              {selectedBusiness.adPageMediaUrl && (
                <div className="rounded-xl md:rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
                  {selectedBusiness.adPageMediaType === 'video' ? (
                    <video src={selectedBusiness.adPageMediaUrl} className="w-full max-h-64 md:max-h-80 object-cover" controls />
                  ) : (
                    <img src={selectedBusiness.adPageMediaUrl} alt="Special Offer Banner" className="w-full max-h-64 md:max-h-80 object-cover" />
                  )}
                </div>
              )}
              {selectedBusiness.adEndDate && (
                <div className="mt-4 text-[10px] md:text-xs text-yellow-750 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg inline-block">
                  {t.validUntil}: {new Date(selectedBusiness.adEndDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
