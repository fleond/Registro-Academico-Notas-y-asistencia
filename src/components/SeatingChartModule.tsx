import React, { useState, useMemo, useEffect } from 'react';
import { 
  Group, 
  Student, 
  SchoolSettings, 
  AuthUser, 
  Teacher, 
  GroupSeatingPlan, 
  ClassroomLayout, 
  LaboratoryLayout,
  AttendanceRecord,
  Activity,
  GradeRecord,
  AttendanceStatus,
  UniformStatus,
  WorkGroupSet
} from '../types';
import { sortGroupsAscending } from '../utils/groupUtils';
import { DEFAULT_UNIFORM_TAGS } from '../utils/storage';
import { 
  LayoutGrid, 
  FlaskConical, 
  Shuffle, 
  Settings2, 
  UserPlus, 
  ArrowRightLeft, 
  Trash2, 
  Printer, 
  Users, 
  Info, 
  Check, 
  X, 
  Sparkles, 
  RotateCcw, 
  Monitor, 
  DoorOpen,
  Eye,
  Sliders,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  MinusCircle,
  Award,
  BookOpen,
  Plus,
  Shirt
} from 'lucide-react';

interface SeatingChartModuleProps {
  groups: Group[];
  students: Student[];
  settings: SchoolSettings;
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  seatingPlans: GroupSeatingPlan[];
  onUpdateSeatingPlans: (plans: GroupSeatingPlan[]) => void;
  attendance?: AttendanceRecord[];
  activities?: Activity[];
  grades?: GradeRecord[];
  onUpdateAttendance?: (attendance: AttendanceRecord[]) => void;
  onUpdateGrades?: (grades: GradeRecord[]) => void;
  onUpdateActivities?: (activities: Activity[]) => void;
  workGroupSets?: WorkGroupSet[];
  onUpdateWorkGroupSets?: (sets: WorkGroupSet[]) => void;
}

