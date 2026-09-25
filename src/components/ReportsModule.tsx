import React, { useState, useMemo, useEffect } from 'react';
import { Group, Student, AttendanceRecord, Activity, GradeRecord, SchoolSettings } from '../types';
import { sortGroupsAscending } from '../utils/groupUtils';
import { 
  BarChart3, 
  Award, 
  AlertTriangle, 
  Printer, 
  Send, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Shirt, 
  TrendingUp, 
  Users, 
  Calendar,
  FileText,
  GraduationCap,
  School,
  UserCheck,
  Search,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  Phone,
  Mail,
  User,
  BookOpen
} from 'lucide-react';
import { openWhatsAppDirectly } from '../utils/whatsapp';

interface ReportsModuleProps {
  groups: Group[];
  students: Student[];
  attendance: AttendanceRecord[];
  activities: Activity[];
  grades: GradeRecord[];
  settings: SchoolSettings;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  groups,
  students,
  attendance,
  activities,
  grades,
  settings,
}) => {
  // Extract unique sorted grades from groups
  const availableGrades = useMemo(() => {
    const gradesSet = new Set<string>();
    groups.forEach((g) => {
      if (g.grade) {
        gradesSet.add(g.grade.trim());
      } else {
        // Fallback: extract from name e.g. "10°" or "Grado 10"
        const match = g.name.match(/\d+°?/);
        if (match) gradesSet.add(match[0]);
      }
    });

    return Array.from(gradesSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [groups]);

  // Determine initial grade & group based on first available student or group
  const initialGroup = groups[0];
  const initialGrade = initialGroup?.grade || availableGrades[0] || 'all';

  // Cascading Selection States: Grade -> Course/Group -> Student
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroup?.id || 'all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [statsScope, setStatsScope] = useState<'scoped' | 'global'>('scoped');

  // Filter groups according to selected grade
  const filteredGroups = useMemo(() => {
    if (selectedGrade === 'all') return sortGroupsAscending(groups);
    return sortGroupsAscending(groups.filter((g) => {
      if (g.grade) return g.grade.trim() === selectedGrade;
      return g.name.includes(selectedGrade);
    }));
  }, [groups, selectedGrade]);

  // Filter students based on selected Grade and Course/Group
  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => s.status === 'active');

    if (selectedGroupId !== 'all') {
      result = result.filter((s) => s.groupId === selectedGroupId);
    } else if (selectedGrade !== 'all') {
      const allowedGroupIds = new Set(filteredGroups.map((g) => g.id));
      result = result.filter((s) => allowedGroupIds.has(s.groupId));
    }

    if (studentSearchTerm.trim()) {
      const query = studentSearchTerm.toLowerCase().trim();
      result = result.filter((s) => 
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.documentId.toLowerCase().includes(query) ||
        s.guardianName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [students, selectedGroupId, selectedGrade, filteredGroups, studentSearchTerm]);

  // Active student object
  const selectedStudent = useMemo(() => {
    const found = filteredStudents.find((s) => s.id === selectedStudentId);
    if (found) return found;
    const globalFound = students.find((s) => s.id === selectedStudentId);
    if (globalFound) return globalFound;
    return filteredStudents[0] || students[0];
  }, [filteredStudents, students, selectedStudentId]);

  // Active group of the selected student
  const studentGroup = useMemo(() => {
    if (!selectedStudent) return null;
    return groups.find((g) => g.id === selectedStudent.groupId);
  }, [groups, selectedStudent]);

  // Handler: Change Grade (Step 1) -> automatically cascaded to Course & Student
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    setStudentSearchTerm('');

    const matchingGroups = grade === 'all' 
      ? groups 
      : groups.filter((g) => (g.grade && g.grade.trim() === grade) || g.name.includes(grade));

    const newGroupId = matchingGroups.length > 0 ? matchingGroups[0].id : 'all';
    setSelectedGroupId(newGroupId);

    // Pick first student in that new group/grade
    const matchingStudents = students.filter((s) => 
      s.status === 'active' && 
      (newGroupId === 'all' ? matchingGroups.some(g => g.id === s.groupId) : s.groupId === newGroupId)
    );

    if (matchingStudents.length > 0) {
      setSelectedStudentId(matchingStudents[0].id);
    }
  };

  // Handler: Change Course/Group (Step 2) -> automatically cascaded to Student
  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    setStudentSearchTerm('');

    if (groupId !== 'all') {
      const groupObj = groups.find((g) => g.id === groupId);
      if (groupObj && groupObj.grade && groupObj.grade !== selectedGrade) {
        setSelectedGrade(groupObj.grade);
      }

      const groupStudents = students.filter((s) => s.groupId === groupId && s.status === 'active');
      if (groupStudents.length > 0) {
        // Keep current student if they are already in this group, otherwise choose the first
        const isCurrentInGroup = groupStudents.some((s) => s.id === selectedStudentId);
        if (!isCurrentInGroup) {
          setSelectedStudentId(groupStudents[0].id);
        }
      }
    }
  };

  // Handler: Change Student (Step 3)
  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  // Handler: Select At-Risk Student and synchronize Grade, Group, and Student
  const handleSelectAtRiskStudent = (student: Student) => {
    const group = groups.find((g) => g.id === student.groupId);
    if (group) {
      if (group.grade) {
        setSelectedGrade(group.grade);
      }
      setSelectedGroupId(group.id);
    }
    setSelectedStudentId(student.id);

    // Scroll smoothly to the dossier card
    const element = document.getElementById('printable-student-dossier');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filtered scope records for analytics
  const scopedData = useMemo(() => {
    let relevantStudentIds: Set<string>;

    if (statsScope === 'global') {
      relevantStudentIds = new Set(students.map((s) => s.id));
    } else if (selectedGroupId !== 'all') {
      relevantStudentIds = new Set(students.filter((s) => s.groupId === selectedGroupId).map((s) => s.id));
    } else if (selectedGrade !== 'all') {
      const allowedGroupIds = new Set(filteredGroups.map((g) => g.id));
      relevantStudentIds = new Set(students.filter((s) => allowedGroupIds.has(s.groupId)).map((s) => s.id));
    } else {
      relevantStudentIds = new Set(students.map((s) => s.id));
    }

    const scopedAttendance = attendance.filter((r) => relevantStudentIds.has(r.studentId));
    const scopedGrades = grades.filter((g) => relevantStudentIds.has(g.studentId));
    const scopedStudentCount = students.filter((s) => s.status === 'active' && relevantStudentIds.has(s.id)).length;

    let presents = 0;
    let lates = 0;
    let absents = 0;
    let uniformIssues = 0;

    scopedAttendance.forEach((r) => {
      if (r.status === 'present') presents++;
      else if (r.status === 'late') lates++;
      else if (r.status === 'absent' || r.status === 'unexcused_absence') absents++;

      if (r.uniformStatus !== 'complete') uniformIssues++;
    });

    const totalAttendance = scopedAttendance.length;
    const attendanceRate = totalAttendance > 0 ? Math.round(((presents + lates) / totalAttendance) * 100) : 100;
    const uniformComplianceRate = totalAttendance > 0 ? Math.round(((totalAttendance - uniformIssues) / totalAttendance) * 100) : 100;

    let totalGraded = 0;
    let sumScores = 0;
    let onTimeCount = 0;

    scopedGrades.forEach((g) => {
      if (g.score !== null) {
        totalGraded++;
        sumScores += g.score;
      }
      if (g.deliveredOnTime === 'yes') {
        onTimeCount++;
      }
    });

    const gradeAverage = totalGraded > 0 ? (sumScores / totalGraded).toFixed(1) : '0.0';
    const onTimeRate = scopedGrades.length > 0 ? Math.round((onTimeCount / scopedGrades.length) * 100) : 100;

    return {
      studentCount: scopedStudentCount,
      attendanceRate,
      uniformComplianceRate,
      gradeAverage,
      onTimeRate,
      totalAbsents: absents,
      totalRecords: totalAttendance,
      totalGradesCount: scopedGrades.length,
    };
  }, [statsScope, selectedGroupId, selectedGrade, filteredGroups, students, attendance, grades]);

  // Student specific history
  const studentAttendanceHistory = useMemo(() => {
    if (!selectedStudent) return [];
    return attendance
      .filter((r) => r.studentId === selectedStudent.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, selectedStudent]);

  const studentGradesHistory = useMemo(() => {
    if (!selectedStudent) return [];
    const map = new Map<string, Activity>();
    activities.forEach((a) => map.set(a.id, a));
    const list: { grade: GradeRecord; activity: Activity }[] = [];
    grades
      .filter((g) => g.studentId === selectedStudent.id)
      .forEach((g) => {
        const act = map.get(g.activityId);
        if (act) {
          list.push({ grade: g, activity: act });
        }
      });
    return list;
  }, [grades, activities, selectedStudent]);

  // Organize student grades and activities by subject
  const studentGradesBySubject = useMemo(() => {
    if (!selectedStudent) return [];
    const map = new Map<string, Activity>();
    activities.forEach((a) => map.set(a.id, a));
    
    // Group records by subject
    const subjectMap = new Map<string, {
      subject: string;
      items: { grade: GradeRecord; activity: Activity }[];
      totalScore: number;
      gradedCount: number;
      onTimeCount: number;
      lateCount: number;
      noDeliveryCount: number;
      pendingCount: number;
    }>();

    // Include group's known subjects
    const groupSubjects = studentGroup?.subjects || [];
    groupSubjects.forEach((subj) => {
      if (!subjectMap.has(subj)) {
        subjectMap.set(subj, {
          subject: subj,
          items: [],
          totalScore: 0,
          gradedCount: 0,
          onTimeCount: 0,
          lateCount: 0,
          noDeliveryCount: 0,
          pendingCount: 0,
        });
      }
    });

    grades
      .filter((g) => g.studentId === selectedStudent.id)
      .forEach((g) => {
        const act = map.get(g.activityId);
        if (!act) return;
        
        const subjName = act.subject || 'Asignatura General';
        if (!subjectMap.has(subjName)) {
          subjectMap.set(subjName, {
            subject: subjName,
            items: [],
            totalScore: 0,
            gradedCount: 0,
            onTimeCount: 0,
            lateCount: 0,
            noDeliveryCount: 0,
            pendingCount: 0,
          });
        }
        
        const groupObj = subjectMap.get(subjName)!;
        groupObj.items.push({ grade: g, activity: act });
        if (g.score !== null) {
          groupObj.totalScore += g.score;
          groupObj.gradedCount++;
        }
        if (g.deliveredOnTime === 'yes') groupObj.onTimeCount++;
        else if (g.deliveredOnTime === 'late') groupObj.lateCount++;
        else if (g.deliveredOnTime === 'no') groupObj.noDeliveryCount++;
        else groupObj.pendingCount++;
      });

    const result = Array.from(subjectMap.values())
      .filter((s) => s.items.length > 0 || groupSubjects.includes(s.subject))
      .map((subj) => {
        // Sort activities in this subject by assigned date or due date descending
        const sortedItems = [...subj.items].sort((a, b) => {
          const dateA = a.activity.assignedDate || a.activity.dueDate || '';
          const dateB = b.activity.assignedDate || b.activity.dueDate || '';
          return dateB.localeCompare(dateA);
        });

        const avg = subj.gradedCount > 0 ? subj.totalScore / subj.gradedCount : 0;
        
        const minPass = settings.passingScore || settings.minPassingScore || 3.5;
        let performanceLevel = 'Básico';
        let performanceBg = 'bg-amber-950/40 border-amber-700/50 text-amber-300';
        if (avg >= 4.6) {
          performanceLevel = 'Superior';
          performanceBg = 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300';
        } else if (avg >= 4.0) {
          performanceLevel = 'Alto';
          performanceBg = 'bg-teal-950/40 border-teal-700/50 text-teal-300';
        } else if (avg >= minPass) {
          performanceLevel = 'Básico';
          performanceBg = 'bg-amber-950/40 border-amber-700/50 text-amber-300';
        } else if (avg > 0) {
          performanceLevel = 'Bajo';
          performanceBg = 'bg-rose-950/40 border-rose-700/50 text-rose-300';
        } else {
          performanceLevel = 'Sin Evaluar';
          performanceBg = 'bg-slate-800 border-slate-700 text-slate-400';
        }

        return {
          subject: subj.subject,
          items: sortedItems,
          average: avg > 0 ? avg.toFixed(1) : '-',
          numericAverage: avg,
          totalActivities: subj.items.length,
          gradedCount: subj.gradedCount,
          onTimeCount: subj.onTimeCount,
          lateCount: subj.lateCount,
          noDeliveryCount: subj.noDeliveryCount,
          performanceLevel,
          performanceBg,
        };
      });

    return result.sort((a, b) => a.subject.localeCompare(b.subject));
  }, [grades, activities, selectedStudent, studentGroup]);

  // Calculate student average
  const studentAverage = useMemo(() => {
    let total = 0;
    let count = 0;
    studentGradesHistory.forEach((item) => {
      if (item.grade.score !== null) {
        total += item.grade.score;
        count++;
      }
    });
    return count > 0 ? (total / count).toFixed(1) : '0.0';
  }, [studentGradesHistory]);

  // Early warning students (more than 2 absences or late arrivals)
  const atRiskStudents = useMemo(() => {
    const counts: Record<string, { absences: number; lates: number; uniformIssues: number }> = {};

    attendance.forEach((r) => {
      if (!counts[r.studentId]) {
        counts[r.studentId] = { absences: 0, lates: 0, uniformIssues: 0 };
      }
      if (r.status === 'absent' || r.status === 'unexcused_absence') counts[r.studentId].absences++;
      if (r.status === 'late') counts[r.studentId].lates++;
      if (r.uniformStatus !== 'complete') counts[r.studentId].uniformIssues++;
    });

    const list: { student: Student; group: Group | undefined; stats: { absences: number; lates: number; uniformIssues: number } }[] = [];

    students.forEach((s) => {
      const c = counts[s.id];
      if (c && (c.absences >= 1 || c.lates >= 2 || c.uniformIssues >= 2)) {
        list.push({
          student: s,
          group: groups.find((g) => g.id === s.groupId),
          stats: c,
        });
      }
    });

    return list;
  }, [attendance, students, groups]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendFullReportWhatsApp = () => {
    if (!selectedStudent || !studentGroup) return;

    // Format grades breakdown organized by subject with activity dates
    let subjectsSummaryText = '';
    if (studentGradesBySubject.length > 0) {
      subjectsSummaryText = '\n\n📚 *Calificaciones por Asignatura:*\n' + 
        studentGradesBySubject
          .filter((s) => s.items.length > 0)
          .map((s) => {
            const activitiesLines = s.items.map((item) => {
              const dateStr = item.activity.assignedDate || item.activity.dueDate || 'S/F';
              const scoreStr = item.grade.score !== null ? `${item.grade.score.toFixed(1)}/5.0` : 'Por calificar';
              const deliveryStr = item.grade.deliveredOnTime === 'yes' ? ' [A tiempo]' : item.grade.deliveredOnTime === 'late' ? ' [Con retraso]' : item.grade.deliveredOnTime === 'no' ? ' [No entregó]' : '';
              return `  • ${item.activity.title} (${dateStr}): ${scoreStr}${deliveryStr}`;
            }).join('\n');

            return `\n*${s.subject}* (Promedio: *${s.average}* - ${s.performanceLevel})\n${activitiesLines}`;
          })
          .join('\n');
    }

    const msg = `📑 *Informe Integral del Estudiante - ${settings.schoolName}*
Estudiante: *${selectedStudent.firstName} ${selectedStudent.lastName}*
Curso: *${studentGroup.name}* | Periodo: ${settings.currentPeriod}
Acudiente: ${selectedStudent.guardianName}

📊 *Resumen Académico:*
• Promedio Acumulado: *${studentAverage}* / 5.0
• Actividades Evaluadas: ${studentGradesHistory.length}${subjectsSummaryText}

📋 *Resumen de Asistencia y Convivencia:*
• Registros en sistema: ${studentAttendanceHistory.length}
• Inasistencias: ${studentAttendanceHistory.filter((r) => r.status === 'absent' || r.status === 'unexcused_absence').length}
• Retardos: ${studentAttendanceHistory.filter((r) => r.status === 'late').length}
• Novedades de uniforme: ${studentAttendanceHistory.filter((r) => r.uniformStatus !== 'complete').length}

Docente / Institución: ${settings.teacherName || settings.schoolName}
Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`;

    openWhatsAppDirectly(selectedStudent.guardianPhone, selectedStudent.guardianCountryCode, msg);
  };

  const currentGroupName = selectedGroupId === 'all' 
    ? (selectedGrade === 'all' ? 'Toda la Institución' : `Todos los cursos de ${selectedGrade}`)
    : (groups.find((g) => g.id === selectedGroupId)?.name || 'Curso Seleccionado');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="bg-slate-900/60 rounded-2xl p-5 shadow-xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Reportes, Estadísticas y Boletines Integrales</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecciona el grado, curso y estudiante para consultar estadísticas de inasistencia, uniforme y calificaciones.
          </p>
        </div>

        {/* Scope pill switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setStatsScope('scoped')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statsScope === 'scoped'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Filtro Actual ({currentGroupName})
          </button>
          <button
            type="button"
            onClick={() => setStatsScope('global')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statsScope === 'global'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Global Institucional
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CASCADING FILTER SELECTION BAR: 1. GRADO -> 2. CURSO -> 3. ESTUDIANTE    */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl p-5 border border-indigo-500/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Navegación Escolar por Niveles
            </h3>
          </div>
          <span className="text-xs text-indigo-300 font-medium bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-800/50">
            {filteredStudents.length} estudiantes disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* STEP 1: GRADO ACADÉMICO */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <label className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>1. Seleccionar Grado:</span>
            </label>
            <select
              id="select-report-grade"
              value={selectedGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">⭐ Todos los Grados</option>
              {availableGrades.map((grade) => (
                <option key={grade} value={grade}>
                  Grado {grade} ({groups.filter(g => g.grade === grade || g.name.includes(grade)).length} cursos)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Filtra las opciones de cursos y aulas.
            </p>
          </div>

          {/* STEP 2: CURSO / GRUPO */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <label className="text-xs font-bold text-teal-300 flex items-center space-x-1.5">
              <School className="w-4 h-4 text-teal-400" />
              <span>2. Seleccionar Curso / Grupo:</span>
            </label>
            <select
              id="select-report-group"
              value={selectedGroupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">⭐ Todos los cursos ({filteredGroups.length})</option>
              {filteredGroups.map((g) => {
                const groupStudentCount = students.filter((s) => s.groupId === g.id && s.status === 'active').length;
                return (
                  <option key={g.id} value={g.id}>
                    {g.name} ({groupStudentCount} est.) - Jornada {g.shift}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-slate-400">
              Cursos pertenecientes al grado seleccionado.
            </p>
          </div>

          {/* STEP 3: ESTUDIANTE */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>3. Seleccionar Estudiante:</span>
              </label>
              {filteredStudents.length > 5 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {filteredStudents.length} resultados
                </span>
              )}
            </div>

            <select
              id="select-report-student"
              value={selectedStudent?.id || ''}
              onChange={(e) => handleStudentChange(e.target.value)}
              disabled={filteredStudents.length === 0}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
            >
              {filteredStudents.length === 0 ? (
                <option value="">No hay estudiantes en este curso</option>
              ) : (
                filteredStudents.map((s) => {
                  const sGroup = groups.find((g) => g.id === s.groupId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.lastName} {s.firstName} ({sGroup?.name || 'S/G'})
                    </option>
                  );
                })
              )}
            </select>

            {/* Quick search input within the current grade/group */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tasa de Asistencia</span>
          </span>
          <p className="text-2xl font-black text-emerald-400">{scopedData.attendanceRate}%</p>
          <p className="text-[11px] text-slate-500">
            {statsScope === 'scoped' ? currentGroupName : 'Institucional'} ({scopedData.totalAbsents} faltas)
          </p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
            <Shirt className="w-3.5 h-3.5 text-teal-400" />
            <span>Cumplimiento Uniforme</span>
          </span>
          <p className="text-2xl font-black text-teal-400">{scopedData.uniformComplianceRate}%</p>
          <p className="text-[11px] text-slate-500">Porte reglamentario evaluado</p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>Promedio de Notas</span>
          </span>
          <p className="text-2xl font-black text-indigo-400">{scopedData.gradeAverage}</p>
          <p className="text-[11px] text-slate-500">Escala de 1.0 a 5.0 ({scopedData.studentCount} est.)</p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Entregas a Tiempo</span>
          </span>
          <p className="text-2xl font-black text-amber-400">{scopedData.onTimeRate}%</p>
          <p className="text-[11px] text-slate-500">Puntualidad en talleres y tareas</p>
        </div>
      </div>

      {/* Early Warning / At Risk Section */}
      {atRiskStudents.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-300">
              Alertas Tempranas: Seguimiento de Inasistencias y Convivencia ({atRiskStudents.length})
            </h3>
          </div>
          <p className="text-xs text-amber-400/90">
            Estudiantes con inasistencias registradas, retardos continuos o novedades de uniforme para notificación prioritaria a acudientes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {atRiskStudents.map(({ student, group, stats }) => (
              <div
                key={student.id}
                className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 shadow-md flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{student.lastName} {student.firstName}</h4>
                  <p className="text-[11px] text-slate-400">{group?.name} • {student.guardianName}</p>
                  <div className="flex items-center space-x-2 mt-1 text-[10px] font-bold">
                    {stats.absences > 0 && (
                      <span className="text-rose-400 bg-rose-950/40 border border-rose-900/50 px-1.5 py-0.5 rounded">
                        {stats.absences} inasistencias
                      </span>
                    )}
                    {stats.lates > 0 && (
                      <span className="text-amber-400 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded">
                        {stats.lates} retardos
                      </span>
                    )}
                    {stats.uniformIssues > 0 && (
                      <span className="text-purple-400 bg-purple-950/40 border border-purple-900/50 px-1.5 py-0.5 rounded">
                        {stats.uniformIssues} uniforme
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectAtRiskStudent(student)}
                  className="px-2.5 py-1.5 text-xs font-bold text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/40 rounded-lg transition-colors cursor-pointer"
                >
                  Ver Ficha
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Student Report Card Dossier */}
      <div className="bg-slate-900/60 rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Ficha Integral del Estudiante (Boletín Escolar)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Genera la hoja de vida académica con historial de asistencia, notas y uniforme.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-print-student-dossier"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Ficha</span>
            </button>

            <button
              id="btn-send-whatsapp-student-report"
              onClick={handleSendFullReportWhatsApp}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 hover:shadow-indigo-900/60 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Resumen por WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Printable Report Dossier Card */}
        {selectedStudent ? (
          <div id="printable-student-dossier" className="border border-slate-800 rounded-2xl p-6 bg-slate-950/40 space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm ${selectedStudent.avatarColor || 'bg-indigo-600'}`}>
                  {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-100 leading-tight">
                    {selectedStudent.lastName} {selectedStudent.firstName}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Doc: <strong className="text-slate-300">{selectedStudent.documentId}</strong> • Grado: <strong className="text-indigo-300">{studentGroup?.grade || selectedGrade}</strong> • Curso: <strong className="text-slate-300">{studentGroup?.name}</strong> • Jornada: {studentGroup?.shift}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Promedio General Ponderado</span>
                <span className="text-2xl font-black text-indigo-400">{studentAverage} / 5.0</span>
              </div>
            </div>

            {/* Guardian and Institutional details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Acudiente Titular</span>
                <p className="font-semibold text-slate-200">{selectedStudent.guardianName} ({selectedStudent.guardianRelationship})</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Contacto WhatsApp</span>
                <p className="font-semibold text-emerald-400">{selectedStudent.guardianCountryCode} {selectedStudent.guardianPhone}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Institución / Docente</span>
                <p className="font-semibold text-slate-200">{settings.schoolName}</p>
              </div>
            </div>

            {/* Grades breakdown organized by subject */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Calificaciones y Entregas Registradas por Asignatura ({studentGradesBySubject.filter(s => s.items.length > 0).length} asignaturas)</span>
                </h5>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-indigo-300 font-medium bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-800/40">
                    Periodo {settings.currentPeriod}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Total: <strong className="text-slate-200">{studentGradesHistory.length}</strong> actividades
                  </span>
                </div>
              </div>

              {studentGradesBySubject.length === 0 || studentGradesHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                  No hay notas registradas para este estudiante en el periodo actual.
                </p>
              ) : (
                <div className="space-y-4">
                  {studentGradesBySubject
                    .filter((subj) => subj.items.length > 0)
                    .map((subj) => (
                      <div
                        key={subj.subject}
                        className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0"
                      >
                        {/* Subject Header Banner */}
                        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm sm:text-base font-bold text-slate-100">
                                  {subj.subject}
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${subj.performanceBg}`}>
                                  {subj.performanceLevel}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {subj.gradedCount} de {subj.totalActivities} actividades evaluadas
                                {subj.totalActivities > 0 && ` • ${subj.onTimeCount} a tiempo`}
                                {subj.lateCount > 0 && ` • ${subj.lateCount} con retraso`}
                                {subj.noDeliveryCount > 0 && ` • ${subj.noDeliveryCount} no entregadas`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Promedio Asignatura
                              </span>
                              <span className="text-base sm:text-lg font-black text-indigo-300">
                                {subj.average} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Activities Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                              <tr>
                                <th className="p-2.5 sm:p-3 min-w-[130px]">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Fecha de Realización</span>
                                  </div>
                                </th>
                                <th className="p-2.5 sm:p-3 min-w-[180px]">Actividad / Tarea</th>
                                <th className="p-2.5 sm:p-3 text-center min-w-[90px]">Tipo & Peso</th>
                                <th className="p-2.5 sm:p-3 text-center min-w-[90px]">Calificación</th>
                                <th className="p-2.5 sm:p-3 min-w-[120px]">Puntualidad</th>
                                <th className="p-2.5 sm:p-3 min-w-[160px]">Comentarios del Docente</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80">
                              {subj.items.map(({ grade, activity }, idx) => {
                                const activityDate = activity.assignedDate || activity.dueDate || 'Sin fecha';
                                return (
                                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                    {/* Date of activity */}
                                    <td className="p-2.5 sm:p-3 font-medium text-slate-300 whitespace-nowrap">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
                                          <span>{activityDate}</span>
                                        </span>
                                        {activity.dueDate && activity.dueDate !== activity.assignedDate && (
                                          <span className="text-[10px] text-slate-400 pl-5">
                                            Límite: {activity.dueDate}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Activity Title and Description */}
                                    <td className="p-2.5 sm:p-3">
                                      <div className="font-bold text-slate-100">
                                        {activity.title}
                                      </div>
                                      {activity.description && (
                                        <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5" title={activity.description}>
                                          {activity.description}
                                        </p>
                                      )}
                                    </td>

                                    {/* Type & Weight */}
                                    <td className="p-2.5 sm:p-3 text-center">
                                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] uppercase font-bold">
                                        {activity.type}
                                      </span>
                                      {activity.weightPercentage > 0 && (
                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                          {activity.weightPercentage}%
                                        </span>
                                      )}
                                    </td>

                                    {/* Score */}
                                    <td className="p-2.5 sm:p-3 text-center font-bold">
                                      {grade.score !== null ? (
                                        <span
                                          className={`font-black text-sm font-mono ${
                                            grade.score >= 4.0
                                              ? 'text-emerald-400'
                                              : grade.score >= (activity.passingScore || settings.passingScore || settings.minPassingScore || 3.5)
                                              ? 'text-blue-400'
                                              : 'text-rose-400'
                                          }`}
                                        >
                                          {grade.score.toFixed(1)}{' '}
                                          <span className="text-slate-500 text-[10px] font-normal">/ {activity.maxScore || 5.0}</span>
                                        </span>
                                      ) : (
                                        <span className="text-slate-500 italic text-[11px]">Por calificar</span>
                                      )}
                                    </td>

                                    {/* Delivery status */}
                                    <td className="p-2.5 sm:p-3">
                                      {grade.deliveredOnTime === 'yes' && (
                                        <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                          <span>✓ A tiempo</span>
                                        </span>
                                      )}
                                      {grade.deliveredOnTime === 'late' && (
                                        <span className="text-amber-400 font-semibold flex items-center space-x-1">
                                          <Clock className="w-3.5 h-3.5 shrink-0" />
                                          <span>⚠️ Con retraso</span>
                                        </span>
                                      )}
                                      {grade.deliveredOnTime === 'no' && (
                                        <span className="text-rose-400 font-semibold flex items-center space-x-1">
                                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                                          <span>❌ No entregada</span>
                                        </span>
                                      )}
                                      {grade.deliveredOnTime === 'pending' && (
                                        <span className="text-slate-500 font-medium">⏳ Pendiente</span>
                                      )}
                                    </td>

                                    {/* Comments */}
                                    <td className="p-2.5 sm:p-3 text-slate-300">
                                      {grade.comments ? (
                                        <span className="italic text-[11px] text-slate-300 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/80 block">
                                          "{grade.comments}"
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 text-[11px]">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Attendance & Uniform history */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Historial Reciente de Asistencia y Porte de Uniforme ({studentAttendanceHistory.length})
              </h5>
              {studentAttendanceHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl border border-slate-800">
                  No hay registros de asistencia para este estudiante.
                </p>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-300 font-semibold">
                      <tr>
                        <th className="p-2.5">Fecha</th>
                        <th className="p-2.5">Estado Asistencia</th>
                        <th className="p-2.5">Uniforme</th>
                        <th className="p-2.5">Observaciones / Novedades</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {studentAttendanceHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-medium text-slate-400">{rec.date}</td>
                          <td className="p-2.5 font-bold">
                            {rec.status === 'present' && <span className="text-emerald-400">Presente</span>}
                            {rec.status === 'late' && <span className="text-amber-400">Retardo ({rec.lateMinutes || 10}m)</span>}
                            {(rec.status === 'absent' || rec.status === 'unexcused_absence') && <span className="text-rose-400">Inasistente</span>}
                            {(rec.status === 'excused' || rec.status === 'excused_absence') && <span className="text-sky-400">Justificado</span>}
                          </td>
                          <td className="p-2.5">
                            {rec.uniformStatus === 'complete' && <span className="text-emerald-400">Completo</span>}
                            {rec.uniformStatus === 'incomplete' && <span className="text-amber-400">Incompleto ({rec.uniformNotes || 'Faltan prendas'})</span>}
                            {rec.uniformStatus === 'none' && <span className="text-rose-400">Sin uniforme</span>}
                          </td>
                          <td className="p-2.5 text-slate-400">{rec.observations || rec.excuseReason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400">
            <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-sm">No hay estudiante seleccionado</p>
            <p className="text-xs text-slate-500 mt-1">Por favor selecciona un grado, curso y estudiante arriba.</p>
          </div>
        )}
      </div>
    </div>
  );
};

