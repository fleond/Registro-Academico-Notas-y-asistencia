import React, { useState, useMemo, useEffect } from 'react';
import { 
  Group, 
  SchoolSettings, 
  AuthUser, 
  Teacher, 
  DayOfWeek, 
  ScheduleTimeSlot,
  ScheduleConflict
} from '../types';
import { sortGroupsAscending } from '../utils/groupUtils';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  ClipboardCheck, 
  GraduationCap, 
  BookOpen, 
  LayoutGrid, 
  Edit, 
  Trash2, 
  Printer, 
  Sparkles, 
  MapPin, 
  Users, 
  Info, 
  Check, 
  X,
  ExternalLink,
  ChevronRight,
  Layers,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  Building,
  School
} from 'lucide-react';
import { resolveActiveTeacher, getSubjectsForGroupAndTeacher } from '../utils/teacherUtils';

interface TeacherScheduleModuleProps {
  groups: Group[];
  settings: SchoolSettings;
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  schedules: ScheduleTimeSlot[];
  onUpdateSchedules: (slots: ScheduleTimeSlot[]) => void;
  onNavigateToAttendance?: (groupId: string, date?: string) => void;
  onNavigateToGrades?: (groupId: string, subject?: string) => void;
  onNavigateToDailyLog?: (groupId: string, subject?: string) => void;
  onNavigateToSeatingChart?: (groupId: string) => void;
}

const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Lunes', short: 'Lun' },
  { key: 'tuesday', label: 'Martes', short: 'Mar' },
  { key: 'wednesday', label: 'Miércoles', short: 'Mié' },
  { key: 'thursday', label: 'Jueves', short: 'Jue' },
  { key: 'friday', label: 'Viernes', short: 'Vie' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
];

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string; hover: string }> = {
  indigo: {
    bg: 'bg-indigo-950/60',
    border: 'border-indigo-700/60',
    text: 'text-indigo-200',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    hover: 'hover:border-indigo-500',
  },
  emerald: {
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-700/60',
    text: 'text-emerald-200',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    hover: 'hover:border-emerald-500',
  },
  sky: {
    bg: 'bg-sky-950/60',
    border: 'border-sky-700/60',
    text: 'text-sky-200',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    hover: 'hover:border-sky-500',
  },
  purple: {
    bg: 'bg-purple-950/60',
    border: 'border-purple-700/60',
    text: 'text-purple-200',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    hover: 'hover:border-purple-500',
  },
  amber: {
    bg: 'bg-amber-950/60',
    border: 'border-amber-700/60',
    text: 'text-amber-200',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    hover: 'hover:border-amber-500',
  },
  teal: {
    bg: 'bg-teal-950/60',
    border: 'border-teal-700/60',
    text: 'text-teal-200',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    hover: 'hover:border-teal-500',
  },
  rose: {
    bg: 'bg-rose-950/60',
    border: 'border-rose-700/60',
    text: 'text-rose-200',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    hover: 'hover:border-rose-500',
  },
};

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap.
 */
export const checkTimeOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
  if (!startA || !endA || !startB || !endB) return false;
  return startA < endB && endA > startB;
};

export interface DetailedConflictCheck {
  hasBlockingConflict: boolean;
  groupConflict?: {
    otherTeacherName: string;
    otherSubject: string;
    groupName: string;
    dayLabel: string;
    startTime: string;
    endTime: string;
    classroom?: string;
    isSameTeacher: boolean;
  };
  teacherConflict?: {
    otherGroupName: string;
    otherSubject: string;
    dayLabel: string;
    startTime: string;
    endTime: string;
  };
  roomConflict?: {
    roomName: string;
    otherTeacherName: string;
    otherGroupName: string;
    startTime: string;
    endTime: string;
  };
  message?: string;
}

