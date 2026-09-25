import React, { useState, useMemo } from 'react';
import { 
  Student, 
  Group, 
  RemedialRecord, 
  AcademicPeriod, 
  SchoolSettings, 
  AuthUser,
  DriveFileAttachment,
  Activity,
  GradeRecord,
  SubjectConfig,
  EvaluationCategory
} from '../types';
import { 
  generateRemedialMessage, 
  createWhatsAppUrl 
} from '../utils/whatsapp';
import { DEFAULT_EVALUATION_CATEGORIES } from '../utils/storage';
import { BulkWhatsAppQueueModal, QueueItem } from './BulkWhatsAppQueueModal';
import { 
  CheckSquare, 
  Square, 
  Send, 
  HardDrive, 
  ExternalLink, 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Download, 
  Info,
  Sliders,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingDown,
  BookOpen
} from 'lucide-react';

interface PeriodRemedialsViewProps {
  group: Group;
  students: Student[];
  subject: string;
  selectedPeriod: string;
  periods: AcademicPeriod[];
  settings: SchoolSettings;
  remedials: RemedialRecord[];
  onUpdateRemedials: (remedials: RemedialRecord[]) => void;
  activities?: Activity[];
  grades?: GradeRecord[];
  subjectConfigs?: SubjectConfig[];
  currentUser?: AuthUser | null;
  canModify?: boolean;
  onLogNotification?: (
    studentId: string, 
    message: string, 
    type?: 'attendance' | 'late' | 'absent' | 'uniform' | 'grade' | 'general',
    meta?: { groupId?: string; groupName?: string; teacherId?: string; teacherName?: string }
  ) => void;
}

// Predefined quick pedagogical observation presets
const OBSERVATION_PRESETS = [
  'Entregó el taller completo y demostró dominio conceptual en la sustentación oral.',
  'Presentó el trabajo escrito pero requiere reforzar los temas clave en la sustentación.',
  'Superó satisfactoriamente los indicadores y competencias pendientes del periodo.',
  'No presentó el trabajo escrito ni se presentó a la sustentación en la fecha acordada.',
  'Presentó sustentación favorable, demostrando gran avance y compromiso académico.',
  'Se sugiere acompañamiento familiar y refuerzo en casa para los próximos periodos.'
];

