import React, { useState, useMemo } from 'react';
import { 
  Group, 
  Student, 
  Activity, 
  GradeRecord, 
  SchoolSettings, 
  AuthUser, 
  Teacher, 
  WorkGroupSet, 
  WorkGroupTeam, 
  WorkGroupMember, 
  ABPRole,
  GroupSeatingPlan 
} from '../types';
import { sortGroupsAscending } from '../utils/groupUtils';
import { DEFAULT_ABP_ROLES } from '../utils/storage';
import { 
  Users, 
  Sparkles, 
  Shuffle, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Award, 
  Crown, 
  Mic, 
  FileText, 
  Search, 
  Package, 
  Palette, 
  Shield, 
  Send, 
  FolderPlus, 
  GraduationCap, 
  ArrowRightLeft, 
  Info, 
  Check, 
  X, 
  Save, 
  Layers,
  Flame,
  Star,
  Settings2,
  Lock,
  ChevronRight,
  FlaskConical,
  Upload,
  Download,
  CheckCircle
} from 'lucide-react';

interface WorkGroupsModuleProps {
  groups: Group[];
  students: Student[];
  activities: Activity[];
  grades: GradeRecord[];
  settings: SchoolSettings;
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  workGroupSets: WorkGroupSet[];
  onUpdateWorkGroupSets: (sets: WorkGroupSet[]) => void;
  onUpdateGrades: (grades: GradeRecord[]) => void;
  onUpdateActivities?: (activities: Activity[]) => void;
  onLogNotification?: (studentId: string, message: string) => void;
  seatingPlans?: GroupSeatingPlan[];
  onUpdateSeatingPlans?: (plans: GroupSeatingPlan[]) => void;
}

