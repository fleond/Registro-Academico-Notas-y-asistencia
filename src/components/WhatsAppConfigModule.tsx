import React, { useState, useMemo } from 'react';
import { SchoolSettings, NotificationLog, AuthUser, Group, Student, Teacher } from '../types';
import { 
  MessageSquare, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  Layers, 
  Smartphone, 
  Settings, 
  RotateCcw, 
  Send, 
  Lock, 
  Copy, 
  Globe, 
  Zap,
  Info,
  Database,
  Download,
  Upload,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Filter,
  Users,
  Eye,
  ShieldAlert,
  BellOff,
  BellRing
} from 'lucide-react';
import { 
  exportFullDatabaseBackup, 
  restoreDatabaseFromBackup, 
  resetToFactoryDefaults,
  getStoredData 
} from '../utils/storage';

interface WhatsAppConfigModuleProps {
  settings: SchoolSettings;
  onUpdateSettings: (settings: SchoolSettings) => void;
  notificationLogs: NotificationLog[];
  currentUser?: AuthUser | null;
  groups?: Group[];
  students?: Student[];
  teachers?: Teacher[];
  onDeleteNotificationLog?: (logId: string) => void;
  onClearNotificationLogs?: () => void;
  onNavigateToAdmin?: (subTab?: string) => void;
}

