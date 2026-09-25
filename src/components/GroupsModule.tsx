import React, { useState, useMemo } from 'react';
import { Group, Student, Teacher, AuthUser, SchoolSettings } from '../types';
import { deleteRecordFromMySQL } from '../utils/mysqlService';
import { DEFAULT_INSTITUTION_SUBJECTS } from '../utils/storage';
import { resolveActiveTeacher, isTeacherDegreeOrTitle } from '../utils/teacherUtils';
import { sortGroupsAscending } from '../utils/groupUtils';
import { 
  School, 
  Plus, 
  Users, 
  BookOpen, 
  Edit, 
  Trash2, 
  Clock, 
  X, 
  ArrowRight, 
  UserPlus, 
  CheckCircle2, 
  Layers, 
  GraduationCap,
  Calendar,
  Building,
  Check
} from 'lucide-react';

interface GroupsModuleProps {
  groups: Group[];
  students: Student[];
  settings?: SchoolSettings;
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  onUpdateGroups: (groups: Group[]) => void;
  onUpdateStudents?: (students: Student[]) => void;
  onUpdateTeachers?: (teachers: Teacher[]) => void;
  onSelectGroupForAttendance?: (groupId: string) => void;
  onSelectGroupForGrades?: (groupId: string) => void;
}

export const GroupsModule: React.FC<GroupsModuleProps> = ({
  groups,
  students,
  settings,
  currentUser,
  teachers = [],
  onUpdateGroups,
  onUpdateStudents,
  onUpdateTeachers,
  onSelectGroupForAttendance,
  onSelectGroupForGrades,
}) => {
  const isTeacher = currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';
  const [filterMode, setFilterMode] = useState<'all' | 'assigned'>(isTeacher ? 'assigned' : 'all');
  
  // Group Create/Edit Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState<{
    id?: string;
    name: string;
    grade: string;
    room: string;
    shift: 'Mañana' | 'Tarde' | 'Única' | 'Nocturna';
    schoolYear: string;
  }>({
    name: '',
    grade: '10°',
    room: '',
    shift: 'Mañana',
    schoolYear: settings?.schoolYear || '2026',
  });

  // Student Enrollment Modal State
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [targetGroupIdForStudent, setTargetGroupIdForStudent] = useState<string>('');
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    documentId: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianRelationship: 'Madre / Padre',
  });

  // Teacher Subject-to-Group Association Modal State
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [selectedGroupIdsForAssoc, setSelectedGroupIdsForAssoc] = useState<Set<string>>(new Set());
  const [selectedSubjectForAssoc, setSelectedSubjectForAssoc] = useState<string>('');
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');
  const [targetTeacherIdForAssoc, setTargetTeacherIdForAssoc] = useState<string>('');

  // Active Teacher Profile (using robust resolver)
  const activeTeacher = useMemo(() => {
    return resolveActiveTeacher(currentUser, teachers);
  }, [currentUser, teachers]);

  // Edit Subject Modal State
  const [isEditSubjectModalOpen, setIsEditSubjectModalOpen] = useState(false);
  const [editSubjectData, setEditSubjectData] = useState<{
    groupId: string;
    groupName: string;
    oldSubject: string;
    newSubject: string;
    customSubject: string;
    teacherId: string;
  }>({
    groupId: '',
    groupName: '',
    oldSubject: '',
    newSubject: '',
    customSubject: '',
    teacherId: '',
  });

  // Catalog of Institutional Subjects
  const availableInstitutionSubjects = useMemo(() => {
    if (settings?.institutionSubjects && settings.institutionSubjects.length > 0) {
      return settings.institutionSubjects;
    }
    return DEFAULT_INSTITUTION_SUBJECTS;
  }, [settings?.institutionSubjects]);

  // Groups list filtered based on teacher access and sorted from menor a mayor
  const displayedGroups = useMemo(() => {
    if (!isTeacher || filterMode === 'all' || !currentUser) {
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

    return sortGroupsAscending(filtered);
  }, [groups, isTeacher, filterMode, currentUser, activeTeacher]);

  // Open Create Group Modal (Only Name, Grade, Room, Shift, SchoolYear)
  const handleOpenCreate = () => {
    setGroupForm({
      name: '',
      grade: '10°',
      room: '',
      shift: 'Mañana',
      schoolYear: settings?.schoolYear || '2026',
    });
    setIsGroupModalOpen(true);
  };

  // Open Edit Group Modal (Only Name, Grade, Room, Shift, SchoolYear)
  const handleOpenEdit = (g: Group) => {
    setGroupForm({
      id: g.id,
      name: g.name,
      grade: g.grade,
      room: g.room || '',
      shift: g.shift,
      schoolYear: g.schoolYear || settings?.schoolYear || '2026',
    });
    setIsGroupModalOpen(true);
  };

  // Save Group (Creation or Update without teacher or subject)
  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    if (groupForm.id) {
      // Edit existing group
      const updated = groups.map((g) =>
        g.id === groupForm.id
          ? {
              ...g,
              name: groupForm.name.trim(),
              grade: groupForm.grade.trim() || '10°',
              room: groupForm.room.trim() || '',
              shift: groupForm.shift,
              schoolYear: groupForm.schoolYear.trim() || settings?.schoolYear || '2026',
            }
          : g
      );
      onUpdateGroups(updated);
    } else {
      // Create new group
      const newGroupId = `grp-${Date.now()}`;
      const newGroup: Group = {
        id: newGroupId,
        name: groupForm.name.trim(),
        grade: groupForm.grade.trim() || '10°',
        room: groupForm.room.trim() || '',
        shift: groupForm.shift,
        schoolYear: groupForm.schoolYear.trim() || settings?.schoolYear || '2026',
        subjects: [], // Starts empty until teachers associate their subjects
        createdAt: new Date().toISOString().split('T')[0],
        ...(isTeacher && currentUser?.id ? { createdByTeacherId: currentUser.id } : {}),
        assignedTeacherIds: isTeacher && currentUser?.id ? [currentUser.id] : [],
      };

      onUpdateGroups([...groups, newGroup]);

      // If teacher created it, automatically link group to teacher
      if (isTeacher && currentUser && onUpdateTeachers && activeTeacher) {
        const updatedTeachers = teachers.map((t) => {
          if (t.id === currentUser.id || t.id === activeTeacher.id) {
            const curGroups = t.assignedGroupIds || [];
            const curGrades = t.assignedGrades || [];
            return {
              ...t,
              assignedGroupIds: [...curGroups, newGroupId],
              assignedGrades: curGrades.includes(groupForm.grade) ? curGrades : [...curGrades, groupForm.grade],
            };
          }
          return t;
        });
        onUpdateTeachers(updatedTeachers);
      }
    }

    setIsGroupModalOpen(false);
  };

  // Open Subject Association Modal
  const handleOpenAssociateModal = (preselectedGroupId?: string) => {
    if (preselectedGroupId) {
      setSelectedGroupIdsForAssoc(new Set([preselectedGroupId]));
    } else {
      setSelectedGroupIdsForAssoc(new Set());
    }

    // Default subject from teacher assigned subjects or first catalog subject (never teacher specialty degree)
    const isDegreeTitle = (s: string) => /^(licenciad|magister|magíster|especialista|ingenier|profesor|docente|fil[oó]sof|bi[oó]log|qu[ií]mic|abogad|psic[oó]log)/i.test(s.trim()) && (s.includes(' en ') || s.includes(' de ') || s.includes(' y ') || s.includes(' con ') || s.includes(' - '));
    const cleanTeacherSubs = (activeTeacher?.assignedSubjects || []).filter((s) => !isDegreeTitle(s));
    const defaultSub = cleanTeacherSubs[0] || availableInstitutionSubjects[0] || 'Matemáticas';
    setSelectedSubjectForAssoc(defaultSub);
    setCustomSubjectInput('');
    setTargetTeacherIdForAssoc(currentUser?.id || activeTeacher?.id || teachers[0]?.id || '');
    setIsAssociateModalOpen(true);
  };

  // Confirm Subject-to-Group Association
  const handleConfirmAssociateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupIdsForAssoc.size === 0) {
      alert('Por favor selecciona al menos un grupo escolar para asociar.');
      return;
    }

    const finalSubject = (customSubjectInput.trim() || selectedSubjectForAssoc.trim());
    if (!finalSubject) {
      alert('Por favor selecciona o escribe la asignatura a asociar.');
      return;
    }

    const teacherToAssignId = isTeacher ? (currentUser?.id || activeTeacher?.id) : targetTeacherIdForAssoc;
    const targetTeacher = teachers.find((t) => t.id === teacherToAssignId) || activeTeacher;

    // 1. Update groups with the subject and teacherId
    const updatedGroups = groups.map((g) => {
      if (selectedGroupIdsForAssoc.has(g.id)) {
        const currentSubjects = g.subjects || [];
        const hasSub = currentSubjects.some((s) => s.toLowerCase() === finalSubject.toLowerCase());
        const newSubjects = hasSub ? currentSubjects : [...currentSubjects, finalSubject];

        const currentTeachers = g.assignedTeacherIds || [];
        const hasTeacher = teacherToAssignId && currentTeachers.includes(teacherToAssignId);
        const newTeachers = (hasTeacher || !teacherToAssignId) ? currentTeachers : [...currentTeachers, teacherToAssignId];

        return {
          ...g,
          subjects: newSubjects,
          assignedTeacherIds: newTeachers,
        };
      }
      return g;
    });

    onUpdateGroups(updatedGroups);

    // 2. Update teacher with the group and subject assignments
    if (onUpdateTeachers && teacherToAssignId && targetTeacher) {
      const selectedGroupsList = groups.filter((g) => selectedGroupIdsForAssoc.has(g.id));
      const newGrades = selectedGroupsList.map((g) => g.grade).filter(Boolean);

      const updatedTeachers = teachers.map((t) => {
        if (t.id === teacherToAssignId) {
          const curGroups = new Set(t.assignedGroupIds || []);
          const curGrades = new Set(t.assignedGrades || []);
          const curSubjects = new Set(t.assignedSubjects || []);
          
          selectedGroupIdsForAssoc.forEach((id) => curGroups.add(id));
          newGrades.forEach((gr) => curGrades.add(gr));
          curSubjects.add(finalSubject);

          // Update structured assignments
          const currentAssignments = t.assignments || [];
          const newAssignments = [...currentAssignments];
          selectedGroupIdsForAssoc.forEach((gid) => {
            if (!newAssignments.some((a) => a.groupId === gid && a.subject.toLowerCase() === finalSubject.toLowerCase())) {
              newAssignments.push({
                groupId: gid,
                subject: finalSubject,
                assignedAt: new Date().toISOString(),
              });
            }
          });

          return {
            ...t,
            assignedGroupIds: Array.from(curGroups),
            assignedGrades: Array.from(curGrades),
            assignedSubjects: Array.from(curSubjects),
            assignments: newAssignments,
          };
        }
        return t;
      });

      onUpdateTeachers(updatedTeachers);
    }

    setIsAssociateModalOpen(false);
  };

  // Open Edit Subject Modal
  const handleOpenEditSubject = (groupId: string, subjectName: string, teacherId?: string) => {
    const grp = groups.find((g) => g.id === groupId);
    const targetTId = teacherId || activeTeacher?.id || currentUser?.id || '';
    setEditSubjectData({
      groupId,
      groupName: grp?.name || 'Curso',
      oldSubject: subjectName,
      newSubject: subjectName,
      customSubject: '',
      teacherId: targetTId,
    });
    setIsEditSubjectModalOpen(true);
  };

  // Save Edit Subject Modal
  const handleSaveEditSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = (editSubjectData.customSubject.trim() || editSubjectData.newSubject.trim());
    if (!finalSubject) {
      alert('Por favor especifica un nombre para la asignatura.');
      return;
    }

    const { groupId, oldSubject, teacherId } = editSubjectData;
    const targetTeacherId = teacherId || activeTeacher?.id || currentUser?.id;

    // 1. Update Groups
    const updatedGroups = groups.map((g) => {
      if (g.id === groupId) {
        const curSubs = g.subjects || [];
        // Replace oldSubject with finalSubject, keeping list unique
        const filtered = curSubs.filter((s) => s.toLowerCase() !== oldSubject.toLowerCase());
        const newSubs = Array.from(new Set([...filtered, finalSubject]));

        const curTeachers = g.assignedTeacherIds || [];
        const newTeachers = (targetTeacherId && !curTeachers.includes(targetTeacherId))
          ? [...curTeachers, targetTeacherId]
          : curTeachers;

        return {
          ...g,
          subjects: newSubs,
          assignedTeacherIds: newTeachers,
        };
      }
      return g;
    });
    onUpdateGroups(updatedGroups);

    // 2. Update Teachers
    if (onUpdateTeachers && targetTeacherId) {
      const updatedTeachers = teachers.map((t) => {
        if (t.id === targetTeacherId) {
          const curAssignments = t.assignments || [];
          let updatedAssignments: typeof curAssignments;

          if (curAssignments.some((a) => a.groupId === groupId && a.subject.toLowerCase() === oldSubject.toLowerCase())) {
            // Replace matching assignment
            updatedAssignments = curAssignments.map((a) =>
              a.groupId === groupId && a.subject.toLowerCase() === oldSubject.toLowerCase()
                ? { ...a, subject: finalSubject, assignedAt: new Date().toISOString() }
                : a
            );
          } else {
            // Add new assignment
            updatedAssignments = [
              ...curAssignments,
              { groupId, subject: finalSubject, assignedAt: new Date().toISOString() },
            ];
          }

          const curGroupIds = new Set(t.assignedGroupIds || []);
          curGroupIds.add(groupId);

          const curSubjects = new Set(t.assignedSubjects || []);
          curSubjects.add(finalSubject);

          return {
            ...t,
            assignments: updatedAssignments,
            assignedGroupIds: Array.from(curGroupIds),
            assignedSubjects: Array.from(curSubjects),
          };
        }
        return t;
      });
      onUpdateTeachers(updatedTeachers);
    }

    setIsEditSubjectModalOpen(false);
  };

  // Unlink a subject from a group for the active teacher or specified teacher
  const handleUnlinkSubjectFromGroup = (groupId: string, subjectName: string, teacherId?: string) => {
    const grp = groups.find((g) => g.id === groupId);
    const targetTeacherId = teacherId || activeTeacher?.id || currentUser?.id;
    const targetTeacher = teachers.find((t) => t.id === targetTeacherId) || activeTeacher;

    if (
      !confirm(
        `¿Deseas desvincular la asignatura "${subjectName}" del curso "${grp?.name || 'Curso'}"?`
      )
    ) {
      return;
    }

    // 1. Update teacher assignments
    let remainingTeacherAssignmentsInGroup = false;

    if (onUpdateTeachers && targetTeacherId) {
      const updatedTeachers = teachers.map((t) => {
        if (t.id === targetTeacherId) {
          const filteredAssignments = (t.assignments || []).filter(
            (a) => !(a.groupId === groupId && a.subject.toLowerCase() === subjectName.toLowerCase())
          );

          // Check if this teacher still has other subjects in this group
          const stillHasInGroup = filteredAssignments.some((a) => a.groupId === groupId);
          if (stillHasInGroup) {
            remainingTeacherAssignmentsInGroup = true;
          }

          const newAssignedGroupIds = stillHasInGroup
            ? (t.assignedGroupIds || [])
            : (t.assignedGroupIds || []).filter((id) => id !== groupId);

          return {
            ...t,
            assignments: filteredAssignments,
            assignedGroupIds: newAssignedGroupIds,
          };
        }
        return t;
      });
      onUpdateTeachers(updatedTeachers);
    }

    // 2. Update Group subjects (check if other teachers still teach this subject in this group)
    const otherTeachersTeachingSubjectInGroup = teachers.some((t) => {
      if (t.id === targetTeacherId) return false;
      return (t.assignments || []).some(
        (a) => a.groupId === groupId && a.subject.toLowerCase() === subjectName.toLowerCase()
      );
    });

    const updatedGroups = groups.map((g) => {
      if (g.id === groupId) {
        const newSubjects = otherTeachersTeachingSubjectInGroup
          ? g.subjects
          : (g.subjects || []).filter((s) => s.toLowerCase() !== subjectName.toLowerCase());

        const newAssignedTeachers = remainingTeacherAssignmentsInGroup
          ? (g.assignedTeacherIds || [])
          : (g.assignedTeacherIds || []).filter((tid) => tid !== targetTeacherId);

        return {
          ...g,
          subjects: newSubjects,
          assignedTeacherIds: newAssignedTeachers,
        };
      }
      return g;
    });
    onUpdateGroups(updatedGroups);
  };

  // Student Enrollment Handler
  const handleOpenAddStudent = (groupId: string) => {
    setTargetGroupIdForStudent(groupId);
    setStudentForm({
      firstName: '',
      lastName: '',
      documentId: '',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      guardianRelationship: 'Madre / Padre',
    });
    setIsAddStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.firstName.trim() || !studentForm.lastName.trim() || !targetGroupIdForStudent) return;

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
      id: `std-${Date.now()}`,
      firstName: studentForm.firstName.trim(),
      lastName: studentForm.lastName.trim(),
      documentId: studentForm.documentId.trim() || `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
      groupId: targetGroupIdForStudent,
      status: 'active',
      guardianName: studentForm.guardianName.trim() || 'Acudiente Principal',
      guardianPhone: studentForm.guardianPhone.trim() || '3000000000',
      guardianEmail: studentForm.guardianEmail.trim() || '',
      guardianRelationship: studentForm.guardianRelationship || 'Madre / Padre',
      guardianCountryCode: '57',
      avatarColor: randomColor,
      createdByTeacherId: currentUser?.id,
    };

    if (onUpdateStudents) {
      onUpdateStudents([...students, newStudent]);
    }

    setIsAddStudentModalOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    const studentCount = students.filter((s) => s.groupId === groupId).length;
    if (studentCount > 0) {
      if (!confirm(`Este grupo tiene ${studentCount} estudiantes matriculados. ¿Deseas eliminarlo de todos modos?`)) {
        return;
      }
    } else {
      if (!confirm('¿Estás seguro de eliminar este curso escolar?')) {
        return;
      }
    }

    deleteRecordFromMySQL('grupos', groupId).catch((err) => {
      console.error('Error al eliminar curso de MySQL:', err);
    });
    onUpdateGroups(groups.filter((g) => g.id !== groupId));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="bg-slate-900/80 rounded-3xl p-6 shadow-xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <School className="w-5 h-5" />
            </div>
            <span>Gestión de Cursos y Grupos Escolares</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isTeacher 
              ? 'Crea cursos, matricula estudiantes y asocia tus asignaturas para calificar y evaluar.'
              : 'Administra los cursos institucionales, salones, jornadas y asignaciones académicas.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          {isTeacher && (
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('assigned')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterMode === 'assigned'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mis Cursos ({displayedGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({groups.length})
              </button>
            </div>
          )}

          <button
            id="btn-associate-subject-to-group"
            type="button"
            onClick={() => handleOpenAssociateModal()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60 hover:bg-purple-900/60 rounded-xl shadow-sm transition-all cursor-pointer"
            title="Asociar uno o varios grupos a una asignatura"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Asociar Asignatura a Grupo</span>
          </button>

          <button
            id="btn-create-group"
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Curso / Grupo</span>
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedGroups.map((group) => {
          const groupStudents = students.filter((s) => s.groupId === group.id);
          const activeStudents = groupStudents.filter((s) => s.status === 'active');
          const isCreatedByMe = currentUser && group.createdByTeacherId === currentUser.id;
          const isAssignedToMe = isTeacher && currentUser && (
            (activeTeacher?.assignedGroupIds || []).includes(group.id) ||
            (activeTeacher?.assignedGrades || []).includes(group.grade) ||
            (group.assignedTeacherIds || []).includes(currentUser.id)
          );

          // 1. Get active teacher's specific subjects for this group
          const myDirectAssignments: string[] = (activeTeacher?.assignments || [])
            .filter((a) => a.groupId === group.id)
            .map((a) => a.subject)
            .filter((s): s is string => Boolean(s) && !isTeacherDegreeOrTitle(s));

          const fallbackTeacherSubjects: string[] = isTeacher && myDirectAssignments.length === 0
            ? (group.subjects || [])
                .filter((s) => (activeTeacher?.assignedSubjects || []).some((ts) => ts.toLowerCase() === s.toLowerCase()))
                .filter((s): s is string => Boolean(s) && !isTeacherDegreeOrTitle(s))
            : myDirectAssignments;

          const mySubjectsInGroup: string[] = Array.from(new Set(fallbackTeacherSubjects));

          // 2. Get other teachers' subjects in this group
          const otherTeachersAssocs: Array<{ subject: string; teacherName: string; teacherId: string }> = [];
          teachers.forEach((t) => {
            if (!activeTeacher || t.id !== activeTeacher.id) {
              (t.assignments || [])
                .filter((a) => a.groupId === group.id)
                .forEach((a) => {
                  if (a.subject && !isTeacherDegreeOrTitle(a.subject) && !mySubjectsInGroup.includes(a.subject)) {
                    if (!otherTeachersAssocs.some((x) => x.subject.toLowerCase() === a.subject.toLowerCase())) {
                      otherTeachersAssocs.push({
                        subject: a.subject,
                        teacherName: t.name,
                        teacherId: t.id,
                      });
                    }
                  }
                });
            }
          });

          // Unassigned group subjects
          const unassignedSubjects = (group.subjects || []).filter(
            (s) =>
              !mySubjectsInGroup.some((ms) => ms.toLowerCase() === s.toLowerCase()) &&
              !otherTeachersAssocs.some((ot) => ot.subject.toLowerCase() === s.toLowerCase()) &&
              !isTeacherDegreeOrTitle(s)
          );

          return (
            <div
              key={group.id}
              id={`group-card-${group.id}`}
              className={`bg-slate-900/80 rounded-2xl border shadow-xl transition-all p-5 flex flex-col justify-between space-y-4 ${
                isCreatedByMe || isAssignedToMe
                  ? 'border-indigo-800/60 bg-gradient-to-b from-indigo-950/20 to-slate-900/80'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top part */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-[11px] font-bold text-indigo-300 uppercase bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/40">
                        {group.grade}
                      </span>
                      {isCreatedByMe && (
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-1.5 py-0.5 rounded-md">
                          ★ Creado por ti
                        </span>
                      )}
                      {isAssignedToMe && !isCreatedByMe && (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded-md">
                          ✓ Asignado
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">{group.name}</h3>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(group)}
                      className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Editar información del curso"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                      title="Eliminar curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Group Details (Name, Grade, Room, Shift, School Year) */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-medium">Jornada</span>
                    <span className="font-semibold text-slate-200 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{group.shift}</span>
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-medium">Año Lectivo</span>
                    <span className="font-semibold text-slate-200 flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{group.schoolYear || '2026'}</span>
                    </span>
                  </div>

                  {group.room && (
                    <div className="space-y-0.5 col-span-2 pt-1.5 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Salón / Aula</span>
                      <span className="font-semibold text-indigo-300 flex items-center space-x-1">
                        <Building className="w-3 h-3 text-indigo-400" />
                        <span>{group.room}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* TEACHER VIEW: MY ASSOCIATED SUBJECTS & OTHER TEACHERS      */}
                {/* ========================================================= */}
                {isTeacher ? (
                  <div className="space-y-2 pt-1 border-t border-slate-800/80">
                    {/* My Subjects Section */}
                    <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-purple-300 flex items-center space-x-1">
                          <BookOpen className="w-3 h-3 text-purple-400" />
                          <span>Tus Asignaturas en este curso:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenAssociateModal(group.id)}
                          className="text-[10px] text-purple-300 hover:text-purple-100 font-bold hover:underline flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Asociar Asignatura</span>
                        </button>
                      </div>

                      {mySubjectsInGroup.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {mySubjectsInGroup.map((sub) => (
                            <div
                              key={sub}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-900/70 border border-purple-600/70 text-purple-100 text-xs font-bold shadow-sm"
                            >
                              <span>{sub}</span>
                              <div className="flex items-center space-x-0.5 ml-1 border-l border-purple-700/80 pl-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSubject(group.id, sub, activeTeacher?.id)}
                                  className="text-purple-300 hover:text-white p-0.5 rounded transition-colors"
                                  title={`Editar asignatura "${sub}" para este curso`}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkSubjectFromGroup(group.id, sub, activeTeacher?.id)}
                                  className="text-purple-300 hover:text-rose-300 p-0.5 rounded transition-colors"
                                  title={`Quitar asignatura "${sub}" de este curso`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-purple-300/80 italic flex items-center justify-between">
                          <span>No tienes asignaturas vinculadas a este curso.</span>
                          <button
                            type="button"
                            onClick={() => handleOpenAssociateModal(group.id)}
                            className="text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-500 px-2 py-0.5 rounded-lg"
                          >
                            + Vincular
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Other Teachers' Subjects in this Group (Read-Only for security) */}
                    {(otherTeachersAssocs.length > 0 || unassignedSubjects.length > 0) && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-semibold text-slate-400 block">
                          Otras asignaturas en este curso:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {otherTeachersAssocs.map((ot) => (
                            <span
                              key={`${ot.teacherId}_${ot.subject}`}
                              className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium px-2 py-0.5 rounded-md flex items-center space-x-1"
                              title={`Dictada por: ${ot.teacherName} (solo modificable por su docente o el administrador)`}
                            >
                              <span>{ot.subject}</span>
                              <span className="text-[9px] text-slate-400 font-normal">({ot.teacherName})</span>
                            </span>
                          ))}
                          {unassignedSubjects.map((sub) => (
                            <span
                              key={sub}
                              className="text-[10px] bg-slate-850 text-slate-400 border border-slate-800 font-normal px-2 py-0.5 rounded-md"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ========================================================= */
                  /* ADMIN VIEW: ALL SUBJECTS & TEACHERS WITH EDIT & UNLINK    */
                  /* ========================================================= */
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Materias y Docentes ({group.subjects?.length || 0}):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenAssociateModal(group.id)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                      >
                        + Asociar Materia
                      </button>
                    </div>

                    {(group.subjects && group.subjects.length > 0) || otherTeachersAssocs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {/* Render all assigned teachers' subjects */}
                        {teachers.flatMap((t) =>
                          (t.assignments || [])
                            .filter((a) => a.groupId === group.id && a.subject && !isTeacherDegreeOrTitle(a.subject))
                            .map((a) => ({
                              subject: a.subject,
                              teacherId: t.id,
                              teacherName: t.name,
                            }))
                        ).map((item, idx) => (
                          <div
                            key={`${item.teacherId}_${item.subject}_${idx}`}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-medium"
                          >
                            <span>{item.subject}</span>
                            <span className="text-[9px] text-indigo-300 font-normal">({item.teacherName})</span>
                            <div className="flex items-center space-x-0.5 ml-1 pl-1 border-l border-slate-700">
                              <button
                                type="button"
                                onClick={() => handleOpenEditSubject(group.id, item.subject, item.teacherId)}
                                className="text-slate-400 hover:text-white p-0.5"
                                title="Editar materia"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnlinkSubjectFromGroup(group.id, item.subject, item.teacherId)}
                                className="text-slate-400 hover:text-rose-400 p-0.5"
                                title="Quitar materia de este curso"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Unassigned subjects */}
                        {unassignedSubjects.map((sub) => (
                          <div
                            key={sub}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-850 border border-slate-800 text-slate-400 text-[10px]"
                          >
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => handleUnlinkSubjectFromGroup(group.id, sub)}
                              className="text-slate-500 hover:text-rose-400 ml-0.5"
                              title="Quitar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Sin materias vinculadas. Haz clic en "+ Asociar Materia" para vincularla.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom stats & action buttons */}
              <div className="pt-3 border-t border-slate-800 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>
                      <strong className="text-slate-100">{activeStudents.length}</strong> estudiantes matriculados
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddStudent(group.id)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 rounded-lg transition-colors cursor-pointer"
                    title="Matricular un estudiante en este grupo"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Estudiante</span>
                  </button>
                </div>

                {/* Quick actions for attendance & grades */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                  {onSelectGroupForAttendance && (
                    <button
                      onClick={() => onSelectGroupForAttendance(group.id)}
                      className="inline-flex items-center space-x-1 font-bold text-slate-400 hover:text-indigo-300 transition-colors"
                    >
                      <span>Tomar Asistencia</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {onSelectGroupForGrades && (
                    <button
                      onClick={() => onSelectGroupForGrades(group.id)}
                      className="inline-flex items-center space-x-1 font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Planilla de Notas</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT GROUP (ONLY Name, Grade, Room, Shift, School Year)   */}
      {/* ========================================================================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <School className="w-5 h-5 text-indigo-400" />
                <span>{groupForm.id ? 'Editar Grupo / Curso' : 'Crear Nuevo Curso o Grupo'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3.5">
              {/* 1. Nombre del grupo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nombre del Grupo *</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Grado 10° A (o 10-1)"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 2. Grado */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Grado *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: 10°, 9°, 11°, 1°"
                    value={groupForm.grade}
                    onChange={(e) => setGroupForm((prev) => ({ ...prev, grade: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                  />
                </div>

                {/* 3. Salón (opcional) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Salón (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Aula 204"
                    value={groupForm.room}
                    onChange={(e) => setGroupForm((prev) => ({ ...prev, room: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 4. Jornada */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Jornada *</label>
                  <select
                    value={groupForm.shift}
                    onChange={(e) => setGroupForm((prev) => ({ ...prev, shift: e.target.value as any }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Única">Única</option>
                    <option value="Nocturna">Nocturna</option>
                  </select>
                </div>

                {/* 5. Año lectivo */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Año Lectivo *</label>
                  <input
                    required
                    type="text"
                    placeholder="2026"
                    value={groupForm.schoolYear}
                    onChange={(e) => setGroupForm((prev) => ({ ...prev, schoolYear: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                💡 Las asignaturas y docentes se asocian de forma independiente después de crear el grupo y matricular los estudiantes.
              </p>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 transition-colors cursor-pointer"
                >
                  Guardar Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSOCIATE SUBJECT TO GROUP(S) (DOCENTE / ADMIN)                    */}
      {/* ========================================================================= */}
      {isAssociateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-purple-800/60 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-purple-300 flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>Asociar Asignatura al Docente y Grupo</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAssociateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAssociateSubject} className="space-y-4">
              {/* If admin is logged in, allow choosing which teacher */}
              {isAdmin && teachers.length > 0 && (
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <label className="text-xs font-bold text-slate-300">Docente a Asignar:</label>
                  <select
                    value={targetTeacherIdForAssoc}
                    onChange={(e) => setTargetTeacherIdForAssoc(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.specialty}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject Selection from Catalog */}
              <div className="space-y-2 bg-purple-950/20 p-3.5 rounded-2xl border border-purple-800/40">
                <label className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <span>Elige la Asignatura / Materia a Vincular: *</span>
                </label>

                <select
                  value={selectedSubjectForAssoc}
                  onChange={(e) => {
                    setSelectedSubjectForAssoc(e.target.value);
                    if (e.target.value !== 'custom') {
                      setCustomSubjectInput('');
                    }
                  }}
                  className="w-full text-xs font-bold p-2.5 bg-slate-800 border border-purple-500/50 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {availableInstitutionSubjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                  <option value="custom">➕ Otra asignatura personalizada...</option>
                </select>

                {selectedSubjectForAssoc === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Escribe el nombre de la nueva asignatura..."
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-purple-600 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 mt-2"
                  />
                )}
              </div>

              {/* Group(s) Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Selecciona el o los Cursos ({selectedGroupIdsForAssoc.size} seleccionados):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGroupIdsForAssoc.size === groups.length) {
                        setSelectedGroupIdsForAssoc(new Set());
                      } else {
                        setSelectedGroupIdsForAssoc(new Set(groups.map((g) => g.id)));
                      }
                    }}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300"
                  >
                    {selectedGroupIdsForAssoc.size === groups.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800">
                  {sortGroupsAscending(groups).map((g) => {
                    const isSelected = selectedGroupIdsForAssoc.has(g.id);
                    const studentCount = students.filter((s) => s.groupId === g.id && s.status === 'active').length;
                    const alreadyHasSub = (g.subjects || []).some(
                      (s) => s.toLowerCase() === (customSubjectInput.trim() || selectedSubjectForAssoc.trim()).toLowerCase()
                    );

                    return (
                      <label
                        key={g.id}
                        className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-950/60 border-purple-600 text-purple-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedGroupIdsForAssoc);
                            if (e.target.checked) {
                              newSet.add(g.id);
                            } else {
                              newSet.delete(g.id);
                            }
                            setSelectedGroupIdsForAssoc(newSet);
                          }}
                          className="w-4 h-4 text-purple-600 rounded bg-slate-800 border-slate-700 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold truncate">{g.name}</span>
                            {alreadyHasSub && (
                              <span className="text-[9px] bg-slate-800 text-purple-400 font-bold px-1 rounded border border-purple-800/40">
                                Ya vinculada
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {g.grade} • Jornada {g.shift} • {studentCount} est.
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssociateModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={selectedGroupIdsForAssoc.size === 0}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-purple-950/50 cursor-pointer"
                >
                  Asociar a {selectedGroupIdsForAssoc.size} Curso(s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD STUDENT TO GROUP                                               */}
      {/* ========================================================================= */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-indigo-800/60 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-950/50 border border-indigo-800/60 text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Matricular Estudiante</h3>
                  <p className="text-xs text-indigo-400 font-medium">
                    {groups.find((g) => g.id === targetGroupIdForStudent)?.name || 'Curso Seleccionado'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nombres *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Daniel"
                    value={studentForm.firstName}
                    onChange={(e) => setStudentForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Apellidos *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Vargas Ortiz"
                    value={studentForm.lastName}
                    onChange={(e) => setStudentForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Documento / Matrícula</label>
                <input
                  type="text"
                  placeholder="ej. TI 1029384756"
                  value={studentForm.documentId}
                  onChange={(e) => setStudentForm((p) => ({ ...p, documentId: e.target.value }))}
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
                    placeholder="ej. Rosa Ortiz"
                    value={studentForm.guardianName}
                    onChange={(e) => setStudentForm((p) => ({ ...p, guardianName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Teléfono WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="3101234567"
                      value={studentForm.guardianPhone}
                      onChange={(e) => setStudentForm((p) => ({ ...p, guardianPhone: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Parentesco</label>
                    <select
                      value={studentForm.guardianRelationship}
                      onChange={(e) => setStudentForm((p) => ({ ...p, guardianRelationship: e.target.value }))}
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
                  onClick={() => setIsAddStudentModalOpen(false)}
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

      {/* ========================================================================= */}
      {/* MODAL: EDIT SUBJECT / ASIGNATURA                                         */}
      {/* ========================================================================= */}
      {isEditSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-purple-800/60 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-purple-950/50 border border-purple-800/60 text-purple-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Editar Asignatura</h3>
                  <p className="text-xs text-purple-400 font-medium">
                    Curso: {editSubjectData.groupName} • Materia: <span className="font-bold text-slate-200">{editSubjectData.oldSubject}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubject} className="space-y-4">
              <div className="space-y-2 bg-purple-950/20 p-3.5 rounded-2xl border border-purple-800/40">
                <label className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <span>Nuevo nombre de la Asignatura / Materia:</span>
                </label>

                <select
                  value={editSubjectData.newSubject}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditSubjectData((p) => ({
                      ...p,
                      newSubject: val,
                      customSubject: val === 'custom' ? p.customSubject : '',
                    }));
                  }}
                  className="w-full text-xs font-bold p-2.5 bg-slate-800 border border-purple-500/50 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {!availableInstitutionSubjects.includes(editSubjectData.oldSubject) && (
                    <option value={editSubjectData.oldSubject}>
                      {editSubjectData.oldSubject} (Actual)
                    </option>
                  )}
                  {availableInstitutionSubjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                  <option value="custom">➕ Otro nombre personalizado...</option>
                </select>

                {(editSubjectData.newSubject === 'custom' || !availableInstitutionSubjects.includes(editSubjectData.newSubject)) && (
                  <div className="space-y-1 pt-2">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Escribe el nombre de la Asignatura:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Robótica y Programación"
                      value={editSubjectData.customSubject || editSubjectData.newSubject}
                      onChange={(e) =>
                        setEditSubjectData((p) => ({ ...p, customSubject: e.target.value, newSubject: 'custom' }))
                      }
                      className="w-full text-xs p-2.5 bg-slate-800 border border-purple-600 text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditSubjectModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-950/50 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
