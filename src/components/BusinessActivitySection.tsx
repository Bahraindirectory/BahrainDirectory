import React, { useState } from 'react';
import {
  Sparkles, CheckCircle2, Share2, Copy, Check, Volume2, VolumeX,
  Search, Layers, ArrowDown, ArrowUp, Briefcase, FileText
} from 'lucide-react';

export function BusinessActivitySection({
  activities,
  adPageContent,
  businessName,
  whatsapp,
  lang = 'ar'
}: {
  activities?: string;
  adPageContent?: string;
  businessName: string;
  whatsapp?: string;
  lang?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Combine activity text
  const fullText = [activities, adPageContent].filter(Boolean).join('\n\n').trim();

  if (!fullText) return null;

  // Smart parser for items/services
  const parseItems = (raw: string): string[] => {
    // Split by lines, bullets, commas, or semicolons
    const splitRegex = /[\n•\-\*;,]+/g;
    const items = raw
      .split(splitRegex)
      .map(s => s.trim())
      .filter(s => s.length > 1);

    return Array.from(new Set(items)); // unique items
  };

  const items = parseItems(fullText);

  // Filter items by search
  const filteredItems = items.filter(item => {
    if (!search.trim()) return true;
    return item.toLowerCase().includes(search.toLowerCase().trim());
  });

  // Handle Copy
  const handleCopy = () => {
    navigator.clipboard.writeText(`${businessName}\n\nنشاط المنشأة والخدمات:\n${fullText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text To Speech
  const handleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'ar' ? 'خاصية الاستماع غير مدعومة في متصفحك' : 'Speech synthesis not supported');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${businessName}. ${fullText}`);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`💡 *${businessName}*\n\n*نشاط المنشأة والخدمات المقدمة:*\n${fullText}\n\nتصفح المزيد عبر دليل البحرين 🇧🇭`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Display limit for items when collapsed
  const DISPLAY_LIMIT = 8;
  const visibleItems = isExpanded ? filteredItems : filteredItems.slice(0, DISPLAY_LIMIT);

  return (
    <div className="bg-gradient-to-br from-amber-50/80 via-white to-red-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 rounded-2xl p-5 shadow-sm border border-amber-200/70 dark:border-slate-700/80 space-y-4 animate-fadeIn" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-200/50 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <span>{lang === 'ar' ? 'تفاصيل نشاط المنشأة والخدمات' : 'Business Activity & Services'}</span>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] rounded-full border border-amber-300/50">
                {items.length > 1 ? `${items.length} ${lang === 'ar' ? 'خدمات / أنشطة' : 'services'}` : (lang === 'ar' ? 'مفصّل' : 'Detailed')}
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {lang === 'ar' ? 'استعرض كافة المنتجات والأنشطة والخدمات المتاحة لدى هذه المنشأة' : 'All activities and services offered'}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleSpeech}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              isSpeaking
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 hover:bg-amber-50'
            }`}
            title={lang === 'ar' ? 'استماع صوّتي للنشاط' : 'Listen'}
          >
            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-amber-600" />}
            <span className="hidden sm:inline">{isSpeaking ? (lang === 'ar' ? 'إيقاف' : 'Stop') : (lang === 'ar' ? 'استماع' : 'Listen')}</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold hover:bg-amber-50 transition-all flex items-center gap-1"
            title={lang === 'ar' ? 'نسخ التفاصيل' : 'Copy'}
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
            <span className="hidden sm:inline">{copied ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
            title={lang === 'ar' ? 'مشاركة عبر واتساب' : 'Share WhatsApp'}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'مشاركة' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Search Input for Services if 4+ items */}
      {items.length >= 4 && (
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث عن خدمة أو نشاط محدد...' : 'Filter services...'}
            className="w-full pr-8 pl-3 py-1.5 bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-slate-700 rounded-xl text-xs text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      {/* RENDER AS INTERACTIVE SERVICE BADGES/CARDS */}
      {items.length > 1 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleItems.map((item, idx) => {
              const isSelected = selectedTag === item;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedTag(isSelected ? null : item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-[1.01]'
                      : 'bg-white dark:bg-slate-900/70 border-amber-100 dark:border-slate-700/80 hover:border-amber-400 hover:bg-amber-50/40 text-gray-800 dark:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                  <span className="text-xs font-semibold leading-relaxed">{item}</span>
                </div>
              );
            })}
          </div>

          {/* Expand/Collapse Toggle if items > DISPLAY_LIMIT */}
          {filteredItems.length > DISPLAY_LIMIT && (
            <div className="text-center pt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-amber-300 dark:border-slate-600 rounded-full text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-all inline-flex items-center gap-1 shadow-sm"
              >
                <span>
                  {isExpanded
                    ? (lang === 'ar' ? 'عرض أقل' : 'Show Less')
                    : (lang === 'ar' ? `عرض كافة الخدمات (${filteredItems.length})` : `Show All (${filteredItems.length})`)}
                </span>
                {isExpanded ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Render full paragraph nicely */
        <div className="p-4 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-amber-100 dark:border-slate-700 space-y-2">
          <p className="text-xs sm:text-sm text-gray-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-line">
            {fullText}
          </p>
        </div>
      )}
    </div>
  );
}
