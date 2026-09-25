import React, { useState, useMemo, useEffect } from 'react';
import { 
  Group, 
  Student, 
  Activity, 
  GradeRecord, 
  SchoolSettings, 
  DeliveryStatus, 
  ActivityType,
  EvaluationCategory,
  SubjectConfig,
  AttendanceRecord,
  Teacher,
  AuthUser,
  DriveFileAttachment,
  RemedialRecord
} from '../types';
import { deleteRecordFromMySQL } from '../utils/mysqlService';
import { resolveActiveTeacher, getSubjectsForGroupAndTeacher, isTeacherDegreeOrTitle } from '../utils/teacherUtils';
import { sortGroupsAscending } from '../utils/groupUtils';
import { 
  Plus, 
  GraduationCap, 
  FileSpreadsheet, 
  Send, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  Award, 
  Trash2,
  Edit2,
  Sliders,
  Table,
  CheckCheck,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  UserCheck,
  BarChart3,
  Search,
  ChevronRight,
  ChevronLeft,
  Lock,
  Unlock,
  ShieldCheck,
  School,
  UserPlus,
  PlusCircle,
  X,
  Info,
  UserX,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  LayoutGrid,
  ExternalLink,
  MessageSquare,
  Percent,
  ClipboardList,
  Check,
  CheckSquare
} from 'lucide-react';
import { generateGradeMessage, generateMasterGradebookMessage, createWhatsAppUrl } from '../utils/whatsapp';
import { exportGradesToExcel, exportMasterGradebookToExcel } from '../utils/excel';
import { 
  DEFAULT_EVALUATION_CATEGORIES, 
  DEFAULT_ATTENDANCE_NOVELTIES,
  getStoredData, 
  saveStoredData 
} from '../utils/storage';
import { resolvePeriodByDate, DEFAULT_ACADEMIC_PERIODS } from '../utils/periods';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { BulkWhatsAppQueueModal, QueueItem } from './BulkWhatsAppQueueModal';
import { EvaluationWeightingModal } from './EvaluationWeightingModal';
import { StudentRouletteModal } from './StudentRouletteModal';
import { DriveAttachmentsManager } from './DriveAttachmentsManager';
import { GoogleDriveExplorerModal } from './GoogleDriveExplorerModal';
import { buildActivityFolderPathSegments } from '../utils/googleDrive';
import { PeriodRemedialsView } from './PeriodRemedialsView';

interface GradesModuleProps {
  groups: Group[];
  students: Student[];
  activities: Activity[];
  grades: GradeRecord[];
  settings: SchoolSettings;
  attendance?: AttendanceRecord[];
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  subjectConfigs?: SubjectConfig[];
  remedials?: RemedialRecord[];
  onUpdateActivities: (activities: Activity[]) => void;
  onUpdateGrades: (grades: GradeRecord[]) => void;
  onUpdateActivitiesAndGrades?: (activities: Activity[], grades: GradeRecord[]) => void;
  onUpdateGroups?: (groups: Group[]) => void;
  onUpdateStudents?: (students: Student[]) => void;
  onUpdateTeachers?: (teachers: Teacher[]) => void;
  onUpdateSubjectConfigs?: (configs: SubjectConfig[]) => void;
  onUpdateRemedials?: (remedials: RemedialRecord[]) => void;
  onLogNotification?: (
    studentId: string, 
    message: string, 
    type?: 'attendance' | 'late' | 'absent' | 'uniform' | 'grade' | 'general',
    meta?: { groupId?: string; groupName?: string; teacherId?: string; teacherName?: string }
  ) => void;
}

