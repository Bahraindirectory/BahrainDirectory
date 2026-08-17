import React, { useState } from 'react';
import {
  Compass, MapPin, Calendar, Clock, DollarSign, Heart, Share2, Search,
  Plus, Edit, Trash2, X, ExternalLink, Sparkles,
  MessageCircle, Camera, Award, ChevronLeft, ChevronRight, Check, Info, Phone, Instagram, Upload
} from 'lucide-react';
import { convertFileToWebP, optimizeImageUrl } from '../lib/imageOptimizer';

export interface Landmark {
  id: string;
  nameAr: string;
  nameEn?: string;
  category: 'heritage' | 'souqs' | 'museums' | 'sights' | 'beaches' | 'parks';
  governorate?: string;
  areaAr?: string;
  areaEn?: string;
  descriptionAr: string;
  descriptionEn?: string;
  historicalOverview?: string;
  image?: string;
  googleMapsUrl?: string;
  workHours?: string;
  entryFee?: string;
  phone?: string;
  instagram?: string;
  isFeatured?: boolean;
  likesCount?: number;
  tags?: string[];
  createdAt?: string;
  comments?: { id: string; author: string; text: string; date: string }[];
}

export const INITIAL_LANDMARKS: Landmark[] = [
  {
    id: 'lm-1',
    nameAr: 'قلعة البحرين (قلعة العجاج)',
    nameEn: 'Bahrain Fort (Qal’at al-Bahrain)',
    category: 'heritage',
    governorate: 'المحافظة الشمالية',
    areaAr: 'كرباباد / ضاحية السيف',
    areaEn: 'Karbabad / Seef',
    descriptionAr: 'موقع أثري مدرج على قائمة التراث العالمي لليونسكو. يمثل عاصمة دلمون القديمة ويحتوي على طبقات أثرية تعود لـ 2300 سنة قبل الميلاد مع إطلالة ساحرة ومتحف مائي فاخر ومقاهي تطل على البحر.',
    descriptionEn: 'A UNESCO World Heritage Site representing the ancient capital of Dilmun. It features archaeological layers dating back to 2300 BC with a coastal view, museum, and seaside cafes.',
    historicalOverview: 'شُيدت القلعة الرئيسية في القرن السادس عشر الإسباني/البرتغالي فوق تل أثري مرتفع يضم بقايا مدن دلمونية وآشورية وإسلامية متتابعة، لتشهد على عظمة التجارة البحرية التاريخية للبحرين.',
    image: 'https://images.unsplash.com/photo-1578895210405-907db486c111?q=80&w=1200&auto=format&fit=crop&fm=webp',
    googleMapsUrl: 'https://maps.google.com/?q=Qalat+al+Bahrain',
    workHours: 'الموقع: يومياً من 8 صباحاً حتى 8 مساءً | المتحف: 8 ص - 8 م (مغلق الاثنين)',
    entryFee: 'الموقع مجاني | المتحف: 2.200 د.ب',
    phone: '+973 17567171',
    instagram: 'culturebah',
    isFeatured: true,
    likesCount: 342,
    tags: ['تراث عالمي', 'يونسكو', 'إطلالة بحرية', 'متحف'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'lm-2',
    nameAr: 'باب البحرين وسوق المنامة القديم',
    nameEn: 'Bab Al Bahrain & Old Manama Souq',
    category: 'souqs',
    governorate: 'محافظة العاصمة',
    areaAr: 'وسط المنامة',
    areaEn: 'Manama Center',
    descriptionAr: 'المدخل التاريخي لسوق المنامة القديم ومقر أول مكتب حكومي رئيسي. يفيض بالسحر التراثي ويضم أزقة التوابل والعطور والبهارات والذهب والمقاهي العريقة كـ "مقهى حاجي".',
    descriptionEn: 'The historic gateway to Manama Souq. Packed with traditional charm, spice shops, perfumes, gold, handicrafts, and historic cafes like Hajis Cafe.',
    historicalOverview: 'صممه المستشار السير تشارلز بيلغريف عام 1949 وشهد إعادة تجديد تعيد له حس الطراز المعماري الخليجي الأصيل ليكون ملتقى الثقافات والتجار.',
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop&fm=webp',
    googleMapsUrl: 'https://maps.google.com/?q=Bab+Al+Bahrain',
    workHours: 'يومياً: 9 صباحاً - 1 ظهراً | 4 عصراً - 10 مساءً',
    entryFee: 'مجاني',
    phone: '+973 17227777',
    instagram: 'manamasouq',
    isFeatured: true,
    likesCount: 512,
    tags: ['تسوق شعبية', 'قهوة شعبية', 'بهارات وعطور', 'تاريخ'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'lm-3',
    nameAr: 'متحف البحرين الوطني',
    nameEn: 'Bahrain National Museum',
    category: 'museums',
    governorate: 'محافظة العاصمة',
    areaAr: 'كورنيش المنامة',
    areaEn: 'Manama Corniche',
    descriptionAr: 'أحد أكبر وأقدم المتاحف في منطقة الخليج العربي. يجسد تاريخ وحضارة البحرين عبر 6000 عام في صالات عرض فخمة تضم قاعات دلمون والغوص والعادات والتقاليد.',
    descriptionEn: 'One of the largest and oldest museums in the Arabian Gulf, showcasing 6,000 years of Bahraini history, Dilmun civilization, pearling heritage, and local traditions.',
    historicalOverview: 'افتتحه المغفور له الشيخ عيسى بن سلمان آل خليفة عام 1988 بكسوة رخامية تراثية بيضاء على ضفاف البحر ليكون واجهة المعرفة والآثار لمملكة البحرين.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop&fm=webp',
    googleMapsUrl: 'https://maps.google.com/?q=Bahrain+National+Museum',
    workHours: 'يومياً: 8 صباحاً - 8 مساءً (مغلق الثلاثاء)',
    entryFee: '1.100 د.ب للمواطنين والمقيمين',
    phone: '+973 17298777',
    instagram: 'culturebah',
    isFeatured: true,
    likesCount: 289,
    tags: ['متاحف', 'حضارة دلمون', 'تاريخ', 'ثقافة'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'lm-4',
    nameAr: 'شجرة الحياة',
    nameEn: 'Tree of Life',
    category: 'sights',
    governorate: 'المحافظة الجنوبية',
    areaAr: 'صحراء الصخير',
    areaEn: 'Sakhir Desert',
    descriptionAr: 'أعجوبة طبيعية ساحرة تقف بشموخ وسط الصحراء القاحلة منذ أكثر من 400 عام دون أي مصدر مائي معروف. رمز للصمود ومقصد سياحي يلتقط فيه الزوار أروع الصور.',
    descriptionEn: 'A magical natural wonder standing in the desert for over 400 years with no apparent water source. A symbol of resilience and a famous photo spot.',
    historicalOverview: 'تعود شجرة الغاف الكبيرة لعام 1582 ميلادية وترتبط بها العديد من الأساطير الشعبية حول سر بقائها مخضرة في قلب الكثبان الرملية الجافة.',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop&fm=webp',
    googleMapsUrl: 'https://maps.google.com/?q=Tree+of+Life+Bahrain',
    workHours: 'متاحة للزيارة 24 ساعة',
    entryFee: 'مجاني',
    isFeatured: false,
    likesCount: 420,
    tags: ['طبيعة', 'أعجوبة', 'صحراء الصخير', 'تصوير'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'lm-5',
    nameAr: 'جامع أحمد الفاتح (مركز الفاتح الإسلامي)',
    nameEn: 'Al Fateh Grand Mosque',
    category: 'heritage',
    governorate: 'محافظة العاصمة',
    areaAr: 'الجفير',
    areaEn: 'Juffair',
    descriptionAr: 'أكبر جوامع البحرين وأحد أكبر المساجد في العالم. يتسع لأكثر من 7000 مصلي وتعلوه قبة ضخمة من الألياف الزجاجية مع جولات سياحية تعريفية مجانية بمختلف اللغات.',
    descriptionEn: 'Bahrain’s largest mosque and one of the largest in the world. Features a massive fiberglass dome and offers free guided tours in multiple languages.',
    historicalOverview: 'افتتح عام 1988 وتزين جدرانه خطوط كوفية إسلامية وثريات سواروفسكي وأبواب مصنوعة من خشب الساج الهندي المعتق.',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1200&auto=format&fit=crop&fm=webp',
    googleMapsUrl: 'https://maps.google.com/?q=Al+Fateh+Grand+Mosque',
    workHours: 'الجولات السياحية: من الأحد للخميس (9 صباحاً - 4 عصراً)',
    entryFee: 'مجاني',
    phone: '+973 17727773',
    isFeatured: true,
    likesCount: 310,
    tags: ['عمارة إسلامية', 'معالم دينية', 'الجفير', 'جولات'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'lm-6',
    nameAr: 'طريق اللؤلؤ وحصن بو ماهر',
    nameEn: 'Pearling Path & Bu Maher Fort',
    category: 'heritage',
    governorate: 'محافظة المحرق',
    areaAr: 'المحرق القديمة',
    areaEn: 'Old Muharraq',
    descriptionAr: 'مسار تراثي بطول 3.5 كم مدرج لدى اليونسكو يروي حكاية اقتصاد الغوص على اللؤلؤ عبر بيوت التجار التاريخية والدكان والحصن المائي الذي يتم الوصول إليه بقارب بحري.',
    descriptionEn: 'A 3.5km UNESCO World Heritage trail telling the story of Bahrain’s pearling economy through historic merchant houses, visitors center, and a boat ride to Bu Maher Fort.',
    historicalOverview: 'كان حصن بو ماهر المحطة الأولى لاستقبال سفن الغوص للؤلؤ القادمة من هيرات الخليج، ويحتوي مركز زوار متطور يرصد تفاصيل حياة الغواصين.',
    image: 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?q=80&w=1200&auto=format&fit=crop&fm=webp',
    googleMapsUrl: 'https://maps.google.com/?q=Bu+Maher+Fort',
    workHours: 'مركز الزوار والرحلات البحرية: 9 صباحاً - 7 مساءً',
    entryFee: 'الرحلة البحرية للقلعة: 1.000 د.ب',
    phone: '+973 17298777',
    instagram: 'pearlingpath',
    isFeatured: true,
    likesCount: 275,
    tags: ['طريق اللؤلؤ', 'تراث اليونسكو', 'المحرق', 'جولة بحرية'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'lm-7',
    nameAr: 'محمية ومنتزه العرين',
    nameEn: 'Al Areen Wildlife Park',
    category: 'parks',
    governorate: 'المحافظة الجنوبية',
    areaAr: 'الزلاق',
    areaEn: 'Zallaq',
    descriptionAr: 'محمية طبيعية وحديقة حيوان فريدة تمتد على مساحة 8 كيلومترات مربعة، تحتضن فصائل نادرة من المها العربي، الغزلان، والطيور المائية والحيوانات المفترسة في بيئة مريحة للعائلات.',
    descriptionEn: 'A natural sanctuary and wildlife park home to rare Arabian Oryx, gazelles, birds, and animals in a family-friendly green environment.',
    historicalOverview: 'تأسست عام 1976 لحماية الكائنات الفطرية المهددة بالانقراض في شبه الجزيرة العربية وتوفر حافلات جولة مكيفة داخل أرجاء المحمية.',
    image: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?q=80&w=1200&auto=format&fit=crop&fm=webp',
    googleMapsUrl: 'https://maps.google.com/?q=Al+Areen+Wildlife+Park',
    workHours: 'يومياً: 8 صباحاً - 4 مساءً',
    entryFee: '1.000 د.ب للكبار | 0.500 د.ب للأطفال',
    phone: '+973 17836116',
    isFeatured: false,
    likesCount: 198,
    tags: ['حيوانات', 'محمية', 'الزلاق', 'عائلات والأطفال'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'lm-8',
    nameAr: 'شاطئ بلاج الجزائر',
    nameEn: 'Bilaj Al Jazayer Beach',
    category: 'beaches',
    governorate: 'المحافظة الجنوبية',
    areaAr: 'الزلاق',
    areaEn: 'Zallaq',
    descriptionAr: 'واجهة بحرية حديثة وممتدة على طول 3 كيلومترات من الرمال الذهبية الناعمة، تتميز بمرافق شاطئية عصرية، مطاعم، أنشطة مائية، وجلسات غروب ساحرة.',
    descriptionEn: 'A modern 3km golden sand beach destination featuring beach amenities, watersports, restaurants, and sunset relaxation.',
    historicalOverview: 'تم تطوير الشاطئ مؤخراً ليكون الملاذ الشاطئي الأول لمواطني وزوار المملكة برعايات ترفيهية وخدمات متكاملة.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop&fm=webp',
    googleMapsUrl: 'https://maps.google.com/?q=Bilaj+Al+Jazayer',
    workHours: 'مفتوح من 8 صباحاً حتى غروب الشمس / 10 مساءً',
    entryFee: 'دخول الشاطئ العمومي: 2.000 د.ب (مستردة كقسيمة للمطاعم)',
    instagram: 'bilajaljazayer',
    isFeatured: false,
    likesCount: 388,
    tags: ['شاطئ', 'بحر', 'غروب', 'رياضات مائية'],
    createdAt: new Date().toISOString()
  }
];

export function LandmarksSection({
  landmarks,
  setLandmarks,
  lang,
  t
}: {
  landmarks: Landmark[];
  setLandmarks: React.Dispatch<React.SetStateAction<Landmark[]>>;
  lang: string;
  t: any;
}) {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [selectedGov, setSelectedGov] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activeModalLandmark, setActiveModalLandmark] = useState<Landmark | null>(null);
  const [newComment, setNewComment] = useState({ author: '', text: '' });

  // Categories translation
  const categories = [
    { key: 'all', labelAr: 'الكل 🇧🇭', labelEn: 'All 🇧🇭' },
    { key: 'heritage', labelAr: '🏛️ مواقع تراثية وآثار', labelEn: '🏛️ Heritage & Ruins' },
    { key: 'souqs', labelAr: '🛍️ أسواق شعبية', labelEn: '🛍️ Souqs & Traditional' },
    { key: 'museums', labelAr: '🎨 متاحف وثقافة', labelEn: '🎨 Museums & Culture' },
    { key: 'sights', labelAr: '🌴 معالم وطبيعة', labelEn: '🌴 Nature & Sights' },
    { key: 'beaches', labelAr: '🏖️ شواطئ وجزر', labelEn: '🏖️ Beaches & Islands' },
    { key: 'parks', labelAr: '🎡 حدائق ومنتزهات', labelEn: '🎡 Parks & Nature' },
  ];

  const governorates = [
    { key: 'all', labelAr: 'جميع المحافظات', labelEn: 'All Governorates' },
    { key: 'محافظة العاصمة', labelAr: 'محافظة العاصمة (المنامة)', labelEn: 'Capital (Manama)' },
    { key: 'محافظة المحرق', labelAr: 'محافظة المحرق', labelEn: 'Muharraq' },
    { key: 'المحافظة الشمالية', labelAr: 'المحافظة الشمالية', labelEn: 'Northern' },
    { key: 'المحافظة الجنوبية', labelAr: 'المحافظة الجنوبية (الصخير/الزلاق)', labelEn: 'Southern' },
  ];

  // Like handler
  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLandmarks(prev => prev.map(lm => {
      if (lm.id === id) {
        return { ...lm, likesCount: (lm.likesCount || 0) + 1 };
      }
      return lm;
    }));
  };

  // Add comment handler
  const handleAddComment = (landmarkId: string) => {
    if (!newComment.author.trim() || !newComment.text.trim()) return;
    const commentObj = {
      id: Date.now().toString(),
      author: newComment.author.trim(),
      text: newComment.text.trim(),
      date: new Date().toLocaleDateString('ar-BH')
    };

    setLandmarks(prev => prev.map(lm => {
      if (lm.id === landmarkId) {
        const comments = lm.comments || [];
        return { ...lm, comments: [commentObj, ...comments] };
      }
      return lm;
    }));

    if (activeModalLandmark && activeModalLandmark.id === landmarkId) {
      setActiveModalLandmark({
        ...activeModalLandmark,
        comments: [commentObj, ...(activeModalLandmark.comments || [])]
      });
    }

    setNewComment({ author: '', text: '' });
  };

  // Filtered List
  const filtered = landmarks.filter(lm => {
    if (selectedCat !== 'all' && lm.category !== selectedCat) return false;
    if (selectedGov !== 'all' && lm.governorate !== selectedGov) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchAr = lm.nameAr?.toLowerCase().includes(q) || lm.descriptionAr?.toLowerCase().includes(q) || lm.areaAr?.toLowerCase().includes(q);
      const matchEn = lm.nameEn?.toLowerCase().includes(q) || lm.descriptionEn?.toLowerCase().includes(q) || lm.areaEn?.toLowerCase().includes(q);
      const matchTags = lm.tags?.some(t => t.toLowerCase().includes(q));
      return matchAr || matchEn || matchTags;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-12" dir="rtl">
      {/* Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-700 via-amber-700 to-red-900 text-white p-6 sm:p-10 shadow-xl border border-red-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-black/40 pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-amber-200 border border-white/20">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>{lang === 'ar' ? 'ركن المعالم والتراث 🇧🇭' : 'Bahrain Landmarks & Heritage'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
            تعالوا هني 🇧🇭
          </h1>
          <p className="text-sm sm:text-base text-red-100 font-medium leading-relaxed">
            {lang === 'ar'
              ? 'دليلك الاستكشافي الممتع لأجمل القلاع التاريخية، الأسواق الشعبية، المتاحف الوطنية، والشواطئ الساحرة في مملكة البحرين.'
              : 'Your guide to historic forts, traditional souqs, national museums, and beautiful beaches in the Kingdom of Bahrain.'}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث عن معلم، قلعة، سوق، أو منطقة...' : 'Search landmark, fort, souq, or area...'}
            className="w-full pr-9 pl-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-3 top-3 text-gray-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCat(cat.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                selectedCat === cat.key
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-gray-100 dark:bg-slate-700/70 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{lang === 'ar' ? cat.labelAr : cat.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Governorate filter dropdown */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
          <MapPin className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs font-bold text-gray-600 dark:text-slate-400 shrink-0">
            {lang === 'ar' ? 'تصفية حسب المحافظة:' : 'Filter by Governorate:'}
          </span>
          <select
            value={selectedGov}
            onChange={e => setSelectedGov(e.target.value)}
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs text-gray-800 dark:text-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-red-500"
          >
            {governorates.map(gov => (
              <option key={gov.key} value={gov.key}>{lang === 'ar' ? gov.labelAr : gov.labelEn}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Landmarks Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-3">
          <Compass className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto opacity-50 animate-bounce" />
          <p className="text-sm font-bold text-gray-600 dark:text-slate-400">
            {lang === 'ar' ? 'لم نجد معالم تطابق بحثك حالياً' : 'No landmarks found matching your search'}
          </p>
          <button
            onClick={() => { setSelectedCat('all'); setSelectedGov('all'); setSearch(''); }}
            className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl"
          >
            {lang === 'ar' ? 'إعادة عرض كافة المعالم' : 'Show All Landmarks'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(lm => (
            <div
              key={lm.id}
              onClick={() => setActiveModalLandmark(lm)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Image & Badges */}
                <div className="relative h-48 bg-gray-100 dark:bg-slate-900 overflow-hidden">
                  <img
                    src={optimizeImageUrl(lm.image) || 'https://images.unsplash.com/photo-1578895210405-907db486c111?q=80&w=800&auto=format&fit=crop&fm=webp'}
                    alt={lang === 'ar' ? lm.nameAr : (lm.nameEn || lm.nameAr)}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 right-3 left-3 flex items-center justify-between pointer-events-none">
                    {lm.isFeatured && (
                      <span className="px-2.5 py-1 bg-amber-500 text-white font-extrabold text-[10px] rounded-full shadow-md flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {lang === 'ar' ? 'معلم بارز' : 'Featured'}
                      </span>
                    )}
                    {lm.entryFee && (
                      <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white font-bold text-[10px] rounded-full border border-white/20 mr-auto">
                        {lm.entryFee}
                      </span>
                    )}
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 right-3 left-3 text-white">
                    <h3 className="font-extrabold text-base leading-tight group-hover:text-amber-300 transition-colors">
                      {lang === 'ar' ? lm.nameAr : (lm.nameEn || lm.nameAr)}
                    </h3>
                    <p className="text-xs text-amber-200/90 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{lang === 'ar' ? lm.areaAr : lm.areaEn} {lm.governorate ? `(${lm.governorate})` : ''}</span>
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {lang === 'ar' ? lm.descriptionAr : (lm.descriptionEn || lm.descriptionAr)}
                  </p>

                  {/* Tags */}
                  {lm.tags && lm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {lm.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-900/30">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 pt-0 border-t border-gray-100 dark:border-slate-700/60 mt-2 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => handleLike(lm.id, e)}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  <Heart className="h-3.5 w-3.5 fill-rose-500" />
                  <span>{lm.likesCount || 0}</span>
                </button>

                <div className="flex items-center gap-2">
                  {lm.googleMapsUrl && (
                    <a
                      href={lm.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all"
                      title={lang === 'ar' ? 'خريطة المعلم' : 'Map'}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                    {lang === 'ar' ? 'التفاصيل والقصة' : 'Details'}
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {activeModalLandmark && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700 shadow-2xl relative space-y-6 p-6">
            {/* Close button */}
            <button
              onClick={() => setActiveModalLandmark(null)}
              className="absolute top-4 left-4 z-10 w-9 h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Image */}
            <div className="relative h-64 -mx-6 -mt-6 bg-gray-900 rounded-t-3xl overflow-hidden">
              <img
                src={optimizeImageUrl(activeModalLandmark.image) || 'https://images.unsplash.com/photo-1578895210405-907db486c111?q=80&w=1200&auto=format&fit=crop&fm=webp'}
                alt={activeModalLandmark.nameAr}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-black/30 to-transparent" />
              <div className="absolute bottom-4 right-6 left-6 text-white space-y-1">
                <div className="inline-block px-3 py-1 bg-amber-500 text-white font-extrabold text-xs rounded-full shadow-md mb-1">
                  {lang === 'ar' ? 'معالم البحرين' : 'Bahrain Landmark'}
                </div>
                <h2 className="text-2xl font-extrabold text-white">
                  {lang === 'ar' ? activeModalLandmark.nameAr : (activeModalLandmark.nameEn || activeModalLandmark.nameAr)}
                </h2>
                <p className="text-xs text-amber-200 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{activeModalLandmark.areaAr} {activeModalLandmark.governorate ? `(${activeModalLandmark.governorate})` : ''}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center justify-end gap-3 p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center gap-2">
                {activeModalLandmark.googleMapsUrl && (
                  <a
                    href={activeModalLandmark.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'الموقع على الخريطة' : 'Open in Maps'}</span>
                  </a>
                )}
                {activeModalLandmark.phone && (
                  <a
                    href={`tel:${activeModalLandmark.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
                {activeModalLandmark.instagram && (
                  <a
                    href={`https://instagram.com/${activeModalLandmark.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Main Info Blocks */}
            <div className="space-y-4 text-right">
              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  {lang === 'ar' ? 'عن هذا المعلم:' : 'About:'}
                </h4>
                <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed font-medium">
                  {lang === 'ar' ? activeModalLandmark.descriptionAr : (activeModalLandmark.descriptionEn || activeModalLandmark.descriptionAr)}
                </p>
              </div>

              {/* Historical Overview */}
              {activeModalLandmark.historicalOverview && (
                <div className="p-4 bg-amber-50/50 dark:bg-slate-900/60 rounded-2xl border border-amber-100 dark:border-slate-700 space-y-1">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    <span>{lang === 'ar' ? 'اللمحة التاريخية والثقافية:' : 'Historical Highlights:'}</span>
                  </h4>
                  <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                    {activeModalLandmark.historicalOverview}
                  </p>
                </div>
              )}

              {/* Work Hours & Entrance Fees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {activeModalLandmark.workHours && (
                  <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex items-start gap-2">
                    <Clock className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800 dark:text-slate-200 block mb-0.5">
                        {lang === 'ar' ? 'أوقات الزيارة:' : 'Opening Hours:'}
                      </span>
                      <span className="text-gray-600 dark:text-slate-400">{activeModalLandmark.workHours}</span>
                    </div>
                  </div>
                )}
                {activeModalLandmark.entryFee && (
                  <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800 dark:text-slate-200 block mb-0.5">
                        {lang === 'ar' ? 'رسوم الدخول:' : 'Entry Fee:'}
                      </span>
                      <span className="text-gray-600 dark:text-slate-400">{activeModalLandmark.entryFee}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visitor Comments & Tips Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-4">
              <h4 className="font-bold text-sm text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-red-500" />
                <span>{lang === 'ar' ? 'توصيات وتعليقات الزوار' : 'Visitor Tips & Reviews'}</span>
              </h4>

              {/* Comment Input */}
              <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2">
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'اسمك...' : 'Your name...'}
                  value={newComment.author}
                  onChange={e => setNewComment({ ...newComment, author: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'اكتب نصيحة أو انطباعك عن هذا المعلم...' : 'Write a tip or impression...'}
                    value={newComment.text}
                    onChange={e => setNewComment({ ...newComment, text: e.target.value })}
                    className="flex-1 text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 outline-none"
                  />
                  <button
                    onClick={() => handleAddComment(activeModalLandmark.id)}
                    className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
                  >
                    {lang === 'ar' ? 'إضافة' : 'Post'}
                  </button>
                </div>
              </div>

              {/* List of comments */}
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {(!activeModalLandmark.comments || activeModalLandmark.comments.length === 0) ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic text-center py-2">
                    {lang === 'ar' ? 'لا توجد تعليقات حتى الآن، كن أول من يضيف توصية!' : 'No tips yet. Be the first to add one!'}
                  </p>
                ) : (
                  activeModalLandmark.comments.map(c => (
                    <div key={c.id} className="p-2.5 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-700 text-xs space-y-0.5">
                      <div className="flex justify-between items-center font-bold text-gray-800 dark:text-slate-200">
                        <span>{c.author}</span>
                        <span className="text-[10px] text-gray-400 font-normal">{c.date}</span>
                      </div>
                      <p className="text-gray-600 dark:text-slate-300">{c.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LANDMARKS ADMIN PANEL ───────────────────────────────────────────────────

export function LandmarksAdminPanel({
  landmarks,
  setLandmarks,
  lang,
  t
}: {
  landmarks: Landmark[];
  setLandmarks: React.Dispatch<React.SetStateAction<Landmark[]>>;
  lang: string;
  t: any;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const emptyForm: Partial<Landmark> = {
    nameAr: '',
    nameEn: '',
    category: 'heritage',
    governorate: 'محافظة العاصمة',
    areaAr: '',
    areaEn: '',
    descriptionAr: '',
    descriptionEn: '',
    historicalOverview: '',
    image: '',
    googleMapsUrl: '',
    workHours: '',
    entryFee: '',
    phone: '',
    instagram: '',
    isFeatured: false,
    likesCount: 0
  };

  const [form, setForm] = useState<Partial<Landmark>>(emptyForm);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleEdit = (lm: Landmark) => {
    setForm(lm);
    setEditingId(lm.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(lang === 'ar' ? 'هل أنت تأكد من حذف هذا المعلم السياحي؟' : 'Delete this landmark?')) {
      setLandmarks(prev => prev.filter(l => l.id !== id));
      showToastMsg(lang === 'ar' ? 'تم حذف المعلم بنجاح' : 'Landmark deleted');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameAr?.trim() || !form.descriptionAr?.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال اسم المعلم والوصف بالعربية' : 'Please fill in name and description');
      return;
    }

    if (editingId) {
      setLandmarks(prev => prev.map(lm => lm.id === editingId ? { ...lm, ...form } as Landmark : lm));
      showToastMsg(lang === 'ar' ? 'تم تحديث بيانات المعلم بنجاح!' : 'Landmark updated successfully!');
    } else {
      const newLandmark: Landmark = {
        ...form as Landmark,
        id: 'lm-' + Date.now(),
        createdAt: new Date().toISOString(),
        likesCount: form.likesCount || 0
      };
      setLandmarks(prev => [newLandmark, ...prev]);
      showToastMsg(lang === 'ar' ? 'تم إضافة المعلم السياحي الجديد بنجاح!' : 'New landmark added successfully!');
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const filtered = landmarks.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.nameAr.toLowerCase().includes(q) || (l.nameEn && l.nameEn.toLowerCase().includes(q)) || (l.areaAr && l.areaAr.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl text-center shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
        <div>
          <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-600" />
            <span>{lang === 'ar' ? 'إدارة المعالم السياحية والتراثية (تعالوا هني 🇧🇭)' : 'Manage Bahrain Landmarks'}</span>
          </h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
            {lang === 'ar' ? 'إضافة وتعديل المواقع التراثية والسياحية والأسواق والمتاحف المصلحة للجمهور' : 'Add and manage cultural landmarks, forts, souqs, and parks'}
          </p>
        </div>

        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{lang === 'ar' ? 'إضافة معلم سياحي جديد' : 'Add New Landmark'}</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4 shadow-xl">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700">
            <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">
              {editingId ? (lang === 'ar' ? 'تعديل المعلم السياحي' : 'Edit Landmark') : (lang === 'ar' ? 'إضافة معلم سياحي جديد' : 'Add Landmark')}
            </h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">اسم المعلم بالعربية *</label>
              <input
                type="text" required value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })}
                placeholder="مثال: قلعة البحرين"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Name in English</label>
              <input
                type="text" value={form.nameEn || ''} onChange={e => setForm({ ...form, nameEn: e.target.value })}
                placeholder="e.g. Bahrain Fort"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">التصنيف</label>
              <select
                value={form.category || 'heritage'} onChange={e => setForm({ ...form, category: e.target.value as any })}
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              >
                <option value="heritage">مواقع تراثية وآثار</option>
                <option value="souqs">أسواق شعبية وتراثية</option>
                <option value="museums">متاحف وثقافة</option>
                <option value="sights">معالم طبيعية وسياحية</option>
                <option value="beaches">شواطئ وجزر</option>
                <option value="parks">حدائق ومنتزهات</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">المحافظة</label>
              <select
                value={form.governorate || 'محافظة العاصمة'} onChange={e => setForm({ ...form, governorate: e.target.value })}
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              >
                <option value="محافظة العاصمة">محافظة العاصمة</option>
                <option value="محافظة المحرق">محافظة المحرق</option>
                <option value="المحافظة الشمالية">المحافظة الشمالية</option>
                <option value="المحافظة الجنوبية">المحافظة الجنوبية</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">المنطقة بالعربية</label>
              <input
                type="text" value={form.areaAr || ''} onChange={e => setForm({ ...form, areaAr: e.target.value })}
                placeholder="مثال: ضاحية السيف، المنامة، المحرق"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">الصورة الرئيسية للمعلم</label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/webp,image/avif,image/jpeg,image/png,image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const webpData = await convertFileToWebP(file);
                      setForm({ ...form, image: webpData });
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 dark:file:bg-amber-950/20 file:text-amber-700 dark:file:text-amber-400 hover:file:bg-amber-100 file:cursor-pointer"
                />
                <input
                  type="url" 
                  value={form.image || ''} 
                  onChange={e => setForm({ ...form, image: e.target.value })}
                  placeholder="أو أدخل رابط مباشر للصورة (URL)..."
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 text-xs outline-none"
                />
                {form.image && (
                  <div className="flex items-center gap-3 p-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50">
                    <img 
                      src={optimizeImageUrl(form.image)} 
                      alt="Preview" 
                      loading="lazy" 
                      decoding="async" 
                      className="w-16 h-12 rounded-lg object-cover border border-amber-300/40" 
                    />
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      تم تجهيز الصورة بصيغة WebP الحديثة والمحسنة ⚡
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">رابط خرائط جوجل (Google Maps)</label>
              <input
                type="url" value={form.googleMapsUrl || ''} onChange={e => setForm({ ...form, googleMapsUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">أوقات الزيارة / العمل</label>
              <input
                type="text" value={form.workHours || ''} onChange={e => setForm({ ...form, workHours: e.target.value })}
                placeholder="مثال: يومياً من 8 صباحاً حتى 8 مساءً"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">رسوم الدخول</label>
              <input
                type="text" value={form.entryFee || ''} onChange={e => setForm({ ...form, entryFee: e.target.value })}
                placeholder="مثال: مجاني / 1 د.ب"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">الهاتف / الانستغرام</label>
              <div className="flex gap-2">
                <input
                  type="text" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="الهاتف..."
                  className="w-1/2 p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
                />
                <input
                  type="text" value={form.instagram || ''} onChange={e => setForm({ ...form, instagram: e.target.value })}
                  placeholder="الانستغرام..."
                  className="w-1/2 p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">وصف المعلم بالعربية *</label>
              <textarea
                required rows={3} value={form.descriptionAr || ''} onChange={e => setForm({ ...form, descriptionAr: e.target.value })}
                placeholder="اكتب وصفاً جذاباً وشاملاً عن المعلم..."
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">اللمحة التاريخية والثقافية</label>
              <textarea
                rows={3} value={form.historicalOverview || ''} onChange={e => setForm({ ...form, historicalOverview: e.target.value })}
                placeholder="قصة المعلم، قيمته الأثرية والتاريخية..."
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-800 dark:text-slate-200 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured || false}
                onChange={e => setForm({ ...form, isFeatured: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>تثبيت كمعلم بارز في الأعلى ⭐</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
            >
              {editingId ? 'تعديل وحفظ' : 'إضافة المعلم'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Counter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن معلم..."
            className="w-full pr-9 pl-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-800 dark:text-slate-200 outline-none"
          />
        </div>
        <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
          المجموع: {landmarks.length} معلم
        </span>
      </div>

      {/* Table / List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 dark:bg-slate-900/80 text-gray-500 dark:text-slate-400 font-bold border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="p-3">المعلم</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">المحافظة / المنطقة</th>
                <th className="p-3">الإعجابات</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {filtered.map(lm => (
                <tr key={lm.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="p-3 font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <img 
                      src={optimizeImageUrl(lm.image)} 
                      alt="" 
                      loading="lazy" 
                      decoding="async" 
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-cover shrink-0" 
                    />
                    <div>
                      <span>{lm.nameAr}</span>
                      {lm.isFeatured && <span className="mr-1 text-[10px] text-amber-500 font-bold">⭐</span>}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-slate-300">
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-md border border-amber-200/40">
                      {lm.category}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-slate-300">{lm.areaAr} ({lm.governorate})</td>
                  <td className="p-3 font-bold text-rose-600">{lm.likesCount || 0} ❤️</td>
                  <td className="p-3 text-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => handleEdit(lm)}
                      className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg font-bold"
                      title="تعديل"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(lm.id)}
                      className="p-1.5 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-lg font-bold"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