export const SeatingChartModule: React.FC<SeatingChartModuleProps> = ({
  groups,
  students,
  settings,
  currentUser,
  teachers = [],
  seatingPlans,
  onUpdateSeatingPlans,
  attendance = [],
  activities = [],
  grades = [],
  onUpdateAttendance,
  onUpdateGrades,
  onUpdateActivities,
  workGroupSets = [],
  onUpdateWorkGroupSets,
}) => {
  const isTeacher = currentUser?.role === 'teacher';

  // Teacher identification
  const activeTeacher = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.teacher) return currentUser.teacher;
    if (teachers && teachers.length > 0) {
      return teachers.find(
        (t) => t.id === currentUser.id || t.documentId === currentUser.documentId || t.name === currentUser.name
      ) || null;
    }
    return null;
  }, [currentUser, teachers]);

  // Accessible groups
  const accessibleGroups = useMemo(() => {
    if (!isTeacher || !currentUser) {
      return sortGroupsAscending(groups);
    }
    const assignedIds = new Set(activeTeacher?.assignedGroupIds || []);
    const assignedGrades = new Set(activeTeacher?.assignedGrades || []);

    const filtered = groups.filter((g) => {
      if (assignedIds.has(g.id)) return true;
      if (g.createdByTeacherId && g.createdByTeacherId === currentUser.id) return true;
      if (g.assignedTeacherIds && g.assignedTeacherIds.includes(currentUser.id)) return true;
      if (g.grade && assignedGrades.has(g.grade.trim())) return true;
      return false;
    });
    return filtered.length > 0 ? sortGroupsAscending(filtered) : sortGroupsAscending(groups);
  }, [groups, isTeacher, currentUser, activeTeacher]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(accessibleGroups[0]?.id || groups[0]?.id || '');
  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId), [groups, selectedGroupId]);

  // Active Layout Mode: 'classroom' (Salón Normal) vs 'laboratory' (Laboratorio)
  const [activePlanType, setActivePlanType] = useState<'classroom' | 'laboratory'>('classroom');

  // Selected Date for Attendance & Activity Grading
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filter activities for this group
  const groupActivities = useMemo(() => {
    return activities.filter((a) => a.groupId === selectedGroupId);
  }, [activities, selectedGroupId]);

  // Selected Activity ID
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  useEffect(() => {
    if (groupActivities.length > 0) {
      if (!selectedActivityId || !groupActivities.some((a) => a.id === selectedActivityId)) {
        setSelectedActivityId(groupActivities[0].id);
      }
    } else {
      setSelectedActivityId('');
    }
  }, [groupActivities, selectedGroupId]);

  const selectedActivity = useMemo(() => {
    return groupActivities.find((a) => a.id === selectedActivityId) || null;
  }, [groupActivities, selectedActivityId]);

  // Filter active students for this group
  const groupStudents = useMemo(() => {
    return students
      .filter((s) => s.groupId === selectedGroupId && s.status === 'active')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, selectedGroupId]);

  // Student Map for fast lookup
  const studentMap = useMemo(() => {
    return new Map<string, Student>(groupStudents.map((s) => [s.id, s]));
  }, [groupStudents]);

  // Active Seating Plan for this group
  const activePlan = useMemo(() => {
    const existing = seatingPlans.find((p) => p.groupId === selectedGroupId);
    if (existing) return existing;

    // Default fallback
    return {
      id: `seat-plan-${selectedGroupId}`,
      groupId: selectedGroupId,
      classroom: {
        rows: 5,
        columns: 6,
        seats: [],
      },
      laboratory: {
        tableCount: 6,
        seatsPerTable: 4,
        tableNamePrefix: 'Mesa de Laboratorio',
        seats: [],
      },
    };
  }, [seatingPlans, selectedGroupId]);

  // Modals & States
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isQuickActivityModalOpen, setIsQuickActivityModalOpen] = useState(false);

  const [selectedSeatSlot, setSelectedSeatSlot] = useState<{
    type: 'classroom' | 'laboratory';
    row?: number;
    col?: number;
    tableIndex?: number;
    seatIndex?: number;
    currentStudentId?: string | null;
  } | null>(null);

  // Swap Seat Selection mode
  const [swapSourceSeat, setSwapSourceSeat] = useState<{
    type: 'classroom' | 'laboratory';
    row?: number;
    col?: number;
    tableIndex?: number;
    seatIndex?: number;
    studentId: string;
  } | null>(null);

  // Quick Activity form state
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivitySubject, setNewActivitySubject] = useState(selectedGroup?.subjects[0] || 'General');
  const [newActivityMaxScore, setNewActivityMaxScore] = useState<number>(settings.gradingScaleMax || 5.0);
  const [newActivityWeight, setNewActivityWeight] = useState<number>(20);

  // Uniform Quick Edit Modal State
  const [editingUniformModal, setEditingUniformModal] = useState<{
    studentId: string;
    studentName: string;
    currentStatus: UniformStatus;
    currentNotes: string;
  } | null>(null);

  // Available uniform novelty tags from settings or defaults
  const availableUniformTags = useMemo(() => {
    if (settings.uniformTags && settings.uniformTags.length > 0) {
      return settings.uniformTags.filter((t) => t.isActive).map((t) => t.name);
    }
    return DEFAULT_UNIFORM_TAGS.filter((t) => t.isActive).map((t) => t.name);
  }, [settings.uniformTags]);

  // Temporary config form
  const [configForm, setConfigForm] = useState({
    classroomRows: activePlan.classroom.rows || 5,
    classroomCols: activePlan.classroom.columns || 6,
    labTables: activePlan.laboratory.tableCount || 6,
    labSeatsPerTable: activePlan.laboratory.seatsPerTable || 4,
    labNamePrefix: activePlan.laboratory.tableNamePrefix || 'Mesa de Laboratorio',
  });

  // Sync config form on group / plan change
  useEffect(() => {
    setConfigForm({
      classroomRows: activePlan.classroom.rows || 5,
      classroomCols: activePlan.classroom.columns || 6,
      labTables: activePlan.laboratory.tableCount || 6,
      labSeatsPerTable: activePlan.laboratory.seatsPerTable || 4,
      labNamePrefix: activePlan.laboratory.tableNamePrefix || 'Mesa de Laboratorio',
    });
  }, [activePlan]);

  // Unseated students in Classroom
  const unseatedClassroomStudents = useMemo(() => {
    const seatedIds = new Set<string>();
    activePlan.classroom.seats.forEach((s) => {
      if (s.studentId) seatedIds.add(s.studentId);
    });
    return groupStudents.filter((s) => !seatedIds.has(s.id));
  }, [groupStudents, activePlan.classroom]);

  // Unseated students in Laboratory
  const unseatedLabStudents = useMemo(() => {
    const seatedIds = new Set<string>();
    activePlan.laboratory.seats.forEach((s) => {
      if (s.studentId) seatedIds.add(s.studentId);
    });
    return groupStudents.filter((s) => !seatedIds.has(s.id));
  }, [groupStudents, activePlan.laboratory]);

  // Helper to save plan
  const savePlan = (updatedPlan: GroupSeatingPlan) => {
    const existingIdx = seatingPlans.findIndex((p) => p.groupId === selectedGroupId);
    let newPlans: GroupSeatingPlan[];
    if (existingIdx >= 0) {
      newPlans = [...seatingPlans];
      newPlans[existingIdx] = updatedPlan;
    } else {
      newPlans = [...seatingPlans, updatedPlan];
    }
    onUpdateSeatingPlans(newPlans);
  };

  // ----------------------------------------------------
  // ATTENDANCE HELPERS
  // ----------------------------------------------------
  const getStudentAttendance = (studentId: string) => {
    return attendance.find(
      (a) => a.studentId === studentId && a.groupId === selectedGroupId && a.date === selectedDate
    ) || null;
  };

  const handleToggleAttendance = (studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onUpdateAttendance) return;

    const current = getStudentAttendance(studentId);
    let nextStatus: AttendanceStatus = 'present';

    if (!current || !current.status) {
      nextStatus = 'present';
    } else if (current.status === 'present') {
      nextStatus = 'absent'; // ausente (inasistencia injustificada)
    } else if (current.status === 'absent' || current.status === 'unexcused_absence') {
      nextStatus = 'late'; // retardo
    } else if (current.status === 'late') {
      nextStatus = 'excused'; // justificado
    } else if (current.status === 'excused' || current.status === 'excused_absence') {
      nextStatus = 'evasion';
    } else {
      nextStatus = 'present';
    }

    const existingIdx = attendance.findIndex(
      (a) => a.studentId === studentId && a.groupId === selectedGroupId && a.date === selectedDate
    );

    let updated: AttendanceRecord[];
    if (existingIdx >= 0) {
      updated = [...attendance];
      updated[existingIdx] = {
        ...updated[existingIdx],
        status: nextStatus,
      };
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${studentId}`,
        groupId: selectedGroupId,
        studentId,
        date: selectedDate,
        status: nextStatus,
        uniformStatus: 'complete',
        notifiedWhatsApp: false,
      };
      updated = [...attendance, newRecord];
    }
    onUpdateAttendance(updated);
  };

  const handleMarkAllPresent = () => {
    if (!onUpdateAttendance) return;
    let updated = [...attendance];
    groupStudents.forEach((std) => {
      const idx = updated.findIndex(
        (a) => a.studentId === std.id && a.groupId === selectedGroupId && a.date === selectedDate
      );
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], status: 'present' };
      } else {
        updated.push({
          id: `att-${Date.now()}-${std.id}`,
          groupId: selectedGroupId,
          studentId: std.id,
          date: selectedDate,
          status: 'present',
          uniformStatus: 'complete',
          notifiedWhatsApp: false,
        });
      }
    });
    onUpdateAttendance(updated);
  };

  // ----------------------------------------------------
  // UNIFORM HELPERS
  // ----------------------------------------------------
  const handleToggleUniform = (studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onUpdateAttendance) return;

    const current = getStudentAttendance(studentId);
    let nextStatus: UniformStatus = 'complete';

    if (!current || !current.uniformStatus || current.uniformStatus === 'complete') {
      nextStatus = 'incomplete';
    } else if (current.uniformStatus === 'incomplete') {
      nextStatus = 'none';
    } else {
      nextStatus = 'complete';
    }

    const existingIdx = attendance.findIndex(
      (a) => a.studentId === studentId && a.groupId === selectedGroupId && a.date === selectedDate
    );

    let updated: AttendanceRecord[];
    if (existingIdx >= 0) {
      updated = [...attendance];
      updated[existingIdx] = {
        ...updated[existingIdx],
        uniformStatus: nextStatus,
        uniformNotes: nextStatus === 'complete' ? '' : updated[existingIdx].uniformNotes,
      };
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${studentId}`,
        groupId: selectedGroupId,
        studentId,
        date: selectedDate,
        status: 'present',
        uniformStatus: nextStatus,
        uniformNotes: '',
        notifiedWhatsApp: false,
      };
      updated = [...attendance, newRecord];
    }
    onUpdateAttendance(updated);
  };

  const handleSetUniformDetails = (
    studentId: string,
    status: UniformStatus,
    notes: string = ''
  ) => {
    if (!onUpdateAttendance) return;

    const existingIdx = attendance.findIndex(
      (a) => a.studentId === studentId && a.groupId === selectedGroupId && a.date === selectedDate
    );

    let updated: AttendanceRecord[];
    if (existingIdx >= 0) {
      updated = [...attendance];
      updated[existingIdx] = {
        ...updated[existingIdx],
        uniformStatus: status,
        uniformNotes: status === 'complete' ? '' : notes,
      };
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${studentId}`,
        groupId: selectedGroupId,
        studentId,
        date: selectedDate,
        status: 'present',
        uniformStatus: status,
        uniformNotes: status === 'complete' ? '' : notes,
        notifiedWhatsApp: false,
      };
      updated = [...attendance, newRecord];
    }
    onUpdateAttendance(updated);
    setEditingUniformModal(null);
  };

  const handleMarkAllUniformComplete = () => {
    if (!onUpdateAttendance) return;
    let updated = [...attendance];
    groupStudents.forEach((std) => {
      const idx = updated.findIndex(
        (a) => a.studentId === std.id && a.groupId === selectedGroupId && a.date === selectedDate
      );
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], uniformStatus: 'complete', uniformNotes: '' };
      } else {
        updated.push({
          id: `att-${Date.now()}-${std.id}`,
          groupId: selectedGroupId,
          studentId: std.id,
          date: selectedDate,
          status: 'present',
          uniformStatus: 'complete',
          uniformNotes: '',
          notifiedWhatsApp: false,
        });
      }
    });
    onUpdateAttendance(updated);
  };

  // ----------------------------------------------------
  // GRADE HELPERS
  // ----------------------------------------------------
  const getStudentGrade = (studentId: string) => {
    if (!selectedActivityId) return null;
    return grades.find((g) => g.studentId === studentId && g.activityId === selectedActivityId) || null;
  };

  const handleScoreChange = (studentId: string, val: string) => {
    if (!onUpdateGrades || !selectedActivityId) return;
    const max = selectedActivity?.maxScore || settings.gradingScaleMax || 5.0;
    const numVal = val === '' ? null : Math.max(0, Math.min(max, parseFloat(val)));

    const existingIdx = grades.findIndex(
      (g) => g.studentId === studentId && g.activityId === selectedActivityId
    );

    let updated: GradeRecord[];
    if (existingIdx >= 0) {
      updated = [...grades];
      updated[existingIdx] = {
        ...updated[existingIdx],
        score: numVal,
      };
    } else {
      const newG: GradeRecord = {
        id: `grd-${Date.now()}-${studentId}`,
        activityId: selectedActivityId,
        studentId,
        score: numVal,
        deliveredOnTime: 'yes',
        comments: '',
        notifiedWhatsApp: false,
      };
      updated = [...grades, newG];
    }
    onUpdateGrades(updated);
  };

  // Quick Activity Creator
  const handleCreateQuickActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTitle.trim() || !onUpdateActivities) return;

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      groupId: selectedGroupId,
      subject: newActivitySubject,
      period: 'Periodo 1',
      title: newActivityTitle.trim(),
      description: `Actividad creada desde el plano de aula para la fecha ${selectedDate}`,
      type: 'taller',
      assignedDate: selectedDate,
      dueDate: selectedDate,
      weightPercentage: Number(newActivityWeight) || 20,
      maxScore: Number(newActivityMaxScore) || settings.gradingScaleMax || 5.0,
      passingScore: settings.passingScore || settings.minPassingScore || 3.5,
      createdByTeacherId: currentUser?.id,
    };

    onUpdateActivities([...activities, newAct]);
    setSelectedActivityId(newAct.id);
    setNewActivityTitle('');
    setIsQuickActivityModalOpen(false);
  };

  // Attendance and Uniform stats for selected date
  const dateAttendanceStats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let evasionCount = 0;
    let uniformCompleteCount = 0;
    let uniformIncompleteCount = 0;
    let uniformNoneCount = 0;

    groupStudents.forEach((std) => {
      const rec = getStudentAttendance(std.id);
      if (rec?.status === 'present') presentCount++;
      else if (rec?.status === 'unexcused_absence' || rec?.status === 'absent') absentCount++;
      else if (rec?.status === 'late') lateCount++;
      else if (rec?.status === 'excused_absence' || rec?.status === 'excused') excusedCount++;
      else if (rec?.status === 'evasion') evasionCount++;

      const uStatus = rec?.uniformStatus || 'complete';
      if (uStatus === 'complete') uniformCompleteCount++;
      else if (uStatus === 'incomplete') uniformIncompleteCount++;
      else if (uStatus === 'none') uniformNoneCount++;
    });

    return { 
      presentCount, 
      absentCount, 
      lateCount, 
      excusedCount, 
      evasionCount,
      uniformCompleteCount,
      uniformIncompleteCount,
      uniformNoneCount
    };
  }, [groupStudents, attendance, selectedGroupId, selectedDate]);

  // ----------------------------------------------------
  // RANDOM SEATING GENERATOR
  // ----------------------------------------------------
  const handleRandomizeSeating = (mode: 'alphabetical' | 'random' | 'gender_balanced') => {
    let pool: Student[] = [];

    if (mode === 'alphabetical') {
      pool = [...groupStudents].sort((a, b) => a.lastName.localeCompare(b.lastName));
    } else if (mode === 'gender_balanced') {
      const males = groupStudents.filter((s) => s.gender === 'M').sort(() => Math.random() - 0.5);
      const females = groupStudents.filter((s) => s.gender === 'F').sort(() => Math.random() - 0.5);
      const others = groupStudents.filter((s) => s.gender !== 'M' && s.gender !== 'F').sort(() => Math.random() - 0.5);
      const maxLen = Math.max(males.length, females.length, others.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < males.length) pool.push(males[i]);
        if (i < females.length) pool.push(females[i]);
        if (i < others.length) pool.push(others[i]);
      }
    } else {
      pool = [...groupStudents].sort(() => Math.random() - 0.5);
    }

    if (activePlanType === 'classroom') {
      const newSeats: { row: number; col: number; studentId: string | null }[] = [];
      let studentIdx = 0;

      for (let r = 0; r < activePlan.classroom.rows; r++) {
        for (let c = 0; c < activePlan.classroom.columns; c++) {
          const student = pool[studentIdx];
          newSeats.push({
            row: r,
            col: c,
            studentId: student ? student.id : null,
          });
          studentIdx++;
        }
      }

      savePlan({
        ...activePlan,
        classroom: {
          ...activePlan.classroom,
          seats: newSeats,
        },
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // Laboratory
      const newSeats: { tableIndex: number; seatIndex: number; studentId: string | null }[] = [];
      let studentIdx = 0;

      for (let t = 0; t < activePlan.laboratory.tableCount; t++) {
        for (let s = 0; s < activePlan.laboratory.seatsPerTable; s++) {
          const student = pool[studentIdx];
          newSeats.push({
            tableIndex: t,
            seatIndex: s,
            studentId: student ? student.id : null,
          });
          studentIdx++;
        }
      }

      savePlan({
        ...activePlan,
        laboratory: {
          ...activePlan.laboratory,
          seats: newSeats,
        },
        lastUpdated: new Date().toISOString(),
      });
    }

    setSwapSourceSeat(null);
  };

  // ----------------------------------------------------
  // IMPORT SEATING LAYOUT FROM ABP WORK GROUPS
  // ----------------------------------------------------
  const groupWorkGroupSets = useMemo(() => {
    return workGroupSets?.filter((s) => s.groupId === selectedGroupId) || [];
  }, [workGroupSets, selectedGroupId]);

  const handleImportFromWorkGroupSet = (setId: string) => {
    const targetSet = workGroupSets?.find((s) => s.id === setId);
    if (!targetSet || targetSet.teams.length === 0) {
      alert('El proyecto seleccionado no contiene equipos para importar.');
      return;
    }

    const teamCount = targetSet.teams.length;
    const maxMembers = Math.max(...targetSet.teams.map((t) => t.members.length), 4);
    const newSeats: { tableIndex: number; seatIndex: number; studentId: string | null }[] = [];

    targetSet.teams.forEach((team, tIdx) => {
      team.members.forEach((m, mIdx) => {
        newSeats.push({
          tableIndex: tIdx,
          seatIndex: mIdx,
          studentId: m.studentId,
        });
      });
    });

    savePlan({
      ...activePlan,
      activeType: 'laboratory',
      laboratory: {
        ...activePlan.laboratory,
        tableCount: Math.max(activePlan.laboratory.tableCount || 6, teamCount),
        seatsPerTable: Math.max(activePlan.laboratory.seatsPerTable || 4, maxMembers),
        seats: newSeats,
      },
      lastUpdated: new Date().toISOString(),
    });
    alert(`¡Listo! Se organizaron las mesas del laboratorio según los ${teamCount} equipos del proyecto ABP "${targetSet.title}".`);
  };

  // ----------------------------------------------------
  // EXPORT LABORATORY SEATING TO ABP WORK GROUPS
  // ----------------------------------------------------
  const handleExportToWorkGroups = () => {
    if (!onUpdateWorkGroupSets) return;
    const tableCount = activePlan.laboratory.tableCount || 6;
    const prefix = activePlan.laboratory.tableNamePrefix || 'Mesa';

    const tableMap: { tableIndex: number; tableName: string; studentIds: string[] }[] = [];
    for (let t = 0; t < tableCount; t++) {
      const tableSeats = activePlan.laboratory.seats.filter((s) => s.tableIndex === t && s.studentId);
      const studentIds = tableSeats.map((s) => s.studentId!).filter(Boolean);
      if (studentIds.length > 0) {
        tableMap.push({
          tableIndex: t,
          tableName: `${prefix} ${t + 1}`,
          studentIds,
        });
      }
    }

    if (tableMap.length === 0) {
      alert('No hay estudiantes asignados en las mesas del laboratorio para crear equipos ABP.');
      return;
    }

    const defaultRoles = [
      { id: 'leader', name: 'Líder / Coordinador' },
      { id: 'reporter', name: 'Relator / Comunicador' },
      { id: 'timekeeper', name: 'Control de Tiempo / Materiales' },
      { id: 'analyst', name: 'Investigador / Crítico' }
    ];

    const teamColors = ['indigo', 'emerald', 'amber', 'purple', 'sky', 'rose', 'teal', 'orange'];

    const newTeams = tableMap.map((table, idx) => ({
      id: `team-lab-${Date.now()}-${table.tableIndex + 1}`,
      name: table.tableName,
      color: teamColors[idx % teamColors.length],
      projectTitle: '',
      members: table.studentIds.map((stId, mIdx) => ({
        studentId: stId,
        roleId: defaultRoles[mIdx % defaultRoles.length]?.id,
      })),
    }));

    const newSet: WorkGroupSet = {
      id: `wg-set-${Date.now()}`,
      groupId: selectedGroupId,
      subject: selectedGroup?.subjects[0] || 'General',
      period: 'Periodo 1',
      title: `Equipos ABP - Mesas de Laboratorio (${new Date().toLocaleDateString('es-CO')})`,
      description: `Equipos conformados automáticamente a partir de ${newTeams.length} mesas del Plano de Laboratorio.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teams: newTeams,
    };

    onUpdateWorkGroupSets([...(workGroupSets || []), newSet]);
    alert(`¡Éxito! Se ha creado un nuevo proyecto en el módulo "Equipos ABP" con ${newTeams.length} equipos organizados exactamente según los puestos de las mesas de laboratorio.`);
  };

  // ----------------------------------------------------
  // CLEAR SEATS
  // ----------------------------------------------------
  const handleClearSeating = () => {
    if (!window.confirm('¿Deseas desocupar todos los puestos del plano actual?')) return;

    if (activePlanType === 'classroom') {
      savePlan({
        ...activePlan,
        classroom: {
          ...activePlan.classroom,
          seats: [],
        },
        lastUpdated: new Date().toISOString(),
      });
    } else {
      savePlan({
        ...activePlan,
        laboratory: {
          ...activePlan.laboratory,
          seats: [],
        },
        lastUpdated: new Date().toISOString(),
      });
    }
    setSwapSourceSeat(null);
  };

  // ----------------------------------------------------
  // SAVE LAYOUT CONFIGURATION (DIMENSIONS)
  // ----------------------------------------------------
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const rows = Math.max(1, Math.min(15, Number(configForm.classroomRows)));
    const cols = Math.max(1, Math.min(15, Number(configForm.classroomCols)));
    const tables = Math.max(1, Math.min(20, Number(configForm.labTables)));
    const seatsPerTable = Math.max(1, Math.min(12, Number(configForm.labSeatsPerTable)));

    savePlan({
      ...activePlan,
      classroom: {
        ...activePlan.classroom,
        rows,
        columns: cols,
      },
      laboratory: {
        ...activePlan.laboratory,
        tableCount: tables,
        seatsPerTable,
        tableNamePrefix: configForm.labNamePrefix.trim() || 'Mesa',
      },
      lastUpdated: new Date().toISOString(),
    });

    setIsConfigModalOpen(false);
  };

  // ----------------------------------------------------
  // CLICK SEAT HANDLER
  // ----------------------------------------------------
  const handleClickClassroomSeat = (row: number, col: number, currentStudentId?: string | null) => {
    if (swapSourceSeat && swapSourceSeat.type === 'classroom') {
      if (swapSourceSeat.row === row && swapSourceSeat.col === col) {
        setSwapSourceSeat(null);
        return;
      }

      const updatedSeats = [...activePlan.classroom.seats];
      const sourceIdx = updatedSeats.findIndex(
        (s) => s.row === swapSourceSeat.row && s.col === swapSourceSeat.col
      );
      const targetIdx = updatedSeats.findIndex((s) => s.row === row && s.col === col);
      const targetStudentId = targetIdx >= 0 ? updatedSeats[targetIdx].studentId : null;

      if (sourceIdx >= 0) {
        updatedSeats[sourceIdx] = { ...updatedSeats[sourceIdx], studentId: targetStudentId };
      } else if (targetStudentId) {
        updatedSeats.push({ row: swapSourceSeat.row!, col: swapSourceSeat.col!, studentId: targetStudentId });
      }

      if (targetIdx >= 0) {
        updatedSeats[targetIdx] = { ...updatedSeats[targetIdx], studentId: swapSourceSeat.studentId };
      } else {
        updatedSeats.push({ row, col, studentId: swapSourceSeat.studentId });
      }

      savePlan({
        ...activePlan,
        classroom: {
          ...activePlan.classroom,
          seats: updatedSeats,
        },
        lastUpdated: new Date().toISOString(),
      });

      setSwapSourceSeat(null);
      return;
    }

    setSelectedSeatSlot({
      type: 'classroom',
      row,
      col,
      currentStudentId,
    });
    setIsAssignModalOpen(true);
  };

  const handleClickLabSeat = (
    tableIndex: number,
    seatIndex: number,
    currentStudentId?: string | null
  ) => {
    if (swapSourceSeat && swapSourceSeat.type === 'laboratory') {
      if (swapSourceSeat.tableIndex === tableIndex && swapSourceSeat.seatIndex === seatIndex) {
        setSwapSourceSeat(null);
        return;
      }

      const updatedSeats = [...activePlan.laboratory.seats];
      const sourceIdx = updatedSeats.findIndex(
        (s) => s.tableIndex === swapSourceSeat.tableIndex && s.seatIndex === swapSourceSeat.seatIndex
      );
      const targetIdx = updatedSeats.findIndex(
        (s) => s.tableIndex === tableIndex && s.seatIndex === seatIndex
      );
      const targetStudentId = targetIdx >= 0 ? updatedSeats[targetIdx].studentId : null;

      if (sourceIdx >= 0) {
        updatedSeats[sourceIdx] = { ...updatedSeats[sourceIdx], studentId: targetStudentId };
      } else if (targetStudentId) {
        updatedSeats.push({
          tableIndex: swapSourceSeat.tableIndex!,
          seatIndex: swapSourceSeat.seatIndex!,
          studentId: targetStudentId,
        });
      }

      if (targetIdx >= 0) {
        updatedSeats[targetIdx] = { ...updatedSeats[targetIdx], studentId: swapSourceSeat.studentId };
      } else {
        updatedSeats.push({ tableIndex, seatIndex, studentId: swapSourceSeat.studentId });
      }

      savePlan({
        ...activePlan,
        laboratory: {
          ...activePlan.laboratory,
          seats: updatedSeats,
        },
        lastUpdated: new Date().toISOString(),
      });

      setSwapSourceSeat(null);
      return;
    }

    setSelectedSeatSlot({
      type: 'laboratory',
      tableIndex,
      seatIndex,
      currentStudentId,
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignStudent = (studentId: string | null) => {
    if (!selectedSeatSlot) return;

    if (selectedSeatSlot.type === 'classroom') {
      const updatedSeats = activePlan.classroom.seats.filter(
        (s) => !(s.row === selectedSeatSlot.row && s.col === selectedSeatSlot.col)
      );

      if (studentId) {
        // Remove student from any other seat in this layout first
        const cleaned = updatedSeats.map((s) => (s.studentId === studentId ? { ...s, studentId: null } : s));
        cleaned.push({
          row: selectedSeatSlot.row!,
          col: selectedSeatSlot.col!,
          studentId,
        });
        savePlan({
          ...activePlan,
          classroom: {
            ...activePlan.classroom,
            seats: cleaned,
          },
          lastUpdated: new Date().toISOString(),
        });
      } else {
        savePlan({
          ...activePlan,
          classroom: {
            ...activePlan.classroom,
            seats: updatedSeats,
          },
          lastUpdated: new Date().toISOString(),
        });
      }
    } else {
      // Laboratory
      const updatedSeats = activePlan.laboratory.seats.filter(
        (s) => !(s.tableIndex === selectedSeatSlot.tableIndex && s.seatIndex === selectedSeatSlot.seatIndex)
      );

      if (studentId) {
        const cleaned = updatedSeats.map((s) => (s.studentId === studentId ? { ...s, studentId: null } : s));
        cleaned.push({
          tableIndex: selectedSeatSlot.tableIndex!,
          seatIndex: selectedSeatSlot.seatIndex!,
          studentId,
        });
        savePlan({
          ...activePlan,
          laboratory: {
            ...activePlan.laboratory,
            seats: cleaned,
          },
          lastUpdated: new Date().toISOString(),
        });
      } else {
        savePlan({
          ...activePlan,
          laboratory: {
            ...activePlan.laboratory,
            seats: updatedSeats,
          },
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    setIsAssignModalOpen(false);
    setSelectedSeatSlot(null);
  };

  // ----------------------------------------------------
  // ATTENDANCE BADGE RENDERER
  // ----------------------------------------------------
  const renderAttendanceBadge = (studentId: string) => {
    const att = getStudentAttendance(studentId);
    const status = att?.status;

    if (status === 'present') {
      return (
        <button
          type="button"
          onClick={(e) => handleToggleAttendance(studentId, e)}
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30 transition-colors shadow-sm"
          title="Presente — Clic para cambiar estado"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Presente</span>
        </button>
      );
    }

    if (status === 'unexcused_absence' || status === 'absent') {
      return (
        <button
          type="button"
          onClick={(e) => handleToggleAttendance(studentId, e)}
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold hover:bg-rose-500/30 transition-colors shadow-sm"
          title="Inasistencia (Ausente) — Clic para cambiar estado"
        >
          <XCircle className="w-3 h-3 text-rose-400" />
          <span>Ausente</span>
        </button>
      );
    }

    if (status === 'late') {
      return (
        <button
          type="button"
          onClick={(e) => handleToggleAttendance(studentId, e)}
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold hover:bg-amber-500/30 transition-colors shadow-sm"
          title="Retardo — Clic para cambiar estado"
        >
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Retardo</span>
        </button>
      );
    }

    if (status === 'excused_absence' || status === 'excused') {
      return (
        <button
          type="button"
          onClick={(e) => handleToggleAttendance(studentId, e)}
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold hover:bg-sky-500/30 transition-colors shadow-sm"
          title="Justificado — Clic para cambiar estado"
        >
          <FileCheck className="w-3 h-3 text-sky-400" />
          <span>Justif.</span>
        </button>
      );
    }

    if (status === 'evasion') {
      return (
        <button
          type="button"
          onClick={(e) => handleToggleAttendance(studentId, e)}
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold hover:bg-orange-500/30 transition-colors shadow-sm"
          title="Evasión — Clic para cambiar estado"
        >
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          <span>Evasión</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => handleToggleAttendance(studentId, e)}
        className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium hover:text-slate-200 transition-colors"
        title="Sin asistencia — Clic para marcar Presente"
      >
        <MinusCircle className="w-3 h-3" />
        <span>Sin reg.</span>
      </button>
    );
  };

  // ----------------------------------------------------
  // UNIFORM BADGE RENDERER
  // ----------------------------------------------------
  const renderUniformBadge = (studentId: string) => {
    const att = getStudentAttendance(studentId);
    const uStatus: UniformStatus = att?.uniformStatus || 'complete';
    const uNotes = att?.uniformNotes;
    const student = studentMap.get(studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'Estudiante';

    if (uStatus === 'complete') {
      return (
        <button
          type="button"
          onClick={(e) => handleToggleUniform(studentId, e)}
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-500/25 transition-all shadow-sm cursor-pointer"
          title="Uniforme Completo — Clic para alternar estado"
        >
          <Shirt className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Uniforme OK</span>
        </button>
      );
    }

    if (uStatus === 'incomplete') {
      return (
        <div className="inline-flex items-center space-x-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => handleToggleUniform(studentId, e)}
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-l-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold hover:bg-amber-500/30 transition-all shadow-sm cursor-pointer"
            title={`Uniforme Incompleto ${uNotes ? `(${uNotes})` : ''} — Clic para alternar`}
          >
            <Shirt className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate max-w-[65px]">{uNotes || 'Incompleto'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingUniformModal({
                studentId,
                studentName,
                currentStatus: 'incomplete',
                currentNotes: uNotes || '',
              });
            }}
            className="px-1 py-0.5 rounded-r-md bg-amber-900/50 border border-l-0 border-amber-500/40 text-amber-300 hover:bg-amber-800 text-[10px] cursor-pointer"
            title="Detalle o etiqueta de falta de uniforme"
          >
            <Sliders className="w-2.5 h-2.5" />
          </button>
        </div>
      );
    }

    // Sin uniforme (none)
    return (
      <div className="inline-flex items-center space-x-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => handleToggleUniform(studentId, e)}
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-l-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold hover:bg-rose-500/30 transition-all shadow-sm cursor-pointer"
          title={`Sin Uniforme ${uNotes ? `(${uNotes})` : ''} — Clic para alternar`}
        >
          <Shirt className="w-3 h-3 text-rose-400 shrink-0" />
          <span>Sin Uniforme</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditingUniformModal({
              studentId,
              studentName,
              currentStatus: 'none',
              currentNotes: uNotes || '',
            });
          }}
          className="px-1 py-0.5 rounded-r-md bg-rose-900/50 border border-l-0 border-rose-500/40 text-rose-300 hover:bg-rose-800 text-[10px] cursor-pointer"
          title="Editar detalle de uniforme"
        >
          <Sliders className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  };

  // ----------------------------------------------------
  // GRADE INPUT RENDERER
  // ----------------------------------------------------
  const renderGradeInput = (studentId: string) => {
    if (!selectedActivity) return null;
    const grade = getStudentGrade(studentId);
    const score = grade?.score;
    const max = selectedActivity.maxScore || settings.gradingScaleMax || 5.0;
    const passing = selectedActivity.passingScore || settings.passingScore || settings.minPassingScore || 3.5;

    return (
      <div
        className="flex items-center justify-between gap-1 mt-1.5 pt-1.5 border-t border-slate-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-slate-400 font-bold">Nota:</span>
        <div className="flex items-center space-x-1">
          <input
            type="number"
            step="0.1"
            min="0"
            max={max}
            value={score !== null && score !== undefined ? score : ''}
            onChange={(e) => handleScoreChange(studentId, e.target.value)}
            placeholder="—"
            className={`w-12 text-center text-xs font-mono font-black rounded-lg bg-slate-950 border px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-400 ${
              score !== null && score !== undefined
                ? score >= passing
                  ? 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20'
                  : 'text-rose-400 border-rose-500/50 bg-rose-950/20'
                : 'text-slate-400 border-slate-700'
            }`}
          />
          <span className="text-[10px] text-slate-500 font-mono">/{max}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                Plano de Asignación de Puestos & Asistencia en Vivo
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Controla visualmente el orden del salón o laboratorio. Consulta o modifica la asistencia (presente/ausente) y califica la actividad adelantada directamente sobre cada puesto de estudiante.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-slate-400" />
              <span>Configurar Dimensiones</span>
            </button>

            {/* Random seating generation menu */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => handleRandomizeSeating('alphabetical')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Organizar por orden alfabético de apellidos"
              >
                A-Z
              </button>
              <button
                type="button"
                onClick={() => handleRandomizeSeating('gender_balanced')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Organizar intercalando niños y niñas"
              >
                Intercalado M/F
              </button>
              <button
                type="button"
                onClick={() => handleRandomizeSeating('random')}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold text-teal-300 hover:text-teal-200 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Ubicación 100% aleatoria"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Aleatorio</span>
              </button>
            </div>

            {/* Quick sync with ABP work groups in Lab layout */}
            {activePlanType === 'laboratory' && (
              <>
                {/* Export Lab tables -> ABP Teams */}
                <button
                  type="button"
                  onClick={handleExportToWorkGroups}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/60 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Crear un nuevo conjunto de Equipos ABP a partir de estas mesas de laboratorio"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Enviar a Equipos ABP</span>
                </button>

                {/* Import ABP Teams -> Lab tables */}
                {groupWorkGroupSets.length > 0 && (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        if (groupWorkGroupSets.length === 1) {
                          handleImportFromWorkGroupSet(groupWorkGroupSets[0].id);
                        }
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-teal-200 bg-teal-950/60 hover:bg-teal-900/80 border border-teal-700/60 rounded-xl transition-all cursor-pointer shadow-sm"
                      title="Importar la distribución de mesas desde los Equipos ABP"
                    >
                      <Users className="w-3.5 h-3.5 text-teal-400" />
                      <span>Usar Equipos ABP</span>
                    </button>
                    {groupWorkGroupSets.length > 1 && (
                      <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-30 w-56 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl space-y-0.5">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Selecciona Proyecto ABP:
                        </div>
                        {groupWorkGroupSets.map((set) => (
                          <button
                            key={set.id}
                            type="button"
                            onClick={() => handleImportFromWorkGroupSet(set.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-teal-950 hover:text-teal-300 transition-colors flex items-center justify-between"
                          >
                            <span className="truncate">{set.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                              {set.teams.length} eq
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Imprimir Plano</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Group, Date, Layout Toggle, Activity Selector, Quick Attendance */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
          {/* 1. Group Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Curso / Grupo</label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSwapSourceSeat(null);
              }}
              className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
            >
              {accessibleGroups.map((g) => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                  {g.name} ({g.grade} - {g.shift})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Date Selector (For Attendance & Activity) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">Fecha de Asistencia</label>
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-[10px] text-teal-400 hover:underline"
              >
                Hoy
              </button>
            </div>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* 3. Activity Selector for Grading */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">Actividad a Calificar</label>
              <button
                type="button"
                onClick={() => setIsQuickActivityModalOpen(true)}
                className="text-[10px] text-sky-400 hover:underline font-semibold flex items-center space-x-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Nueva</span>
              </button>
            </div>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            >
              <option value="">-- Sin calificar actividad --</option>
              {groupActivities.map((act) => (
                <option key={act.id} value={act.id} className="bg-slate-900 text-slate-100">
                  {act.title} ({act.subject} - Max {act.maxScore || 5})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 p-2 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Marcar a todos los estudiantes como presentes en la fecha seleccionada"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Todos Presentes</span>
            </button>
            <button
              type="button"
              onClick={handleMarkAllUniformComplete}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 p-2 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/50 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Marcar porte de uniforme completo a todos los estudiantes"
            >
              <Shirt className="w-4 h-4 text-indigo-400" />
              <span>Uniforme OK</span>
            </button>
          </div>
        </div>

        {/* View Mode Toggle & Attendance Live Counter Summary */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Layout Selector: Classroom vs Lab */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setActivePlanType('classroom');
                setSwapSourceSeat(null);
              }}
              className={`flex-1 md:flex-none inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePlanType === 'classroom'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Salón ({activePlan.classroom.rows}x{activePlan.classroom.columns})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePlanType('laboratory');
                setSwapSourceSeat(null);
              }}
              className={`flex-1 md:flex-none inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePlanType === 'laboratory'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              <span>Laboratorio ({activePlan.laboratory.tableCount} mesas)</span>
            </button>
          </div>

          {/* Quick Stats on Selected Date */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-bold">
              Presentes: {dateAttendanceStats.presentCount}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-950/60 border border-rose-700/60 text-rose-300 font-bold">
              Ausentes: {dateAttendanceStats.absentCount}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-300 font-bold">
              Retardos: {dateAttendanceStats.lateCount}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-sky-950/60 border border-sky-700/60 text-sky-300 font-bold">
              Justif: {dateAttendanceStats.excusedCount}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-700/60 text-indigo-300 font-bold flex items-center space-x-1">
              <Shirt className="w-3 h-3 text-indigo-400" />
              <span>Uniforme OK: {dateAttendanceStats.uniformCompleteCount}</span>
            </span>
            {dateAttendanceStats.uniformIncompleteCount > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-950/70 border border-amber-500/70 text-amber-300 font-bold">
                Incompletos: {dateAttendanceStats.uniformIncompleteCount}
              </span>
            )}
            {dateAttendanceStats.uniformNoneCount > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-950/70 border border-rose-500/70 text-rose-300 font-bold">
                Sin Uniforme: {dateAttendanceStats.uniformNoneCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Active Swap Mode Notice */}
      {swapSourceSeat && (
        <div className="bg-indigo-950/70 border border-indigo-500 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse shadow-lg">
          <div className="flex items-center space-x-3 text-xs text-indigo-200">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold">Modo Intercambio Activo: </span>
              Haz clic en cualquier otro puesto para intercambiar de lugar a{' '}
              <strong className="text-white">
                {studentMap.get(swapSourceSeat.studentId)?.firstName} {studentMap.get(swapSourceSeat.studentId)?.lastName}
              </strong>
              .
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSwapSourceSeat(null)}
            className="px-3 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Unseated Students Bar */}
      {((activePlanType === 'classroom' && unseatedClassroomStudents.length > 0) ||
        (activePlanType === 'laboratory' && unseatedLabStudents.length > 0)) && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>
                Estudiantes sin ubicar en este plano (
                {activePlanType === 'classroom'
                  ? unseatedClassroomStudents.length
                  : unseatedLabStudents.length}
                ):
              </span>
            </div>
            <span className="text-[11px] text-amber-400/80 font-normal">
              Haz clic en cualquier puesto vacío del plano para sentarlos
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(activePlanType === 'classroom'
              ? unseatedClassroomStudents
              : unseatedLabStudents
            ).map((std) => (
              <span
                key={std.id}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-700/50 text-slate-200 text-xs font-medium shadow-sm"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: std.avatarColor || '#6366f1' }}
                />
                <span>{std.firstName} {std.lastName}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CLASSROOM FLOOR PLAN VIEW (SALÓN NORMAL: FILAS x COLUMNAS)             */}
      {/* ========================================================================= */}
      {activePlanType === 'classroom' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl backdrop-blur-md">
          {/* Front of Classroom: Blackboard & Teacher Desk */}
          <div className="relative border-b-2 border-dashed border-slate-700 pb-6 text-center space-y-3">
            <div className="max-w-md mx-auto py-2.5 px-6 rounded-2xl bg-teal-950/60 border border-teal-600/50 shadow-inner flex items-center justify-center space-x-2 text-xs font-bold text-teal-300 uppercase tracking-widest">
              <Monitor className="w-4 h-4 text-teal-400" />
              <span>Pizarrón / Tablero Principal</span>
            </div>

            <div className="flex items-center justify-between max-w-2xl mx-auto px-4 text-[11px] text-slate-500 font-semibold">
              <div className="flex items-center space-x-1">
                <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Puerta de Entrada</span>
              </div>
              <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                Escritorio del Docente
              </div>
              <div className="flex items-center space-x-1">
                <span>Ventanas</span>
              </div>
            </div>
          </div>

          {/* Seating Grid (Rows x Columns) */}
          <div className="overflow-x-auto pb-4">
            <div
              className="grid gap-3 min-w-[700px] mx-auto"
              style={{
                gridTemplateColumns: `repeat(${activePlan.classroom.columns}, minmax(140px, 1fr))`,
              }}
            >
              {Array.from({ length: activePlan.classroom.rows }).map((_, rIdx) =>
                Array.from({ length: activePlan.classroom.columns }).map((_, cIdx) => {
                  const seatObj = activePlan.classroom.seats.find(
                    (s) => s.row === rIdx && s.col === cIdx
                  );
                  const student = seatObj?.studentId ? studentMap.get(seatObj.studentId) : null;
                  const isSelectedForSwap =
                    swapSourceSeat?.type === 'classroom' &&
                    swapSourceSeat.row === rIdx &&
                    swapSourceSeat.col === cIdx;

                  return (
                    <div
                      key={`seat-${rIdx}-${cIdx}`}
                      onClick={() => handleClickClassroomSeat(rIdx, cIdx, seatObj?.studentId)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[110px] relative group ${
                        isSelectedForSwap
                          ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400 shadow-lg'
                          : student
                          ? 'bg-slate-900/90 border-slate-700/80 hover:border-teal-500/80 shadow-md'
                          : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Seat Header: Position Tag + Attendance Badge */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>F{rIdx + 1}-C{cIdx + 1}</span>
                        {student && renderAttendanceBadge(student.id)}
                      </div>

                      {/* Student Info */}
                      {student ? (
                        <div className="space-y-1 my-auto">
                          <div className="flex items-center space-x-1.5">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: student.avatarColor || '#10b981' }}
                            />
                            <h4 className="text-xs font-bold text-slate-100 truncate leading-snug">
                              {student.firstName}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate pl-3.5">
                            {student.lastName}
                          </p>

                          {/* Uniform Status Badge & Toggle */}
                          <div
                            className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[9px] text-slate-400 font-semibold flex items-center space-x-0.5">
                              <Shirt className="w-2.5 h-2.5 text-slate-400" />
                              <span>Uniforme:</span>
                            </span>
                            {renderUniformBadge(student.id)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center my-auto text-slate-600 space-y-1">
                          <UserPlus className="w-4 h-4 mx-auto text-slate-600 group-hover:text-slate-400" />
                          <span className="text-[10px] block font-medium">Disponible</span>
                        </div>
                      )}

                      {/* Grade Input for Activity conducted on this date */}
                      {student && renderGradeInput(student.id)}

                      {/* Quick Hover Swap Control */}
                      {student && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end space-x-1 pt-1 border-t border-slate-800/80 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSwapSourceSeat({
                                type: 'classroom',
                                row: rIdx,
                                col: cIdx,
                                studentId: student.id,
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded text-[10px]"
                            title="Intercambiar puesto con otro estudiante"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Total Puestos Disponibles:{' '}
              <strong className="text-slate-200">
                {activePlan.classroom.rows * activePlan.classroom.columns}
              </strong>{' '}
              • Ocupados:{' '}
              <strong className="text-teal-400">
                {groupStudents.length - unseatedClassroomStudents.length}
              </strong>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClearSeating}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
              >
                Desocupar Puestos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LABORATORY FLOOR PLAN VIEW (LABORATORIO: MESAS DE TRABAJO)             */}
      {/* ========================================================================= */}
      {activePlanType === 'laboratory' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl backdrop-blur-md">
          {/* Front of Lab: Teacher Demonstration Table */}
          <div className="relative border-b-2 border-dashed border-slate-700 pb-6 text-center space-y-3">
            <div className="max-w-md mx-auto py-2.5 px-6 rounded-2xl bg-teal-950/60 border border-teal-600/50 shadow-inner flex items-center justify-center space-x-2 text-xs font-bold text-teal-300 uppercase tracking-widest">
              <FlaskConical className="w-4 h-4 text-teal-400" />
              <span>Mesa de Demostración & Reactivos (Docente)</span>
            </div>
          </div>

          {/* Laboratory Tables Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: activePlan.laboratory.tableCount }).map((_, tIdx) => {
              const tablePrefix = activePlan.laboratory.tableNamePrefix || 'Mesa';

              return (
                <div
                  key={`lab-table-${tIdx}`}
                  className="rounded-2xl border border-teal-800/40 bg-slate-900/80 p-4 space-y-4 shadow-xl backdrop-blur-md"
                >
                  {/* Table Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-100">
                        {tablePrefix} #{tIdx + 1}
                      </h4>
                    </div>
                    <span className="text-[10px] text-teal-300 font-mono px-2 py-0.5 rounded-md bg-teal-950/60 border border-teal-800/60">
                      {activePlan.laboratory.seatsPerTable} puestos
                    </span>
                  </div>

                  {/* Seats on this Table */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {Array.from({ length: activePlan.laboratory.seatsPerTable }).map((_, sIdx) => {
                      const seatObj = activePlan.laboratory.seats.find(
                        (s) => s.tableIndex === tIdx && s.seatIndex === sIdx
                      );
                      const student = seatObj?.studentId ? studentMap.get(seatObj.studentId) : null;
                      const isSelectedForSwap =
                        swapSourceSeat?.type === 'laboratory' &&
                        swapSourceSeat.tableIndex === tIdx &&
                        swapSourceSeat.seatIndex === sIdx;

                      return (
                        <div
                          key={`table-${tIdx}-seat-${sIdx}`}
                          onClick={() => handleClickLabSeat(tIdx, sIdx, seatObj?.studentId)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[95px] ${
                            isSelectedForSwap
                              ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400 shadow-md'
                              : student
                              ? 'bg-slate-900 border-slate-700/80 hover:border-teal-400'
                              : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                            <span>P{sIdx + 1}</span>
                            {student && renderAttendanceBadge(student.id)}
                          </div>

                          {student ? (
                            <div className="space-y-1 my-auto">
                              <h5 className="text-[11px] font-bold text-slate-100 truncate">
                                {student.firstName} {student.lastName}
                              </h5>

                              {/* Uniform Status Badge & Toggle */}
                              <div
                                className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[8px] text-slate-400 font-semibold flex items-center space-x-0.5">
                                  <Shirt className="w-2.5 h-2.5 text-slate-400" />
                                  <span>Uniforme:</span>
                                </span>
                                {renderUniformBadge(student.id)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center my-auto text-slate-600 space-y-0.5">
                              <UserPlus className="w-3.5 h-3.5 mx-auto text-slate-600" />
                              <span className="text-[9px] block">Libre</span>
                            </div>
                          )}

                          {/* Grade input for this lab student */}
                          {student && renderGradeInput(student.id)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Total Puestos en Laboratorio:{' '}
              <strong className="text-slate-200">
                {activePlan.laboratory.tableCount * activePlan.laboratory.seatsPerTable}
              </strong>{' '}
              • Ocupados:{' '}
              <strong className="text-teal-400">
                {groupStudents.length - unseatedLabStudents.length}
              </strong>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClearSeating}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
              >
                Desocupar Mesas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURATION (DIMENSIONS)                                         */}
      {/* ========================================================================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Configurar Dimensiones del Plano
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Classroom config */}
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <LayoutGrid className="w-4 h-4" />
                  <span>Salón Tradicional (Filas x Columnas)</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Filas (Profundidad):</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={configForm.classroomRows}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, classroomRows: Number(e.target.value) }))
                      }
                      className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Columnas (Ancho):</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={configForm.classroomCols}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, classroomCols: Number(e.target.value) }))
                      }
                      className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Capacidad Total:{' '}
                  <strong className="text-slate-200">
                    {configForm.classroomRows * configForm.classroomCols} puestos
                  </strong>
                </span>
              </div>

              {/* Laboratory config */}
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <FlaskConical className="w-4 h-4" />
                  <span>Laboratorio / Mesas de Trabajo</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Cantidad de Mesas:</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={configForm.labTables}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, labTables: Number(e.target.value) }))
                      }
                      className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Puestos por Mesa:</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={configForm.labSeatsPerTable}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, labSeatsPerTable: Number(e.target.value) }))
                      }
                      className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nombre de las Mesas:</label>
                  <input
                    type="text"
                    value={configForm.labNamePrefix}
                    onChange={(e) =>
                      setConfigForm((prev) => ({ ...prev, labNamePrefix: e.target.value }))
                    }
                    placeholder="Ej. Mesa de Laboratorio, Estación, Módulo..."
                    className="w-full text-xs p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Capacidad Total:{' '}
                  <strong className="text-slate-200">
                    {configForm.labTables * configForm.labSeatsPerTable} puestos
                  </strong>
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-md cursor-pointer"
                >
                  Guardar Dimensiones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN / CHANGE / VACATE SEAT                                      */}
      {/* ========================================================================= */}
      {isAssignModalOpen && selectedSeatSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {selectedSeatSlot.type === 'classroom'
                    ? `Puesto: Fila ${selectedSeatSlot.row! + 1}, Columna ${selectedSeatSlot.col! + 1}`
                    : `Mesa ${selectedSeatSlot.tableIndex! + 1} - Puesto ${selectedSeatSlot.seatIndex! + 1}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedSeatSlot.currentStudentId && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Estudiante actual en este puesto:</span>
                  <span className="font-bold text-slate-200">
                    {studentMap.get(selectedSeatSlot.currentStudentId)?.firstName}{' '}
                    {studentMap.get(selectedSeatSlot.currentStudentId)?.lastName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAssignStudent(null)}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold cursor-pointer"
                >
                  Desocupar
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Selecciona el estudiante para ubicar en este puesto:
              </label>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {groupStudents.map((std) => {
                  const isCurrent = std.id === selectedSeatSlot.currentStudentId;

                  return (
                    <button
                      key={std.id}
                      type="button"
                      onClick={() => handleAssignStudent(std.id)}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-teal-600/30 border-teal-500 text-teal-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: std.avatarColor || '#6366f1' }}
                        />
                        <span>{std.lastName} {std.firstName}</span>
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] font-bold text-teal-400">
                          Asignado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QUICK ACTIVITY CREATOR                                             */}
      {/* ========================================================================= */}
      {isQuickActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Crear Actividad Rápida para Calificar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickActivityModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickActivity} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Título de la Actividad *
                </label>
                <input
                  type="text"
                  required
                  value={newActivityTitle}
                  onChange={(e) => setNewActivityTitle(e.target.value)}
                  placeholder="Ej. Taller en Clase 1, Quiz de Repaso, Laboratorio..."
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Asignatura</label>
                  <select
                    value={newActivitySubject}
                    onChange={(e) => setNewActivitySubject(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                  >
                    {(selectedGroup?.subjects || ['Matemáticas', 'Física']).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nota Máxima</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={newActivityMaxScore}
                    onChange={(e) => setNewActivityMaxScore(Number(e.target.value))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Porcentaje (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newActivityWeight}
                  onChange={(e) => setNewActivityWeight(Number(e.target.value))}
                  className="w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickActivityModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md cursor-pointer"
                >
                  Crear y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uniform Details Modal */}
      {editingUniformModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shirt className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Control de Porte de Uniforme
                  </h3>
                  <p className="text-xs text-slate-400">{editingUniformModal.studentName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUniformModal(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Status Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Estado del Uniforme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingUniformModal({
                        ...editingUniformModal,
                        currentStatus: 'complete',
                      })
                    }
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      editingUniformModal.currentStatus === 'complete'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    Completo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingUniformModal({
                        ...editingUniformModal,
                        currentStatus: 'incomplete',
                      })
                    }
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      editingUniformModal.currentStatus === 'incomplete'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 ring-2 ring-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    Incompleto
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingUniformModal({
                        ...editingUniformModal,
                        currentStatus: 'none',
                      })
                    }
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      editingUniformModal.currentStatus === 'none'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500 ring-2 ring-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    Sin Uniforme
                  </button>
                </div>
              </div>

              {/* Preset novelty tags for quick picking */}
              {editingUniformModal.currentStatus !== 'complete' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Novedades frecuentes (Haz clic para seleccionar)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableUniformTags.map((tag) => {
                      const isSelected = editingUniformModal.currentNotes === tag;
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setEditingUniformModal({
                              ...editingUniformModal,
                              currentNotes: isSelected ? '' : tag,
                            })
                          }
                          className={`text-[11px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Observation / Note */}
              {editingUniformModal.currentStatus !== 'complete' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Observación / Detalle de la falta
                  </label>
                  <input
                    type="text"
                    value={editingUniformModal.currentNotes}
                    onChange={(e) =>
                      setEditingUniformModal({
                        ...editingUniformModal,
                        currentNotes: e.target.value,
                      })
                    }
                    placeholder="Ej. Sin camiseta institucional, zapatos no reglamentarios..."
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingUniformModal(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSetUniformDetails(
                    editingUniformModal.studentId,
                    editingUniformModal.currentStatus,
                    editingUniformModal.currentNotes
                  )
                }
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer"
              >
                Guardar Porte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
