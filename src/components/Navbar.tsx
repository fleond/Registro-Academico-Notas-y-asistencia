import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  GraduationCap, 
  Users, 
  School, 
  BarChart3, 
  MessageSquare,
  ShieldCheck,
  LogOut,
  User,
  ArrowRightLeft,
  Cloud,
  CloudOff,
  RefreshCw,
  KeyRound,
  LayoutGrid,
  Layers,
  Sun,
  Moon,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Search,
  Menu,
  X,
  Sparkles,
  Check,
  Smartphone,
  Download,
  Database
} from 'lucide-react';
import { SchoolSettings, AuthUser } from '../types';
import { PwaInstallModal } from './PwaInstallModal';

export type ActiveTab = 
  | 'attendance' 
  | 'grades' 
  | 'daily_log'
  | 'teacher_schedule'
  | 'work_groups'
  | 'seating_chart'
  | 'students' 
  | 'groups' 
  | 'reports' 
  | 'whatsapp_config' 
  | 'admin'
  | 'security'
  | 'parent_portal';

interface NavItem {
  id: ActiveTab;
  label: string;
  shortLabel?: string;
  description: string;
  icon: React.ReactNode;
  badge?: number;
  category: 'classroom' | 'community' | 'reports_comm' | 'admin_system';
}

