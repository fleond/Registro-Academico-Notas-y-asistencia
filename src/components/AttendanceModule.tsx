import React, { useState, useMemo, useEffect } from 'react';
import { 
  Group, 
  Student, 
  AttendanceRecord, 
  SchoolSettings, 
  AttendanceStatus, 
  UniformStatus,
  AuthUser,
  Teacher,
  AttendanceNoveltyConfig
} from '../types';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  HelpCircle, 
  Send, 
  Sparkles, 
  FileSpreadsheet, 
  Search, 
  Calendar as CalendarIcon, 
  Shirt, 
  MessageSquare,
  AlertTriangle,
  Info,
  ShieldCheck,
  Lock,
  LogOut,
  Activity,
  FileText,
  ShieldAlert,
  AlertCircle,
  Trash2,
  ArrowRightLeft,
  Calendar,
  RotateCcw,
  X
} from 'lucide-react';
import { DEFAULT_ATTENDANCE_NOVELTIES, DEFAULT_UNIFORM_TAGS } from '../utils/storage';
import { generateAttendanceMessage, createWhatsAppUrl } from '../utils/whatsapp';
import { exportAttendanceToExcel } from '../utils/excel';
import { sortGroupsAscending } from '../utils/groupUtils';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { BulkWhatsAppQueueModal, QueueItem } from './BulkWhatsAppQueueModal';

