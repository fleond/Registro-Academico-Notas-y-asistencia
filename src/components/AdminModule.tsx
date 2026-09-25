import React, { useState, useMemo } from 'react';
import { 
  Teacher, 
  Group, 
  Student, 
  SchoolSettings,
  SubjectConfig,
  AttendanceRecord 
} from '../types';
import { sortGroupsAscending } from '../utils/groupUtils';
import { 
  GraduationCap, 
  Users, 
  School, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Check, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  Phone, 
  BookOpen, 
  Download, 
  Upload, 
  Save, 
  RefreshCw,
  UserPlus,
  Layers,
  HelpCircle,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Copy,
  CheckCircle2,
  ArrowRightLeft,
  CalendarRange,
  SlidersHorizontal,
  Sliders,
  Calendar,
  Clock,
  Filter,
  Database
} from 'lucide-react';
import { exportFullDatabaseBackup, restoreDatabaseFromBackup, resetToFactoryDefaults, DEFAULT_INSTITUTION_SUBJECTS } from '../utils/storage';
import { isTeacherDegreeOrTitle } from '../utils/teacherUtils';
import { deleteRecordFromMySQL } from '../utils/mysqlService';
import { SecuritySettingsModule } from './SecuritySettingsModule';
import { AttendanceNoveltiesAdmin } from './AttendanceNoveltiesAdmin';
import { EvaluationSIEEAdmin } from './EvaluationSIEEAdmin';
import { AcademicPeriodsAdmin } from './AcademicPeriodsAdmin';
import { SubjectsCatalogAdmin } from './SubjectsCatalogAdmin';
import { AcademicAssignmentsAdmin } from './AcademicAssignmentsAdmin';
import { MySQLMigrationAdmin } from './MySQLMigrationAdmin';