interface NavCategory {
  id: 'classroom' | 'community' | 'reports_comm' | 'admin_system';
  label: string;
  icon: React.ReactNode;
  color: string;
  items: NavItem[];
}

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  settings: SchoolSettings;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onSwitchProfile: () => void;
  pendingNotificationsCount?: number;
  syncStatus?: 'synced' | 'syncing' | 'offline';
  onManualSync?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  settings,
  currentUser,
  onLogout,
  onSwitchProfile,
  pendingNotificationsCount = 0,
  syncStatus = 'synced',
  onManualSync,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for quick search: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setOpenDropdown(null);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Define categorized navigation items based on role
  const getNavCategories = (): NavCategory[] => {
    if (!currentUser) return [];

    if (currentUser.role === 'admin') {
      return [
        {
          id: 'classroom',
          label: 'Aula & Docencia',
          icon: <BookOpen className="w-4 h-4" />,
          color: 'indigo',
          items: [
            {
              id: 'attendance',
              label: 'Asistencia Escolar',
              shortLabel: 'Asistencia',
              description: 'Toma diaria de asistencia, novedades y retardos',
              icon: <ClipboardCheck className="w-4 h-4 text-emerald-400" />,
              category: 'classroom',
            },
            {
              id: 'grades',
              label: 'Registro de Calificaciones',
              shortLabel: 'Notas',
              description: 'SIEE, ponderaciones, notas y ruleta de selección',
              icon: <GraduationCap className="w-4 h-4 text-indigo-400" />,
              category: 'classroom',
            },
            {
              id: 'daily_log',
              label: 'Diario de Campo Pedagógico',
              shortLabel: 'Diario de Campo',
              description: 'Bitácora de clase, evidencias y temas desarrollados',
              icon: <BookOpen className="w-4 h-4 text-amber-400" />,
              category: 'classroom',
            },
            {
              id: 'teacher_schedule',
              label: 'Horario de Clases',
              shortLabel: 'Horario',
              description: 'Parrilla horaria interactiva y accesos directos',
              icon: <CalendarDays className="w-4 h-4 text-sky-400" />,
              category: 'classroom',
            },
            {
              id: 'work_groups',
              label: 'Equipos ABP & Roles',
              shortLabel: 'Equipos ABP',
              description: 'Generador de grupos y aprendizaje colaborativo',
              icon: <Layers className="w-4 h-4 text-indigo-400" />,
              category: 'classroom',
            },
            {
              id: 'seating_chart',
              label: 'Plano de Puestos en el Aula',
              shortLabel: 'Plano de Aula',
              description: 'Organizador espacial de pupitres e interacciones',
              icon: <LayoutGrid className="w-4 h-4 text-emerald-400" />,
              category: 'classroom',
            },
          ],
        },
        {
          id: 'community',
          label: 'Comunidad Escolar',
          icon: <Users className="w-4 h-4" />,
          color: 'teal',
          items: [
            {
              id: 'students',
              label: 'Estudiantes & Matrícula',
              shortLabel: 'Estudiantes',
              description: 'Fichas de matrícula, acudientes y contactos',
              icon: <Users className="w-4 h-4 text-teal-400" />,
              category: 'community',
            },
            {
              id: 'groups',
              label: 'Cursos & Grupos',
              shortLabel: 'Cursos',
              description: 'Gestión de grados, salones y jornadas',
              icon: <School className="w-4 h-4 text-sky-400" />,
              category: 'community',
            },
          ],
        },
        {
          id: 'reports_comm',
          label: 'Reportes & WhatsApp',
          icon: <BarChart3 className="w-4 h-4" />,
          color: 'emerald',
          items: [
            {
              id: 'reports',
              label: 'Boletines & Estadísticas',
              shortLabel: 'Boletines',
              description: 'Informes de periodo, consolidados y gráficos',
              icon: <BarChart3 className="w-4 h-4 text-amber-400" />,
              category: 'reports_comm',
            },
            {
              id: 'whatsapp_config',
              label: 'WhatsApp & Mensajería',
              shortLabel: 'WhatsApp',
              description: 'Plantillas de notificación y bitácora de envíos',
              icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
              badge: pendingNotificationsCount > 0 ? pendingNotificationsCount : undefined,
              category: 'reports_comm',
            },
          ],
        },
        {
          id: 'admin_system',
          label: 'Administración',
          icon: <ShieldCheck className="w-4 h-4" />,
          color: 'purple',
          items: [
            {
              id: 'admin',
              label: 'Panel Institucional Admin',
              shortLabel: 'Panel Admin',
              description: 'Docentes, asignaturas, SIEE, ajustes y base de datos',
              icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
              category: 'admin_system',
            },
            {
              id: 'security',
              label: 'Seguridad & Credenciales',
              shortLabel: 'Seguridad',
              description: 'Claves de acceso, recuperación y permisos',
              icon: <KeyRound className="w-4 h-4 text-amber-400" />,
              category: 'admin_system',
            },
          ],
        },
      ];
    }

    if (currentUser.role === 'teacher') {
      return [
        {
          id: 'classroom',
          label: 'Aula & Docencia',
          icon: <BookOpen className="w-4 h-4" />,
          color: 'indigo',
          items: [
            {
              id: 'attendance',
              label: 'Asistencia & Novedades',
              shortLabel: 'Asistencia',
              description: 'Toma diaria de asistencia, novedades y retardos',
              icon: <ClipboardCheck className="w-4 h-4 text-emerald-400" />,
              category: 'classroom',
            },
            {
              id: 'grades',
              label: 'Registro de Notas',
              shortLabel: 'Notas',
              description: 'Calificaciones, porcentajes y ruleta de selección',
              icon: <GraduationCap className="w-4 h-4 text-indigo-400" />,
              category: 'classroom',
            },
            {
              id: 'daily_log',
              label: 'Diario de Campo',
              shortLabel: 'Diario',
              description: 'Bitácora pedagógica de clase y evidencias',
              icon: <BookOpen className="w-4 h-4 text-amber-400" />,
              category: 'classroom',
            },
            {
              id: 'teacher_schedule',
              label: 'Horario de Clases',
              shortLabel: 'Horario',
              description: 'Mi parrilla horaria interactiva semanal',
              icon: <CalendarDays className="w-4 h-4 text-sky-400" />,
              category: 'classroom',
            },
            {
              id: 'work_groups',
              label: 'Equipos ABP & Roles',
              shortLabel: 'Equipos ABP',
              description: 'Grupos de trabajo colaborativo',
              icon: <Layers className="w-4 h-4 text-indigo-400" />,
              category: 'classroom',
            },
            {
              id: 'seating_chart',
              label: 'Plano de Puestos',
              shortLabel: 'Plano de Puestos',
              description: 'Distribución espacial en el salón',
              icon: <LayoutGrid className="w-4 h-4 text-emerald-400" />,
              category: 'classroom',
            },
          ],
        },
        {
          id: 'community',
          label: 'Mis Cursos & Alumnos',
          icon: <Users className="w-4 h-4" />,
          color: 'teal',
          items: [
            {
              id: 'students',
              label: 'Mis Estudiantes',
              shortLabel: 'Estudiantes',
              description: 'Fichas de estudiantes y datos de contacto',
              icon: <Users className="w-4 h-4 text-teal-400" />,
              category: 'community',
            },
            {
              id: 'groups',
              label: 'Mis Cursos Asignados',
              shortLabel: 'Mis Cursos',
              description: 'Acceso directo a mis grupos y asignaturas',
              icon: <School className="w-4 h-4 text-sky-400" />,
              category: 'community',
            },
          ],
        },
        {
          id: 'reports_comm',
          label: 'Reportes & WhatsApp',
          icon: <BarChart3 className="w-4 h-4" />,
          color: 'emerald',
          items: [
            {
              id: 'reports',
              label: 'Reportes & Boletines',
              shortLabel: 'Reportes',
              description: 'Consolidados de notas y estadísticas',
              icon: <BarChart3 className="w-4 h-4 text-amber-400" />,
              category: 'reports_comm',
            },
            {
              id: 'whatsapp_config',
              label: 'WhatsApp & Mensajes',
              shortLabel: 'WhatsApp',
              description: 'Plantillas y bitácora de mensajes a acudientes',
              icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
              badge: pendingNotificationsCount > 0 ? pendingNotificationsCount : undefined,
              category: 'reports_comm',
            },
          ],
        },
        {
          id: 'admin_system',
          label: 'Mi Perfil',
          icon: <KeyRound className="w-4 h-4" />,
          color: 'purple',
          items: [
            {
              id: 'security',
              label: 'Mi Perfil & Contraseña',
              shortLabel: 'Mi Perfil',
              description: 'Actualización de datos y clave de acceso',
              icon: <KeyRound className="w-4 h-4 text-amber-400" />,
              category: 'admin_system',
            },
          ],
        },
      ];
    }

    // Role === 'parent'
    return [
      {
        id: 'classroom',
        label: 'Consulta Escolar',
        icon: <User className="w-4 h-4" />,
        color: 'emerald',
        items: [
          {
            id: 'parent_portal',
            label: 'Seguimiento Académico de mi Hijo(a)',
            shortLabel: 'Portal Familiar',
            description: 'Asistencias, notas y boletines en tiempo real',
            icon: <User className="w-4 h-4 text-emerald-400" />,
            category: 'classroom',
          },
        ],
      },
    ];
  };

  const categories = getNavCategories();
  const allNavItems = categories.flatMap((c) => c.items);
  
  // Find current active category
  const activeCategory = categories.find((c) =>
    c.items.some((item) => item.id === activeTab)
  ) || categories[0];

  const activeItem = allNavItems.find((item) => item.id === activeTab);

  // Filtered items for quick search palette
  const filteredSearchItems = allNavItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.shortLabel?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="bg-[#0a0f1d] text-white sticky top-0 z-40 shadow-xl border-b border-slate-800">
      {/* 1. TOP UTILITY & INSTITUTION BAR */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 border-b border-slate-800/80">
        
        {/* Left: Brand / Institution name */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-900/30 shrink-0">
            <School className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-100 tracking-tight whitespace-nowrap">
                Registro Académico <span className="text-indigo-400">fleon</span>
              </span>
              {currentUser && (
                <span
                  className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border hidden sm:inline-block ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : currentUser.role === 'teacher'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {currentUser.role === 'admin'
                    ? 'Administrador'
                    : currentUser.role === 'teacher'
                    ? 'Docente'
                    : 'Familia'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-sm">
              {settings.schoolName}
            </p>
          </div>
        </div>

        {/* Center/Right: Quick Search Button & Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          
          {/* Quick Search Module Trigger */}
          <button
            id="btn-nav-search-trigger"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/80 text-xs transition-all shadow-sm cursor-pointer"
            title="Buscador rápido de módulos (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline text-[11px]">Buscar módulo...</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-semibold text-slate-400 bg-slate-800 rounded border border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="btn-toggle-theme-navbar"
              onClick={onToggleTheme}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-semibold transition-colors shadow-sm cursor-pointer flex items-center space-x-1.5"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xl:inline text-[11px]">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden xl:inline text-[11px]">Oscuro</span>
                </>
              )}
            </button>
          )}

          {/* App / Android PWA Install Button */}
          <button
            id="btn-pwa-install-header"
            onClick={() => setIsPwaModalOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/90 to-emerald-600/90 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950/40 cursor-pointer border border-indigo-400/30"
            title="Instalar en Android / Móvil con soporte Offline"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">App Android</span>
          </button>

          {/* MySQL Sync Status */}
          <button
            onClick={onManualSync}
            title={
              syncStatus === 'synced'
                ? 'Base de datos MySQL sincronizada automáticamente'
                : syncStatus === 'syncing'
                ? 'Sincronizando cambios con MySQL...'
                : 'MySQL no conectado (cambios guardados en caché local)'
            }
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
              syncStatus === 'synced'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-950/60'
                : syncStatus === 'syncing'
                ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800/40 animate-pulse'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
            }`}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : syncStatus === 'synced' ? (
              <Database className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden md:inline">
              {syncStatus === 'synced' ? 'MySQL' : syncStatus === 'syncing' ? 'Guardando...' : 'Local'}
            </span>
          </button>

          {/* User Profile Dropdown */}
          {currentUser && (
            <div className="relative" ref={userMenuRef}>
              <button
                id="btn-user-profile-menu"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800 px-2 sm:px-2.5 py-1 rounded-xl border border-slate-700/80 transition-all cursor-pointer"
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-600'
                      : currentUser.role === 'teacher'
                      ? 'bg-indigo-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {currentUser.name[0]}
                </div>
                <span className="hidden sm:inline font-bold text-xs text-slate-200 truncate max-w-[100px] md:max-w-[130px]">
                  {currentUser.name.split(' ')[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="font-bold text-slate-100 truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {currentUser.role === 'admin'
                        ? 'Administrador General'
                        : currentUser.role === 'teacher'
                        ? 'Docente de Área'
                        : 'Padre de Familia'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onTabChange('security');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Mi Perfil & Seguridad</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSwitchProfile();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                    <span>Cambiar de Rol / Usuario</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            id="btn-mobile-nav-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white lg:hidden cursor-pointer"
            title="Menú de Navegación"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. DESKTOP CATEGORIZED WORKSPACE BAR */}
      <div className="hidden lg:block bg-slate-950/70 border-b border-slate-800/80" ref={dropdownRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Main Category Tabs */}
          <div className="flex items-center space-x-1.5 py-1.5">
            {categories.map((cat) => {
              const isCatActive = activeCategory.id === cat.id;
              const isDropdownOpen = openDropdown === cat.id;

              return (
                <div key={cat.id} className="relative">
                  <div className="flex items-center">
                    {/* Direct Tab / Category Switcher */}
                    <button
                      id={`nav-category-${cat.id}`}
                      onClick={() => {
                        // Switch to first item of this category or toggle dropdown
                        if (!isCatActive) {
                          onTabChange(cat.items[0].id);
                        } else {
                          setOpenDropdown(isDropdownOpen ? null : cat.id);
                        }
                      }}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCatActive
                          ? cat.id === 'admin_system'
                            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                            : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                    </button>

                    {/* Dropdown trigger chevron */}
                    {cat.items.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(isDropdownOpen ? null : cat.id);
                        }}
                        className={`p-1.5 -ml-1 rounded-r-lg text-slate-400 hover:text-white transition-transform cursor-pointer ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                        title={`Ver opciones de ${cat.label}`}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Popover */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        {cat.label}
                      </div>
                      {cat.items.map((subItem) => {
                        const isSubActive = activeTab === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            id={`dropdown-item-${subItem.id}`}
                            onClick={() => {
                              onTabChange(subItem.id);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start space-x-3 cursor-pointer ${
                              isSubActive
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">{subItem.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs truncate">{subItem.label}</span>
                                {subItem.badge !== undefined && (
                                  <span className="bg-emerald-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ml-1">
                                    {subItem.badge}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] line-clamp-1 ${isSubActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {subItem.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Context Breadcrumb Pill */}
          {activeItem && (
            <div className="flex items-center space-x-2 text-xs py-1 text-slate-400">
              <span className="text-slate-400 text-[11px] font-medium">{activeCategory.label}</span>
              <span className="text-slate-400 font-mono">›</span>
              <span className="font-bold text-slate-200 flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                {activeItem.icon}
                <span className="text-white">{activeItem.label}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. ACTIVE SIBLING SUB-NAV BAR (INSTANT 1-CLICK ACCESS TO COMPANION TOOLS) */}
      {activeCategory && activeCategory.items.length > 1 && (
        <div className="bg-[#0e1424] px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-1.5 py-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mr-1 hidden sm:inline whitespace-nowrap">
              {activeCategory.label}:
            </span>
            {activeCategory.items.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`subnav-tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? item.category === 'admin_system'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  {item.icon}
                  <span className="whitespace-nowrap">{item.shortLabel || item.label}</span>
                  {item.badge !== undefined && (
                    <span className="bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MOBILE / TABLET DRAWER NAVIGATION */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-1.5">
              <div className="flex items-center space-x-2 text-[10px] uppercase font-black text-slate-400 tracking-wider px-2">
                {cat.icon}
                <span>{cat.label}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {cat.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl flex items-center space-x-2.5 transition-all text-xs ${
                        isActive
                          ? 'bg-indigo-600 text-white font-bold shadow-md'
                          : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {item.icon}
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="bg-emerald-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. QUICK COMMAND / SEARCH MODAL (CTRL + K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl max-w-xl w-full space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative">
              <Search className="w-5 h-5 text-indigo-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                autoFocus
                placeholder="Escribe para buscar: 'notas', 'asistencia', 'ruleta', 'whatsapp'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {filteredSearchItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No se encontraron módulos con &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredSearchItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-3 rounded-2xl hover:bg-slate-800/80 flex items-center justify-between group transition-colors cursor-pointer border border-transparent hover:border-slate-700/60"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 border border-slate-700">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-200 group-hover:text-white truncate">
                          {item.label}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono px-2 py-1 rounded bg-slate-800 border border-slate-700 shrink-0 ml-2">
                      Ir al módulo
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400 px-1">
              <span>Navega rápidamente usando las opciones disponibles</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono border border-slate-700">
                ESC para cerrar
              </kbd>
            </div>
          </div>
        </div>
      )}

      {/* 6. PWA INSTALL / OFFLINE STATUS MODAL */}
      {isPwaModalOpen && (
        <PwaInstallModal onDismiss={() => setIsPwaModalOpen(false)} />
      )}
    </header>
  );
};