interface AttendanceModuleProps {
  groups: Group[];
  students: Student[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  onUpdateAttendance: (records: AttendanceRecord[]) => void;
  onLogNotification?: (
    studentId: string, 
    message: string, 
    type?: 'attendance' | 'late' | 'absent' | 'uniform' | 'grade' | 'general',
    meta?: { groupId?: string; groupName?: string; teacherId?: string; teacherName?: string }
  ) => void;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  groups,
  students,
  attendance,
  settings,
  currentUser,
  teachers = [],
  onUpdateAttendance,
  onLogNotification,
}) => {
  const isTeacher = currentUser?.role === 'teacher';

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

  // Accessible groups for teacher vs admin, sorted from menor a mayor
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

    return sortGroupsAscending(filtered.length > 0 ? filtered : groups);
  }, [groups, isTeacher, currentUser, activeTeacher]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(accessibleGroups[0]?.id || groups[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [instantSendEnabled, setInstantSendEnabled] = useState<boolean>(settings.instantWhatsAppOnAttendance ?? false);

  // Dynamic novelties configuration
  const configuredNovelties = useMemo(() => {
    return settings.attendanceNovelties && settings.attendanceNovelties.length > 0
      ? settings.attendanceNovelties
      : DEFAULT_ATTENDANCE_NOVELTIES;
  }, [settings.attendanceNovelties]);

  const activeNovelties = useMemo(() => {
    return configuredNovelties.filter((n) => n.isActive);
  }, [configuredNovelties]);

  // Uniform quick tags
  const activeUniformTags = useMemo(() => {
    const list = settings.uniformTags && settings.uniformTags.length > 0
      ? settings.uniformTags
      : DEFAULT_UNIFORM_TAGS;
    return list.filter((t) => t.isActive).map((t) => t.name);
  }, [settings.uniformTags]);

  // Modals for reason/justification & late minutes
  const [editingReasonModal, setEditingReasonModal] = useState<{
    studentId: string;
    novelty: AttendanceNoveltyConfig;
    initialText: string;
  } | null>(null);
  const [reasonModalText, setReasonModalText] = useState('');

  const [editingLateStudentId, setEditingLateStudentId] = useState<string | null>(null);
  const [lateMinutesInput, setLateMinutesInput] = useState<number>(10);

  // Date Reassignment & Day Delete
  const [isMoveDateModalOpen, setIsMoveDateModalOpen] = useState(false);
  const [newDateForAttendance, setNewDateForAttendance] = useState<string>(selectedDate);

  // Sync selected group if current one is not accessible
  useEffect(() => {
    if (accessibleGroups.length > 0 && !accessibleGroups.some(g => g.id === selectedGroupId)) {
      setSelectedGroupId(accessibleGroups[0].id);
    }
  }, [accessibleGroups, selectedGroupId]);
  
  // Single preview modal state
  const [previewModalData, setPreviewModalData] = useState<{
    isOpen: boolean;
    student: Student | null;
    attendanceRecord: AttendanceRecord | null;
    message: string;
  }>({
    isOpen: false,
    student: null,
    attendanceRecord: null,
    message: '',
  });

  // Bulk queue modal state
  const [bulkQueueData, setBulkQueueData] = useState<{
    isOpen: boolean;
    items: QueueItem[];
  }>({
    isOpen: false,
    items: [],
  });

  const selectedGroup = accessibleGroups.find((g) => g.id === selectedGroupId) || accessibleGroups[0] || groups[0];

  // Active students in current group
  const groupStudents = useMemo(() => {
    return students
      .filter((s) => s.groupId === selectedGroupId && s.status === 'active')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, selectedGroupId]);

  // Filtered by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return groupStudents;
    const query = searchQuery.toLowerCase();
    return groupStudents.filter(
      (s) =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.documentId.includes(query) ||
        s.guardianName.toLowerCase().includes(query)
    );
  }, [groupStudents, searchQuery]);

  // Attendance map for quick lookup
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.forEach((r) => {
      if (r.date === selectedDate && r.groupId === selectedGroupId) {
        let status = r.status as string;
        if (status === 'unexcused_absence') status = 'absent';
        else if (status === 'excused_absence') status = 'excused';
        map.set(r.studentId, status !== r.status ? { ...r, status } : r);
      }
    });
    return map;
  }, [attendance, selectedDate, selectedGroupId]);

  // Helper to ensure record exists or create default
  const getRecordForStudent = (studentId: string): AttendanceRecord => {
    const existing = attendanceMap.get(studentId);
    if (existing) {
      let status = existing.status as string;
      if (status === 'unexcused_absence') status = 'absent';
      else if (status === 'excused_absence') status = 'excused';
      return status !== existing.status ? { ...existing, status } : existing;
    }
    return {
      id: `att-${selectedDate}-${studentId}`,
      date: selectedDate,
      groupId: selectedGroupId,
      studentId,
      status: 'present',
      uniformStatus: 'complete',
      notifiedWhatsApp: false,
    };
  };

  // Direct instant WhatsApp dispatch helper
  const triggerDirectWhatsApp = (student: Student, record: AttendanceRecord) => {
    if (!selectedGroup) return;
    const msg = generateAttendanceMessage(record, student, selectedGroup, settings);
    const url = createWhatsAppUrl(student.guardianCountryCode || '+57', student.guardianPhone, msg);
    
    // Open WhatsApp
    window.open(url, '_blank');

    // Update attendance state with notified flag
    handleUpdateRecord(student.id, {
      notifiedWhatsApp: true,
      notifiedAt: new Date().toISOString(),
    });

    if (onLogNotification) {
      const recType = record.status === 'absent' ? 'absent' : (record.status === 'late' ? 'late' : (record.uniformStatus !== 'complete' ? 'uniform' : 'attendance'));
      onLogNotification(student.id, msg, recType, {
        groupId: selectedGroup?.id,
        groupName: selectedGroup?.name,
        teacherId: currentUser?.id,
        teacherName: currentUser?.name || currentUser?.email,
      });
    }
  };

  // Update a single field
  const handleUpdateRecord = (studentId: string, updates: Partial<AttendanceRecord>, triggerInstantIfActive = false) => {
    const current = getRecordForStudent(studentId);
    if ((updates.status as string) === 'unexcused_absence') {
      updates.status = 'absent';
    } else if ((updates.status as string) === 'excused_absence') {
      updates.status = 'excused';
    }
    const updated: AttendanceRecord = { ...current, ...updates };

    const newAttendanceList = attendance.filter(
      (r) => !(r.date === selectedDate && r.groupId === selectedGroupId && r.studentId === studentId)
    );
    newAttendanceList.push(updated);
    onUpdateAttendance(newAttendanceList);

    if (triggerInstantIfActive && instantSendEnabled) {
      const student = groupStudents.find((s) => s.id === studentId);
      if (student && (updated.status === 'absent' || updated.status === 'unexcused_absence' || updated.status === 'late' || updated.uniformStatus !== 'complete' || updated.status === 'excused' || updated.status === 'excused_absence')) {
        setTimeout(() => {
          handleOpenWhatsAppPreview(student);
        }, 150);
      }
    }
  };

  // Quick Action: Mark all present
  const handleMarkAllPresent = () => {
    const updatedList = [...attendance.filter((r) => !(r.date === selectedDate && r.groupId === selectedGroupId))];
    groupStudents.forEach((student) => {
      const existing = attendanceMap.get(student.id);
      updatedList.push({
        id: existing?.id || `att-${selectedDate}-${student.id}`,
        date: selectedDate,
        groupId: selectedGroupId,
        studentId: student.id,
        status: 'present',
        uniformStatus: existing?.uniformStatus || 'complete',
        uniformNotes: existing?.uniformNotes || '',
        observations: existing?.observations || '',
        notifiedWhatsApp: existing?.notifiedWhatsApp || false,
        notifiedAt: existing?.notifiedAt,
      });
    });
    onUpdateAttendance(updatedList);
  };

  // Quick Action: Mark all uniform complete
  const handleMarkAllUniformComplete = () => {
    const updatedList = [...attendance.filter((r) => !(r.date === selectedDate && r.groupId === selectedGroupId))];
    groupStudents.forEach((student) => {
      const existing = attendanceMap.get(student.id);
      updatedList.push({
        id: existing?.id || `att-${selectedDate}-${student.id}`,
        date: selectedDate,
        groupId: selectedGroupId,
        studentId: student.id,
        status: existing?.status || 'present',
        lateMinutes: existing?.lateMinutes,
        uniformStatus: 'complete',
        uniformNotes: '',
        observations: existing?.observations || '',
        notifiedWhatsApp: existing?.notifiedWhatsApp || false,
        notifiedAt: existing?.notifiedAt,
      });
    });
    onUpdateAttendance(updatedList);
  };

  // Delete all attendance records for selected date and group
  const handleDeleteAttendanceDay = () => {
    const dayRecords = attendance.filter((r) => r.date === selectedDate && r.groupId === selectedGroupId);
    if (dayRecords.length === 0) {
      alert('No hay registros de asistencia guardados en esta fecha para este grupo.');
      return;
    }

    if (
      confirm(
        `¿Estás seguro de eliminar permanentemente la toma de asistencia del día ${selectedDate} para el grupo "${selectedGroup?.name}" (${dayRecords.length} registros)?\n\nEsta acción liberará la asistencia de este día.`
      )
    ) {
      const updatedList = attendance.filter((r) => !(r.date === selectedDate && r.groupId === selectedGroupId));
      onUpdateAttendance(updatedList);
      alert(`¡Se eliminó la toma de asistencia del ${selectedDate} correctamente!`);
    }
  };

  // Move / Reassign attendance records from selectedDate to newDateForAttendance
  const handleConfirmMoveAttendanceDate = () => {
    if (!newDateForAttendance || newDateForAttendance === selectedDate) {
      setIsMoveDateModalOpen(false);
      return;
    }

    const currentDayRecords = attendance.filter((r) => r.date === selectedDate && r.groupId === selectedGroupId);
    if (currentDayRecords.length === 0) {
      // If none saved explicitly yet, move current view date
      setSelectedDate(newDateForAttendance);
      setIsMoveDateModalOpen(false);
      return;
    }

    const otherRecords = attendance.filter((r) => !(r.date === selectedDate && r.groupId === selectedGroupId));
    const movedRecords = currentDayRecords.map((r) => ({
      ...r,
      id: `att-${newDateForAttendance}-${r.studentId}`,
      date: newDateForAttendance,
    }));

    onUpdateAttendance([...otherRecords, ...movedRecords]);
    setSelectedDate(newDateForAttendance);
    setIsMoveDateModalOpen(false);
    alert(`¡Se reasignaron ${movedRecords.length} registros de asistencia a la nueva fecha ${newDateForAttendance} exitosamente!`);
  };

  // Clear single student attendance
  const handleClearStudentAttendance = (studentId: string) => {
    const updatedList = attendance.filter(
      (r) => !(r.date === selectedDate && r.groupId === selectedGroupId && r.studentId === studentId)
    );
    onUpdateAttendance(updatedList);
  };

  // Summary Metrics
  const stats = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    let uniformIssues = 0;
    let notifiedCount = 0;

    groupStudents.forEach((s) => {
      const rec = attendanceMap.get(s.id);
      let status = rec?.status || 'present';
      if ((status as string) === 'unexcused_absence') status = 'absent';
      else if ((status as string) === 'excused_absence') status = 'excused';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (rec && rec.uniformStatus !== 'complete') {
        uniformIssues++;
      }
      if (rec?.notifiedWhatsApp) {
        notifiedCount++;
      }
    });

    return {
      total: groupStudents.length,
      statusCounts,
      present: statusCounts['present'] || 0,
      late: statusCounts['late'] || 0,
      absent: statusCounts['absent'] || 0,
      excused: statusCounts['excused'] || 0,
      uniformIssues,
      notifiedCount,
    };
  }, [groupStudents, attendanceMap]);

  // Open single WhatsApp preview
  const handleOpenWhatsAppPreview = (student: Student) => {
    if (!selectedGroup) return;
    const record = getRecordForStudent(student.id);
    const msg = generateAttendanceMessage(record, student, selectedGroup, settings);
    setPreviewModalData({
      isOpen: true,
      student,
      attendanceRecord: record,
      message: msg,
    });
  };

  // Confirm single WhatsApp send
  const handleConfirmSingleSend = () => {
    if (!previewModalData.student || !previewModalData.attendanceRecord) return;
    handleUpdateRecord(previewModalData.student.id, {
      notifiedWhatsApp: true,
      notifiedAt: new Date().toISOString(),
    });
    if (onLogNotification) {
      const rec = previewModalData.attendanceRecord;
      const recType = rec.status === 'absent' ? 'absent' : (rec.status === 'late' ? 'late' : (rec.uniformStatus !== 'complete' ? 'uniform' : 'attendance'));
      onLogNotification(previewModalData.student.id, previewModalData.message, recType, {
        groupId: selectedGroup?.id,
        groupName: selectedGroup?.name,
        teacherId: currentUser?.id,
        teacherName: currentUser?.name || currentUser?.email,
      });
    }
  };

  // Open Bulk WhatsApp queue for only students with novedades (Absent, Late, Excused, Custom Novelties, Uniform issue) or all
  const handleStartBulkQueue = (filterType: 'novedades' | 'all') => {
    if (!selectedGroup) return;

    const items: QueueItem[] = [];

    groupStudents.forEach((std) => {
      const rec = getRecordForStudent(std.id);
      const isPresent = rec.status === 'present';
      const hasUniformIssue = rec.uniformStatus !== 'complete';
      const hasNovedad = !isPresent || hasUniformIssue;
      
      if (filterType === 'all' || hasNovedad) {
        let reason = 'Reporte Diario';
        const matchingNovelty = activeNovelties.find(
          (n) => n.id === rec.status || n.code.toLowerCase() === rec.status?.toLowerCase()
        );
        if (matchingNovelty) {
          reason = `${matchingNovelty.name}${rec.status === 'late' && rec.lateMinutes ? ` (${rec.lateMinutes}m)` : ''}`;
        } else if (hasUniformIssue) {
          reason = '👔 Novedad de Uniforme';
        }

        const msg = generateAttendanceMessage(rec, std, selectedGroup, settings);
        items.push({
          id: std.id,
          studentName: `${std.firstName} ${std.lastName}`,
          guardianName: std.guardianName,
          guardianPhone: std.guardianPhone,
          guardianCountryCode: std.guardianCountryCode,
          message: msg,
          reason,
          alreadySent: rec.notifiedWhatsApp,
        });
      }
    });

    if (items.length === 0) {
      alert('No hay estudiantes con novedades para notificar.');
      return;
    }

    setBulkQueueData({
      isOpen: true,
      items,
    });
  };

  const handleMarkBulkItemSent = (studentId: string) => {
    handleUpdateRecord(studentId, {
      notifiedWhatsApp: true,
      notifiedAt: new Date().toISOString(),
    });
    const queueItem = bulkQueueData.items.find((i) => i.id === studentId);
    if (onLogNotification && queueItem) {
      const rec = getRecordForStudent(studentId);
      const recType = rec.status === 'absent' ? 'absent' : (rec.status === 'late' ? 'late' : (rec.uniformStatus !== 'complete' ? 'uniform' : 'attendance'));
      onLogNotification(studentId, queueItem.message, recType, {
        groupId: selectedGroup?.id,
        groupName: selectedGroup?.name,
        teacherId: currentUser?.id,
        teacherName: currentUser?.name || currentUser?.email,
      });
    }
    setBulkQueueData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === studentId ? { ...i, alreadySent: true } : i)),
    }));
  };

  const handleExportExcel = () => {
    if (!selectedGroup) return;
    const records = groupStudents.map((s) => getRecordForStudent(s.id));
    exportAttendanceToExcel(records, groupStudents, selectedGroup, selectedDate);
  };

  // Helper for rendering icons dynamically
  const renderNoveltyIcon = (iconName?: string) => {
    switch (iconName) {
      case 'CheckCircle2': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Clock': return <Clock className="w-3.5 h-3.5" />;
      case 'XCircle': return <XCircle className="w-3.5 h-3.5" />;
      case 'HelpCircle': return <HelpCircle className="w-3.5 h-3.5" />;
      case 'AlertTriangle': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'LogOut': return <LogOut className="w-3.5 h-3.5" />;
      case 'Activity': return <Activity className="w-3.5 h-3.5" />;
      case 'FileText': return <FileText className="w-3.5 h-3.5" />;
      case 'ShieldAlert': return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'AlertCircle': return <AlertCircle className="w-3.5 h-3.5" />;
      default: return <AlertTriangle className="w-3.5 h-3.5" />;
    }
  };

  // Helper for dynamic button colors
  const getNoveltyButtonClasses = (color: string, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-700 hover:text-slate-200';
    }
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm';
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm';
      case 'red':
        return 'bg-red-500/20 text-red-300 border-red-500/50 shadow-sm';
      case 'orange':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-sm';
      case 'sky':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm';
      case 'purple':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm';
      case 'teal':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm';
      case 'indigo':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm';
      default:
        return 'bg-slate-700/50 text-slate-200 border-slate-600 shadow-sm';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header & Group/Date Selector Bar */}
      <div className="bg-slate-900/60 rounded-2xl p-5 shadow-xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Group selector */}
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Curso / Grupo
              </label>
              {isTeacher && (
                <span className="text-[10px] text-purple-400 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Mis Cursos ({accessibleGroups.length})</span>
                </span>
              )}
            </div>
            <select
              id="select-group-attendance"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 min-w-[200px] shadow-sm"
            >
              {accessibleGroups.map((g) => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                  {g.name} ({g.shift})
                </option>
              ))}
            </select>
          </div>

          {/* Date selector */}
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Fecha de Registro
              </label>
              <button
                type="button"
                onClick={() => {
                  setNewDateForAttendance(selectedDate);
                  setIsMoveDateModalOpen(true);
                }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center space-x-1"
                title="Cambiar o reasignar la fecha de este registro de asistencia"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Mover fecha</span>
              </button>
            </div>
            <div className="relative">
              <input
                id="input-attendance-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800/90 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Delete day's attendance button */}
          <button
            id="btn-delete-attendance-day"
            type="button"
            onClick={handleDeleteAttendanceDay}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/50 rounded-xl transition-colors shadow-sm"
            title="Borrar todos los registros de asistencia de este día y grupo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Día</span>
          </button>

          {/* Instant notification toggle */}
          <button
            id="toggle-instant-whatsapp"
            type="button"
            onClick={() => setInstantSendEnabled(!instantSendEnabled)}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
              instantSendEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Activar o desactivar apertura automática de WhatsApp al registrar una novedad"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Notificación Automática: {instantSendEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            id="btn-mark-all-present"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Todos Presentes</span>
          </button>

          <button
            id="btn-mark-all-uniform"
            onClick={handleMarkAllUniformComplete}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/30 rounded-xl hover:bg-teal-500/20 transition-colors shadow-sm"
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Uniforme Completo</span>
          </button>

          <button
            id="btn-export-attendance-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800/90 border border-slate-700 rounded-xl hover:bg-slate-700/80 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            id="btn-bulk-whatsapp-novedades"
            onClick={() => handleStartBulkQueue('novedades')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 hover:shadow-indigo-900/60 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Notificar Novedades WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Matriculados</span>
            <p className="text-xl font-bold text-slate-100">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-semibold text-xs border border-slate-700">
            100%
          </div>
        </div>

        <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-emerald-400">Presentes</span>
            <p className="text-xl font-bold text-emerald-300">{stats.present}</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-amber-400">Retardos</span>
            <p className="text-xl font-bold text-amber-300">{stats.late}</p>
          </div>
          <Clock className="w-5 h-5 text-amber-400" />
        </div>

        <div className="bg-rose-950/20 p-3.5 rounded-xl border border-rose-500/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-rose-400">Inasistentes</span>
            <p className="text-xl font-bold text-rose-300">{stats.absent}</p>
          </div>
          <XCircle className="w-5 h-5 text-rose-400" />
        </div>

        <div className="bg-sky-950/20 p-3.5 rounded-xl border border-sky-500/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-sky-400">Justificados</span>
            <p className="text-xl font-bold text-sky-300">{stats.excused}</p>
          </div>
          <HelpCircle className="w-5 h-5 text-sky-400" />
        </div>

        <div className="bg-purple-950/20 p-3.5 rounded-xl border border-purple-500/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-purple-400">Falta Uniforme</span>
            <p className="text-xl font-bold text-purple-300">{stats.uniformIssues}</p>
          </div>
          <Shirt className="w-5 h-5 text-purple-400" />
        </div>
      </div>

      {/* Search & Student List Section */}
      <div className="bg-slate-900/60 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar estudiante o documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Mostrando <strong className="text-slate-200">{filteredStudents.length}</strong> de <strong className="text-slate-200">{groupStudents.length}</strong> estudiantes</span>
          </div>
        </div>

        {/* Student Rows Table */}
        <div className="divide-y divide-slate-800/70">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-400">No se encontraron estudiantes en este curso.</p>
              <p className="text-xs text-slate-500">Puedes matricular estudiantes desde el módulo de "Estudiantes & Matrícula".</p>
            </div>
          ) : (
            filteredStudents.map((student, idx) => {
              const record = getRecordForStudent(student.id);
              const normalizedStatus =
                (record.status as string) === 'unexcused_absence'
                  ? 'absent'
                  : (record.status as string) === 'excused_absence'
                  ? 'excused'
                  : (record.status || 'present');

              return (
                <div
                  key={student.id}
                  id={`attendance-row-${student.id}`}
                  className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  {/* Student Info */}
                  <div className="flex items-center space-x-3 min-w-[240px]">
                    <div className="w-6 text-xs font-semibold text-slate-500 shrink-0 text-center">
                      {idx + 1}
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md ${student.avatarColor || 'bg-indigo-600'}`}>
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-100 leading-tight">
                        {student.lastName} {student.firstName}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                        <span>Doc: {student.documentId}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-medium">Acudiente: {student.guardianName} ({student.guardianRelationship})</span>
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Attendance Status Dropdown Menu (Touch & Mobile Friendly) and Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                    {/* Mobile/Tablet Priority Dropdown Selector */}
                    <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                      <select
                        id={`select-status-${student.id}`}
                        value={normalizedStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          const selectedNovelty = activeNovelties.find((n) => n.id === val || n.code.toLowerCase() === val);
                          if (!selectedNovelty) return;

                          if (selectedNovelty.requiresMinutes) {
                            handleUpdateRecord(student.id, { status: selectedNovelty.id, lateMinutes: record.lateMinutes || 10 });
                            setEditingLateStudentId(student.id);
                            setLateMinutesInput(record.lateMinutes || 10);
                          } else if (selectedNovelty.requiresReason) {
                            const initial = record.excuseReason || record.observations || '';
                            handleUpdateRecord(student.id, { status: selectedNovelty.id });
                            setEditingReasonModal({
                              studentId: student.id,
                              novelty: selectedNovelty,
                              initialText: initial,
                            });
                            setReasonModalText(initial);
                          } else {
                            handleUpdateRecord(student.id, { status: selectedNovelty.id }, true);
                          }
                        }}
                        className={`text-xs font-bold py-2 px-3 rounded-xl border transition-all cursor-pointer shadow-sm w-full sm:w-auto ${
                          normalizedStatus === 'present'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/70 focus:ring-emerald-500'
                            : (normalizedStatus === 'absent' || normalizedStatus === 'unexcused_absence')
                            ? 'bg-rose-950/60 text-rose-300 border-rose-600/70 focus:ring-rose-500'
                            : (normalizedStatus === 'excused' || normalizedStatus === 'excused_absence')
                            ? 'bg-sky-950/60 text-sky-300 border-sky-600/70 focus:ring-sky-500'
                            : normalizedStatus === 'late'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-600/70 focus:ring-amber-500'
                            : 'bg-slate-800 text-slate-200 border-slate-700 focus:ring-indigo-500'
                        }`}
                      >
                        {activeNovelties.map((novelty) => (
                          <option
                            key={novelty.id}
                            value={novelty.id}
                            className="bg-slate-900 text-slate-100 font-semibold py-1.5"
                          >
                            {novelty.name}
                            {novelty.requiresMinutes && normalizedStatus === novelty.id && record.lateMinutes ? ` (${record.lateMinutes}m)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Button Pills (Desktop Shortcut) */}
                    <div className="hidden sm:flex flex-wrap items-center gap-1">
                      {activeNovelties.slice(0, 4).map((novelty) => {
                        const isSelected = normalizedStatus === novelty.id || normalizedStatus === novelty.code.toLowerCase();
                        const colorClass = getNoveltyButtonClasses(novelty.color, isSelected);

                        return (
                          <button
                            key={novelty.id}
                            id={`btn-status-${novelty.id}-${student.id}`}
                            type="button"
                            onClick={() => {
                              if (novelty.requiresMinutes) {
                                handleUpdateRecord(student.id, { status: novelty.id, lateMinutes: record.lateMinutes || 10 });
                                setEditingLateStudentId(student.id);
                                setLateMinutesInput(record.lateMinutes || 10);
                              } else if (novelty.requiresReason) {
                                const initial = record.excuseReason || record.observations || '';
                                handleUpdateRecord(student.id, { status: novelty.id });
                                setEditingReasonModal({
                                  studentId: student.id,
                                  novelty,
                                  initialText: initial,
                                });
                                setReasonModalText(initial);
                              } else {
                                handleUpdateRecord(student.id, { status: novelty.id }, true);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 border ${colorClass}`}
                          >
                            {renderNoveltyIcon(novelty.iconName)}
                            <span>
                              {novelty.name.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Uniform Status & Notes */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center space-x-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700/80">
                      <button
                        title="Uniforme Completo"
                        type="button"
                        onClick={() => handleUpdateRecord(student.id, { uniformStatus: 'complete', uniformNotes: '' })}
                        className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                          record.uniformStatus === 'complete'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Shirt className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Uniforme Incompleto"
                        type="button"
                        onClick={() => handleUpdateRecord(student.id, { uniformStatus: 'incomplete' })}
                        className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                          record.uniformStatus === 'incomplete'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-amber-300'
                        }`}
                      >
                        Incompleto
                      </button>
                      <button
                        title="No portó uniforme"
                        type="button"
                        onClick={() => handleUpdateRecord(student.id, { uniformStatus: 'none' })}
                        className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                          record.uniformStatus === 'none'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-rose-300'
                        }`}
                      >
                        Sin Uniforme
                      </button>
                    </div>

                    {/* Quick uniform issue selector if incomplete */}
                    {record.uniformStatus === 'incomplete' && (
                      <select
                        value={record.uniformNotes || ''}
                        onChange={(e) => handleUpdateRecord(student.id, { uniformNotes: e.target.value })}
                        className="text-[11px] bg-amber-950/40 border border-amber-500/40 text-amber-300 rounded-lg p-1.5 font-medium max-w-[160px]"
                      >
                        <option value="" className="bg-slate-900 text-slate-300">Detalle de falta...</option>
                        {activeUniformTags.map((tag) => (
                          <option key={tag} value={tag} className="bg-slate-900 text-slate-100">
                            {tag}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Observations & WhatsApp Send Button */}
                  <div className="flex items-center space-x-2 w-full lg:w-auto justify-end">
                    <input
                      type="text"
                      placeholder="Observación del día..."
                      value={record.observations || ''}
                      onChange={(e) => handleUpdateRecord(student.id, { observations: e.target.value })}
                      className="text-xs bg-slate-800/60 border border-slate-700 rounded-lg px-2.5 py-1.5 w-44 lg:w-48 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    {/* WhatsApp Action Button */}
                    <button
                      id={`btn-whatsapp-student-${student.id}`}
                      type="button"
                      onClick={() => handleOpenWhatsAppPreview(student)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        record.notifiedWhatsApp
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{record.notifiedWhatsApp ? 'Notificado' : 'WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal for editing Reason/Observations for Novelties */}
      {editingReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {renderNoveltyIcon(editingReasonModal.novelty.iconName)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {editingReasonModal.novelty.name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingReasonModal.novelty.description || 'Detalle del motivo o soporte de la situación.'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Motivo / Soporte / Observación:
              </label>
              <textarea
                rows={3}
                value={reasonModalText}
                onChange={(e) => setReasonModalText(e.target.value)}
                placeholder="Ej: Autorizado por coordinación, salida médica, reporte de rectoría..."
                className="w-full text-xs p-3 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-slate-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingReasonModal(null)}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateRecord(editingReasonModal.studentId, {
                    excuseReason: reasonModalText,
                    observations: reasonModalText,
                  }, true);
                  setEditingReasonModal(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-sm transition-all"
              >
                Guardar Motivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for editing Late minutes */}
      {editingLateStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-800 text-slate-100">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>Minutos de Retardo</span>
            </h3>
            <p className="text-xs text-slate-400">
              Indica cuántos minutos tarde ingresó el estudiante a la jornada o clase.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="180"
                value={lateMinutesInput}
                onChange={(e) => setLateMinutesInput(Number(e.target.value))}
                className="w-full text-base font-bold text-center p-3 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="text-sm font-semibold text-slate-400">minutos</span>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingLateStudentId(null)}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateRecord(editingLateStudentId, { lateMinutes: lateMinutesInput });
                  setEditingLateStudentId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-sm"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Reassigning/Moving Attendance Date */}
      {isMoveDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                <span>Reasignar Fecha de Asistencia</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMoveDateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Registraste la asistencia en un día equivocado? Puedes transferir todos los registros tomados el <strong className="text-indigo-300">{selectedDate}</strong> para el grupo <strong className="text-indigo-300">{selectedGroup?.name}</strong> a otra fecha.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Nueva Fecha de Destino:</label>
              <input
                type="date"
                value={newDateForAttendance}
                onChange={(e) => setNewDateForAttendance(e.target.value)}
                className="w-full text-sm font-semibold p-3 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMoveDateModalOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveAttendanceDate}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50"
              >
                Cambiar Fecha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single WhatsApp Preview Modal */}
      {previewModalData.student && (
        <WhatsAppPreviewModal
          isOpen={previewModalData.isOpen}
          onClose={() => setPreviewModalData((prev) => ({ ...prev, isOpen: false }))}
          studentName={`${previewModalData.student.firstName} ${previewModalData.student.lastName}`}
          guardianName={previewModalData.student.guardianName}
          guardianPhone={previewModalData.student.guardianPhone}
          guardianCountryCode={previewModalData.student.guardianCountryCode}
          initialMessage={previewModalData.message}
          onSendConfirm={handleConfirmSingleSend}
        />
      )}

      {/* Bulk WhatsApp Queue Modal */}
      <BulkWhatsAppQueueModal
        isOpen={bulkQueueData.isOpen}
        onClose={() => setBulkQueueData((prev) => ({ ...prev, isOpen: false }))}
        items={bulkQueueData.items}
        onMarkItemSent={handleMarkBulkItemSent}
        onFinishAll={() => setBulkQueueData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
