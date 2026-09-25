import React, { useState } from 'react';
import { 
  SchoolSettings, 
  AttendanceNoveltyConfig, 
  UniformNoveltyTag, 
  NoveltyCategory, 
  NoveltySeverity 
} from '../types';
import { 
  DEFAULT_ATTENDANCE_NOVELTIES, 
  DEFAULT_UNIFORM_TAGS 
} from '../utils/storage';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  LogOut, 
  Activity, 
  FileText, 
  ShieldAlert, 
  AlertCircle, 
  MessageSquare, 
  Sparkles, 
  RotateCcw, 
  Shirt, 
  SlidersHorizontal, 
  Tag, 
  Eye, 
  Info,
  CheckCheck
} from 'lucide-react';
import { fillTemplate } from '../utils/whatsapp';

interface AttendanceNoveltiesAdminProps {
  settings: SchoolSettings;
  onUpdateSettings: (settings: SchoolSettings) => void;
}

const COLOR_OPTIONS: { label: string; value: string; bgClass: string; borderClass: string; textClass: string }[] = [
  { label: 'Esmeralda / Verde', value: 'emerald', bgClass: 'bg-emerald-500/20', borderClass: 'border-emerald-500/50', textClass: 'text-emerald-300' },
  { label: 'Ámbar / Amarillo', value: 'amber', bgClass: 'bg-amber-500/20', borderClass: 'border-amber-500/50', textClass: 'text-amber-300' },
  { label: 'Rosa / Suave', value: 'rose', bgClass: 'bg-rose-500/20', borderClass: 'border-rose-500/50', textClass: 'text-rose-300' },
  { label: 'Rojo / Alerta', value: 'red', bgClass: 'bg-red-500/20', borderClass: 'border-red-500/50', textClass: 'text-red-300' },
  { label: 'Naranja / Advertencia', value: 'orange', bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/50', textClass: 'text-orange-300' },
  { label: 'Azul Cielo / Tranquilo', value: 'sky', bgClass: 'bg-sky-500/20', borderClass: 'border-sky-500/50', textClass: 'text-sky-300' },
  { label: 'Púrpura / Especial', value: 'purple', bgClass: 'bg-purple-500/20', borderClass: 'border-purple-500/50', textClass: 'text-purple-300' },
  { label: 'Verde Azulado / Teal', value: 'teal', bgClass: 'bg-teal-500/20', borderClass: 'border-teal-500/50', textClass: 'text-teal-300' },
  { label: 'Índigo / Neutro', value: 'indigo', bgClass: 'bg-indigo-500/20', borderClass: 'border-indigo-500/50', textClass: 'text-indigo-300' },
  { label: 'Pizarra / Gris', value: 'slate', bgClass: 'bg-slate-700/40', borderClass: 'border-slate-600', textClass: 'text-slate-300' },
];

const ICON_OPTIONS = [
  { value: 'CheckCircle2', label: 'Presente / Check', icon: CheckCircle2 },
  { value: 'Clock', label: 'Reloj / Retardo', icon: Clock },
  { value: 'XCircle', label: 'Cruz / Inasistencia', icon: XCircle },
  { value: 'HelpCircle', label: 'Interrogación / Excusa', icon: HelpCircle },
  { value: 'AlertTriangle', label: 'Alerta / Evasión', icon: AlertTriangle },
  { value: 'LogOut', label: 'Salida / Retiro', icon: LogOut },
  { value: 'Activity', label: 'Salud / Enfermería', icon: Activity },
  { value: 'FileText', label: 'Documento / Permiso', icon: FileText },
  { value: 'ShieldAlert', label: 'Escudo / Convivencia', icon: ShieldAlert },
  { value: 'AlertCircle', label: 'Círculo Alerta', icon: AlertCircle },
];

export const AttendanceNoveltiesAdmin: React.FC<AttendanceNoveltiesAdminProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'novelties' | 'uniform'>('novelties');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states for Novelty CRUD
  const [isNoveltyModalOpen, setIsNoveltyModalOpen] = useState(false);
  const [editingNovelty, setEditingNovelty] = useState<AttendanceNoveltyConfig | null>(null);
  const [previewModalNovelty, setPreviewModalNovelty] = useState<AttendanceNoveltyConfig | null>(null);

  // Form state for Novelty
  const [noveltyForm, setNoveltyForm] = useState<Partial<AttendanceNoveltyConfig>>({
    id: '',
    code: '',
    name: '',
    shortName: '',
    description: '',
    color: 'orange',
    iconName: 'AlertTriangle',
    category: 'incident',
    severity: 'high',
    requiresReason: true,
    requiresMinutes: false,
    isActive: true,
    customWhatsAppTemplate: '',
  });

  // State for adding new uniform tag
  const [newUniformTagName, setNewUniformTagName] = useState('');

  // Fallbacks
  const novelties = settings.attendanceNovelties && settings.attendanceNovelties.length > 0
    ? settings.attendanceNovelties
    : DEFAULT_ATTENDANCE_NOVELTIES;

  const uniformTags = settings.uniformTags && settings.uniformTags.length > 0
    ? settings.uniformTags
    : DEFAULT_UNIFORM_TAGS;

  // Filtered novelties
  const filteredNovelties = novelties.filter(
    (n) =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.shortName && n.shortName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.description && n.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Statistics
  const totalNovelties = novelties.length;
  const activeNovelties = novelties.filter((n) => n.isActive).length;
  const customTemplatesCount = novelties.filter((n) => n.customWhatsAppTemplate && n.customWhatsAppTemplate.trim().length > 0).length;
  const activeUniformTags = uniformTags.filter((t) => t.isActive).length;

  // Toggle active state for novelty
  const handleToggleNoveltyActive = (noveltyId: string) => {
    const updated = novelties.map((n) =>
      n.id === noveltyId ? { ...n, isActive: !n.isActive } : n
    );
    onUpdateSettings({ ...settings, attendanceNovelties: updated });
  };

  // Open modal to add or edit
  const handleOpenNoveltyModal = (novelty?: AttendanceNoveltyConfig) => {
    if (novelty) {
      setEditingNovelty(novelty);
      setNoveltyForm({ ...novelty });
    } else {
      setEditingNovelty(null);
      setNoveltyForm({
        id: `nov-${Date.now()}`,
        code: 'NOV',
        name: '',
        shortName: '',
        description: '',
        color: 'orange',
        iconName: 'AlertTriangle',
        category: 'incident',
        severity: 'medium',
        requiresReason: true,
        requiresMinutes: false,
        isActive: true,
        customWhatsAppTemplate: 'Estimado(a) {acudiente}, le informamos que el/la estudiante {estudiante} del curso {curso} presentó la novedad de asistencia: {estado_asistencia} en la fecha {fecha}.\n\n{observaciones_texto}\n\nInstitución: {colegio}\nDocente: {docente}',
      });
    }
    setIsNoveltyModalOpen(true);
  };

  // Save novelty
  const handleSaveNovelty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noveltyForm.name?.trim() || !noveltyForm.code?.trim()) {
      alert('Por favor completa al menos el nombre y el código de la novedad.');
      return;
    }

    const shortNameClean = noveltyForm.shortName?.trim() || noveltyForm.name.trim().slice(0, 14);
    const idClean = editingNovelty?.id || noveltyForm.id || `nov-${Date.now()}`;

    const updatedItem: AttendanceNoveltyConfig = {
      id: idClean,
      code: noveltyForm.code.trim().toUpperCase(),
      name: noveltyForm.name.trim(),
      shortName: shortNameClean,
      description: noveltyForm.description?.trim() || '',
      color: noveltyForm.color || 'orange',
      iconName: noveltyForm.iconName || 'AlertTriangle',
      category: noveltyForm.category || 'incident',
      severity: noveltyForm.severity || 'medium',
      requiresReason: !!noveltyForm.requiresReason,
      requiresMinutes: !!noveltyForm.requiresMinutes,
      isActive: noveltyForm.isActive ?? true,
      customWhatsAppTemplate: noveltyForm.customWhatsAppTemplate?.trim() || '',
    };

    let updatedNovelties: AttendanceNoveltyConfig[];
    if (editingNovelty) {
      updatedNovelties = novelties.map((n) => (n.id === editingNovelty.id ? updatedItem : n));
    } else {
      updatedNovelties = [...novelties, updatedItem];
    }

    onUpdateSettings({ ...settings, attendanceNovelties: updatedNovelties });
    setIsNoveltyModalOpen(false);
  };

  // Delete novelty
  const handleDeleteNovelty = (noveltyId: string, name: string) => {
    if (['present', 'late', 'absent', 'excused'].includes(noveltyId)) {
      alert('Los 4 estados básicos de asistencia (Presente, Retardo, Inasistente, Justificado) son esenciales para el sistema y no se pueden eliminar. Puedes desactivarlos o personalizar su nombre si lo deseas.');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar la novedad "${name}"?`)) {
      const updated = novelties.filter((n) => n.id !== noveltyId);
      onUpdateSettings({ ...settings, attendanceNovelties: updated });
    }
  };

  // Reset to factory defaults
  const handleResetToDefaults = () => {
    if (confirm('⚠️ ¿Deseas restablecer el catálogo de novedades de asistencia y tags de uniforme a los valores predeterminados (incluye Presente, Retardo, Inasistente, Justificado, Evasión, Retiro Temprano, Enfermería, Permiso Especial)?')) {
      onUpdateSettings({
        ...settings,
        attendanceNovelties: DEFAULT_ATTENDANCE_NOVELTIES,
        uniformTags: DEFAULT_UNIFORM_TAGS,
      });
    }
  };

  // Insert template variable
  const handleInsertVariable = (variableName: string) => {
    setNoveltyForm((prev) => ({
      ...prev,
      customWhatsAppTemplate: `${prev.customWhatsAppTemplate || ''} {${variableName}} `,
    }));
  };

  // Uniform tag handlers
  const handleAddUniformTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUniformTagName.trim()) return;

    const newTag: UniformNoveltyTag = {
      id: `utag-${Date.now()}`,
      name: newUniformTagName.trim(),
      isActive: true,
    };

    const updated = [...uniformTags, newTag];
    onUpdateSettings({ ...settings, uniformTags: updated });
    setNewUniformTagName('');
  };

  const handleToggleUniformTag = (tagId: string) => {
    const updated = uniformTags.map((t) =>
      t.id === tagId ? { ...t, isActive: !t.isActive } : t
    );
    onUpdateSettings({ ...settings, uniformTags: updated });
  };

  const handleDeleteUniformTag = (tagId: string, name: string) => {
    if (confirm(`¿Eliminar la opción de uniforme "${name}"?`)) {
      const updated = uniformTags.filter((t) => t.id !== tagId);
      onUpdateSettings({ ...settings, uniformTags: updated });
    }
  };

  // Helper for rendering novelty icon
  const renderNoveltyIcon = (iconName?: string, colorClass = 'text-slate-300') => {
    switch (iconName) {
      case 'CheckCircle2': return <CheckCircle2 className={`w-4 h-4 ${colorClass}`} />;
      case 'Clock': return <Clock className={`w-4 h-4 ${colorClass}`} />;
      case 'XCircle': return <XCircle className={`w-4 h-4 ${colorClass}`} />;
      case 'HelpCircle': return <HelpCircle className={`w-4 h-4 ${colorClass}`} />;
      case 'AlertTriangle': return <AlertTriangle className={`w-4 h-4 ${colorClass}`} />;
      case 'LogOut': return <LogOut className={`w-4 h-4 ${colorClass}`} />;
      case 'Activity': return <Activity className={`w-4 h-4 ${colorClass}`} />;
      case 'FileText': return <FileText className={`w-4 h-4 ${colorClass}`} />;
      case 'ShieldAlert': return <ShieldAlert className={`w-4 h-4 ${colorClass}`} />;
      case 'AlertCircle': return <AlertCircle className={`w-4 h-4 ${colorClass}`} />;
      default: return <AlertTriangle className={`w-4 h-4 ${colorClass}`} />;
    }
  };

  // Helper for rendering category badge
  const getCategoryBadge = (cat: NoveltyCategory) => {
    switch (cat) {
      case 'presence': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">Presencia</span>;
      case 'late': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30">Tardanza</span>;
      case 'absence': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30">Inasistencia</span>;
      case 'excused': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950/60 text-sky-300 border border-sky-500/30">Justificación</span>;
      case 'incident': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-300 border border-red-500/30">Falta / Evasión</span>;
      case 'departure': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-950/60 text-orange-300 border border-orange-500/30">Retiro / Salida</span>;
      case 'health': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950/60 text-teal-300 border border-teal-500/30">Salud / Enfermería</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">General</span>;
    }
  };

  // Helper for rendering severity badge
  const getSeverityBadge = (sev?: NoveltySeverity) => {
    switch (sev) {
      case 'high': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">Alerta Alta</span>;
      case 'medium': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">Moderada</span>;
      case 'low': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Baja / Normal</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2">
                <span>Catálogo de Novedades & Asistencia Escolar</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Personalizable
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Define y actualiza las situaciones de asistencia disponibles en la planilla del docente (Presente, Retardo, Inasistencia, Evasión, Retiro Temprano, Enfermería, etc.) y sus mensajes de WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
              title="Restablecer a valores iniciales recomendados"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Restablecer Valores</span>
            </button>

            <button
              id="btn-admin-add-novelty"
              type="button"
              onClick={() => handleOpenNoveltyModal()}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-amber-950 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Situación / Novedad</span>
            </button>
          </div>
        </div>

        {/* KPI Mini-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-medium text-slate-400">Total Situaciones</span>
            <p className="text-xl font-bold text-slate-100">{totalNovelties}</p>
          </div>

          <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/30">
            <span className="text-[11px] font-medium text-emerald-400">Novedades Activas</span>
            <p className="text-xl font-bold text-emerald-300">{activeNovelties} de {totalNovelties}</p>
          </div>

          <div className="bg-purple-950/20 p-3.5 rounded-xl border border-purple-500/30">
            <span className="text-[11px] font-medium text-purple-400">Plantillas WhatsApp</span>
            <p className="text-xl font-bold text-purple-300">{customTemplatesCount} personalizadas</p>
          </div>

          <div className="bg-teal-950/20 p-3.5 rounded-xl border border-teal-500/30">
            <span className="text-[11px] font-medium text-teal-400">Tags de Uniforme</span>
            <p className="text-xl font-bold text-teal-300">{activeUniformTags} activos</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('novelties')}
          className={`py-2.5 px-4 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'novelties'
              ? 'border-amber-500 bg-slate-800/80 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Situaciones de Asistencia ({novelties.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('uniform')}
          className={`py-2.5 px-4 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'uniform'
              ? 'border-teal-500 bg-slate-800/80 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Shirt className="w-4 h-4" />
          <span>Faltas / Tags de Uniforme ({uniformTags.length})</span>
        </button>
      </div>

      {/* 1. ATTENDANCE NOVELTIES VIEW */}
      {activeTab === 'novelties' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Buscar novedad (ej. Evasión, Retiro, Permiso)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="text-xs text-slate-400">
              Las situaciones activas aparecen directamente como botones en la planilla de asistencia.
            </div>
          </div>

          {/* Novelties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNovelties.map((item) => {
              const colorInfo = COLOR_OPTIONS.find((c) => c.value === item.color) || COLOR_OPTIONS[0];

              return (
                <div
                  key={item.id}
                  id={`novelty-card-${item.id}`}
                  className={`bg-slate-900/90 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                    item.isActive 
                      ? 'border-slate-800 hover:border-slate-700' 
                      : 'border-slate-800/50 opacity-60 bg-slate-950/40'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Header: Icon + Code + Title + Active Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-xs ${colorInfo.bgClass} ${colorInfo.borderClass} ${colorInfo.textClass}`}>
                          {item.code}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-sm text-slate-100">
                              {item.name}
                            </h3>
                            {!item.isActive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                                Inactiva
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                            <span>Botón docente: <strong className="text-slate-200">{item.shortName || item.name}</strong></span>
                            <span>•</span>
                            <span>Código: <strong className="text-slate-300">{item.code}</strong></span>
                          </p>
                        </div>
                      </div>

                      {/* Active switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleNoveltyActive(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 border ${
                          item.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={item.isActive ? 'Desactivar de la planilla' : 'Activar en la planilla'}
                      >
                        {item.isActive ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5" />}
                        <span>{item.isActive ? 'Activo' : 'Inactivo'}</span>
                      </button>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/80">
                        {item.description}
                      </p>
                    )}

                    {/* Metadata & Requirements Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {getCategoryBadge(item.category)}
                      {getSeverityBadge(item.severity)}

                      {item.requiresMinutes && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Pide minutos</span>
                        </span>
                      )}

                      {item.requiresReason && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-950/40 text-sky-300 border border-sky-500/30 flex items-center space-x-1">
                          <FileText className="w-3 h-3" />
                          <span>Pide motivo / justificación</span>
                        </span>
                      )}

                      {item.customWhatsAppTemplate && item.customWhatsAppTemplate.trim().length > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-950/40 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>Plantilla WhatsApp propia</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      {item.customWhatsAppTemplate && (
                        <button
                          type="button"
                          onClick={() => setPreviewModalNovelty(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold flex items-center space-x-1 border border-slate-700/80 transition-colors"
                          title="Ver mensaje generado de WhatsApp"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Plantilla WhatsApp</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenNoveltyModal(item)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                        title="Editar Novedad"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {!['present', 'late', 'absent', 'excused'].includes(item.id) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNovelty(item.id, item.name)}
                          className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-colors"
                          title="Eliminar Novedad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. UNIFORM NOVELTIES VIEW */}
      {activeTab === 'uniform' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
                  <Shirt className="w-5 h-5 text-teal-400" />
                  <span>Tags Rápidos de Infracción de Uniforme</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Opciones predefinidas que los docentes pueden seleccionar con un clic al registrar un uniforme incompleto.
                </p>
              </div>
            </div>

            {/* Add new Uniform Tag Form */}
            <form onSubmit={handleAddUniformTag} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                required
                placeholder="Ej: Sin corbata institucional, Porte de aretes no permitidos, Falda sin el largo adecuado..."
                value={newUniformTagName}
                onChange={(e) => setNewUniformTagName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Tag</span>
              </button>
            </form>

            {/* List of Uniform tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
              {uniformTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    tag.isActive
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Tag className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">{tag.name}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleUniformTag(tag.id)}
                      className={`p-1 rounded-lg text-xs transition-colors ${
                        tag.isActive ? 'text-emerald-400 hover:bg-emerald-950/60' : 'text-slate-500 hover:bg-slate-700'
                      }`}
                      title={tag.isActive ? 'Desactivar tag' : 'Activar tag'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteUniformTag(tag.id, tag.name)}
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors"
                      title="Eliminar tag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT ATTENDANCE NOVELTY                                    */}
      {/* ========================================================================= */}
      {isNoveltyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-800 text-slate-100 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  {editingNovelty ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">
                    {editingNovelty ? 'Editar Situación / Novedad' : 'Nueva Situación / Novedad de Asistencia'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configura los parámetros, requerimientos y el mensaje de WhatsApp para los acudientes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoveltyModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNovelty} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-400 font-bold block">
                    Nombre Completo de la Situación: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Evasión de Clase / Jornada, Retiro Temprano..."
                    value={noveltyForm.name}
                    onChange={(e) => setNoveltyForm({ ...noveltyForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">
                    Código / Abrev.: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Ej: EV, RT, ENF"
                    value={noveltyForm.code}
                    onChange={(e) => setNoveltyForm({ ...noveltyForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">
                    Texto Corto para el Botón del Docente:
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="Ej: Evasión, Retiro Temp."
                    value={noveltyForm.shortName}
                    onChange={(e) => setNoveltyForm({ ...noveltyForm, shortName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">Se mostrará en la botonera de cada estudiante (máx 16 letras).</span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Categoría:</label>
                  <select
                    value={noveltyForm.category}
                    onChange={(e) => setNoveltyForm({ ...noveltyForm, category: e.target.value as NoveltyCategory })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="incident">Falta / Incidente Disciplinario / Evasión</option>
                    <option value="departure">Retiro Temprano / Salida</option>
                    <option value="health">Salud / Enfermería</option>
                    <option value="excused">Permiso / Justificación Especial</option>
                    <option value="late">Tardanza / Retardo</option>
                    <option value="absent">Inasistencia</option>
                    <option value="present">Presencia / Normal</option>
                    <option value="other">Otro / General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Nivel de Severidad:</label>
                  <select
                    value={noveltyForm.severity}
                    onChange={(e) => setNoveltyForm({ ...noveltyForm, severity: e.target.value as NoveltySeverity })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  >
                    <option value="low">Baja / Normal (Informativo)</option>
                    <option value="medium">Moderada (Requiere Atención)</option>
                    <option value="high">Alta / Urgente (Incidente Crítico)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Color Distintivo:</label>
                  <select
                    value={noveltyForm.color}
                    onChange={(e) => setNoveltyForm({ ...noveltyForm, color: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Ícono:</label>
                  <select
                    value={noveltyForm.iconName}
                    onChange={(e) => setNoveltyForm({ ...noveltyForm, iconName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  >
                    {ICON_OPTIONS.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles for special requirements */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/70 space-y-3">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Requerimientos al marcar en la planilla
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noveltyForm.requiresReason}
                      onChange={(e) => setNoveltyForm({ ...noveltyForm, requiresReason: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">Solicitar Motivo / Detalle</span>
                      <span className="text-[10px] text-slate-400">Abre un diálogo para ingresar la justificación o causa.</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noveltyForm.requiresMinutes}
                      onChange={(e) => setNoveltyForm({ ...noveltyForm, requiresMinutes: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">Solicitar Minutos de Tardanza</span>
                      <span className="text-[10px] text-slate-400">Pide la cantidad de minutos tarde.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Descripción / Orientación para el Docente:</label>
                <textarea
                  rows={2}
                  placeholder="Instrucción de cuándo debe seleccionarse esta novedad..."
                  value={noveltyForm.description}
                  onChange={(e) => setNoveltyForm({ ...noveltyForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              {/* Custom WhatsApp Template */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center space-x-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Plantilla de Mensaje WhatsApp para Acudientes:</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Opcional (se usa la global si está vacía)</span>
                </div>

                {/* Variable insertion buttons */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">Insertar variable:</span>
                  {[
                    { id: 'estudiante', label: 'Estudiante' },
                    { id: 'acudiente', label: 'Acudiente' },
                    { id: 'curso', label: 'Curso' },
                    { id: 'fecha', label: 'Fecha' },
                    { id: 'estado_asistencia', label: 'Estado' },
                    { id: 'observaciones_texto', label: 'Observación/Motivo' },
                    { id: 'colegio', label: 'Colegio' },
                    { id: 'docente', label: 'Docente' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleInsertVariable(v.id)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono border border-slate-700 transition-colors"
                    >
                      +{`{${v.id}}`}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={noveltyForm.customWhatsAppTemplate}
                  onChange={(e) => setNoveltyForm({ ...noveltyForm, customWhatsAppTemplate: e.target.value })}
                  placeholder="Estimado(a) {acudiente}, le informamos que {estudiante} del curso {curso} presentó la novedad: {estado_asistencia} en la fecha {fecha}. {observaciones_texto}"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-[11px]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNoveltyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md cursor-pointer"
                >
                  {editingNovelty ? 'Guardar Cambios' : 'Crear Situación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW WHATSAPP TEMPLATE                                          */}
      {/* ========================================================================= */}
      {previewModalNovelty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span>Vista Previa de WhatsApp: {previewModalNovelty.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewModalNovelty(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                Ejemplo de Mensaje Generado:
              </span>
              <div className="text-xs text-slate-100 whitespace-pre-line font-sans leading-relaxed">
                {fillTemplate(previewModalNovelty.customWhatsAppTemplate || settings.attendanceTemplate, {
                  acudiente: 'Marta Ramírez',
                  estudiante: 'Alejandro Gómez',
                  curso: '10°A',
                  colegio: settings.schoolName,
                  docente: settings.teacherName,
                  fecha: new Date().toISOString().split('T')[0],
                  estado_asistencia: previewModalNovelty.name.toUpperCase(),
                  minutos_retardo: '15',
                  uniforme_texto: '✅ Completo y reglamentario',
                  observaciones_texto: `📝 Motivo: Salida anticipada con autorización del acudiente.`,
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalNovelty(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
