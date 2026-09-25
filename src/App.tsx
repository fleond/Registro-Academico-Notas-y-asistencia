/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Group, 
  Student, 
  AttendanceRecord, 
  Activity, 
  GradeRecord, 
  SchoolSettings, 
  NotificationLog,
  Teacher,
  AuthUser,
  WorkGroupSet,
  GroupSeatingPlan,
  ClassDailyLog,
  ScheduleTimeSlot,
  SubjectConfig,
  RemedialRecord
} from './types';
import { 
  getStoredData, 
  saveStoredData, 
  getStoredAuthUser, 
  saveStoredAuthUser 
} from './utils/storage';
import { 
  executeSynchronousAdminSettingsSave, 
  executeSynchronousSubjectConfigsSave 
} from './utils/syncValidation';
import { sortGroupsAscending } from './utils/groupUtils';
import { mysqlAutoSync, AppDatabasePayload } from './utils/mysqlAutoSync';
import { deleteRecordFromMySQL } from './utils/mysqlService';
import { Navbar, ActiveTab } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { AttendanceModule } from './components/AttendanceModule';
import { GradesModule } from './components/GradesModule';
import { WorkGroupsModule } from './components/WorkGroupsModule';
import { SeatingChartModule } from './components/SeatingChartModule';
import { StudentsModule } from './components/StudentsModule';
import { GroupsModule } from './components/GroupsModule';
import { ReportsModule } from './components/ReportsModule';
import { WhatsAppConfigModule } from './components/WhatsAppConfigModule';
import { AdminModule } from './components/AdminModule';
import { ParentPortalModule } from './components/ParentPortalModule';
import { SecuritySettingsModule } from './components/SecuritySettingsModule';
import { ClassDailyLogModule } from './components/ClassDailyLogModule';
import { TeacherScheduleModule } from './components/TeacherScheduleModule';

