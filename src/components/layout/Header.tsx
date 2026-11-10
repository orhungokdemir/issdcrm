import React, { useState, useRef, useEffect } from 'react';
import { useCrm } from '../../context/CrmContext';
import {
  Menu,
  Settings,
  ChevronDown,
  LogOut,
  Sparkles,
  Search,
  SlidersHorizontal,
  Moon,
  Sun,
} from 'lucide-react';
import { applyTheme, getStoredTheme, Theme } from '../../utils/theme';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar = () => {},
  onOpenSettings = () => {},
  onLogout = () => {},
}) => {
  const {
    currentModule,
    currentUser,
  } = useCrm();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Module to Breadcrumb Label Mapping
  const moduleBreadcrumbMap: Record<string, { section: string; title: string }> = {
    dashboard: { section: 'GENEL', title: 'Dashboard' },
    activities: { section: 'YÖNETİM', title: 'Aktiviteler' },
    opportunities: { section: 'YÖNETİM', title: 'İhale / Fırsatlar' },
    requests: { section: 'YÖNETİM', title: 'Talepler' },
    proposals: { section: 'YÖNETİM', title: 'Teklifler' },
    orders: { section: 'YÖNETİM', title: 'Siparişler' },
    contracts: { section: 'YÖNETİM', title: 'Sözleşmeler' },
    guarantees: { section: 'YÖNETİM', title: 'Teminat Mektupları' },
    'activity-reports': { section: 'RAPORLAR', title: 'Aktivite Raporları' },
    'proposal-reports': { section: 'RAPORLAR', title: 'Teklif Raporları' },
    users: { section: 'SİSTEM', title: 'Kullanıcılar' },
    customers: { section: 'SİSTEM', title: 'Müşteriler' },
    stakeholders: { section: 'YÖNETİM', title: 'Kurum Paydaşları' },
    products: { section: 'SİSTEM', title: 'Ürünler / Hizmetler' },
  };

  const breadcrumb = moduleBreadcrumbMap[currentModule] || {
    section: 'GENEL',
    title: 'Dashboard',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 sticky top-0 z-[100] flex items-center justify-between px-4 sm:px-6 shadow-2xs">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          id="btn-mobile-sidebar-toggle"
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Turkish Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-slate-400 font-semibold tracking-wider uppercase text-[11px] hidden sm:inline">
            {breadcrumb.section}
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="font-bold text-slate-800 tracking-tight">{breadcrumb.title}</span>
        </nav>
      </div>

      {/* Right Actions & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Settings Icon */}
        <button
          id="btn-header-theme-toggle"
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
          aria-label={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          id="btn-header-settings"
          type="button"
          onClick={onOpenSettings}
          title="CRM Ayarları"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Active User's Profile Dropdown ("ORHUN GÖKDEMİR") */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="user-profile-dropdown-btn"
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 sm:px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs ring-2 ring-indigo-100 shrink-0 overflow-hidden shadow-xs">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser.fullName.charAt(0)
              )}
            </div>

            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-slate-900 tracking-tight leading-tight uppercase">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">
                {currentUser.role === 'Admin' ? 'Yönetici' : currentUser.duty}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-[200]">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-900 uppercase">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-md">
                    {currentUser.role}
                  </span>
                  <span className="text-[10px] text-slate-500">{currentUser.duty}</span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kullanıcı Tercihleri</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Oturumu Kapat</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