export const TeacherScheduleModule: React.FC<TeacherScheduleModuleProps> = ({
  groups,
  settings,
  currentUser,
  teachers = [],
  schedules,
  onUpdateSchedules,
  onNavigateToAttendance,
  onNavigateToGrades,
  onNavigateToDailyLog,
  onNavigateToSeatingChart,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';

  // Resolved teacher for current logged-in user
  const loggedTeacher = useMemo(() => {
    return resolveActiveTeacher(currentUser, teachers);
  }, [currentUser, teachers]);

  // Admin selected teacher (or view all)
  const [adminSelectedTeacherId, setAdminSelectedTeacherId] = useState<string>(() => {
    if (isTeacher && loggedTeacher) return loggedTeacher.id;
    return teachers[0]?.id || 'all';
  });

  // Effective teacher ID for viewing/editing
  const effectiveTeacherId = useMemo(() => {
    if (isTeacher) {
      return loggedTeacher?.id || currentUser?.id || 'tch-1';
    }
    return adminSelectedTeacherId;
  }, [isTeacher, loggedTeacher, currentUser, adminSelectedTeacherId]);

  const effectiveTeacher = useMemo(() => {
    if (effectiveTeacherId === 'all') return null;
    return teachers.find((t) => t.id === effectiveTeacherId) || loggedTeacher || null;
  }, [effectiveTeacherId, teachers, loggedTeacher]);

  // Groups and teachers mapping
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);

  // Filtered schedules for the active view
  // CRITICAL REQUIREMENT: Teachers only see their own schedule!
  const displayedSchedules = useMemo(() => {
    if (isTeacher) {
      const targetId = loggedTeacher?.id || currentUser?.id || 'tch-1';
      return schedules.filter((s) => s.teacherId === targetId);
    }
    // For admin
    if (adminSelectedTeacherId === 'all') {
      return schedules;
    }
    return schedules.filter((s) => s.teacherId === adminSelectedTeacherId);
  }, [isTeacher, loggedTeacher, currentUser, schedules, adminSelectedTeacherId]);

  // Accessible groups for the active teacher in modal
  const accessibleGroups = useMemo(() => {
    if (isAdmin && adminSelectedTeacherId === 'all') {
      return sortGroupsAscending(groups);
    }
    const currentTch = effectiveTeacher;
    if (!currentTch) return sortGroupsAscending(groups);

    const assignedIds = new Set(currentTch.assignedGroupIds || []);
    const assignedGrades = new Set(currentTch.assignedGrades || []);

    const filtered = groups.filter((g) => {
      if (assignedIds.has(g.id)) return true;
      if (g.createdByTeacherId && g.createdByTeacherId === currentTch.id) return true;
      if (g.assignedTeacherIds && g.assignedTeacherIds.includes(currentTch.id)) return true;
      if (g.grade && assignedGrades.has(g.grade.trim())) return true;
      return false;
    });

    return filtered.length > 0 ? sortGroupsAscending(filtered) : sortGroupsAscending(groups);
  }, [isAdmin, adminSelectedTeacherId, effectiveTeacher, groups]);

  // State: Include Saturday in grid
  const [includeSaturday, setIncludeSaturday] = useState(false);

  // Tab mode for Admin: Schedule Grid vs. Institutional Conflict Inspector
  const [adminViewMode, setAdminViewMode] = useState<'schedule' | 'conflicts'>('schedule');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Form Fields
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formDay, setFormDay] = useState<DayOfWeek>('monday');
  const [formStartTime, setFormStartTime] = useState('07:00');
  const [formEndTime, setFormEndTime] = useState('08:30');
  const [formGroupId, setFormGroupId] = useState<string>('');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formClassroom, setFormClassroom] = useState<string>('Aula 201');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formColor, setFormColor] = useState<string>('indigo');

  // Quick Action / Detail Modal
  const [activeSlotDetail, setActiveSlotDetail] = useState<ScheduleTimeSlot | null>(null);

  // Live Current Class Detection
  const [currentDayKey, setCurrentDayKey] = useState<DayOfWeek>('monday');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('08:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dayMap: Record<number, DayOfWeek> = {
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday',
        0: 'monday',
      };
      const day = dayMap[now.getDay()] || 'monday';
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentDayKey(day);
      setCurrentTimeStr(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Find ongoing slot for current displayed view
  const ongoingSlot = useMemo(() => {
    return displayedSchedules.find((s) => {
      if (s.day !== currentDayKey) return false;
      return currentTimeStr >= s.startTime && currentTimeStr <= s.endTime;
    });
  }, [displayedSchedules, currentDayKey, currentTimeStr]);

  // Real-time conflict detection function
  const checkConflicts = (
    targetDay: DayOfWeek,
    targetStart: string,
    targetEnd: string,
    targetGroupId: string,
    targetTeacherId: string,
    targetClassroom?: string,
    ignoreSlotId?: string | null
  ): DetailedConflictCheck => {
    if (!targetDay || !targetStart || !targetEnd || !targetGroupId) {
      return { hasBlockingConflict: false };
    }

    const dayObj = DAYS_OF_WEEK.find((d) => d.key === targetDay);
    const dayLabel = dayObj?.label || targetDay;
    const targetGroup = groupMap.get(targetGroupId);
    const groupName = targetGroup?.name || 'Grupo';

    // 1. Group overlap check across ALL school schedules
    for (const slot of schedules) {
      if (ignoreSlotId && slot.id === ignoreSlotId) continue;
      if (slot.day !== targetDay) continue;

      if (slot.groupId === targetGroupId && checkTimeOverlap(targetStart, targetEnd, slot.startTime, slot.endTime)) {
        const otherTeacher = teacherMap.get(slot.teacherId) || { name: slot.teacherName || 'Otro Docente' };
        const isSameTeacher = slot.teacherId === targetTeacherId;

        return {
          hasBlockingConflict: true,
          groupConflict: {
            otherTeacherName: otherTeacher.name,
            otherSubject: slot.subject,
            groupName,
            dayLabel,
            startTime: slot.startTime,
            endTime: slot.endTime,
            classroom: slot.classroomOrLab,
            isSameTeacher,
          },
          message: isSameTeacher
            ? `Ya tienes programada otra clase con ${groupName} (${slot.subject}) el ${dayLabel} de ${slot.startTime} a ${slot.endTime}.`
            : `El grupo ${groupName} ya tiene clase programada con ${otherTeacher.name} (${slot.subject}) el ${dayLabel} de ${slot.startTime} a ${slot.endTime}${slot.classroomOrLab ? ` en ${slot.classroomOrLab}` : ''}.`,
        };
      }
    }

    // 2. Teacher availability overlap check (teacher cannot teach 2 different groups at once)
    for (const slot of schedules) {
      if (ignoreSlotId && slot.id === ignoreSlotId) continue;
      if (slot.day !== targetDay) continue;

      if (slot.teacherId === targetTeacherId && slot.groupId !== targetGroupId && checkTimeOverlap(targetStart, targetEnd, slot.startTime, slot.endTime)) {
        const otherGroup = groupMap.get(slot.groupId);
        const otherGroupName = otherGroup?.name || 'Otro Grupo';

        return {
          hasBlockingConflict: true,
          teacherConflict: {
            otherGroupName,
            otherSubject: slot.subject,
            dayLabel,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
          message: `El docente ya tiene programada otra clase con el grupo ${otherGroupName} (${slot.subject}) el ${dayLabel} de ${slot.startTime} a ${slot.endTime}.`,
        };
      }
    }

    // 3. Classroom / Physical space collision check
    if (targetClassroom && targetClassroom.trim().length > 1) {
      const cleanRoom = targetClassroom.trim().toLowerCase();
      for (const slot of schedules) {
        if (ignoreSlotId && slot.id === ignoreSlotId) continue;
        if (slot.day !== targetDay) continue;

        if (
          slot.classroomOrLab &&
          slot.classroomOrLab.trim().toLowerCase() === cleanRoom &&
          checkTimeOverlap(targetStart, targetEnd, slot.startTime, slot.endTime)
        ) {
          const otherTeacher = teacherMap.get(slot.teacherId) || { name: slot.teacherName || 'Otro Docente' };
          const otherGroup = groupMap.get(slot.groupId);

          return {
            hasBlockingConflict: false, // Warning rather than hard block for shared rooms if needed
            roomConflict: {
              roomName: targetClassroom.trim(),
              otherTeacherName: otherTeacher.name,
              otherGroupName: otherGroup?.name || 'Otro Grupo',
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
            message: `El espacio "${targetClassroom.trim()}" ya está reservado por ${otherTeacher.name} con ${otherGroup?.name || 'otro grupo'} (${slot.startTime} - ${slot.endTime}).`,
          };
        }
      }
    }

    return { hasBlockingConflict: false };
  };

  // Live conflict result inside the modal form
  const modalConflictCheck = useMemo(() => {
    if (!isModalOpen) return { hasBlockingConflict: false };
    return checkConflicts(
      formDay,
      formStartTime,
      formEndTime,
      formGroupId,
      formTeacherId,
      formClassroom,
      editingSlotId
    );
  }, [isModalOpen, formDay, formStartTime, formEndTime, formGroupId, formTeacherId, formClassroom, editingSlotId, schedules]);

  // Open Create Modal
  const handleOpenCreate = (day?: DayOfWeek, startTime?: string, endTime?: string) => {
    const targetTeacher = effectiveTeacher || teachers[0];
    const targetTchId = targetTeacher?.id || 'tch-1';

    const defaultGrp = accessibleGroups[0]?.id || groups[0]?.id || '';
    const selectedGroupObj = groups.find((g) => g.id === defaultGrp);
    const availableSubjects = getSubjectsForGroupAndTeacher(
      selectedGroupObj,
      targetTeacher,
      teachers,
      settings,
      isTeacher
    );
    const defaultSub = availableSubjects[0] || 'Matemáticas';

    setEditingSlotId(null);
    setFormTeacherId(targetTchId);
    setFormDay(day || 'monday');
    setFormStartTime(startTime || '07:00');
    setFormEndTime(endTime || '08:30');
    setFormGroupId(defaultGrp);
    setFormSubject(defaultSub);
    setFormClassroom('Aula 201');
    setFormNotes('');
    setFormColor('indigo');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (slot: ScheduleTimeSlot) => {
    setEditingSlotId(slot.id);
    setFormTeacherId(slot.teacherId);
    setFormDay(slot.day);
    setFormStartTime(slot.startTime);
    setFormEndTime(slot.endTime);
    setFormGroupId(slot.groupId);
    setFormSubject(slot.subject);
    setFormClassroom(slot.classroomOrLab || '');
    setFormNotes(slot.notes || '');
    setFormColor(slot.color || 'indigo');
    setIsModalOpen(true);
    setActiveSlotDetail(null);
  };

  // Delete Slot
  const handleDeleteSlot = (id: string) => {
    const slotToDelete = schedules.find((s) => s.id === id);
    if (!slotToDelete) return;

    if (window.confirm('¿Deseas eliminar este bloque de clase del horario?')) {
      // Remove ONLY this slot, leaving all other teacher slots untouched!
      const updatedSchedules = schedules.filter((s) => s.id !== id);
      onUpdateSchedules(updatedSchedules);
      if (activeSlotDetail?.id === id) setActiveSlotDetail(null);
    }
  };

  // Save Slot
  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formGroupId || !formSubject || !formStartTime || !formEndTime || !formTeacherId) {
      alert('Por favor completa todos los campos requeridos (Docente, Grupo, Asignatura, Hora Inicio y Fin).');
      return;
    }

    if (formStartTime >= formEndTime) {
      alert('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    // Strict Cross-Validation Check
    const conflictResult = checkConflicts(
      formDay,
      formStartTime,
      formEndTime,
      formGroupId,
      formTeacherId,
      formClassroom,
      editingSlotId
    );

    if (conflictResult.hasBlockingConflict) {
      alert(`⚠️ NO SE PUEDE GUARDAR DEBIDO A UN CRUCE DE HORARIO:\n\n${conflictResult.message}\n\nPor favor ajusta la hora o el grupo para evitar superposiciones con otros docentes o clases.`);
      return;
    }

    const teacherObj = teacherMap.get(formTeacherId);
    const teacherName = teacherObj?.name || 'Docente';

    if (editingSlotId) {
      const updated = schedules.map((s) => {
        if (s.id === editingSlotId) {
          return {
            ...s,
            teacherId: formTeacherId,
            teacherName,
            day: formDay,
            startTime: formStartTime,
            endTime: formEndTime,
            groupId: formGroupId,
            subject: formSubject,
            classroomOrLab: formClassroom.trim() || undefined,
            notes: formNotes.trim() || undefined,
            color: formColor,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      onUpdateSchedules(updated);
    } else {
      const newSlot: ScheduleTimeSlot = {
        id: `slot-${Date.now()}`,
        teacherId: formTeacherId,
        teacherName,
        day: formDay,
        startTime: formStartTime,
        endTime: formEndTime,
        groupId: formGroupId,
        subject: formSubject,
        classroomOrLab: formClassroom.trim() || undefined,
        notes: formNotes.trim() || undefined,
        color: formColor,
        createdAt: new Date().toISOString(),
      };
      onUpdateSchedules([...schedules, newSlot]);
    }

    setIsModalOpen(false);
  };

  // Group slots by day
  const visibleDays = useMemo(() => {
    return includeSaturday ? DAYS_OF_WEEK : DAYS_OF_WEEK.filter((d) => d.key !== 'saturday');
  }, [includeSaturday]);

  const slotsByDay = useMemo(() => {
    const map = new Map<DayOfWeek, ScheduleTimeSlot[]>();
    DAYS_OF_WEEK.forEach((d) => map.set(d.key, []));
    displayedSchedules.forEach((s) => {
      const list = map.get(s.day) || [];
      list.push(s);
      map.set(s.day, list);
    });
    // Sort each day's slots by start time
    map.forEach((list, key) => {
      map.set(key, list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    });
    return map;
  }, [displayedSchedules]);

  // Overall Statistics for active view
  const activeMetrics = useMemo(() => {
    const totalSlots = displayedSchedules.length;
    const uniqueGroups = new Set(displayedSchedules.map((s) => s.groupId)).size;
    const uniqueSubjects = new Set(displayedSchedules.map((s) => s.subject)).size;

    // Calculate approximate weekly hours
    let totalMinutes = 0;
    displayedSchedules.forEach((s) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins > 0) totalMinutes += mins;
      }
    });
    const totalHours = (totalMinutes / 60).toFixed(1);

    return { totalSlots, uniqueGroups, uniqueSubjects, totalHours };
  }, [displayedSchedules]);

  // Global Institutional Conflict Scanner for Admin
  const institutionalConflicts = useMemo(() => {
    const conflicts: {
      id: string;
      dayLabel: string;
      timeRange: string;
      groupName: string;
      slot1: ScheduleTimeSlot;
      slot2: ScheduleTimeSlot;
      reason: string;
    }[] = [];

    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const s1 = schedules[i];
        const s2 = schedules[j];

        if (s1.day !== s2.day) continue;
        if (!checkTimeOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) continue;

        const dayObj = DAYS_OF_WEEK.find((d) => d.key === s1.day);
        const dayLabel = dayObj?.label || s1.day;
        const group = groupMap.get(s1.groupId);
        const groupName = group?.name || 'Grupo';

        // 1. Same group collision
        if (s1.groupId === s2.groupId) {
          const t1 = teacherMap.get(s1.teacherId)?.name || s1.teacherName || 'Docente 1';
          const t2 = teacherMap.get(s2.teacherId)?.name || s2.teacherName || 'Docente 2';

          conflicts.push({
            id: `conf-grp-${s1.id}-${s2.id}`,
            dayLabel,
            timeRange: `${s1.startTime} - ${s1.endTime} / ${s2.startTime} - ${s2.endTime}`,
            groupName,
            slot1: s1,
            slot2: s2,
            reason: s1.teacherId === s2.teacherId
              ? `El docente ${t1} tiene 2 clases programadas para el mismo grupo ${groupName} a la misma hora.`
              : `Cruce de grupo: ${t1} (${s1.subject}) y ${t2} (${s2.subject}) coinciden en ${groupName}.`,
          });
        }
        // 2. Same teacher in 2 different groups at once
        else if (s1.teacherId === s2.teacherId) {
          const t1 = teacherMap.get(s1.teacherId)?.name || s1.teacherName || 'Docente';
          const g1 = groupMap.get(s1.groupId)?.name || 'Grupo 1';
          const g2 = groupMap.get(s2.groupId)?.name || 'Grupo 2';

          conflicts.push({
            id: `conf-tch-${s1.id}-${s2.id}`,
            dayLabel,
            timeRange: `${s1.startTime} - ${s1.endTime}`,
            groupName: `${g1} y ${g2}`,
            slot1: s1,
            slot2: s2,
            reason: `El docente ${t1} tiene asignados simultáneamente dos grupos distintos (${g1} y ${g2}).`,
          });
        }
      }
    }

    return conflicts;
  }, [schedules, groupMap, teacherMap]);

  return (
    <div className="space-y-6">
      {/* Header Banner & Teacher Personal Profile */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-sky-600/20 text-sky-400 border border-sky-500/30 shadow-inner">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-slate-100 tracking-tight">
                    {isTeacher 
                      ? 'Mi Horario de Clases Semanal' 
                      : (adminSelectedTeacherId === 'all' 
                          ? 'Horario General Institucional' 
                          : `Horario Académico: ${effectiveTeacher?.name || 'Docente'}`)}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {isTeacher ? 'Exclusivo Docente' : 'Control Académico'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isTeacher
                    ? `Vista personal de ${loggedTeacher?.name || 'Docente'}. Cada bloque cuenta con validación anti-cruces y accesos directos a asistencia y notas.`
                    : 'Gestión exclusiva de horarios por docente con control cruzado automático para evitar choques de grupo o disponibilidad.'}
                </p>
              </div>
            </div>

            {/* Teacher Details & Summary Pill */}
            {effectiveTeacher && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${effectiveTeacher.avatarColor || 'bg-sky-500'}`} />
                  <span className="font-bold text-slate-200">{effectiveTeacher.name}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-300 font-medium">{effectiveTeacher.specialty || 'Docente Titular'}</span>
                  {effectiveTeacher.documentId && (
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                      CC {effectiveTeacher.documentId}
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-sky-950/40 border border-sky-800/50 text-xs text-sky-300 font-medium">
                  <span><strong>{activeMetrics.totalSlots}</strong> clases</span>
                  <span>•</span>
                  <span><strong>{activeMetrics.totalHours}</strong> hrs/sem</span>
                  <span>•</span>
                  <span><strong>{activeMetrics.uniqueGroups}</strong> grupos</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
            {/* Admin Teacher Switcher */}
            {isAdmin && (
              <div className="flex items-center space-x-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 pl-2">Docente:</span>
                <select
                  value={adminSelectedTeacherId}
                  onChange={(e) => setAdminSelectedTeacherId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500 font-semibold"
                >
                  <option value="all">🏫 Todos los Docentes (Consolidado)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      👤 {t.name} ({t.assignedSubjects?.join(', ') || t.specialty})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Admin view mode switch: Schedule vs Conflict Scanner */}
            {isAdmin && (
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setAdminViewMode('schedule')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    adminViewMode === 'schedule'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Horario
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewMode('conflicts')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    adminViewMode === 'conflicts'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Cruces</span>
                  {institutionalConflicts.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black">
                      {institutionalConflicts.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Clase</span>
            </button>

            <button
              type="button"
              onClick={() => setIncludeSaturday(!includeSaturday)}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                includeSaturday
                  ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{includeSaturday ? 'Ocultar Sáb' : 'Mostrar Sáb'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Live Ongoing Class Alert Banner */}
        {ongoingSlot && (
          <div className="bg-emerald-950/60 border border-emerald-500/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    ¡Clase en Curso Ahora!
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    ({ongoingSlot.startTime} - {ongoingSlot.endTime})
                  </span>
                  {ongoingSlot.teacherName && (
                    <span className="text-xs text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/50">
                      Docente: {ongoingSlot.teacherName}
                    </span>
                  )}
                </div>
                <div className="text-sm font-black text-white mt-0.5">
                  {groupMap.get(ongoingSlot.groupId)?.name} — {ongoingSlot.subject}{' '}
                  {ongoingSlot.classroomOrLab && (
                    <span className="text-xs font-medium text-emerald-300">
                      ({ongoingSlot.classroomOrLab})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onNavigateToAttendance && (
                <button
                  type="button"
                  onClick={() => onNavigateToAttendance(ongoingSlot.groupId)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Tomar Asistencia Ya</span>
                </button>
              )}

              {onNavigateToGrades && (
                <button
                  type="button"
                  onClick={() => onNavigateToGrades(ongoingSlot.groupId, ongoingSlot.subject)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <span>Notas</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADMIN CONFLICTS TAB */}
      {isAdmin && adminViewMode === 'conflicts' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${institutionalConflicts.length === 0 ? 'bg-emerald-600/20 text-emerald-400' : 'bg-amber-600/20 text-amber-400'}`}>
                {institutionalConflicts.length === 0 ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Auditoría Institucional de Cruces de Horario
                </h3>
                <p className="text-xs text-slate-400">
                  Monitoreo en tiempo real de colisiones de horario entre docentes, grupos y espacios físicos.
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              institutionalConflicts.length === 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
            }`}>
              {institutionalConflicts.length === 0 ? '0 Cruces Detectados' : `${institutionalConflicts.length} Conflictos Activos`}
            </span>
          </div>

          {institutionalConflicts.length === 0 ? (
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div className="text-base font-bold text-emerald-200">
                ¡Horarios Institucionales Perfectamente Sincronizados!
              </div>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                No se detectó ningún cruce ni choque de grupos ni de docentes. Cada docente tiene asignado su propio horario de manera exclusiva e independiente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {institutionalConflicts.map((conf) => (
                <div
                  key={conf.id}
                  className="bg-rose-950/30 border border-rose-700/50 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black rounded uppercase">
                        {conf.dayLabel} • {conf.timeRange}
                      </span>
                      <span className="text-xs font-bold text-white">
                        Grupo: {conf.groupName}
                      </span>
                    </div>
                    <p className="text-xs text-rose-200 font-medium">
                      {conf.reason}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(conf.slot1)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                    >
                      Editar Clase 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(conf.slot2)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                    >
                      Editar Clase 2
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Weekly Schedule Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5 gap-4">
          {visibleDays.map((dayObj) => {
            const daySlots = slotsByDay.get(dayObj.key) || [];
            const isToday = currentDayKey === dayObj.key;

            return (
              <div
                key={dayObj.key}
                className={`rounded-2xl border flex flex-col min-h-[440px] transition-all ${
                  isToday
                    ? 'bg-slate-900/90 border-sky-500/60 shadow-lg ring-1 ring-sky-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-3.5 border-b rounded-t-2xl flex items-center justify-between ${
                    isToday
                      ? 'bg-sky-950/60 border-sky-800/80 text-sky-200'
                      : 'bg-slate-800/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm">{dayObj.label}</span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-500 text-slate-950 uppercase">
                        Hoy
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenCreate(dayObj.key)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title={`Agregar clase el ${dayObj.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Slots List */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {daySlots.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-500 space-y-2">
                      <Clock className="w-6 h-6 stroke-1 text-slate-600" />
                      <span className="text-xs">Sin clases programadas</span>
                      <button
                        type="button"
                        onClick={() => handleOpenCreate(dayObj.key)}
                        className="text-[11px] text-sky-400 hover:underline font-semibold cursor-pointer"
                      >
                        + Añadir bloque
                      </button>
                    </div>
                  ) : (
                    daySlots.map((slot) => {
                      const group = groupMap.get(slot.groupId);
                      const colorStyle = COLOR_CLASSES[slot.color || 'indigo'] || COLOR_CLASSES.indigo;
                      const isOngoingNow = isToday && currentTimeStr >= slot.startTime && currentTimeStr <= slot.endTime;
                      const slotTeacher = teacherMap.get(slot.teacherId);

                      return (
                        <div
                          key={slot.id}
                          className={`rounded-xl border p-3 space-y-2.5 transition-all shadow-md relative group ${
                            colorStyle.bg
                          } ${colorStyle.border} ${colorStyle.hover} ${
                            isOngoingNow ? 'ring-2 ring-emerald-400 shadow-emerald-950/50' : ''
                          }`}
                        >
                          {/* Time & Room */}
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                            <span className="flex items-center space-x-1 text-slate-200">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </span>

                            {slot.classroomOrLab && (
                              <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-slate-300 text-[10px] truncate max-w-[100px]">
                                {slot.classroomOrLab}
                              </span>
                            )}
                          </div>

                          {/* Group Name & Subject */}
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-sm text-white flex items-center justify-between">
                              <span>{group?.name || 'Curso'}</span>
                              {isAdmin && adminSelectedTeacherId === 'all' && (
                                <span className="text-[10px] font-semibold text-slate-300 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[90px]">
                                  {slotTeacher?.name?.split(' ')[1] || slot.teacherName || 'Docente'}
                                </span>
                              )}
                            </div>
                            <div className={`text-xs font-semibold ${colorStyle.text}`}>
                              {slot.subject}
                            </div>
                          </div>

                          {slot.notes && (
                            <div className="text-[11px] text-slate-400 italic line-clamp-1">
                              {slot.notes}
                            </div>
                          )}

                          {/* Interactive Action Shortcuts */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                            <div className="flex items-center space-x-1">
                              {onNavigateToAttendance && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToAttendance(slot.groupId)}
                                  className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-emerald-600 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
                                  title="Tomar Asistencia de este grupo"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onNavigateToGrades && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToGrades(slot.groupId, slot.subject)}
                                  className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
                                  title="Registrar Notas de esta clase"
                                >
                                  <GraduationCap className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onNavigateToDailyLog && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToDailyLog(slot.groupId, slot.subject)}
                                  className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-amber-600 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
                                  title="Abrir Diario de Campo"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onNavigateToSeatingChart && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToSeatingChart(slot.groupId)}
                                  className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-teal-600 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
                                  title="Ver Plano de Puestos"
                                >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(slot)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Editar bloque"
                              >
                                <Edit className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Eliminar bloque"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CLASS SLOT WITH LIVE ANTI-CONFLICT CROSS-CHECK          */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-600/20 text-sky-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    {editingSlotId ? 'Editar Bloque de Clase' : 'Agregar Bloque al Horario'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isTeacher 
                      ? `Asignación para ${loggedTeacher?.name || 'mi horario'}` 
                      : 'Asignación docente con validación cruzada automática'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              {/* Teacher Selector (Admin only; locked for teacher) */}
              {isAdmin ? (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Docente Responsable *</label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 font-semibold"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                        {t.name} — {t.specialty || 'Docente'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Docente:</span>
                  <span className="font-bold text-sky-300">{loggedTeacher?.name || 'Mi Perfil Docente'}</span>
                </div>
              )}

              {/* Day Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Día de la Semana *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setFormDay(d.key)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formDay === d.key
                          ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hora Fin *</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Course & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Curso / Grupo *</label>
                  <select
                    value={formGroupId}
                    onChange={(e) => {
                      const newGid = e.target.value;
                      setFormGroupId(newGid);
                      const grp = groups.find((g) => g.id === newGid);
                      const tch = teachers.find((t) => t.id === formTeacherId) || effectiveTeacher;
                      const subs = getSubjectsForGroupAndTeacher(grp, tch, teachers, settings, isTeacher);
                      if (subs && subs.length > 0) {
                        setFormSubject(subs[0]);
                      }
                    }}
                    required
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
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
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                  >
                    {getSubjectsForGroupAndTeacher(
                      groups.find((g) => g.id === formGroupId),
                      teachers.find((t) => t.id === formTeacherId) || effectiveTeacher,
                      teachers,
                      settings,
                      isTeacher
                    ).map((sub) => (
                      <option key={sub} value={sub} className="bg-slate-900 text-slate-100">
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Classroom / Space & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Aula / Espacio Físico</label>
                  <input
                    type="text"
                    value={formClassroom}
                    onChange={(e) => setFormClassroom(e.target.value)}
                    placeholder="Ej. Aula 201, Laboratorio, Sala TIC..."
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Color de Etiqueta</label>
                  <div className="flex items-center space-x-2 pt-1">
                    {['indigo', 'emerald', 'sky', 'purple', 'amber', 'teal', 'rose'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                          formColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor:
                            c === 'indigo'
                              ? '#6366f1'
                              : c === 'emerald'
                              ? '#10b981'
                              : c === 'sky'
                              ? '#0ea5e9'
                              : c === 'purple'
                              ? '#a855f7'
                              : c === 'amber'
                              ? '#f59e0b'
                              : c === 'teal'
                              ? '#14b8a6'
                              : '#f43f5e',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Notas / Observaciones (Opcional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ej. Práctica de laboratorio, clase teórica, quiz quincenal..."
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* LIVE CROSS-CHECK ANTI-COLLISION BANNER */}
              {modalConflictCheck.hasBlockingConflict && (
                <div className="bg-rose-950/60 border border-rose-500/70 rounded-2xl p-3.5 flex items-start space-x-3 text-rose-200 text-xs shadow-lg animate-bounce">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                      ⚠️ Conflicto de Horario Detectado
                    </div>
                    <div className="leading-relaxed">
                      {modalConflictCheck.message}
                    </div>
                  </div>
                </div>
              )}

              {modalConflictCheck.roomConflict && !modalConflictCheck.hasBlockingConflict && (
                <div className="bg-amber-950/50 border border-amber-500/60 rounded-2xl p-3.5 flex items-start space-x-3 text-amber-200 text-xs shadow-md">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-300">
                      Aviso de Espacio Físico
                    </div>
                    <div className="leading-relaxed text-[11px] mt-0.5">
                      {modalConflictCheck.message}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalConflictCheck.hasBlockingConflict}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                    modalConflictCheck.hasBlockingConflict
                      ? 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-500'
                  }`}
                >
                  {editingSlotId ? 'Guardar Cambios' : 'Agregar al Horario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