interface AdminModuleProps {
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  settings: SchoolSettings;
  attendance?: AttendanceRecord[];
  subjectConfigs?: SubjectConfig[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onUpdateGroups: (groups: Group[]) => void;
  onUpdateStudents: (students: Student[]) => void;
  onUpdateAttendance?: (attendance: AttendanceRecord[]) => void;
  onUpdateSettings: (settings: SchoolSettings) => void;
  onUpdateSubjectConfigs?: (configs: SubjectConfig[]) => void;
  onNavigateToAttendance?: (groupId: string, date: string) => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({
  teachers,
  groups,
  students,
  settings,
  attendance = [],
  subjectConfigs = [],
  onUpdateTeachers,
  onUpdateGroups,
  onUpdateStudents,
  onUpdateAttendance,
  onUpdateSettings,
  onUpdateSubjectConfigs,
  onNavigateToAttendance,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'teachers' | 'subjects' | 'assignments' | 'groups' | 'students' | 'academic_periods' | 'attendance_novelties' | 'attendance_days' | 'evaluation_siee' | 'settings' | 'security' | 'mysql'>('teachers');
  const sortedGroups = useMemo(() => sortGroupsAscending(groups), [groups]);

  // Search queries
  const [teacherSearch, setTeacherSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentGroupFilter, setStudentGroupFilter] = useState('all');

  // Attendance Days Management State
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceGroupFilter, setAttendanceGroupFilter] = useState('all');
  const [attendanceStartDateFilter, setAttendanceStartDateFilter] = useState('');
  const [attendanceEndDateFilter, setAttendanceEndDateFilter] = useState('');
  const [selectedAttendanceSessionKeys, setSelectedAttendanceSessionKeys] = useState<Set<string>>(new Set());

  // Aggregate attendance by (date, groupId)
  const attendanceSessions = useMemo(() => {
    if (!attendance || attendance.length === 0) return [];
    const map = new Map<string, {
      key: string;
      date: string;
      groupId: string;
      groupName: string;
      groupGrade: string;
      groupShift: string;
      recordsCount: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      excusedCount: number;
      noveltyCount: number;
      uniformIncompleteCount: number;
    }>();

    attendance.forEach((r) => {
      const key = `${r.date}_${r.groupId}`;
      const grp = groups.find((g) => g.id === r.groupId);
      if (!map.has(key)) {
        map.set(key, {
          key,
          date: r.date,
          groupId: r.groupId,
          groupName: grp?.name || 'Grupo sin nombre',
          groupGrade: grp?.grade || '',
          groupShift: grp?.shift || 'Mañana',
          recordsCount: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          excusedCount: 0,
          noveltyCount: 0,
          uniformIncompleteCount: 0,
        });
      }
      const item = map.get(key)!;
      item.recordsCount++;
      if (r.status === 'present') item.presentCount++;
      else if (r.status === 'late') item.lateCount++;
      else if (r.status === 'absent') item.absentCount++;
      else if (r.status === 'excused') item.excusedCount++;
      else item.noveltyCount++;

      if (r.uniform === 'incomplete' || (r.uniformTags && r.uniformTags.length > 0)) {
        item.uniformIncompleteCount++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, groups]);

  const filteredAttendanceSessions = useMemo(() => {
    return attendanceSessions.filter((s) => {
      if (attendanceGroupFilter !== 'all' && s.groupId !== attendanceGroupFilter) return false;
      if (attendanceStartDateFilter && s.date < attendanceStartDateFilter) return false;
      if (attendanceEndDateFilter && s.date > attendanceEndDateFilter) return false;
      if (attendanceSearchQuery) {
        const q = attendanceSearchQuery.toLowerCase();
        return s.date.includes(q) || s.groupName.toLowerCase().includes(q) || s.groupGrade.toLowerCase().includes(q);
      }
      return true;
    });
  }, [attendanceSessions, attendanceGroupFilter, attendanceStartDateFilter, attendanceEndDateFilter, attendanceSearchQuery]);

  const handleDeleteAttendanceSession = (date: string, groupId: string) => {
    const grp = groups.find((g) => g.id === groupId);
    const count = (attendance || []).filter((r) => r.date === date && r.groupId === groupId).length;
    if (
      !confirm(
        `¿Estás seguro de eliminar el registro de asistencia del día ${date} para el curso "${grp?.name || 'Curso'}"?\n\nSe eliminarán los ${count} registros de asistencia y novedades tomadas en esta fecha.`
      )
    ) {
      return;
    }

    const toDelete = (attendance || []).filter((r) => r.date === date && r.groupId === groupId);
    toDelete.forEach((r) => {
      deleteRecordFromMySQL('asistencias', r.id).catch(() => {});
    });

    if (onUpdateAttendance) {
      const remaining = (attendance || []).filter((r) => !(r.date === date && r.groupId === groupId));
      onUpdateAttendance(remaining);
    }
  };

  const handleBulkDeleteAttendanceSessions = () => {
    if (selectedAttendanceSessionKeys.size === 0) return;
    if (
      !confirm(
        `¿Estás seguro de eliminar los ${selectedAttendanceSessionKeys.size} días/sesiones de asistencia seleccionados?\n\nEsta acción eliminará de forma permanente todos los registros de asistencia de las fechas seleccionadas.`
      )
    ) {
      return;
    }

    const toDelete = (attendance || []).filter((r) => {
      const key = `${r.date}_${r.groupId}`;
      return selectedAttendanceSessionKeys.has(key);
    });
    toDelete.forEach((r) => {
      deleteRecordFromMySQL('asistencias', r.id).catch(() => {});
    });

    if (onUpdateAttendance) {
      const remaining = (attendance || []).filter((r) => {
        const key = `${r.date}_${r.groupId}`;
        return !selectedAttendanceSessionKeys.has(key);
      });
      onUpdateAttendance(remaining);
      setSelectedAttendanceSessionKeys(new Set());
    }
  };

  // Modals state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [revealedPasswordId, setRevealedPasswordId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Bulk & Single Student Selection & Operations
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>(sortedGroups[0]?.id || groups[0]?.id || '');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Single Move Student State
  const [isSingleMoveModalOpen, setIsSingleMoveModalOpen] = useState(false);
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [singleTargetGroupId, setSingleTargetGroupId] = useState<string>(sortedGroups[0]?.id || groups[0]?.id || '');

  const handleOpenSingleMove = (student: Student) => {
    setMovingStudent(student);
    setSingleTargetGroupId(student.groupId || sortedGroups[0]?.id || groups[0]?.id || '');
    setIsSingleMoveModalOpen(true);
  };

  const handleConfirmSingleMove = () => {
    if (!movingStudent || !singleTargetGroupId) return;
    const updated = students.map((s) =>
      s.id === movingStudent.id ? { ...s, groupId: singleTargetGroupId } : s
    );
    onUpdateStudents(updated);
    setIsSingleMoveModalOpen(false);
    setMovingStudent(null);
  };

  // Form states for Teacher
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({
    name: '',
    email: '',
    documentId: '',
    phone: '',
    specialty: '',
    password: 'docente123',
    assignedGroupIds: [],
    assignedGrades: [],
    assignedSubjects: [],
    role: 'teacher',
    status: 'active',
  });
  const [subjectInputText, setSubjectInputText] = useState('');

  // Extract unique available grades
  const availableSchoolGrades = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.grade) set.add(g.grade.trim());
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [groups]);

  // Form states for Group with integrated Teacher & Subject Associations
  const [groupForm, setGroupForm] = useState<Partial<Group>>({
    name: '',
    grade: '10°',
    room: '',
    shift: 'Mañana',
    schoolYear: settings.schoolYear || '2026',
  });

  // Group Modal Teacher & Subject Associations state
  interface GroupAssocItem {
    id: string;
    teacherId: string;
    subject: string;
  }
  const [groupModalAssocs, setGroupModalAssocs] = useState<GroupAssocItem[]>([]);
  const [newAssocTeacherId, setNewAssocTeacherId] = useState<string>('');
  const [newAssocSubject, setNewAssocSubject] = useState<string>('');
  const [newAssocCustomSubject, setNewAssocCustomSubject] = useState<string>('');
  const [editingAssocIndex, setEditingAssocIndex] = useState<number | null>(null);
  const [editAssocTeacherId, setEditAssocTeacherId] = useState<string>('');
  const [editAssocSubject, setEditAssocSubject] = useState<string>('');

  // Form states for Student
  const [studentForm, setStudentForm] = useState<Partial<Student>>({
    documentId: '',
    firstName: '',
    lastName: '',
    groupId: groups[0]?.id || '',
    guardianName: '',
    guardianPhone: '',
    guardianCountryCode: settings.defaultCountryCode || '+57',
    guardianEmail: '',
    guardianRelationship: 'Madre',
    status: 'active',
    observations: '',
  });

  // Global Settings Form
  const [settingsForm, setSettingsForm] = useState<SchoolSettings>(settings);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // =========================================================================
  // TEACHER CRUD HANDLERS
  // =========================================================================
  const handleOpenTeacherModal = (teacher?: Teacher) => {
    setShowPasswordInModal(false);
    if (teacher) {
      setEditingTeacher(teacher);
      // Derive grades from groups or teacher's assignedGrades
      const teacherGrades = teacher.assignedGrades || Array.from(new Set(
        groups
          .filter((g) => (teacher.assignedGroupIds || []).includes(g.id))
          .map((g) => g.grade)
      ));

      setTeacherForm({ 
        ...teacher,
        password: teacher.password || 'docente123',
        assignedGroupIds: teacher.assignedGroupIds || [],
        assignedGrades: teacherGrades,
      });
      setSubjectInputText(teacher.assignedSubjects.join(', '));
    } else {
      setEditingTeacher(null);
      const defaultGrps = groups.slice(0, 2).map((g) => g.id);
      const defaultGrds = Array.from(new Set(groups.slice(0, 2).map((g) => g.grade)));
      setTeacherForm({
        name: '',
        email: '',
        documentId: '',
        phone: '',
        specialty: '',
        password: 'docente123',
        assignedGroupIds: defaultGrps,
        assignedGrades: defaultGrds,
        assignedSubjects: ['Matemáticas'],
        role: 'teacher',
        status: 'active',
        avatarColor: 'bg-indigo-600',
      });
      setSubjectInputText('Matemáticas, Física');
    }
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name?.trim() || !teacherForm.documentId?.trim()) {
      alert('Por favor completa al menos el nombre y documento del docente.');
      return;
    }

    const subjectsArray = subjectInputText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const securePassword = teacherForm.password?.trim() || 'docente123';
    const chosenGroupIds = teacherForm.assignedGroupIds || [];
    const chosenGrades = teacherForm.assignedGrades || Array.from(
      new Set(groups.filter((g) => chosenGroupIds.includes(g.id)).map((g) => g.grade))
    );

    if (editingTeacher) {
      // Update
      const updated = teachers.map((t) =>
        t.id === editingTeacher.id
          ? ({
              ...t,
              ...teacherForm,
              password: securePassword,
              assignedGroupIds: chosenGroupIds,
              assignedGrades: chosenGrades,
              assignedSubjects: subjectsArray.length > 0 ? subjectsArray : t.assignedSubjects,
            } as Teacher)
          : t
      );
      onUpdateTeachers(updated);
    } else {
      // Create new
      const newTeacher: Teacher = {
        id: `tch-${Date.now()}`,
        name: teacherForm.name || 'Docente',
        email: teacherForm.email || `docente_${Date.now()}@colegio.edu.co`,
        documentId: teacherForm.documentId || '',
        phone: teacherForm.phone || '3001234567',
        specialty: teacherForm.specialty || 'Docente de Asignatura',
        password: securePassword,
        assignedGroupIds: chosenGroupIds,
        assignedGrades: chosenGrades,
        assignedSubjects: subjectsArray.length > 0 ? subjectsArray : ['General'],
        role: teacherForm.role || 'teacher',
        status: teacherForm.status || 'active',
        avatarColor: 'bg-indigo-600',
        createdAt: new Date().toISOString().split('T')[0],
      };
      onUpdateTeachers([...teachers, newTeacher]);
    }
    setIsTeacherModalOpen(false);
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789#@';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTeacherForm((prev) => ({ ...prev, password: result }));
    setShowPasswordInModal(true);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteTeacher = (teacherId: string, teacherName: string) => {
    if (confirm(`¿Estás seguro de eliminar al docente "${teacherName}"?`)) {
      // Directly delete in MySQL
      deleteRecordFromMySQL('docentes', teacherId).catch((err) => {
        console.error('Error al eliminar docente en MySQL:', err);
      });
      const updated = teachers.filter((t) => t.id !== teacherId);
      onUpdateTeachers(updated);
    }
  };

  // =========================================================================
  // GROUP CRUD HANDLERS WITH TEACHER & SUBJECT ASSOCIATIONS
  // =========================================================================
  const handleOpenGroupModal = (group?: Group) => {
    setEditingAssocIndex(null);
    setNewAssocTeacherId(teachers[0]?.id || '');
    const firstSubj = (settings.institutionSubjects && settings.institutionSubjects.length > 0)
      ? settings.institutionSubjects[0]
      : (DEFAULT_INSTITUTION_SUBJECTS[0] || 'Matemáticas');
    setNewAssocSubject(firstSubj);
    setNewAssocCustomSubject('');

    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        grade: group.grade,
        room: group.room || '',
        shift: group.shift,
        schoolYear: group.schoolYear || settings.schoolYear || '2026',
        directorName: group.directorName || group.teacherName || '',
        teacherName: group.teacherName || group.directorName || '',
        teacherId: group.teacherId || '',
      });

      // Extract existing associations for this group from teachers
      const assocs: GroupAssocItem[] = [];
      const seen = new Set<string>();

      teachers.forEach((t) => {
        // 1. Structured assignments
        (t.assignments || [])
          .filter((a) => a.groupId === group.id)
          .forEach((a) => {
            const sub = a.subject?.trim();
            if (sub && !isTeacherDegreeOrTitle(sub)) {
              const key = `${t.id}_${sub.toLowerCase()}`;
              if (!seen.has(key)) {
                seen.add(key);
                assocs.push({
                  id: `assoc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  teacherId: t.id,
                  subject: sub,
                });
              }
            }
          });

        // 2. Legacy fallback
        if ((t.assignedGroupIds || []).includes(group.id) && (!t.assignments || t.assignments.length === 0)) {
          (t.assignedSubjects || [])
            .map((s) => s.trim())
            .filter((s) => s && !isTeacherDegreeOrTitle(s))
            .forEach((sub) => {
              const key = `${t.id}_${sub.toLowerCase()}`;
              if (!seen.has(key)) {
                seen.add(key);
                assocs.push({
                  id: `assoc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  teacherId: t.id,
                  subject: sub,
                });
              }
            });
        }
      });

      // 3. Any leftover group subjects with no teacher assigned
      (group.subjects || []).forEach((sub) => {
        const cleanSub = sub?.trim();
        if (cleanSub && !isTeacherDegreeOrTitle(cleanSub)) {
          const hasTeacherForSub = assocs.some(
            (a) => a.subject.toLowerCase() === cleanSub.toLowerCase()
          );
          if (!hasTeacherForSub) {
            assocs.push({
              id: `assoc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              teacherId: '',
              subject: cleanSub,
            });
          }
        }
      });

      setGroupModalAssocs(assocs);
    } else {
      setEditingGroup(null);
      setGroupForm({
        name: '',
        grade: '10°',
        room: '',
        shift: 'Mañana',
        schoolYear: settings.schoolYear || '2026',
        directorName: '',
        teacherName: '',
        teacherId: '',
      });
      setGroupModalAssocs([]);
    }
    setIsGroupModalOpen(true);
  };

  // Add Association in Modal
  const handleAddAssocToModal = () => {
    const finalSubject = (newAssocCustomSubject.trim() || newAssocSubject.trim());
    if (!finalSubject) {
      alert('Por favor especifica o selecciona una asignatura.');
      return;
    }

    const exists = groupModalAssocs.some(
      (a) =>
        a.teacherId === newAssocTeacherId &&
        a.subject.toLowerCase() === finalSubject.toLowerCase()
    );
    if (exists) {
      alert('Esta asociación de docente y materia ya está agregada.');
      return;
    }

    setGroupModalAssocs((prev) => [
      ...prev,
      {
        id: `assoc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        teacherId: newAssocTeacherId,
        subject: finalSubject,
      },
    ]);
    setNewAssocCustomSubject('');
  };

  // Remove Association from Modal
  const handleRemoveAssocFromModal = (assocId: string) => {
    setGroupModalAssocs((prev) => prev.filter((a) => a.id !== assocId));
  };

  // Start Edit Association in Modal
  const handleStartEditAssoc = (index: number) => {
    const item = groupModalAssocs[index];
    if (!item) return;
    setEditingAssocIndex(index);
    setEditAssocTeacherId(item.teacherId);
    setEditAssocSubject(item.subject);
  };

  // Save Edit Association in Modal
  const handleSaveEditAssoc = (index: number) => {
    if (!editAssocSubject.trim()) {
      alert('La asignatura no puede estar vacía.');
      return;
    }
    setGroupModalAssocs((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              teacherId: editAssocTeacherId,
              subject: editAssocSubject.trim(),
            }
          : item
      )
    );
    setEditingAssocIndex(null);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name?.trim()) {
      alert('Por favor ingresa un nombre para el grupo.');
      return;
    }

    const targetGroupId = editingGroup ? editingGroup.id : `grp-${Date.now()}`;
    const groupSubjects: string[] = Array.from(
      new Set(groupModalAssocs.map((a) => a.subject.trim()).filter(Boolean))
    );
    const assignedTeacherIds: string[] = Array.from(
      new Set(groupModalAssocs.map((a) => a.teacherId).filter(Boolean))
    );

    let updatedGroups: Group[];
    if (editingGroup) {
      updatedGroups = groups.map((g) =>
        g.id === editingGroup.id
          ? ({
              ...g,
              name: groupForm.name?.trim(),
              grade: groupForm.grade?.trim() || '10°',
              room: groupForm.room?.trim() || '',
              shift: groupForm.shift || 'Mañana',
              schoolYear: groupForm.schoolYear?.trim() || settings.schoolYear || '2026',
              directorName: groupForm.directorName?.trim() || groupForm.teacherName?.trim() || '',
              teacherName: groupForm.directorName?.trim() || groupForm.teacherName?.trim() || '',
              teacherId: groupForm.teacherId || '',
              subjects: groupSubjects,
              assignedTeacherIds,
            } as Group)
          : g
      );
    } else {
      const newGroup: Group = {
        id: targetGroupId,
        name: groupForm.name.trim(),
        grade: groupForm.grade?.trim() || '10°',
        room: groupForm.room?.trim() || '',
        shift: groupForm.shift || 'Mañana',
        schoolYear: groupForm.schoolYear?.trim() || settings.schoolYear || '2026',
        directorName: groupForm.directorName?.trim() || groupForm.teacherName?.trim() || '',
        teacherName: groupForm.directorName?.trim() || groupForm.teacherName?.trim() || '',
        teacherId: groupForm.teacherId || '',
        subjects: groupSubjects,
        assignedTeacherIds,
        createdAt: new Date().toISOString().split('T')[0],
      };
      updatedGroups = [...groups, newGroup];
    }
    onUpdateGroups(updatedGroups);

    // Synchronize Teachers' assignments for this group
    const updatedTeachers = teachers.map((t) => {
      // 1. Remove previous assignments for this group
      const otherGroupAssignments = (t.assignments || []).filter(
        (a) => a.groupId !== targetGroupId
      );

      // 2. Add current assignments for this teacher in this group
      const thisTeacherAssocsForGroup = groupModalAssocs.filter(
        (a) => a.teacherId === t.id && a.subject.trim()
      );

      const newAssignmentsForThisGroup = thisTeacherAssocsForGroup.map((a) => ({
        groupId: targetGroupId,
        subject: a.subject.trim(),
        assignedAt: new Date().toISOString(),
      }));

      const finalAssignments = [...otherGroupAssignments, ...newAssignmentsForThisGroup];

      // 3. Update assignedGroupIds
      const newAssignedGroupIds = new Set(t.assignedGroupIds || []);
      if (newAssignmentsForThisGroup.length > 0) {
        newAssignedGroupIds.add(targetGroupId);
      } else {
        newAssignedGroupIds.delete(targetGroupId);
      }

      // 4. Update assignedSubjects (preserve existing + add any new ones)
      const newAssignedSubjects = new Set(t.assignedSubjects || []);
      newAssignmentsForThisGroup.forEach((a) => newAssignedSubjects.add(a.subject));

      return {
        ...t,
        assignments: finalAssignments,
        assignedGroupIds: Array.from(newAssignedGroupIds),
        assignedSubjects: Array.from(newAssignedSubjects),
      };
    });

    onUpdateTeachers(updatedTeachers);
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    const studentsInGroup = students.filter((s) => s.groupId === groupId);
    if (studentsInGroup.length > 0) {
      const proceed = confirm(
        `⚠️ ADVERTENCIA: El grupo "${groupName}" tiene ${studentsInGroup.length} estudiante(s) matriculado(s).\n\nSi eliminas el grupo, estos estudiantes quedarán sin curso asignado. ¿Deseas continuar?`
      );
      if (!proceed) return;
    } else {
      if (!confirm(`¿Estás seguro de eliminar el curso "${groupName}"?`)) return;
    }

    deleteRecordFromMySQL('grupos', groupId).catch((err) => {
      console.error('Error al eliminar curso en MySQL:', err);
    });
    const updated = groups.filter((g) => g.id !== groupId);
    onUpdateGroups(updated);
  };

  // =========================================================================
  // STUDENT CRUD HANDLERS
  // =========================================================================
  const handleOpenStudentModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setStudentForm({ ...student, email: student.email || '' });
    } else {
      setEditingStudent(null);
      setStudentForm({
        documentId: '',
        firstName: '',
        lastName: '',
        groupId: groups[0]?.id || '',
        email: '',
        guardianName: '',
        guardianPhone: '',
        guardianCountryCode: settings.defaultCountryCode || '+57',
        guardianEmail: '',
        guardianRelationship: 'Madre',
        status: 'active',
        observations: '',
        avatarColor: 'bg-indigo-500',
      });
    }
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.firstName?.trim() || !studentForm.lastName?.trim() || !studentForm.documentId?.trim()) {
      alert('Por favor completa el nombre, apellido y documento de identidad del estudiante.');
      return;
    }

