import React, { useState, useMemo } from 'react';
import { Teacher, Group, Student, SchoolSettings } from '../types';
import { DEFAULT_INSTITUTION_SUBJECTS } from '../utils/storage';
import { sortGroupsAscending } from '../utils/groupUtils';
import { 
  GraduationCap, 
  School, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit,
  Search, 
  Filter, 
  CheckCircle2, 
  Users, 
  Clock, 
  ArrowRight,
  Sparkles,
  Layers,
  X
} from 'lucide-react';

interface AcademicAssignmentsAdminProps {
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  settings: SchoolSettings;
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onUpdateGroups: (groups: Group[]) => void;
}

export const AcademicAssignmentsAdmin: React.FC<AcademicAssignmentsAdminProps> = ({
  teachers,
  groups,
  students,
  settings,
  onUpdateTeachers,
  onUpdateGroups,
}) => {
  const sortedGroups = useMemo(() => sortGroupsAscending(groups), [groups]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set([sortedGroups[0]?.id || groups[0]?.id || '']));
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Assignment Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<{
    originalTeacherId: string;
    originalGroupId: string;
    originalSubject: string;
    newTeacherId: string;
    newGroupId: string;
    newSubject: string;
    customSubject: string;
  }>({
    originalTeacherId: '',
    originalGroupId: '',
    originalSubject: '',
    newTeacherId: '',
    newGroupId: '',
    newSubject: '',
    customSubject: '',
  });

  const availableSubjects = useMemo(() => {
    if (settings.institutionSubjects && settings.institutionSubjects.length > 0) {
      return settings.institutionSubjects;
    }
    return DEFAULT_INSTITUTION_SUBJECTS;
  }, [settings.institutionSubjects]);

  // Set default subject on first load
  React.useEffect(() => {
    if (!selectedSubject && availableSubjects.length > 0) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  const showFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Compile all current active assignments into a flat array
  const allAssignments = useMemo(() => {
    const list: Array<{
      id: string;
      teacherId: string;
      teacherName: string;
      teacherSpecialty: string;
      groupId: string;
      groupName: string;
      groupGrade: string;
      groupShift: string;
      groupRoom?: string;
      subject: string;
    }> = [];

    teachers.forEach((t) => {
      // 1. Structured assignments
      if (t.assignments && t.assignments.length > 0) {
        t.assignments.forEach((a) => {
          const grp = groups.find((g) => g.id === a.groupId);
          if (grp) {
            list.push({
              id: `${t.id}_${grp.id}_${a.subject}`,
              teacherId: t.id,
              teacherName: t.name,
              teacherSpecialty: t.specialty,
              groupId: grp.id,
              groupName: grp.name,
              groupGrade: grp.grade,
              groupShift: grp.shift,
              groupRoom: grp.room,
              subject: a.subject,
            });
          }
        });
      } else {
        // 2. Legacy fallback for teachers with assignedGroupIds & assignedSubjects
        (t.assignedGroupIds || []).forEach((gid) => {
          const grp = groups.find((g) => g.id === gid);
          if (grp) {
            const isDegreeTitle = (s: string) => /^(licenciad|magister|magíster|especialista|ingenier|profesor|docente|fil[oó]sof|bi[oó]log|qu[ií]mic|abogad|psic[oó]log)/i.test(s.trim()) && (s.includes(' en ') || s.includes(' de ') || s.includes(' y ') || s.includes(' con ') || s.includes(' - '));

            const cleanTeacherSubs = (t.assignedSubjects || []).filter((s) => !isDegreeTitle(s));
            const cleanGroupSubs = (grp.subjects || []).filter((s) => !isDegreeTitle(s));

            const subjectsToLink = cleanTeacherSubs.length > 0
              ? cleanTeacherSubs
              : (cleanGroupSubs.length > 0 ? cleanGroupSubs : ['Matemáticas']);

            subjectsToLink.forEach((sub) => {
              const uniqueKey = `${t.id}_${grp.id}_${sub}`;
              if (!list.some((item) => item.id === uniqueKey)) {
                list.push({
                  id: uniqueKey,
                  teacherId: t.id,
                  teacherName: t.name,
                  teacherSpecialty: t.specialty,
                  groupId: grp.id,
                  groupName: grp.name,
                  groupGrade: grp.grade,
                  groupShift: grp.shift,
                  groupRoom: grp.room,
                  subject: sub,
                });
              }
            });
          }
        });
      }
    });

    return list;
  }, [teachers, groups]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return allAssignments.filter((item) => {
      if (teacherFilter !== 'all' && item.teacherId !== teacherFilter) return false;
      if (groupFilter !== 'all' && item.groupId !== groupFilter) return false;
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        return (
          item.teacherName.toLowerCase().includes(query) ||
          item.groupName.toLowerCase().includes(query) ||
          item.subject.toLowerCase().includes(query) ||
          item.groupGrade.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [allAssignments, teacherFilter, groupFilter, searchFilter]);

  // Handle Assign Teacher + Groups + Subject
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      alert('Por favor selecciona un docente.');
      return;
    }
    if (selectedGroupIds.size === 0) {
      alert('Por favor selecciona al menos un curso o grupo escolar.');
      return;
    }

    const finalSubject = (customSubject.trim() || selectedSubject.trim());
    if (!finalSubject) {
      alert('Por favor especifica la asignatura a asociar.');
      return;
    }

    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    if (!teacher) return;

    // 1. Update Groups
    const updatedGroups = groups.map((g) => {
      if (selectedGroupIds.has(g.id)) {
        const currentSubs = g.subjects || [];
        const hasSub = currentSubs.some((s) => s.toLowerCase() === finalSubject.toLowerCase());
        const newSubs = hasSub ? currentSubs : [...currentSubs, finalSubject];

        const currentTeachers = g.assignedTeacherIds || [];
        const hasTeacher = currentTeachers.includes(selectedTeacherId);
        const newTeachers = hasTeacher ? currentTeachers : [...currentTeachers, selectedTeacherId];

        return {
          ...g,
          subjects: newSubs,
          assignedTeacherIds: newTeachers,
        };
      }
      return g;
    });
    onUpdateGroups(updatedGroups);

    // 2. Update Teacher
    const selectedGroupsList = groups.filter((g) => selectedGroupIds.has(g.id));
    const newGrades = selectedGroupsList.map((g) => g.grade).filter(Boolean);

    const updatedTeachers = teachers.map((t) => {
      if (t.id === selectedTeacherId) {
        const curGroups = new Set(t.assignedGroupIds || []);
        const curGrades = new Set(t.assignedGrades || []);
        const curSubjects = new Set(t.assignedSubjects || []);

        selectedGroupIds.forEach((id) => curGroups.add(id));
        newGrades.forEach((gr) => curGrades.add(gr));
        curSubjects.add(finalSubject);

        const currentAssignments = t.assignments || [];
        const newAssignments = [...currentAssignments];

        selectedGroupIds.forEach((gid) => {
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
    showFeedback(`Asignación académica de "${finalSubject}" guardada exitosamente para ${teacher.name}.`);
  };

  // Unlink/Delete a specific assignment
  const handleUnlinkAssignment = (teacherId: string, groupId: string, subjectName: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    const grp = groups.find((g) => g.id === groupId);

    if (
      !confirm(
        `¿Deseas desvincular la materia "${subjectName}" del curso "${grp?.name || 'Curso'}" asignada al docente ${teacher?.name || 'Docente'}?`
      )
    ) {
      return;
    }

    // 1. Update Teacher
    const updatedTeachers = teachers.map((t) => {
      if (t.id === teacherId) {
        const filteredAssignments = (t.assignments || []).filter(
          (a) => !(a.groupId === groupId && a.subject.toLowerCase() === subjectName.toLowerCase())
        );

        // Check if teacher still has other assignments in this group
        const stillInGroup = filteredAssignments.some((a) => a.groupId === groupId);
        const newGroupIds = stillInGroup
          ? t.assignedGroupIds
          : (t.assignedGroupIds || []).filter((id) => id !== groupId);

        return {
          ...t,
          assignedGroupIds: newGroupIds,
          assignments: filteredAssignments,
        };
      }
      return t;
    });
    onUpdateTeachers(updatedTeachers);

    // 2. Update Group if no one else teaches this subject in this group
    const otherTeachersTeachingThisInGroup = teachers.some((t) => {
      if (t.id === teacherId) return false;
      return (t.assignments || []).some(
        (a) => a.groupId === groupId && a.subject.toLowerCase() === subjectName.toLowerCase()
      );
    });

    if (!otherTeachersTeachingThisInGroup) {
      const updatedGroups = groups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            subjects: (g.subjects || []).filter((s) => s.toLowerCase() !== subjectName.toLowerCase()),
          };
        }
        return g;
      });
      onUpdateGroups(updatedGroups);
    }

    showFeedback('Asignación desvinculada exitosamente.');
  };

  // Open Edit Assignment Modal
  const handleOpenEditAssignment = (item: {
    teacherId: string;
    groupId: string;
    subject: string;
  }) => {
    const isCustom = !availableSubjects.includes(item.subject);
    setEditData({
      originalTeacherId: item.teacherId,
      originalGroupId: item.groupId,
      originalSubject: item.subject,
      newTeacherId: item.teacherId,
      newGroupId: item.groupId,
      newSubject: isCustom ? 'custom' : item.subject,
      customSubject: isCustom ? item.subject : '',
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Assignment
  const handleSaveEditAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = editData.newSubject === 'custom'
      ? editData.customSubject.trim()
      : editData.newSubject.trim();

    if (!finalSubject) {
      alert('Por favor especifica un nombre para la asignatura.');
      return;
    }
    if (!editData.newTeacherId) {
      alert('Por favor selecciona un docente.');
      return;
    }
    if (!editData.newGroupId) {
      alert('Por favor selecciona un grupo.');
      return;
    }

    const {
      originalTeacherId,
      originalGroupId,
      originalSubject,
      newTeacherId,
      newGroupId,
    } = editData;

    // 1. Update Teachers
    const updatedTeachers = teachers.map((t) => {
      let tAssignments = [...(t.assignments || [])];

      // Remove from original teacher if this is the original teacher
      if (t.id === originalTeacherId) {
        tAssignments = tAssignments.filter(
          (a) => !(a.groupId === originalGroupId && a.subject.toLowerCase() === originalSubject.toLowerCase())
        );
      }

      // Add to new teacher if this is the new teacher
      if (t.id === newTeacherId) {
        if (!tAssignments.some((a) => a.groupId === newGroupId && a.subject.toLowerCase() === finalSubject.toLowerCase())) {
          tAssignments.push({
            groupId: newGroupId,
            subject: finalSubject,
            assignedAt: new Date().toISOString(),
          });
        }
      }

      const assignedGroupIds = Array.from(new Set(tAssignments.map((a) => a.groupId)));
      const assignedSubjects = Array.from(new Set(tAssignments.map((a) => a.subject)));

      return {
        ...t,
        assignments: tAssignments,
        assignedGroupIds,
        assignedSubjects,
      };
    });

    onUpdateTeachers(updatedTeachers);

    // 2. Update Groups
    const updatedGroups = groups.map((g) => {
      let groupSubs = [...(g.subjects || [])];
      let groupTeachers = [...(g.assignedTeacherIds || [])];

      // If this was original group, check if subject/teacher still exists
      if (g.id === originalGroupId) {
        const otherTeachersInOrigGroup = updatedTeachers.some((t) =>
          (t.assignments || []).some((a) => a.groupId === originalGroupId && a.subject.toLowerCase() === originalSubject.toLowerCase())
        );
        if (!otherTeachersInOrigGroup) {
          groupSubs = groupSubs.filter((s) => s.toLowerCase() !== originalSubject.toLowerCase());
        }
        const teacherStillHasOtherSubsInGroup = (updatedTeachers.find((t) => t.id === originalTeacherId)?.assignments || []).some(
          (a) => a.groupId === originalGroupId
        );
        if (!teacherStillHasOtherSubsInGroup) {
          groupTeachers = groupTeachers.filter((id) => id !== originalTeacherId);
        }
      }

      // If this is new group, ensure subject and teacher are present
      if (g.id === newGroupId) {
        if (!groupSubs.some((s) => s.toLowerCase() === finalSubject.toLowerCase())) {
          groupSubs.push(finalSubject);
        }
        if (!groupTeachers.includes(newTeacherId)) {
          groupTeachers.push(newTeacherId);
        }
      }

      return {
        ...g,
        subjects: groupSubs,
        assignedTeacherIds: groupTeachers,
      };
    });

    onUpdateGroups(updatedGroups);
    setIsEditModalOpen(false);
    showFeedback('Asignación académica actualizada exitosamente.');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Asignación Académica & Carga Docente
              </h2>
              <p className="text-xs text-slate-400">
                Asocia cualquier docente con los cursos escolares y las asignaturas que dicta para calificar y evaluar.
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-bold">
            📋 {allAssignments.length} Asignaciones Activas
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-bold">
            👨‍🏫 {teachers.length} Docentes
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center space-x-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Assignment Creator + Assignments Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form to Link Teacher -> Group(s) -> Subject */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-purple-300 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Nueva Asignación de Carga</span>
          </h3>

          <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
            {/* Step 1: Select Teacher */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                1. Selecciona el Docente: *
              </label>
              <select
                required
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  const tch = teachers.find((t) => t.id === e.target.value);
                  if (tch?.specialty && availableSubjects.includes(tch.specialty)) {
                    setSelectedSubject(tch.specialty);
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Subject from Catalog */}
            <div className="space-y-1.5 bg-purple-950/20 p-3 rounded-2xl border border-purple-800/40">
              <label className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                2. Asignatura a Dictar: *
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomSubject('');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-purple-500/50 rounded-xl text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="custom">➕ Otra asignatura personalizada...</option>
              </select>

              {selectedSubject === 'custom' && (
                <input
                  type="text"
                  required
                  placeholder="Escribe el nombre de la asignatura..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-purple-500 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 mt-2"
                />
              )}
            </div>

            {/* Step 3: Select Course(s) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  3. Cursos / Grupos a Vincular: *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedGroupIds.size === groups.length) {
                      setSelectedGroupIds(new Set());
                    } else {
                      setSelectedGroupIds(new Set(groups.map((g) => g.id)));
                    }
                  }}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                >
                  {selectedGroupIds.size === groups.length ? 'Limpiar' : 'Todos'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1 bg-slate-950/40 p-2 rounded-xl border border-slate-800">
                {sortedGroups.map((g) => {
                  const isChecked = selectedGroupIds.has(g.id);
                  const count = students.filter((s) => s.groupId === g.id).length;

                  return (
                    <label
                      key={g.id}
                      className={`flex items-center space-x-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-purple-950/50 border-purple-600/70 text-purple-100'
                          : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = new Set(selectedGroupIds);
                          if (e.target.checked) next.add(g.id);
                          else next.delete(g.id);
                          setSelectedGroupIds(next);
                        }}
                        className="w-4 h-4 text-purple-600 rounded bg-slate-800 border-slate-700 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-xs truncate block text-slate-200">{g.name}</span>
                        <p className="text-[10px] text-slate-400">
                          {g.grade} • {g.shift} • {count} alumnos
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={selectedGroupIds.size === 0}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-950/50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Asignación ({selectedGroupIds.size} Cursos)</span>
            </button>
          </form>
        </div>

        {/* Right Column: Table / Grid of all current academic assignments */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Matriz de Carga Académica Registrada ({filteredAssignments.length})</span>
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Teacher Filter */}
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">Todos los Docentes</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Group Filter */}
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">Todos los Cursos</option>
                {sortedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative w-full sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Assignments List */}
          {filteredAssignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
              {filteredAssignments.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-2">
                    {/* Header: Teacher & Subject */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                          Docente
                        </span>
                        <h4 className="text-xs font-bold text-slate-100">{item.teacherName}</h4>
                        <p className="text-[10px] text-slate-400">{item.teacherSpecialty}</p>
                      </div>

                      <span className="px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-800/50 text-purple-300 font-bold text-[11px]">
                        {item.subject}
                      </span>
                    </div>

                    {/* Course details */}
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-200">{item.groupName}</span>
                        <p className="text-[10px] text-slate-400">
                          Grado {item.groupGrade} • Jornada {item.groupShift} {item.groupRoom ? `• ${item.groupRoom}` : ''}
                        </p>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950/50 text-indigo-300 font-medium border border-indigo-800/40">
                        {item.groupGrade}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Habilitado para notas</span>
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAssignment(item)}
                        className="px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-purple-100 text-[11px] font-bold border border-purple-800/40 transition-colors flex items-center space-x-1"
                        title="Editar docente, curso o asignatura de esta asignación"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnlinkAssignment(item.teacherId, item.groupId, item.subject)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 text-[11px] font-bold border border-rose-800/30 transition-colors flex items-center space-x-1"
                        title="Desvincular esta materia y curso del docente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Desvincular</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
              <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">
                No hay asignaciones académicas que coincidan con los filtros.
              </p>
              <p className="text-[11px] text-slate-500">
                Utiliza el formulario de la izquierda para vincular docentes con sus cursos y asignaturas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR ASIGNACIÓN ACADÉMICA                                        */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Editar Asignación Académica</h3>
                  <p className="text-xs text-slate-400">
                    Modifica el docente, curso escolar o la asignatura vinculada.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAssignment} className="space-y-4 text-xs">
              {/* Docente selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  1. Docente Titular
                </label>
                <select
                  value={editData.newTeacherId}
                  onChange={(e) => setEditData({ ...editData, newTeacherId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-medium focus:border-purple-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar Docente --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.specialty ? `(${t.specialty})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Curso selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  2. Curso Escolar
                </label>
                <select
                  value={editData.newGroupId}
                  onChange={(e) => setEditData({ ...editData, newGroupId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-medium focus:border-purple-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar Curso --</option>
                  {sortedGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (Grado {g.grade} - Jornada {g.shift})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asignatura selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  3. Asignatura
                </label>
                <select
                  value={editData.newSubject}
                  onChange={(e) => setEditData({ ...editData, newSubject: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-medium focus:border-purple-500 focus:outline-none"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  <option value="custom">-- Otra / Personalizada --</option>
                </select>

                {editData.newSubject === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={editData.customSubject}
                      onChange={(e) => setEditData({ ...editData, customSubject: e.target.value })}
                      placeholder="Escribe el nombre de la materia..."
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-purple-500/50 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Modal footer buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors shadow-lg shadow-purple-600/30 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