const TEAM_COLORS = [
  { id: 'indigo', name: 'Índigo', bg: 'bg-indigo-950/40', border: 'border-indigo-500/50', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { id: 'emerald', name: 'Esmeralda', bg: 'bg-emerald-950/40', border: 'border-emerald-500/50', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'amber', name: 'Ámbar', bg: 'bg-amber-950/40', border: 'border-amber-500/50', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'purple', name: 'Púrpura', bg: 'bg-purple-950/40', border: 'border-purple-500/50', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'rose', name: 'Rosa Coral', bg: 'bg-rose-950/40', border: 'border-rose-500/50', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'sky', name: 'Celeste', bg: 'bg-sky-950/40', border: 'border-sky-500/50', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { id: 'teal', name: 'Turquesa', bg: 'bg-teal-950/40', border: 'border-teal-500/50', text: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { id: 'orange', name: 'Naranja', bg: 'bg-orange-950/40', border: 'border-orange-500/50', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
];

export const WorkGroupsModule: React.FC<WorkGroupsModuleProps> = ({
  groups,
  students,
  activities,
  grades,
  settings,
  currentUser,
  teachers = [],
  workGroupSets,
  onUpdateWorkGroupSets,
  onUpdateGrades,
  onUpdateActivities,
  onLogNotification,
  seatingPlans = [],
  onUpdateSeatingPlans,
}) => {
  const isTeacher = currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';

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

  const groupSubjects = useMemo(() => {
    return selectedGroup?.subjects || ['Matemáticas', 'Ciencias Naturales', 'Lengua Castellana', 'Inglés', 'Sociales'];
  }, [selectedGroup]);

  const [selectedSubject, setSelectedSubject] = useState<string>(groupSubjects[0] || 'Ciencias Naturales');

  // Sync selected subject if group changes
  React.useEffect(() => {
    if (groupSubjects.length > 0 && !groupSubjects.includes(selectedSubject)) {
      setSelectedSubject(groupSubjects[0]);
    }
  }, [groupSubjects, selectedSubject]);

  // Available students in this group
  const groupStudents = useMemo(() => {
    return students
      .filter((s) => s.groupId === selectedGroupId && s.status === 'active')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, selectedGroupId]);

  // Sets of work groups for the selected group
  const setsForGroup = useMemo(() => {
    return workGroupSets.filter((s) => s.groupId === selectedGroupId);
  }, [workGroupSets, selectedGroupId]);

  const [activeSetId, setActiveSetId] = useState<string>(setsForGroup[0]?.id || '');

  // Keep active set valid
  React.useEffect(() => {
    if (setsForGroup.length > 0) {
      if (!activeSetId || !setsForGroup.some((s) => s.id === activeSetId)) {
        setActiveSetId(setsForGroup[0].id);
      }
    } else {
      setActiveSetId('');
    }
  }, [setsForGroup, activeSetId]);

  const activeSet = useMemo(() => {
    return workGroupSets.find((s) => s.id === activeSetId);
  }, [workGroupSets, activeSetId]);

  // Roles state (default + custom roles)
  const allRoles: ABPRole[] = useMemo(() => {
    const custom = activeSet?.customRoles || [];
    return [...DEFAULT_ABP_ROLES, ...custom];
  }, [activeSet]);

  // Modals & States
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isNewSetModalOpen, setIsNewSetModalOpen] = useState(false);
  const [isEditRolesModalOpen, setIsEditRolesModalOpen] = useState(false);
  const [isGradeTeamModalOpen, setIsGradeTeamModalOpen] = useState(false);
  const [selectedTeamToGrade, setSelectedTeamToGrade] = useState<WorkGroupTeam | null>(null);

  // Quick student transfer modal
  const [isMoveStudentModalOpen, setIsMoveStudentModalOpen] = useState(false);
  const [movingStudent, setMovingStudent] = useState<{ student: Student; currentTeamId?: string } | null>(null);

  // Lab Synchronization Modal State
  const [isLabSyncModalOpen, setIsLabSyncModalOpen] = useState(false);
  const [labSyncMode, setLabSyncMode] = useState<'import' | 'export'>('import');
  const [labSyncCreateAsNew, setLabSyncCreateAsNew] = useState(false);
  const [labSyncAutoRoles, setLabSyncAutoRoles] = useState(true);

  // Current seating plan for this group
  const currentSeatingPlan = useMemo(() => {
    return seatingPlans?.find((p) => p.groupId === selectedGroupId);
  }, [seatingPlans, selectedGroupId]);

  // Laboratory tables info with seated students
  const labTablesInfo = useMemo(() => {
    if (!currentSeatingPlan?.laboratory?.seats) return [];
    const tableCount = currentSeatingPlan.laboratory.tableCount || 6;
    const prefix = currentSeatingPlan.laboratory.tableNamePrefix || 'Mesa';

    const tables: {
      tableIndex: number;
      tableName: string;
      seats: { seatIndex: number; studentId: string | null; student?: Student }[];
      students: Student[];
    }[] = [];

    for (let t = 0; t < tableCount; t++) {
      const tableSeats = currentSeatingPlan.laboratory.seats.filter((s) => s.tableIndex === t);
      const tableStudents: Student[] = [];
      tableSeats.forEach((s) => {
        if (s.studentId) {
          const std = groupStudents.find((st) => st.id === s.studentId);
          if (std) tableStudents.push(std);
        }
      });

      tables.push({
        tableIndex: t,
        tableName: `${prefix} ${t + 1}`,
        seats: tableSeats.map((s) => ({
          ...s,
          student: groupStudents.find((st) => st.id === s.studentId),
        })),
        students: tableStudents,
      });
    }
    return tables;
  }, [currentSeatingPlan, groupStudents]);

  const totalLabAssignedStudents = useMemo(() => {
    return labTablesInfo.reduce((acc, t) => acc + t.students.length, 0);
  }, [labTablesInfo]);

  const labTablesWithStudents = useMemo(() => {
    return labTablesInfo.filter((t) => t.students.length > 0);
  }, [labTablesInfo]);

  // Generator settings
  const [generatorConfig, setGeneratorConfig] = useState<{
    mode: 'by_teams' | 'by_size' | 'from_lab';
    teamCount: number;
    teamSize: number;
    balanceGender: boolean;
    autoAssignRoles: boolean;
  }>({
    mode: 'by_teams',
    teamCount: 4,
    teamSize: 4,
    balanceGender: true,
    autoAssignRoles: true,
  });

  // New Set Form
  const [newSetForm, setNewSetForm] = useState({
    title: '',
    subject: selectedSubject,
    period: 'Periodo 1',
    description: '',
  });

  // Custom role creation form
  const [newCustomRole, setNewCustomRole] = useState({
    name: '',
    description: '',
    color: 'indigo',
    iconName: 'Award',
  });

  // Grade Team Form
  const [teamGradeForm, setTeamGradeForm] = useState<{
    activityId: string;
    score: number;
    deliveredOnTime: 'yes' | 'late' | 'no';
    comments: string;
    individualOverrides: Record<string, number>;
  }>({
    activityId: '',
    score: 4.5,
    deliveredOnTime: 'yes',
    comments: 'Excelente trabajo colaborativo en equipo y cumplimiento de los roles asignados.',
    individualOverrides: {},
  });

  // Activities for grading
  const groupActivities = useMemo(() => {
    return activities.filter((a) => a.groupId === selectedGroupId && (!selectedSubject || a.subject === selectedSubject));
  }, [activities, selectedGroupId, selectedSubject]);

  // Unassigned students in current active set
  const unassignedStudents = useMemo(() => {
    if (!activeSet) return groupStudents;
    const assignedIds = new Set<string>();
    activeSet.teams.forEach((t) => {
      t.members.forEach((m) => assignedIds.add(m.studentId));
    });
    return groupStudents.filter((s) => !assignedIds.has(s.id));
  }, [groupStudents, activeSet]);

  // Helper to get role icon
  const renderRoleIcon = (iconName?: string, className = 'w-3.5 h-3.5') => {
    switch (iconName) {
      case 'Crown':
        return <Crown className={className} />;
      case 'Mic':
        return <Mic className={className} />;
      case 'FileText':
        return <FileText className={className} />;
      case 'Search':
        return <Search className={className} />;
      case 'Package':
        return <Package className={className} />;
      case 'Palette':
        return <Palette className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Star':
        return <Star className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  // Helper to get role color class
  const getRoleBadgeClasses = (color: string) => {
    switch (color) {
      case 'indigo':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'purple':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'sky':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'teal':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'orange':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // ----------------------------------------------------
  // GENERATE RANDOM TEAMS (SHUFFLE ALGORITHM)
  // ----------------------------------------------------
  const handleGenerateRandomTeams = () => {
    if (groupStudents.length === 0) {
      alert('No hay estudiantes matriculados en este curso para conformar equipos.');
      return;
    }

    let numTeams = 4;
    if (generatorConfig.mode === 'by_teams') {
      numTeams = Math.max(1, Math.min(generatorConfig.teamCount, groupStudents.length));
    } else {
      const size = Math.max(1, generatorConfig.teamSize);
      numTeams = Math.max(1, Math.ceil(groupStudents.length / size));
    }

    // Separate by gender if balance is enabled
    let pool: Student[] = [];
    if (generatorConfig.balanceGender) {
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

    // Create teams
    const newTeams: WorkGroupTeam[] = Array.from({ length: numTeams }, (_, i) => {
      const colorObj = TEAM_COLORS[i % TEAM_COLORS.length];
      return {
        id: `team-${Date.now()}-${i + 1}`,
        name: `Equipo ${i + 1}`,
        color: colorObj.id,
        projectTitle: '',
        members: [],
      };
    });

    // Distribute students round-robin
    pool.forEach((student, idx) => {
      const teamIdx = idx % numTeams;
      const team = newTeams[teamIdx];
      const memberCount = team.members.length;

      let assignedRole: string | undefined = undefined;
      if (generatorConfig.autoAssignRoles) {
        const availableRole = DEFAULT_ABP_ROLES[memberCount % DEFAULT_ABP_ROLES.length];
        if (availableRole) {
          assignedRole = availableRole.id;
        }
      }

      team.members.push({
        studentId: student.id,
        roleId: assignedRole,
      });
    });

    if (activeSet) {
      // Update existing set
      const updatedSets = workGroupSets.map((s) =>
        s.id === activeSet.id
          ? {
              ...s,
              teams: newTeams,
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      onUpdateWorkGroupSets(updatedSets);
    } else {
      // Create new set
      const newSet: WorkGroupSet = {
        id: `wg-set-${Date.now()}`,
        groupId: selectedGroupId,
        subject: selectedSubject,
        period: 'Periodo 1',
        title: `Equipos ABP - ${selectedSubject}`,
        description: `Grupos de trabajo colaborativo generados el ${new Date().toLocaleDateString('es-CO')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teams: newTeams,
      };
      onUpdateWorkGroupSets([...workGroupSets, newSet]);
      setActiveSetId(newSet.id);
    }

    setIsGeneratorModalOpen(false);
  };

  // ----------------------------------------------------
  // IMPORT / ORGANIZE TEAMS DIRECTLY FROM LABORATORY SEATING PLAN
  // ----------------------------------------------------
  const handleSyncFromLabSeating = (createAsNew = false, autoAssignRoles = true, customTitle?: string) => {
    if (labTablesWithStudents.length === 0) {
      alert(
        'No hay estudiantes asignados en las mesas del plano de laboratorio para este curso.\n\nPuedes ir a la pestaña "Plano de Puestos" > "Laboratorio" para ubicar o auto-asignar a los estudiantes en las mesas primero.'
      );
      return;
    }

    const newTeams: WorkGroupTeam[] = labTablesWithStudents.map((table, idx) => {
      const colorObj = TEAM_COLORS[table.tableIndex % TEAM_COLORS.length] || TEAM_COLORS[idx % TEAM_COLORS.length];
      return {
        id: `team-lab-${Date.now()}-${table.tableIndex + 1}`,
        name: table.tableName,
        color: colorObj.id,
        projectTitle: '',
        members: table.students.map((std, mIdx) => ({
          studentId: std.id,
          roleId: autoAssignRoles ? DEFAULT_ABP_ROLES[mIdx % DEFAULT_ABP_ROLES.length]?.id : undefined,
        })),
      };
    });

    if (createAsNew || !activeSet) {
      const title =
        customTitle?.trim() ||
        `Equipos ABP - Mesas de Laboratorio (${selectedSubject})`;
      const newSet: WorkGroupSet = {
        id: `wg-set-${Date.now()}`,
        groupId: selectedGroupId,
        subject: selectedSubject,
        period: 'Periodo 1',
        title,
        description: `Equipos conformados exactamente según la distribución de ${newTeams.length} mesas del Plano de Laboratorio (${new Date().toLocaleDateString('es-CO')}).`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teams: newTeams,
      };
      onUpdateWorkGroupSets([...workGroupSets, newSet]);
      setActiveSetId(newSet.id);
    } else {
      const updatedSets = workGroupSets.map((s) =>
        s.id === activeSet.id
          ? {
              ...s,
              teams: newTeams,
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      onUpdateWorkGroupSets(updatedSets);
    }

    setIsLabSyncModalOpen(false);
    setIsGeneratorModalOpen(false);
  };

  // ----------------------------------------------------
  // EXPORT CURRENT ABP TEAMS TO LABORATORY SEATING PLAN
  // ----------------------------------------------------
  const handleExportTeamsToLabSeating = () => {
    if (!activeSet || activeSet.teams.length === 0) {
      alert('No hay equipos en el proyecto actual para exportar al laboratorio.');
      return;
    }
    if (!onUpdateSeatingPlans) return;

    const teamCount = activeSet.teams.length;
    const maxMembers = Math.max(...activeSet.teams.map((t) => t.members.length), 4);

    const newLabSeats: { tableIndex: number; seatIndex: number; studentId: string | null }[] = [];
    activeSet.teams.forEach((team, tIdx) => {
      team.members.forEach((m, mIdx) => {
        newLabSeats.push({
          tableIndex: tIdx,
          seatIndex: mIdx,
          studentId: m.studentId,
        });
      });
    });

    const existingPlan = seatingPlans?.find((p) => p.groupId === selectedGroupId);
    const updatedPlan: GroupSeatingPlan = existingPlan
      ? {
          ...existingPlan,
          laboratory: {
            ...existingPlan.laboratory,
            tableCount: Math.max(existingPlan.laboratory.tableCount || 6, teamCount),
            seatsPerTable: Math.max(existingPlan.laboratory.seatsPerTable || 4, maxMembers),
            seats: newLabSeats,
          },
          lastUpdated: new Date().toISOString(),
        }
      : {
          id: `plan-${selectedGroupId}`,
          groupId: selectedGroupId,
          activeType: 'laboratory',
          classroom: { rows: 5, columns: 6, seats: [] },
          laboratory: {
            tableCount: Math.max(6, teamCount),
            seatsPerTable: Math.max(4, maxMembers),
            tableNamePrefix: 'Mesa',
            seats: newLabSeats,
          },
          lastUpdated: new Date().toISOString(),
        };

    const existingIdx = seatingPlans?.findIndex((p) => p.groupId === selectedGroupId) ?? -1;
    let newPlans: GroupSeatingPlan[];
    if (seatingPlans && existingIdx >= 0) {
      newPlans = [...seatingPlans];
      newPlans[existingIdx] = updatedPlan;
    } else {
      newPlans = [...(seatingPlans || []), updatedPlan];
    }

    onUpdateSeatingPlans(newPlans);
    setIsLabSyncModalOpen(false);
    alert(`¡Listo! Se han ubicado los ${activeSet.teams.length} equipos ABP en las mesas del plano de laboratorio.`);
  };

  // ----------------------------------------------------
  // CREATE NEW WORK GROUP SET
  // ----------------------------------------------------
  const handleCreateNewSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetForm.title.trim()) return;

    const newSet: WorkGroupSet = {
      id: `wg-set-${Date.now()}`,
      groupId: selectedGroupId,
      subject: newSetForm.subject,
      period: newSetForm.period,
      title: newSetForm.title.trim(),
      description: newSetForm.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teams: [
        {
          id: `team-${Date.now()}-1`,
          name: 'Equipo 1',
          color: 'indigo',
          members: [],
        },
        {
          id: `team-${Date.now()}-2`,
          name: 'Equipo 2',
          color: 'emerald',
          members: [],
        },
      ],
    };

    onUpdateWorkGroupSets([...workGroupSets, newSet]);
    setActiveSetId(newSet.id);
    setIsNewSetModalOpen(false);
    setNewSetForm({
      title: '',
      subject: selectedSubject,
      period: 'Periodo 1',
      description: '',
    });
  };

  // ----------------------------------------------------
  // ADD TEAM TO ACTIVE SET
  // ----------------------------------------------------
  const handleAddTeamToActiveSet = () => {
    if (!activeSet) return;
    const teamNum = activeSet.teams.length + 1;
    const colorObj = TEAM_COLORS[(teamNum - 1) % TEAM_COLORS.length];

    const newTeam: WorkGroupTeam = {
      id: `team-${Date.now()}-${teamNum}`,
      name: `Equipo ${teamNum}`,
      color: colorObj.id,
      members: [],
    };

    const updated = workGroupSets.map((s) =>
      s.id === activeSet.id
        ? {
            ...s,
            teams: [...s.teams, newTeam],
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    onUpdateWorkGroupSets(updated);
  };

  // ----------------------------------------------------
  // DELETE TEAM
  // ----------------------------------------------------
  const handleDeleteTeam = (teamId: string) => {
    if (!activeSet) return;
    if (!confirm('¿Deseas eliminar este equipo? Los estudiantes asignados volverán a estar disponibles.')) return;

    const updated = workGroupSets.map((s) =>
      s.id === activeSet.id
        ? {
            ...s,
            teams: s.teams.filter((t) => t.id !== teamId),
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    onUpdateWorkGroupSets(updated);
  };

  // ----------------------------------------------------
  // UPDATE TEAM NAME / PROJECT TITLE
  // ----------------------------------------------------
  const handleUpdateTeamDetails = (teamId: string, updates: Partial<WorkGroupTeam>) => {
    if (!activeSet) return;
    const updated = workGroupSets.map((s) =>
      s.id === activeSet.id
        ? {
            ...s,
            teams: s.teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t)),
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    onUpdateWorkGroupSets(updated);
  };

  // ----------------------------------------------------
  // CHANGE STUDENT ROLE
  // ----------------------------------------------------
  const handleSetStudentRole = (teamId: string, studentId: string, roleId: string) => {
    if (!activeSet) return;
    const updated = workGroupSets.map((s) =>
      s.id === activeSet.id
        ? {
            ...s,
            teams: s.teams.map((t) => {
              if (t.id !== teamId) return t;
              return {
                ...t,
                members: t.members.map((m) =>
                  m.studentId === studentId ? { ...m, roleId: roleId || undefined } : m
                ),
              };
            }),
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    onUpdateWorkGroupSets(updated);
  };

  // ----------------------------------------------------
  // MOVE STUDENT BETWEEN TEAMS OR UNASSIGN
  // ----------------------------------------------------
  const handleMoveStudent = (studentId: string, targetTeamId: string | 'unassigned') => {
    if (!activeSet) return;

    // 1. Remove student from any existing team in this set
    const cleanedTeams = activeSet.teams.map((t) => ({
      ...t,
      members: t.members.filter((m) => m.studentId !== studentId),
    }));

    // 2. If target is a specific team, add them
    if (targetTeamId !== 'unassigned') {
      const targetTeam = cleanedTeams.find((t) => t.id === targetTeamId);
      if (targetTeam) {
        // default role
        const defaultRole = DEFAULT_ABP_ROLES[targetTeam.members.length % DEFAULT_ABP_ROLES.length]?.id;
        targetTeam.members.push({
          studentId,
          roleId: defaultRole,
        });
      }
    }

    const updated = workGroupSets.map((s) =>
      s.id === activeSet.id
        ? {
            ...s,
            teams: cleanedTeams,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    onUpdateWorkGroupSets(updated);
    setIsMoveStudentModalOpen(false);
    setMovingStudent(null);
  };

  // ----------------------------------------------------
  // ADD CUSTOM ABP ROLE
  // ----------------------------------------------------
  const handleAddCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomRole.name.trim() || !activeSet) return;

    const role: ABPRole = {
      id: `role-custom-${Date.now()}`,
      name: newCustomRole.name.trim(),
      description: newCustomRole.description.trim() || 'Rol personalizado para trabajo colaborativo.',
      color: newCustomRole.color,
      iconName: newCustomRole.iconName,
      isCustom: true,
    };

    const existingCustom = activeSet.customRoles || [];
    const updated = workGroupSets.map((s) =>
      s.id === activeSet.id
        ? {
            ...s,
            customRoles: [...existingCustom, role],
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    onUpdateWorkGroupSets(updated);
    setNewCustomRole({
      name: '',
      description: '',
      color: 'indigo',
      iconName: 'Award',
    });
  };

  // ----------------------------------------------------
  // DELETE CUSTOM ROLE
  // ----------------------------------------------------
  const handleDeleteCustomRole = (roleId: string) => {
    if (!activeSet) return;
    const updated = workGroupSets.map((s) =>
      s.id === activeSet.id
        ? {
            ...s,
            customRoles: (s.customRoles || []).filter((r) => r.id !== roleId),
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    onUpdateWorkGroupSets(updated);
  };

  // ----------------------------------------------------
  // GRADE ENTIRE TEAM AT ONCE
  // ----------------------------------------------------
  const handleOpenGradeTeamModal = (team: WorkGroupTeam) => {
    setSelectedTeamToGrade(team);
    const firstAct = groupActivities[0]?.id || '';
    
    // Prepare individual overrides default
    const overrides: Record<string, number> = {};
    team.members.forEach((m) => {
      overrides[m.studentId] = 4.5;
    });

    setTeamGradeForm({
      activityId: firstAct,
      score: 4.5,
      deliveredOnTime: 'yes',
      comments: `Trabajo en equipo (${team.name}) - ${team.projectTitle || 'Entrega colaborativa'}`,
      individualOverrides: overrides,
    });
    setIsGradeTeamModalOpen(true);
  };

  const handleSaveTeamGrades = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamToGrade || !teamGradeForm.activityId) {
      alert('Por favor selecciona una actividad a calificar.');
      return;
    }

    const activity = activities.find((a) => a.id === teamGradeForm.activityId);
    if (!activity) return;

    // Construct new grade records for all team members
    const newGrades = [...grades];
    selectedTeamToGrade.members.forEach((member) => {
      const studentScore =
        teamGradeForm.individualOverrides[member.studentId] !== undefined
          ? teamGradeForm.individualOverrides[member.studentId]
          : teamGradeForm.score;

      const gradeRecord: GradeRecord = {
        id: `grd-${activity.id}-${member.studentId}`,
        activityId: activity.id,
        studentId: member.studentId,
        score: Number(studentScore),
        deliveredOnTime: teamGradeForm.deliveredOnTime,
        comments: teamGradeForm.comments,
        feedbackDate: new Date().toISOString().split('T')[0],
        notifiedWhatsApp: false,
      };

      const existingIdx = newGrades.findIndex(
        (g) => g.activityId === activity.id && g.studentId === member.studentId
      );
      if (existingIdx >= 0) {
        newGrades[existingIdx] = gradeRecord;
      } else {
        newGrades.push(gradeRecord);
      }
    });

    onUpdateGrades(newGrades);
    setIsGradeTeamModalOpen(false);
    alert(`¡Calificaciones guardadas exitosamente para los ${selectedTeamToGrade.members.length} integrantes de ${selectedTeamToGrade.name}!`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                Equipos de Trabajo & Metodología ABP
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Aprendizaje Basado en Proyectos
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Genera grupos de trabajo aleatorios o manuales, asigna roles de ABP (Líder, Relator, Secretario, Investigador), personaliza nuevos roles y califica a todo el equipo con un solo clic.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setLabSyncMode('import');
                setIsLabSyncModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-teal-200 bg-teal-950/60 hover:bg-teal-900/80 border border-teal-600/40 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Organizar los equipos ABP con la misma distribución de puestos del Laboratorio"
            >
              <FlaskConical className="w-4 h-4 text-teal-400" />
              <span>Sincronizar con Laboratorio</span>
              {labTablesWithStudents.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-teal-500/30 text-teal-300 rounded-full text-[10px]">
                  {labTablesWithStudents.length} mesas
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsNewSetModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
            >
              <FolderPlus className="w-4 h-4 text-purple-400" />
              <span>Nuevo Proyecto ABP</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditRolesModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
            >
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span>Personalizar Roles ({allRoles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGeneratorModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950 transition-all cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>Generar Equipos Aleatorios</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Curso / Grado:
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full text-xs font-medium p-2.5 bg-slate-800/90 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              {accessibleGroups.map((g) => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                  {g.name} ({g.grade} - {g.shift})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Asignatura:
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs font-medium p-2.5 bg-slate-800/90 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              {groupSubjects.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-slate-100">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Proyecto / Grupo de Trabajo Activo:
            </label>
            <select
              value={activeSetId}
              onChange={(e) => setActiveSetId(e.target.value)}
              className="w-full text-xs font-medium p-2.5 bg-slate-800/90 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              {setsForGroup.length === 0 ? (
                <option value="">Sin proyectos creados para este curso</option>
              ) : (
                setsForGroup.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                    {s.title} ({s.teams.length} equipos)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!activeSet ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-10 text-center space-y-4">
          <Users className="w-12 h-12 mx-auto text-indigo-400/60" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">
              No hay proyectos de grupos de trabajo registrados para este curso
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Puedes organizar automáticamente los equipos según los puestos del <strong>Laboratorio</strong>, generar equipos aleatorios o crear un nuevo proyecto ABP personalizado.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {labTablesWithStudents.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLabSyncMode('import');
                  setLabSyncCreateAsNew(true);
                  setIsLabSyncModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-md cursor-pointer transition-all"
              >
                <FlaskConical className="w-4 h-4" />
                <span>Organizar según Mesas de Laboratorio ({labTablesWithStudents.length} mesas)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsGeneratorModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>Generar Equipos Aleatorios</span>
            </button>
            <button
              type="button"
              onClick={() => setIsNewSetModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Manualmente</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project Details Banner */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  {activeSet.subject || selectedSubject}
                </span>
                <span className="text-xs text-slate-400">
                  {activeSet.period} • {activeSet.teams.length} Equipos • {groupStudents.length - unassignedStudents.length} de {groupStudents.length} estudiantes asignados
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">{activeSet.title}</h3>
              {activeSet.description && (
                <p className="text-xs text-slate-400">{activeSet.description}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLabSyncMode('import');
                  setLabSyncCreateAsNew(false);
                  setIsLabSyncModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-teal-300 bg-teal-950/50 hover:bg-teal-900/70 border border-teal-600/40 rounded-xl transition-all"
                title="Sincronizar estos equipos con las mesas del laboratorio"
              >
                <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                <span>Sincronizar Laboratorio</span>
              </button>

              <button
                type="button"
                onClick={handleAddTeamToActiveSet}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Agregar Equipo</span>
              </button>
            </div>
          </div>

          {/* Unassigned Students Tray (if any) */}
          {unassignedStudents.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>Estudiantes sin equipo asignado ({unassignedStudents.length}):</span>
                </div>
                <span className="text-[11px] text-amber-400/80">
                  Haz clic en un estudiante para asignarlo a un equipo
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {unassignedStudents.map((std) => (
                  <button
                    key={std.id}
                    type="button"
                    onClick={() => {
                      setMovingStudent({ student: std });
                      setIsMoveStudentModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-700/50 hover:border-amber-400 text-slate-200 text-xs font-medium transition-colors shadow-sm cursor-pointer"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: std.avatarColor || '#6366f1' }}
                    />
                    <span>{std.firstName} {std.lastName}</span>
                    <Plus className="w-3 h-3 text-amber-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeSet.teams.map((team, tIdx) => {
              const colorInfo = TEAM_COLORS.find((c) => c.id === team.color) || TEAM_COLORS[tIdx % TEAM_COLORS.length];

              return (
                <div
                  key={team.id}
                  className={`rounded-2xl border ${colorInfo.border} ${colorInfo.bg} p-5 space-y-4 shadow-xl backdrop-blur-md flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    {/* Team Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="space-y-1 flex-1">
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => handleUpdateTeamDetails(team.id, { name: e.target.value })}
                          className="w-full bg-transparent font-bold text-sm text-slate-100 focus:outline-none focus:border-b focus:border-indigo-400"
                          placeholder="Nombre del equipo..."
                        />
                        <input
                          type="text"
                          value={team.projectTitle || ''}
                          onChange={(e) => handleUpdateTeamDetails(team.id, { projectTitle: e.target.value })}
                          className="w-full text-xs text-slate-400 bg-transparent focus:outline-none placeholder-slate-600"
                          placeholder="Tema / Título del proyecto..."
                        />
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteTeam(team.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Eliminar equipo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                        <span>Integrantes ({team.members.length})</span>
                        <span className="text-[10px] text-indigo-300">Rol en el equipo</span>
                      </div>

                      {team.members.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          Sin integrantes en este equipo
                        </div>
                      ) : (
                        team.members.map((member) => {
                          const student = groupStudents.find((s) => s.id === member.studentId);
                          if (!student) return null;
                          const roleObj = allRoles.find((r) => r.id === member.roleId);

                          return (
                            <div
                              key={member.studentId}
                              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: student.avatarColor || '#6366f1' }}
                                />
                                <span className="font-semibold text-slate-200 truncate">
                                  {student.firstName} {student.lastName}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0">
                                {/* Role Dropdown */}
                                <select
                                  value={member.roleId || ''}
                                  onChange={(e) => handleSetStudentRole(team.id, member.studentId, e.target.value)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                                    roleObj ? getRoleBadgeClasses(roleObj.color) : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  <option value="" className="bg-slate-900 text-slate-400">
                                    Sin Rol
                                  </option>
                                  {allRoles.map((r) => (
                                    <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                                      {r.name}
                                    </option>
                                  ))}
                                </select>

                                {/* Move Student button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovingStudent({ student, currentTeamId: team.id });
                                    setIsMoveStudentModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded"
                                  title="Cambiar a otro equipo"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Team Action Bottom: Grade Team Button */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {team.members.length} miembros
                    </span>

                    <button
                      type="button"
                      disabled={team.members.length === 0}
                      onClick={() => handleOpenGradeTeamModal(team)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Calificar Equipo</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RANDOM TEAMS GENERATOR (SHUFFLE / LABORATORY)                      */}
      {/* ========================================================================= */}
      {isGeneratorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Shuffle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Generador de Equipos de Trabajo (ABP)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGeneratorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Distribuye a los <strong className="text-indigo-300">{groupStudents.length} estudiantes</strong> del curso en equipos de trabajo o sincronízalos directamente según las mesas del <strong>Plano de Laboratorio</strong>.
            </p>

            <div className="space-y-4">
              {/* Distribution Mode */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGeneratorConfig((prev) => ({ ...prev, mode: 'by_teams' }))}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    generatorConfig.mode === 'by_teams'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold block text-slate-200 text-[11px]">Por N° Equipos</span>
                  <span className="text-[10px] text-slate-400">Ej. 4 equipos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratorConfig((prev) => ({ ...prev, mode: 'by_size' }))}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    generatorConfig.mode === 'by_size'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold block text-slate-200 text-[11px]">Por Tamaño</span>
                  <span className="text-[10px] text-slate-400">Ej. 4 por equipo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratorConfig((prev) => ({ ...prev, mode: 'from_lab' }))}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    generatorConfig.mode === 'from_lab'
                      ? 'bg-teal-600/20 border-teal-500 text-teal-200 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                    <span className="font-bold block text-slate-200 text-[11px]">Mesas Lab</span>
                  </div>
                  <span className="text-[10px] text-teal-300">
                    {labTablesWithStudents.length} mesas listas
                  </span>
                </button>
              </div>

              {/* Lab Mode specifics */}
              {generatorConfig.mode === 'from_lab' ? (
                <div className="space-y-3 p-3.5 bg-teal-950/20 border border-teal-800/40 rounded-xl">
                  <div className="flex items-start space-x-2">
                    <FlaskConical className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-teal-200">
                        Organización basada en el Plano de Laboratorio
                      </h4>
                      <p className="text-[11px] text-teal-300/80 leading-relaxed">
                        Cada mesa configurada en el laboratorio se convertirá en un Equipo ABP (Mesa 1, Mesa 2, etc.), manteniendo juntos a los estudiantes sentados en la misma mesa.
                      </p>
                    </div>
                  </div>

                  {labTablesWithStudents.length === 0 ? (
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs">
                      No hay estudiantes sentados en las mesas del laboratorio de este curso. Ve a <strong>"Plano de Puestos" &gt; "Laboratorio"</strong> para ubicarlos o auto-asignarlos primero.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      <div className="text-[11px] font-bold text-teal-300">
                        Vista previa de mesas encontradas ({labTablesWithStudents.length} mesas con {totalLabAssignedStudents} estudiantes):
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {labTablesWithStudents.map((table) => (
                          <div key={table.tableIndex} className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]">
                            <span className="font-bold text-teal-300 block">{table.tableName}:</span>
                            <span className="text-slate-300 text-[10px]">
                              {table.students.map((s) => s.firstName).join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={generatorConfig.autoAssignRoles}
                      onChange={(e) =>
                        setGeneratorConfig((prev) => ({ ...prev, autoAssignRoles: e.target.checked }))
                      }
                      className="rounded text-teal-600 focus:ring-teal-500 bg-slate-800 border-slate-700"
                    />
                    <span>Asignar roles ABP automáticamente a cada integrante de mesa</span>
                  </label>
                </div>
              ) : generatorConfig.mode === 'by_teams' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Cantidad de Equipos a Generar:
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="2"
                      max={Math.max(2, Math.min(12, groupStudents.length))}
                      value={generatorConfig.teamCount}
                      onChange={(e) =>
                        setGeneratorConfig((prev) => ({ ...prev, teamCount: Number(e.target.value) }))
                      }
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="w-12 text-center text-sm font-bold font-mono px-2 py-1 bg-slate-800 rounded-lg border border-slate-700 text-indigo-300">
                      {generatorConfig.teamCount}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Aproximadamente {Math.round(groupStudents.length / generatorConfig.teamCount)} estudiantes por equipo.
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Estudiantes por Equipo:
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="2"
                      max={Math.max(2, Math.min(8, groupStudents.length))}
                      value={generatorConfig.teamSize}
                      onChange={(e) =>
                        setGeneratorConfig((prev) => ({ ...prev, teamSize: Number(e.target.value) }))
                      }
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="w-12 text-center text-sm font-bold font-mono px-2 py-1 bg-slate-800 rounded-lg border border-slate-700 text-indigo-300">
                      {generatorConfig.teamSize}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Se generarán {Math.ceil(groupStudents.length / generatorConfig.teamSize)} equipos en total.
                  </span>
                </div>
              )}

              {/* Toggles */}
              {generatorConfig.mode !== 'from_lab' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generatorConfig.balanceGender}
                      onChange={(e) =>
                        setGeneratorConfig((prev) => ({ ...prev, balanceGender: e.target.checked }))
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                    />
                    <span>Equilibrar distribución de género (hombres y mujeres por equipo)</span>
                  </label>

                  <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generatorConfig.autoAssignRoles}
                      onChange={(e) =>
                        setGeneratorConfig((prev) => ({ ...prev, autoAssignRoles: e.target.checked }))
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                    />
                    <span>Asignar roles ABP iniciales automáticamente (Líder, Relator, etc.)</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsGeneratorModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              {generatorConfig.mode === 'from_lab' ? (
                <button
                  type="button"
                  disabled={labTablesWithStudents.length === 0}
                  onClick={() => handleSyncFromLabSeating(false, generatorConfig.autoAssignRoles)}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Crear Equipos desde Mesas ({labTablesWithStudents.length})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateRandomTeams}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Generar y Registrar Equipos</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW PROJECT / WORK GROUP SET                                */}
      {/* ========================================================================= */}
      {isNewSetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Nuevo Proyecto / Configuración ABP
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSet} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Título del Proyecto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Proyecto ABP: Fuentes de Energía Limpia"
                  value={newSetForm.title}
                  onChange={(e) => setNewSetForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Asignatura</label>
                  <select
                    value={newSetForm.subject}
                    onChange={(e) => setNewSetForm((prev) => ({ ...prev, subject: e.target.value }))}
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
                  <label className="text-xs font-semibold text-slate-300">Periodo</label>
                  <select
                    value={newSetForm.period}
                    onChange={(e) => setNewSetForm((prev) => ({ ...prev, period: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                  >
                    <option value="Periodo 1" className="bg-slate-900 text-slate-100">Periodo 1</option>
                    <option value="Periodo 2" className="bg-slate-900 text-slate-100">Periodo 2</option>
                    <option value="Periodo 3" className="bg-slate-900 text-slate-100">Periodo 3</option>
                    <option value="Periodo 4" className="bg-slate-900 text-slate-100">Periodo 4</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Descripción / Reto</label>
                <textarea
                  rows={2}
                  placeholder="Objetivos o pregunta orientadora del ABP..."
                  value={newSetForm.description}
                  onChange={(e) => setNewSetForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewSetModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CUSTOMIZE ABP ROLES                                                */}
      {/* ========================================================================= */}
      {isEditRolesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-5 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Roles de Aprendizaje Basado en Proyectos (ABP)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditRolesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Los roles estructuran la corresponsabilidad y el trabajo colaborativo en el aula. Puedes usar los roles estándar o agregar nuevos roles según la necesidad de la asignatura.
            </p>

            {/* Existing Roles List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {allRoles.map((role) => (
                <div
                  key={role.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start space-x-2.5">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${getRoleBadgeClasses(role.color)}`}>
                      {renderRoleIcon(role.iconName)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{role.name}</span>
                        {role.isCustom && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                            Personalizado
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">{role.description}</p>
                    </div>
                  </div>

                  {role.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomRole(role.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded"
                      title="Eliminar rol personalizado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Custom Role Form */}
            <form onSubmit={handleAddCustomRole} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <span className="text-xs font-bold text-indigo-300 block flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Nuevo Rol Personalizado</span>
              </span>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nombre del rol (ej. Auditor de Calidad)"
                  value={newCustomRole.name}
                  onChange={(e) => setNewCustomRole((prev) => ({ ...prev, name: e.target.value }))}
                  className="text-xs p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg"
                />

                <select
                  value={newCustomRole.color}
                  onChange={(e) => setNewCustomRole((prev) => ({ ...prev, color: e.target.value }))}
                  className="text-xs p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg"
                >
                  <option value="indigo">Color Índigo</option>
                  <option value="emerald">Color Esmeralda</option>
                  <option value="amber">Color Ámbar</option>
                  <option value="purple">Color Púrpura</option>
                  <option value="rose">Color Rosa</option>
                  <option value="sky">Color Celeste</option>
                  <option value="teal">Color Turquesa</option>
                  <option value="orange">Color Naranja</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Descripción de responsabilidades..."
                value={newCustomRole.description}
                onChange={(e) => setNewCustomRole((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full text-xs p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
                >
                  Guardar Rol
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditRolesModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MOVE STUDENT BETWEEN TEAMS                                         */}
      {/* ========================================================================= */}
      {isMoveStudentModalOpen && movingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">Mover Estudiante</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoveStudentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-semibold">
              Selecciona el equipo de destino para <span className="text-indigo-300">{movingStudent.student.firstName} {movingStudent.student.lastName}</span>:
            </p>

            <div className="space-y-2">
              {activeSet?.teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handleMoveStudent(movingStudent.student.id, team.id)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    movingStudent.currentTeamId === team.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{team.name}</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {team.members.length} miembros
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleMoveStudent(movingStudent.student.id, 'unassigned')}
                className="w-full p-2.5 rounded-xl border border-rose-800/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40 text-left text-xs font-semibold"
              >
                Quitar de equipo (Dejar sin asignar)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GRADE TEAM (CALIFICACIÓN GRUPAL)                                   */}
      {/* ========================================================================= */}
      {isGradeTeamModalOpen && selectedTeamToGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Calificar Equipo: {selectedTeamToGrade.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGradeTeamModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamGrades} className="space-y-4">
              {/* Activity Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Actividad / Evaluación del Plan de Estudios *
                </label>
                <select
                  required
                  value={teamGradeForm.activityId}
                  onChange={(e) =>
                    setTeamGradeForm((prev) => ({ ...prev, activityId: e.target.value }))
                  }
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                >
                  <option value="">-- Selecciona una actividad --</option>
                  {groupActivities.map((act) => (
                    <option key={act.id} value={act.id} className="bg-slate-900 text-slate-100">
                      {act.title} ({act.subject} - {act.period})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Score & Delivery */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nota del Equipo (Base):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5.0"
                    required
                    value={teamGradeForm.score}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const newOverrides: Record<string, number> = {};
                      selectedTeamToGrade.members.forEach((m) => {
                        newOverrides[m.studentId] = val;
                      });
                      setTeamGradeForm((prev) => ({
                        ...prev,
                        score: val,
                        individualOverrides: newOverrides,
                      }));
                    }}
                    className="w-full text-xs font-bold font-mono p-2.5 bg-slate-800 border border-slate-700 text-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Entrega de Proyecto:</label>
                  <select
                    value={teamGradeForm.deliveredOnTime}
                    onChange={(e) =>
                      setTeamGradeForm((prev) => ({
                        ...prev,
                        deliveredOnTime: e.target.value as any,
                      }))
                    }
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                  >
                    <option value="yes">A tiempo</option>
                    <option value="late">Con retraso</option>
                    <option value="no">No entregada</option>
                  </select>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Retroalimentación / Comentarios Grupales:
                </label>
                <textarea
                  rows={2}
                  value={teamGradeForm.comments}
                  onChange={(e) =>
                    setTeamGradeForm((prev) => ({ ...prev, comments: e.target.value }))
                  }
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl"
                />
              </div>

              {/* Individual Overrides List */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Ajuste Individual por Integrante:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (Se aplica automáticamente a la sábana de notas)
                  </span>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {selectedTeamToGrade.members.map((member) => {
                    const student = groupStudents.find((s) => s.id === member.studentId);
                    if (!student) return null;
                    const role = allRoles.find((r) => r.id === member.roleId);

                    return (
                      <div
                        key={member.studentId}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-200">
                            {student.firstName} {student.lastName}
                          </span>
                          {role && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeClasses(role.color)}`}>
                              {role.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5.0"
                            value={
                              teamGradeForm.individualOverrides[member.studentId] !== undefined
                                ? teamGradeForm.individualOverrides[member.studentId]
                                : teamGradeForm.score
                            }
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTeamGradeForm((prev) => ({
                                ...prev,
                                individualOverrides: {
                                  ...prev.individualOverrides,
                                  [member.studentId]: val,
                                },
                              }));
                            }}
                            className="w-16 text-center text-xs font-bold font-mono p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none"
                          />
                          <span className="text-xs text-slate-500 font-mono">/ 5.0</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGradeTeamModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Aplicar Calificaciones a Sábana de Notas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: LABORATORY SEATING SYNCHRONIZATION                                 */}
      {/* ========================================================================= */}
      {isLabSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 border border-teal-800/60 text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Sincronización con Mesas de Laboratorio
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Organiza los equipos ABP según los puestos asignados en el plano de laboratorio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLabSyncModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sync Mode Selection Tabs */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLabSyncMode('import')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  labSyncMode === 'import'
                    ? 'bg-teal-950/60 border-teal-500 text-teal-200 shadow-md ring-1 ring-teal-500/40'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <FlaskConical className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-xs text-slate-200">
                    Mesas Laboratorio → Equipos ABP
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  Crear los equipos ABP a partir de los estudiantes ubicados en las mesas del laboratorio.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLabSyncMode('export')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  labSyncMode === 'export'
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow-md ring-1 ring-indigo-500/40'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-xs text-slate-200">
                    Equipos ABP → Mesas Laboratorio
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  Ubicar los equipos ABP actuales en las mesas físicas del plano de laboratorio.
                </span>
              </button>
            </div>

            {/* Content for Import mode */}
            {labSyncMode === 'import' && (
              <div className="space-y-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-300">
                      Estado del Plano de Laboratorio actual:
                    </span>
                    <span className="text-slate-400">
                      {labTablesWithStudents.length} mesas con estudiantes ({totalLabAssignedStudents} de {groupStudents.length} matriculados)
                    </span>
                  </div>

                  {labTablesWithStudents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs space-y-2 text-center">
                      <p className="font-bold">Aún no hay estudiantes asignados en las mesas del Laboratorio.</p>
                      <p className="text-[11px] text-amber-400/80">
                        Ve a la pestaña <strong>"Plano de Puestos" &gt; "Laboratorio"</strong> y utiliza el botón de auto-asignar o arrastra los estudiantes a las mesas para poder sincronizarlos.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-1">
                      {labTablesWithStudents.map((table) => (
                        <div
                          key={table.tableIndex}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-teal-300">
                              {table.tableName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900">
                              {table.students.length} estudiantes
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {table.students.map((s, idx) => (
                              <div key={s.id} className="text-[11px] text-slate-300 flex items-center space-x-1.5">
                                <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                                <span>{s.firstName} {s.lastName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Import options */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labSyncAutoRoles}
                      onChange={(e) => setLabSyncAutoRoles(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 bg-slate-800 border-slate-700"
                    />
                    <span>Asignar roles de metodología ABP automáticamente a cada integrante (Líder, Relator, etc.)</span>
                  </label>

                  <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labSyncCreateAsNew}
                      onChange={(e) => setLabSyncCreateAsNew(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 bg-slate-800 border-slate-700"
                    />
                    <span>Guardar como un <strong>Nuevo Proyecto ABP</strong> independiente (no sobreescribir el actual)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Content for Export mode */}
            {labSyncMode === 'export' && (
              <div className="space-y-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-300">
                      Equipos ABP del Proyecto Actual ({activeSet?.title || 'Sin proyecto'}):
                    </span>
                    <span className="text-slate-400">
                      {activeSet?.teams.length || 0} equipos
                    </span>
                  </div>

                  {!activeSet || activeSet.teams.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs text-center">
                      No hay equipos registrados en el proyecto activo actual para exportar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-1">
                      {activeSet.teams.map((team, idx) => (
                        <div
                          key={team.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-indigo-300">
                              {team.name} &rarr; Mesa {idx + 1}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900">
                              {team.members.length} miembros
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {team.members.map((m) => {
                              const std = groupStudents.find((s) => s.id === m.studentId);
                              if (!std) return null;
                              return (
                                <div key={m.studentId} className="text-[11px] text-slate-300">
                                  {std.firstName} {std.lastName}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Al confirmar, se actualizará el <strong>Plano de Laboratorio</strong> para este curso ubicando cada equipo ABP en su mesa correspondiente, permitiendo luego tomar asistencia por mesa o calificar con un clic.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsLabSyncModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>

              {labSyncMode === 'import' ? (
                <button
                  type="button"
                  disabled={labTablesWithStudents.length === 0}
                  onClick={() => handleSyncFromLabSeating(labSyncCreateAsNew, labSyncAutoRoles)}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>Aplicar Mesas de Laboratorio a Equipos ABP</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!activeSet || activeSet.teams.length === 0}
                  onClick={handleExportTeamsToLabSeating}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Ubicar Equipos en Plano de Laboratorio</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
