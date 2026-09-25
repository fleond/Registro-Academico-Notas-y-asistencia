import React, { useState, useMemo } from 'react';
import { 
  Student, 
  Group, 
  Activity, 
  GradeRecord, 
  AttendanceRecord, 
  SchoolSettings,
  Teacher,
  SubjectConfig,
  EvaluationCategory,
  RemedialRecord
} from '../types';
import { DEFAULT_EVALUATION_CATEGORIES } from '../utils/storage';
import { 
  GraduationCap, 
  ClipboardCheck, 
  AlertTriangle, 
  Clock, 
  Shirt, 
  BookOpen, 
  MessageSquare, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  FileText,
  User,
  School,
  Award,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
  Paperclip,
  ExternalLink,
  Layers,
  CheckSquare
} from 'lucide-react';

interface ParentPortalModuleProps {
  student: Student;
  groups: Group[];
  activities: Activity[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  teachers: Teacher[];
  subjectConfigs?: SubjectConfig[];
  remedials?: RemedialRecord[];
  onSwitchStudent?: () => void;
}

export const ParentPortalModule: React.FC<ParentPortalModuleProps> = ({
  student,
  groups,
  activities,
  grades,
  attendance,
  settings,
  teachers,
  subjectConfigs = [],
  remedials = [],
  onSwitchStudent,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'grades' | 'attendance' | 'observations' | 'remedials' | 'bulletin'>('grades');
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Resolve Student's Group
  const studentGroup = useMemo(() => {
    return groups.find((g) => g.id === student.groupId) || {
      id: student.groupId,
      name: 'Sin Grupo Asignado',
      grade: '-',
      section: '-',
      schoolYear: settings.schoolYear,
      shift: 'Mañana' as const,
      directorName: settings.teacherName,
      subjects: ['Matemáticas', 'Lengua Castellana', 'Ciencias Naturales', 'Ciencias Sociales', 'Inglés'],
      createdAt: '',
    };
  }, [groups, student.groupId, settings]);

  // List of Available Periods
  const availablePeriods = useMemo(() => {
    const periodSet = new Set<string>();
    activities.forEach((act) => {
      if (act.period) periodSet.add(act.period);
    });
    if (periodSet.size === 0) {
      periodSet.add('Periodo 1');
      periodSet.add('Periodo 2');
      periodSet.add('Periodo 3');
      periodSet.add('Periodo 4');
    }
    return Array.from(periodSet);
  }, [activities]);

  // Filtered Activities by Period
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (act.groupId !== student.groupId) return false;
      if (selectedPeriod !== 'all' && act.period !== selectedPeriod) return false;
      return true;
    });
  }, [activities, student.groupId, selectedPeriod]);

  // Filtered Student Attendance Records
  const studentAttendance = useMemo(() => {
    return attendance
      .filter((att) => att.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, student.id]);

  // Attendance Statistics Calculation
  const attendanceStats = useMemo(() => {
    const totalDays = studentAttendance.length;
    if (totalDays === 0) {
      return {
        totalDays: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        totalLateMinutes: 0,
        attendancePercentage: 100,
        uniformComplete: 0,
        uniformIncomplete: 0,
        uniformNone: 0,
        uniformPercentage: 100,
      };
    }

    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    let totalLateMinutes = 0;
    let uniformComplete = 0;
    let uniformIncomplete = 0;
    let uniformNone = 0;

    studentAttendance.forEach((rec) => {
      if (rec.status === 'present') present++;
      else if (rec.status === 'late') {
        late++;
        totalLateMinutes += rec.lateMinutes || 10;
      } else if (rec.status === 'absent' || rec.status === 'unexcused_absence') absent++;
      else if (rec.status === 'excused' || rec.status === 'excused_absence') excused++;

      if (rec.uniformStatus === 'complete') uniformComplete++;
      else if (rec.uniformStatus === 'incomplete') uniformIncomplete++;
      else if (rec.uniformStatus === 'none') uniformNone++;
    });

    const attendedDays = present + late + excused;
    const attendancePercentage = totalDays > 0 ? (attendedDays / totalDays) * 100 : 100;
    const uniformPercentage = totalDays > 0 ? (uniformComplete / totalDays) * 100 : 100;

    return {
      totalDays,
      present,
      late,
      absent,
      excused,
      totalLateMinutes,
      attendancePercentage,
      uniformComplete,
      uniformIncomplete,
      uniformNone,
      uniformPercentage,
    };
  }, [studentAttendance]);

  // Disciplinary & Pedagogical Observations List
  const observationRecords = useMemo(() => {
    const list: {
      id: string;
      date: string;
      type: 'asistencia' | 'uniforme' | 'observacion_general' | 'calificacion';
      title: string;
      description: string;
      author?: string;
    }[] = [];

    // From Attendance
    studentAttendance.forEach((att) => {
      if (att.observations && att.observations.trim()) {
        list.push({
          id: `att-obs-${att.id}`,
          date: att.date,
          type: 'observacion_general',
          title: 'Observación en clase',
          description: att.observations,
          author: studentGroup.directorName,
        });
      }
      if (att.status === 'absent' || att.status === 'unexcused_absence') {
        list.push({
          id: `att-abs-${att.id}`,
          date: att.date,
          type: 'asistencia',
          title: 'Inasistencia Registrada',
          description: att.excuseReason ? `Justificación: ${att.excuseReason}` : 'Inasistencia no justificada.',
          author: studentGroup.directorName,
        });
      }
      if (att.status === 'late') {
        list.push({
          id: `att-late-${att.id}`,
          date: att.date,
          type: 'asistencia',
          title: `Llegada Tarde (${att.lateMinutes || 10} minutos)`,
          description: att.observations || 'Registro de retardo en jornada escolar.',
          author: studentGroup.directorName,
        });
      }
      if (att.uniformStatus === 'incomplete' || att.uniformStatus === 'none') {
        list.push({
          id: `att-uni-${att.id}`,
          date: att.date,
          type: 'uniforme',
          title: `Novedad de Uniforme (${att.uniformStatus === 'none' ? 'No portó uniforme' : 'Uniforme incompleto'})`,
          description: att.uniformNotes || 'No portó el uniforme reglamentario según manual de convivencia.',
          author: studentGroup.directorName,
        });
      }
    });

    // From Student profile notes
    if (student.observations && student.observations.trim()) {
      list.push({
        id: `std-obs-${student.id}`,
        date: 'Ficha General',
        type: 'observacion_general',
        title: 'Observación Pedagógica Institucional',
        description: student.observations,
        author: 'Coordinación / Dirección de Grupo',
      });
    }

    return list;
  }, [studentAttendance, student, studentGroup]);

  // Student Remedial / Recovery records
  const studentRemedials = useMemo(() => {
    if (!remedials || remedials.length === 0) return [];
    return remedials
      .filter((r) => r.studentId === student.id)
      .filter((r) => selectedPeriod === 'all' || r.period === selectedPeriod)
      .sort((a, b) => (b.period || '').localeCompare(a.period || ''));
  }, [remedials, student.id, selectedPeriod]);

  // Helper to resolve categories for a given subject
  const getSubjectCategories = (subjectName: string): EvaluationCategory[] => {
    const config = subjectConfigs.find(
      (cfg) => cfg.groupId === student.groupId && cfg.subjectName.toLowerCase() === subjectName.toLowerCase()
    );
    if (config && config.categories && config.categories.length > 0) {
      return config.categories;
    }
    if (settings.evaluationCategories && settings.evaluationCategories.length > 0) {
      return settings.evaluationCategories;
    }
    return DEFAULT_EVALUATION_CATEGORIES;
  };

  // Subject Activities Breakdown (Categorized without weights, percentages, or definitive calculations)
  const subjectBreakdown = useMemo(() => {
    const subjects = studentGroup.subjects && studentGroup.subjects.length > 0
      ? studentGroup.subjects
      : ['Matemáticas', 'Lengua Castellana', 'Ciencias Naturales', 'Ciencias Sociales', 'Inglés'];

    const result = subjects.map((subj) => {
      const subjActivities = filteredActivities.filter((a) => a.subject.toLowerCase() === subj.toLowerCase());
      const categories = getSubjectCategories(subj);
      
      const activityDetails = subjActivities.map((act) => {
        const gradeRec = grades.find((g) => g.activityId === act.id && g.studentId === student.id);
        const category = categories.find((c) => c.id === act.categoryId) || categories[0] || {
          id: 'general',
          name: 'Evaluaciones y Actividades',
          code: 'ACT',
          weightPercentage: 0,
          color: '#6366f1',
        };

        return {
          activity: act,
          category,
          gradeRecord: gradeRec,
          score: gradeRec?.score ?? null,
          deliveredOnTime: gradeRec?.deliveredOnTime ?? 'pending',
          comments: gradeRec?.comments ?? '',
        };
      });

      // Group activities by category
      const categoryGroups: {
        category: EvaluationCategory;
        activities: typeof activityDetails;
      }[] = [];

      categories.forEach((cat) => {
        const actsInCat = activityDetails.filter(
          (ad) => (ad.activity.categoryId || categories[0]?.id) === cat.id
        );
        if (actsInCat.length > 0) {
          categoryGroups.push({
            category: cat,
            activities: actsInCat,
          });
        }
      });

      // Handle any activities assigned to other/unknown category
      const matchedActIds = new Set(categoryGroups.flatMap((g) => g.activities.map((a) => a.activity.id)));
      const remainingActs = activityDetails.filter((ad) => !matchedActIds.has(ad.activity.id));
      if (remainingActs.length > 0) {
        categoryGroups.push({
          category: {
            id: 'other',
            name: 'Otras Actividades',
            code: 'OTR',
            weightPercentage: 0,
            color: '#64748b',
          },
          activities: remainingActs,
        });
      }

      const gradedActivities = activityDetails.filter((ad) => ad.score !== null);
      const pendingGradingCount = activityDetails.length - gradedActivities.length;

      return {
        subjectName: subj,
        activitiesCount: subjActivities.length,
        gradedCount: gradedActivities.length,
        pendingGradingCount,
        categoryGroups,
        activityDetails,
      };
    });

    return result;
  }, [studentGroup, filteredActivities, grades, student.id, subjectConfigs, settings]);

  // Overall Activities Summary
  const activitiesSummary = useMemo(() => {
    let totalActivities = 0;
    let totalGraded = 0;
    let totalPendingGrading = 0;

    subjectBreakdown.forEach((s) => {
      totalActivities += s.activitiesCount;
      totalGraded += s.gradedCount;
      totalPendingGrading += s.pendingGradingCount;
    });

    return {
      totalActivities,
      totalGraded,
      totalPendingGrading,
    };
  }, [subjectBreakdown]);

  const toggleSubjectExpand = (subj: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subj]: !prev[subj],
    }));
  };

  // WhatsApp Contact to Teacher
  const handleContactTeacherWhatsApp = () => {
    const directorPhone = student.guardianPhone || '3158901234';
    const message = `Buen día estimado/a ${studentGroup.directorName}, le escribe el/la acudiente del estudiante *${student.firstName} ${student.lastName}* (${studentGroup.name}). Me comunico para consultar sobre el proceso académico y de convivencia de mi acudido(a).`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner Card: Student Identity */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-600/10 to-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-xl shadow-indigo-950">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {student.firstName} {student.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  Estudiante Activo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Documento:</span>
                  <span className="font-mono font-bold text-slate-200">{student.documentId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Curso:</span>
                  <span className="font-bold text-indigo-300">{studentGroup.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Director(a):</span>
                  <span className="text-slate-200">{studentGroup.directorName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Acudiente:</span>
                  <span className="text-slate-200">{student.guardianName} ({student.guardianRelationship})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {onSwitchStudent && (
              <button
                id="btn-switch-student-parent"
                onClick={onSwitchStudent}
                className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-indigo-400" />
                <span>Consultar Otro Estudiante</span>
              </button>
            )}

            <button
              id="btn-contact-director-whatsapp"
              onClick={handleContactTeacherWhatsApp}
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contactar Director por WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Period Selector Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-300 font-bold">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Filtrar por Periodo Académico:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Consolidado General
            </button>
            {availablePeriods.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedPeriod === p
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Core Summary Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Activities & Evaluations Overview */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Seguimiento de Actividades</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">
              {activitiesSummary.totalGraded}
            </span>
            <span className="text-xs text-slate-400">/ {activitiesSummary.totalActivities} calificadas</span>
          </div>
          <div className="mt-3">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-md inline-block border ${
                activitiesSummary.totalActivities === 0
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : activitiesSummary.totalPendingGrading === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}
            >
              {activitiesSummary.totalActivities === 0
                ? 'Sin actividades en periodo'
                : activitiesSummary.totalPendingGrading === 0
                ? '✓ Todas las actividades calificadas'
                : `${activitiesSummary.totalPendingGrading} pendiente(s) por calificar`}
            </span>
          </div>
        </div>

        {/* Metric 2: Attendance Percentage */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Asistencia General</span>
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">
              {attendanceStats.attendancePercentage.toFixed(0)}%
            </span>
            <span className="text-xs text-slate-400">
              ({attendanceStats.present + attendanceStats.late} de {attendanceStats.totalDays} días)
            </span>
          </div>
          <div className="mt-3 flex items-center space-x-2 text-[11px] text-slate-300">
            <span className="text-emerald-400 font-bold">{attendanceStats.present} presentes</span>
            <span>•</span>
            <span className="text-rose-400 font-bold">{attendanceStats.absent} fallas</span>
            <span>•</span>
            <span className="text-sky-400 font-bold">{attendanceStats.excused} excusas</span>
          </div>
        </div>

        {/* Metric 3: Punctuality & Lates */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Puntualidad & Retardos</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{attendanceStats.late}</span>
            <span className="text-xs text-slate-400">retardos registrados</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            {attendanceStats.late > 0 ? (
              <span className="text-amber-400 font-semibold">
                ⚠️ {attendanceStats.totalLateMinutes} minutos acumulados de tardanza
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">
                ✓ ¡Excelente puntualidad escolar!
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Uniform & Observations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Porte de Uniforme & Convivencia</span>
            <Shirt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">
              {attendanceStats.uniformPercentage.toFixed(0)}%
            </span>
            <span className="text-xs text-slate-400">cumplimiento</span>
          </div>
          <div className="mt-3 text-[11px]">
            {observationRecords.length > 0 ? (
              <span className="text-indigo-300 font-semibold">
                {observationRecords.length} novedades u observaciones
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">
                ✓ Sin llamados de atención
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs for Parents */}
      <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none pb-1">
        <button
          id="parent-tab-grades"
          onClick={() => setActiveTab('grades')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'grades'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Actividades y Calificaciones por Asignatura</span>
        </button>

        <button
          id="parent-tab-attendance"
          onClick={() => setActiveTab('attendance')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Historial Diario de Asistencia</span>
        </button>

        <button
          id="parent-tab-observations"
          onClick={() => setActiveTab('observations')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'observations'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Llamados de Atención & Convivencia ({observationRecords.length})</span>
        </button>

        <button
          id="parent-tab-remedials"
          onClick={() => setActiveTab('remedials')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'remedials'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Nivelaciones ({studentRemedials.length})</span>
        </button>

        <button
          id="parent-tab-bulletin"
          onClick={() => setActiveTab('bulletin')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'bulletin'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Reporte</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. GRADES BY SUBJECT TAB (CATEGORIZED, NO WEIGHTS/PERCENTAGES/DEFINITIVAS)  */}
      {/* ========================================================================= */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>Haz clic en cada asignatura para ver el listado de actividades, fechas, puntualidad y calificaciones.</span>
            <span className="font-semibold text-slate-300">Periodo: {selectedPeriod === 'all' ? 'Todos los periodos' : selectedPeriod}</span>
          </div>

          <div className="space-y-3">
            {subjectBreakdown.map((subj) => {
              const isExpanded = expandedSubjects[subj.subjectName] ?? true;
              return (
                <div
                  key={subj.subjectName}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition-all"
                >
                  {/* Subject Header Row */}
                  <div
                    onClick={() => toggleSubjectExpand(subj.subjectName)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center font-bold text-sm">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-100">
                          {subj.subjectName}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {subj.activitiesCount} {subj.activitiesCount === 1 ? 'actividad registrada' : 'actividades registradas'} • {subj.gradedCount} con calificación
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                        subj.activitiesCount === 0
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : subj.gradedCount === subj.activitiesCount
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {subj.activitiesCount === 0
                          ? 'Sin actividades'
                          : `${subj.gradedCount} / ${subj.activitiesCount} Calificadas`}
                      </span>
                      <div className="text-slate-500">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content: Categorized Activities */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/40 p-4 sm:p-5 space-y-4">
                      {subj.activityDetails.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-3 text-center">
                          Aún no hay actividades registradas en esta asignatura para el periodo seleccionado.
                        </p>
                      ) : (
                        subj.categoryGroups.map((group) => (
                          <div
                            key={group.category.id}
                            className="bg-slate-900/60 border border-slate-800/90 rounded-xl overflow-hidden shadow-sm"
                          >
                            {/* Category Header */}
                            <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Layers className="w-4 h-4 text-indigo-400" />
                                <span className="font-bold text-xs text-slate-200">
                                  {group.category.name}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {group.activities.length} {group.activities.length === 1 ? 'actividad' : 'actividades'}
                              </span>
                            </div>

                            {/* Activities Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold bg-slate-950/40">
                                    <th className="py-2.5 px-3">Actividad / Tarea</th>
                                    <th className="py-2.5 px-3 whitespace-nowrap">Fecha Asignada</th>
                                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Puntualidad</th>
                                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Calificación</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {group.activities.map((item) => (
                                    <tr key={item.activity.id} className="hover:bg-slate-800/30">
                                      <td className="py-3 px-3">
                                        <span className="font-bold text-slate-200 block text-xs">
                                          {item.activity.title}
                                        </span>
                                        {item.activity.description && (
                                          <span className="text-[11px] text-slate-400 block mt-0.5">
                                            {item.activity.description}
                                          </span>
                                        )}
                                        {item.comments && (
                                          <div className="mt-1.5 p-2 rounded-lg bg-indigo-950/40 border border-indigo-900/30 text-[11px] text-indigo-300">
                                            <span className="font-semibold text-indigo-200">Retroalimentación del docente:</span> {item.comments}
                                          </div>
                                        )}
                                        {item.activity.attachments && item.activity.attachments.length > 0 && (
                                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {item.activity.attachments.map((att) => (
                                              <a
                                                key={att.id}
                                                href={att.webViewLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-slate-700 text-[10px] transition-colors"
                                              >
                                                <Paperclip className="w-3 h-3" />
                                                <span className="max-w-[150px] truncate">{att.name}</span>
                                                <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-slate-400" />
                                              </a>
                                            ))}
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap align-top">
                                        <div className="font-mono text-xs">
                                          {item.activity.assignedDate || 'No especificada'}
                                        </div>
                                        {item.activity.dueDate && item.activity.dueDate !== item.activity.assignedDate && (
                                          <div className="text-[10px] text-slate-500 mt-0.5">
                                            Entrega: {item.activity.dueDate}
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 text-center align-top whitespace-nowrap">
                                        {item.deliveredOnTime === 'yes' && (
                                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            <span>A tiempo</span>
                                          </span>
                                        )}
                                        {item.deliveredOnTime === 'late' && (
                                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[11px] border border-amber-500/30">
                                            <Clock className="w-3 h-3 text-amber-400" />
                                            <span>Entrega tardía</span>
                                          </span>
                                        )}
                                        {item.deliveredOnTime === 'no' && (
                                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold text-[11px] border border-rose-500/30">
                                            <XCircle className="w-3 h-3 text-rose-400" />
                                            <span>No entregó</span>
                                          </span>
                                        )}
                                        {item.deliveredOnTime === 'pending' && (
                                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium text-[11px] border border-slate-700">
                                            <Clock className="w-3 h-3" />
                                            <span>Pendiente</span>
                                          </span>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 text-right align-top whitespace-nowrap">
                                        {item.score !== null ? (
                                          <div className="font-mono font-black text-sm text-indigo-300">
                                            {item.score.toFixed(1)}{' '}
                                            <span className="text-slate-500 text-xs font-normal">
                                              / {item.activity.maxScore || 5.0}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-500 text-xs italic">
                                            Por calificar
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ATTENDANCE TIMELINE TAB                                                */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Historial Diario de Asistencia y Porte de Uniforme
              </h3>
              <p className="text-xs text-slate-400">
                Registro oficial de control diario realizado por los docentes de la institución.
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">
                {attendanceStats.attendancePercentage.toFixed(0)}% Asistencia Total
              </span>
            </div>
          </div>

          {studentAttendance.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No hay registros de asistencia en el sistema todavía para este estudiante.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Estado de Asistencia</th>
                    <th className="py-3 px-3">Porte de Uniforme</th>
                    <th className="py-3 px-3">Novedades / Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {studentAttendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">
                        {rec.date}
                      </td>
                      <td className="py-3 px-3">
                        {rec.status === 'present' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Presente</span>
                          </span>
                        )}
                        {rec.status === 'late' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Retardo ({rec.lateMinutes || 10} min)</span>
                          </span>
                        )}
                        {(rec.status === 'absent' || rec.status === 'unexcused_absence') && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Inasistente</span>
                          </span>
                        )}
                        {(rec.status === 'excused' || rec.status === 'excused_absence') && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Justificado</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {rec.uniformStatus === 'complete' && (
                          <span className="text-emerald-400 font-medium">Completo ✓</span>
                        )}
                        {rec.uniformStatus === 'incomplete' && (
                          <span className="text-amber-400 font-medium">Incompleto ⚠️</span>
                        )}
                        {rec.uniformStatus === 'none' && (
                          <span className="text-rose-400 font-medium">No Portó ✗</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {rec.observations || rec.excuseReason || rec.uniformNotes || (
                          <span className="text-slate-600 italic">Sin novedades</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OBSERVATIONS & DISCIPLINE TAB                                          */}
      {/* ========================================================================= */}
      {activeTab === 'observations' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="font-bold text-base text-slate-100 mb-1">
              Llamados de Atención & Observaciones de Convivencia
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Consolidado de anotaciones pedagógicas, retardos reiterados y novedades registradas por los docentes.
            </p>

            {observationRecords.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-sm text-slate-200">¡Excelente Comportamiento y Convivencia!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  El estudiante no presenta llamados de atención disciplinarios ni faltas graves registradas en el periodo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {observationRecords.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.type === 'asistencia'
                        ? 'bg-rose-950/20 border-rose-800/40'
                        : item.type === 'uniforme'
                        ? 'bg-amber-950/20 border-amber-800/40'
                        : 'bg-indigo-950/20 border-indigo-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-100 flex items-center space-x-1.5">
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            item.type === 'asistencia'
                              ? 'text-rose-400'
                              : item.type === 'uniforme'
                              ? 'text-amber-400'
                              : 'text-indigo-400'
                          }`}
                        />
                        <span>{item.title}</span>
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">{item.date}</span>
                    </div>
                    <p className="text-xs text-slate-300 pl-5">
                      {item.description}
                    </p>
                    {item.author && (
                      <p className="text-[10px] text-slate-500 pl-5 mt-1">
                        Registrado por: <span className="font-semibold text-slate-400">{item.author}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3.5. PERIOD REMEDIALS / RECOVERY TAB FOR PARENTS                          */}
      {/* ========================================================================= */}
      {activeTab === 'remedials' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>Registro oficial y evidencias pedagógicas de nivelación / recuperación académica de periodos anteriores.</span>
            <span className="font-semibold text-slate-300">
              {studentRemedials.length} nivelación(es) registrada(s)
            </span>
          </div>

          {studentRemedials.length === 0 ? (
            <div className="p-12 text-center border border-slate-800 rounded-3xl bg-slate-900/60 text-slate-400 space-y-3">
              <CheckSquare className="w-12 h-12 mx-auto text-slate-600" />
              <h4 className="text-base font-bold text-slate-200">Sin nivelaciones pendientes o registradas</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No se registran procesos de recuperación o nivelación para el estudiante en el periodo seleccionado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentRemedials.map((rem) => {
                const isPassed = rem.finalScore !== null && rem.finalScore !== undefined && rem.finalScore >= (settings.passingScore || settings.minPassingScore || 3.5);
                const hasScore = rem.finalScore !== null && rem.finalScore !== undefined;
                const workLink = rem.workDriveLink || rem.workAttachment?.webViewLink;
                const supportLink = rem.supportDriveLink || rem.supportAttachment?.webViewLink;

                return (
                  <div
                    key={rem.id}
                    className={`rounded-2xl border p-5 space-y-4 transition-all shadow-lg ${
                      hasScore
                        ? isPassed
                          ? 'bg-emerald-950/20 border-emerald-800/50'
                          : 'bg-rose-950/20 border-rose-800/50'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {rem.period}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {rem.updatedAt?.split('T')[0] || ''}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-100 mt-1">
                          {rem.subject}
                        </h3>
                        {rem.teacherName && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Docente: <span className="text-slate-300 font-semibold">{rem.teacherName}</span>
                          </p>
                        )}
                      </div>

                      {/* Final Result Badge */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black border ${
                            hasScore
                              ? isPassed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {hasScore ? (
                            <span>Definitiva: {rem.finalScore?.toFixed(1)} ({isPassed ? 'Aprobada' : 'No superada'})</span>
                          ) : (
                            <span>En Proceso</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Failing Score & Assignment Indicator */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">¿Debe Nivelar?:</span>
                        <span className={`text-xs font-bold ${rem.requiresRemedial !== false ? 'text-amber-400' : 'text-slate-400'}`}>
                          {rem.requiresRemedial !== false ? '⚡ Sí, Asignado/a' : 'No Requiere'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Nota Reprobada Periodo:</span>
                        <span className="text-xs font-bold text-rose-400">
                          {rem.failingScore !== null && rem.failingScore !== undefined
                            ? `${rem.failingScore.toFixed(1)} / 5.0`
                            : 'Sin registrar'}
                        </span>
                      </div>
                    </div>

                    {/* Work Delivery Checklist Status */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {rem.workDelivered ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">
                            Entrega del Trabajo Escrito / Taller
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {rem.workDelivered
                              ? `Entregado el ${rem.workDeliveredDate || 'fecha registrada'}`
                              : 'Pendiente por entrega'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rem.workDelivered
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {rem.workDelivered ? 'Entregado' : 'No entregado'}
                      </span>
                    </div>

                    {/* Scores Breakdown */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase block">
                          Nota Trabajo Escrito
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-100 mt-0.5 block">
                          {rem.workScore !== null && rem.workScore !== undefined
                            ? `${rem.workScore.toFixed(1)} / 5.0`
                            : '--'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                        <span className="text-[10px] font-bold text-purple-400 uppercase block">
                          Nota Sustentación
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-100 mt-0.5 block">
                          {rem.supportScore !== null && rem.supportScore !== undefined
                            ? `${rem.supportScore.toFixed(1)} / 5.0`
                            : '--'}
                        </span>
                      </div>
                    </div>

                    {/* Google Drive Evidence Links */}
                    {(workLink || supportLink) && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-400 block">
                          Evidencias Digitales en Google Drive:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {workLink && (
                            <a
                              href={workLink}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-sky-300 bg-sky-950/70 hover:bg-sky-900/80 border border-sky-700/60 rounded-xl transition-all shadow-sm"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Evidencia Trabajo Escrito</span>
                            </a>
                          )}

                          {supportLink && (
                            <a
                              href={supportLink}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-700/60 rounded-xl transition-all shadow-sm"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Evidencia Sustentación</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Teacher Observations */}
                    {rem.observations && (
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-500/30 text-xs space-y-1">
                        <span className="text-[10px] font-bold text-amber-400 block uppercase flex items-center space-x-1">
                          <MessageSquare className="w-3 h-3 text-amber-400" />
                          <span>Observaciones Pedagógicas y Plan de Mejoramiento:</span>
                        </span>
                        <p className="text-slate-200 italic leading-relaxed pt-0.5">
                          "{rem.observations}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OFFICIAL REPORT FOR PRINTING / PDF (CATEGORIZED, NO DEFINITIVAS/WEIGHTS)*/}
      {/* ========================================================================= */}
      {activeTab === 'bulletin' && (
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          {/* Print Trigger Button */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Informe de Actividades y Calificaciones
              </h2>
              <p className="text-xs text-slate-600">
                Formato institucional de seguimiento descargable e imprimible
              </p>
            </div>
            <button
              id="btn-print-parent-bulletin"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
          </div>

          {/* Bulletin Sheet Header */}
          <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50 space-y-3">
            <div className="text-center border-b border-slate-200 pb-2">
              <h1 className="font-black text-base uppercase tracking-wider text-slate-900">
                {settings.schoolName}
              </h1>
              <p className="text-xs text-slate-600">
                INFORME ACADÉMICO Y DE CONVIVENCIA ESCOLAR • AÑO LECTIVO {settings.schoolYear}
              </p>
              <p className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                {selectedPeriod === 'all' ? 'Consolidado General de Actividades' : `Periodo: ${selectedPeriod}`}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 font-bold block text-[10px]">ESTUDIANTE:</span>
                <span className="font-bold text-slate-900">{student.firstName} {student.lastName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px]">DOCUMENTO IDENTIDAD:</span>
                <span className="font-mono font-bold text-slate-900">{student.documentId}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px]">CURSO / GRUPO:</span>
                <span className="font-bold text-slate-900">{studentGroup.name} ({studentGroup.shift})</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px]">DIRECTOR DE GRUPO:</span>
                <span className="font-bold text-slate-900">{studentGroup.directorName}</span>
              </div>
            </div>
          </div>

          {/* Categorized Activities List by Subject for Print/PDF */}
          <div className="space-y-6">
            {subjectBreakdown.map((subj) => (
              <div key={subj.subjectName} className="border border-slate-300 rounded-xl overflow-hidden">
                {/* Subject Header */}
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
                  <h3 className="font-black text-xs uppercase tracking-wide text-slate-900">
                    Asignatura: {subj.subjectName}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-600">
                    {subj.activitiesCount} {subj.activitiesCount === 1 ? 'actividad' : 'actividades'} ({subj.gradedCount} calificadas)
                  </span>
                </div>

                {subj.activityDetails.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500 italic">
                    Sin actividades registradas para este periodo.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {subj.categoryGroups.map((group) => (
                      <div key={group.category.id} className="p-3 space-y-2">
                        <div className="font-bold text-[11px] text-indigo-900 flex items-center space-x-1.5 uppercase">
                          <span>📁 {group.category.name}</span>
                        </div>

                        <table className="w-full text-left text-xs border-collapse border border-slate-200">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                              <th className="py-2 px-2.5 border-r border-slate-200">Actividad / Tarea</th>
                              <th className="py-2 px-2.5 text-center border-r border-slate-200 whitespace-nowrap">Fecha Asignada</th>
                              <th className="py-2 px-2.5 text-center border-r border-slate-200 whitespace-nowrap">Fecha Entrega</th>
                              <th className="py-2 px-2.5 text-center border-r border-slate-200 whitespace-nowrap">Puntualidad</th>
                              <th className="py-2 px-2.5 text-right whitespace-nowrap">Calificación</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {group.activities.map((item) => (
                              <tr key={item.activity.id} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 border-r border-slate-200">
                                  <span className="font-bold text-slate-900 block">
                                    {item.activity.title}
                                  </span>
                                  {item.comments && (
                                    <span className="text-[10px] text-slate-600 block mt-0.5 italic">
                                      Nota docente: {item.comments}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                  {item.activity.assignedDate || '-'}
                                </td>
                                <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                  {item.activity.dueDate || item.activity.assignedDate || '-'}
                                </td>
                                <td className="py-2 px-2.5 text-center border-r border-slate-200 text-[11px]">
                                  {item.deliveredOnTime === 'yes' && <span className="text-emerald-700 font-semibold">A tiempo</span>}
                                  {item.deliveredOnTime === 'late' && <span className="text-amber-700 font-semibold">Entrega tardía</span>}
                                  {item.deliveredOnTime === 'no' && <span className="text-rose-700 font-semibold">No entregó</span>}
                                  {item.deliveredOnTime === 'pending' && <span className="text-slate-500">Pendiente</span>}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {item.score !== null ? (
                                    <span>{item.score.toFixed(1)} / {item.activity.maxScore || 5.0}</span>
                                  ) : (
                                    <span className="text-slate-500 font-normal italic text-[11px]">Pendiente</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Remedial / Recovery Summary for Printable Report if any exist */}
          {studentRemedials.length > 0 && (
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <div className="bg-amber-50 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
                <h3 className="font-black text-xs uppercase tracking-wide text-amber-900">
                  Nivelaciones y Recuperaciones de Periodos Pasados ({studentRemedials.length})
                </h3>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                    <th className="py-2 px-2.5 border-r border-slate-200">Asignatura</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">Periodo</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">Nota Reprobada</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">Trabajo Escrito</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">Nota Trabajo</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">Nota Sustentación</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200 font-bold">Definitiva Nivelación</th>
                    <th className="py-2 px-2.5">Observaciones Pedagógicas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {studentRemedials.map((rem) => {
                    const isPassed = rem.finalScore !== null && rem.finalScore !== undefined && rem.finalScore >= (settings.passingScore || settings.minPassingScore || 3.5);
                    return (
                      <tr key={rem.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 border-r border-slate-200 font-bold text-slate-900">
                          {rem.subject}
                          {rem.teacherName && (
                            <span className="text-[10px] text-slate-500 font-normal block">
                              Docente: {rem.teacherName}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center border-r border-slate-200 text-[11px] font-semibold text-slate-700">
                          {rem.period}
                        </td>
                        <td className="py-2 px-2.5 text-center border-r border-slate-200 text-[11px] font-mono font-bold text-rose-700">
                          {rem.failingScore !== null && rem.failingScore !== undefined ? `${rem.failingScore.toFixed(1)} / 5.0` : '--'}
                        </td>
                        <td className="py-2 px-2.5 text-center border-r border-slate-200 text-[11px]">
                          {rem.workDelivered ? (
                            <span className="text-emerald-700 font-semibold">Entregado ({rem.workDeliveredDate || 'Sí'})</span>
                          ) : (
                            <span className="text-slate-500">No entregado</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono text-slate-900">
                          {rem.workScore !== null && rem.workScore !== undefined ? rem.workScore.toFixed(1) : '--'}
                        </td>
                        <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono text-slate-900">
                          {rem.supportScore !== null && rem.supportScore !== undefined ? rem.supportScore.toFixed(1) : '--'}
                        </td>
                        <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono font-bold">
                          {rem.finalScore !== null && rem.finalScore !== undefined ? (
                            <span className={isPassed ? 'text-emerald-700' : 'text-rose-700'}>
                              {rem.finalScore.toFixed(1)} ({isPassed ? 'Aprobada' : 'No superada'})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">En proceso</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-slate-700 italic">
                          {rem.observations || 'Sin observaciones registradas'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bulletin Footer Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border border-slate-300 rounded-xl p-4 bg-slate-50">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Resumen de Asistencia & Convivencia:</h4>
              <p>• Días Presentes: <span className="font-bold">{attendanceStats.present}</span> | Retardos: <span className="font-bold">{attendanceStats.late}</span></p>
              <p>• Inasistencias Injustificadas: <span className="font-bold">{attendanceStats.absent}</span> | Justificadas: <span className="font-bold">{attendanceStats.excused}</span></p>
              <p>• Porte Reglamentario de Uniforme: <span className="font-bold">{attendanceStats.uniformPercentage.toFixed(0)}%</span></p>
            </div>
            <div className="text-right flex flex-col justify-end">
              <span className="text-slate-500 text-[10px] block">TOTAL DE ACTIVIDADES:</span>
              <span className="text-xl font-black text-slate-900">
                {activitiesSummary.totalGraded} de {activitiesSummary.totalActivities} calificadas
              </span>
              <span className="text-[11px] text-slate-600 mt-0.5">
                {activitiesSummary.totalPendingGrading} pendiente(s) por calificar
              </span>
            </div>
          </div>

          {/* Informational Report Notice (Non-official document) */}
          <div className="pt-4 text-center text-[10px] text-slate-500 border-t border-slate-200">
            <p>Este documento es un informe de consulta y seguimiento académico familiar. No constituye un certificado ni boletín oficial de notas.</p>
          </div>
        </div>
      )}
    </div>
  );
};