export const PeriodRemedialsView: React.FC<PeriodRemedialsViewProps> = ({
  group,
  students,
  subject,
  selectedPeriod,
  periods,
  settings,
  remedials,
  onUpdateRemedials,
  activities = [],
  grades = [],
  subjectConfigs = [],
  currentUser,
  canModify = true,
  onLogNotification,
}) => {
  const [remedialPeriod, setRemedialPeriod] = useState<string>(selectedPeriod || 'Periodo 1');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'requires' | 'registered' | 'passed' | 'failed' | 'not_registered'>('all');
  
  // Weighting between Work and Support (default 40% - 60% or 50% - 50%)
  const [workWeight, setWorkWeight] = useState<number>(40);
  const supportWeight = useMemo(() => 100 - workWeight, [workWeight]);
  const [showWeightConfig, setShowWeightConfig] = useState(false);

  // Quick inline observation editor toggle for a student
  const [inlineExpandedStudentId, setInlineExpandedStudentId] = useState<string | null>(null);

  // Modal for editing single remedial details & Drive attachments
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [editingRemedial, setEditingRemedial] = useState<RemedialRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Bulk WhatsApp modal
  const [bulkData, setBulkData] = useState<{ isOpen: boolean; items: QueueItem[] }>({
    isOpen: false,
    items: [],
  });

  // Active students in group
  const groupStudents = useMemo(() => {
    return students
      .filter((s) => s.groupId === group.id && s.status === 'active')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, group.id]);

  // Current evaluation categories for this group and subject
  const resolvedCategories = useMemo(() => {
    const match = subjectConfigs.find(
      (sc) => sc.groupId === group.id && sc.subjectName === subject
    );
    if (match && match.categories && match.categories.length > 0) {
      return match.categories;
    }
    if (settings.evaluationCategories && settings.evaluationCategories.length > 0) {
      return settings.evaluationCategories;
    }
    return DEFAULT_EVALUATION_CATEGORIES;
  }, [subjectConfigs, group.id, subject, settings.evaluationCategories]);

  // Computed Period Grades directly from current activities and grades for the selected period
  const computedPeriodAverages = useMemo(() => {
    const map = new Map<string, { finalScore: number | null; isFailing: boolean }>();
    if (!activities || !grades || activities.length === 0) return map;

    const periodActivities = activities.filter(
      (a) => a.groupId === group.id && a.subject === subject && a.period === remedialPeriod
    );

    groupStudents.forEach((std) => {
      let weightedSum = 0;
      let totalWeightApplied = 0;

      resolvedCategories.forEach((cat) => {
        const catActs = periodActivities.filter(
          (a) => (a.categoryId || resolvedCategories[0]?.id) === cat.id
        );
        const catScores = catActs
          .map((a) => {
            const g = grades.find((grd) => grd.activityId === a.id && grd.studentId === std.id);
            return g?.score !== undefined ? g.score : null;
          })
          .filter((s): s is number => s !== null);

        if (catScores.length > 0) {
          const catAvg = catScores.reduce((acc, c) => acc + c, 0) / catScores.length;
          weightedSum += catAvg * (cat.weightPercentage / 100);
          totalWeightApplied += cat.weightPercentage;
        }
      });

      const finalScore = totalWeightApplied > 0 ? Number(weightedSum.toFixed(2)) : null;
      const isFailing = finalScore !== null && finalScore < (settings.passingScore || settings.minPassingScore || 3.5);
      map.set(std.id, { finalScore, isFailing });
    });

    return map;
  }, [activities, grades, group.id, subject, remedialPeriod, groupStudents, resolvedCategories, settings.passingScore]);

  // Current remedials map for this group, subject, and remedialPeriod
  const currentRemedialsMap = useMemo(() => {
    const map = new Map<string, RemedialRecord>();
    remedials.forEach((r) => {
      if (r.groupId === group.id && r.subject === subject && r.period === remedialPeriod) {
        map.set(r.studentId, r);
      }
    });
    return map;
  }, [remedials, group.id, subject, remedialPeriod]);

  // Helper to get or fallback remedial for a student
  const getRemedialForStudent = (studentId: string): RemedialRecord => {
    const existing = currentRemedialsMap.get(studentId);
    if (existing) return existing;

    const autoComputed = computedPeriodAverages.get(studentId);
    const autoFailingScore = autoComputed?.isFailing ? autoComputed.finalScore : null;
    const autoRequires = autoComputed?.isFailing ? true : false;

    return {
      id: `rem-${group.id}-${studentId}-${subject.replace(/\s+/g, '_')}-${remedialPeriod.replace(/\s+/g, '_')}`,
      studentId,
      groupId: group.id,
      subject,
      period: remedialPeriod,
      teacherId: currentUser?.id,
      teacherName: currentUser?.name || settings.teacherName,
      requiresRemedial: autoRequires,
      failingScore: autoFailingScore,
      failingReason: autoRequires ? 'Desempeño bajo en el periodo' : '',
      workDelivered: false,
      workScore: null,
      supportScore: null,
      finalScore: null,
      isPassed: false,
      workDriveLink: '',
      supportDriveLink: '',
      observations: '',
      notifiedWhatsApp: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Update a single remedial in state and trigger persistence
  const handleUpdateRemedial = (studentId: string, updates: Partial<RemedialRecord>) => {
    if (!canModify) return;
    const current = getRemedialForStudent(studentId);
    
    // Auto calculate final score if workScore or supportScore updated
    let calculatedFinal: number | null = updates.finalScore !== undefined ? updates.finalScore : current.finalScore;
    const nextWork = updates.workScore !== undefined ? updates.workScore : current.workScore;
    const nextSupport = updates.supportScore !== undefined ? updates.supportScore : current.supportScore;

    if (updates.workScore !== undefined || updates.supportScore !== undefined) {
      if (nextWork !== null && nextSupport !== null) {
        const val = (nextWork * (workWeight / 100)) + (nextSupport * (supportWeight / 100));
        calculatedFinal = Number(val.toFixed(2));
      } else if (nextWork !== null && nextSupport === null) {
        calculatedFinal = nextWork;
      } else if (nextWork === null && nextSupport !== null) {
        calculatedFinal = nextSupport;
      } else {
        calculatedFinal = null;
      }
    }

    const isPassed = calculatedFinal !== null ? calculatedFinal >= (settings.passingScore || settings.minPassingScore || 3.5) : false;

    const updated: RemedialRecord = {
      ...current,
      ...updates,
      finalScore: calculatedFinal,
      isPassed,
      updatedAt: new Date().toISOString(),
    };

    const remaining = remedials.filter(
      (r) => !(r.studentId === studentId && r.groupId === group.id && r.subject === subject && r.period === remedialPeriod)
    );
    const newRemedialsList = [...remaining, updated];
    onUpdateRemedials(newRemedialsList);
  };

  // Toggle whether the student must take the remedial
  const handleToggleRequiresRemedial = (studentId: string) => {
    if (!canModify) return;
    const current = getRemedialForStudent(studentId);
    const nextVal = !current.requiresRemedial;
    const autoComputed = computedPeriodAverages.get(studentId);
    const fallbackScore = current.failingScore ?? (autoComputed?.finalScore ?? null);

    handleUpdateRemedial(studentId, {
      requiresRemedial: nextVal,
      failingScore: nextVal ? fallbackScore : current.failingScore,
    });
  };

  // Auto-detect and flag failing students for this period
  const handleAutoIdentifyFailingStudents = () => {
    if (!canModify) return;
    const updatedList = [...remedials];
    let markedCount = 0;

    groupStudents.forEach((std) => {
      const autoComputed = computedPeriodAverages.get(std.id);
      if (autoComputed && autoComputed.isFailing && autoComputed.finalScore !== null) {
        const existingIdx = updatedList.findIndex(
          (r) => r.studentId === std.id && r.groupId === group.id && r.subject === subject && r.period === remedialPeriod
        );
        if (existingIdx >= 0) {
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            requiresRemedial: true,
            failingScore: updatedList[existingIdx].failingScore ?? autoComputed.finalScore,
            updatedAt: new Date().toISOString(),
          };
        } else {
          updatedList.push({
            id: `rem-${group.id}-${std.id}-${subject.replace(/\s+/g, '_')}-${remedialPeriod.replace(/\s+/g, '_')}`,
            studentId: std.id,
            groupId: group.id,
            subject,
            period: remedialPeriod,
            teacherId: currentUser?.id,
            teacherName: currentUser?.name || settings.teacherName,
            requiresRemedial: true,
            failingScore: autoComputed.finalScore,
            failingReason: 'Desempeño bajo en el periodo',
            workDelivered: false,
            workScore: null,
            supportScore: null,
            finalScore: null,
            isPassed: false,
            workDriveLink: '',
            supportDriveLink: '',
            observations: '',
            notifiedWhatsApp: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        markedCount++;
      }
    });

    onUpdateRemedials(updatedList);
    alert(`Se identificaron y señalaron ${markedCount} estudiante(s) con nota reprobada en ${remedialPeriod}.`);
  };

  // Toggle work delivery checklist
  const handleToggleWorkDelivery = (studentId: string) => {
    if (!canModify) return;
    const current = getRemedialForStudent(studentId);
    const nextDelivered = !current.workDelivered;
    handleUpdateRemedial(studentId, {
      workDelivered: nextDelivered,
      workDeliveredDate: nextDelivered ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  // Open Detailed Modal
  const handleOpenDetailModal = (student: Student) => {
    const rem = getRemedialForStudent(student.id);
    setSelectedStudentForModal(student);
    setEditingRemedial({ ...rem });
    setIsDetailModalOpen(true);
  };

  // Save Modal Changes
  const handleSaveModal = () => {
    if (!selectedStudentForModal || !editingRemedial) return;
    handleUpdateRemedial(selectedStudentForModal.id, editingRemedial);
    setIsDetailModalOpen(false);
  };

  // Delete Remedial Record
  const handleDeleteRemedialRecord = (studentId: string) => {
    if (!canModify) return;
    if (!window.confirm('¿Deseas restablecer y eliminar el registro de nivelación para este estudiante?')) return;
    const remaining = remedials.filter(
      (r) => !(r.studentId === studentId && r.groupId === group.id && r.subject === subject && r.period === remedialPeriod)
    );
    onUpdateRemedials(remaining);
  };

  // Send WhatsApp to Parent
  const handleSendWhatsAppNotification = (student: Student) => {
    const rem = getRemedialForStudent(student.id);
    if (!student.guardianPhone) {
      alert('El estudiante no tiene un número de teléfono de acudiente registrado.');
      return;
    }

    const msg = generateRemedialMessage(rem, student, group, settings);
    const url = createWhatsAppUrl(student.guardianPhone, student.guardianCountryCode || '+57', msg);
    window.open(url, '_blank');

    // Mark as notified
    handleUpdateRemedial(student.id, {
      notifiedWhatsApp: true,
      notifiedAt: new Date().toISOString(),
    });

    if (onLogNotification) {
      onLogNotification(student.id, msg, 'grade', {
        groupId: group.id,
        groupName: group.name,
        teacherId: currentUser?.id,
        teacherName: currentUser?.name || currentUser?.email,
      });
    }
  };

  // Start Bulk WhatsApp Queue for Remedials
  const handleStartBulkRemedialsWhatsApp = () => {
    const items: QueueItem[] = [];

    groupStudents.forEach((std) => {
      const rem = currentRemedialsMap.get(std.id) || (computedPeriodAverages.get(std.id)?.isFailing ? getRemedialForStudent(std.id) : null);
      if (rem && (rem.requiresRemedial || rem.workDelivered || rem.workScore !== null || rem.supportScore !== null || rem.finalScore !== null)) {
        const msg = generateRemedialMessage(rem, std, group, settings);
        items.push({
          id: std.id,
          studentName: `${std.firstName} ${std.lastName}`,
          guardianName: std.guardianName,
          guardianPhone: std.guardianPhone,
          guardianCountryCode: std.guardianCountryCode,
          message: msg,
          reason: `Nivelación ${remedialPeriod}: ${rem.finalScore !== null ? `Nota ${rem.finalScore.toFixed(1)}` : (rem.failingScore !== null ? `Reprobó con ${rem.failingScore?.toFixed(1)}` : 'Debe nivelar')}`,
          alreadySent: rem.notifiedWhatsApp,
        });
      }
    });

    if (items.length === 0) {
      alert('No hay estudiantes señalados para nivelar o con calificaciones registradas en este periodo.');
      return;
    }

    setBulkData({
      isOpen: true,
      items,
    });
  };

  // Export to CSV / Excel
  const handleExportExcel = () => {
    const headers = [
      'Documento',
      'Apellidos',
      'Nombres',
      'Grupo',
      'Asignatura',
      'Periodo_Nivelado',
      'Debe_Nivelar',
      'Nota_Reprobada_Periodo',
      'Trabajo_Entregado',
      'Fecha_Entrega',
      'Nota_Trabajo',
      'Nota_Sustentacion',
      'Nota_Definitiva_Nivelacion',
      'Estado_Nivelacion',
      'Link_Drive_Trabajo',
      'Link_Drive_Sustentacion',
      'Observaciones_Pedagogicas',
      'Acudiente',
      'Telefono_Acudiente',
      'Notificado_WhatsApp',
    ];

    const rows = groupStudents.map((std) => {
      const rem = getRemedialForStudent(std.id);
      const isRegistered = currentRemedialsMap.has(std.id);
      return [
        `"${std.documentId || ''}"`,
        `"${std.lastName}"`,
        `"${std.firstName}"`,
        `"${group.name}"`,
        `"${subject}"`,
        `"${remedialPeriod}"`,
        rem.requiresRemedial ? 'SÍ' : 'NO',
        rem.failingScore !== null && rem.failingScore !== undefined ? rem.failingScore.toFixed(1) : '',
        rem.workDelivered ? 'SÍ' : 'NO',
        `"${rem.workDeliveredDate || ''}"`,
        rem.workScore !== null ? rem.workScore.toFixed(1) : '',
        rem.supportScore !== null ? rem.supportScore.toFixed(1) : '',
        rem.finalScore !== null ? rem.finalScore.toFixed(1) : '',
        rem.finalScore !== null ? (rem.isPassed ? 'APROBADA' : 'NO APROBADA') : (rem.requiresRemedial ? 'DEBE NIVELAR' : (isRegistered ? 'EN PROCESO' : 'SIN REGISTRO')),
        `"${rem.workDriveLink || rem.workAttachment?.webViewLink || ''}"`,
        `"${rem.supportDriveLink || rem.supportAttachment?.webViewLink || ''}"`,
        `"${(rem.observations || '').replace(/"/g, '""')}"`,
        `"${std.guardianName || ''}"`,
        `"${std.guardianPhone || ''}"`,
        rem.notifiedWhatsApp ? 'SÍ' : 'NO',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nivelaciones_${group.name.replace(/\s+/g, '_')}_${subject.replace(/\s+/g, '_')}_${remedialPeriod.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtered list of students for display
  const displayedStudents = useMemo(() => {
    return groupStudents.filter((std) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = `${std.firstName} ${std.lastName}`.toLowerCase().includes(q);
        const matchesDoc = (std.documentId || '').includes(q);
        const matchesGuardian = (std.guardianName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDoc && !matchesGuardian) return false;
      }

      const rem = currentRemedialsMap.get(std.id);
      const autoComputed = computedPeriodAverages.get(std.id);
      const requires = rem?.requiresRemedial ?? (autoComputed?.isFailing || false);

      if (filterStatus === 'requires') {
        return requires;
      }
      if (filterStatus === 'registered') {
        return Boolean(rem && (rem.workDelivered || rem.workScore !== null || rem.supportScore !== null || rem.finalScore !== null));
      }
      if (filterStatus === 'passed') {
        return Boolean(rem && rem.finalScore !== null && rem.isPassed);
      }
      if (filterStatus === 'failed') {
        return Boolean(rem && rem.finalScore !== null && !rem.isPassed);
      }
      if (filterStatus === 'not_registered') {
        return !rem || (!rem.workDelivered && rem.workScore === null && rem.supportScore === null && rem.finalScore === null);
      }

      return true;
    });
  }, [groupStudents, searchQuery, currentRemedialsMap, computedPeriodAverages, filterStatus]);

  // Statistics Summary
  const stats = useMemo(() => {
    let requiresRemedialCount = 0;
    let registeredCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    let deliveredWorkCount = 0;
    let notifiedCount = 0;

    groupStudents.forEach((std) => {
      const rem = currentRemedialsMap.get(std.id);
      const autoComputed = computedPeriodAverages.get(std.id);
      const requires = rem?.requiresRemedial ?? (autoComputed?.isFailing || false);

      if (requires) requiresRemedialCount++;

      if (rem) {
        const hasData = rem.workDelivered || rem.workScore !== null || rem.supportScore !== null || rem.finalScore !== null;
        if (hasData) registeredCount++;
        if (rem.workDelivered) deliveredWorkCount++;
        if (rem.finalScore !== null) {
          if (rem.isPassed || rem.finalScore >= (settings.passingScore || settings.minPassingScore || 3.5)) {
            passedCount++;
          } else {
            failedCount++;
          }
        }
        if (rem.notifiedWhatsApp) notifiedCount++;
      }
    });

    return {
      total: groupStudents.length,
      requiresRemedialCount,
      registeredCount,
      passedCount,
      failedCount,
      deliveredWorkCount,
      notifiedCount,
    };
  }, [groupStudents, currentRemedialsMap, computedPeriodAverages, settings.passingScore]);

  return (
    <div className="space-y-4">
      {/* Control Header & Period Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Title & Period Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span>Nivelaciones de Periodos Pasados</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 font-mono">
                    SIEE
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Identifica quién debe nivelar, registra la nota reprobada, entrega de trabajo, sustentación, evidencias Drive y observaciones pedagógicas.
                </p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Periodo a Nivelar:
              </span>
              <select
                id="select-remedial-period"
                value={remedialPeriod}
                onChange={(e) => setRemedialPeriod(e.target.value)}
                className="bg-slate-800 text-slate-100 text-xs font-bold rounded-lg px-2.5 py-1 border border-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {periods.map((p) => (
                  <option key={p.id || p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-identify failing students */}
            <button
              id="btn-auto-identify-failing"
              type="button"
              onClick={handleAutoIdentifyFailingStudents}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-amber-200 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 rounded-xl transition-all shadow-sm"
              title={`Detecta automáticamente quiénes reprobaron este periodo (< ${(settings.passingScore || settings.minPassingScore || 3.5).toFixed(1)}) y precarga su nota reprobada`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Detectar Reprobados</span>
            </button>

            {/* Weight Configuration Toggle */}
            <button
              type="button"
              onClick={() => setShowWeightConfig(!showWeightConfig)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors shadow-sm"
              title="Configurar porcentaje de Trabajo Escrito y Sustentación"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ponderación: {workWeight}% / {supportWeight}%</span>
              {showWeightConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Bulk WhatsApp */}
            <button
              type="button"
              onClick={handleStartBulkRemedialsWhatsApp}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl transition-all shadow-sm"
              title="Enviar resultados de nivelación por WhatsApp a los acudientes en lote"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Notificar Lote (WhatsApp)</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors shadow-sm"
              title="Descargar registro de nivelaciones en formato CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Weighting Slider Collapse */}
        {showWeightConfig && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 bg-slate-950/40 p-3 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                <span className="font-bold text-amber-400">Ponderación de la Definitiva de Nivelación:</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ajusta la proporción entre la nota del trabajo escrito ({workWeight}%) y la sustentación ({supportWeight}%).
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-slate-300">Trabajo: {workWeight}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={workWeight}
                  onChange={(e) => setWorkWeight(Number(e.target.value))}
                  className="w-36 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-xs font-semibold text-slate-300">Sustentación: {supportWeight}%</span>
                <button
                  type="button"
                  onClick={() => setWorkWeight(40)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700"
                >
                  40 / 60
                </button>
                <button
                  type="button"
                  onClick={() => setWorkWeight(50)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700"
                >
                  50 / 50
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estudiantes</p>
          <p className="text-lg font-bold text-slate-100 mt-0.5">{stats.total}</p>
          <p className="text-[10px] text-slate-500">en {group.name}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Deben Nivelar</p>
          <p className="text-lg font-bold text-amber-300 mt-0.5">{stats.requiresRemedialCount}</p>
          <p className="text-[10px] text-slate-500">señalados / reprobados</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Trabajos Entregados</p>
          <p className="text-lg font-bold text-indigo-300 mt-0.5">{stats.deliveredWorkCount}</p>
          <p className="text-[10px] text-slate-500">checklist completado</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Aprobadas (≥ {(settings.passingScore || settings.minPassingScore || 3.5).toFixed(1)})</p>
          <p className="text-lg font-bold text-emerald-300 mt-0.5">{stats.passedCount}</p>
          <p className="text-[10px] text-emerald-500/80">superaron periodo</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">No Superadas (&lt; {(settings.passingScore || settings.minPassingScore || 3.5).toFixed(1)})</p>
          <p className="text-lg font-bold text-rose-300 mt-0.5">{stats.failedCount}</p>
          <p className="text-[10px] text-rose-500/80">requieren refuerzo</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Notificados</p>
          <p className="text-lg font-bold text-teal-300 mt-0.5">{stats.notifiedCount}</p>
          <p className="text-[10px] text-slate-500">acudientes informados</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar estudiante por nombre, documento o acudiente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'all'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({groupStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('requires')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ${
              filterStatus === 'requires'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Deben Nivelar ({stats.requiresRemedialCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('registered')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'registered'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Con Registro ({stats.registeredCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('passed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'passed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Aprobados ({stats.passedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('failed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'failed'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            No Aprobados ({stats.failedCount})
          </button>
        </div>
      </div>

      {/* Main Remedials Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Estudiante</th>
                
                {/* 0. Señalar quién debe nivelar */}
                <th className="py-3 px-3 text-center min-w-[130px]">
                  <div className="flex flex-col items-center">
                    <span className="text-amber-400">¿Debe Nivelar?</span>
                    <span className="text-[9px] text-slate-500 font-normal">Asignación</span>
                  </div>
                </th>

                {/* 0.1 Nota Reprobada del Periodo */}
                <th className="py-3 px-3 text-center min-w-[120px]">
                  <div className="flex flex-col items-center">
                    <span className="text-rose-400">Nota Reprobada</span>
                    <span className="text-[9px] text-slate-500 font-normal">{remedialPeriod}</span>
                  </div>
                </th>

                {/* 1. Checklist Entrega de Trabajo */}
                <th className="py-3 px-3 text-center min-w-[120px]">
                  <div className="flex flex-col items-center">
                    <span className="text-amber-300">1. Entrega Trabajo</span>
                    <span className="text-[9px] text-slate-500 font-normal">Checklist</span>
                  </div>
                </th>

                {/* 2. Nota Trabajo */}
                <th className="py-3 px-3 text-center min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span className="text-indigo-300">2. Nota Trabajo</span>
                    <span className="text-[9px] text-slate-500 font-normal">({workWeight}%)</span>
                  </div>
                </th>

                {/* 3. Nota Sustentación */}
                <th className="py-3 px-3 text-center min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span className="text-purple-300">3. Sustentación</span>
                    <span className="text-[9px] text-slate-500 font-normal">({supportWeight}%)</span>
                  </div>
                </th>

                {/* 4. Definitiva Nivelación */}
                <th className="py-3 px-3 text-center min-w-[120px]">
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-400">4. Definitiva</span>
                    <span className="text-[9px] text-slate-500 font-normal">Nivelación</span>
                  </div>
                </th>

                {/* 5. Evidencias Drive */}
                <th className="py-3 px-3 text-center min-w-[140px]">
                  <div className="flex flex-col items-center">
                    <span className="text-sky-300">5. Evidencias Drive</span>
                    <span className="text-[9px] text-slate-500 font-normal">Trabajo & Sust.</span>
                  </div>
                </th>

                {/* 6. Observaciones Pedagógicas */}
                <th className="py-3 px-3 text-center min-w-[160px]">
                  <div className="flex flex-col items-center">
                    <span className="text-slate-300">6. Observaciones</span>
                    <span className="text-[9px] text-slate-500 font-normal">Pedagógicas / Plan</span>
                  </div>
                </th>

                {/* 7. Notificar WhatsApp */}
                <th className="py-3 px-3 text-center min-w-[110px]">
                  <div className="flex flex-col items-center">
                    <span className="text-teal-400">7. Notificar</span>
                    <span className="text-[9px] text-slate-500 font-normal">Acudiente</span>
                  </div>
                </th>

                <th className="py-3 px-2 text-center w-12">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">No se encontraron estudiantes para este filtro.</p>
                    <p className="text-[11px] text-slate-600 mt-1">Prueba cambiando los criterios de búsqueda o el periodo seleccionado.</p>
                  </td>
                </tr>
              ) : (
                displayedStudents.map((std, idx) => {
                  const rem = getRemedialForStudent(std.id);
                  const isDelivered = rem.workDelivered;
                  const hasWorkLink = Boolean(rem.workDriveLink || rem.workAttachment?.webViewLink);
                  const hasSupportLink = Boolean(rem.supportDriveLink || rem.supportAttachment?.webViewLink);
                  const isPassed = rem.finalScore !== null ? (rem.isPassed || rem.finalScore >= (settings.passingScore || settings.minPassingScore || 3.5)) : false;
                  const autoComputed = computedPeriodAverages.get(std.id);
                  const isInlineExpanded = inlineExpandedStudentId === std.id;

                  return (
                    <React.Fragment key={std.id}>
                      <tr
                        className={`hover:bg-slate-800/40 transition-colors group ${
                          rem.requiresRemedial ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        {/* # Index */}
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Student Info */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                              {std.firstName[0]}{std.lastName[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                                {std.lastName}, {std.firstName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                Doc: {std.documentId || 'S/N'} • {std.guardianName ? `Acudiente: ${std.guardianName}` : 'Sin acudiente'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 0. ¿Debe Nivelar? (Toggle) */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRequiresRemedial(std.id)}
                            disabled={!canModify}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                              rem.requiresRemedial
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 shadow-sm'
                                : 'bg-slate-800/80 text-slate-500 border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                            title={rem.requiresRemedial ? 'Señala que el estudiante DEBE nivelar. Clic para desmarcar.' : 'Clic para señalar que debe nivelar'}
                          >
                            {rem.requiresRemedial ? (
                              <>
                                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span>Debe Nivelar</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-3.5 h-3.5 text-slate-500" />
                                <span>No Requiere</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* 0.1 Nota Reprobada del Periodo */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              min="1.0"
                              max="5.0"
                              step="0.1"
                              placeholder={autoComputed?.finalScore !== null && autoComputed?.finalScore !== undefined ? autoComputed.finalScore.toFixed(1) : '-'}
                              value={rem.failingScore !== null && rem.failingScore !== undefined ? rem.failingScore : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                handleUpdateRemedial(std.id, { 
                                  failingScore: isNaN(val as number) ? null : val,
                                  requiresRemedial: val !== null ? true : rem.requiresRemedial
                                });
                              }}
                              disabled={!canModify}
                              className={`w-16 text-center py-1 rounded-lg text-xs font-bold border transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                                rem.failingScore !== null && rem.failingScore !== undefined
                                  ? rem.failingScore < (settings.passingScore || settings.minPassingScore || 3.5)
                                    ? 'bg-rose-950/60 text-rose-300 border-rose-700/60'
                                    : 'bg-slate-800 text-slate-200 border-slate-700'
                                  : 'bg-slate-950 text-slate-400 border-slate-700'
                              }`}
                              title="Nota con la que reprobó la asignatura en el periodo seleccionado"
                            />
                            {autoComputed?.finalScore !== null && autoComputed?.finalScore !== undefined && rem.failingScore === null && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRemedial(std.id, { failingScore: autoComputed.finalScore, requiresRemedial: true })}
                                className="text-[10px] text-amber-400 hover:text-amber-300 p-1"
                                title={`Cargar nota calculada del periodo (${autoComputed.finalScore.toFixed(1)})`}
                              >
                                ⚡
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 1. Checklist Entrega de Trabajo */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleWorkDelivery(std.id)}
                            disabled={!canModify}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                              isDelivered
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                            }`}
                            title={isDelivered ? `Entregado el: ${rem.workDeliveredDate || 'Registrado'}. Haz clic para desmarcar.` : 'Haz clic para marcar como entregado'}
                          >
                            {isDelivered ? (
                              <>
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                                <span>Entregó</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4 text-slate-500" />
                                <span>No Entregó</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* 2. Nota de Trabajo */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              min="1.0"
                              max="5.0"
                              step="0.1"
                              placeholder="-"
                              value={rem.workScore !== null ? rem.workScore : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                handleUpdateRemedial(std.id, { workScore: isNaN(val as number) ? null : val });
                              }}
                              disabled={!canModify}
                              className={`w-16 text-center py-1 rounded-lg text-xs font-bold border transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none ${
                                rem.workScore !== null
                                  ? rem.workScore >= (settings.passingScore || settings.minPassingScore || 3.5)
                                    ? 'bg-slate-800 text-emerald-300 border-emerald-700/50'
                                    : 'bg-slate-800 text-rose-300 border-rose-700/50'
                                  : 'bg-slate-950 text-slate-400 border-slate-700'
                              }`}
                            />
                          </div>
                        </td>

                        {/* 3. Nota de Sustentación */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              min="1.0"
                              max="5.0"
                              step="0.1"
                              placeholder="-"
                              value={rem.supportScore !== null ? rem.supportScore : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                handleUpdateRemedial(std.id, { supportScore: isNaN(val as number) ? null : val });
                              }}
                              disabled={!canModify}
                              className={`w-16 text-center py-1 rounded-lg text-xs font-bold border transition-colors focus:ring-2 focus:ring-purple-500 focus:outline-none ${
                                rem.supportScore !== null
                                  ? rem.supportScore >= (settings.passingScore || settings.minPassingScore || 3.5)
                                    ? 'bg-slate-800 text-emerald-300 border-emerald-700/50'
                                    : 'bg-slate-800 text-rose-300 border-rose-700/50'
                                  : 'bg-slate-950 text-slate-400 border-slate-700'
                              }`}
                            />
                          </div>
                        </td>

                        {/* 4. Definitiva Nivelación */}
                        <td className="py-2.5 px-3 text-center">
                          {rem.finalScore !== null ? (
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                                  isPassed
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                }`}
                              >
                                {rem.finalScore.toFixed(1)}
                              </span>
                              <span className="text-[9px] mt-0.5 font-semibold text-slate-400">
                                {isPassed ? 'Aprobada' : 'No Superada'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Pendiente</span>
                          )}
                        </td>

                        {/* 5. Evidencias en Google Drive */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Trabajo Drive Link */}
                            {hasWorkLink ? (
                              <a
                                href={rem.workDriveLink || rem.workAttachment?.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-700/60 hover:bg-sky-900 transition-colors inline-flex items-center space-x-1"
                                title="Ver Trabajo / Taller en Google Drive"
                              >
                                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                                <span className="text-[10px] font-bold">Trabajo</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(std)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors inline-flex items-center space-x-1"
                                title="Vincular enlace de Drive al Trabajo"
                              >
                                <Plus className="w-3 h-3" />
                                <span className="text-[10px]">Trabajo</span>
                              </button>
                            )}

                            {/* Sustentación Drive Link */}
                            {hasSupportLink ? (
                              <a
                                href={rem.supportDriveLink || rem.supportAttachment?.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-700/60 hover:bg-purple-900 transition-colors inline-flex items-center space-x-1"
                                title="Ver Evidencia de Sustentación en Google Drive"
                              >
                                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-[10px] font-bold">Sust.</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(std)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors inline-flex items-center space-x-1"
                                title="Vincular enlace de Drive a la Sustentación"
                              >
                                <Plus className="w-3 h-3" />
                                <span className="text-[10px]">Sust.</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 6. Observaciones Pedagógicas */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setInlineExpandedStudentId(isInlineExpanded ? null : std.id)}
                              className={`max-w-[150px] truncate text-left px-2 py-1 rounded border text-[11px] transition-colors inline-flex items-center space-x-1.5 ${
                                rem.observations
                                  ? 'bg-amber-950/30 text-amber-200 border-amber-700/50 hover:bg-amber-900/40'
                                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                              title={rem.observations || 'Sin observaciones. Clic para escribir.'}
                            >
                              <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{rem.observations || '+ Observación'}</span>
                            </button>
                          </div>
                        </td>

                        {/* 7. Notificar Acudiente */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppNotification(std)}
                              disabled={!std.guardianPhone}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                std.guardianPhone
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              }`}
                              title={std.guardianPhone ? `Enviar informe a ${std.guardianPhone}` : 'Sin teléfono de acudiente registrado'}
                            >
                              <Send className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </button>
                            {rem.notifiedWhatsApp && (
                              <span className="text-[9px] text-teal-400 flex items-center space-x-0.5 mt-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Enviado</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(std)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                              title="Editar detalle completo de la nivelación"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {currentRemedialsMap.has(std.id) && canModify && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRemedialRecord(std.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                title="Restablecer registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline Expanded Observation Editor Drawer */}
                      {isInlineExpanded && (
                        <tr className="bg-slate-950/90 border-b border-slate-800/80">
                          <td colSpan={12} className="p-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Observaciones Pedagógicas y Plan de Mejoramiento para {std.lastName}, {std.firstName}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setInlineExpandedStudentId(null)}
                                  className="text-xs text-slate-400 hover:text-slate-200"
                                >
                                  Cerrar ✕
                                </button>
                              </div>

                              <textarea
                                rows={2}
                                value={rem.observations || ''}
                                onChange={(e) => handleUpdateRemedial(std.id, { observations: e.target.value })}
                                placeholder="Escribe aquí las observaciones pedagógicas, acuerdos de recuperación o logros alcanzados..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />

                              {/* Observation Quick Presets */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Sugerencias rápidas:</span>
                                {OBSERVATION_PRESETS.map((preset, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => {
                                      const currentObs = rem.observations ? `${rem.observations} ${preset}` : preset;
                                      handleUpdateRemedial(std.id, { observations: currentObs });
                                    }}
                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md border border-slate-700 transition-colors"
                                  >
                                    + {preset.slice(0, 38)}...
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalle Completo de Nivelación & Enlaces Drive */}
      {isDetailModalOpen && selectedStudentForModal && editingRemedial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Nivelación de {remedialPeriod} • {subject}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Estudiante: <strong className="text-slate-200">{selectedStudentForModal.lastName}, {selectedStudentForModal.firstName}</strong> ({group.name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Section 0: Asignación y Nota Reprobada */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                0. Asignación a Nivelación y Nota Reprobada del Periodo
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Estado de Asignación:</label>
                  <button
                    type="button"
                    onClick={() => setEditingRemedial({ ...editingRemedial, requiresRemedial: !editingRemedial.requiresRemedial })}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
                      editingRemedial.requiresRemedial
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {editingRemedial.requiresRemedial ? <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                    <span>{editingRemedial.requiresRemedial ? 'Debe Nivelar (Asignado)' : 'No Requiere Nivelación'}</span>
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nota con la que Reprobó el Periodo (1.0 - 5.0):</label>
                  <input
                    type="number"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    placeholder="Ej. 2.4"
                    value={editingRemedial.failingScore !== null && editingRemedial.failingScore !== undefined ? editingRemedial.failingScore : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      setEditingRemedial({
                        ...editingRemedial,
                        failingScore: isNaN(val as number) ? null : val,
                        requiresRemedial: val !== null ? true : editingRemedial.requiresRemedial,
                      });
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full text-center"
                  />
                </div>
              </div>
            </div>

            {/* Checklist & Grades Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Checklist Entrega de Trabajo */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  1. Entrega de Trabajo / Taller
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !editingRemedial.workDelivered;
                      setEditingRemedial({
                        ...editingRemedial,
                        workDelivered: nextVal,
                        workDeliveredDate: nextVal ? new Date().toISOString().split('T')[0] : undefined,
                      });
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-2 ${
                      editingRemedial.workDelivered
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {editingRemedial.workDelivered ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                    <span>{editingRemedial.workDelivered ? 'Trabajo Entregado' : 'No Ha Entregado'}</span>
                  </button>
                </div>

                {editingRemedial.workDelivered && (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Fecha de Entrega:</label>
                    <input
                      type="date"
                      value={editingRemedial.workDeliveredDate || ''}
                      onChange={(e) => setEditingRemedial({ ...editingRemedial, workDeliveredDate: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
                    />
                  </div>
                )}
              </div>

              {/* 2. Calificaciones (Trabajo y Sustentación) */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                  2. Calificaciones y Definitiva
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nota Trabajo ({workWeight}%):</label>
                    <input
                      type="number"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      placeholder="1.0 - 5.0"
                      value={editingRemedial.workScore !== null ? editingRemedial.workScore : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setEditingRemedial({ ...editingRemedial, workScore: isNaN(val as number) ? null : val });
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nota Sustentación ({supportWeight}%):</label>
                    <input
                      type="number"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      placeholder="1.0 - 5.0"
                      value={editingRemedial.supportScore !== null ? editingRemedial.supportScore : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setEditingRemedial({ ...editingRemedial, supportScore: isNaN(val as number) ? null : val });
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-center"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Nota Definitiva de Nivelación:</span>
                  <span className="text-sm font-extrabold text-emerald-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                    {editingRemedial.workScore !== null || editingRemedial.supportScore !== null
                      ? (
                          ((editingRemedial.workScore || 0) * (workWeight / 100)) +
                          ((editingRemedial.supportScore || 0) * (supportWeight / 100))
                        ).toFixed(1)
                      : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidencias en Google Drive */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4">
              <label className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span>Evidencias Vinculadas a Google Drive</span>
              </label>

              {/* Link de Trabajo en Google Drive */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  📁 Enlace de Google Drive al Trabajo Escrito / Taller:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={editingRemedial.workDriveLink || ''}
                    onChange={(e) => setEditingRemedial({ ...editingRemedial, workDriveLink: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  {editingRemedial.workDriveLink && (
                    <a
                      href={editingRemedial.workDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Link de Sustentación en Google Drive */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  🗣️ Enlace de Google Drive a la Sustentación (Acta, Rúbrica, Foto o Grabación):
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={editingRemedial.supportDriveLink || ''}
                    onChange={(e) => setEditingRemedial({ ...editingRemedial, supportDriveLink: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  {editingRemedial.supportDriveLink && (
                    <a
                      href={editingRemedial.supportDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Observaciones Pedagógicas y Plan de Mejoramiento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>Observaciones Pedagógicas y Plan de Mejoramiento:</span>
                </label>
                <span className="text-[11px] text-slate-400">Visible en informe familiar y WhatsApp</span>
              </div>
              <textarea
                rows={4}
                placeholder="Escribe detalladamente los logros alcanzados, recomendaciones de refuerzo, compromisos familiares o acuerdos pedagógicos..."
                value={editingRemedial.observations || ''}
                onChange={(e) => setEditingRemedial({ ...editingRemedial, observations: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              {/* Suggestions chips in modal */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Insertar sugerencia:</span>
                {OBSERVATION_PRESETS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      const cur = editingRemedial.observations ? `${editingRemedial.observations} ${preset}` : preset;
                      setEditingRemedial({ ...editingRemedial, observations: cur });
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md border border-slate-700 transition-colors"
                  >
                    + {preset.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  handleSendWhatsAppNotification(selectedStudentForModal);
                }}
                disabled={!selectedStudentForModal.guardianPhone}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Reporte por WhatsApp</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-950 transition-colors"
                >
                  Guardar Nivelación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Queue Modal */}
      {bulkData.isOpen && (
        <BulkWhatsAppQueueModal
          isOpen={bulkData.isOpen}
          items={bulkData.items}
          onClose={() => setBulkData({ isOpen: false, items: [] })}
          onMarkSent={(id) => {
            handleUpdateRemedial(id, {
              notifiedWhatsApp: true,
              notifiedAt: new Date().toISOString(),
            });
          }}
        />
      )}
    </div>
  );
};