export const GradesModule: React.FC<GradesModuleProps> = ({
  groups,
  students,
  activities,
  grades,
  settings,
  attendance = [],
  currentUser,
  teachers = [],
  subjectConfigs = [],
  remedials = [],
  onUpdateActivities,
  onUpdateGrades,
  onUpdateActivitiesAndGrades,
  onUpdateGroups,
  onUpdateStudents,
  onUpdateTeachers,
  onUpdateSubjectConfigs,
  onUpdateRemedials,
  onLogNotification,
}) => {
  const configuredPeriods = useMemo(() => {
    if (settings.periods && settings.periods.length > 0) {
      return settings.periods;
    }
    return DEFAULT_ACADEMIC_PERIODS;
  }, [settings.periods]);

  const activeDatePeriod = useMemo(() => {
    return resolvePeriodByDate(configuredPeriods);
  }, [configuredPeriods]);

  const [viewMode, setViewMode] = useState<'matrix' | 'master_gradebook' | 'activity' | 'remedials'>('matrix');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState<string>('Matemáticas');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    () => activeDatePeriod?.name || configuredPeriods[0]?.name || 'Periodo 1'
  );
  const [activeActivityId, setActiveActivityId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>('all');

  // Role & Teacher Access calculations
  const isTeacher = currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';
  const isParent = currentUser?.role === 'parent';

  const activeTeacher = useMemo(() => {
    return resolveActiveTeacher(currentUser, teachers);
  }, [currentUser, teachers]);

  // Keep selected period in sync with configured periods if period changes
  useEffect(() => {
    if (configuredPeriods.length > 0) {
      const exists = configuredPeriods.some((p) => p.name === selectedPeriod);
      if (!exists) {
        setSelectedPeriod(activeDatePeriod?.name || configuredPeriods[0].name);
      }
    }
  }, [configuredPeriods, activeDatePeriod, selectedPeriod]);

  // Accessible groups based on teacher's assignments & creations, sorted from menor a mayor
  const accessibleGroups = useMemo(() => {
    if (isTeacher && currentUser) {
      const assignedIds = new Set(activeTeacher?.assignedGroupIds || []);
      const assignedGrades = new Set(activeTeacher?.assignedGrades || []);

      const list = groups.filter((g) => {
        if (assignedIds.has(g.id)) return true;
        if (g.createdByTeacherId && g.createdByTeacherId === currentUser.id) return true;
        if (g.assignedTeacherIds && g.assignedTeacherIds.includes(currentUser.id)) return true;
        if (g.grade && assignedGrades.has(g.grade.trim())) return true;
        return false;
      });

      return sortGroupsAscending(list);
    }
    return sortGroupsAscending(groups);
  }, [groups, isTeacher, currentUser, activeTeacher]);

  // Keep selected group within accessible groups
  useEffect(() => {
    if (accessibleGroups.length > 0) {
      if (!accessibleGroups.some((g) => g.id === selectedGroupId)) {
        setSelectedGroupId(accessibleGroups[0].id);
      }
    }
  }, [accessibleGroups, selectedGroupId]);

  // Check if current user is allowed to modify grade records and activities
  const canModifyGrades = useMemo(() => {
    if (isParent) return false;
    if (isAdmin) {
      // In accordance with requirement: grade sheets can only be modified by the assigned or creator teacher.
      // Admin has institutional supervision / read access.
      return false;
    }
    if (isTeacher && currentUser) {
      return accessibleGroups.some((g) => g.id === selectedGroupId);
    }
    return true;
  }, [isParent, isAdmin, isTeacher, currentUser, accessibleGroups, selectedGroupId]);

  // Teacher Quick Modal: Create Course
  const [isTeacherCreateGroupOpen, setIsTeacherCreateGroupOpen] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    grade: '10°',
    shift: 'Mañana' as const,
    room: '',
    subjects: 'Matemáticas, Lenguaje, Ciencias, Inglés',
  });

  // Teacher Quick Modal: Add Student to current course
  const [isTeacherAddStudentOpen, setIsTeacherAddStudentOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    firstName: '',
    lastName: '',
    documentId: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianRelationship: 'Madre / Padre',
  });

  // Evaluation Categories state
  const [categories, setCategories] = useState<EvaluationCategory[]>(() => {
    if (subjectConfigs && subjectConfigs.length > 0) {
      const match = subjectConfigs.find((sc) => sc.groupId === selectedGroupId && sc.subjectName === selectedSubject);
      if (match && match.categories && match.categories.length > 0) return match.categories;
    }
    const stored = getStoredData().subjectConfigs;
    if (stored && stored.length > 0) {
      const match = stored.find((sc) => sc.groupId === selectedGroupId && sc.subjectName === selectedSubject);
      if (match && match.categories && match.categories.length > 0) return match.categories;
    }
    if (settings.evaluationCategories && settings.evaluationCategories.length > 0) {
      return settings.evaluationCategories;
    }
    return DEFAULT_EVALUATION_CATEGORIES;
  });

  // Keep categories in sync when subject or group changes, or when institutional settings or subjectConfigs update
  useEffect(() => {
    if (subjectConfigs && subjectConfigs.length > 0) {
      const match = subjectConfigs.find((sc) => sc.groupId === selectedGroupId && sc.subjectName === selectedSubject);
      if (match && match.categories && match.categories.length > 0) {
        setCategories(match.categories);
        return;
      }
    }
    const stored = getStoredData().subjectConfigs;
    if (stored && stored.length > 0) {
      const match = stored.find((sc) => sc.groupId === selectedGroupId && sc.subjectName === selectedSubject);
      if (match && match.categories && match.categories.length > 0) {
        setCategories(match.categories);
        return;
      }
    }
    if (settings.evaluationCategories && settings.evaluationCategories.length > 0) {
      setCategories(settings.evaluationCategories);
    } else {
      setCategories(DEFAULT_EVALUATION_CATEGORIES);
    }
  }, [selectedGroupId, selectedSubject, settings.evaluationCategories, subjectConfigs]);

  // Modal for Categories Weighting
  const [isCategoryConfigModalOpen, setIsCategoryConfigModalOpen] = useState(false);

  // Student Roulette Modal State
  const [isRouletteModalOpen, setIsRouletteModalOpen] = useState(false);

  // Google Drive Explorer Modal State
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState(false);

  // New / Edit Activity Modal
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState<{
    id?: string;
    title: string;
    subject: string;
    description: string;
    assignedDate: string;
    dueDate: string;
    maxScore: number;
    passingScore: number;
    weightPercentage: number;
    categoryId?: string;
    type: ActivityType;
    period: string;
    attachments?: DriveFileAttachment[];
  }>({
    title: '',
    subject: '',
    description: '',
    assignedDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    maxScore: 5.0,
    passingScore: 3.5,
    weightPercentage: 20,
    categoryId: DEFAULT_EVALUATION_CATEGORIES[0].id,
    type: 'taller',
    period: 'Periodo 1',
    attachments: [],
  });

  // Absent students for current activity modal
  const [activityAbsentStudentIds, setActivityAbsentStudentIds] = useState<string[]>([]);

  // Single WhatsApp Preview
  const [previewData, setPreviewData] = useState<{
    isOpen: boolean;
    student: Student | null;
    gradeRecord: GradeRecord | null;
    activity: Activity | null;
    message: string;
  }>({
    isOpen: false,
    student: null,
    gradeRecord: null,
    activity: null,
    message: '',
  });

  // Bulk WhatsApp Queue
  const [bulkData, setBulkData] = useState<{
    isOpen: boolean;
    items: QueueItem[];
  }>({
    isOpen: false,
    items: [],
  });

  // Quick Cell Editor Modal / Popover state for Matrix view
  const [quickEditCell, setQuickEditCell] = useState<{
    activityId: string;
    studentId: string;
  } | null>(null);
  const [quickEditScore, setQuickEditScore] = useState<string>('');
  const [quickEditDelivery, setQuickEditDelivery] = useState<DeliveryStatus>('yes');
  const [quickEditComment, setQuickEditComment] = useState<string>('');

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || accessibleGroups[0] || groups[0];

  // Resolve Teacher / Director name for the current group
  const groupDirectorOrTeacher = useMemo(() => {
    if (!selectedGroup) return 'Docente Asignado';
    if (selectedGroup.createdByTeacherId) {
      const creator = teachers.find((t) => t.id === selectedGroup.createdByTeacherId);
      if (creator) return creator.name;
    }
    if (selectedGroup.assignedTeacherIds && selectedGroup.assignedTeacherIds.length > 0) {
      const assigned = teachers.find((t) => selectedGroup.assignedTeacherIds?.includes(t.id));
      if (assigned) return assigned.name;
    }
    if (selectedGroup.directorName) return selectedGroup.directorName;
    return 'Docente Asignado';
  }, [selectedGroup, teachers]);

  // Handler for teacher to create a new group directly from their module
  const handleTeacherSaveNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupForm.name.trim()) return;

    const subjectsArr = newGroupForm.subjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newGroupId = `grp-${Date.now()}`;
    const docenteName = currentUser?.name || activeTeacher?.name || settings.teacherName || 'Docente';
    const newGroup: Group = {
      id: newGroupId,
      name: newGroupForm.name.trim(),
      grade: newGroupForm.grade,
      schoolYear: settings.schoolYear || '2026',
      shift: newGroupForm.shift,
      directorName: docenteName,
      teacherId: currentUser?.id || activeTeacher?.id,
      teacherName: docenteName,
      room: newGroupForm.room || 'Aula',
      subjects: subjectsArr.length > 0 ? subjectsArr : ['Matemáticas', 'Lenguaje', 'Ciencias'],
      createdAt: new Date().toISOString().split('T')[0],
      ...(currentUser?.id ? { createdByTeacherId: currentUser.id } : {}),
      assignedTeacherIds: currentUser?.id ? [currentUser.id] : (activeTeacher?.id ? [activeTeacher.id] : []),
    };

    if (onUpdateGroups) {
      onUpdateGroups([...groups, newGroup]);
    }

    // Also link to the active teacher's assigned groups
    if (currentUser && isTeacher && onUpdateTeachers && activeTeacher) {
      const updatedTeachers = teachers.map((t) => {
        if (t.id === currentUser.id || t.id === activeTeacher.id) {
          const currentGroups = t.assignedGroupIds || [];
          const currentGrades = t.assignedGrades || [];
          return {
            ...t,
            assignedGroupIds: [...currentGroups, newGroupId],
            assignedGrades: currentGrades.includes(newGroupForm.grade)
              ? currentGrades
              : [...currentGrades, newGroupForm.grade],
          };
        }
        return t;
      });
      onUpdateTeachers(updatedTeachers);
    }

    setSelectedGroupId(newGroupId);
    setIsTeacherCreateGroupOpen(false);
    setNewGroupForm({
      name: '',
      grade: '10°',
      shift: 'Mañana',
      room: '',
      subjects: 'Matemáticas, Lenguaje, Ciencias, Inglés',
    });
  };

  // Handler for teacher to add a student to the selected course directly
  const handleTeacherSaveNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.firstName.trim() || !newStudentForm.lastName.trim() || !selectedGroupId) return;

    const newStudentId = `std-${Date.now()}`;
    const avatarColors = [
      'bg-indigo-600',
      'bg-purple-600',
      'bg-emerald-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-cyan-600',
      'bg-teal-600',
    ];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newStudent: Student = {
      id: newStudentId,
      firstName: newStudentForm.firstName.trim(),
      lastName: newStudentForm.lastName.trim(),
      documentId: newStudentForm.documentId.trim() || `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
      groupId: selectedGroupId,
      status: 'active',
      guardianName: newStudentForm.guardianName.trim() || 'Acudiente Principal',
      guardianPhone: newStudentForm.guardianPhone.trim() || '3000000000',
      guardianEmail: newStudentForm.guardianEmail.trim() || '',
      guardianRelationship: newStudentForm.guardianRelationship || 'Madre / Padre',
      guardianCountryCode: '57',
      avatarColor: randomColor,
      ...(currentUser?.id ? { createdByTeacherId: currentUser.id } : {}),
    };

    if (onUpdateStudents) {
      onUpdateStudents([...students, newStudent]);
    }

    setIsTeacherAddStudentOpen(false);
    setNewStudentForm({
      firstName: '',
      lastName: '',
      documentId: '',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      guardianRelationship: 'Madre / Padre',
    });
  };

  // Helper to filter out teacher academic degrees or titles
  const isTeacherDegreeOrTitle = (str?: string): boolean => {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    return /^(licenciad|magister|magíster|especialista|ingenier|profesor|docente|fil[oó]sof|bi[oó]log|qu[ií]mic|abogad|psic[oó]log|antrop[oó]log)/i.test(s) &&
           (s.includes(' en ') || s.includes(' de ') || s.includes(' y ') || s.includes(' con ') || s.includes(' - '));
  };

  // Available subjects for this group and teacher (using centralized teacherUtils)
  const groupSubjects = useMemo(() => {
    return getSubjectsForGroupAndTeacher(
      selectedGroup,
      activeTeacher,
      teachers,
      settings,
      isTeacher
    );
  }, [selectedGroup, activeTeacher, teachers, settings, isTeacher]);

  // Make sure selectedSubject is valid and prioritized for active teacher
  React.useEffect(() => {
    if (groupSubjects.length > 0) {
      if (!groupSubjects.includes(selectedSubject)) {
        setSelectedSubject(groupSubjects[0]);
      }
    }
  }, [groupSubjects, selectedSubject]);

  // Filtered activities for current group, subject, period
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (act.groupId !== selectedGroupId) return false;
      if (act.period !== selectedPeriod) return false;
      if (act.subject !== selectedSubject) return false;
      return true;
    });
  }, [activities, selectedGroupId, selectedPeriod, selectedSubject]);

  // Set active activity when activities list changes
  React.useEffect(() => {
    if (filteredActivities.length > 0) {
      if (!activeActivityId || !filteredActivities.some((a) => a.id === activeActivityId)) {
        setActiveActivityId(filteredActivities[0].id);
      }
    } else {
      setActiveActivityId('');
    }
  }, [filteredActivities, activeActivityId]);

  const activeActivity = useMemo(() => {
    return activities.find((a) => a.id === activeActivityId);
  }, [activities, activeActivityId]);

  // Active students in current group
  const groupStudents = useMemo(() => {
    return students
      .filter((s) => s.groupId === selectedGroupId && s.status === 'active')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, selectedGroupId]);

  // Filtered students for search
  const searchedStudents = useMemo(() => {
    if (!searchQuery.trim()) return groupStudents;
    const q = searchQuery.toLowerCase();
    return groupStudents.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.documentId.includes(q) ||
        s.guardianName.toLowerCase().includes(q)
    );
  }, [groupStudents, searchQuery]);

  // Grades map for active activity
  const gradesMap = useMemo(() => {
    const map = new Map<string, GradeRecord>();
    if (!activeActivityId) return map;
    grades.forEach((g) => {
      if (g.activityId === activeActivityId) {
        map.set(g.studentId, g);
      }
    });
    return map;
  }, [grades, activeActivityId]);

  const getGradeForStudent = (studentId: string): GradeRecord => {
    const existing = gradesMap.get(studentId);
    if (existing) return existing;
    return {
      id: `grd-${activeActivityId}-${studentId}`,
      activityId: activeActivityId,
      studentId,
      score: null,
      deliveredOnTime: 'pending',
      comments: '',
      notifiedWhatsApp: false,
    };
  };

  const handleUpdateGradeRecord = (studentId: string, updates: Partial<GradeRecord>) => {
    if (!activeActivityId) return;
    const current = getGradeForStudent(studentId);
    const updated: GradeRecord = { ...current, ...updates };

    const newGradesList = grades.filter(
      (g) => !(g.activityId === activeActivityId && g.studentId === studentId)
    );
    newGradesList.push(updated);
    onUpdateGrades(newGradesList);
  };

  // Helper to verify attendance taking for a specific date and group
  const checkAttendanceForActivityDate = (date: string, groupId: string) => {
    if (!date || !groupId) {
      return {
        isTaken: false,
        absentStudentIds: [] as string[],
        recordsMap: new Map<string, AttendanceRecord>(),
        presentCount: 0,
        absentCount: 0,
        totalGroupStudents: 0,
      };
    }

    const records = attendance.filter((a) => a.groupId === groupId && a.date === date);
    const isTaken = records.length > 0;
    if (!isTaken) {
      return {
        isTaken: false,
        absentStudentIds: [] as string[],
        recordsMap: new Map<string, AttendanceRecord>(),
        presentCount: 0,
        absentCount: 0,
        totalGroupStudents: groupStudents.length,
      };
    }

    const recordsMap = new Map<string, AttendanceRecord>();
    const absentStudentIds: string[] = [];
    let presentCount = 0;
    let absentCount = 0;

    records.forEach((r) => {
      recordsMap.set(r.studentId, r);
      // Student is considered present if status is 'present' or 'late'
      const isPresent = r.status === 'present' || r.status === 'late';
      if (isPresent) {
        presentCount++;
      } else {
        absentCount++;
        absentStudentIds.push(r.studentId);
      }
    });

    return {
      isTaken: true,
      absentStudentIds,
      recordsMap,
      presentCount,
      absentCount,
      totalGroupStudents: groupStudents.length,
    };
  };

  // Helper to get descriptive novelty details
  const getNoveltyDetails = (status?: string) => {
    if (!status) return null;
    const list = settings.attendanceNovelties && settings.attendanceNovelties.length > 0
      ? settings.attendanceNovelties
      : DEFAULT_ATTENDANCE_NOVELTIES;
    const match = list.find((n) => n.id === status || n.code.toLowerCase() === status.toLowerCase());
    if (match) return match;
    if (status === 'unexcused_absence' || status === 'absent') {
      return { id: 'absent', name: 'Inasistencia Injustificada', shortName: 'Falta Injustificada', code: 'I', color: 'rose', category: 'absence' as const };
    }
    if (status === 'excused_absence' || status === 'excused') {
      return { id: 'excused', name: 'Inasistencia Justificada', shortName: 'Falta Justificada', code: 'J', color: 'sky', category: 'excused' as const };
    }
    if (status === 'evasion') {
      return { id: 'evasion', name: 'Evasión de Clase', shortName: 'Evasión', code: 'EV', color: 'orange', category: 'incident' as const };
    }
    if (status === 'late') {
      return { id: 'late', name: 'Retardo', shortName: 'Retardo', code: 'R', color: 'amber', category: 'late' as const };
    }
    if (status === 'present') {
      return { id: 'present', name: 'Presente', shortName: 'Presente', code: 'P', color: 'emerald', category: 'presence' as const };
    }
    return { id: status, name: status, shortName: status, code: '?', color: 'slate', category: 'other' as const };
  };

  // Activity Form Actions
  const handleOpenCreateActivity = () => {
    const today = new Date().toISOString().split('T')[0];
    setActivityForm({
      title: '',
      subject: selectedSubject,
      description: '',
      assignedDate: today,
      dueDate: today,
      maxScore: 5.0,
      passingScore: settings.passingScore || settings.minPassingScore || 3.5,
      weightPercentage: 20,
      categoryId: categories[0]?.id || DEFAULT_EVALUATION_CATEGORIES[0].id,
      type: 'taller',
      period: selectedPeriod,
      attachments: [],
    });

    // Check if attendance has been taken for this date and group
    const check = checkAttendanceForActivityDate(today, selectedGroupId);
    if (check.isTaken) {
      // Attendance was taken: identify absent students for this date
      setActivityAbsentStudentIds(check.absentStudentIds);
    } else {
      // If no attendance has been taken for this date, do not mark any absent students
      setActivityAbsentStudentIds([]);
    }
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (act: Activity) => {
    setActivityForm({
      id: act.id,
      title: act.title,
      subject: act.subject,
      description: act.description || '',
      assignedDate: act.assignedDate,
      dueDate: act.dueDate,
      maxScore: act.maxScore,
      passingScore: act.passingScore,
      weightPercentage: act.weightPercentage || 20,
      categoryId: act.categoryId || categories[0]?.id,
      type: act.type,
      period: act.period,
      attachments: act.attachments || [],
    });

    // Load existing absent students for this activity
    const existingAbsents = grades
      .filter(
        (g) =>
          g.activityId === act.id &&
          (g.deliveredOnTime === 'unexcused_absence' || g.deliveredOnTime === 'excused_absence')
      )
      .map((g) => g.studentId);

    if (existingAbsents.length > 0) {
      setActivityAbsentStudentIds(existingAbsents);
    } else {
      // Check attendance for activity date
      const check = checkAttendanceForActivityDate(act.assignedDate, selectedGroupId);
      if (check.isTaken) {
        setActivityAbsentStudentIds(check.absentStudentIds);
      } else {
        setActivityAbsentStudentIds([]);
      }
    }
    setIsActivityModalOpen(true);
  };

  const handleAssignedDateChange = (newDate: string) => {
    setActivityForm((prev) => ({
      ...prev,
      assignedDate: newDate,
      dueDate: prev.dueDate === prev.assignedDate ? newDate : prev.dueDate,
    }));

    const check = checkAttendanceForActivityDate(newDate, selectedGroupId);
    if (check.isTaken) {
      setActivityAbsentStudentIds(check.absentStudentIds);
    } else {
      setActivityAbsentStudentIds([]);
    }
  };

  const handleLoadAbsentsFromAttendance = (dateToUse?: string) => {
    const targetDate = dateToUse || activityForm.assignedDate;
    const check = checkAttendanceForActivityDate(targetDate, selectedGroupId);
    if (check.isTaken) {
      setActivityAbsentStudentIds(check.absentStudentIds);
    } else {
      setActivityAbsentStudentIds([]);
    }
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title.trim() || !activityForm.subject) return;

    let targetActId = activityForm.id;
    let newActivitiesList: Activity[];
    if (activityForm.id) {
      // Edit
      newActivitiesList = activities.map((a) =>
        a.id === activityForm.id
          ? {
              ...a,
              ...activityForm,
              groupId: selectedGroupId,
              attachments: activityForm.attachments || [],
            }
          : a
      );
    } else {
      // Create new
      targetActId = `act-${Date.now()}`;
      const newAct: Activity = {
        id: targetActId,
        groupId: selectedGroupId,
        subject: activityForm.subject,
        title: activityForm.title,
        description: activityForm.description,
        assignedDate: activityForm.assignedDate,
        dueDate: activityForm.dueDate,
        maxScore: Number(activityForm.maxScore),
        passingScore: Number(activityForm.passingScore),
        weightPercentage: Number(activityForm.weightPercentage),
        categoryId: activityForm.categoryId,
        type: activityForm.type,
        period: activityForm.period,
        attachments: activityForm.attachments || [],
      };
      newActivitiesList = [...activities, newAct];
      setActiveActivityId(newAct.id);
    }

    // Synchronize absent students with Grade Records for this activity
    const updatedGradesList = [...grades];
    if (targetActId) {
      const check = checkAttendanceForActivityDate(activityForm.assignedDate, selectedGroupId);

      groupStudents.forEach((student) => {
        const isAbsent = activityAbsentStudentIds.includes(student.id);
        const existingIdx = updatedGradesList.findIndex(
          (g) => g.activityId === targetActId && g.studentId === student.id
        );
        const attRec = check.recordsMap.get(student.id);

        if (isAbsent) {
          const absenceType = attRec?.status === 'excused' ? 'excused_absence' : 'unexcused_absence';
          const defaultComment = attRec?.excuseReason
            ? `Inasistencia (${attRec.excuseReason})`
            : `Inasistencia registrada en fecha de actividad (${activityForm.assignedDate})`;

          if (existingIdx >= 0) {
            updatedGradesList[existingIdx] = {
              ...updatedGradesList[existingIdx],
              deliveredOnTime: absenceType,
              comments: updatedGradesList[existingIdx].comments || defaultComment,
            };
          } else {
            updatedGradesList.push({
              id: `grd-${targetActId}-${student.id}`,
              activityId: targetActId!,
              studentId: student.id,
              score: null,
              deliveredOnTime: absenceType,
              comments: defaultComment,
              notifiedWhatsApp: false,
            });
          }
        } else if (
          existingIdx >= 0 &&
          (updatedGradesList[existingIdx].deliveredOnTime === 'unexcused_absence' ||
            updatedGradesList[existingIdx].deliveredOnTime === 'excused_absence')
        ) {
          // If no longer marked absent and has no grade score, reset to pending
          if (updatedGradesList[existingIdx].score === null) {
            updatedGradesList[existingIdx] = {
              ...updatedGradesList[existingIdx],
              deliveredOnTime: 'pending',
            };
          }
        }
      });
    }

    if (onUpdateActivitiesAndGrades) {
      onUpdateActivitiesAndGrades(newActivitiesList, updatedGradesList);
    } else {
      onUpdateActivities(newActivitiesList);
      onUpdateGrades(updatedGradesList);
    }

    setIsActivityModalOpen(false);
  };

  const handleDeleteActivity = (actId: string) => {
    if (confirm('¿Estás seguro de eliminar esta actividad y sus calificaciones registradas?')) {
      deleteRecordFromMySQL('actividades', actId).catch((err) => {
        console.error('Error al eliminar actividad de MySQL:', err);
      });
      const newActs = activities.filter((a) => a.id !== actId);
      const newGrds = grades.filter((g) => g.activityId !== actId);
      if (onUpdateActivitiesAndGrades) {
        onUpdateActivitiesAndGrades(newActs, newGrds);
      } else {
        onUpdateActivities(newActs);
        onUpdateGrades(newGrds);
      }
      if (activeActivityId === actId) {
        setActiveActivityId(newActs[0]?.id || null);
      }
    }
  };

  // Open Category Weight Config
  const handleOpenCategoryConfig = () => {
    setIsCategoryConfigModalOpen(true);
  };

  // Save Category Weights from Modal with Scopes (Course only, Subject in all courses, All assignments)
  const handleSaveCategoryConfig = (
    newCategories: EvaluationCategory[],
    options?: {
      applyToAllSubjectsInGroup?: boolean;
      applyToAllGroupsForSubject?: boolean;
      applyToAllTeacherAssignments?: boolean;
    } | boolean
  ) => {
    setCategories(newCategories);

    let allCurrentConfigs: SubjectConfig[] = [...(subjectConfigs || getStoredData().subjectConfigs || [])];

    // Determine target groups and subjects
    const targets: Array<{ groupId: string; subjectName: string }> = [];

    if (typeof options === 'object' && options !== null) {
      if (options.applyToAllTeacherAssignments) {
        // All groups and subjects assigned to this teacher / institution
        accessibleGroups.forEach((grp) => {
          const subs = grp.subjects && grp.subjects.length > 0 ? grp.subjects : [selectedSubject];
          subs.forEach((s) => targets.push({ groupId: grp.id, subjectName: s }));
        });
      } else if (options.applyToAllGroupsForSubject) {
        // All groups that take this subject
        accessibleGroups.forEach((grp) => {
          targets.push({ groupId: grp.id, subjectName: selectedSubject });
        });
      } else if (options.applyToAllSubjectsInGroup && selectedGroup) {
        // All subjects within current group
        const subs = selectedGroup.subjects && selectedGroup.subjects.length > 0 ? selectedGroup.subjects : [selectedSubject];
        subs.forEach((s) => targets.push({ groupId: selectedGroup.id, subjectName: s }));
      } else {
        targets.push({ groupId: selectedGroupId, subjectName: selectedSubject });
      }
    } else {
      targets.push({ groupId: selectedGroupId, subjectName: selectedSubject });
    }

    // Ensure uniqueness in targets
    const uniqueTargets = Array.from(
      new Map(targets.map((t) => [`${t.groupId}__${t.subjectName}`, t])).values()
    );

    // Remove existing matching configurations for targets
    allCurrentConfigs = allCurrentConfigs.filter((cfg) => {
      return !uniqueTargets.some(
        (t) => t.groupId === cfg.groupId && t.subjectName === cfg.subjectName
      );
    });

    // Add new configs for each target
    uniqueTargets.forEach((t) => {
      allCurrentConfigs.push({
        id: `cfg-${t.groupId}-${t.subjectName.replace(/\s+/g, '_')}`,
        groupId: t.groupId,
        subjectName: t.subjectName,
        categories: newCategories,
      });
    });

    // Persist to local storage and trigger parent Firestore sync
    saveStoredData.subjectConfigs(allCurrentConfigs);
    if (onUpdateSubjectConfigs) {
      onUpdateSubjectConfigs(allCurrentConfigs);
    }
  };

  // Apply Category Weights to Multiple Groups
  const handleApplyCategoriesToAllGroups = (newCategories: EvaluationCategory[], targetGroupIds: string[]) => {
    setCategories(newCategories);
    let allCurrentConfigs: SubjectConfig[] = [...(subjectConfigs || getStoredData().subjectConfigs || [])];
    allCurrentConfigs = allCurrentConfigs.filter(
      (sc) => !(targetGroupIds.includes(sc.groupId) && sc.subjectName === selectedSubject)
    );
    targetGroupIds.forEach((grpId) => {
      allCurrentConfigs.push({
        id: `cfg-${grpId}-${selectedSubject.replace(/\s+/g, '_')}`,
        groupId: grpId,
        subjectName: selectedSubject,
        categories: newCategories,
      });
    });
    saveStoredData.subjectConfigs(allCurrentConfigs);
    if (onUpdateSubjectConfigs) {
      onUpdateSubjectConfigs(allCurrentConfigs);
    }
  };

  // Single WhatsApp Grade Notification
  const handleOpenWhatsAppGradePreview = (student: Student) => {
    if (!activeActivity || !selectedGroup) return;
    const gradeRec = getGradeForStudent(student.id);
    const msg = generateGradeMessage(gradeRec, activeActivity, student, selectedGroup, settings);

    setPreviewData({
      isOpen: true,
      student,
      gradeRecord: gradeRec,
      activity: activeActivity,
      message: msg,
    });
  };

  const handleConfirmSingleGradeSend = () => {
    if (!previewData.student || !activeActivity) return;
    handleUpdateGradeRecord(previewData.student.id, {
      notifiedWhatsApp: true,
      notifiedAt: new Date().toISOString(),
    });
    if (onLogNotification) {
      onLogNotification(previewData.student.id, previewData.message, 'grade', {
        groupId: selectedGroup?.id,
        groupName: selectedGroup?.name,
        teacherId: currentUser?.id,
        teacherName: currentUser?.name || currentUser?.email,
      });
    }
  };

  // Bulk WhatsApp for active activity
  const handleStartBulkGradesWhatsApp = () => {
    if (!activeActivity || !selectedGroup) return;

    const items: QueueItem[] = [];

    groupStudents.forEach((std) => {
      const g = getGradeForStudent(std.id);
      if (g.score !== null) {
        const msg = generateGradeMessage(g, activeActivity, std, selectedGroup, settings);
        items.push({
          id: std.id,
          studentName: `${std.firstName} ${std.lastName}`,
          guardianName: std.guardianName,
          guardianPhone: std.guardianPhone,
          guardianCountryCode: std.guardianCountryCode,
          message: msg,
          reason: `Nota: ${g.score.toFixed(1)} / ${activeActivity.maxScore}`,
          alreadySent: g.notifiedWhatsApp,
        });
      }
    });

    if (items.length === 0) {
      alert('Aún no has calificado estudiantes para enviar notas.');
      return;
    }

    setBulkData({
      isOpen: true,
      items,
    });
  };

  // Calculate Weighted Grades for Master Gradebook
  const masterGradebookData = useMemo(() => {
    return groupStudents.map((student) => {
      // Category score calculations
      let definitiveWeightedSum = 0;
      let totalWeightApplied = 0;

      const categoryDetails = categories.map((cat) => {
        // Find activities matching this category or default
        const catActivities = filteredActivities.filter(
          (act) => (act.categoryId || DEFAULT_EVALUATION_CATEGORIES[0].id) === cat.id
        );

        const activityGrades = catActivities.map((act) => {
          const g = grades.find((gr) => gr.activityId === act.id && gr.studentId === student.id);
          return {
            activity: act,
            score: g ? g.score : null,
            deliveredOnTime: g ? g.deliveredOnTime : 'pending',
          };
        });

        // Compute average of scored activities in this category
        const scoredActivities = activityGrades.filter((ag) => ag.score !== null);
        const categoryAverage =
          scoredActivities.length > 0
            ? scoredActivities.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredActivities.length
            : null;

        if (categoryAverage !== null) {
          definitiveWeightedSum += categoryAverage * (cat.weightPercentage / 100);
          totalWeightApplied += cat.weightPercentage;
        }

        return {
          category: cat,
          activityGrades,
          categoryAverage,
        };
      });

      // Adjusted definitive if not all categories are scored yet
      const definitiveScore =
        totalWeightApplied > 0
          ? (definitiveWeightedSum / totalWeightApplied) * (totalWeightApplied / 100) + (100 - totalWeightApplied > 0 ? 0 : 0)
          : null;

      // Final real score
      const finalScore = definitiveWeightedSum > 0 ? Number(definitiveWeightedSum.toFixed(2)) : null;

      // Performance Level
      let achievementLevel = 'Sin calificar';
      let achievementBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';

      if (finalScore !== null) {
        if (finalScore >= 4.6) {
          achievementLevel = 'Superior';
          achievementBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        } else if (finalScore >= 4.0) {
          achievementLevel = 'Alto';
          achievementBadgeClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
        } else if (finalScore >= (settings.passingScore || settings.minPassingScore || 3.5)) {
          achievementLevel = 'Básico';
          achievementBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        } else {
          achievementLevel = 'Bajo';
          achievementBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
        }
      }

      // Attendance correlation for student
      const studentAttendance = attendance.filter(
        (r) => r.studentId === student.id && r.groupId === selectedGroupId
      );
      const totalClasses = studentAttendance.length;
      const presents = studentAttendance.filter((r) => r.status === 'present').length;
      const absents = studentAttendance.filter((r) => r.status === 'absent').length;
      const lates = studentAttendance.filter((r) => r.status === 'late').length;
      const attendancePercentage = totalClasses > 0 ? Math.round((presents / totalClasses) * 100) : 100;

      return {
        student,
        categoryDetails,
        finalScore,
        achievementLevel,
        achievementBadgeClass,
        attendanceStats: {
          totalClasses,
          presents,
          absents,
          lates,
          percentage: attendancePercentage,
        },
      };
    });
  }, [groupStudents, categories, filteredActivities, grades, attendance, selectedGroupId]);

  // Fast access map for each student's definitive weighted grade & stats
  const studentFinalScoreMap = useMemo(() => {
    const map = new Map<
      string,
      {
        finalScore: number | null;
        achievementLevel: string;
        achievementBadgeClass: string;
        percentage: number | null;
        rowItem: (typeof masterGradebookData)[0];
      }
    >();
    masterGradebookData.forEach((row) => {
      const pct = row.finalScore !== null ? Math.round((row.finalScore / 5.0) * 1000) / 10 : null;
      map.set(row.student.id, {
        finalScore: row.finalScore,
        achievementLevel: row.achievementLevel,
        achievementBadgeClass: row.achievementBadgeClass,
        percentage: pct,
        rowItem: row,
      });
    });
    return map;
  }, [masterGradebookData]);

  // Chronologically sorted activities for the Matrix view with optional category filter
  const sortedMatrixActivities = useMemo(() => {
    let list = [...filteredActivities];
    if (matrixCategoryFilter !== 'all') {
      list = list.filter((a) => (a.categoryId || DEFAULT_EVALUATION_CATEGORIES[0].id) === matrixCategoryFilter);
    }
    return list.sort((a, b) => {
      const dateComp = (a.assignedDate || '').localeCompare(b.assignedDate || '');
      if (dateComp !== 0) return dateComp;
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [filteredActivities, matrixCategoryFilter]);

  // Handler to open Quick Grade & Comment editor for a student's activity
  const handleOpenCellEditor = (activityId: string, studentId: string, customGradesList?: GradeRecord[]) => {
    const gradesSource = customGradesList || grades;
    const existingGrade = gradesSource.find((g) => g.activityId === activityId && g.studentId === studentId);
    const act = activities.find((a) => a.id === activityId);
    const check = checkAttendanceForActivityDate(act?.assignedDate || '', selectedGroupId);
    const attRec = check.isTaken ? check.recordsMap.get(studentId) : undefined;
    const isAbsent = check.isTaken && attRec && (attRec.status !== 'present' && attRec.status !== 'late');

    setQuickEditCell({ activityId, studentId });
    setQuickEditScore(
      existingGrade?.score !== null && existingGrade?.score !== undefined ? String(existingGrade.score) : ''
    );

    let initialDelivery: DeliveryStatus = existingGrade?.deliveredOnTime || 'yes';
    if (!existingGrade && isAbsent) {
      initialDelivery = attRec?.status === 'excused' ? 'excused_absence' : 'unexcused_absence';
    }
    setQuickEditDelivery(initialDelivery);
    setQuickEditComment(
      existingGrade?.comments || (isAbsent && attRec?.excuseReason ? `Inasistencia: ${attRec.excuseReason}` : '')
    );
  };

  // Handler to save Quick Grade from Cell Modal/Popover, optionally advancing to next student
  const handleSaveQuickCellGrade = (goToNext: boolean = false) => {
    if (!quickEditCell) return;
    const { activityId, studentId } = quickEditCell;
    const numScore = quickEditScore.trim() === '' ? null : parseFloat(quickEditScore.replace(',', '.'));
    const act = activities.find((a) => a.id === activityId);
    const maxScore = act?.maxScore || 5.0;

    if (numScore !== null && (isNaN(numScore) || numScore < 0 || numScore > maxScore)) {
      alert(`La calificación debe ser un valor numérico válido entre 0.0 y ${maxScore}`);
      return;
    }

    const existingIdx = grades.findIndex((g) => g.activityId === activityId && g.studentId === studentId);
    const newGradesList = [...grades];
    const updatedRecord: GradeRecord = {
      id: existingIdx >= 0 ? newGradesList[existingIdx].id : `grd-${activityId}-${studentId}`,
      activityId,
      studentId,
      score: numScore !== null ? Number(numScore.toFixed(1)) : null,
      deliveredOnTime: quickEditDelivery,
      comments: quickEditComment.trim(),
      notifiedWhatsApp: existingIdx >= 0 ? newGradesList[existingIdx].notifiedWhatsApp : false,
      notifiedAt: existingIdx >= 0 ? newGradesList[existingIdx].notifiedAt : undefined,
    };

    if (existingIdx >= 0) {
      newGradesList[existingIdx] = updatedRecord;
    } else {
      newGradesList.push(updatedRecord);
    }

    onUpdateGrades(newGradesList);

    if (goToNext) {
      const currentIdx = groupStudents.findIndex((s) => s.id === studentId);
      if (currentIdx >= 0 && currentIdx < groupStudents.length - 1) {
        const nextStudent = groupStudents[currentIdx + 1];
        handleOpenCellEditor(activityId, nextStudent.id, newGradesList);
        return;
      }
    }

    setQuickEditCell(null);
  };

  // Fast inline score change directly from cell input
  const handleQuickInlineScoreChange = (activityId: string, studentId: string, newScoreText: string) => {
    if (!canModifyGrades) return;
    const val = newScoreText.trim();
    let score: number | null = null;
    if (val !== '') {
      const parsed = parseFloat(val.replace(',', '.'));
      if (!isNaN(parsed)) {
        score = Math.max(0, Math.min(5.0, parsed));
      } else {
        return;
      }
    }
    const existingIdx = grades.findIndex((g) => g.activityId === activityId && g.studentId === studentId);
    const newGradesList = [...grades];
    if (existingIdx >= 0) {
      newGradesList[existingIdx] = {
        ...newGradesList[existingIdx],
        score,
        deliveredOnTime:
          score !== null && newGradesList[existingIdx].deliveredOnTime === 'pending'
            ? 'yes'
            : newGradesList[existingIdx].deliveredOnTime,
      };
    } else {
      newGradesList.push({
        id: `grd-${activityId}-${studentId}`,
        activityId,
        studentId,
        score,
        deliveredOnTime: score !== null ? 'yes' : 'pending',
        comments: '',
        notifiedWhatsApp: false,
      });
    }
    onUpdateGrades(newGradesList);
  };

  // Export Master Gradebook to Excel
  const handleExportMasterExcel = () => {
    if (!selectedGroup) return;
    exportMasterGradebookToExcel(
      selectedGroup,
      selectedSubject,
      selectedPeriod,
      categories,
      filteredActivities,
      grades,
      groupStudents,
      attendance
    );
  };

  // Send Full Grade Report to Student Guardian
  const handleSendMasterReportToGuardian = (item: (typeof masterGradebookData)[0]) => {
    if (!selectedGroup) return;
    const catSummaries = item.categoryDetails.map((cd) => ({
      name: cd.category.name,
      weight: cd.category.weightPercentage,
      average: cd.categoryAverage || 0,
    }));

    const msg = generateMasterGradebookMessage(
      item.student,
      selectedGroup,
      selectedSubject,
      selectedPeriod,
      item.finalScore || 0,
      item.achievementLevel,
      catSummaries,
      item.attendanceStats,
      settings
    );

    const url = createWhatsAppUrl(item.student.guardianCountryCode || '+57', item.student.guardianPhone, msg);
    window.open(url, '_blank');

    if (onLogNotification) {
      onLogNotification(item.student.id, msg, 'grade', {
        groupId: selectedGroup?.id,
        groupName: selectedGroup?.name,
        teacherId: currentUser?.id,
        teacherName: currentUser?.name || currentUser?.email,
      });
    }
  };

  // Bulk WhatsApp for all Master Gradebook Reports
  const handleStartBulkMasterReports = () => {
    if (!selectedGroup) return;
    const items: QueueItem[] = [];

    masterGradebookData.forEach((row) => {
      if (row.finalScore !== null) {
        const catSummaries = row.categoryDetails.map((cd) => ({
          name: cd.category.name,
          weight: cd.category.weightPercentage,
          average: cd.categoryAverage || 0,
        }));

        const msg = generateMasterGradebookMessage(
          row.student,
          selectedGroup,
          selectedSubject,
          selectedPeriod,
          row.finalScore,
          row.achievementLevel,
          catSummaries,
          row.attendanceStats,
          settings
        );

        items.push({
          id: row.student.id,
          studentName: `${row.student.firstName} ${row.student.lastName}`,
          guardianName: row.student.guardianName,
          guardianPhone: row.student.guardianPhone,
          guardianCountryCode: row.student.guardianCountryCode,
          message: msg,
          reason: `Definitiva: ${row.finalScore.toFixed(1)} (${row.achievementLevel})`,
          alreadySent: false,
        });
      }
    });

    if (items.length === 0) {
      alert('Aún no hay calificaciones registradas para generar reportes completos.');
      return;
    }

    setBulkData({
      isOpen: true,
      items,
    });
  };

  // Grade Statistics for Master Gradebook
  const gradebookStats = useMemo(() => {
    const validScores = masterGradebookData
      .map((r) => r.finalScore)
      .filter((s): s is number => s !== null);

    if (validScores.length === 0) {
      return {
        average: 0,
        passingRate: 0,
        superiorCount: 0,
        altoCount: 0,
        basicoCount: 0,
        bajoCount: 0,
        gradedCount: 0,
      };
    }

    const minPass = settings.passingScore || settings.minPassingScore || 3.5;
    const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const pass = validScores.filter((s) => s >= minPass).length;

    return {
      average: avg,
      passingRate: Math.round((pass / validScores.length) * 100),
      superiorCount: validScores.filter((s) => s >= 4.6).length,
      altoCount: validScores.filter((s) => s >= 4.0 && s < 4.6).length,
      basicoCount: validScores.filter((s) => s >= minPass && s < 4.0).length,
      bajoCount: validScores.filter((s) => s < minPass).length,
      gradedCount: validScores.length,
    };
  }, [masterGradebookData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Filter & View Mode Controls */}
      <div className="bg-slate-900/60 rounded-2xl p-5 shadow-xl border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Filters Group, Subject, Period */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Group */}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Curso / Grupo
                </label>
                {isTeacher && (
                  <span className="text-[10px] text-purple-400 font-semibold ml-2">
                    ({accessibleGroups.length} asignados)
                  </span>
                )}
              </div>
              <select
                id="select-grades-group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl p-2.5 min-w-[170px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {accessibleGroups.length === 0 ? (
                  <option value="" disabled className="bg-slate-900 text-slate-400">
                    Sin cursos asignados
                  </option>
                ) : (
                  accessibleGroups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                      {g.name} ({g.grade})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Subject */}
            <div className="flex flex-col space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Materia / Asignatura
              </label>
              <select
                id="select-grades-subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl p-2.5 min-w-[160px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {groupSubjects.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-slate-100">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div className="flex flex-col space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Periodo Académico
              </label>
              <select
                id="select-grades-period"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl p-2.5 min-w-[150px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {configuredPeriods.map((p) => {
                  const isCurrent = activeDatePeriod?.id === p.id || activeDatePeriod?.name === p.name;
                  return (
                    <option key={p.id || p.name} value={p.name} className="bg-slate-900 text-slate-100">
                      {p.name} {isCurrent ? '• Actual' : ''} ({p.weightPercentage}%)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* View Mode Switcher & Global Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            {/* Teacher Quick Creation Actions */}
            {isTeacher && (
              <div className="flex items-center space-x-1.5 mr-1">
                <button
                  type="button"
                  onClick={() => setIsTeacherCreateGroupOpen(true)}
                  className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-bold text-purple-200 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/60 rounded-xl transition-all shadow-sm"
                  title="Crear un nuevo grupo o curso escolar desde tu módulo docente"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Crear Curso</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTeacherAddStudentOpen(true)}
                  disabled={!selectedGroupId}
                  className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-bold text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 rounded-xl transition-all shadow-sm disabled:opacity-50"
                  title="Matricular un estudiante en el curso seleccionado"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Estudiante</span>
                </button>
              </div>
            )}

            {/* Segmented control for Views */}
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                id="btn-view-matrix-gradebook"
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === 'matrix'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Matriz de Notas</span>
              </button>

              <button
                id="btn-view-master-gradebook"
                type="button"
                onClick={() => setViewMode('master_gradebook')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === 'master_gradebook'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Sábana SIEE</span>
              </button>

              <button
                id="btn-view-activity-grading"
                type="button"
                onClick={() => setViewMode('activity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === 'activity'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Calificar Actividad</span>
              </button>

              <button
                id="btn-view-period-remedials"
                type="button"
                onClick={() => setViewMode('remedials')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === 'remedials'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Espacio para nivelaciones de periodos pasados (entrega de trabajo, sustentación, Drive y WhatsApp)"
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Nivelaciones</span>
              </button>
            </div>

            {/* Student Random Participation Roulette */}
            <button
              id="btn-open-student-roulette"
              type="button"
              onClick={() => setIsRouletteModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-pink-200 bg-pink-950/70 hover:bg-pink-900 border border-pink-700/60 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Ruleta aleatoria de estudiantes para participación en clase (excluye ausentes)"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span>Ruleta Aleatoria</span>
            </button>

            {/* Google Drive Files Explorer Button */}
            <button
              id="btn-open-google-drive-explorer"
              type="button"
              onClick={() => setIsDriveExplorerOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-amber-200 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/60 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Explorador de archivos, guías y documentos en Google Drive"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Drive</span>
            </button>

            {/* Category Configuration Button */}
            {canModifyGrades && (
              <button
                id="btn-open-category-config"
                type="button"
                onClick={handleOpenCategoryConfig}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800/90 border border-slate-700 rounded-xl hover:bg-slate-700/80 transition-colors shadow-sm"
                title="Configurar Ponderación de Categorías (SABER, HACER, SER)"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Ponderación</span>
              </button>
            )}

            {/* New Activity Button */}
            {canModifyGrades && (
              <button
                id="btn-create-activity"
                type="button"
                onClick={handleOpenCreateActivity}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-950 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Actividad</span>
              </button>
            )}
          </div>
        </div>

        {/* Role & Permission Status Banner */}
        <div className="pt-2 border-t border-slate-800/80">
          {canModifyGrades ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="font-semibold text-emerald-200">Planilla Habilitada para Edición:</strong> Estás autorizado como docente asignado/creador de este curso ({selectedGroup?.name}).
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-900/50 text-emerald-200 text-[10px] font-bold tracking-wide uppercase border border-emerald-700/50">
                Edición Activa
              </span>
            </div>
          ) : isAdmin ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-sky-950/30 border border-sky-800/40 text-sky-300 text-xs">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  <strong className="font-semibold text-sky-200">Modo Supervisión Institucional:</strong> Visualización de sábana y estadísticas. Las calificaciones solo son modificadas por el docente titular ({groupDirectorOrTeacher}).
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-sky-900/50 text-sky-200 text-[10px] font-bold tracking-wide uppercase border border-sky-700/50">
                Supervisión
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="font-semibold text-amber-200">Solo Lectura:</strong> Este curso no está en tus grados/grupos asignados. Solo el docente asignado ({groupDirectorOrTeacher}) puede modificar notas.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-900/50 text-amber-200 text-[10px] font-bold tracking-wide uppercase border border-amber-700/50">
                Solo Lectura
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 0: MATRIZ DE CALIFICACIONES (RESUMEN GENERAL DE TODAS LAS ACTIVIDADES)*/}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="space-y-6">
          {/* Summary Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Promedio General
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-indigo-400">
                  {gradebookStats.average > 0 ? gradebookStats.average.toFixed(2) : '--'}
                </span>
                <span className="text-xs text-slate-500">/ 5.0</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {gradebookStats.gradedCount} de {groupStudents.length} estudiantes calificados
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tasa de Aprobación
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-emerald-400">
                  {gradebookStats.passingRate}%
                </span>
                <span className="text-xs text-slate-500">del curso</span>
              </div>
              <span className="text-[11px] text-emerald-400/80">
                {gradebookStats.passedCount} aprobados ({gradebookStats.failedCount} reprobados)
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Actividades Asignadas
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-sky-400">
                  {filteredActivities.length}
                </span>
                <span className="text-xs text-slate-500">evaluaciones</span>
              </div>
              <span className="text-[11px] text-slate-400">
                En {selectedSubject} ({selectedPeriod})
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Estudiantes en Curso
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-amber-400">
                  {groupStudents.length}
                </span>
                <span className="text-xs text-slate-500">matriculados</span>
              </div>
              <span className="text-[11px] text-slate-400 truncate block">
                {selectedGroup?.name || 'Curso'}
              </span>
            </div>
          </div>

          {/* Matrix Actions & Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-sm">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-matrix-students"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar estudiante o documento..."
                className="w-full text-xs pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] text-slate-400 font-semibold mr-1 shrink-0">Filtrar:</span>
              <button
                type="button"
                onClick={() => setMatrixCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  matrixCategoryFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todas ({filteredActivities.length})
              </button>
              {categories.map((cat) => {
                const count = filteredActivities.filter(
                  (a) => (a.categoryId || DEFAULT_EVALUATION_CATEGORIES[0].id) === cat.id
                ).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setMatrixCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                      matrixCategoryFilter === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="ml-1 opacity-70">({cat.weightPercentage}%)</span>
                  </button>
                );
              })}
            </div>

            {/* Toolbar Action Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                id="btn-export-matrix-excel"
                type="button"
                onClick={handleExportMasterExcel}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/60 rounded-xl transition-all shadow-sm cursor-pointer"
                title="Exportar sábana completa de notas a Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              <button
                id="btn-bulk-whatsapp-matrix"
                type="button"
                onClick={handleStartBulkGradesWhatsApp}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/60 rounded-xl transition-all shadow-sm cursor-pointer"
                title="Enviar reportes de notas por WhatsApp a los acudientes"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {canModifyGrades && (
                <button
                  id="btn-create-activity-from-matrix"
                  type="button"
                  onClick={handleOpenCreateActivity}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-950 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Actividad</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Matrix Table */}
          {sortedMatrixActivities.length === 0 ? (
            <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40 text-slate-400 space-y-3">
              <GraduationCap className="w-12 h-12 mx-auto text-indigo-400/60 animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-200">No hay actividades creadas</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Aún no se han registrado actividades para {selectedSubject} en {selectedPeriod}. Crea tu primera actividad para calificar a los estudiantes y llevar el control de asistencias.
                </p>
              </div>
              {canModifyGrades && (
                <button
                  type="button"
                  onClick={handleOpenCreateActivity}
                  className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-950"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Primera Actividad</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md">
              <div className="overflow-x-auto max-h-[700px]">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 z-30 bg-[#0b1329] shadow-md">
                    <tr className="border-b border-slate-800">
                      {/* Sticky Index Column */}
                      <th className="sticky left-0 z-40 bg-[#0b1329] p-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-12 border-r border-slate-800/80">
                        #
                      </th>

                      {/* Sticky Student Column with Weighted Grade Header */}
                      <th className="sticky left-12 z-40 bg-[#0b1329] p-3 text-[11px] font-bold text-slate-300 uppercase tracking-wider min-w-[280px] max-w-[320px] border-r border-slate-800">
                        <div className="flex items-center justify-between">
                          <span>Estudiante</span>
                          <span className="text-[10px] text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                            Nota Ponderada
                          </span>
                        </div>
                      </th>

                      {/* Dynamic Activity Columns */}
                      {sortedMatrixActivities.map((act) => {
                        const cat = categories.find((c) => c.id === act.categoryId) || DEFAULT_EVALUATION_CATEGORIES[0];
                        const attCheck = checkAttendanceForActivityDate(act.assignedDate, selectedGroupId);

                        return (
                          <th
                            key={act.id}
                            className="p-3 border-r border-slate-800/80 min-w-[180px] max-w-[220px] bg-[#0b1329]"
                          >
                            <div className="space-y-1.5">
                              {/* Date and Attendance Indicator */}
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span>{act.assignedDate}</span>
                                </span>
                                {attCheck.isTaken && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex items-center space-x-0.5"
                                    title="Llamado de asistencia verificado para esta fecha"
                                  >
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>Asistencia</span>
                                  </span>
                                )}
                              </div>

                              {/* Activity Title with Hyperlink to Detailed Section */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActivityId(act.id);
                                  setViewMode('activity');
                                }}
                                className="group flex items-start justify-between w-full text-left transition-colors cursor-pointer"
                                title={`Clic para abrir la vista detallada de: ${act.title}`}
                              >
                                <span className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 group-hover:underline line-clamp-2 leading-snug">
                                  {act.title}
                                </span>
                                <ExternalLink className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100 shrink-0 ml-1 mt-0.5" />
                              </button>

                              {/* Category Badge & Max Score */}
                              <div className="flex items-center justify-between text-[10px]">
                                <span
                                  className="px-1.5 py-0.5 rounded font-bold text-[9px]"
                                  style={{
                                    backgroundColor: `${cat.color}20`,
                                    color: cat.color,
                                    border: `1px solid ${cat.color}40`,
                                  }}
                                >
                                  {cat.name} ({cat.weightPercentage}%)
                                </span>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  Máx: {act.maxScore} pts
                                </span>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/60">
                    {searchedStudents.map((std, idx) => {
                      const defData = studentFinalScoreMap.get(std.id);
                      const finalScore = defData?.finalScore;
                      const achievementBadge = defData?.achievementBadgeClass || 'bg-slate-800 text-slate-400';
                      const achievementLevel = defData?.achievementLevel || 'Sin calificar';
                      const pct = defData?.percentage;

                      return (
                        <tr
                          key={std.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Sticky Index */}
                          <td className="sticky left-0 z-20 bg-slate-900 group-hover:bg-[#131d38] p-3 text-center text-xs font-medium text-slate-400 border-r border-slate-800/80">
                            {idx + 1}
                          </td>

                          {/* Sticky Student Profile & Weighted Grade */}
                          <td className="sticky left-12 z-20 bg-slate-900 group-hover:bg-[#131d38] p-3 border-r border-slate-800">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner">
                                  {std.firstName.charAt(0)}
                                  {std.lastName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-indigo-200">
                                    {std.lastName} {std.firstName}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                                    Doc: {std.documentId || 'S/D'}
                                  </span>
                                </div>
                              </div>

                              {/* Weighted Definitive Grade Chip */}
                              <div className="text-right shrink-0 flex flex-col items-end">
                                <div className="flex items-center space-x-1">
                                  <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                                      finalScore !== null && finalScore !== undefined
                                        ? finalScore >= (settings.passingScore || settings.minPassingScore || 3.5)
                                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                          : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}
                                  >
                                    {finalScore !== null && finalScore !== undefined
                                      ? finalScore.toFixed(1)
                                      : '--'}
                                  </span>
                                  {pct !== null && (
                                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                                      ({pct}%)
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 border ${achievementBadge}`}
                                >
                                  {achievementLevel}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Dynamic Cells for Each Activity */}
                          {sortedMatrixActivities.map((act) => {
                            const grade = grades.find((g) => g.activityId === act.id && g.studentId === std.id);
                            const attCheck = checkAttendanceForActivityDate(act.assignedDate, selectedGroupId);
                            const attRec = attCheck.isTaken ? attCheck.recordsMap.get(std.id) : undefined;
                            const isAbsentOnDate =
                              attCheck.isTaken && attRec && (attRec.status !== 'present' && attRec.status !== 'late');
                            const isExcused = attCheck.isTaken && attRec && attRec.status === 'excused';
                            const isMarkedAbsence =
                              grade?.deliveredOnTime === 'unexcused_absence' ||
                              grade?.deliveredOnTime === 'excused_absence';

                            const hasScore = grade?.score !== null && grade?.score !== undefined;
                            const scoreVal = hasScore ? (grade?.score as number) : null;
                            const hasComment = Boolean(grade?.comments && grade.comments.trim().length > 0);

                            return (
                              <td
                                key={`${act.id}-${std.id}`}
                                className="p-2.5 border-r border-slate-800/80 text-center align-top bg-slate-900/30 group-hover:bg-slate-800/20"
                              >
                                <div className="flex flex-col items-center justify-center space-y-1.5 min-h-[58px]">
                                  {/* Absence Signal Pill / Tag */}
                                  {(isAbsentOnDate || isMarkedAbsence) && (
                                    <div
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 border shadow-sm ${
                                        isExcused || grade?.deliveredOnTime === 'excused_absence'
                                          ? 'bg-sky-950/80 text-sky-300 border-sky-700/60'
                                          : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                                      }`}
                                      title={
                                        attRec?.excuseReason
                                          ? `Inasistencia: ${attRec.excuseReason}`
                                          : 'Estudiante ausente en la fecha de la actividad'
                                      }
                                    >
                                      <UserX className="w-2.5 h-2.5" />
                                      <span>
                                        {isExcused || grade?.deliveredOnTime === 'excused_absence'
                                          ? 'Excusa'
                                          : 'Ausente'}
                                      </span>
                                    </div>
                                  )}

                                  {/* Score Pill / Missing Pill / Pending Pill */}
                                  {hasScore ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCellEditor(act.id, std.id)}
                                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm hover:scale-105 hover:ring-2 hover:ring-indigo-400 ${
                                        (scoreVal as number) >= (act.passingScore || settings.passingScore || settings.minPassingScore || 3.5)
                                          ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700/60 hover:bg-emerald-900'
                                          : 'bg-rose-950/80 text-rose-200 border-rose-700/60 hover:bg-rose-900'
                                      }`}
                                      title="Clic para editar nota o comentarios"
                                    >
                                      <span>{(scoreVal as number).toFixed(1)}</span>
                                      <span className="text-[10px] opacity-70 ml-1 font-normal">
                                        / {act.maxScore}
                                      </span>
                                    </button>
                                  ) : grade?.deliveredOnTime === 'no' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCellEditor(act.id, std.id)}
                                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-amber-200 bg-amber-950/80 border border-amber-700/60 hover:bg-amber-900 hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer"
                                      title="No entregó la actividad. Clic para editar"
                                    >
                                      No entregó
                                    </button>
                                  ) : isAbsentOnDate || isMarkedAbsence ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCellEditor(act.id, std.id)}
                                      className="px-2.5 py-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                                    >
                                      + Asignar Nota
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCellEditor(act.id, std.id)}
                                      className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-400 bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 hover:text-slate-200 hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer"
                                      title="Sin calificar. Clic para asignar nota"
                                    >
                                      - / {act.maxScore}
                                    </button>
                                  )}

                                  {/* Comments / Add Comments Link matching reference */}
                                  {hasComment ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCellEditor(act.id, std.id)}
                                      className="text-[10px] text-slate-300 hover:text-indigo-300 italic flex items-center space-x-1 max-w-[150px] truncate transition-colors pt-0.5 cursor-pointer"
                                      title={grade?.comments}
                                    >
                                      <MessageSquare className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                                      <span className="truncate">"{grade?.comments}"</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCellEditor(act.id, std.id)}
                                      className="text-[10px] text-slate-400/80 hover:text-indigo-300 hover:underline flex items-center space-x-0.5 pt-0.5 transition-colors cursor-pointer"
                                      title="Agregar comentario u observación"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>Agregar comentario</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: SÁBANA GENERAL DE CALIFICACIONES CON DEFINITIVAS PONDERADAS       */}
      {/* ========================================================================= */}
      {viewMode === 'master_gradebook' && (
        <div className="space-y-6">
          {/* Summary Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Promedio del Curso
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-indigo-400">
                  {gradebookStats.average > 0 ? gradebookStats.average.toFixed(2) : '--'}
                </span>
                <span className="text-xs text-slate-500">/ 5.0</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {gradebookStats.gradedCount} de {groupStudents.length} estudiantes calificados
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tasa de Aprobación
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-emerald-400">
                  {gradebookStats.passingRate}%
                </span>
                <span className="text-xs text-slate-500">≥ {(settings.passingScore || settings.minPassingScore || 3.5).toFixed(1)}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Aprobados en este periodo
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Actividades Registradas
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-teal-400">
                  {filteredActivities.length}
                </span>
                <span className="text-xs text-slate-500">evaluaciones</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Distribuidas en {categories.length} categorías
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Desglose de Desempeño
              </span>
              <div className="flex items-center space-x-2 text-xs pt-1">
                <span className="text-emerald-400 font-bold" title="Superior (4.6 - 5.0)">
                  Sup: {gradebookStats.superiorCount}
                </span>
                <span>•</span>
                <span className="text-indigo-400 font-bold" title={`Alto (4.0 - 4.5)`}>
                  Alt: {gradebookStats.altoCount}
                </span>
                <span>•</span>
                <span className="text-amber-400 font-bold" title={`Básico (${(settings.passingScore || settings.minPassingScore || 3.5).toFixed(1)} - 3.9)`}>
                  Bás: {gradebookStats.basicoCount}
                </span>
                <span>•</span>
                <span className="text-rose-400 font-bold" title={`Bajo (1.0 - ${((settings.passingScore || settings.minPassingScore || 3.5) - 0.1).toFixed(1)})`}>
                  Baj: {gradebookStats.bajoCount}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Escala oficial institucional
              </span>
            </div>
          </div>

          {/* Master Gradebook Table Container */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md">
            {/* Table Action Header */}
            <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-900/90">
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar estudiante o documento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                <button
                  id="btn-export-master-gradebook-excel"
                  type="button"
                  onClick={handleExportMasterExcel}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/90 border border-slate-700 rounded-xl hover:bg-slate-700/80 transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar Sábana Excel</span>
                </button>

                <button
                  id="btn-bulk-whatsapp-master-reports"
                  type="button"
                  onClick={handleStartBulkMasterReports}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-950 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Boletines WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0a0f1d] text-slate-300 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3 sticky left-0 bg-[#0a0f1d] z-20 w-10 text-center">#</th>
                    <th className="p-3 sticky left-10 bg-[#0a0f1d] z-20 min-w-[180px]">Estudiante</th>
                    <th className="p-3 min-w-[110px] text-slate-400 font-mono">Documento</th>

                    {/* Category Columns Header */}
                    {categories.map((cat) => {
                      const catActs = filteredActivities.filter(
                        (a) => (a.categoryId || DEFAULT_EVALUATION_CATEGORIES[0].id) === cat.id
                      );
                      return (
                        <th
                          key={cat.id}
                          className="p-3 text-center border-l border-r border-slate-800 bg-slate-900/40"
                          style={{ minWidth: `${Math.max(140, catActs.length * 60 + 80)}px` }}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-200">{cat.name}</span>
                            <span className="text-[10px] px-2 py-0.5 mt-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                              Ponderación: {cat.weightPercentage}%
                            </span>
                          </div>
                        </th>
                      );
                    })}

                    {/* Attendance summary column */}
                    <th className="p-3 text-center min-w-[110px] border-l border-slate-800 bg-slate-900/20">
                      <div className="flex flex-col items-center">
                        <span>Asistencia</span>
                        <span className="text-[10px] text-slate-500 font-normal">% Jornadas</span>
                      </div>
                    </th>

                    {/* Definitive Grade Column */}
                    <th className="p-3 text-center min-w-[120px] border-l border-slate-800 bg-indigo-950/30">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-indigo-300">DEF. PONDERADA</span>
                        <span className="text-[10px] text-indigo-400 font-mono">1.0 - 5.0</span>
                      </div>
                    </th>

                    {/* Desempeño Badge Column */}
                    <th className="p-3 text-center min-w-[110px] border-l border-slate-800">
                      Desempeño
                    </th>

                    {/* Actions Column */}
                    <th className="p-3 text-center min-w-[90px] border-l border-slate-800">
                      WhatsApp
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/70">
                  {masterGradebookData.length === 0 ? (
                    <tr>
                      <td colSpan={7 + categories.length} className="p-8 text-center text-slate-500">
                        No hay estudiantes registrados en este curso.
                      </td>
                    </tr>
                  ) : (
                    masterGradebookData.map((row, idx) => {
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        const full = `${row.student.firstName} ${row.student.lastName}`.toLowerCase();
                        if (!full.includes(q) && !row.student.documentId.includes(q)) return null;
                      }

                      return (
                        <tr key={row.student.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 sticky left-0 bg-slate-900/90 z-10 text-center text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-3 sticky left-10 bg-slate-900/90 z-10 font-bold text-slate-100">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                                  row.student.avatarColor || 'bg-indigo-600'
                                }`}
                              >
                                {row.student.firstName[0]}
                                {row.student.lastName[0]}
                              </div>
                              <span className="truncate max-w-[150px]">
                                {row.student.lastName} {row.student.firstName}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-400 text-xs">
                            {row.student.documentId}
                          </td>

                          {/* Category Grades Breakdown */}
                          {row.categoryDetails.map((cd) => (
                            <td
                              key={cd.category.id}
                              className="p-3 border-l border-r border-slate-800/60 bg-slate-950/20"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                {/* Individual activity bubbles */}
                                <div className="flex items-center space-x-1.5">
                                  {cd.activityGrades.length === 0 ? (
                                    <span className="text-[11px] text-slate-600 italic">Sin act.</span>
                                  ) : (
                                    cd.activityGrades.map((ag, i) => {
                                      const hasAttForAct = attendance.some(
                                        (a) => a.groupId === selectedGroupId && a.date === ag.activity.assignedDate
                                      );
                                      const attRecForAct = attendance.find(
                                        (a) => a.groupId === selectedGroupId && a.date === ag.activity.assignedDate && a.studentId === row.student.id
                                      );
                                      const isAbsentForAct = hasAttForAct && attRecForAct && (attRecForAct.status !== 'present' && attRecForAct.status !== 'late');

                                      return (
                                        <span
                                          key={i}
                                          title={`${ag.activity.title}: ${
                                            ag.score !== null ? ag.score.toFixed(1) : 'Pendiente'
                                          } (${ag.deliveredOnTime})${
                                            isAbsentForAct ? ` • [Ausente en fecha: ${ag.activity.assignedDate}]` : ''
                                          }`}
                                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold relative ${
                                            ag.score === null
                                              ? 'bg-slate-800 text-slate-500'
                                              : ag.score >= (ag.activity.passingScore || settings.passingScore || settings.minPassingScore || 3.5)
                                              ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                                              : 'bg-rose-950/70 text-rose-400 border border-rose-800/40'
                                          } ${isAbsentForAct ? 'ring-1 ring-rose-500/70' : ''}`}
                                        >
                                          {ag.score !== null ? ag.score.toFixed(1) : '-'}
                                          {isAbsentForAct && (
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 ml-1" title="Inasistencia registrada" />
                                          )}
                                        </span>
                                      );
                                    })
                                  )}
                                </div>

                                {/* Category Average */}
                                <div className="pl-2 border-l border-slate-800 font-mono font-bold text-xs text-slate-200">
                                  {cd.categoryAverage !== null ? (
                                    <span
                                      className={
                                        cd.categoryAverage >= (settings.passingScore || settings.minPassingScore || 3.5) ? 'text-emerald-300' : 'text-rose-400'
                                      }
                                    >
                                      {cd.categoryAverage.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">--</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          ))}

                          {/* Attendance Correlation */}
                          <td className="p-3 text-center border-l border-slate-800 font-mono text-xs">
                            <div className="flex flex-col items-center">
                              <span
                                className={`font-bold ${
                                  row.attendanceStats.percentage >= 85
                                    ? 'text-emerald-400'
                                    : row.attendanceStats.percentage >= 70
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {row.attendanceStats.percentage}%
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {row.attendanceStats.presents}P • {row.attendanceStats.absents}A
                              </span>
                            </div>
                          </td>

                          {/* Definitive Weighted Score */}
                          <td className="p-3 text-center border-l border-slate-800 bg-indigo-950/20">
                            <span
                              className={`font-mono text-sm font-bold px-2.5 py-1 rounded-lg ${
                                row.finalScore === null
                                  ? 'text-slate-500'
                                  : row.finalScore >= 4.6
                                  ? 'text-emerald-300 bg-emerald-950/50 border border-emerald-800/50'
                                  : row.finalScore >= (settings.passingScore || settings.minPassingScore || 3.5)
                                  ? 'text-indigo-300 bg-indigo-950/50 border border-indigo-800/50'
                                  : 'text-rose-400 bg-rose-950/50 border border-rose-800/50'
                              }`}
                            >
                              {row.finalScore !== null ? row.finalScore.toFixed(1) : '--'}
                            </span>
                          </td>

                          {/* Performance Badge */}
                          <td className="p-3 text-center border-l border-slate-800">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${row.achievementBadgeClass}`}
                            >
                              {row.achievementLevel}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center border-l border-slate-800">
                            <button
                              id={`btn-send-report-std-${row.student.id}`}
                              type="button"
                              onClick={() => handleSendMasterReportToGuardian(row)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
                              title="Enviar boletín consolidado por WhatsApp"
                            >
                              <Send className="w-3 h-3" />
                              <span>Boletín</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CALIFICACIÓN INDIVIDUAL POR ACTIVIDAD                              */}
      {/* ========================================================================= */}
      {viewMode === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Activities List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Actividades ({filteredActivities.length})
              </h3>
              <button
                type="button"
                onClick={handleOpenCreateActivity}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredActivities.length === 0 ? (
                <div className="p-6 text-center border border-slate-800 rounded-2xl bg-slate-900/40 text-slate-500 space-y-2">
                  <GraduationCap className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">No hay actividades creadas para este periodo y materia.</p>
                  <button
                    type="button"
                    onClick={handleOpenCreateActivity}
                    className="text-xs text-indigo-400 font-bold underline"
                  >
                    Crear primera actividad
                  </button>
                </div>
              ) : (
                filteredActivities.map((act) => {
                  const isActive = act.id === activeActivityId;
                  const cat = categories.find((c) => c.id === act.categoryId) || DEFAULT_EVALUATION_CATEGORIES[0];

                  return (
                    <div
                      key={act.id}
                      onClick={() => setActiveActivityId(act.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                              {cat?.name || act.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Cat. {cat?.weightPercentage || 0}%
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 leading-snug">
                            {act.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>Entrega: {act.dueDate}</span>
                            </span>
                            <span>•</span>
                            <span className="text-slate-300 font-mono">Máx: {act.maxScore}</span>
                          </div>

                          {/* Drive Attachments Badge */}
                          {act.attachments && act.attachments.length > 0 && (
                            <div className="pt-1 flex flex-wrap gap-1">
                              {act.attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={att.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] truncate max-w-[170px]"
                                  title={`Abrir en Google Drive: ${att.name}`}
                                >
                                  <HardDrive className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {canModifyGrades && (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditActivity(act);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                              title="Editar actividad"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteActivity(act.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                              title="Eliminar actividad"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Grading Table for Active Activity */}
          <div className="lg:col-span-3 space-y-4">
            {activeActivity ? (
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md">
                {/* Active Activity Details Banner */}
                <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {activeActivity.subject}
                      </span>
                      <span className="text-xs text-slate-400">
                        Periodo: {activeActivity.period} • Fecha: {activeActivity.assignedDate} • Entrega: {activeActivity.dueDate}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">{activeActivity.title}</h3>
                    {activeActivity.description && (
                      <p className="text-xs text-slate-400 max-w-2xl">{activeActivity.description}</p>
                    )}
                  </div>

                  {/* Bulk WhatsApp & Export buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedGroup) return;
                        const records = groupStudents.map((s) => getGradeForStudent(s.id));
                        exportGradesToExcel(activeActivity, records, groupStudents, selectedGroup);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/90 border border-slate-700 rounded-xl hover:bg-slate-700/80 transition-colors shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartBulkGradesWhatsApp}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-950 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Notificar WhatsApp (Lote)</span>
                    </button>
                  </div>
                </div>

                {/* Attendance Verification Banner for Active Activity Date */}
                {(() => {
                  const check = checkAttendanceForActivityDate(activeActivity.assignedDate, selectedGroupId);
                  if (check.isTaken) {
                    return (
                      <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-slate-300">
                            <strong className="text-slate-100 font-semibold">Llamado de Asistencia ({activeActivity.assignedDate}):</strong>{' '}
                            <span className="text-emerald-400 font-semibold">{check.presentCount} presentes</span> •{' '}
                            <span className="text-rose-400 font-semibold">{check.absentCount} ausentes</span>
                          </span>
                        </div>
                        {canModifyGrades && check.absentCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedGradesList = [...grades];
                              groupStudents.forEach((student) => {
                                const attRec = check.recordsMap.get(student.id);
                                const wasAbsent = attRec && (attRec.status !== 'present' && attRec.status !== 'late');
                                const existingIdx = updatedGradesList.findIndex(
                                  (g) => g.activityId === activeActivity.id && g.studentId === student.id
                                );
                                if (wasAbsent) {
                                  const absenceType = attRec.status === 'excused' ? 'excused_absence' : 'unexcused_absence';
                                  const defaultComment = attRec.excuseReason
                                    ? `Inasistencia (${attRec.excuseReason})`
                                    : `Inasistencia registrada el ${activeActivity.assignedDate}`;
                                  if (existingIdx >= 0) {
                                    updatedGradesList[existingIdx] = {
                                      ...updatedGradesList[existingIdx],
                                      deliveredOnTime: absenceType,
                                      comments: updatedGradesList[existingIdx].comments || defaultComment,
                                    };
                                  } else {
                                    updatedGradesList.push({
                                      id: `grd-${activeActivity.id}-${student.id}`,
                                      activityId: activeActivity.id,
                                      studentId: student.id,
                                      score: null,
                                      deliveredOnTime: absenceType,
                                      comments: defaultComment,
                                      notifiedWhatsApp: false,
                                    });
                                  }
                                }
                              });
                              onUpdateGrades(updatedGradesList);
                            }}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 border border-amber-700/50 transition-colors cursor-pointer"
                            title="Sincronizar novedades de inasistencia con esta planilla"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Sincronizar Inasistencias</span>
                          </button>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="px-5 py-2 bg-slate-950/30 border-b border-slate-800/60 flex items-center space-x-2 text-xs text-slate-400">
                        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>
                          No se ha tomado asistencia para la fecha de esta actividad ({activeActivity.assignedDate}). Sin marcas automáticas.
                        </span>
                      </div>
                    );
                  }
                })()}

                {/* Grading Rows */}
                <div className="divide-y divide-slate-800/70">
                  {searchedStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      No hay estudiantes para calificar en este curso.
                    </div>
                  ) : (
                    searchedStudents.map((student, idx) => {
                      const gradeRecord = getGradeForStudent(student.id);
                      const check = checkAttendanceForActivityDate(activeActivity.assignedDate, selectedGroupId);
                      const attRec = check.isTaken ? check.recordsMap.get(student.id) : undefined;
                      const isAbsentOnDate = check.isTaken && attRec && (attRec.status !== 'present' && attRec.status !== 'late');
                      const novelty = attRec ? getNoveltyDetails(attRec.status) : null;

                      return (
                        <div
                          key={student.id}
                          className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                          {/* Student Info */}
                          <div className="flex items-start space-x-3 min-w-[240px]">
                            <span className="text-xs text-slate-500 font-mono w-5 text-center mt-2">
                              {idx + 1}
                            </span>
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 ${
                                student.avatarColor || 'bg-indigo-600'
                              }`}
                            >
                              {student.firstName[0]}
                              {student.lastName[0]}
                            </div>
                            <div className="space-y-0.5">
                              <h5 className="text-xs font-bold text-slate-100">
                                {student.lastName} {student.firstName}
                              </h5>
                              <p className="text-[11px] text-slate-400">
                                Acudiente: {student.guardianName}
                              </p>

                              {/* Attendance Signal on student row */}
                              {check.isTaken && isAbsentOnDate && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 animate-in fade-in">
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-200 border border-rose-700/60 text-[10px] font-bold shadow-xs">
                                    <UserX className="w-3 h-3 text-rose-400 shrink-0" />
                                    <span>Ausente en esta fecha</span>
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-rose-900 text-rose-300 font-extrabold uppercase">
                                      {novelty?.shortName || attRec?.status || 'Falta'}
                                    </span>
                                  </span>
                                  {attRec?.excuseReason && (
                                    <span
                                      className="text-[10px] text-slate-300 italic bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 truncate max-w-[150px]"
                                      title={`Motivo: ${attRec.excuseReason}`}
                                    >
                                      {attRec.excuseReason}
                                    </span>
                                  )}
                                </div>
                              )}

                              {check.isTaken && !isAbsentOnDate && (
                                <div className="pt-0.5">
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 font-medium">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                    <span>Presente en clase</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Score Input & Max Score */}
                          <div className="flex items-center space-x-2">
                            <label className="text-[11px] font-semibold text-slate-400">Nota:</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max={activeActivity.maxScore}
                              placeholder="0.0"
                              disabled={!canModifyGrades}
                              value={gradeRecord.score !== null ? gradeRecord.score : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                handleUpdateGradeRecord(student.id, { score: val });
                              }}
                              className={`w-16 text-center font-bold font-mono text-xs p-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed ${
                                gradeRecord.score === null
                                   ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                                   : gradeRecord.score >= activeActivity.passingScore
                                   ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                                   : 'bg-rose-950/40 border-rose-700 text-rose-300'
                              }`}
                            />
                            <span className="text-[11px] text-slate-500 font-mono">
                              / {activeActivity.maxScore.toFixed(1)}
                            </span>
                          </div>

                          {/* Delivery on-time selector */}
                          <div className="flex flex-wrap items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                            <button
                              type="button"
                              disabled={!canModifyGrades}
                              onClick={() => handleUpdateGradeRecord(student.id, { deliveredOnTime: 'yes' })}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
                                gradeRecord.deliveredOnTime === 'yes'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              A tiempo
                            </button>

                            <button
                              type="button"
                              disabled={!canModifyGrades}
                              onClick={() => handleUpdateGradeRecord(student.id, { deliveredOnTime: 'late' })}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
                                gradeRecord.deliveredOnTime === 'late'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Retardo
                            </button>

                            <button
                              type="button"
                              disabled={!canModifyGrades}
                              onClick={() => handleUpdateGradeRecord(student.id, { deliveredOnTime: 'no' })}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
                                gradeRecord.deliveredOnTime === 'no'
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              No entregó
                            </button>

                            <button
                              type="button"
                              disabled={!canModifyGrades}
                              onClick={() => handleUpdateGradeRecord(student.id, { deliveredOnTime: 'unexcused_absence' })}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
                                gradeRecord.deliveredOnTime === 'unexcused_absence'
                                  ? 'bg-rose-700 text-white shadow-sm ring-1 ring-rose-400'
                                  : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40'
                              }`}
                              title="Falta Injustificada"
                            >
                              Falta
                            </button>

                            <button
                              type="button"
                              disabled={!canModifyGrades}
                              onClick={() => handleUpdateGradeRecord(student.id, { deliveredOnTime: 'excused_absence' })}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
                                gradeRecord.deliveredOnTime === 'excused_absence'
                                  ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
                                  : 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/40'
                              }`}
                              title="Inasistencia con Excusa"
                            >
                              Excusa
                            </button>
                          </div>

                          {/* Comments & WhatsApp Notification Button */}
                          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                            <input
                              type="text"
                              disabled={!canModifyGrades}
                              placeholder="Observación o retroalimentación..."
                              value={gradeRecord.comments || ''}
                              onChange={(e) =>
                                handleUpdateGradeRecord(student.id, { comments: e.target.value })
                              }
                              className="text-xs bg-slate-800/60 border border-slate-700 rounded-xl px-2.5 py-1.5 w-48 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
                            />

                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppGradePreview(student)}
                              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                gradeRecord.notifiedWhatsApp
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                              title="Enviar nota por WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{gradeRecord.notifiedWhatsApp ? 'Enviado' : 'WhatsApp'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40 text-slate-500 space-y-3">
                <GraduationCap className="w-12 h-12 mx-auto text-slate-600" />
                <h4 className="text-sm font-bold text-slate-300">Selecciona o crea una actividad</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Escoge una actividad de la columna izquierda para calificar a los estudiantes, ingresar comentarios y enviar reportes a acudientes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: NIVELACIONES DE PERIODOS PASADOS                                  */}
      {/* ========================================================================= */}
      {viewMode === 'remedials' && selectedGroup && (
        <PeriodRemedialsView
          group={selectedGroup}
          students={students}
          subject={selectedSubject}
          selectedPeriod={selectedPeriod}
          periods={configuredPeriods}
          settings={settings}
          remedials={remedials}
          onUpdateRemedials={onUpdateRemedials || (() => {})}
          activities={activities}
          grades={grades}
          subjectConfigs={subjectConfigs}
          currentUser={currentUser}
          canModify={canModifyGrades}
          onLogNotification={onLogNotification}
        />
      )}
      <EvaluationWeightingModal
        isOpen={isCategoryConfigModalOpen}
        onClose={() => setIsCategoryConfigModalOpen(false)}
        categories={categories}
        onSaveCategories={handleSaveCategoryConfig}
        subjectName={selectedSubject}
        groupName={selectedGroup?.name || ''}
        allGroups={accessibleGroups}
        onApplyToAllGroups={handleApplyCategoriesToAllGroups}
      />

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT ACTIVITY                                             */}
      {/* ========================================================================= */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto border border-slate-800 text-slate-100 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <span>{activityForm.id ? 'Editar Actividad' : 'Nueva Actividad / Evaluación'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Título de la Actividad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Taller de Trigonometría, Quiz de Genética, Ensayo..."
                  value={activityForm.title}
                  onChange={(e) => setActivityForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Asignatura</label>
                  <select
                    value={activityForm.subject}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, subject: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                  >
                    {groupSubjects.map((s) => (
                      <option key={s} value={s} className="bg-slate-900 text-slate-100">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Componente / Categoría</label>
                  <select
                    value={activityForm.categoryId || categories[0]?.id}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                        {c.name} ({c.weightPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Fecha Asignación</label>
                  <input
                    type="date"
                    value={activityForm.assignedDate}
                    onChange={(e) => handleAssignedDateChange(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Fecha Entrega</label>
                  <input
                    type="date"
                    value={activityForm.dueDate}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Attendance Verification Status for Selected Date */}
              {(() => {
                const check = checkAttendanceForActivityDate(activityForm.assignedDate, selectedGroupId);
                if (check.isTaken) {
                  return (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-amber-200">
                            Llamado de Asistencia Verificado ({activityForm.assignedDate})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/50">
                          {check.absentCount} {check.absentCount === 1 ? 'ausente detectado' : 'ausentes detectados'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Se verificó el llamado de asistencia de este curso: 
                        <strong className="text-emerald-300"> {check.presentCount} presentes</strong> y 
                        <strong className="text-rose-300"> {check.absentCount} ausentes</strong>.
                        {check.absentCount > 0 
                          ? ' Los estudiantes ausentes han sido señalados automáticamente con marca de inasistencia.' 
                          : ' Todos los estudiantes estuvieron presentes.'}
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 animate-in fade-in">
                      <div className="flex items-center space-x-2">
                        <Info className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-300">
                          Sin llamado de asistencia para el {activityForm.assignedDate}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        No se ha realizado el llamado de asistencia para esta fecha. No se aplica ninguna señal de inasistencia automáticamente.
                      </p>
                    </div>
                  );
                }
              })()}

              {/* SIEE Category Equal Weight Notice */}
              {(() => {
                const selectedCat = categories.find((c) => c.id === (activityForm.categoryId || categories[0]?.id));
                return (
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/40 flex items-start space-x-2.5">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-indigo-200">
                          {selectedCat?.name || 'Categoría'} ({selectedCat?.weightPercentage || 0}% del periodo)
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        En el SIEE, todas las actividades dentro de esta categoría valen lo mismo (promedio simple). El promedio obtenido aportará el <strong className="text-indigo-300">{selectedCat?.weightPercentage}%</strong> a la nota definitiva.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nota Máxima</label>
                  <input
                    type="number"
                    step="0.1"
                    value={activityForm.maxScore}
                    onChange={(e) =>
                      setActivityForm((prev) => ({ ...prev, maxScore: Number(e.target.value) }))
                    }
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nota Mínima Aprobatoria</label>
                  <input
                    type="number"
                    step="0.1"
                    value={activityForm.passingScore}
                    onChange={(e) =>
                      setActivityForm((prev) => ({ ...prev, passingScore: Number(e.target.value) }))
                    }
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Descripción / Instrucciones</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones o temas que evaluará esta actividad..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                />
              </div>

              {/* Absent Students Selector */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <UserX className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        Estudiantes Ausentes en esta Actividad
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Se registrarán con estado <span className="text-rose-400 font-semibold">Falta Injustificada</span> en la planilla.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleLoadAbsentsFromAttendance()}
                      className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/50 text-amber-300 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      title={`Importar ausentes de la lista de asistencia del ${activityForm.assignedDate}`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sincronizar Asistencia</span>
                    </button>
                    {activityAbsentStudentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActivityAbsentStudentIds([])}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Limpiar ({activityAbsentStudentIds.length})
                      </button>
                    )}
                  </div>
                </div>

                {groupStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No hay estudiantes en este curso.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto pr-1 space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {groupStudents.map((std) => {
                        const isAbsent = activityAbsentStudentIds.includes(std.id);
                        const check = checkAttendanceForActivityDate(activityForm.assignedDate, selectedGroupId);
                        const attRec = check.isTaken ? check.recordsMap.get(std.id) : undefined;
                        const novelty = attRec ? getNoveltyDetails(attRec.status) : null;

                        return (
                          <button
                            key={std.id}
                            type="button"
                            onClick={() => {
                              if (isAbsent) {
                                setActivityAbsentStudentIds((prev) => prev.filter((id) => id !== std.id));
                              } else {
                                setActivityAbsentStudentIds((prev) => [...prev, std.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isAbsent
                                ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
                                : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0 pr-1">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                  isAbsent ? 'bg-rose-600' : std.avatarColor || 'bg-slate-600'
                                }`}
                              >
                                {std.firstName.charAt(0)}
                              </div>
                              <div className="truncate">
                                <span className="text-xs truncate font-medium block">
                                  {std.lastName} {std.firstName}
                                </span>
                                {isAbsent && attRec?.excuseReason && (
                                  <span className="text-[9px] text-slate-400 italic block truncate max-w-[130px]" title={attRec.excuseReason}>
                                    {attRec.excuseReason}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                isAbsent
                                  ? 'bg-rose-900/80 text-rose-300'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {isAbsent ? (novelty?.shortName || 'Ausente') : 'Presente'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Drive Attachments Manager */}
              <div className="pt-2 border-t border-slate-800">
                <DriveAttachmentsManager
                  attachments={activityForm.attachments || []}
                  folderSegments={buildActivityFolderPathSegments(
                    settings.schoolName,
                    selectedGroup?.grade || 'Grado',
                    selectedGroup?.name || 'Grupo',
                    activityForm.assignedDate,
                    activityForm.title || 'Actividad'
                  )}
                  onUpdateAttachments={(newAtts) =>
                    setActivityForm((prev) => ({ ...prev, attachments: newAtts }))
                  }
                  title="Documentos, Guías en PDF & Rúbricas en Google Drive"
                  description="Se guardarán en: Mi Unidad › [Colegio] › [Grado] › [Grupo] › Actividades › [Fecha - Título]"
                />
              </div>

              <div className="sticky bottom-0 bg-[#0f172a]/95 backdrop-blur-sm pt-3 pb-1 border-t border-slate-800 flex items-center justify-end space-x-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
                >
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Create Group Modal */}
      {isTeacherCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto border border-purple-800/60 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-purple-950/50 border border-purple-800/60 text-purple-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Crear Nuevo Curso / Grupo</h3>
                  <p className="text-xs text-purple-400 font-medium">Módulo de Gestión Docente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeacherCreateGroupOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTeacherSaveNewGroup} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nombre del Curso / Salón *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Grado 10°A - Mañana"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Grado Académico</label>
                  <select
                    value={newGroupForm.grade}
                    onChange={(e) => setNewGroupForm((p) => ({ ...p, grade: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    {['6°', '7°', '8°', '9°', '10°', '11°', 'Transición', '1°', '2°', '3°', '4°', '5°'].map((gr) => (
                      <option key={gr} value={gr}>{gr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Aula / Salón</label>
                  <input
                    type="text"
                    placeholder="ej. Aula 204"
                    value={newGroupForm.room}
                    onChange={(e) => setNewGroupForm((p) => ({ ...p, room: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Jornada</label>
                <select
                  value={newGroupForm.shift}
                  onChange={(e) => setNewGroupForm((p) => ({ ...p, shift: e.target.value as any }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Única">Única</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Materias (separadas por coma)</label>
                <input
                  type="text"
                  placeholder="Matemáticas, Lenguaje, Ciencias..."
                  value={newGroupForm.subjects}
                  onChange={(e) => setNewGroupForm((p) => ({ ...p, subjects: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTeacherCreateGroupOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md shadow-purple-950 cursor-pointer"
                >
                  Crear y Asignarme Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Add Student to Selected Group Modal */}
      {isTeacherAddStudentOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto border border-indigo-800/60 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-950/50 border border-indigo-800/60 text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Matricular Estudiante</h3>
                  <p className="text-xs text-indigo-400 font-medium">En {selectedGroup.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeacherAddStudentOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTeacherSaveNewStudent} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nombres *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Camilo Andrés"
                    value={newStudentForm.firstName}
                    onChange={(e) => setNewStudentForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Apellidos *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Rodríguez Pérez"
                    value={newStudentForm.lastName}
                    onChange={(e) => setNewStudentForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Documento / Matrícula</label>
                <input
                  type="text"
                  placeholder="ej. TI 1092837465"
                  value={newStudentForm.documentId}
                  onChange={(e) => setNewStudentForm((p) => ({ ...p, documentId: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                />
              </div>

              <div className="border-t border-slate-800 pt-2 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Información del Acudiente
                </span>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nombre del Acudiente *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Maria Elena Pérez"
                    value={newStudentForm.guardianName}
                    onChange={(e) => setNewStudentForm((p) => ({ ...p, guardianName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Teléfono WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="3001234567"
                      value={newStudentForm.guardianPhone}
                      onChange={(e) => setNewStudentForm((p) => ({ ...p, guardianPhone: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Parentesco</label>
                    <select
                      value={newStudentForm.guardianRelationship}
                      onChange={(e) => setNewStudentForm((p) => ({ ...p, guardianRelationship: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Madre">Madre</option>
                      <option value="Padre">Padre</option>
                      <option value="Tutor Legal">Tutor Legal</option>
                      <option value="Abuelo/a">Abuelo/a</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTeacherAddStudentOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-950 cursor-pointer"
                >
                  Matricular Estudiante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Single Preview Modal */}
      {previewData.student && (
        <WhatsAppPreviewModal
          isOpen={previewData.isOpen}
          onClose={() => setPreviewData((prev) => ({ ...prev, isOpen: false }))}
          studentName={`${previewData.student.firstName} ${previewData.student.lastName}`}
          guardianName={previewData.student.guardianName}
          guardianPhone={previewData.student.guardianPhone}
          guardianCountryCode={previewData.student.guardianCountryCode}
          initialMessage={previewData.message}
          onSendConfirm={handleConfirmSingleGradeSend}
        />
      )}

      {/* WhatsApp Bulk Queue Modal */}
      <BulkWhatsAppQueueModal
        isOpen={bulkData.isOpen}
        onClose={() => setBulkData((prev) => ({ ...prev, isOpen: false }))}
        items={bulkData.items}
        onMarkItemSent={(id) => {
          handleUpdateGradeRecord(id, {
            notifiedWhatsApp: true,
            notifiedAt: new Date().toISOString(),
          });
          setBulkData((prev) => ({
            ...prev,
            items: prev.items.map((i) => (i.id === id ? { ...i, alreadySent: true } : i)),
          }));
        }}
        onFinishAll={() => setBulkData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Student Random Roulette Modal */}
      <StudentRouletteModal
        isOpen={isRouletteModalOpen}
        onClose={() => setIsRouletteModalOpen(false)}
        students={groupStudents}
        groupName={selectedGroup?.name || 'Curso'}
        subjectName={selectedSubject}
        attendanceRecords={attendance}
        onSelectStudentForGrading={(student) => {
          setViewMode('activity');
          setSearchQuery(student.lastName);
        }}
      />

      {/* SIEE & Category Evaluation Weighting Modal */}
      <EvaluationWeightingModal
        isOpen={isCategoryConfigModalOpen}
        onClose={() => setIsCategoryConfigModalOpen(false)}
        selectedGroup={selectedGroup}
        selectedSubject={selectedSubject}
        currentCategories={categories}
        allGroups={accessibleGroups}
        allTeacherSubjects={groupSubjects}
        institutionalCategories={settings.evaluationCategories}
        onSaveCategories={handleSaveCategoryConfig}
        onApplyToAllGroups={handleApplyCategoriesToAllGroups}
      />

      {/* Quick Cell Grade & Observation Editor Modal */}
      {quickEditCell && (() => {
        const editStudent = students.find((s) => s.id === quickEditCell.studentId);
        const editActivity = activities.find((a) => a.id === quickEditCell.activityId);
        if (!editStudent || !editActivity) return null;

        const editCat = categories.find((c) => c.id === editActivity.categoryId) || DEFAULT_EVALUATION_CATEGORIES[0];
        const attCheck = checkAttendanceForActivityDate(editActivity.assignedDate, selectedGroupId);
        const attRec = attCheck.isTaken ? attCheck.recordsMap.get(editStudent.id) : undefined;
        const isAbsentOnDate =
          attCheck.isTaken && attRec && (attRec.status !== 'present' && attRec.status !== 'late');
        const isExcusedOnDate = attCheck.isTaken && attRec && attRec.status === 'excused';

        const currentStudentIndex = groupStudents.findIndex((s) => s.id === editStudent.id);
        const totalGroupStudents = groupStudents.length;
        const hasPrevStudent = currentStudentIndex > 0;
        const hasNextStudent = currentStudentIndex >= 0 && currentStudentIndex < totalGroupStudents - 1;
        const nextStudent = hasNextStudent ? groupStudents[currentStudentIndex + 1] : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto border border-indigo-700/60 text-slate-100">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-indigo-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Calificar y Retroalimentar</h3>
                    <p className="text-xs text-indigo-400 font-medium truncate max-w-[280px]">
                      {editActivity.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickEditCell(null)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Student Identification Banner with Stepper */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner">
                    {editStudent.firstName.charAt(0)}
                    {editStudent.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-100 truncate">
                      {editStudent.lastName} {editStudent.firstName}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono block truncate">
                      Doc: {editStudent.documentId || 'S/D'} • {selectedGroup?.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 justify-between sm:justify-end">
                  {/* Student index stepper / quick arrows */}
                  {currentStudentIndex >= 0 && (
                    <div className="flex items-center space-x-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 shadow-inner">
                      <button
                        type="button"
                        disabled={!hasPrevStudent}
                        onClick={() => {
                          if (hasPrevStudent) {
                            handleOpenCellEditor(editActivity.id, groupStudents[currentStudentIndex - 1].id);
                          }
                        }}
                        className={`p-0.5 rounded transition-colors ${
                          hasPrevStudent ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer' : 'text-slate-600 cursor-not-allowed'
                        }`}
                        title="Estudiante anterior (sin guardar)"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-slate-300 font-mono font-medium px-1">
                        {currentStudentIndex + 1} / {totalGroupStudents}
                      </span>
                      <button
                        type="button"
                        disabled={!hasNextStudent}
                        onClick={() => {
                          if (hasNextStudent) {
                            handleOpenCellEditor(editActivity.id, groupStudents[currentStudentIndex + 1].id);
                          }
                        }}
                        className={`p-0.5 rounded transition-colors ${
                          hasNextStudent ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer' : 'text-slate-600 cursor-not-allowed'
                        }`}
                        title="Siguiente estudiante (sin guardar)"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <span
                    className="px-2 py-1 rounded-lg text-[10px] font-bold shrink-0"
                    style={{
                      backgroundColor: `${editCat.color}20`,
                      color: editCat.color,
                      border: `1px solid ${editCat.color}40`,
                    }}
                  >
                    {editCat.name} ({editCat.weightPercentage}%)
                  </span>
                </div>
              </div>

              {/* Attendance Verification Notice for Activity Date */}
              {attCheck.isTaken && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-start space-x-2 ${
                    isAbsentOnDate
                      ? isExcusedOnDate
                        ? 'bg-sky-950/40 border-sky-800/60 text-sky-200'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                      : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  }`}
                >
                  {isAbsentOnDate ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-bold block">
                      {isAbsentOnDate
                        ? isExcusedOnDate
                          ? 'Inasistencia Justificada en esta fecha'
                          : 'Señal de Inasistencia detectada en esta fecha'
                        : 'Asistencia Verificada'}
                    </span>
                    <p className="text-[11px] opacity-90">
                      Fecha: {editActivity.assignedDate} •{' '}
                      {isAbsentOnDate
                        ? attRec?.excuseReason
                          ? `Motivo: ${attRec.excuseReason}`
                          : 'El estudiante no estuvo presente en el llamado de lista.'
                        : 'El estudiante estuvo presente en clase.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Score Input & Quick Preset Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Calificación Obtenida (0.0 - {editActivity.maxScore})
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Aprobatoria: ≥ {editActivity.passingScore}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={editActivity.maxScore}
                      autoFocus
                      placeholder="ej. 4.5"
                      value={quickEditScore}
                      onChange={(e) => setQuickEditScore(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveQuickCellGrade(true);
                        }
                      }}
                      className="w-full text-base font-bold text-indigo-300 p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      / {editActivity.maxScore}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuickEditScore('')}
                    className="px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Borrar calificación y dejar sin nota"
                  >
                    Borrar
                  </button>
                </div>

                {/* Score Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[5.0, 4.5, 4.0, 3.5, 3.0, 2.0, 1.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQuickEditScore(val.toFixed(1))}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        quickEditScore === val.toFixed(1)
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : val >= (settings.passingScore || settings.minPassingScore || 3.5)
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/60'
                          : 'bg-rose-950/40 text-rose-300 border-rose-800/40 hover:bg-rose-900/60'
                      }`}
                    >
                      {val.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery / Novelty Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Estado de Entrega / Asistencia
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'yes' as const, label: 'A tiempo', color: 'emerald' },
                    { id: 'late' as const, label: 'Con retraso', color: 'amber' },
                    { id: 'no' as const, label: 'No entregó', color: 'rose' },
                    { id: 'unexcused_absence' as const, label: 'Falta Injustificada', color: 'rose' },
                    { id: 'excused_absence' as const, label: 'Falta con Excusa', color: 'sky' },
                    { id: 'pending' as const, label: 'Pendiente', color: 'slate' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setQuickEditDelivery(st.id)}
                      className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                        quickEditDelivery === st.id
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                          : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment / Observations Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Comentario u Observación
                  </label>
                  <span className="text-[11px] text-slate-400">Visible en WhatsApp y Boletín</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="ej. Excelente trabajo y participación en clase..."
                  value={quickEditComment}
                  onChange={(e) => setQuickEditComment(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                />

                {/* Quick Comment Chips */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    'Excelente trabajo',
                    'Buen desempeño',
                    'Revisar correcciones',
                    'Falta justificada por salud',
                    'Taller pendiente de entrega',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setQuickEditComment((prev) => (prev ? `${prev}. ${chip}` : chip))
                      }
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-slate-800 gap-2.5">
                <button
                  id="btn-cancel-quick-grade"
                  type="button"
                  onClick={() => setQuickEditCell(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors text-center cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    id="btn-whatsapp-quick-grade"
                    type="button"
                    onClick={() => {
                      if (!selectedGroup) return;
                      const numScore = quickEditScore.trim() === '' ? null : parseFloat(quickEditScore.replace(',', '.'));
                      const mockGrade: GradeRecord = {
                        id: `grd-${editActivity.id}-${editStudent.id}`,
                        activityId: editActivity.id,
                        studentId: editStudent.id,
                        score: numScore,
                        deliveredOnTime: quickEditDelivery,
                        comments: quickEditComment.trim(),
                        notifiedWhatsApp: false,
                      };
                      const msg = generateGradeMessage(mockGrade, editActivity, editStudent, selectedGroup, settings);
                      setPreviewData({
                        isOpen: true,
                        student: editStudent,
                        gradeRecord: mockGrade,
                        activity: editActivity,
                        message: msg,
                      });
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl transition-all cursor-pointer"
                    title="Vista previa y envío por WhatsApp al acudiente"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    id="btn-save-quick-grade-only"
                    type="button"
                    onClick={() => handleSaveQuickCellGrade(false)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors shadow-sm cursor-pointer"
                    title="Guardar nota y cerrar este cuadro"
                  >
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Guardar</span>
                  </button>

                  <button
                    id="btn-save-and-next-quick-grade"
                    type="button"
                    onClick={() => handleSaveQuickCellGrade(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-xl shadow-md shadow-indigo-950 transition-all cursor-pointer"
                    title={
                      hasNextStudent
                        ? `Guardar nota de ${editStudent.firstName} y pasar inmediatamente a ${nextStudent?.firstName || 'siguiente'}`
                        : 'Guardar y finalizar (último estudiante)'
                    }
                  >
                    <span>{hasNextStudent ? 'Guardar y Siguiente' : 'Guardar y Finalizar'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Google Drive Global Explorer Modal */}
      <GoogleDriveExplorerModal
        isOpen={isDriveExplorerOpen}
        onClose={() => setIsDriveExplorerOpen(false)}
        settings={settings}
        groups={accessibleGroups}
        activities={activities}
        dailyLogs={[]}
        onUpdateActivities={onUpdateActivities}
      />
    </div>
  );
};