    if (editingStudent) {
      const updated = students.map((s) =>
        s.id === editingStudent.id ? ({ ...s, ...studentForm, email: studentForm.email?.trim() || '' } as Student) : s
      );
      onUpdateStudents(updated);
    } else {
      const newStudent: Student = {
        id: `std-${Date.now()}`,
        documentId: studentForm.documentId?.trim() || '',
        firstName: studentForm.firstName?.trim() || '',
        lastName: studentForm.lastName?.trim() || '',
        groupId: studentForm.groupId || groups[0]?.id || '',
        email: studentForm.email?.trim() || '',
        guardianName: studentForm.guardianName?.trim() || 'Acudiente Principal',
        guardianPhone: studentForm.guardianPhone?.trim() || '',
        guardianCountryCode: studentForm.guardianCountryCode || '+57',
        guardianEmail: studentForm.guardianEmail?.trim() || '',
        guardianRelationship: studentForm.guardianRelationship || 'Madre',
        status: studentForm.status || 'active',
        observations: studentForm.observations || '',
        avatarColor: 'bg-indigo-500',
      };
      onUpdateStudents([...students, newStudent]);
    }
    setIsStudentModalOpen(false);
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (confirm(`¿Estás seguro de eliminar permanentemente al estudiante "${studentName}"?`)) {
      deleteRecordFromMySQL('estudiantes', studentId).catch((err) => {
        console.error('Error al eliminar estudiante en MySQL:', err);
      });
      const updated = students.filter((s) => s.id !== studentId);
      onUpdateStudents(updated);
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  // Bulk Student Selection Handlers
  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllFilteredStudents = (filtered: Student[]) => {
    if (selectedStudentIds.size === filtered.length && filtered.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleConfirmBulkMove = () => {
    if (!bulkTargetGroupId || selectedStudentIds.size === 0) return;
    const targetGroup = groups.find((g) => g.id === bulkTargetGroupId);
    const updated = students.map((s) =>
      selectedStudentIds.has(s.id) ? { ...s, groupId: bulkTargetGroupId } : s
    );
    onUpdateStudents(updated);
    const count = selectedStudentIds.size;
    setSelectedStudentIds(new Set());
    setIsBulkMoveModalOpen(false);
    alert(`¡Se cambiaron ${count} estudiantes al grupo "${targetGroup?.name || 'seleccionado'}" exitosamente!`);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedStudentIds.size === 0) return;
    const count = selectedStudentIds.size;
    selectedStudentIds.forEach((id) => {
      deleteRecordFromMySQL('estudiantes', id).catch((err) => {
        console.error('Error al eliminar estudiante en MySQL:', err);
      });
    });
    const updated = students.filter((s) => !selectedStudentIds.has(s.id));
    onUpdateStudents(updated);
    setSelectedStudentIds(new Set());
    setIsBulkDeleteModalOpen(false);
    alert(`¡Se eliminaron ${count} estudiantes correctamente!`);
  };

  // =========================================================================
  // SETTINGS HANDLERS
  // =========================================================================
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(settingsForm);
    setSettingsSaveSuccess(true);
    setTimeout(() => setSettingsSaveSuccess(false), 3000);
  };

  // Filtered lists
  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.specialty.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.documentId.includes(teacherSearch)
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    (g.directorName || g.teacherName || '').toLowerCase().includes(groupSearch.toLowerCase())
  );