export default function App() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('attendance');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');

  // Light / Dark Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('educontrol_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('theme-light');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('theme-light');
      }
      localStorage.setItem('educontrol_theme', theme);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Application Data States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>({} as SchoolSettings);
  const [subjectConfigs, setSubjectConfigs] = useState<SubjectConfig[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [workGroupSets, setWorkGroupSets] = useState<WorkGroupSet[]>([]);
  const [seatingPlans, setSeatingPlans] = useState<GroupSeatingPlan[]>([]);
  const [dailyLogs, setDailyLogs] = useState<ClassDailyLog[]>([]);
  const [schedules, setSchedules] = useState<ScheduleTimeSlot[]>([]);
  const [remedials, setRemedials] = useState<RemedialRecord[]>([]);

  // Keep a synchronous ref of the latest state to avoid stale closure overrides during rapid sequential updates
  const latestStateRef = useRef<AppDatabasePayload>({
    teachers,
    groups,
    students,
    attendance,
    activities,
    grades,
    settings,
    subjectConfigs,
    remedials,
    dailyLogs,
    schedules,
    workGroups: workGroupSets,
    seatingPlans,
    notifications: notificationLogs,
  });

  // Keep ref synchronized on every render
  useEffect(() => {
    latestStateRef.current = {
      teachers,
      groups,
      students,
      attendance,
      activities,
      grades,
      settings,
      subjectConfigs,
      remedials,
      dailyLogs,
      schedules,
      workGroups: workGroupSets,
      seatingPlans,
      notifications: notificationLogs,
    };
  }, [
    teachers,
    groups,
    students,
    attendance,
    activities,
    grades,
    settings,
    subjectConfigs,
    remedials,
    dailyLogs,
    schedules,
    workGroupSets,
    seatingPlans,
    notificationLogs,
  ]);

  // Helper to trigger debounced auto-sync to MySQL with full current state
  const syncToMySQL = useCallback(
    (
      overrides?: Partial<AppDatabasePayload>,
      immediate = false
    ) => {
      if (overrides) {
        if (overrides.teachers !== undefined) latestStateRef.current.teachers = overrides.teachers;
        if (overrides.groups !== undefined) latestStateRef.current.groups = overrides.groups;
        if (overrides.students !== undefined) latestStateRef.current.students = overrides.students;
        if (overrides.attendance !== undefined) latestStateRef.current.attendance = overrides.attendance;
        if (overrides.activities !== undefined) latestStateRef.current.activities = overrides.activities;
        if (overrides.grades !== undefined) latestStateRef.current.grades = overrides.grades;
        if (overrides.settings !== undefined) latestStateRef.current.settings = overrides.settings;
        if (overrides.subjectConfigs !== undefined) latestStateRef.current.subjectConfigs = overrides.subjectConfigs;
        if (overrides.remedials !== undefined) latestStateRef.current.remedials = overrides.remedials;
        if (overrides.dailyLogs !== undefined) latestStateRef.current.dailyLogs = overrides.dailyLogs;
        if (overrides.schedules !== undefined) latestStateRef.current.schedules = overrides.schedules;
        if (overrides.workGroups !== undefined) latestStateRef.current.workGroups = overrides.workGroups;
        if (overrides.seatingPlans !== undefined) latestStateRef.current.seatingPlans = overrides.seatingPlans;
        if (overrides.notifications !== undefined) latestStateRef.current.notifications = overrides.notifications;
      }

      const payload: AppDatabasePayload = {
        teachers: latestStateRef.current.teachers,
        groups: latestStateRef.current.groups,
        students: latestStateRef.current.students,
        attendance: latestStateRef.current.attendance,
        activities: latestStateRef.current.activities,
        grades: latestStateRef.current.grades,
        settings: latestStateRef.current.settings,
        subjectConfigs: latestStateRef.current.subjectConfigs,
        remedials: latestStateRef.current.remedials,
        dailyLogs: latestStateRef.current.dailyLogs,
        schedules: latestStateRef.current.schedules,
        workGroups: latestStateRef.current.workGroups,
        seatingPlans: latestStateRef.current.seatingPlans,
        notifications: latestStateRef.current.notifications,
      };
      mysqlAutoSync.triggerAutoSync(payload, immediate);
    },
    []
  );

  // Manual MySQL refresh
  const handleManualSync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const mysqlData = await mysqlAutoSync.pullAllData();
      if (mysqlData) {
        if (mysqlData.teachers && mysqlData.teachers.length > 0) {
          setTeachers(mysqlData.teachers);
          saveStoredData.teachers(mysqlData.teachers);
        }
        if (mysqlData.groups && mysqlData.groups.length > 0) {
          const sorted = sortGroupsAscending(mysqlData.groups);
          setGroups(sorted);
          saveStoredData.groups(sorted);
        }
        if (mysqlData.students && mysqlData.students.length > 0) {
          setStudents(mysqlData.students);
          saveStoredData.students(mysqlData.students);
        }
        if (mysqlData.attendance) {
          setAttendance(mysqlData.attendance);
          saveStoredData.attendance(mysqlData.attendance);
        }
        if (mysqlData.activities) {
          setActivities(mysqlData.activities);
          saveStoredData.activities(mysqlData.activities);
        }
        if (mysqlData.grades) {
          setGrades(mysqlData.grades);
          saveStoredData.grades(mysqlData.grades);
        }
        if (mysqlData.settings && mysqlData.settings.schoolName) {
          setSettings(mysqlData.settings);
          saveStoredData.settings(mysqlData.settings);
        }
        if (mysqlData.subjectConfigs && mysqlData.subjectConfigs.length > 0) {
          setSubjectConfigs(mysqlData.subjectConfigs);
          saveStoredData.subjectConfigs(mysqlData.subjectConfigs);
        }
        if (mysqlData.workGroups) {
          setWorkGroupSets(mysqlData.workGroups);
          saveStoredData.workGroups(mysqlData.workGroups);
        }
        if (mysqlData.seatingPlans) {
          setSeatingPlans(mysqlData.seatingPlans);
          saveStoredData.seatingPlans(mysqlData.seatingPlans);
        }
        if (mysqlData.dailyLogs) {
          setDailyLogs(mysqlData.dailyLogs);
          saveStoredData.dailyLogs(mysqlData.dailyLogs);
        }
        if (mysqlData.schedules) {
          setSchedules(mysqlData.schedules);
          saveStoredData.schedules(mysqlData.schedules);
        }
        if (mysqlData.remedials) {
          setRemedials(mysqlData.remedials);
          saveStoredData.remedials(mysqlData.remedials);
        }
        if (mysqlData.notifications) {
          setNotificationLogs(mysqlData.notifications);
          saveStoredData.notifications(mysqlData.notifications);
        }

        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    } catch (err) {
      console.error('Error during manual MySQL sync:', err);
      setSyncStatus('offline');
    }
  }, []);

  // Initial load & MySQL subscription
  useEffect(() => {
    let isMounted = true;

    // Subscribe to MySQL auto-sync status updates
    const unsubscribeSync = mysqlAutoSync.subscribe((status) => {
      if (isMounted) {
        setSyncStatus(status);
      }
    });

    const initializeAppData = async () => {
      setSyncStatus('syncing');

      // 1. Instant load from local storage cache for zero-delay rendering
      const stored = getStoredData();
      if (isMounted) {
        setTeachers(stored.teachers || []);
        const sortedCachedGroups = sortGroupsAscending(stored.groups || []);
        setGroups(sortedCachedGroups);
        setStudents(stored.students || []);
        setAttendance(stored.attendance || []);
        setActivities(stored.activities || []);
        setGrades(stored.grades || []);
        setSettings(stored.settings || ({} as SchoolSettings));
        setSubjectConfigs(stored.subjectConfigs || []);
        setNotificationLogs(stored.notifications || []);
        setWorkGroupSets(stored.workGroups || []);
        setSeatingPlans(stored.seatingPlans || []);
        setDailyLogs(stored.dailyLogs || []);
        setSchedules(stored.schedules || []);
        setRemedials(stored.remedials || []);

        const storedUser = getStoredAuthUser();
        if (storedUser) {
          setCurrentUser(storedUser);
          if (storedUser.role === 'admin') setActiveTab('admin');
          else if (storedUser.role === 'teacher') setActiveTab('attendance');
          else if (storedUser.role === 'parent') setActiveTab('parent_portal');
        }
        setDataLoaded(true);
      }

      // 2. Fetch remote data directly from MySQL (WAMP API or Node backend)
      try {
        const mysqlData = await mysqlAutoSync.pullAllData();

        if (mysqlData && isMounted) {
          const hasRecords =
            (mysqlData.students && mysqlData.students.length > 0) ||
            (mysqlData.groups && mysqlData.groups.length > 0) ||
            (mysqlData.teachers && mysqlData.teachers.length > 0);

          if (hasRecords) {
            console.info('Datos cargados directamente desde la base de datos MySQL.');

            if (mysqlData.teachers && mysqlData.teachers.length > 0) {
              setTeachers(mysqlData.teachers);
              saveStoredData.teachers(mysqlData.teachers);
            }
            if (mysqlData.groups && mysqlData.groups.length > 0) {
              const sorted = sortGroupsAscending(mysqlData.groups);
              setGroups(sorted);
              saveStoredData.groups(sorted);
            }
            if (mysqlData.students && mysqlData.students.length > 0) {
              setStudents(mysqlData.students);
              saveStoredData.students(mysqlData.students);
            }
            if (mysqlData.attendance) {
              setAttendance(mysqlData.attendance);
              saveStoredData.attendance(mysqlData.attendance);
            }
            if (mysqlData.activities) {
              setActivities(mysqlData.activities);
              saveStoredData.activities(mysqlData.activities);
            }
            if (mysqlData.grades) {
              setGrades(mysqlData.grades);
              saveStoredData.grades(mysqlData.grades);
            }
            if (mysqlData.settings && mysqlData.settings.schoolName) {
              setSettings(mysqlData.settings);
              saveStoredData.settings(mysqlData.settings);
            }
            if (mysqlData.subjectConfigs && mysqlData.subjectConfigs.length > 0) {
              setSubjectConfigs(mysqlData.subjectConfigs);
              saveStoredData.subjectConfigs(mysqlData.subjectConfigs);
            }
            if (mysqlData.workGroups) {
              setWorkGroupSets(mysqlData.workGroups);
              saveStoredData.workGroups(mysqlData.workGroups);
            }
            if (mysqlData.seatingPlans) {
              setSeatingPlans(mysqlData.seatingPlans);
              saveStoredData.seatingPlans(mysqlData.seatingPlans);
            }
            if (mysqlData.dailyLogs) {
              setDailyLogs(mysqlData.dailyLogs);
              saveStoredData.dailyLogs(mysqlData.dailyLogs);
            }
            if (mysqlData.schedules) {
              setSchedules(mysqlData.schedules);
              saveStoredData.schedules(mysqlData.schedules);
            }
            if (mysqlData.remedials) {
              setRemedials(mysqlData.remedials);
              saveStoredData.remedials(mysqlData.remedials);
            }
            if (mysqlData.notifications) {
              setNotificationLogs(mysqlData.notifications);
              saveStoredData.notifications(mysqlData.notifications);
            }

            setSyncStatus('synced');
          } else {
            // MySQL is connected but tables are empty: seed MySQL from local initial data
            console.info('Base de datos MySQL vacía detectada. Sincronizando datos iniciales a MySQL...');
            await mysqlAutoSync.triggerAutoSync(stored, true);
            setSyncStatus('synced');
          }
        } else if (isMounted) {
          setSyncStatus('offline');
        }
      } catch (err) {
        console.warn('Aviso de conexión inicial con MySQL:', err);
        if (isMounted) {
          setSyncStatus('offline');
        }
      }
    };

    initializeAppData();

    // 3. Periodic health-check & auto-reconnect if offline (every 12 seconds)
    const intervalId = setInterval(async () => {
      if (!isMounted) return;
      const current = mysqlAutoSync.getStatus();
      if (current.status === 'offline') {
        const fresh = await mysqlAutoSync.pullAllData();
        if (fresh && isMounted) {
          console.info('Conexión con MySQL reestablecida.');
          setSyncStatus('synced');
        }
      }
    }, 12000);

    return () => {
      isMounted = false;
      unsubscribeSync();
      clearInterval(intervalId);
    };
  }, []);

  // Auth Handlers
  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    saveStoredAuthUser(user);

    // Set contextual active tab
    if (user.role === 'admin') {
      setActiveTab('admin');
    } else if (user.role === 'teacher') {
      setActiveTab('attendance');
      if (user.teacher?.name) {
        setSettings((prev) => ({
          ...prev,
          teacherName: user.teacher?.name || prev.teacherName,
        }));
      }
    } else if (user.role === 'parent') {
      setActiveTab('parent_portal');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveStoredAuthUser(null);
  };

  const handleSwitchProfile = () => {
    setCurrentUser(null);
    saveStoredAuthUser(null);
  };

  // Update handlers with local persistence and automatic MySQL background sync
  const handleUpdateTeachers = (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    saveStoredData.teachers(newTeachers);
    syncToMySQL({ teachers: newTeachers });
  };

  const handleUpdateGroups = (newGroups: Group[]) => {
    const sorted = sortGroupsAscending(newGroups);
    setGroups(sorted);
    saveStoredData.groups(sorted);
    syncToMySQL({ groups: sorted });
  };

  const handleUpdateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    saveStoredData.students(newStudents);
    syncToMySQL({ students: newStudents });

    if (currentUser?.role === 'parent' && currentUser.student) {
      const refreshedStudent = newStudents.find((s) => s.id === currentUser.student?.id);
      if (refreshedStudent) {
        setCurrentUser({ ...currentUser, student: refreshedStudent });
      }
    }
  };

  const handleUpdateAttendance = (newAttendance: AttendanceRecord[]) => {
    setAttendance(newAttendance);
    saveStoredData.attendance(newAttendance);
    syncToMySQL({ attendance: newAttendance });
  };

  const handleUpdateActivities = (newActivities: Activity[]) => {
    latestStateRef.current.activities = newActivities;
    setActivities(newActivities);
    saveStoredData.activities(newActivities);
    syncToMySQL({ activities: newActivities });
  };

  const handleUpdateGrades = (newGrades: GradeRecord[]) => {
    latestStateRef.current.grades = newGrades;
    setGrades(newGrades);
    saveStoredData.grades(newGrades);
    syncToMySQL({ grades: newGrades });
  };

  const handleUpdateActivitiesAndGrades = (newActivities: Activity[], newGrades: GradeRecord[]) => {
    latestStateRef.current.activities = newActivities;
    latestStateRef.current.grades = newGrades;
    setActivities(newActivities);
    setGrades(newGrades);
    saveStoredData.activities(newActivities);
    saveStoredData.grades(newGrades);
    syncToMySQL({ activities: newActivities, grades: newGrades });
  };

  const handleUpdateSettings = async (newSettings: SchoolSettings) => {
    // Synchronous validation, local persistence & automatic MySQL sync
    const result = await executeSynchronousAdminSettingsSave(
      newSettings,
      groups,
      teachers,
      subjectConfigs,
      false
    );
    setSettings(result.settings);
    if (result.subjectConfigs) {
      setSubjectConfigs(result.subjectConfigs);
    }
    syncToMySQL({
      settings: result.settings,
      subjectConfigs: result.subjectConfigs || subjectConfigs,
    });
  };

  const handleUpdateSubjectConfigs = async (newConfigs: SubjectConfig[]) => {
    // Synchronous validation, local persistence & automatic MySQL sync
    const cleanConfigs = await executeSynchronousSubjectConfigsSave(newConfigs, groups);
    setSubjectConfigs(cleanConfigs);
    syncToMySQL({ subjectConfigs: cleanConfigs });
  };

  const handleUpdateWorkGroupSets = (newSets: WorkGroupSet[]) => {
    setWorkGroupSets(newSets);
    saveStoredData.workGroups(newSets);
    syncToMySQL({ workGroups: newSets });
  };

  const handleUpdateSeatingPlans = (newPlans: GroupSeatingPlan[]) => {
    setSeatingPlans(newPlans);
    saveStoredData.seatingPlans(newPlans);
    syncToMySQL({ seatingPlans: newPlans });
  };

  const handleUpdateDailyLogs = (newLogs: ClassDailyLog[]) => {
    setDailyLogs(newLogs);
    saveStoredData.dailyLogs(newLogs);
    syncToMySQL({ dailyLogs: newLogs });
  };

  const handleUpdateSchedules = (newSlots: ScheduleTimeSlot[]) => {
    setSchedules(newSlots);
    saveStoredData.schedules(newSlots);
    syncToMySQL({ schedules: newSlots });
  };

  const handleUpdateRemedials = (newRemedials: RemedialRecord[]) => {
    setRemedials(newRemedials);
    saveStoredData.remedials(newRemedials);
    syncToMySQL({ remedials: newRemedials });
  };

  const handleLogNotification = (
    studentId: string,
    message: string,
    type: 'attendance' | 'late' | 'absent' | 'uniform' | 'grade' | 'general' = 'attendance',
    meta?: { groupId?: string; groupName?: string; teacherId?: string; teacherName?: string }
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const studentGroup = groups.find((g) => g.id === (meta?.groupId || student.groupId));

    const newLog: NotificationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      groupId: meta?.groupId || student.groupId || '',
      groupName: meta?.groupName || studentGroup?.name || '',
      guardianName: student.guardianName,
      phone: `${student.guardianCountryCode || '+57'} ${student.guardianPhone}`,
      type: type || 'attendance',
      message,
      timestamp: new Date().toISOString(),
      status: 'sent',
      method: 'wa_link',
      teacherId: meta?.teacherId || (currentUser?.role === 'teacher' ? currentUser.id : undefined),
      teacherName: meta?.teacherName || (currentUser?.role === 'teacher' ? currentUser.name : undefined),
    };

    const updated = [newLog, ...notificationLogs];
    setNotificationLogs(updated);
    saveStoredData.notifications(updated);
    syncToMySQL({ notifications: updated });
  };

  const handleDeleteNotificationLog = (logId: string) => {
    const updated = notificationLogs.filter((l) => l.id !== logId);
    setNotificationLogs(updated);
    saveStoredData.notifications(updated);
    deleteRecordFromMySQL('log_notificaciones', logId).catch(() => {});
    syncToMySQL({ notifications: updated });
  };

  const handleClearAllNotificationLogs = () => {
    setNotificationLogs([]);
    saveStoredData.notifications([]);
    syncToMySQL({ notifications: [] });
  };

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-300 text-sm">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Cargando Registro Académico fleon...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, display login & consultation screen
  if (!currentUser) {
    return (
      <LoginScreen
        teachers={teachers}
        students={students}
        groups={groups}
        settings={settings}
        onLogin={handleLogin}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settings={settings}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchProfile={handleSwitchProfile}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Modules based on Active Tab and Role */}
      <main className="flex-1">
        {/* 1. ADMIN MODULE */}
        {activeTab === 'admin' && (
          <AdminModule
            teachers={teachers}
            groups={groups}
            students={students}
            settings={settings}
            attendance={attendance}
            subjectConfigs={subjectConfigs}
            onUpdateTeachers={handleUpdateTeachers}
            onUpdateGroups={handleUpdateGroups}
            onUpdateStudents={handleUpdateStudents}
            onUpdateAttendance={handleUpdateAttendance}
            onUpdateSettings={handleUpdateSettings}
            onUpdateSubjectConfigs={handleUpdateSubjectConfigs}
            onNavigateToAttendance={(groupId, date) => {
              setActiveTab('attendance');
            }}
          />
        )}

        {/* 2. PARENT CONSULTATION PORTAL */}
        {activeTab === 'parent_portal' && currentUser.student && (
          <ParentPortalModule
            student={currentUser.student}
            groups={groups}
            activities={activities}
            grades={grades}
            attendance={attendance}
            settings={settings}
            teachers={teachers}
            subjectConfigs={subjectConfigs}
            remedials={remedials}
            onSwitchStudent={handleSwitchProfile}
          />
        )}

        {/* 3. ATTENDANCE MODULE */}
        {activeTab === 'attendance' && (
          <AttendanceModule
            groups={groups}
            students={students}
            attendance={attendance}
            settings={settings}
            currentUser={currentUser}
            teachers={teachers}
            onUpdateAttendance={handleUpdateAttendance}
            onLogNotification={handleLogNotification}
          />
        )}

        {/* 4. GRADES MODULE */}
        {activeTab === 'grades' && (
          <GradesModule
            groups={groups}
            students={students}
            activities={activities}
            grades={grades}
            settings={settings}
            subjectConfigs={subjectConfigs}
            attendance={attendance}
            currentUser={currentUser}
            teachers={teachers}
            remedials={remedials}
            onUpdateRemedials={handleUpdateRemedials}
            onUpdateActivities={handleUpdateActivities}
            onUpdateGrades={handleUpdateGrades}
            onUpdateActivitiesAndGrades={handleUpdateActivitiesAndGrades}
            onUpdateGroups={handleUpdateGroups}
            onUpdateStudents={handleUpdateStudents}
            onUpdateTeachers={handleUpdateTeachers}
            onUpdateSubjectConfigs={handleUpdateSubjectConfigs}
            onLogNotification={handleLogNotification}
          />
        )}

        {/* 4.5. ABP WORK GROUPS & ROLES MODULE */}
        {activeTab === 'work_groups' && (
          <WorkGroupsModule
            groups={groups}
            students={students}
            activities={activities}
            grades={grades}
            settings={settings}
            currentUser={currentUser}
            teachers={teachers}
            workGroupSets={workGroupSets}
            onUpdateWorkGroupSets={handleUpdateWorkGroupSets}
            onUpdateActivities={handleUpdateActivities}
            onUpdateGrades={handleUpdateGrades}
            seatingPlans={seatingPlans}
            onUpdateSeatingPlans={handleUpdateSeatingPlans}
          />
        )}

        {/* 4.6. SEATING CHART MODULE (CLASSROOM & LABORATORY + ATTENDANCE & GRADING) */}
        {activeTab === 'seating_chart' && (
          <SeatingChartModule
            groups={groups}
            students={students}
            settings={settings}
            currentUser={currentUser}
            teachers={teachers}
            seatingPlans={seatingPlans}
            onUpdateSeatingPlans={handleUpdateSeatingPlans}
            attendance={attendance}
            activities={activities}
            grades={grades}
            onUpdateAttendance={handleUpdateAttendance}
            onUpdateGrades={handleUpdateGrades}
            onUpdateActivities={handleUpdateActivities}
            workGroupSets={workGroupSets}
            onUpdateWorkGroupSets={handleUpdateWorkGroupSets}
          />
        )}

        {/* 4.7. DAILY CLASS DIARY MODULE (DIARIO DE CAMPO / ACTIVIDADES DIARIAS) */}
        {activeTab === 'daily_log' && (
          <ClassDailyLogModule
            groups={groups}
            settings={settings}
            currentUser={currentUser}
            teachers={teachers}
            dailyLogs={dailyLogs}
            attendance={attendance}
            students={students}
            onUpdateDailyLogs={handleUpdateDailyLogs}
          />
        )}

        {/* 4.8. TEACHER SCHEDULE MODULE (HORARIO DE CLASES INTERACTIVO) */}
        {activeTab === 'teacher_schedule' && (
          <TeacherScheduleModule
            groups={groups}
            settings={settings}
            currentUser={currentUser}
            teachers={teachers}
            schedules={schedules}
            onUpdateSchedules={handleUpdateSchedules}
            onNavigateToAttendance={(groupId) => {
              setActiveTab('attendance');
            }}
            onNavigateToGrades={(groupId, subject) => {
              setActiveTab('grades');
            }}
            onNavigateToDailyLog={(groupId, subject) => {
              setActiveTab('daily_log');
            }}
            onNavigateToSeatingChart={(groupId) => {
              setActiveTab('seating_chart');
            }}
          />
        )}

        {/* 5. STUDENTS MODULE (TEACHERS & ADMINS) */}
        {activeTab === 'students' && (
          <StudentsModule
            groups={groups}
            students={students}
            onUpdateStudents={handleUpdateStudents}
          />
        )}

        {/* 6. GROUPS MODULE */}
        {activeTab === 'groups' && (
          <GroupsModule
            groups={groups}
            students={students}
            settings={settings}
            currentUser={currentUser}
            teachers={teachers}
            onUpdateGroups={handleUpdateGroups}
            onUpdateStudents={handleUpdateStudents}
            onUpdateTeachers={handleUpdateTeachers}
            onSelectGroupForAttendance={() => {
              setActiveTab('attendance');
            }}
            onSelectGroupForGrades={() => {
              setActiveTab('grades');
            }}
          />
        )}

        {/* 7. REPORTS MODULE */}
        {activeTab === 'reports' && (
          <ReportsModule
            groups={groups}
            students={students}
            attendance={attendance}
            activities={activities}
            grades={grades}
            settings={settings}
          />
        )}

        {/* 8. WHATSAPP CONFIG MODULE */}
        {activeTab === 'whatsapp_config' && (
          <WhatsAppConfigModule
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            notificationLogs={notificationLogs}
            currentUser={currentUser}
            groups={groups}
            students={students}
            teachers={teachers}
            onDeleteNotificationLog={handleDeleteNotificationLog}
            onClearNotificationLogs={handleClearAllNotificationLogs}
            onNavigateToAdmin={(subTab) => {
              setActiveTab('admin');
            }}
          />
        )}

        {/* 9. SECURITY & CREDENTIALS MODULE (FOR ADMIN & TEACHERS) */}
        {activeTab === 'security' && (
          <SecuritySettingsModule
            currentUser={currentUser}
            settings={settings}
            teachers={teachers}
            onUpdateSettings={handleUpdateSettings}
            onUpdateTeachers={handleUpdateTeachers}
            onUpdateCurrentUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              saveStoredAuthUser(updatedUser);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#060911] border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{settings.schoolName || 'Registro Académico fleon'} — Sistema Integral de Gestión Docente</span>
          <div className="flex items-center space-x-3">
            <span className="text-indigo-400 font-semibold">
              Registro Académico fleon • Año Lectivo {settings.schoolYear || '2026'}
            </span>
            <button
              onClick={handleSwitchProfile}
              className="text-slate-400 hover:text-slate-200 underline transition-colors cursor-pointer"
            >
              Cambiar Perfil
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