export const WhatsAppConfigModule: React.FC<WhatsAppConfigModuleProps> = ({
  settings,
  onUpdateSettings,
  notificationLogs,
  currentUser,
  groups = [],
  students = [],
  teachers = [],
  onDeleteNotificationLog,
  onClearNotificationLogs,
  onNavigateToAdmin,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'guide' | 'templates' | 'logs'>('guide');
  const [formSettings, setFormSettings] = useState<SchoolSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewType, setPreviewType] = useState<'attendance' | 'late' | 'absent' | 'uniform' | 'grade'>('attendance');
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<'all' | 'attendance' | 'late' | 'absent' | 'grade' | 'uniform'>('all');
  const [logGroupFilter, setLogGroupFilter] = useState<string>('all');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';

  // Identify active teacher object
  const activeTeacher = useMemo(() => {
    if (!currentUser) return null;
    return teachers.find((t) => t.id === currentUser.id || t.email === currentUser.email) || currentUser.teacher;
  }, [currentUser, teachers]);

  // Teacher assigned groups calculation
  const teacherAssignedGroups = useMemo(() => {
    if (isAdmin || !currentUser) {
      return groups;
    }
    const assignedIds = new Set(activeTeacher?.assignedGroupIds || []);
    const assignedGrades = new Set(activeTeacher?.assignedGrades || []);

    return groups.filter((g) => {
      if (assignedIds.has(g.id)) return true;
      if (g.createdByTeacherId && g.createdByTeacherId === currentUser.id) return true;
      if (g.assignedTeacherIds && g.assignedTeacherIds.includes(currentUser.id)) return true;
      if (g.grade && assignedGrades.has(g.grade.trim())) return true;
      return false;
    });
  }, [isAdmin, currentUser, activeTeacher, groups]);

  const teacherAssignedGroupIds = useMemo(() => {
    return new Set(teacherAssignedGroups.map((g) => g.id));
  }, [teacherAssignedGroups]);

  // Lookup maps for fast lookup
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  // Filter logs by user permissions:
  // - Admin: Sees all notification logs
  // - Teacher: Only sees logs sent to students of groups assigned to them
  const accessibleLogs = useMemo(() => {
    if (isAdmin) {
      return notificationLogs;
    }
    return notificationLogs.filter((log) => {
      // Direct group ID on log
      if (log.groupId && teacherAssignedGroupIds.has(log.groupId)) {
        return true;
      }
      // Student lookup
      const std = studentMap.get(log.studentId);
      if (std && std.groupId && teacherAssignedGroupIds.has(std.groupId)) {
        return true;
      }
      return false;
    });
  }, [isAdmin, notificationLogs, teacherAssignedGroupIds, studentMap]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Sample data for smartphone preview
  const previewSample = {
    acudiente: 'Marta Silva',
    estudiante: 'Alejandro Ramírez',
    curso: 'Grado 10° A',
    colegio: formSettings.schoolName,
    docente: formSettings.teacherName,
    fecha: new Date().toISOString().split('T')[0],
    estado_asistencia: previewType === 'late' ? 'RETARDO (15 min)' : (previewType === 'absent' ? 'INASISTENTE' : 'PRESENTE (Puntual)'),
    minutos_retardo: '15',
    uniforme_texto: previewType === 'uniform' ? '⚠️ Incompleto (Sin corbata institucional)' : '✅ Completo y reglamentario',
    observaciones_texto: '📝 Participó activamente en la clase de Matemáticas.',
    materia: 'Matemáticas',
    actividad: 'Taller de Identidades Trigonométricas',
    nota: '4.8',
    nota_maxima: '5.0',
    entrega_tiempo: '✅ Sí, entregada a tiempo',
    comentario: 'Excelente trabajo y desarrollo paso a paso.',
  };

  const getSimulatedMessage = () => {
    let tpl = formSettings.attendanceTemplate;
    if (previewType === 'late') tpl = formSettings.lateTemplate;
    else if (previewType === 'absent') tpl = formSettings.absentTemplate;
    else if (previewType === 'uniform') tpl = formSettings.uniformTemplate;
    else if (previewType === 'grade') tpl = formSettings.gradeTemplate;

    let res = tpl;
    for (const [k, v] of Object.entries(previewSample)) {
      res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return res;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Integración WhatsApp
            </span>
            <span className="text-xs text-slate-400">Educación Escolar</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Centro de Notificaciones WhatsApp & Configuración</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Todo lo que necesitas saber para enviar reportes de asistencia, retardos, uniforme y calificaciones directamente a los acudientes.
          </p>
        </div>

        {/* Sub-tab navigation pills */}
        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 shrink-0 flex-wrap gap-1">
          <button
            id="btn-whatsapp-subtab-guide"
            onClick={() => setActiveSubTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'guide' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ¿Qué se necesita? (Guía)
          </button>
          <button
            id="btn-whatsapp-subtab-templates"
            onClick={() => setActiveSubTab('templates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'templates' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Editor de Plantillas & Modo
          </button>
          <button
            id="btn-whatsapp-subtab-logs"
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'logs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Historial de Envíos</span>
            {accessibleLogs.length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {accessibleLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Admin Notice Banner (If current user is admin) */}
      {isAdmin && onNavigateToAdmin && (
        <div className="bg-purple-950/30 border border-purple-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 text-purple-300">
            <div className="p-2 rounded-xl bg-purple-900/50 border border-purple-700/50 shrink-0">
              <ShieldCheck className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <p className="font-bold text-slate-100">Gestión Administrativa Centralizada</p>
              <p className="text-[11px] text-slate-300">
                Los <strong className="text-purple-300">Ajustes Institucionales del Colegio</strong> y las <strong className="text-purple-300">Copias de Seguridad</strong> están centralizados exclusivamente en el Panel de Administración.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToAdmin('settings')}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md shrink-0 flex items-center space-x-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Ir a Ajustes en Administración</span>
          </button>
        </div>
      )}

      {/* SUB-TAB 1: WHAT DO YOU NEED GUIDE */}
      {activeSubTab === 'guide' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Method 1: Click to chat (Active) */}
            <div className="bg-slate-900/60 rounded-2xl p-5 border-2 border-emerald-500/60 shadow-xl relative flex flex-col justify-between">
              <div className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] uppercase font-extrabold px-3 py-0.5 rounded-full shadow-sm">
                Activo en esta App
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Método 1: Enlace Directo WhatsApp (wa.me)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Utiliza el protocolo oficial de enlace Click-to-Chat de WhatsApp para abrir WhatsApp Web o la App móvil con el mensaje preformateado y el contacto exacto.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 uppercase block">¿Qué necesitas?</span>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li className="flex items-start space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Solo el número celular del acudiente con código de país (ej. +57).</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Tener WhatsApp Web o WhatsApp Desktop abierto en tu dispositivo.</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>100% Gratuito y sin necesidad de registrarse en plataformas de pago.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-300 flex items-center space-x-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Disponible de inmediato en Asistencia y Calificaciones</span>
              </div>
            </div>

            {/* Method 2: Meta Cloud API */}
            <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-sky-400 border border-slate-700 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Método 2: Meta WhatsApp Cloud API (Oficial)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Envío 100% automático desde el servidor mediante los servidores oficiales de Meta (Facebook Developers).
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 uppercase block">¿Qué necesitas?</span>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li className="flex items-start space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                      <span>Cuenta de Meta for Developers verificada para la institución.</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                      <span>Número de teléfono dedicado (no debe estar registrado en WhatsApp personal).</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                      <span>Plantillas de mensajes aprobadas previamente por Meta.</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                      <span>Tarjeta de crédito para costos por conversación luego del límite gratuito.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center space-x-1.5 font-medium">
                <Info className="w-4 h-4 text-sky-400" />
                <span>Recomendado para colegios con más de 1.000 estudiantes</span>
              </div>
            </div>

            {/* Method 3: Twilio / WPP Gateway */}
            <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-purple-400 border border-slate-700 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Método 3: Gateway de Terceros (Twilio / UltraMsg)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Servicio puente para automatización que conecta mediante código QR o APIs intermedias comerciales.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 uppercase block">¿Qué necesitas?</span>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li className="flex items-start space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                      <span>Suscripción mensual al proveedor (ej. Twilio, UltraMsg, WPPConnect).</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                      <span>Claves API (Instance ID y Token de acceso).</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                      <span>Dispositivo móvil con conexión continua a Internet.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center space-x-1.5 font-medium">
                <Info className="w-4 h-4 text-purple-400" />
                <span>Opcional según requerimiento institucional</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TEMPLATES EDITOR & NOTIFICATION MODE */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          {/* Notification Default Mode Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/30 text-amber-400 shrink-0">
                  <BellOff className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-100 text-sm">Política de Notificación Automática: Modo OFF por Defecto</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      Seguro & Controlado
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                    Por seguridad y para evitar aperturas no deseadas, la notificación automática se mantiene <strong className="text-amber-300">desactivada (OFF)</strong> permanentemente. 
                    Cada docente tiene la autonomía de encenderla voluntariamente en el panel de toma de lista si desea que se abra la ventana de confirmación al marcar novedades.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300 font-medium">Estado en Asistencia:</span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold text-xs">
                  OFF (Manual)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Templates Form */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleSave} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-100 text-base flex items-center space-x-2">
                      <Smartphone className="w-5 h-5 text-indigo-400" />
                      <span>Plantillas de Mensajes Dinámicos</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Personaliza los textos usando etiquetas variables entre llaves.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {savedSuccess && (
                      <span className="text-emerald-400 text-xs font-bold flex items-center space-x-1 animate-pulse">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>¡Guardado!</span>
                      </span>
                    )}
                    <button
                      id="btn-whatsapp-save-templates"
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Guardar Plantillas
                    </button>
                  </div>
                </div>

                {/* Available Variables tags */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Variables disponibles para insertar en las plantillas:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{acudiente}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{estudiante}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{curso}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{colegio}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{docente}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{fecha}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{estado_asistencia}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{minutos_retardo}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{uniforme_texto}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{observaciones_texto}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700">{'{url_portal}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">{'{materia}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">{'{actividad}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">{'{nota}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">{'{nota_maxima}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">{'{entrega_tiempo}'}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">{'{comentario}'}</span>
                  </div>
                </div>

                {/* Template 1: General Attendance */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>1. Plantilla Asistencia Diaria (Puntual / General)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPreviewType('attendance')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      Previsualizar en teléfono
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={formSettings.attendanceTemplate}
                    onChange={(e) => setFormSettings({ ...formSettings, attendanceTemplate: e.target.value })}
                    className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Template 2: Late */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>2. Plantilla Notificación de Retardo</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPreviewType('late')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      Previsualizar en teléfono
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={formSettings.lateTemplate}
                    onChange={(e) => setFormSettings({ ...formSettings, lateTemplate: e.target.value })}
                    className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Template 3: Absent */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>3. Plantilla Inasistencia Escolar</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPreviewType('absent')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      Previsualizar en teléfono
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={formSettings.absentTemplate}
                    onChange={(e) => setFormSettings({ ...formSettings, absentTemplate: e.target.value })}
                    className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Template 4: Uniform */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>4. Plantilla Novedad de Uniforme</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPreviewType('uniform')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      Previsualizar en teléfono
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={formSettings.uniformTemplate}
                    onChange={(e) => setFormSettings({ ...formSettings, uniformTemplate: e.target.value })}
                    className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Template 5: Grade */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span>5. Plantilla Reporte de Calificación / Actividad</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPreviewType('grade')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      Previsualizar en teléfono
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={formSettings.gradeTemplate}
                    onChange={(e) => setFormSettings({ ...formSettings, gradeTemplate: e.target.value })}
                    className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </form>
            </div>

            {/* Right: Smartphone Interactive Preview */}
            <div className="lg:col-span-5 sticky top-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Vista Previa WhatsApp</span>
                  </span>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setPreviewType('attendance')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${previewType === 'attendance' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Asist.
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewType('late')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${previewType === 'late' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Retardo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewType('absent')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${previewType === 'absent' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Falta
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewType('grade')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${previewType === 'grade' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Nota
                    </button>
                  </div>
                </div>

                {/* Smartphone Mockup */}
                <div className="w-full bg-[#111b21] rounded-2xl border-4 border-slate-800 overflow-hidden shadow-inner flex flex-col h-[520px]">
                  {/* WhatsApp Top Header Bar */}
                  <div className="bg-[#202c33] px-3 py-2.5 flex items-center justify-between text-white border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs text-white">
                        {formSettings.schoolName ? formSettings.schoolName.charAt(0) : 'C'}
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs font-bold truncate w-40 text-slate-100">
                          {formSettings.schoolName || 'Institución Educativa'}
                        </div>
                        <div className="text-[10px] text-emerald-400">en línea (Colegio)</div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Message Bubble Area */}
                  <div className="flex-1 p-3 overflow-y-auto bg-[#0b141a] space-y-3 flex flex-col justify-end">
                    <div className="flex justify-center">
                      <span className="bg-[#182229] text-[10px] text-slate-400 px-2 py-0.5 rounded-md shadow-sm">
                        HOY
                      </span>
                    </div>

                    <div className="self-end bg-[#005c4b] text-slate-100 rounded-2xl rounded-tr-xs p-3 max-w-[90%] shadow-md text-xs leading-relaxed font-sans whitespace-pre-wrap">
                      {getSimulatedMessage()}
                      <div className="text-[9px] text-emerald-300/80 text-right mt-1 flex items-center justify-end space-x-1">
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <CheckCircle2 className="w-3 h-3 text-sky-400" />
                      </div>
                    </div>
                  </div>

                  {/* Bottom input simulation */}
                  <div className="bg-[#202c33] p-2 flex items-center space-x-2 border-t border-slate-800">
                    <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1 text-[11px] text-slate-400">
                      Escribe un mensaje...
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs shadow-sm">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: NOTIFICATION LOGS (HISTORY OF SENT WHATSAPP MESSAGES) */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          {/* Top Info & Role Indicator Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Historial y Bitácora de Notificaciones Enviadas</span>
                </h3>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin: Todas las notificaciones</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>Docente: Solo tus cursos asignados</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isAdmin 
                  ? 'Como administrador, puedes auditar todas las notificaciones enviadas y eliminar registros históricos.'
                  : `Mostrando las notificaciones enviadas a los acudientes de tus ${teacherAssignedGroups.length} cursos asignados.`}
              </p>
            </div>

            {/* Admin Clear All Button (Only available to Admin) */}
            {isAdmin && onClearNotificationLogs && accessibleLogs.length > 0 && (
              <div className="shrink-0">
                <button
                  id="btn-clear-all-notification-logs"
                  type="button"
                  onClick={() => setIsClearConfirmOpen(true)}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar Todo el Historial</span>
                </button>
              </div>
            )}
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Group Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={logGroupFilter}
                  onChange={(e) => setLogGroupFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-800 text-slate-100">
                    {isAdmin ? 'Todos los cursos' : 'Todos mis cursos asignados'}
                  </option>
                  {(isAdmin ? groups : teacherAssignedGroups).map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-800 text-slate-100">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-800 text-slate-100">Todos los tipos</option>
                  <option value="attendance" className="bg-slate-800 text-slate-100">Asistencia Puntual</option>
                  <option value="late" className="bg-slate-800 text-slate-100">Retardo</option>
                  <option value="absent" className="bg-slate-800 text-slate-100">Inasistencia</option>
                  <option value="uniform" className="bg-slate-800 text-slate-100">Novedad Uniforme</option>
                  <option value="grade" className="bg-slate-800 text-slate-100">Calificación / Nota</option>
                </select>
              </div>
            </div>

            {/* Text Search */}
            <div className="relative flex-1 md:max-w-xs">
              <input
                type="text"
                placeholder="Buscar estudiante, acudiente o teléfono..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Logs List Table */}
          {(() => {
            const filteredLogs = accessibleLogs.filter((log) => {
              // Group match
              if (logGroupFilter !== 'all') {
                const std = studentMap.get(log.studentId);
                const actualGroupId = log.groupId || std?.groupId;
                if (actualGroupId !== logGroupFilter) {
                  return false;
                }
              }

              // Type match
              const matchesType = logTypeFilter === 'all' || log.type === logTypeFilter;

              // Search match
              const query = logSearch.toLowerCase().trim();
              const matchesSearch =
                query === '' ||
                log.studentName.toLowerCase().includes(query) ||
                log.guardianName.toLowerCase().includes(query) ||
                log.phone.includes(query) ||
                (log.groupName && log.groupName.toLowerCase().includes(query)) ||
                (log.message && log.message.toLowerCase().includes(query));

              return matchesType && matchesSearch;
            });

            if (filteredLogs.length === 0) {
              return (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">No hay registros de envío coincidentes</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {accessibleLogs.length === 0
                      ? isTeacher
                        ? 'Aún no se han registrado envíos de mensajes para tus cursos asignados.'
                        : 'Los mensajes enviados a los padres de familia aparecerán aquí automáticamente.'
                      : 'Ninguna notificación coincide con los filtros aplicados.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Fecha & Hora</th>
                        <th className="py-3 px-3">Estudiante</th>
                        <th className="py-3 px-3">Curso / Grupo</th>
                        <th className="py-3 px-3">Acudiente & Teléfono</th>
                        <th className="py-3 px-3">Tipo</th>
                        <th className="py-3 px-4">Mensaje Enviado</th>
                        <th className="py-3 px-3 text-center">Estado</th>
                        {isAdmin && (
                          <th className="py-3 px-3 text-center">Acciones</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredLogs.map((log) => {
                        const typeBadgeColor =
                          log.type === 'absent'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : log.type === 'late'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : log.type === 'uniform'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : log.type === 'grade'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                        const typeLabel =
                          log.type === 'absent'
                            ? 'Inasistencia'
                            : log.type === 'late'
                            ? 'Retardo'
                            : log.type === 'uniform'
                            ? 'Uniforme'
                            : log.type === 'grade'
                            ? 'Nota'
                            : 'Asistencia';

                        const std = studentMap.get(log.studentId);
                        const effectiveGroupName =
                          log.groupName ||
                          (log.groupId && groupMap.get(log.groupId)?.name) ||
                          (std?.groupId && groupMap.get(std.groupId)?.name) ||
                          'General';

                        return (
                          <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                              {new Date(log.timestamp).toLocaleString('es-ES', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-200 whitespace-nowrap">
                              {log.studentName}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700 text-[10px] font-semibold">
                                {effectiveGroupName}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="text-slate-200 font-medium">{log.guardianName}</div>
                              <div className="font-mono text-emerald-400 text-[11px]">{log.phone}</div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${typeBadgeColor}`}>
                                {typeLabel}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate text-slate-400" title={log.message}>
                              {log.message}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{log.status === 'sent' ? 'Enviado' : 'Pendiente'}</span>
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  title="Eliminar notificación"
                                  onClick={() => setDeletingLogId(log.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Admin Confirmation Modal for Deleting Single Log */}
      {deletingLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">¿Eliminar Registro de Notificación?</h3>
                <span className="text-[11px] text-slate-400">Acción exclusiva de Administrador</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta alerta será eliminada de la bitácora histórica institucional.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingLogId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteNotificationLog && deletingLogId) {
                    onDeleteNotificationLog(deletingLogId);
                  }
                  setDeletingLogId(null);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Confirmation Modal for Clearing All Logs */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">¿Vaciar Todo el Historial?</h3>
                <span className="text-xs text-rose-400 font-semibold">Acción Administrativa Irreversible</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente todos los registros ({accessibleLogs.length} notificaciones) del historial de envíos de WhatsApp?
            </p>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearNotificationLogs) {
                    onClearNotificationLogs();
                  }
                  setIsClearConfirmOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Sí, Vaciar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
