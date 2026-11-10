import React, { useEffect, useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { NavigationModule, UserPermission } from '../../types';
import {
  LayoutDashboard,
  CalendarCheck,
  GitBranch,
  ClipboardList,
  FileText,
  PackageCheck,
  ScrollText,
  Landmark,
  PieChart,
  TrendingUp,
  Users,
  Building2,
  ContactRound,
  Cpu,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  History,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile = () => {},
  onExpandedChange = (_expanded: boolean) => {},
}) => {
  const [isPinned, setIsPinned] = useState(() => localStorage.getItem('issd_crm_sidebar_pinned') !== 'false');
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered || isOpenMobile;

  useEffect(() => {
    onExpandedChange(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const togglePinned = () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    localStorage.setItem('issd_crm_sidebar_pinned', String(nextPinned));
  };
  const {
    currentModule,
    setCurrentModule,
    hasPermission,
    activities,
    opportunities,
    requests,
    proposals,
    orders,
    contracts,
    guaranteeLetters,
    customers,
    stakeholders,
    products,
    users,
  } = useCrm();

  const handleNavClick = (mod: NavigationModule) => {
    setCurrentModule(mod);
    onCloseMobile();
  };

  const navGroups = [
    {
      groupTitle: 'GENEL',
      items: [
        {
          id: 'dashboard' as NavigationModule,
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: undefined,
          permission: 'dashboard.view' as UserPermission,
        },
      ],
    },
    {
      groupTitle: 'YÖNETİM',
      items: [
        {
          id: 'activities' as NavigationModule,
          label: 'Aktiviteler',
          icon: CalendarCheck,
          badge: activities.length,
          permission: 'activities.view' as UserPermission,
        },
        {
          id: 'opportunities' as NavigationModule,
          label: 'İhale / Fırsatlar',
          icon: GitBranch,
          badge: opportunities.length,
          permission: 'opportunities.view' as UserPermission,
        },
        {
          id: 'requests' as NavigationModule,
          label: 'Talepler',
          icon: ClipboardList,
          badge: requests.length,
          permission: 'requests.view' as UserPermission,
        },
        {
          id: 'proposals' as NavigationModule,
          label: 'Teklifler',
          icon: FileText,
          badge: proposals.length,
          permission: 'proposals.view' as UserPermission,
        },
        {
          id: 'orders' as NavigationModule,
          label: 'Siparişler',
          icon: PackageCheck,
          badge: orders.length,
          permission: 'orders.view' as UserPermission,
        },
        {
          id: 'contracts' as NavigationModule,
          label: 'Sözleşmeler',
          icon: ScrollText,
          badge: contracts.length,
          permission: 'contracts.view' as UserPermission,
        },
        {
          id: 'guarantees' as NavigationModule,
          label: 'Teminat Mektupları',
          icon: Landmark,
          badge: guaranteeLetters.length,
          permission: 'guaranteeLetters.view' as UserPermission,
        },
      ],
    },
    {
      groupTitle: 'RAPORLAR',
      items: [
        {
          id: 'activity-reports' as NavigationModule,
          label: 'Aktivite Raporları',
          icon: PieChart,
          badge: undefined,
          permission: 'reports.view' as UserPermission,
        },
        {
          id: 'proposal-reports' as NavigationModule,
          label: 'Teklif Raporları',
          icon: TrendingUp,
          badge: undefined,
          permission: 'reports.view' as UserPermission,
        },
      ],
    },
    {
      groupTitle: 'SİSTEM',
      items: [
        {
          id: 'users' as NavigationModule,
          label: 'Kullanıcılar',
          icon: Users,
          badge: users.length,
          permission: 'users.manage' as UserPermission,
        },
        {
          id: 'customers' as NavigationModule,
          label: 'Müşteriler',
          icon: Building2,
          badge: customers.length,
          permission: 'customers.manage' as UserPermission,
        },
        {
          id: 'stakeholders' as NavigationModule,
          label: 'Kurum Paydaşları',
          icon: ContactRound,
          badge: stakeholders.length,
          permission: 'stakeholders.view' as UserPermission,
        },
        {
          id: 'products' as NavigationModule,
          label: 'Ürünler / Hizmetler',
          icon: Cpu,
          badge: products.length,
          permission: 'products.manage' as UserPermission,
        },
        {
          id: 'audit-logs' as NavigationModule,
          label: 'Audit Logları',
          icon: History,
          badge: undefined,
          permission: 'users.manage' as UserPermission,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar-navigation"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 bottom-0 z-40 ${isExpanded ? 'w-64' : 'w-20'} bg-white text-slate-700 flex flex-col border-r border-slate-200/90 transition-[width,transform] duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className={`h-16 flex items-center ${isExpanded ? 'justify-between px-5' : 'justify-center px-3'} border-b border-slate-100 bg-white`}>
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/dashboard');
              setCurrentModule('dashboard');
              onCloseMobile();
            }}
            title="Dashboard'a git"
            aria-label="Dashboard'a git"
            className="flex items-center gap-3 min-w-0 text-left"
          >
            <img
              src="/issd-logo.png"
              alt="ISSD"
              className={`${isExpanded ? 'w-20 h-10' : 'w-14 h-9'} object-contain shrink-0 transition-all duration-200`}
            />
            <div className={`flex flex-col ${isExpanded ? '' : 'hidden'}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-sm">CRM</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded-sm border border-indigo-200/60">
                  B2B
                </span>
              </div>

            </div>
          </button>
          <button
            type="button"
            onClick={togglePinned}
            title={isPinned ? 'Menüyü daralt ve pinini kaldır' : 'Menüyü aç ve pinle'}
            aria-label={isPinned ? 'Menüyü daralt ve pinini kaldır' : 'Menüyü aç ve pinle'}
            className="hidden lg:inline-flex p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            {isPinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className={`flex-1 overflow-y-auto py-4 ${isExpanded ? 'px-3' : 'px-2'} space-y-6`}>
          {navGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className={`px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${isExpanded ? '' : 'text-center px-0'}`}>
                {isExpanded ? group.groupTitle : <span className="text-[10px]">{group.groupTitle.slice(0, 1)}</span>}
              </div>
              <div className="mt-1.5 space-y-0.5">
                {group.items.filter((item) => hasPermission(item.permission)).map((item) => {
                  const Icon = item.icon;
                  const isActive = currentModule === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`flex items-center ${isExpanded ? 'gap-2.5' : 'justify-center w-full'}`}>
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />
                        <span className={isExpanded ? '' : 'hidden'}>{item.label}</span>
                      </div>

                      {isExpanded && item.badge !== undefined ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                            isActive
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : isExpanded && isActive ? (
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Info */}
        <div className={`p-3.5 border-t border-slate-100 bg-slate-50/70 ${isExpanded ? '' : 'p-2'}`}>
          <div className={`rounded-lg bg-white p-2.5 border border-slate-200/80 flex items-center ${isExpanded ? 'gap-2.5' : 'justify-center'} shadow-2xs`}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div className={`flex-1 min-w-0 ${isExpanded ? '' : 'hidden'}`}>
              <p className="text-[11px] font-semibold text-slate-800 truncate">ISSD Bilişim A.Ş.</p>
              <p className="text-[10px] text-slate-400">Sistem Aktif & Güvenli</p>
            </div>
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
};

