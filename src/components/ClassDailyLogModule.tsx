import React, { useState, useMemo } from 'react';
import { 
  Group, 
  SchoolSettings, 
  AuthUser, 
  Teacher, 
  AttendanceRecord,
  ClassDailyLog,
  DriveFileAttachment
} from '../types';
import { sortGroupsAscending } from '../utils/groupUtils';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Calendar, 
  Edit, 
  Trash2, 
  Printer, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  Copy, 
  FileText, 
  Layers, 
  Users, 
  Info, 
  Check, 
  X,
  ExternalLink,
  GraduationCap,
  ClipboardCheck,
  RefreshCw,
  FolderOpen,
  HardDrive,
  ShieldCheck,
  UserCheck,
  Filter,
  Eye,
  AlertCircle
} from 'lucide-react';
import { DriveAttachmentsManager } from './DriveAttachmentsManager';
import { GoogleDriveExplorerModal } from './GoogleDriveExplorerModal';
import { buildDailyLogFolderPathSegments } from '../utils/googleDrive';
import { resolveActiveTeacher, getSubjectsForGroupAndTeacher } from '../utils/teacherUtils';

interface ClassDailyLogModuleProps {
  groups: Group[];
  settings: SchoolSettings;
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  attendance: AttendanceRecord[];
  dailyLogs: ClassDailyLog[];
  students?: any[];
  onUpdateDailyLogs: (logs: ClassDailyLog[]) => void;
  onNavigateToAttendance?: (groupId: string, date: string) => void;
  onNavigateToGrades?: (groupId: string, subject?: string) => void;
}