  const filteredStudents = students.filter((s) => {
    if (studentGroupFilter !== 'all' && s.groupId !== studentGroupFilter) return false;
    const match =
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.documentId.includes(studentSearch) ||
      s.guardianName.toLowerCase().includes(studentSearch.toLowerCase());
    return match;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Admin Module Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                Panel de Administración Institucional
              </h1>
              <p className="text-xs text-slate-400">
                Gestión centralizada de planta docente, grupos académicos, matrículas y parámetros escolares.
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-bold">
            👨‍🏫 {teachers.length} Docentes
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-bold">
            🏫 {groups.length} Cursos
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-bold">
            🎓 {students.length} Estudiantes
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none pb-1">
        <button
          id="admin-subtab-teachers"
          onClick={() => setActiveSubTab('teachers')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'teachers'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Gestión de Docentes ({teachers.length})</span>
        </button>

        <button
          id="admin-subtab-subjects"
          onClick={() => setActiveSubTab('subjects')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'subjects'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-300" />
          <span>Catálogo de Asignaturas ({settings.institutionSubjects?.length || 15})</span>
        </button>

        <button
          id="admin-subtab-assignments"
          onClick={() => setActiveSubTab('assignments')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'assignments'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Carga Académica / Asignaciones</span>
        </button>

        <button
          id="admin-subtab-groups"
          onClick={() => setActiveSubTab('groups')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'groups'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Cursos & Grupos ({groups.length})</span>
        </button>

        <button
          id="admin-subtab-students"
          onClick={() => setActiveSubTab('students')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'students'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Estudiantes & Contactos ({students.length})</span>
        </button>

        <button
          id="admin-subtab-academic-periods"
          onClick={() => setActiveSubTab('academic_periods')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'academic_periods'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CalendarRange className="w-4 h-4 text-indigo-400" />
          <span>Periodos Académicos ({settings.periods?.length || 4})</span>
        </button>

        <button
          id="admin-subtab-attendance-novelties"
          onClick={() => setActiveSubTab('attendance_novelties')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'attendance_novelties'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <span>Novedades & Asistencia ({settings.attendanceNovelties?.filter(n => n.isActive).length || 8})</span>
        </button>

        <button
          id="admin-subtab-attendance-days"
          onClick={() => setActiveSubTab('attendance_days')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'attendance_days'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Días de Asistencia ({attendanceSessions.length})</span>
        </button>

        <button
          id="admin-subtab-evaluation-siee"
          onClick={() => setActiveSubTab('evaluation_siee')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'evaluation_siee'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Ponderación & SIEE ({settings.evaluationCategories?.length || 4})</span>
        </button>

        <button
          id="admin-subtab-settings"
          onClick={() => setActiveSubTab('settings')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'settings'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Ajustes & Base de Datos</span>
        </button>

        <button
          id="admin-subtab-security"
          onClick={() => setActiveSubTab('security')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'security'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Seguridad & Claves</span>
        </button>

        <button
          id="admin-subtab-mysql"
          onClick={() => setActiveSubTab('mysql')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
            activeSubTab === 'mysql'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40 border border-emerald-500/30'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-300" />
          <span>MySQL (WAMP Server)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. TEACHERS MANAGEMENT SUB-TAB                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar docente o especialidad..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <button
              id="btn-admin-add-teacher"
              onClick={() => handleOpenTeacherModal()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Agregar Nuevo Docente</span>
            </button>
          </div>

          {/* Teachers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-11 h-11 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-md ${
                          teacher.avatarColor || 'bg-indigo-600'
                        }`}
                      >
                        {teacher.name.split(' ').map((n) => n[0]).slice(1, 3).join('') || 'DC'}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100">{teacher.name}</h3>
                        <p className="text-[11px] text-purple-400 font-medium">{teacher.specialty}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        teacher.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {teacher.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{teacher.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{teacher.phone}</span>
                    </div>

                    {/* Teacher Access Password (Admin view) */}
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[11px] text-slate-400 font-medium">Clave de acceso:</span>
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {revealedPasswordId === teacher.id ? (teacher.password || 'docente123') : '••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setRevealedPasswordId(revealedPasswordId === teacher.id ? null : teacher.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                          title={revealedPasswordId === teacher.id ? "Ocultar clave" : "Ver clave"}
                        >
                          {revealedPasswordId === teacher.id ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(teacher.password || 'docente123', `pwd-${teacher.id}`)}
                          className="p-1 rounded text-slate-400 hover:text-purple-400 transition-colors"
                          title="Copiar contraseña"
                        >
                          {copiedId === `pwd-${teacher.id}` ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Asignación de Grados y Cursos */}
                    <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-purple-400">
                          Grados & Cursos Asignados:
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(teacher.assignedGroupIds || []).length} cursos
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {groups
                          .filter((g) => (teacher.assignedGroupIds || []).includes(g.id))
                          .map((g) => (
                            <span
                              key={g.id}
                              className="px-2 py-0.5 rounded-lg bg-purple-950/60 border border-purple-800/50 text-purple-300 text-[10px] font-bold"
                            >
                              {g.name}
                            </span>
                          ))}
                        {(!teacher.assignedGroupIds || teacher.assignedGroupIds.length === 0) && (
                          <span className="text-[10px] text-amber-400/80 italic">
                            Sin cursos asignados aún
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                        Materias que dicta:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {teacher.assignedSubjects.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenTeacherModal(teacher)}
                    className="px-2.5 py-1 rounded-lg bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/40 text-purple-300 text-[11px] font-bold flex items-center space-x-1 transition-colors"
                  >
                    <School className="w-3.5 h-3.5" />
                    <span>Asignar Cursos</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenTeacherModal(teacher)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Editar Docente"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                      className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-800/30 transition-colors"
                      title="Eliminar Docente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.1 SUBJECTS CATALOG SUB-TAB                                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'subjects' && (
        <SubjectsCatalogAdmin
          settings={settings}
          teachers={teachers}
          groups={groups}
          onUpdateSettings={onUpdateSettings}
          onUpdateTeachers={onUpdateTeachers}
          onUpdateGroups={onUpdateGroups}
        />
      )}

      {/* ========================================================================= */}
      {/* 1.2 ACADEMIC ASSIGNMENTS SUB-TAB                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'assignments' && (
        <AcademicAssignmentsAdmin
          teachers={teachers}
          groups={groups}
          students={students}
          settings={settings}
          onUpdateTeachers={onUpdateTeachers}
          onUpdateGroups={onUpdateGroups}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. GROUPS & COURSES MANAGEMENT SUB-TAB                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar curso o grado..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveSubTab('assignments')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs border border-purple-800/40 transition-all flex items-center justify-center space-x-1.5"
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Asignar Carga Docente</span>
              </button>

              <button
                id="btn-admin-add-group"
                onClick={() => handleOpenGroupModal()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nuevo Curso</span>
              </button>
            </div>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => {
              const enrolledCount = students.filter((s) => s.groupId === group.id).length;
              
              // Teachers linked to this group
              const teachersForGroup = teachers.filter((t) =>
                (t.assignedGroupIds || []).includes(group.id) ||
                (t.assignments || []).some((a) => a.groupId === group.id)
              );

              return (
                <div
                  key={group.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-base">
                          {group.grade}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-100">{group.name}</h3>
                          <p className="text-[11px] text-slate-400">
                            Jornada {group.shift} {group.room ? `• Salón ${group.room}` : ''} • {group.schoolYear || settings.schoolYear || '2026'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {enrolledCount} alumnos
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-xs">
                      {/* Docentes Asignados */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-400 block mb-1">
                          Docentes con Carga ({teachersForGroup.length}):
                        </span>
                        {teachersForGroup.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teachersForGroup.map((t) => (
                              <span
                                key={t.id}
                                className="px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-200 border border-purple-800/30 text-[10px] font-medium"
                              >
                                {t.name} ({t.specialty})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">
                            Sin docentes asociados aún
                          </p>
                        )}
                      </div>

                      {/* Asignaturas */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Materias Registradas ({group.subjects?.length || 0}):
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveSubTab('assignments')}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            + Vincular Materia
                          </button>
                        </div>

                        {group.subjects && group.subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                            {group.subjects.map((subj, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]"
                              >
                                {subj}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">
                            Sin materias registradas aún
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenGroupModal(group)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Editar Datos del Curso"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-800/30 transition-colors"
                      title="Eliminar Curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STUDENTS & CONTACTS MANAGEMENT SUB-TAB                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, documento o acudiente..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <select
                value={studentGroupFilter}
                onChange={(e) => setStudentGroupFilter(e.target.value)}
                className="py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">Todos los Cursos</option>
                {sortedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-admin-add-student"
              onClick={() => handleOpenStudentModal()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Matricular Nuevo Estudiante</span>
            </button>
          </div>

          {/* Bulk Selection Toolbar */}
          {selectedStudentIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-950/40 border border-purple-800/60 p-3.5 rounded-2xl animate-fade-in shadow-lg">
              <div className="flex items-center space-x-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white shadow">
                  {selectedStudentIds.size}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {selectedStudentIds.size === 1 ? '1 estudiante seleccionado' : `${selectedStudentIds.size} estudiantes seleccionados`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkMoveModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Cambiar de Grupo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Seleccionados</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(new Set())}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
                >
                  Desmarcar
                </button>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold bg-slate-950/40">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                        onChange={() => handleSelectAllFilteredStudents(filteredStudents)}
                        className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Estudiante</th>
                    <th className="py-3 px-3">Documento</th>
                    <th className="py-3 px-3">Curso</th>
                    <th className="py-3 px-3">Acudiente & Contacto</th>
                    <th className="py-3 px-3">Parentesco</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((student) => {
                    const group = groups.find((g) => g.id === student.groupId);
                    const isSelected = selectedStudentIds.has(student.id);
                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-purple-950/30 hover:bg-purple-950/40' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(student.id)}
                            className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                                student.avatarColor || 'bg-indigo-600'
                              }`}
                            >
                              {student.firstName[0]}
                            </div>
                            <div>
                              <span className="font-bold text-slate-200 block">
                                {student.firstName} {student.lastName}
                              </span>
                              {student.email && (
                                <span className="text-[10px] text-teal-300 font-mono flex items-center space-x-1" title={student.email}>
                                  <Mail className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                                  <span className="truncate max-w-[180px]">{student.email}</span>
                                </span>
                              )}
                              {student.observations && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                  {student.observations}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300 font-bold">
                          {student.documentId}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold text-[11px]">
                            {group?.name || 'Sin curso'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-200 font-medium block">{student.guardianName}</span>
                          <span className="text-emerald-400 font-mono text-[11px]">
                            {student.guardianCountryCode} {student.guardianPhone}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {student.guardianRelationship}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenSingleMove(student)}
                              className="p-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white border border-indigo-800/30 transition-colors"
                              title="Reasignar a otro Grupo / Salón"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStudentModal(student)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Editar Ficha Estudiante"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-800/30 transition-colors"
                              title="Eliminar Estudiante"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACADEMIC PERIODS CONFIGURATION SUB-TAB                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'academic_periods' && (
        <AcademicPeriodsAdmin
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. SETTINGS & DATABASE BACKUP SUB-TAB                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Institutional Parameters Form */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-purple-400" />
              <span>Parámetros Institucionales</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Nombre de la Institución:</label>
                <input
                  type="text"
                  value={settingsForm.schoolName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Año Lectivo:</label>
                  <input
                    type="text"
                    value={settingsForm.schoolYear}
                    onChange={(e) => setSettingsForm({ ...settingsForm, schoolYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Periodo Activo:</label>
                  <input
                    type="text"
                    value={settingsForm.currentPeriod}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currentPeriod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Código País WhatsApp por defecto:</label>
                <input
                  type="text"
                  value={settingsForm.defaultCountryCode}
                  onChange={(e) => setSettingsForm({ ...settingsForm, defaultCountryCode: e.target.value })}
                  placeholder="+57"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none"
                />
              </div>

              {settingsSaveSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Configuración institucional actualizada correctamente.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Parámetros</span>
              </button>
            </form>
          </div>

          {/* Database Backup & Restore */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Base de Datos & Copias de Seguridad</span>
            </h3>
            <p className="text-xs text-slate-400">
              Descarga o restaura la base de datos completa con docentes, grupos, estudiantes, notas y asistencias.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={exportFullDatabaseBackup}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Copia de Seguridad (.JSON)</span>
              </button>

              <label className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer block text-center">
                <Upload className="w-4 h-4 text-indigo-400 inline" />
                <span>Restaurar Copia de Seguridad desde Archivo JSON</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        await restoreDatabaseFromBackup(file);
                        alert('¡Base de datos restaurada con éxito!');
                        window.location.reload();
                      } catch (err) {
                        alert('Error al restaurar: archivo inválido.');
                      }
                    }
                  }}
                />
              </label>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('⚠️ ¿Estás seguro de restablecer todos los datos a los valores de fábrica? Esta acción no se puede deshacer.')) {
                      resetToFactoryDefaults();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Restablecer Datos de Demostración</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ATTENDANCE & NOVELTIES CONFIGURATION SUB-TAB                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'attendance_novelties' && (
        <AttendanceNoveltiesAdmin
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* ========================================================================= */}
      {/* 5.0 ATTENDANCE DAYS AUDIT & DELETION SUB-TAB                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'attendance_days' && (
        <div className="space-y-6">
          {/* Header Card & KPI Summary */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2">
                    <span>Auditoría y Gestión de Días de Asistencia</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                      Administrador
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Supervisa las sesiones de asistencia registradas por fecha y grupo. Puedes auditar o eliminar días completos si hubo errores.
                  </p>
                </div>
              </div>

              {selectedAttendanceSessionKeys.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDeleteAttendanceSessions}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-all flex items-center space-x-2 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar {selectedAttendanceSessionKeys.size} Días Seleccionados</span>
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
                <span className="text-slate-400 block text-[11px] font-medium">Días Únicos Registrados</span>
                <span className="text-lg font-black text-white">
                  {Array.from(new Set(attendanceSessions.map((s) => s.date))).length}
                </span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
                <span className="text-slate-400 block text-[11px] font-medium">Sesiones / Grupos Tomados</span>
                <span className="text-lg font-black text-indigo-300">
                  {attendanceSessions.length}
                </span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
                <span className="text-slate-400 block text-[11px] font-medium">Registros Individuales</span>
                <span className="text-lg font-black text-emerald-300">
                  {attendance.length}
                </span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
                <span className="text-slate-400 block text-[11px] font-medium">Novedades / Faltas</span>
                <span className="text-lg font-black text-amber-300">
                  {attendanceSessions.reduce((acc, s) => acc + s.absentCount + s.lateCount + s.noveltyCount, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por fecha (YYYY-MM-DD) o nombre de grupo..."
                  value={attendanceSearchQuery}
                  onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={attendanceGroupFilter}
                onChange={(e) => setAttendanceGroupFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos los cursos ({groups.length})</option>
                {sortedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.grade})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1">
                <span className="text-slate-400 text-[11px] font-medium">Desde:</span>
                <input
                  type="date"
                  value={attendanceStartDateFilter}
                  onChange={(e) => setAttendanceStartDateFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1">
                <span className="text-slate-400 text-[11px] font-medium">Hasta:</span>
                <input
                  type="date"
                  value={attendanceEndDateFilter}
                  onChange={(e) => setAttendanceEndDateFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none"
                />
              </div>

              {(attendanceSearchQuery || attendanceGroupFilter !== 'all' || attendanceStartDateFilter || attendanceEndDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceSearchQuery('');
                    setAttendanceGroupFilter('all');
                    setAttendanceStartDateFilter('');
                    setAttendanceEndDateFilter('');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  title="Limpiar filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Select all bar if items exist */}
          {filteredAttendanceSessions.length > 0 && (
            <div className="flex items-center justify-between px-2 text-xs text-slate-400">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={
                    filteredAttendanceSessions.length > 0 &&
                    filteredAttendanceSessions.every((s) => selectedAttendanceSessionKeys.has(s.key))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newSet = new Set(selectedAttendanceSessionKeys);
                      filteredAttendanceSessions.forEach((s) => newSet.add(s.key));
                      setSelectedAttendanceSessionKeys(newSet);
                    } else {
                      const newSet = new Set(selectedAttendanceSessionKeys);
                      filteredAttendanceSessions.forEach((s) => newSet.delete(s.key));
                      setSelectedAttendanceSessionKeys(newSet);
                    }
                  }}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-300">Seleccionar todos los días visibles ({filteredAttendanceSessions.length})</span>
              </label>

              <span>
                Mostrando {filteredAttendanceSessions.length} de {attendanceSessions.length} registros de día
              </span>
            </div>
          )}

          {/* List of Attendance Sessions */}
          {filteredAttendanceSessions.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-300 text-sm">No se encontraron registros de asistencia</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hay sesiones de asistencia que coincidan con los filtros seleccionados o aún no se han tomado asistencias.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAttendanceSessions.map((session) => {
                const isSelected = selectedAttendanceSessionKeys.has(session.key);

                return (
                  <div
                    key={session.key}
                    className={`bg-slate-900/90 border rounded-2xl p-4.5 shadow-lg transition-all space-y-3 relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 bg-emerald-950/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedAttendanceSessionKeys);
                              if (e.target.checked) {
                                newSet.add(session.key);
                              } else {
                                newSet.delete(session.key);
                              }
                              setSelectedAttendanceSessionKeys(newSet);
                            }}
                            className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-emerald-400 text-sm">
                                {session.date}
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-xs mt-0.5">
                              {session.groupName}
                            </h4>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 text-[10px] font-bold">
                          {session.groupGrade} • {session.groupShift}
                        </span>
                      </div>

                      {/* Badges Breakdown */}
                      <div className="grid grid-cols-3 gap-1.5 pt-3 mt-3 border-t border-slate-800/80 text-[10px]">
                        <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-lg p-1.5 text-center">
                          <span className="text-emerald-400 font-bold block">{session.presentCount}</span>
                          <span className="text-emerald-500/80 text-[9px]">Presentes</span>
                        </div>
                        <div className="bg-amber-950/40 border border-amber-800/30 rounded-lg p-1.5 text-center">
                          <span className="text-amber-400 font-bold block">{session.lateCount}</span>
                          <span className="text-amber-500/80 text-[9px]">Tardanzas</span>
                        </div>
                        <div className="bg-rose-950/40 border border-rose-800/30 rounded-lg p-1.5 text-center">
                          <span className="text-rose-400 font-bold block">{session.absentCount}</span>
                          <span className="text-rose-500/80 text-[9px]">Ausencias</span>
                        </div>
                      </div>

                      {/* Extra info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2">
                        <span>Total registrados: <strong className="text-slate-200">{session.recordsCount}</strong></span>
                        {session.excusedCount > 0 && (
                          <span className="text-sky-400 font-medium">Excusas: {session.excusedCount}</span>
                        )}
                        {session.uniformIncompleteCount > 0 && (
                          <span className="text-teal-400 font-medium">Uniforme: {session.uniformIncompleteCount}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      {onNavigateToAttendance && (
                        <button
                          type="button"
                          onClick={() => onNavigateToAttendance(session.groupId, session.date)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ver en Asistencia</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteAttendanceSession(session.date, session.groupId)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-800/30 text-[11px] font-semibold transition-colors flex items-center space-x-1.5 ml-auto cursor-pointer"
                        title="Eliminar este día de asistencia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Día</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5.1 EVALUATION & SIEE WEIGHTING SUB-TAB                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'evaluation_siee' && (
        <EvaluationSIEEAdmin
          groups={groups}
          teachers={teachers}
          settings={settings}
          subjectConfigs={subjectConfigs}
          onUpdateSettings={onUpdateSettings}
          onUpdateSubjectConfigs={onUpdateSubjectConfigs}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. SECURITY & PASSWORD CREDENTIALS SUB-TAB                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'security' && (
        <SecuritySettingsModule
          currentUser={{
            id: 'usr-admin',
            name: 'Administrador / Rectoría',
            role: 'admin',
            email: settings.adminRecoveryEmail || 'rectoria@colegio.edu.co',
          }}
          settings={settings}
          teachers={teachers}
          onUpdateSettings={onUpdateSettings}
          onUpdateTeachers={onUpdateTeachers}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. MYSQL / WAMP SERVER MIGRATION & SYNC SUB-TAB                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'mysql' && (
        <MySQLMigrationAdmin
          teachers={teachers}
          groups={groups}
          students={students}
          attendance={attendance}
          settings={settings}
          subjectConfigs={subjectConfigs}
          onDataLoadedFromMySQL={(loadedData) => {
            if (loadedData.teachers) onUpdateTeachers(loadedData.teachers);
            if (loadedData.groups) onUpdateGroups(loadedData.groups);
            if (loadedData.students) onUpdateStudents(loadedData.students);
            if (loadedData.attendance && onUpdateAttendance) onUpdateAttendance(loadedData.attendance);
            if (loadedData.settings) onUpdateSettings(loadedData.settings);
            if (loadedData.subjectConfigs && onUpdateSubjectConfigs) onUpdateSubjectConfigs(loadedData.subjectConfigs);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT TEACHER                                              */}
      {/* ========================================================================= */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto flex flex-col text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100">
                {editingTeacher ? 'Editar Docente' : 'Agregar Nuevo Docente'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Nombre Completo del Docente:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Prof. Andrés López"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Documento de Identidad:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 80123456"
                    value={teacherForm.documentId}
                    onChange={(e) => setTeacherForm({ ...teacherForm, documentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Celular / WhatsApp:</label>
                  <input
                    type="text"
                    placeholder="Ej: 3158901234"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Correo Electrónico:</label>
                <input
                  type="email"
                  placeholder="andres.lopez@colegio.edu.co"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Especialidad / Perfil Profesional:</label>
                <input
                  type="text"
                  placeholder="Ej: Licenciado en Matemáticas y Física"
                  value={teacherForm.specialty}
                  onChange={(e) => setTeacherForm({ ...teacherForm, specialty: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              {/* Password Setting Section */}
              <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-purple-300 font-bold flex items-center space-x-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                    <span>Contraseña de Acceso Docente:</span>
                  </label>
                  <span className="text-[10px] text-purple-400 font-medium">Requerida para inicio de sesión</span>
                </div>

                <div className="relative">
                  <input
                    type={showPasswordInModal ? "text" : "password"}
                    required
                    placeholder="Escribe la contraseña (ej: docente123)"
                    value={teacherForm.password || ''}
                    onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 bg-slate-800 border border-purple-500/50 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                    title={showPasswordInModal ? "Ocultar" : "Mostrar"}
                  >
                    {showPasswordInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="px-2.5 py-1 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700/50 text-[11px] text-purple-200 font-medium transition-colors"
                  >
                    ⚡ Generar clave aleatoria
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherForm((prev) => ({ ...prev, password: 'docente123' }));
                      setShowPasswordInModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition-colors"
                  >
                    Restablecer a &quot;docente123&quot;
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  El docente necesitará esta contraseña para ingresar al sistema, registrar notas y tomar asistencia.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Materias que dicta (separadas por coma):</label>
                <input
                  type="text"
                  placeholder="Ej: Matemáticas, Física, Cálculo"
                  value={subjectInputText}
                  onChange={(e) => setSubjectInputText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              {/* ASIGNACIÓN DE GRADOS Y CURSOS / GRUPOS AL DOCENTE */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                      <School className="w-4 h-4 text-purple-400" />
                      <span>Asignación Académica: Grados y Cursos Permitidos</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      El docente solo podrá ver y modificar notas en los cursos asignados aquí o creados por él mismo.
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherForm((prev) => ({
                          ...prev,
                          assignedGroupIds: groups.map((g) => g.id),
                          assignedGrades: availableSchoolGrades,
                        }));
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium transition-colors"
                    >
                      Seleccionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherForm((prev) => ({
                          ...prev,
                          assignedGroupIds: [],
                          assignedGrades: [],
                        }));
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* 1. Grade-level toggle buttons */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Paso 1: Asignar por Grado Escolar Completo
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSchoolGrades.map((grade) => {
                      const groupsInGrade = groups.filter((g) => g.grade === grade);
                      const allSelected = groupsInGrade.length > 0 && groupsInGrade.every((g) => (teacherForm.assignedGroupIds || []).includes(g.id));
                      const someSelected = groupsInGrade.some((g) => (teacherForm.assignedGroupIds || []).includes(g.id));

                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            const groupIdsInGrade = groupsInGrade.map((g) => g.id);
                            const currentAssigned = new Set(teacherForm.assignedGroupIds || []);
                            const currentGrades = new Set(teacherForm.assignedGrades || []);

                            if (allSelected) {
                              // Deselect all groups in grade
                              groupIdsInGrade.forEach((id) => currentAssigned.delete(id));
                              currentGrades.delete(grade);
                            } else {
                              // Select all groups in grade
                              groupIdsInGrade.forEach((id) => currentAssigned.add(id));
                              currentGrades.add(grade);
                            }

                            setTeacherForm((prev) => ({
                              ...prev,
                              assignedGroupIds: Array.from(currentAssigned),
                              assignedGrades: Array.from(currentGrades),
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                            allSelected
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/40'
                              : someSelected
                              ? 'bg-purple-950/60 text-purple-200 border-purple-700/60'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span>Grado {grade}</span>
                          <span className="text-[10px] opacity-75 font-normal">
                            ({groupsInGrade.length} {groupsInGrade.length === 1 ? 'curso' : 'cursos'})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Group/Course individual checkboxes */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Paso 2: Cursos y Grupos Específicos
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {sortedGroups.map((group) => {
                      const isAssigned = (teacherForm.assignedGroupIds || []).includes(group.id);
                      const studentCount = students.filter((s) => s.groupId === group.id).length;

                      return (
                        <label
                          key={group.id}
                          className={`flex items-center space-x-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                            isAssigned
                              ? 'bg-purple-950/40 border-purple-600/70 text-slate-100'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const currentAssigned = new Set(teacherForm.assignedGroupIds || []);
                              if (checked) {
                                currentAssigned.add(group.id);
                              } else {
                                currentAssigned.delete(group.id);
                              }

                              const newGroupIds = Array.from(currentAssigned);
                              const derivedGrades = Array.from(
                                new Set(groups.filter((g) => newGroupIds.includes(g.id)).map((g) => g.grade))
                              );

                              setTeacherForm((prev) => ({
                                ...prev,
                                assignedGroupIds: newGroupIds,
                                assignedGrades: derivedGrades,
                              }));
                            }}
                            className="w-4 h-4 text-purple-600 bg-slate-800 border-slate-700 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate text-slate-200">{group.name}</span>
                              <span className="text-[10px] text-purple-400 font-medium px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                                {group.grade}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              Jornada {group.shift} • {studentCount} estudiantes
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-purple-300 bg-purple-950/30 px-3 py-1.5 rounded-xl border border-purple-900/30">
                  <span>Cursos asignados actualmente:</span>
                  <span className="font-bold font-mono text-white">
                    {(teacherForm.assignedGroupIds || []).length} de {groups.length} cursos
                  </span>
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm pt-3 pb-1 border-t border-slate-800 flex items-center justify-end space-x-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-950/50 cursor-pointer"
                >
                  Guardar Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT GROUP                                                */}
      {/* ========================================================================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto flex flex-col text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100">
                {editingGroup ? 'Editar Curso / Grupo' : 'Agregar Nuevo Curso'}
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Nombre Completo del Curso:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Grado 10° A"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Grado Escolar:</label>
                  <input
                    type="text"
                    placeholder="Ej: 10°, 9°, 11°, 8°"
                    value={groupForm.grade}
                    onChange={(e) => setGroupForm({ ...groupForm, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Salón / Aula:</label>
                  <input
                    type="text"
                    placeholder="Ej: Aula 204"
                    value={groupForm.room}
                    onChange={(e) => setGroupForm({ ...groupForm, room: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Jornada:</label>
                  <select
                    value={groupForm.shift}
                    onChange={(e) => setGroupForm({ ...groupForm, shift: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Única">Única</option>
                    <option value="Nocturna">Nocturna</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Año Lectivo:</label>
                  <input
                    type="text"
                    placeholder="Ej: 2026"
                    value={groupForm.schoolYear || settings.schoolYear || '2026'}
                    onChange={(e) => setGroupForm({ ...groupForm, schoolYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Docente Titular / Director(a) de Grupo:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={groupForm.teacherId || ''}
                    onChange={(e) => {
                      const selTeacher = teachers.find((t) => t.id === e.target.value);
                      setGroupForm({
                        ...groupForm,
                        teacherId: e.target.value,
                        directorName: selTeacher ? selTeacher.name : groupForm.directorName,
                        teacherName: selTeacher ? selTeacher.name : groupForm.teacherName,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  >
                    <option value="">-- Seleccionar de la lista de docentes --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialty})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="O escribe el nombre del Director(a)..."
                    value={groupForm.directorName || groupForm.teacherName || ''}
                    onChange={(e) =>
                      setGroupForm({
                        ...groupForm,
                        directorName: e.target.value,
                        teacherName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* ================================================================= */}
              {/* SECTION: GESTIÓN DE DOCENTES Y ASIGNATURAS VINCULADAS AL GRUPO    */}
              {/* ================================================================= */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>Asignación de Docentes y Materias del Curso</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Asocia los profesores con sus respectivas asignaturas para este curso. Puedes agregar, editar o quitar asociaciones.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-950/60 text-purple-300 rounded-lg border border-purple-800/40">
                    {groupModalAssocs.length} {groupModalAssocs.length === 1 ? 'materia' : 'materias'}
                  </span>
                </div>

                {/* List of current group associations */}
                {groupModalAssocs.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {groupModalAssocs.map((assoc, idx) => {
                      const teacher = teachers.find((t) => t.id === assoc.teacherId);
                      const isEditing = editingAssocIndex === idx;

                      if (isEditing) {
                        return (
                          <div
                            key={assoc.id || idx}
                            className="p-2.5 bg-purple-950/40 border border-purple-600 rounded-xl space-y-2 text-xs"
                          >
                            <div className="font-bold text-[11px] text-purple-200 flex items-center justify-between">
                              <span>Editar Asociación</span>
                              <span className="text-[10px] text-slate-400">Fila #{idx + 1}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 font-medium block mb-0.5">Docente:</label>
                                <select
                                  value={editAssocTeacherId}
                                  onChange={(e) => setEditAssocTeacherId(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs"
                                >
                                  <option value="">Sin docente asignado</option>
                                  {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} {t.specialty ? `(${t.specialty})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 font-medium block mb-0.5">Asignatura:</label>
                                <input
                                  type="text"
                                  value={editAssocSubject}
                                  onChange={(e) => setEditAssocSubject(e.target.value)}
                                  placeholder="Nombre de la asignatura"
                                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end space-x-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingAssocIndex(null)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-semibold hover:bg-slate-700"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditAssoc(idx)}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold"
                              >
                                Guardar Cambio
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={assoc.id || idx}
                          className="flex items-center justify-between p-2 bg-slate-800/80 border border-slate-700/80 rounded-xl hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                              {assoc.subject[0] || 'A'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-100 text-xs block truncate">
                                {assoc.subject}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {teacher ? (
                                  <span className="text-purple-300 font-medium">
                                    👨‍🏫 {teacher.name} {teacher.specialty ? `• ${teacher.specialty}` : ''}
                                  </span>
                                ) : (
                                  <span className="text-amber-400/80 italic">Sin docente asignado</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditAssoc(idx)}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                              title="Editar materia o docente"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAssocFromModal(assoc.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/40 transition-colors"
                              title="Quitar asociación de este curso"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-slate-500 text-xs italic">
                    No hay asignaturas asociadas todavía a este curso. Agrega la primera abajo.
                  </div>
                )}

                {/* Sub-Form: Add New Teacher-Subject Association */}
                <div className="p-3 bg-slate-950/60 border border-slate-800/90 rounded-2xl space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    + Vincular Nueva Materia y Docente al Curso
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block mb-0.5">
                        Seleccionar Docente:
                      </label>
                      <select
                        value={newAssocTeacherId}
                        onChange={(e) => setNewAssocTeacherId(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
                      >
                        <option value="">Sin docente específico</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.specialty || 'Docente'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block mb-0.5">
                        Catálogo de Materias:
                      </label>
                      <select
                        value={newAssocSubject}
                        onChange={(e) => {
                          setNewAssocSubject(e.target.value);
                          setNewAssocCustomSubject('');
                        }}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
                      >
                        {(settings.institutionSubjects && settings.institutionSubjects.length > 0
                          ? settings.institutionSubjects
                          : DEFAULT_INSTITUTION_SUBJECTS
                        ).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-medium block mb-0.5">
                      O escribir materia personalizada (opcional):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Ej: Tecnología e Informática, Robótica, Ética..."
                        value={newAssocCustomSubject}
                        onChange={(e) => setNewAssocCustomSubject(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddAssocToModal}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center space-x-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm pt-3 pb-1 border-t border-slate-800 flex items-center justify-end space-x-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-950/50 cursor-pointer"
                >
                  Guardar Curso y Asignaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT STUDENT                                              */}
      {/* ========================================================================= */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto flex flex-col text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100">
                {editingStudent ? 'Editar Ficha del Estudiante' : 'Matricular Nuevo Estudiante'}
              </h3>
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Documento de Identidad (T.I. / R.C.):</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1098234501"
                  value={studentForm.documentId}
                  onChange={(e) => setStudentForm({ ...studentForm, documentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Nombres:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Alejandro"
                    value={studentForm.firstName}
                    onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Apellidos:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Ramírez Silva"
                    value={studentForm.lastName}
                    onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Curso / Grupo:</label>
                <select
                  value={studentForm.groupId}
                  onChange={(e) => setStudentForm({ ...studentForm, groupId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                >
                  {sortedGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.shift})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  <span>Correo Electrónico del Estudiante (Opcional):</span>
                </label>
                <input
                  type="email"
                  placeholder="Ej: estudiante@colegio.edu.co"
                  value={studentForm.email || ''}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Nombre del Acudiente (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ej: Marta Silva"
                    value={studentForm.guardianName}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Parentesco:</label>
                  <select
                    value={studentForm.guardianRelationship}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianRelationship: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                  >
                    <option value="Madre">Madre</option>
                    <option value="Padre">Padre</option>
                    <option value="Acudiente">Acudiente</option>
                    <option value="Tutor">Tutor</option>
                    <option value="Abuelo/a">Abuelo/a</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">Cód. País:</label>
                  <input
                    type="text"
                    placeholder="+57"
                    value={studentForm.guardianCountryCode}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianCountryCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-slate-400 font-bold block">Teléfono / WhatsApp Acudiente:</label>
                  <input
                    type="text"
                    placeholder="3158901234"
                    value={studentForm.guardianPhone}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Observaciones Pedagógicas / Convivencia:</label>
                <textarea
                  rows={2}
                  placeholder="Anotaciones importantes sobre el estudiante..."
                  value={studentForm.observations}
                  onChange={(e) => setStudentForm({ ...studentForm, observations: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm pt-3 pb-1 border-t border-slate-800 flex items-center justify-end space-x-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-950/50 cursor-pointer"
                >
                  Guardar Estudiante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Single Move Student Modal */}
      {isSingleMoveModalOpen && movingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md w-full space-y-4 my-auto max-h-[92dvh] overflow-y-auto text-slate-100">
            <div className="flex items-center space-x-3 text-indigo-400">
              <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-800/40">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Reasignar Estudiante de Grupo</h3>
                <p className="text-xs text-slate-400">Transferir estudiante a otro curso / salón</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1 text-xs">
              <span className="text-slate-400 block text-[11px]">Estudiante:</span>
              <span className="font-bold text-white text-sm block">
                {movingStudent.firstName} {movingStudent.lastName}
              </span>
              <span className="font-mono text-slate-400 text-[11px]">Doc: {movingStudent.documentId}</span>
              <div className="pt-1 text-[11px] text-slate-300">
                Grupo actual: <strong className="text-purple-300">{groups.find((g) => g.id === movingStudent.groupId)?.name || 'Sin grupo'}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nuevo Grupo Académico de Destino:</label>
              <select
                value={singleTargetGroupId}
                onChange={(e) => setSingleTargetGroupId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {sortedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.grade} - {g.shift})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsSingleMoveModalOpen(false);
                  setMovingStudent(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleMove}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Guardar Reasignación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move Group Modal */}
      {isBulkMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md w-full space-y-4 my-auto max-h-[92dvh] overflow-y-auto text-slate-100">
            <div className="flex items-center space-x-3 text-indigo-400">
              <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-800/40">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Cambio Masivo de Grupo</h3>
                <p className="text-xs text-slate-400">Reasignar estudiantes a otro salón</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Estás a punto de transferir a <strong className="text-purple-400">{selectedStudentIds.size} estudiante(s)</strong> al siguiente grupo académico:
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Seleccionar Grupo de Destino:</label>
              <select
                value={bulkTargetGroupId}
                onChange={(e) => setBulkTargetGroupId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {sortedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.grade} - {g.shift})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkMoveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkMove}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirmar Reasignación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Students Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-rose-900/60 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md w-full space-y-4 my-auto max-h-[92dvh] overflow-y-auto text-slate-100">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/40">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Eliminar Estudiantes Masivamente</h3>
                <p className="text-xs text-rose-400">Acción permanente e irreversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente a los <strong className="text-rose-400">{selectedStudentIds.size} estudiante(s)</strong> seleccionados del sistema institucional?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Sí, Eliminar Estudiantes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
