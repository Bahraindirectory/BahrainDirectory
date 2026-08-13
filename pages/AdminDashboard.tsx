import React, { useState, useMemo, useRef } from 'react';
import {
  BarChart3,
  Database,
  Layers,
  Image as ImageIcon,
  Users,
  Settings,
  Archive,
  RefreshCw,
  Search,
  Trash2,
  Plus,
  Edit,
  X,
  Download,
  FileSpreadsheet,
  Play,
  Lock,
  Star,
  Crown,
  Clock,
  Shirt,
  Car
} from 'lucide-react';
import { Business, Category, Ad, User, SiteConfig, Language } from '../types';

// Dynamic import of SheetJS inside ES module environment
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

interface AdminDashboardProps {
  lang: Language;
  t: any;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  businesses: Business[];
  setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>;
  members: User[];
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  ads: Ad[];
  setAds: React.Dispatch<React.SetStateAction<Ad[]>>;
  siteConfig: SiteConfig;
  setSiteConfig: React.Dispatch<React.SetStateAction<SiteConfig>>;
  isLoggedIn: boolean;
  onLogin: (u: string, p: string) => void;
  sheetUrl: string;
  setSheetUrl: (url: string) => void;
  handleSheetSync: (url: string) => Promise<boolean>;
}

const IconMap: Record<string, React.ComponentType<any>> = {
  Utensils,
  ShoppingCart,
  HeartPulse,
  Car,
  ShoppingBag,
  Home,
  Layers
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  t,
  categories,
  setCategories,
  businesses,
  setBusinesses,
  members,
  setMembers,
  ads,
  setAds,
  siteConfig,
  setSiteConfig,
  isLoggedIn,
  onLogin,
  sheetUrl,
  setSheetUrl,
  handleSheetSync
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'businesses' | 'categories' | 'members' | 'sync' | 'ads' | 'settings' | 'backup'>('reports');
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [exportCategory, setExportCategory] = useState<string>('all');
  const [loginU, setLoginU] = useState('');
  const [loginP, setLoginP] = useState('');
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);

  // New sub-category temp state
  const [newSubCat, setNewSubCat] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredBusinesses = useMemo(() => {
    if (!searchTerm.trim()) return businesses;
    const term = searchTerm.toLowerCase();
    return businesses.filter((b: Business) =>
      b.nameAr.toLowerCase().includes(term) ||
      b.nameEn.toLowerCase().includes(term) ||
      b.phone.includes(term) ||
      b.block.includes(term) ||
      b.areaAr.toLowerCase().includes(term) ||
      b.areaEn.toLowerCase().includes(term) ||
      (b.activities && b.activities.toLowerCase().includes(term))
    );
  }, [businesses, searchTerm]);

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        // Map data to Business interface
        const newBusinesses: Business[] = data.map((row: any, idx: number) => ({
          id: row.ID?.toString() || row.id?.toString() || `excel-${idx}-${Date.now()}`,
          nameAr: row["Name (AR)"] || row.NameAr || row.nameAr || '',
          nameEn: row["Name (EN)"] || row.NameEn || row.nameEn || '',
          category: row.Category || row.category || 'services',
          subCategory: row["Sub Category"] || row.SubCategory || row.subCategory || '',
          areaAr: row["Area (AR)"] || row.AreaAr || row.areaAr || '',
          areaEn: row["Area (EN)"] || row.AreaEn || row.areaEn || '',
          block: row.Block?.toString() || row.block?.toString() || '',
          phone: (row.Phone?.toString() || row.phone?.toString() || '').replace(/\D/g, '').slice(0, 8),
          instagram: row.Instagram || row.instagram || '',
          googleMapsUrl: row["Google Maps URL"] || row.GoogleMapsUrl || row.googleMapsUrl || '',
          image: row["Image URL"] || row.Image || row.image || `https://picsum.photos/seed/${idx}/400/300`,
          activities: row.Activities || row.activities || '',
          workHours: row["Work Hours"] || row.WorkHours || row.workHours || '',
          governorate: row.Governorate || row.governorate || '',
          isPriority: row.Priority === 'TRUE' || row.Priority === true || row.Priority === 1 || row.priority === true,
          hasAdPage: false
        }));

        if (newBusinesses.length > 0) {
          if (window.confirm(lang === 'ar' ? `سيتم إضافة ${newBusinesses.length} منشأة جديدة إلى القائمة الحالية. موافق؟` : `About to APPEND ${newBusinesses.length} businesses to existing list. Proceed?`)) {
            setBusinesses(prev => [...prev, ...newBusinesses]);
            alert(lang === 'ar' ? 'تمت إضافة البيانات بنجاح' : 'Data Appended Successfully');
          }
        } else {
          alert(lang === 'ar' ? 'لا توجد بيانات صالحة' : 'No valid data found');
        }
      } catch (error) {
        console.error("Import Error:", error);
        alert(lang === 'ar' ? 'حدث خطأ أثناء الاستيراد' : 'Error importing file');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File too large (Max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        callback(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-20 text-center animate-fadeIn">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700">
          <Lock className="h-12 w-12 text-red-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-6 dark:text-slate-100">{lang === 'ar' ? 'تسجيل دخول الإدارة' : 'Admin Login'}</h2>
          <form onSubmit={(e) => { e.preventDefault(); onLogin(loginU, loginP); }} className="space-y-4 text-start">
            <input 
              type="text" 
              placeholder={t.username} 
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 text-sm outline-none" 
              value={loginU} 
              onChange={e => setLoginU(e.target.value)} 
              required
            />
            <input 
              type="password" 
              placeholder={t.password} 
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 text-sm outline-none" 
              value={loginP} 
              onChange={e => setLoginP(e.target.value)} 
              required
            />
            <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-750 transition-colors">Login</button>
          </form>
        </div>
      </div>
    );
  }

  const saveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;
    const newList = businesses.map((b: Business) => b.id === editingBusiness.id ? editingBusiness : b);
    if (!newList.find((b: Business) => b.id === editingBusiness.id)) {
      setBusinesses([...businesses, { ...editingBusiness, id: Date.now().toString() }]);
    } else {
      setBusinesses(newList);
    }
    setEditingBusiness(null);
  };

  const saveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const newList = categories.map((c: Category) => c.id === editingCategory.id ? editingCategory : c);
    if (!newList.find((c: Category) => c.id === editingCategory.id)) {
      setCategories([...categories, { ...editingCategory, id: editingCategory.id || `cat-${Date.now()}` }]);
    } else {
      setCategories(newList);
    }
    setEditingCategory(null);
  };

  const saveAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;
    const newList = ads.map((a: Ad) => a.id === editingAd.id ? editingAd : a);
    setAds(newList);
    setEditingAd(null);
  };

  const saveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const newList = members.map((m: User) => m.id === editingMember.id ? editingMember : m);
    if (!newList.find((m: User) => m.id === editingMember.id)) {
      setMembers([...members, { ...editingMember, id: Date.now().toString() }]);
    } else {
      setMembers(newList);
    }
    setEditingMember(null);
  };

  const handleExportCSV = () => {
    const dataToExport = exportCategory === 'all'
      ? businesses
      : businesses.filter((b: Business) => b.category === exportCategory);

    if (dataToExport.length === 0) {
      alert(lang === 'ar' ? 'لا توجد بيانات لتصديرها' : 'No data to export');
      return;
    }

    const headers = ["ID", "NameAr", "NameEn", "Category", "SubCategory", "AreaAr", "AreaEn", "Block", "Phone", "Instagram", "GoogleMapsUrl", "ImageURL", "Activities", "WorkHours", "Governorate", "Priority"];
    const csvRows = dataToExport.map((b: Business) => [
      b.id,
      `"${b.nameAr}"`,
      `"${b.nameEn}"`,
      b.category,
      `"${b.subCategory}"`,
      `"${b.areaAr}"`,
      `"${b.areaEn}"`,
      b.block,
      b.phone,
      b.instagram || '',
      `"${b.googleMapsUrl}"`,
      `"${b.image}"`,
      `"${b.activities || ''}"`,
      `"${b.workHours || ''}"`,
      `"${b.governorate || ''}"`,
      b.isPriority ? 'TRUE' : 'FALSE'
    ].join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bahrain_directory_${exportCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = (isTemplate = false) => {
    const dataToExport = isTemplate ? [{
      id: "shop-123",
      nameAr: "كفتيريا السلام",
      nameEn: "Asalam Cafeteria",
      category: "restaurants",
      subCategory: "كفتيريات",
      areaAr: "المنامة",
      areaEn: "Manama",
      block: "304",
      phone: "17220000",
      instagram: "asalam_bh",
      googleMapsUrl: "https://maps.google.com/...",
      image: "https://example.com/image.jpg"
    }] : (exportCategory === 'all' ? businesses : businesses.filter((b: Business) => b.category === exportCategory));

    if (dataToExport.length === 0) {
      alert(lang === 'ar' ? 'لا توجد بيانات لتصديرها' : 'No data to export');
      return;
    }

    const rows = dataToExport.map((b: any) => ({
      ID: b.id,
      "Name (AR)": b.nameAr,
      "Name (EN)": b.nameEn,
      Category: b.category,
      "Sub Category": b.subCategory,
      "Area (AR)": b.areaAr,
      "Area (EN)": b.areaEn,
      Block: b.block,
      Phone: b.phone,
      Instagram: b.instagram || '',
      "Google Maps URL": b.googleMapsUrl,
      "Image URL": b.image || '',
      Activities: b.activities || '',
      "Work Hours": b.workHours || '',
      Governorate: b.governorate || '',
      Priority: b.isPriority ? 'TRUE' : 'FALSE'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isTemplate ? "Template" : "Data");
    XLSX.writeFile(workbook, isTemplate ? `bh_directory_template.xlsx` : `bh_data_${exportCategory}.xlsx`);
  };

  const handleFullBackup = () => {
    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      categories,
      businesses,
      ads,
      members,
      siteConfig,
      sheetUrl
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bh_directory_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(t.restoreWarning)) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = JSON.parse(content);

        if (data.categories && data.businesses) {
          if (data.categories) setCategories(data.categories);
          if (data.businesses) setBusinesses(data.businesses);
          if (data.ads) setAds(data.ads);
          if (data.members) setMembers(data.members);
          if (data.siteConfig) setSiteConfig(data.siteConfig);
          if (data.sheetUrl !== undefined) setSheetUrl(data.sheetUrl);

          alert(t.restoreSuccess);
        } else {
          alert(t.restoreError);
        }
      } catch (error) {
        console.error("Restore Error:", error);
        alert(t.restoreError);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fadeIn pb-20">
      <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <button onClick={() => setActiveTab('reports')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'reports' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-650 dark:text-slate-300'}`}><BarChart3 className="h-5 w-5" />{t.reports}</button>
        <button onClick={() => setActiveTab('businesses')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'businesses' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-650 dark:text-slate-300'}`}><Database className="h-5 w-5" />{t.manageBusinesses}</button>
        <button onClick={() => setActiveTab('categories')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'categories' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-655 dark:text-slate-300'}`}><Layers className="h-5 w-5" />{t.manageCategories}</button>
        <button onClick={() => setActiveTab('ads')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'ads' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-650 dark:text-slate-300'}`}><ImageIcon className="h-5 w-5" />{t.manageAds}</button>
        <button onClick={() => setActiveTab('members')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'members' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-650 dark:text-slate-300'}`}><Users className="h-5 w-5" />{t.manageMembers}</button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'settings' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-650 dark:text-slate-300'}`}><Settings className="h-5 w-5" />{lang === 'ar' ? 'الإعدادات' : 'Settings'}</button>
        <button onClick={() => setActiveTab('backup')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'backup' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-650 dark:text-slate-300'}`}><Archive className="h-5 w-5" />{t.backupRestore}</button>
        <button onClick={() => setActiveTab('sync')} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'sync' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-650 dark:text-slate-300'}`}><RefreshCw className="h-5 w-5" />{t.syncSheet}</button>
      </div>

      {activeTab === 'reports' && (
        <div className="space-y-8 animate-fadeIn">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-605 dark:text-red-400 rounded-xl flex items-center justify-center">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">{t.totalBusinesses}</p>
                <h3 className="text-2xl font-black dark:text-slate-100">{businesses.length}</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">{t.totalMembers}</p>
                <h3 className="text-2xl font-black dark:text-slate-100">{members.length}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">{t.totalVisitors}</p>
                <h3 className="text-2xl font-black dark:text-slate-100">{localStorage.getItem('visitorCount') || 0}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">{t.activeAds}</p>
                <h3 className="text-2xl font-black dark:text-slate-100">{ads.filter(a => a.active).length}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-slate-100"><BarChart3 className="h-5 w-5 text-red-600" /> {t.businessesByCategory}</h3>
              <div className="space-y-4">
                {categories.map(cat => {
                  const count = businesses.filter(b => b.category === cat.id).length;
                  const percentage = businesses.length > 0 ? (count / businesses.length) * 100 : 0;
                  return (
                    <div key={cat.id} className="space-y-2">
                      <div className="flex justify-between text-sm font-bold dark:text-slate-200">
                        <span>{lang === 'ar' ? cat.titleAr : cat.titleEn}</span>
                        <span className="text-gray-400 dark:text-slate-500">{count}</span>
                      </div>
                      <div className="h-3 bg-gray-50 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-slate-100"><Users className="h-5 w-5 text-blue-600" /> {t.membersByRole}</h3>
              <div className="space-y-6">
                {['admin', 'editor'].map(role => {
                  const count = members.filter(m => m.role === role).length;
                  return (
                    <div key={role} className="flex items-center justify-between p-4 bg-gray-55 dark:bg-slate-900 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold uppercase ${role === 'admin' ? 'bg-red-105 text-red-650' : 'bg-blue-100 text-blue-600'}`}>
                          {role[0]}
                        </div>
                        <span className="font-bold capitalize dark:text-slate-350">{role}</span>
                      </div>
                      <span className="text-xl font-black dark:text-slate-100">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-205 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
            <div className="relative">
              <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-gray-405 pointer-events-none`} />
              <input
                type="text"
                className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 md:py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-900 dark:text-slate-100 text-sm md:text-base`}
                placeholder={lang === 'ar' ? 'بحث باسم المنشأة، الهاتف، المجمع...' : 'Search by name, phone, block...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-3 md:gap-4 px-1">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-red-600 rounded cursor-pointer focus:ring-red-500"
                  checked={filteredBusinesses.length > 0 && selectedBusinessIds.length === filteredBusinesses.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedBusinessIds(filteredBusinesses.map(b => b.id));
                    else setSelectedBusinessIds([]);
                  }}
                />
                <span className="font-bold text-gray-700 dark:text-slate-300 whitespace-nowrap text-sm">{t.selectAll} ({selectedBusinessIds.length})</span>
              </div>
              
              <div className="flex gap-2">
                {selectedBusinessIds.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(t.confirmBulkDelete.replace('{n}', selectedBusinessIds.length.toString()))) {
                        setBusinesses(businesses.filter(b => !selectedBusinessIds.includes(b.id)));
                        setSelectedBusinessIds([]);
                        alert(t.bulkDeleteSuccess);
                      }
                    }}
                    className="flex-1 sm:flex-none justify-center bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-3 md:px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all border border-red-100 dark:border-red-900/30 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="whitespace-nowrap">{t.deleteSelected}</span>
                  </button>
                )}
                
                <button
                  onClick={() => setEditingBusiness({ id: '', nameAr: '', nameEn: '', category: categories[0]?.id || '', subCategory: '', areaAr: '', areaEn: '', block: '', phone: '', googleMapsUrl: '', image: 'https://picsum.photos/seed/new/400/300', activities: '', workHours: '', governorate: '' })}
                  className="flex-1 sm:flex-none justify-center bg-red-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-red-750 transition-colors text-sm md:text-base"
                >
                  <Plus className="h-5 w-5" />
                  <span className="whitespace-nowrap">{t.addBusiness}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredBusinesses.map(b => (
              <div 
                key={b.id} 
                className={`bg-white dark:bg-slate-800 p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                  selectedBusinessIds.includes(b.id) ? 'border-red-200 bg-red-50/10 dark:bg-red-950/10 shadow-md' : 'border-gray-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-red-600 rounded cursor-pointer focus:ring-red-500"
                    checked={selectedBusinessIds.includes(b.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBusinessIds([...selectedBusinessIds, b.id]);
                      else setSelectedBusinessIds(selectedBusinessIds.filter(id => id !== b.id));
                    }}
                  />
                  <img src={b.image || 'https://picsum.photos/seed/placeholder/100/100'} alt={b.nameEn} className="w-16 h-16 rounded-lg object-cover bg-gray-100 dark:bg-slate-900 border border-gray-100 dark:border-slate-700" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-slate-100">{lang === 'ar' ? b.nameAr : b.nameEn}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        {categories.find(c => c.id === b.category)?.titleAr || b.category} - {b.block}
                      </p>
                      {b.ratingCount ? (
                        <div className="flex items-center gap-0.5 text-[10px] bg-yellow-50 dark:bg-yellow-950/20 text-yellow-605 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                          <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                          {(b.ratingSum! / b.ratingCount!).toFixed(1)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => setEditingBusiness(b)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit className="h-5 w-5" /></button>
                  <button onClick={() => { if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) setBusinesses(businesses.filter(x => x.id !== b.id)) }} className="p-2 text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-650 hover:text-white transition-all"><Trash2 className="h-5 w-5" /></button>
                </div>
              </div>
            ))}
            
            {filteredBusinesses.length === 0 && (
              <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-gray-100 dark:border-slate-700 text-center space-y-4">
                <div className="w-20 h-20 bg-gray-50 dark:bg-slate-900 text-gray-300 dark:text-slate-700 rounded-full flex items-center justify-center mx-auto">
                  <Search className="h-10 w-10" />
                </div>
                <p className="text-gray-500 dark:text-slate-400 font-bold">{t.noResults}</p>
                <button onClick={() => setSearchTerm('')} className="text-red-600 text-sm font-bold hover:underline">{lang === 'ar' ? 'مسح البحث' : 'Clear search'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setEditingCategory({ id: '', titleAr: '', titleEn: '', icon: 'Layers', subCategories: [] })}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-red-750 transition-colors"
            >
              <Plus className="h-5 w-5" />{t.addCategory}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat: Category) => (
              <div key={cat.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-slate-500 rounded-xl flex items-center justify-center">
                    {IconMap[cat.icon] ? React.createElement(IconMap[cat.icon], { className: "h-6 w-6" }) : <Layers className="h-6 w-6" />}
                  </div>
                  <div>
                    <h4 className="font-bold dark:text-slate-100">{lang === 'ar' ? cat.titleAr : cat.titleEn}</h4>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{cat.subCategories.length} {t.subCategories}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingCategory(cat)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => setCategories(categories.filter(c => c.id !== cat.id))} className="p-2 text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-650 hover:text-white transition-all"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setEditingMember({ id: '', username: '', password: '', role: 'editor' })} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-red-750 transition-colors"><Plus className="h-5 w-5" />{lang === 'ar' ? 'إضافة عضو' : 'Add Member'}</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {members.map((m: User) => (
              <div key={m.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold dark:text-slate-100">{m.username}</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{m.role}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingMember(m)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit className="h-5 w-5" /></button>
                  {m.username !== 'admin' && (
                    <button onClick={() => setMembers(members.filter(x => x.id !== m.id))} className="p-2 text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-650 hover:text-white transition-all"><Trash2 className="h-5 w-5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xl font-bold mb-6 dark:text-slate-100">{lang === 'ar' ? 'إعدادات الموقع' : 'General Settings'}</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{lang === 'ar' ? 'عنوان الموقع (عربي)' : 'Site Title (Arabic)'}</label>
              <input type="text" className="w-full p-3 bg-gray-55 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 text-sm outline-none" value={siteConfig.titleAr} onChange={e => setSiteConfig({ ...siteConfig, titleAr: e.target.value })} />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{lang === 'ar' ? 'عنوان الموقع (إنجليزي)' : 'Site Title (English)'}</label>
              <input type="text" className="w-full p-3 bg-gray-55 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 text-sm outline-none" value={siteConfig.titleEn} onChange={e => setSiteConfig({ ...siteConfig, titleEn: e.target.value })} />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{lang === 'ar' ? 'رابط الشعار (URL)' : 'Logo URL'}</label>
              <div className="flex gap-2">
                <input type="text" className="flex-1 p-3 bg-gray-55 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 text-sm outline-none" value={siteConfig.logoUrl} onChange={e => setSiteConfig({ ...siteConfig, logoUrl: e.target.value })} placeholder="https://example.com/logo.png" />
                {siteConfig.logoUrl && <img src={siteConfig.logoUrl} alt="Logo Preview" className="w-12 h-12 rounded-lg border object-contain bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700" />}
              </div>
              <p className="text-[10px] text-gray-400">{lang === 'ar' ? 'اتركه فارغاً لاستخدام الشعار الافتراضي' : 'Leave empty to use default logo'}</p>
            </div>
            
            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
              <h4 className="font-bold mb-4 text-gray-750 dark:text-slate-350">{lang === 'ar' ? 'معلومات "من نحن"' : 'About Us Content'}</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{lang === 'ar' ? 'النص بالعربية' : 'Arabic Text'}</label>
                  <textarea className="w-full p-3 bg-gray-55 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl h-32 focus:ring-2 focus:ring-red-500 outline-none text-gray-905 dark:text-slate-150 text-sm" value={siteConfig.aboutUsAr || ''} onChange={e => setSiteConfig({ ...siteConfig, aboutUsAr: e.target.value })} placeholder="اكتب نبذة عن الموقع هنا..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{lang === 'ar' ? 'النص بالإنجليزية' : 'English Text'}</label>
                  <textarea className="w-full p-3 bg-gray-55 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl h-32 focus:ring-2 focus:ring-red-500 outline-none text-gray-905 dark:text-slate-150 text-sm" value={siteConfig.aboutUsEn || ''} onChange={e => setSiteConfig({ ...siteConfig, aboutUsEn: e.target.value })} placeholder="Write about the website here..." />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ads.map((ad: Ad) => (
            <div key={ad.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h5 className="font-bold text-gray-400 dark:text-slate-500">Position: <span className="text-red-650 capitalize">{ad.position}</span></h5>
                <button onClick={() => setEditingAd(ad)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit className="h-4 w-4" /></button>
              </div>
              <div className={`${ad.heightClass} bg-gray-100 dark:bg-slate-900 rounded-xl overflow-hidden mb-4 relative`}>
                {ad.mediaType === 'image' 
                  ? <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" /> 
                  : <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-slate-900"><Play className="h-8 w-8 text-gray-400" /></div>
                }
              </div>
              <p className="text-sm font-bold text-gray-700 dark:text-slate-300">{ad.title}</p>
              <p className="text-xs text-gray-450 dark:text-slate-500">{ad.heightClass}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl shadow-blue-100 dark:shadow-none flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <FileSpreadsheet className="h-10 w-10" />
            </div>
            <div className="flex-1 text-center md:text-start">
              <h3 className="text-2xl font-black mb-2">{t.syncSheet}</h3>
              <p className="opacity-90 leading-relaxed mb-4">{t.templateInstructions}</p>
              <button
                onClick={() => handleExportXLSX(true)}
                className="bg-white text-blue-605 px-6 py-2.5 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto md:mx-0"
              >
                <Download className="h-4 w-4" />
                {t.downloadTemplate}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-slate-100"><RefreshCw className="h-5 w-5 text-red-600" /> {t.syncNow}</h3>
              <div className="space-y-4">
                <input type="text" dir="ltr" className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-slate-100 text-sm" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="Google Sheets CSV URL" />
                <button
                  disabled={isSyncing}
                  onClick={async () => { setIsSyncing(true); const s = await handleSheetSync(sheetUrl); setIsSyncing(false); alert(s ? t.syncSuccess : t.syncError); }}
                  className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 hover:bg-red-750 transition-colors"
                >
                  {isSyncing ? t.syncNow + '...' : t.syncNow}
                </button>
              </div>

              <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl">
                <h4 className="font-bold text-gray-700 dark:text-slate-400 mb-3 text-sm">أكواد الأقسام (Category IDs):</h4>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(c => (
                    <div key={c.id} className="text-[10px] bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded flex justify-between items-center">
                      <span className="font-bold text-red-600 dark:text-red-400">{c.id}</span>
                      <span className="text-gray-400 dark:text-slate-500">{lang === 'ar' ? c.titleAr : c.titleEn}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-slate-100"><Download className="h-5 w-5 text-blue-600" /> {t.exportData}</h3>
              <div className="space-y-4">
                <select className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-200 text-sm outline-none" value={exportCategory} onChange={e => setExportCategory(e.target.value)}>
                  <option value="all">{t.allCategories}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.titleAr : c.titleEn}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleExportCSV} className="bg-blue-605 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"><Download className="h-5 w-5" /> CSV</button>
                  <button onClick={() => handleExportXLSX(false)} className="bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"><FileSpreadsheet className="h-5 w-5" /> XLSX</button>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImport}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    {lang === 'ar' ? 'أخرى' : 'Other'}
                  </button>
                  <p className="text-xs text-center text-gray-400 dark:text-slate-500 mt-2">{lang === 'ar' ? 'سيتم إضافة البيانات الجديدة إلى القائمة الحالية' : 'New data will be appended to existing list'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-slate-100">
                <Settings className="h-5 w-5 text-purple-650" /> {t.adDisplaySettings}
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 dark:text-slate-400">{t.maxAdsTop}</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className="w-full p-4 bg-gray-55 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-slate-105"
                    value={siteConfig.maxAdsTop || 1}
                    onChange={e => setSiteConfig({ ...siteConfig, maxAdsTop: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 dark:text-slate-400">{t.maxAdsMiddle}</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className="w-full p-4 bg-gray-55 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-slate-105"
                    value={siteConfig.maxAdsMiddle || 1}
                    onChange={e => setSiteConfig({ ...siteConfig, maxAdsMiddle: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 dark:text-slate-400">{t.maxAdsBottom}</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className="w-full p-4 bg-gray-55 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-slate-105"
                    value={siteConfig.maxAdsBottom || 1}
                    onChange={e => setSiteConfig({ ...siteConfig, maxAdsBottom: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {lang === 'ar'
                    ? 'سيقوم النظام تلقائياً بتنسيق الإعلانات بجانب بعضها حسب العدد.'
                    : 'The system will automatically arrange ads side-by-side based on the count.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
          <div className="bg-red-600 text-white p-8 rounded-3xl shadow-xl shadow-red-100 dark:shadow-none flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <Archive className="h-10 w-10" />
            </div>
            <div className="flex-1 text-center md:text-start">
              <h3 className="text-2xl font-black mb-2">{t.backupRestore}</h3>
              <p className="opacity-90 leading-relaxed mb-4">{lang === 'ar' ? 'يمكنك تحميل نسخة كاملة من جميع بيانات الموقع واستعادتها في أي وقت.' : 'You can download a full backup of all site data and restore it at any time.'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Download className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-4 dark:text-slate-150">{t.dataBackup}</h3>
              <p className="text-gray-550 dark:text-slate-400 text-sm mb-6">{lang === 'ar' ? 'حفظ جميع المنشآت، الأقسام، الإعلانات، والأعضاء في ملف واحد.' : 'Save all businesses, categories, ads, and members in a single file.'}</p>
              <button
                onClick={handleFullBackup}
                className="w-full bg-blue-605 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                {t.backupNow}
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm text-center">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-955/20 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-4 dark:text-slate-150">{lang === 'ar' ? 'استعادة البيانات' : 'Restore Data'}</h3>
              <p className="text-gray-550 dark:text-slate-400 text-sm mb-6">{lang === 'ar' ? 'اختر ملف النسخة الاحتياطية (.json) لاستعادة البيانات.' : 'Select a backup file (.json) to restore data.'}</p>
              <input
                type="file"
                accept=".json"
                onChange={handleFullRestore}
                id="full-restore-input"
                className="hidden"
              />
              <button
                onClick={() => document.getElementById('full-restore-input')?.click()}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                {t.restoreNow}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md">
          <form onSubmit={saveCategory} className="bg-white dark:bg-slate-850 w-full max-w-xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto border border-gray-150 dark:border-slate-750">
            <div className="p-6 border-b dark:border-slate-750 flex justify-between sticky top-0 bg-white dark:bg-slate-850 z-10">
              <h3 className="text-xl font-bold dark:text-slate-105">{lang === 'ar' ? 'تعديل القسم' : 'Edit Category'}</h3>
              <button type="button" onClick={() => setEditingCategory(null)} className="dark:text-slate-350"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{t.titleAr}</label>
                  <input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingCategory.titleAr} onChange={e => setEditingCategory({ ...editingCategory, titleAr: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{t.titleEn}</label>
                  <input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingCategory.titleEn} onChange={e => setEditingCategory({ ...editingCategory, titleEn: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">ID (Internal)</label>
                <input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingCategory.id} onChange={e => setEditingCategory({ ...editingCategory, id: e.target.value })} placeholder="e.g. food, health..." required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{t.categoryIcon}</label>
                <select className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingCategory.icon} onChange={e => setEditingCategory({ ...editingCategory, icon: e.target.value })}>
                  {Object.keys(IconMap).map(icon => <option key={icon} value={icon}>{icon}</option>)}
                </select>
              </div>
              <div className="space-y-2 border-t dark:border-slate-700 pt-4">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{t.subCategories}</label>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 p-2 border dark:border-slate-700 bg-gray-55 dark:bg-slate-900 text-gray-900 dark:text-slate-105 rounded-lg outline-none" value={newSubCat} onChange={e => setNewSubCat(e.target.value)} placeholder={t.addSubCategory} />
                  <button type="button" onClick={() => { if (newSubCat) { setEditingCategory({ ...editingCategory, subCategories: [...editingCategory.subCategories, newSubCat] }); setNewSubCat(''); } }} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 dark:text-slate-205"><Plus className="h-5 w-5" /></button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editingCategory.subCategories.map((sc, i) => (
                    <div key={i} className="bg-gray-105 dark:bg-slate-900 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-bold text-gray-650 dark:text-slate-350">
                      {sc}
                      <button type="button" onClick={() => setEditingCategory({ ...editingCategory, subCategories: editingCategory.subCategories.filter((_, idx) => idx !== i) })}><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-900 flex gap-4 justify-end">
              <button type="button" onClick={() => setEditingCategory(null)} className="px-6 py-2 bg-gray-205 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold">{t.cancel}</button>
              <button type="submit" className="px-10 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl font-bold transition-colors">{t.save}</button>
            </div>
          </form>
        </div>
      )}

      {/* Business Edit Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md">
          <form onSubmit={saveBusiness} className="bg-white dark:bg-slate-850 w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto border border-gray-150 dark:border-slate-750">
            <div className="p-6 border-b dark:border-slate-750 flex justify-between sticky top-0 bg-white dark:bg-slate-850 z-10">
              <h3 className="text-xl font-bold dark:text-slate-100">{lang === 'ar' ? 'تعديل المنشأة' : 'Edit Business'}</h3>
              <button type="button" onClick={() => setEditingBusiness(null)} className="dark:text-slate-350"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Media Type</label>
                <div className="flex gap-4 dark:text-slate-305">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="btype" checked={editingBusiness.mediaType !== 'video'} onChange={() => setEditingBusiness({ ...editingBusiness, mediaType: 'image' })} /> Image</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="btype" checked={editingBusiness.mediaType === 'video'} onChange={() => setEditingBusiness({ ...editingBusiness, mediaType: 'video' })} /> Video</label>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{editingBusiness.mediaType === 'video' ? 'Video Source' : 'Image Source'}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-sm"
                    placeholder={editingBusiness.mediaType === 'video' ? "Video URL (MP4)" : "Image URL"}
                    value={editingBusiness.mediaType === 'video' ? editingBusiness.videoUrl || '' : editingBusiness.image}
                    onChange={e => editingBusiness.mediaType === 'video' ? setEditingBusiness({ ...editingBusiness, videoUrl: e.target.value }) : setEditingBusiness({ ...editingBusiness, image: e.target.value })}
                  />
                  <label className="bg-gray-250 dark:bg-slate-750 text-gray-700 dark:text-slate-300 px-4 flex items-center justify-center rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-700">
                    <span className="text-xs font-bold">Upload</span>
                    <input type="file" className="hidden" accept={editingBusiness.mediaType === 'video' ? "video/*" : "image/*"} onChange={e => handleFileUpload(e, (url) => editingBusiness.mediaType === 'video' ? setEditingBusiness({ ...editingBusiness, videoUrl: url }) : setEditingBusiness({ ...editingBusiness, image: url }))} />
                  </label>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-500">Supported: URL or Local File (Max 2MB)</p>
              </div>
              
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Name (AR)</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.nameAr} onChange={e => setEditingBusiness({ ...editingBusiness, nameAr: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Name (EN)</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.nameEn} onChange={e => setEditingBusiness({ ...editingBusiness, nameEn: e.target.value })} /></div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Category</label>
                <select className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.category} onChange={e => {
                  const newCat = e.target.value;
                  const firstSub = categories.find(c => c.id === newCat)?.subCategories[0] || '';
                  setEditingBusiness({ ...editingBusiness, category: newCat, subCategory: firstSub });
                }}>
                  {categories.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.titleAr : c.titleEn}</option>)}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Sub-Category</label>
                <select className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.subCategory} onChange={e => setEditingBusiness({ ...editingBusiness, subCategory: e.target.value })}>
                  {categories.find(c => c.id === editingBusiness.category)?.subCategories.map(sc => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                  <option value="">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
                </select>
              </div>
              
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'المحافظة' : 'Governorate'}</label>
                <select className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.governorate || ''} onChange={e => setEditingBusiness({ ...editingBusiness, governorate: e.target.value })}>
                  <option value="">Select Governorate</option>
                  <option value="Capital">{lang === 'ar' ? 'العاصمة' : 'Capital'}</option>
                  <option value="Muharraq">{lang === 'ar' ? 'المحرق' : 'Muharraq'}</option>
                  <option value="Northern">{lang === 'ar' ? 'الشمالية' : 'Northern'}</option>
                  <option value="Southern">{lang === 'ar' ? 'الجنوبية' : 'Southern'}</option>
                </select>
              </div>
              
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Area (AR)</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.areaAr} onChange={e => setEditingBusiness({ ...editingBusiness, areaAr: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Area (EN)</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.areaEn} onChange={e => setEditingBusiness({ ...editingBusiness, areaEn: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Block</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.block} onChange={e => setEditingBusiness({ ...editingBusiness, block: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">{t.phone} ({lang === 'ar' ? '8 أرقام' : '8 Digits'})</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.phone} maxLength={8} placeholder="17XXXXXX" onChange={e => setEditingBusiness({ ...editingBusiness, phone: e.target.value.replace(/\D/g, '').slice(0, 8) })} /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Instagram</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.instagram || ''} onChange={e => setEditingBusiness({ ...editingBusiness, instagram: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Google Maps URL</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.googleMapsUrl} onChange={e => setEditingBusiness({ ...editingBusiness, googleMapsUrl: e.target.value })} /></div>

              {/* Advanced features */}
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Cuisine (EN)</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.cuisine || ''} onChange={e => setEditingBusiness({ ...editingBusiness, cuisine: e.target.value })} placeholder="e.g. Italian" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Cuisine (AR)</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.cuisineAr || ''} onChange={e => setEditingBusiness({ ...editingBusiness, cuisineAr: e.target.value })} placeholder="مثال: إيطالي" /></div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Price Range</label>
                <select className="w-full p-2 border dark:border-slate-700 bg-gray-55 dark:bg-slate-900 text-gray-900 dark:text-slate-105 rounded-lg outline-none" value={editingBusiness.priceRange || ''} onChange={e => setEditingBusiness({ ...editingBusiness, priceRange: e.target.value as any })}>
                  <option value="">None</option>
                  <option value="$">$ (Low)</option>
                  <option value="$$">$$ (Medium)</option>
                  <option value="$$$">$$$ (High)</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'تاريخ الإنشاء (للشارة الجديدة)' : 'Creation Date'}</label>
                <input type="date" className="w-full p-2 border dark:border-slate-700 bg-gray-55 dark:bg-slate-900 text-gray-905 dark:text-slate-105 rounded-lg outline-none" value={editingBusiness.createdAt || ''} onChange={e => setEditingBusiness({ ...editingBusiness, createdAt: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'وقت الفتح' : 'Open Time'}</label>
                <input type="time" className="w-full p-2 border dark:border-slate-700 bg-gray-55 dark:bg-slate-900 text-gray-905 dark:text-slate-105 rounded-lg outline-none" value={editingBusiness.openTime || ''} onChange={e => setEditingBusiness({ ...editingBusiness, openTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'وقت الغلق' : 'Close Time'}</label>
                <input type="time" className="w-full p-2 border dark:border-slate-700 bg-gray-55 dark:bg-slate-900 text-gray-905 dark:text-slate-105 rounded-lg outline-none" value={editingBusiness.closeTime || ''} onChange={e => setEditingBusiness({ ...editingBusiness, closeTime: e.target.value })} />
              </div>

              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Dress Code (EN)</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.dressCodeEn || ''} onChange={e => setEditingBusiness({ ...editingBusiness, dressCodeEn: e.target.value })} placeholder="e.g. Smart Casual" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-slate-400">Dress Code (AR)</label><input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none" value={editingBusiness.dressCodeAr || ''} onChange={e => setEditingBusiness({ ...editingBusiness, dressCodeAr: e.target.value })} placeholder="مثال: أنيق غير رسمي" /></div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-650 dark:text-slate-400 bg-gray-50 dark:bg-slate-900 p-2.5 rounded-lg border border-gray-150 dark:border-slate-700">
                  <input type="checkbox" checked={editingBusiness.hasParking || false} onChange={e => setEditingBusiness({ ...editingBusiness, hasParking: e.target.checked })} className="w-4 h-4 rounded text-red-600" />
                  <span>{lang === 'ar' ? 'مواقف سيارات متوفرة' : 'Parking Available'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-655 dark:text-slate-400 bg-gray-50 dark:bg-slate-900 p-2.5 rounded-lg border border-gray-150 dark:border-slate-700">
                  <input type="checkbox" checked={editingBusiness.hasFamilySection || false} onChange={e => setEditingBusiness({ ...editingBusiness, hasFamilySection: e.target.checked })} className="w-4 h-4 rounded text-red-600" />
                  <span>{lang === 'ar' ? 'قسم عائلات متوفر' : 'Family Section Available'}</span>
                </label>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-red-605 focus:ring-red-500"
                      checked={editingBusiness.isPriority || false}
                      onChange={e => setEditingBusiness({ ...editingBusiness, isPriority: e.target.checked })}
                    />
                    <div>
                      <span className="font-bold text-gray-900 dark:text-slate-200">{t.isPriority}</span>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'البحث والنتائج سيظهر هذا العمل أولاً' : 'This business will appear first in search results'}</p>
                    </div>
                  </label>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
                      checked={editingBusiness.isFeatured || false}
                      onChange={e => setEditingBusiness({ ...editingBusiness, isFeatured: e.target.checked })}
                    />
                    <div>
                      <span className="font-bold text-gray-900 dark:text-slate-200">{lang === 'ar' ? 'منشأة راعية / مميزة (شارات التاج)' : 'Featured / Sponsored'}</span>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">{lang === 'ar' ? 'تثبيت أعلى نتائج المطاعم مع شارة مميزة' : 'Pin to top of list with a Featured label'}</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{lang === 'ar' ? 'أنشطة العمل (لالبحث)' : 'Business Activities (For Search)'}</label>
                <textarea
                  className="w-full p-2.5 border dark:border-slate-700 bg-gray-55 dark:bg-slate-900 text-gray-900 dark:text-slate-105 rounded-lg h-20 outline-none text-sm"
                  placeholder={lang === 'ar' ? 'مثال: أسعار تنافسية, توصيل مجاني, سوشي, طعام ياباني' : 'e.g., Competitive prices, Free delivery, Sushi, Japanese Food'}
                  value={editingBusiness.activities || ''}
                  onChange={e => setEditingBusiness({ ...editingBusiness, activities: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 border-t dark:border-slate-700 pt-4">
                <label className="text-sm font-bold flex items-center gap-2 mb-2 dark:text-slate-200">
                  <input type="checkbox" checked={editingBusiness.hasAdPage || false} onChange={e => setEditingBusiness({ ...editingBusiness, hasAdPage: e.target.checked })} className="w-5 h-5 text-red-600 rounded" />
                  {lang === 'ar' ? 'تفعيل صفحة الإعلان / العروض الخاصة' : 'Enable Ad Page / Special Offer'}
                </label>
                
                {editingBusiness.hasAdPage && (
                  <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{lang === 'ar' ? 'نص الإعلان' : 'Ad Content'}</label>
                      <textarea className="w-full p-2 border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg h-20 outline-none text-xs" value={editingBusiness.adPageContent || ''} onChange={e => setEditingBusiness({ ...editingBusiness, adPageContent: e.target.value })} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Ad Start Date</label>
                        <input type="date" className="w-full p-2 border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-105 rounded-lg outline-none text-xs" value={editingBusiness.adStartDate || ''} onChange={e => setEditingBusiness({ ...editingBusiness, adStartDate: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Ad End Date</label>
                        <input type="date" className="w-full p-2 border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-105 rounded-lg outline-none text-xs" value={editingBusiness.adEndDate || ''} onChange={e => setEditingBusiness({ ...editingBusiness, adEndDate: e.target.value })} />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Ad Media Type</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="radio" name="admedia" checked={editingBusiness.adPageMediaType !== 'video'} onChange={() => setEditingBusiness({ ...editingBusiness, adPageMediaType: 'image' })} /> Image</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="radio" name="admedia" checked={editingBusiness.adPageMediaType === 'video'} onChange={() => setEditingBusiness({ ...editingBusiness, adPageMediaType: 'video' })} /> Video</label>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Ad Media Source</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 p-2 border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-xs"
                          placeholder={editingBusiness.adPageMediaType === 'video' ? "Video URL" : "Image URL"}
                          value={editingBusiness.adPageMediaUrl || ''}
                          onChange={e => setEditingBusiness({ ...editingBusiness, adPageMediaUrl: e.target.value })}
                        />
                        <label className="bg-gray-250 dark:bg-slate-750 text-gray-700 dark:text-slate-305 px-3 flex items-center justify-center rounded-lg cursor-pointer hover:bg-gray-300 text-xs font-bold">
                          Upload
                          <input type="file" className="hidden" accept={editingBusiness.adPageMediaType === 'video' ? "video/*" : "image/*"} onChange={e => handleFileUpload(e, (url) => setEditingBusiness({ ...editingBusiness, adPageMediaUrl: url }))} />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-gray-55 dark:bg-slate-900 flex gap-4 justify-end">
              <button type="button" onClick={() => setEditingBusiness(null)} className="px-6 py-2 bg-gray-205 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold">{t.cancel}</button>
              <button type="submit" className="px-10 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl font-bold transition-colors">{t.save}</button>
            </div>
          </form>
        </div>
      )}

      {/* Ad Edit Modal */}
      {editingAd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md">
          <form onSubmit={saveAd} className="bg-white dark:bg-slate-850 w-full max-w-lg rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto border border-gray-150 dark:border-slate-750">
            <div className="p-6 border-b dark:border-slate-750 flex justify-between sticky top-0 bg-white dark:bg-slate-850 z-10">
              <h3 className="text-xl font-bold dark:text-slate-100">Edit Advertisement</h3>
              <button type="button" onClick={() => setEditingAd(null)} className="dark:text-slate-350"><X className="h-6 w-6" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Ad Title</label>
                <input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-sm" value={editingAd.title} onChange={e => setEditingAd({ ...editingAd, title: e.target.value })} required />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Destination Link</label>
                <input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-sm" value={editingAd.link} onChange={e => setEditingAd({ ...editingAd, link: e.target.value })} required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Position</label>
                  <select className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-sm" value={editingAd.position} onChange={e => setEditingAd({ ...editingAd, position: e.target.value as any })}>
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                    <option value="sidebar">Sidebar</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Height Class</label>
                  <input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-105 rounded-lg outline-none text-sm" value={editingAd.heightClass} onChange={e => setEditingAd({ ...editingAd, heightClass: e.target.value })} placeholder="e.g. h-40, h-64" required />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Media Type</label>
                <div className="flex gap-4 dark:text-slate-305">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="radio" name="adtype" checked={editingAd.mediaType !== 'video'} onChange={() => setEditingAd({ ...editingAd, mediaType: 'image' })} /> Image</label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="radio" name="adtype" checked={editingAd.mediaType === 'video'} onChange={() => setEditingAd({ ...editingAd, mediaType: 'video' })} /> Video</label>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">{editingAd.mediaType === 'video' ? 'Video Source' : 'Image Source'}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-xs"
                    placeholder={editingAd.mediaType === 'video' ? "Video URL" : "Image URL"}
                    value={editingAd.mediaType === 'video' ? editingAd.videoUrl || '' : editingAd.imageUrl || ''}
                    onChange={e => editingAd.mediaType === 'video' ? setEditingAd({ ...editingAd, videoUrl: e.target.value }) : setEditingAd({ ...editingAd, imageUrl: e.target.value })}
                  />
                  <label className="bg-gray-250 dark:bg-slate-750 text-gray-700 dark:text-slate-300 px-3 flex items-center justify-center rounded-lg cursor-pointer hover:bg-gray-300 text-xs font-bold">
                    Upload
                    <input type="file" className="hidden" accept={editingAd.mediaType === 'video' ? "video/*" : "image/*"} onChange={e => handleFileUpload(e, (url) => editingAd.mediaType === 'video' ? setEditingAd({ ...editingAd, videoUrl: url }) : setEditingAd({ ...editingAd, imageUrl: url }))} />
                  </label>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700 dark:text-slate-300">
                  <input type="checkbox" checked={editingAd.active} onChange={e => setEditingAd({ ...editingAd, active: e.target.checked })} className="w-4 h-4 rounded text-red-655" />
                  <span>Ad Active & Displaying</span>
                </label>
              </div>
            </div>
            
            <div className="p-6 bg-gray-55 dark:bg-slate-900 flex gap-4 justify-end">
              <button type="button" onClick={() => setEditingAd(null)} className="px-6 py-2 bg-gray-205 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold">{t.cancel}</button>
              <button type="submit" className="px-10 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl font-bold transition-colors">{t.save}</button>
            </div>
          </form>
        </div>
      )}

      {/* Member Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-md">
          <form onSubmit={saveMember} className="bg-white dark:bg-slate-850 w-full max-w-md rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-gray-150 dark:border-slate-750">
            <div className="p-6 border-b dark:border-slate-750 flex justify-between sticky top-0 bg-white dark:bg-slate-850 z-10">
              <h3 className="text-xl font-bold dark:text-slate-100">{editingMember.id ? 'Edit Member' : 'Add New Member'}</h3>
              <button type="button" onClick={() => setEditingMember(null)} className="dark:text-slate-350"><X className="h-6 w-6" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Username</label>
                <input type="text" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-sm font-bold" value={editingMember.username} onChange={e => setEditingMember({ ...editingMember, username: e.target.value })} required />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Password</label>
                <input type="password" className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-sm" value={editingMember.password || ''} onChange={e => setEditingMember({ ...editingMember, password: e.target.value })} required />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">Role</label>
                <select className="w-full p-2 border dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg outline-none text-sm" value={editingMember.role} onChange={e => setEditingMember({ ...editingMember, role: e.target.value as any })}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 bg-gray-55 dark:bg-slate-900 flex gap-4 justify-end">
              <button type="button" onClick={() => setEditingMember(null)} className="px-6 py-2 bg-gray-205 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold">{t.cancel}</button>
              <button type="submit" className="px-10 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl font-bold transition-colors">{t.save}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