export const ClassDailyLogModule: React.FC<ClassDailyLogModuleProps> = ({
  groups,
  settings,
  currentUser,
  teachers = [],
  attendance,
  dailyLogs,
  onUpdateDailyLogs,
  onNavigateToAttendance,
  onNavigateToGrades,
}) => {
  const isTeacher = currentUser?.role === 'teacher';

  // Robust teacher resolution for active user
  const activeTeacher = useMemo(() => {
    return resolveActiveTeacher(currentUser, teachers);
  }, [currentUser, teachers]);

  // Admin filter by specific teacher
  const [adminSelectedTeacherId, setAdminSelectedTeacherId] = useState<string>('all');

  // Accessible groups for the current view
  const accessibleGroups = useMemo(() => {
    if (!isTeacher) {
      if (adminSelectedTeacherId !== 'all') {
        const targetTeacher = teachers.find((t) => t.id === adminSelectedTeacherId);
        if (targetTeacher) {
          const assignedIds = new Set(targetTeacher.assignedGroupIds || []);
          const assignedGrades = new Set(targetTeacher.assignedGrades || []);
          const filtered = groups.filter((g) => {
            if (assignedIds.has(g.id)) return true;
            if (g.createdByTeacherId && g.createdByTeacherId === targetTeacher.id) return true;
            if (g.assignedTeacherIds && g.assignedTeacherIds.includes(targetTeacher.id)) return true;
            if (g.grade && assignedGrades.has(g.grade.trim())) return true;
            return false;
          });
          return filtered.length > 0 ? sortGroupsAscending(filtered) : sortGroupsAscending(groups);
        }
      }
      return sortGroupsAscending(groups);
    }

    if (!currentUser) return sortGroupsAscending(groups);

    const assignedIds = new Set(activeTeacher?.assignedGroupIds || []);
    const assignedGrades = new Set(activeTeacher?.assignedGrades || []);

    const filtered = groups.filter((g) => {
      if (assignedIds.has(g.id)) return true;
      if (g.createdByTeacherId && g.createdByTeacherId === currentUser.id) return true;
      if (g.assignedTeacherIds && g.assignedTeacherIds.includes(currentUser.id)) return true;
      if (activeTeacher?.id && g.assignedTeacherIds && g.assignedTeacherIds.includes(activeTeacher.id)) return true;
      if (g.grade && assignedGrades.has(g.grade.trim())) return true;
      return false;
    });
    return filtered.length > 0 ? sortGroupsAscending(filtered) : sortGroupsAscending(groups);
  }, [groups, isTeacher, currentUser, activeTeacher, adminSelectedTeacherId, teachers]);

  // Group Map for quick lookup
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  // Teacher Map for quick lookup
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);

  // Filters State
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Subject List for selected group
  const availableSubjects = useMemo(() => {
    const isDegreeTitle = (s: string) =>
      /^(licenciad|magister|magíster|especialista|ingenier|profesor|docente|fil[oó]sof|bi[oó]log|qu[ií]mic|abogad|psic[oó]log)/i.test(s.trim()) &&
      (s.includes(' en ') || s.includes(' de ') || s.includes(' y ') || s.includes(' con ') || s.includes(' - '));

    if (isTeacher && activeTeacher) {
      if (selectedGroupId === 'all') {
        const setSubs = new Set<string>();
        accessibleGroups.forEach((grp) => {
          const subs = getSubjectsForGroupAndTeacher(grp, activeTeacher, teachers, settings, true);
          subs.forEach((s) => setSubs.add(s));
        });
        const arr = Array.from(setSubs);
        return arr.length > 0 ? arr : (activeTeacher.assignedSubjects || ['Matemáticas']).filter((s) => !isDegreeTitle(s));
      }
      const grp = accessibleGroups.find((g) => g.id === selectedGroupId);
      return getSubjectsForGroupAndTeacher(grp, activeTeacher, teachers, settings, true);
    }

    // Admin view
    if (adminSelectedTeacherId !== 'all') {
      const targetTeacher = teachers.find((t) => t.id === adminSelectedTeacherId);
      if (selectedGroupId === 'all') {
        const setSubs = new Set<string>();
        accessibleGroups.forEach((grp) => {
          const subs = getSubjectsForGroupAndTeacher(grp, targetTeacher, teachers, settings, true);
          subs.forEach((s) => setSubs.add(s));
        });
        return Array.from(setSubs);
      }
      const grp = accessibleGroups.find((g) => g.id === selectedGroupId);
      return getSubjectsForGroupAndTeacher(grp, targetTeacher, teachers, settings, true);
    }

    if (selectedGroupId === 'all') {
      const allSubs = new Set<string>();
      accessibleGroups.forEach((g) => (g.subjects || []).filter((s) => !isDegreeTitle(s)).forEach((s) => allSubs.add(s)));
      return Array.from(allSubs);
    }
    const grp = accessibleGroups.find((g) => g.id === selectedGroupId);
    return grp ? (grp.subjects || []).filter((s) => !isDegreeTitle(s)) : [];
  }, [accessibleGroups, selectedGroupId, isTeacher, activeTeacher, adminSelectedTeacherId, teachers, settings]);

  // STRICT Filtered Daily Logs:
  // Teachers ONLY see logs that belong to their teacherId!
  const filteredLogs = useMemo(() => {
    return dailyLogs
      .filter((log) => {
        // Teacher Isolation: A teacher can ONLY see their own daily logs
        if (isTeacher) {
          const effectiveTeacherId = activeTeacher?.id || currentUser?.id || 'tch-1';
          if (log.teacherId !== effectiveTeacherId) {
            return false;
          }
        } else if (adminSelectedTeacherId !== 'all') {
          if (log.teacherId !== adminSelectedTeacherId) {
            return false;
          }
        }

        // Group filter
        if (selectedGroupId !== 'all' && log.groupId !== selectedGroupId) return false;

        // Subject filter
        if (selectedSubject !== 'all' && log.subject !== selectedSubject) return false;

        // Period filter
        if (selectedPeriod !== 'all' && log.period !== selectedPeriod) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const topic = (log.topic || '').toLowerCase();
          const desc = (log.activitiesDescription || '').toLowerCase();
          const tasks = (log.tasksAssigned || '').toLowerCase();
          const agreements = (log.pedagogicalAgreements || '').toLowerCase();
          const subj = (log.subject || '').toLowerCase();
          const tName = (log.teacherName || '').toLowerCase();
          return (
            topic.includes(q) ||
            desc.includes(q) ||
            tasks.includes(q) ||
            agreements.includes(q) ||
            subj.includes(q) ||
            tName.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    dailyLogs,
    isTeacher,
    activeTeacher,
    currentUser,
    adminSelectedTeacherId,
    selectedGroupId,
    selectedSubject,
    selectedPeriod,
    searchQuery,
  ]);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const [formGroupId, setFormGroupId] = useState<string>(accessibleGroups[0]?.id || groups[0]?.id || '');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formPeriod, setFormPeriod] = useState<string>(settings.currentPeriod || 'Periodo 1');
  const [formTopic, setFormTopic] = useState<string>('');
  const [formObjective, setFormObjective] = useState<string>('');
  const [formActivities, setFormActivities] = useState<string>('');
  const [formTasks, setFormTasks] = useState<string>('');
  const [formAgreements, setFormAgreements] = useState<string>('');
  const [formResources, setFormResources] = useState<string>('Pizarrón, Cuaderno de trabajo, Guía didáctica');
  const [formAttachments, setFormAttachments] = useState<DriveFileAttachment[]>([]);

  // Single Entry View Modal
  const [viewingLog, setViewingLog] = useState<ClassDailyLog | null>(null);

  // Form available subjects based on selected group in the form
  const formAvailableSubjects = useMemo(() => {
    const grp = groups.find((g) => g.id === formGroupId);
    if (!grp) return ['Matemáticas'];
    if (isTeacher && activeTeacher) {
      return getSubjectsForGroupAndTeacher(grp, activeTeacher, teachers, settings, true);
    }
    return getSubjectsForGroupAndTeacher(grp, null, teachers, settings, false);
  }, [formGroupId, groups, isTeacher, activeTeacher, teachers, settings]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const defaultGroup = accessibleGroups[0]?.id || groups[0]?.id || '';
    const initialGrp = groups.find((g) => g.id === defaultGroup);
    const validSubs = isTeacher && activeTeacher
      ? getSubjectsForGroupAndTeacher(initialGrp, activeTeacher, teachers, settings, true)
      : (initialGrp?.subjects || ['Matemáticas']);
    const defaultSub = validSubs[0] || 'Matemáticas';
    const today = new Date().toISOString().split('T')[0];

    setEditingLogId(null);
    setFormGroupId(defaultGroup);
    setFormSubject(defaultSub);
    setFormDate(today);
    setFormPeriod(settings.currentPeriod || 'Periodo 1');
    setFormTopic('');
    setFormObjective('');
    setFormActivities('');
    setFormTasks('');
    setFormAgreements('');
    setFormResources('Pizarrón, Guía de trabajo impresa, Cuaderno');
    setFormAttachments([]);
    setIsModalOpen(true);
  };

  // Open Edit Modal with strict ownership verification
  const handleOpenEdit = (log: ClassDailyLog) => {
    if (isTeacher) {
      const effectiveTeacherId = activeTeacher?.id || currentUser?.id || 'tch-1';
      if (log.teacherId !== effectiveTeacherId) {
        alert('Acceso denegado: Solo puedes editar los registros de tu propio diario de clase.');
        return;
      }
    }

    setEditingLogId(log.id);
    setFormGroupId(log.groupId);
    setFormSubject(log.subject);
    setFormDate(log.date);
    setFormPeriod(log.period);
    setFormTopic(log.topic);
    setFormObjective(log.objective || '');
    setFormActivities(log.activitiesDescription);
    setFormTasks(log.tasksAssigned || '');
    setFormAgreements(log.pedagogicalAgreements || '');
    setFormResources(log.resourcesUsed || '');
    setFormAttachments(log.attachments || []);
    setIsModalOpen(true);
  };

  // Duplicate Log with strict teacher ownership
  const handleDuplicate = (log: ClassDailyLog) => {
    const effectiveTeacherId = isTeacher
      ? (activeTeacher?.id || currentUser?.id || 'tch-1')
      : (log.teacherId || 'tch-1');
    
    const effectiveTeacherName = isTeacher
      ? (activeTeacher?.name || currentUser?.name || 'Docente')
      : (log.teacherName || teacherMap.get(log.teacherId)?.name || 'Docente');

    if (isTeacher && log.teacherId !== effectiveTeacherId) {
      alert('Solo puedes duplicar registros de tu propio diario de campo.');
      return;
    }

    const duplicated: ClassDailyLog = {
      ...log,
      id: `log-${Date.now()}`,
      teacherId: effectiveTeacherId,
      teacherName: effectiveTeacherName,
      date: new Date().toISOString().split('T')[0],
      topic: `${log.topic} (Copia)`,
      attachments: log.attachments ? [...log.attachments] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdateDailyLogs([duplicated, ...dailyLogs]);
  };

  // Delete Log with strict teacher ownership
  const handleDelete = (id: string) => {
    const targetLog = dailyLogs.find((l) => l.id === id);
    if (!targetLog) return;

    if (isTeacher) {
      const effectiveTeacherId = activeTeacher?.id || currentUser?.id || 'tch-1';
      if (targetLog.teacherId !== effectiveTeacherId) {
        alert('Acceso denegado: Solo puedes eliminar registros de tu propio diario de campo.');
        return;
      }
    }

    if (window.confirm('¿Estás seguro de que deseas eliminar este registro del diario de campo?')) {
      onUpdateDailyLogs(dailyLogs.filter((l) => l.id !== id));
    }
  };

  // Save Log (Create or Edit)
  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim() || !formActivities.trim() || !formGroupId || !formSubject) {
      alert('Por favor completa el tema, el desarrollo de la clase, el grupo y la asignatura.');
      return;
    }

    // Resolve teacher assignment for the log
    const effectiveTeacherId = isTeacher
      ? (activeTeacher?.id || currentUser?.id || 'tch-1')
      : (adminSelectedTeacherId !== 'all' ? adminSelectedTeacherId : (activeTeacher?.id || currentUser?.id || 'tch-1'));

    const effectiveTeacherObj = teachers.find((t) => t.id === effectiveTeacherId) || activeTeacher;
    const effectiveTeacherName = effectiveTeacherObj?.name || currentUser?.name || 'Docente';

    // Auto-calculate attendance summary for this date & group
    const dayAttendance = attendance.filter((a) => a.groupId === formGroupId && a.date === formDate);
    const presentCount = dayAttendance.filter((a) => a.status === 'present').length;
    const absentCount = dayAttendance.filter(
      (a) => a.status === 'absent' || a.status === 'unexcused_absence' || a.status === 'evasion'
    ).length;
    const lateCount = dayAttendance.filter((a) => a.status === 'late').length;
    const excusedCount = dayAttendance.filter(
      (a) => a.status === 'excused' || a.status === 'excused_absence' || a.status === 'medical_leave'
    ).length;

    const summary = dayAttendance.length > 0 ? {
      totalStudents: dayAttendance.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
    } : undefined;

    if (editingLogId) {
      // Edit: strictly enforce ownership if teacher
      const existing = dailyLogs.find((l) => l.id === editingLogId);
      if (isTeacher && existing && existing.teacherId !== effectiveTeacherId) {
        alert('Acceso denegado: No tienes autorización para modificar los registros de otros docentes.');
        return;
      }

      const updated = dailyLogs.map((l) => {
        if (l.id === editingLogId) {
          return {
            ...l,
            groupId: formGroupId,
            teacherId: isTeacher ? effectiveTeacherId : l.teacherId,
            teacherName: isTeacher ? effectiveTeacherName : (l.teacherName || effectiveTeacherName),
            subject: formSubject,
            date: formDate,
            period: formPeriod,
            topic: formTopic.trim(),
            objective: formObjective.trim() || undefined,
            activitiesDescription: formActivities.trim(),
            tasksAssigned: formTasks.trim() || undefined,
            pedagogicalAgreements: formAgreements.trim() || undefined,
            resourcesUsed: formResources.trim() || undefined,
            attendanceSummary: summary || l.attendanceSummary,
            attachments: formAttachments,
            updatedAt: new Date().toISOString(),
          };
        }
        return l;
      });
      onUpdateDailyLogs(updated);
    } else {
      // Create
      const newLog: ClassDailyLog = {
        id: `log-${Date.now()}`,
        groupId: formGroupId,
        teacherId: effectiveTeacherId,
        teacherName: effectiveTeacherName,
        subject: formSubject,
        date: formDate,
        period: formPeriod,
        topic: formTopic.trim(),
        objective: formObjective.trim() || undefined,
        activitiesDescription: formActivities.trim(),
        tasksAssigned: formTasks.trim() || undefined,
        pedagogicalAgreements: formAgreements.trim() || undefined,
        resourcesUsed: formResources.trim() || undefined,
        attendanceSummary: summary,
        attachments: formAttachments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onUpdateDailyLogs([newLog, ...dailyLogs]);
    }

    setIsModalOpen(false);
  };

  // Helper for quick resources addition
  const toggleResource = (item: string) => {
    const list = formResources.split(',').map((r) => r.trim()).filter(Boolean);
    if (list.includes(item)) {
      setFormResources(list.filter((r) => r !== item).join(', '));
    } else {
      setFormResources([...list, item].join(', '));
    }
  };

  const commonResources = [
    'Pizarrón',
    'Guía impresa',
    'Cuaderno de trabajo',
    'Calculadora científica',
    'Proyector audiovisual',
    'Laboratorio / Reactivos',
    'Plataforma digital / TICs',
    'Material concreto / Fichas',
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                {isTeacher ? 'Mi Diario de Campo & Bitácora Pedagógica' : 'Diario de Campo & Bitácora Institucional'}
              </h2>
              {isTeacher ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exclusivo Docente: {activeTeacher?.name || currentUser?.name || 'Mi Perfil'}</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Supervisión Institucional</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              {isTeacher
                ? `Espacio pedagógico personal. Registra y documenta únicamente tus clases desarrolladas: temas, competencias/DBA, compromisos, acuerdos de convivencia y evidencias en Google Drive.`
                : 'Supervisión y consulta de bitácoras de clase pedagógicas registradas por los docentes de la institución.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Registro de Clase</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDriveExplorerOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-amber-200 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/60 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Explorador de archivos, guías y fotografías en Google Drive"
            >
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Google Drive</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Diario</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80">
          {/* Admin Teacher Selector */}
          {!isTeacher && (
            <div>
              <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                <UserCheck className="w-3 h-3" />
                <span>Docente</span>
              </label>
              <select
                value={adminSelectedTeacherId}
                onChange={(e) => {
                  setAdminSelectedTeacherId(e.target.value);
                  setSelectedGroupId('all');
                  setSelectedSubject('all');
                }}
                className="w-full bg-slate-800 border border-indigo-500/40 text-indigo-100 text-xs font-medium rounded-xl p-2.5 shadow-sm"
              >
                <option value="all" className="bg-slate-900 text-slate-100">
                  Todos los Docentes ({teachers.length})
                </option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                    {t.name} {t.specialty ? `(${t.specialty})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group Filter */}
          <div className={!isTeacher ? 'sm:col-span-1' : 'sm:col-span-1 lg:col-span-1'}>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Curso / Grupo
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedSubject('all');
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium rounded-xl p-2.5 shadow-sm"
            >
              <option value="all" className="bg-slate-900 text-slate-100">Todos los Cursos</option>
              {accessibleGroups.map((g) => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                  {g.name} ({g.grade} - {g.shift})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Asignatura
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium rounded-xl p-2.5 shadow-sm"
            >
              <option value="all" className="bg-slate-900 text-slate-100">Todas las Asignaturas</option>
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub} className="bg-slate-900 text-slate-100">
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Periodo
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium rounded-xl p-2.5 shadow-sm"
            >
              <option value="all" className="bg-slate-900 text-slate-100">Todos los Periodos</option>
              <option value="Periodo 1" className="bg-slate-900 text-slate-100">Periodo 1</option>
              <option value="Periodo 2" className="bg-slate-900 text-slate-100">Periodo 2</option>
              <option value="Periodo 3" className="bg-slate-900 text-slate-100">Periodo 3</option>
              <option value="Periodo 4" className="bg-slate-900 text-slate-100">Periodo 4</option>
            </select>
          </div>

          {/* Search Box */}
          <div className={isTeacher ? 'lg:col-span-2' : ''}>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Buscar Tema o Contenido
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tema, actividad, tarea..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isTeacher ? 'Mis Sesiones Registradas' : 'Sesiones Registradas'}
            </span>
            <div className="text-2xl font-black text-slate-100 mt-0.5">{filteredLogs.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cursos con Bitácora</span>
            <div className="text-2xl font-black text-slate-100 mt-0.5">
              {new Set(filteredLogs.map((l) => l.groupId)).size}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asignaturas Documentadas</span>
            <div className="text-2xl font-black text-slate-100 mt-0.5">
              {new Set(filteredLogs.map((l) => l.subject)).size}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/40 border border-amber-600/30 flex items-center justify-center text-amber-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-200">No hay registros de diario encontrados</h3>
            <p className="text-xs text-slate-400">
              {searchQuery || selectedGroupId !== 'all' || selectedSubject !== 'all'
                ? 'No se encontraron entradas con los filtros seleccionados. Prueba cambiando los criterios de búsqueda.'
                : isTeacher
                ? `Aún no has registrado ninguna sesión de clase para tu perfil (${activeTeacher?.name || currentUser?.name}). Haz clic en "Nuevo Registro de Clase" para iniciar tu bitácora personal.`
                : 'Aún no se han registrado sesiones de clase para este criterio.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Entrada</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const group = groupMap.get(log.groupId);
            const isOwnLog = isTeacher
              ? log.teacherId === (activeTeacher?.id || currentUser?.id || 'tch-1')
              : true;
            const logTeacherName = log.teacherName || teacherMap.get(log.teacherId)?.name || 'Docente Asignado';

            return (
              <div
                key={log.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition-all space-y-4"
              >
                {/* Entry Top Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-700/50 text-amber-300 font-bold text-xs flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{log.date}</span>
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 font-bold text-xs">
                      {group?.name || 'Curso'} ({group?.shift || 'Jornada'})
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-semibold text-xs">
                      {log.subject}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium">
                      {log.period}
                    </span>

                    {/* Teacher identity indicator */}
                    {!isTeacher && (
                      <span className="px-2.5 py-0.5 rounded-md bg-violet-950/60 border border-violet-700/40 text-violet-300 text-[11px] font-medium flex items-center space-x-1">
                        <UserCheck className="w-3 h-3 text-violet-400" />
                        <span>Docente: {logTeacherName}</span>
                      </span>
                    )}

                    {isTeacher && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-700/30 text-amber-300/90 text-[11px] font-medium flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3 text-amber-400" />
                        <span>Mi Registro</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                    {/* View / Print Single Log Button */}
                    <button
                      type="button"
                      onClick={() => setViewingLog(log)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition-colors"
                      title="Ver Ficha Pedagógica Completa"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {onNavigateToAttendance && (
                      <button
                        type="button"
                        onClick={() => onNavigateToAttendance(log.groupId, log.date)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors"
                        title="Ver Asistencia de esta fecha"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                      </button>
                    )}

                    {onNavigateToGrades && (
                      <button
                        type="button"
                        onClick={() => onNavigateToGrades(log.groupId, log.subject)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 transition-colors"
                        title="Ver Calificaciones de esta asignatura"
                      >
                        <GraduationCap className="w-4 h-4" />
                      </button>
                    )}

                    {isOwnLog && (
                      <button
                        type="button"
                        onClick={() => handleDuplicate(log)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-400 transition-colors"
                        title="Duplicar como plantilla"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}

                    {isOwnLog && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(log)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                        title="Editar registro"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {isOwnLog && (
                      <button
                        type="button"
                        onClick={() => handleDelete(log.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Topic & Objective */}
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                    <span className="text-amber-400">📖</span>
                    <span>{log.topic}</span>
                  </h3>
                  {log.objective && (
                    <p className="text-xs text-slate-400 italic">
                      <strong className="text-slate-300 not-italic">Competencia / Objetivo:</strong> {log.objective}
                    </p>
                  )}
                </div>

                {/* Class Activities Content */}
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Desarrollo de la Clase & Actividades Realizadas
                  </span>
                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    {log.activitiesDescription}
                  </p>
                </div>

                {/* Drive Attachments (Photos, PDFs, Guides) */}
                {log.attachments && log.attachments.length > 0 && (
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span className="flex items-center space-x-1.5 text-amber-400">
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Archivos & Fotografías en Google Drive ({log.attachments.length})</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {log.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            {att.thumbnailLink ? (
                              <img
                                src={att.thumbnailLink}
                                alt={att.name}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 object-cover rounded shadow-sm shrink-0"
                              />
                            ) : (
                              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            <span className="text-xs text-slate-200 truncate font-medium" title={att.name}>
                              {att.name}
                            </span>
                          </div>
                          <a
                            href={att.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                            title="Abrir en Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks & Agreements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {log.tasksAssigned && (
                    <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                        📝 Compromisos / Tareas Asignadas
                      </span>
                      <p className="text-slate-300 leading-relaxed">{log.tasksAssigned}</p>
                    </div>
                  )}

                  {log.pedagogicalAgreements && (
                    <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        🤝 Acuerdos & Observaciones Pedagógicas
                      </span>
                      <p className="text-slate-300 leading-relaxed">{log.pedagogicalAgreements}</p>
                    </div>
                  )}
                </div>

                {/* Footer: Resources, Teacher Name & Attendance Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    {log.resourcesUsed && (
                      <div className="text-[11px] text-slate-400">
                        <strong className="text-slate-300">Recursos:</strong> {log.resourcesUsed}
                      </div>
                    )}
                  </div>

                  {log.attendanceSummary && (
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-end sm:self-auto">
                      <span>Asistencia ({log.attendanceSummary.totalStudents}):</span>
                      <span className="text-emerald-400 font-bold">✓ {log.attendanceSummary.presentCount} pres.</span>
                      {log.attendanceSummary.absentCount > 0 && (
                        <span className="text-rose-400 font-bold">✗ {log.attendanceSummary.absentCount} aus.</span>
                      )}
                      {log.attendanceSummary.lateCount > 0 && (
                        <span className="text-amber-400 font-bold">⏰ {log.attendanceSummary.lateCount} ret.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT DAILY LOG ENTRY                                      */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[92dvh] overflow-y-auto flex flex-col text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    {editingLogId ? 'Editar Entrada de Diario' : 'Nuevo Registro de Diario de Campo'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Docente responsable: <strong className="text-amber-300">{activeTeacher?.name || currentUser?.name || 'Docente'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4">
              {/* Course & Subject Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Curso / Grupo *</label>
                  <select
                    value={formGroupId}
                    onChange={(e) => {
                      setFormGroupId(e.target.value);
                      const grp = groups.find((g) => g.id === e.target.value);
                      if (grp) {
                        const validSubs = isTeacher && activeTeacher
                          ? getSubjectsForGroupAndTeacher(grp, activeTeacher, teachers, settings, true)
                          : (grp.subjects || ['Matemáticas']);
                        if (validSubs.length > 0) {
                          setFormSubject(validSubs[0]);
                        }
                      }
                    }}
                    required
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  >
                    {accessibleGroups.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                        {g.name} ({g.grade} - {g.shift})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Asignatura *</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  >
                    {formAvailableSubjects.map((sub) => (
                      <option key={sub} value={sub} className="bg-slate-900 text-slate-100">
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Fecha de la Clase *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Period & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Periodo *</label>
                  <select
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Periodo 1">Periodo 1</option>
                    <option value="Periodo 2">Periodo 2</option>
                    <option value="Periodo 3">Periodo 3</option>
                    <option value="Periodo 4">Periodo 4</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Tema / DBA / Eje Temático Trabajado *
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="Ej. Funciones cuadráticas, Leyes de Newton, Célula eucariota..."
                    required
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Learning Objective */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Objetivo Pedagógico / Competencia (Opcional)
                </label>
                <input
                  type="text"
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value)}
                  placeholder="Ej. Identificar las propiedades fundamentales de..."
                  className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Activities Description */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Desarrollo de la Clase & Metodología Realizada *
                </label>
                <textarea
                  rows={4}
                  value={formActivities}
                  onChange={(e) => setFormActivities(e.target.value)}
                  placeholder="Describe las etapas: 1. Inicio/Saberes previos, 2. Conceptualización y práctica guiada, 3. Trabajo grupal o individual, 4. Evaluación formativa y cierre..."
                  required
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 leading-relaxed font-sans"
                />
              </div>

              {/* Tasks and Pedagogical Agreements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    📝 Compromisos / Tareas Asignadas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={formTasks}
                    onChange={(e) => setFormTasks(e.target.value)}
                    placeholder="Ej. Resolver ejercicios 1 al 5 del taller #2 para el viernes..."
                    className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    🤝 Acuerdos & Observaciones de Aula (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={formAgreements}
                    onChange={(e) => setFormAgreements(e.target.value)}
                    placeholder="Ej. Se acordó traer bata de laboratorio, excelente disciplina..."
                    className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Resources Used */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Recursos Didácticos Utilizados
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {commonResources.map((item) => {
                    const isSelected = formResources.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleResource(item)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600/30 border-amber-500 text-amber-200 font-semibold'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={formResources}
                  onChange={(e) => setFormResources(e.target.value)}
                  placeholder="Pizarrón, Guía de trabajo impresa, Cuaderno..."
                  className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Google Drive Attachments Manager */}
              {(() => {
                const targetGrp = groups.find((g) => g.id === formGroupId);
                return (
                  <div className="pt-2 border-t border-slate-800">
                    <DriveAttachmentsManager
                      attachments={formAttachments}
                      folderSegments={buildDailyLogFolderPathSegments(
                        settings.schoolName,
                        targetGrp?.grade || 'Grado',
                        targetGrp?.name || 'Grupo',
                        formDate,
                        formSubject || 'Materia'
                      )}
                      onUpdateAttachments={setFormAttachments}
                      title="Fotografías, Guías y Documentos de la Sesión en Google Drive"
                      description="Se guardarán en: Mi Unidad › [Colegio] › [Grado] › [Grupo] › Diario de Campo › [Fecha - Materia]"
                    />
                  </div>
                );
              })()}

              <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm pt-3 pb-1 border-t border-slate-800 flex items-center justify-end space-x-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
                >
                  {editingLogId ? 'Guardar Cambios' : 'Registrar en Diario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW / PRINT SINGLE LOG DETAIL                                     */}
      {/* ========================================================================= */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-auto max-h-[90dvh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Ficha de Diario Pedagógico</h3>
                  <p className="text-xs text-slate-400">{settings.schoolName || 'Institución Educativa'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha</span>
                  <span className="font-semibold text-slate-200">{viewingLog.date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Curso</span>
                  <span className="font-semibold text-slate-200">{groupMap.get(viewingLog.groupId)?.name || 'Curso'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asignatura</span>
                  <span className="font-semibold text-emerald-400">{viewingLog.subject}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Periodo</span>
                  <span className="font-semibold text-slate-200">{viewingLog.period}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Docente Responsable</span>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-slate-200 font-medium flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>{viewingLog.teacherName || teacherMap.get(viewingLog.teacherId)?.name || 'Docente Asignado'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tema / Eje Temático</span>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-slate-100 font-bold">
                  {viewingLog.topic}
                </div>
              </div>

              {viewingLog.objective && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Objetivo Pedagógico / Competencia</span>
                  <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                    {viewingLog.objective}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Desarrollo de la Clase & Metodología</span>
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-slate-200 whitespace-pre-line leading-relaxed">
                  {viewingLog.activitiesDescription}
                </div>
              </div>

              {(viewingLog.tasksAssigned || viewingLog.pedagogicalAgreements) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {viewingLog.tasksAssigned && (
                    <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">📝 Compromisos / Tareas</span>
                      <p className="text-slate-300">{viewingLog.tasksAssigned}</p>
                    </div>
                  )}
                  {viewingLog.pedagogicalAgreements && (
                    <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">🤝 Acuerdos de Aula</span>
                      <p className="text-slate-300">{viewingLog.pedagogicalAgreements}</p>
                    </div>
                  )}
                </div>
              )}

              {viewingLog.resourcesUsed && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recursos Didácticos</span>
                  <p className="text-slate-300 bg-slate-800/40 p-2 rounded-xl border border-slate-800">{viewingLog.resourcesUsed}</p>
                </div>
              )}

              {viewingLog.attendanceSummary && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Resumen de Asistencia ({viewingLog.attendanceSummary.totalStudents} estudiantes):</span>
                  <div className="flex space-x-2">
                    <span className="text-emerald-400 font-bold">✓ {viewingLog.attendanceSummary.presentCount} presentes</span>
                    {viewingLog.attendanceSummary.absentCount > 0 && (
                      <span className="text-rose-400 font-bold">✗ {viewingLog.attendanceSummary.absentCount} ausentes</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Imprimir Esta Ficha</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Global Explorer Modal */}
      <GoogleDriveExplorerModal
        isOpen={isDriveExplorerOpen}
        onClose={() => setIsDriveExplorerOpen(false)}
        settings={settings}
        groups={accessibleGroups}
        activities={[]}
        dailyLogs={filteredLogs}
        onUpdateDailyLogs={onUpdateDailyLogs}
      />
    </div>
  );
};
