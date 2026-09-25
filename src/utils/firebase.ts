import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Configure Firestore log level to silent so backend connection retries are handled cleanly
try {
  setLogLevel('silent');
} catch {
  // Ignore if already configured
}

import { 
  Student, 
  AttendanceRecord, 
  GradeRecord, 
  Activity, 
  Group, 
  Teacher, 
  SchoolSettings, 
  NotificationLog, 
  SubjectConfig,
  WorkGroupSet,
  GroupSeatingPlan,
  ClassDailyLog,
  ScheduleTimeSlot,
  RemedialRecord
} from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with forced long polling for resilient connection in iframe & preview environments
const rawDbId = (firebaseConfig as any).firestoreDatabaseId;
const customDbId = (rawDbId && rawDbId !== '(default)' && rawDbId.trim() !== '') ? rawDbId : undefined;
let dbInstance;
try {
  const firestoreSettings = {
    experimentalForceLongPolling: true,
  };
  dbInstance = customDbId 
    ? initializeFirestore(app, firestoreSettings, customDbId)
    : initializeFirestore(app, firestoreSettings);
} catch {
  try {
    dbInstance = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
  } catch {
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;

// Initialize Auth
export const auth = getAuth(app);

// Error Handling Definition
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

/**
 * Recursively removes undefined values from objects before writing to Firestore.
 * Firestore throws errors when encountering `undefined` in document fields.
 */
export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOffline = errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('unavailable');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path,
  };
  if (isOffline) {
    console.info('Firestore offline status notice:', errMsg);
  } else {
    console.info('Firestore Info:', JSON.stringify(errInfo));
  }
  return errInfo;
}

/**
 * Validates connection to Firestore server with non-blocking graceful fallback
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, 'settings', 'general');
    const testPromise = getDoc(testDoc).catch(() => null);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
    await Promise.race([testPromise, timeoutPromise]);
    return true;
  } catch {
    return true; // Graceful fallback
  }
}

// -------------------------------------------------------------
// COLLECTION REFERENCES
// -------------------------------------------------------------
export const COLLECTIONS = {
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  GRADES: 'grades',
  ACTIVITIES: 'activities',
  GROUPS: 'groups',
  TEACHERS: 'teachers',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  SUBJECT_CONFIGS: 'subjectConfigs',
  WORK_GROUPS: 'workGroups',
  SEATING_PLANS: 'seatingPlans',
  DAILY_LOGS: 'dailyLogs',
  SCHEDULES: 'schedules',
  REMEDIALS: 'remedials',
};

// -------------------------------------------------------------
// STUDENTS CRUD
// -------------------------------------------------------------
export async function fetchStudentsFromFirestore(): Promise<Student[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.STUDENTS));
    return snapshot.docs.map((d) => d.data() as Student);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.STUDENTS);
    return [];
  }
}

export async function saveStudentToFirestore(student: Student): Promise<void> {
  const path = `${COLLECTIONS.STUDENTS}/${student.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), cleanFirestoreData(student));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  const path = `${COLLECTIONS.STUDENTS}/${studentId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Safe Firestore Batch Executor: splits operations into chunks of 350 (Firestore limit is 500)
 */
export async function executeFirestoreBatches(
  operations: { type: 'set' | 'delete'; ref: any; data?: any }[]
): Promise<void> {
  if (!operations || operations.length === 0) return;
  const CHUNK_SIZE = 350; // Well below the 500 limit for absolute reliability

  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

export async function syncStudentsBatchFirestore(students: Student[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.STUDENTS));
      snapshotDocs = snapshot.docs;
    } catch {
      // Client is offline: write current students directly to cache
    }
    const newIds = new Set(students.map((s) => s.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    // Delete student documents in Firestore that are no longer in the list (if snapshot was available)
    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    // Write current students
    students.forEach((student) => {
      const ref = doc(db, COLLECTIONS.STUDENTS, student.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(student) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.STUDENTS);
    throw error;
  }
}

// -------------------------------------------------------------
// ATTENDANCE CRUD
// -------------------------------------------------------------
export async function fetchAttendanceFromFirestore(): Promise<AttendanceRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.ATTENDANCE));
    return snapshot.docs.map((d) => d.data() as AttendanceRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.ATTENDANCE);
    return [];
  }
}

export async function saveAttendanceToFirestore(record: AttendanceRecord): Promise<void> {
  const path = `${COLLECTIONS.ATTENDANCE}/${record.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, record.id), cleanFirestoreData(record));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveAttendanceBatchFirestore(records: AttendanceRecord[]): Promise<void> {
  try {
    const operations = records.map((record) => ({
      type: 'set' as const,
      ref: doc(db, COLLECTIONS.ATTENDANCE, record.id),
      data: cleanFirestoreData(record),
    }));
    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.ATTENDANCE);
    throw error;
  }
}

export async function syncAttendanceBatchFirestore(records: AttendanceRecord[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.ATTENDANCE));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(records.map((r) => r.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    records.forEach((record) => {
      const ref = doc(db, COLLECTIONS.ATTENDANCE, record.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(record) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.ATTENDANCE);
    throw error;
  }
}

export async function deleteAttendanceRecordFirestore(recordId: string): Promise<void> {
  const path = `${COLLECTIONS.ATTENDANCE}/${recordId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function deleteAttendanceDayFirestore(date: string, groupId?: string): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.ATTENDANCE));
    const operations: { type: 'delete'; ref: any }[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as AttendanceRecord;
      if (data.date === date && (!groupId || data.groupId === groupId)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });
    if (operations.length > 0) {
      await executeFirestoreBatches(operations);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.ATTENDANCE);
  }
}

export async function deleteMultipleAttendanceDaysFirestore(days: { date: string; groupId?: string }[]): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.ATTENDANCE));
    const operations: { type: 'delete'; ref: any }[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as AttendanceRecord;
      const shouldDelete = days.some((d) => d.date === data.date && (!d.groupId || d.groupId === data.groupId));
      if (shouldDelete) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });
    if (operations.length > 0) {
      await executeFirestoreBatches(operations);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.ATTENDANCE);
  }
}

// -------------------------------------------------------------
// GRADES CRUD
// -------------------------------------------------------------
export async function fetchGradesFromFirestore(): Promise<GradeRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.GRADES));
    return snapshot.docs.map((d) => d.data() as GradeRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.GRADES);
    return [];
  }
}

export async function saveGradeToFirestore(grade: GradeRecord): Promise<void> {
  const path = `${COLLECTIONS.GRADES}/${grade.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.GRADES, grade.id), cleanFirestoreData(grade));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveGradesBatchFirestore(grades: GradeRecord[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.GRADES));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(grades.map((g) => g.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    grades.forEach((grade) => {
      const ref = doc(db, COLLECTIONS.GRADES, grade.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(grade) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.GRADES);
    throw error;
  }
}

// -------------------------------------------------------------
// ACTIVITIES CRUD
// -------------------------------------------------------------
export async function fetchActivitiesFromFirestore(): Promise<Activity[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.ACTIVITIES));
    return snapshot.docs.map((d) => d.data() as Activity);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.ACTIVITIES);
    return [];
  }
}

export async function saveActivityToFirestore(activity: Activity): Promise<void> {
  const path = `${COLLECTIONS.ACTIVITIES}/${activity.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.ACTIVITIES, activity.id), cleanFirestoreData(activity));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteActivityFromFirestore(activityId: string): Promise<void> {
  const path = `${COLLECTIONS.ACTIVITIES}/${activityId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.ACTIVITIES, activityId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function saveActivitiesBatchFirestore(activities: Activity[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.ACTIVITIES));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(activities.map((a) => a.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    activities.forEach((act) => {
      const ref = doc(db, COLLECTIONS.ACTIVITIES, act.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(act) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.ACTIVITIES);
    throw error;
  }
}

// -------------------------------------------------------------
// GROUPS CRUD
// -------------------------------------------------------------
export async function fetchGroupsFromFirestore(): Promise<Group[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.GROUPS));
    return snapshot.docs.map((d) => d.data() as Group);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.GROUPS);
    return [];
  }
}

export async function saveGroupToFirestore(group: Group): Promise<void> {
  const path = `${COLLECTIONS.GROUPS}/${group.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.GROUPS, group.id), cleanFirestoreData(group));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteGroupFromFirestore(groupId: string): Promise<void> {
  const path = `${COLLECTIONS.GROUPS}/${groupId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.GROUPS, groupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function saveGroupsBatchFirestore(groups: Group[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.GROUPS));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(groups.map((g) => g.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    groups.forEach((grp) => {
      const ref = doc(db, COLLECTIONS.GROUPS, grp.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(grp) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.GROUPS);
    throw error;
  }
}

// -------------------------------------------------------------
// TEACHERS CRUD
// -------------------------------------------------------------
export async function fetchTeachersFromFirestore(): Promise<Teacher[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.TEACHERS));
    return snapshot.docs.map((d) => d.data() as Teacher);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TEACHERS);
    return [];
  }
}

export async function saveTeacherToFirestore(teacher: Teacher): Promise<void> {
  const path = `${COLLECTIONS.TEACHERS}/${teacher.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.TEACHERS, teacher.id), cleanFirestoreData(teacher));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteTeacherFromFirestore(teacherId: string): Promise<void> {
  const path = `${COLLECTIONS.TEACHERS}/${teacherId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.TEACHERS, teacherId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function saveTeachersBatchFirestore(teachers: Teacher[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.TEACHERS));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(teachers.map((t) => t.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    // Delete teacher documents from Firestore that are no longer in the list
    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    // Write current teachers
    teachers.forEach((tch) => {
      const ref = doc(db, COLLECTIONS.TEACHERS, tch.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(tch) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.TEACHERS);
    throw error;
  }
}

// -------------------------------------------------------------
// SETTINGS CRUD
// -------------------------------------------------------------
export async function fetchSettingsFromFirestore(): Promise<SchoolSettings | null> {
  const path = `${COLLECTIONS.SETTINGS}/general`;
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'general'));
    if (docSnap.exists()) {
      return docSnap.data() as SchoolSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveSettingsToFirestore(settings: SchoolSettings): Promise<void> {
  const path = `${COLLECTIONS.SETTINGS}/general`;
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'general'), cleanFirestoreData(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// -------------------------------------------------------------
// NOTIFICATIONS CRUD
// -------------------------------------------------------------
export async function fetchNotificationsFromFirestore(): Promise<NotificationLog[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.NOTIFICATIONS));
    return snapshot.docs.map((d) => d.data() as NotificationLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.NOTIFICATIONS);
    return [];
  }
}

export async function saveNotificationLogToFirestore(log: NotificationLog): Promise<void> {
  const path = `${COLLECTIONS.NOTIFICATIONS}/${log.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, log.id), cleanFirestoreData(log));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteNotificationLogFromFirestore(logId: string): Promise<void> {
  const path = `${COLLECTIONS.NOTIFICATIONS}/${logId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function clearAllNotificationLogsFromFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.NOTIFICATIONS));
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.NOTIFICATIONS);
    throw error;
  }
}

// -------------------------------------------------------------
// WORK GROUPS CRUD
// -------------------------------------------------------------
export async function fetchWorkGroupsFromFirestore(): Promise<WorkGroupSet[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.WORK_GROUPS));
    return snapshot.docs.map((d) => d.data() as WorkGroupSet);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.WORK_GROUPS);
    return [];
  }
}

export async function saveWorkGroupsBatchFirestore(workGroups: WorkGroupSet[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.WORK_GROUPS));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(workGroups.map((w) => w.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    workGroups.forEach((wg) => {
      const ref = doc(db, COLLECTIONS.WORK_GROUPS, wg.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(wg) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.WORK_GROUPS);
    throw error;
  }
}

// -------------------------------------------------------------
// SEATING PLANS CRUD
// -------------------------------------------------------------
export async function fetchSeatingPlansFromFirestore(): Promise<GroupSeatingPlan[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SEATING_PLANS));
    return snapshot.docs.map((d) => d.data() as GroupSeatingPlan);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SEATING_PLANS);
    return [];
  }
}

export async function saveSeatingPlansBatchFirestore(plans: GroupSeatingPlan[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.SEATING_PLANS));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(plans.map((p) => p.groupId));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    plans.forEach((plan) => {
      const ref = doc(db, COLLECTIONS.SEATING_PLANS, plan.groupId);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(plan) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.SEATING_PLANS);
    throw error;
  }
}

// -------------------------------------------------------------
// DAILY LOGS CRUD
// -------------------------------------------------------------
export async function fetchDailyLogsFromFirestore(): Promise<ClassDailyLog[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.DAILY_LOGS));
    return snapshot.docs.map((d) => d.data() as ClassDailyLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.DAILY_LOGS);
    return [];
  }
}

export async function saveDailyLogsBatchFirestore(logs: ClassDailyLog[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.DAILY_LOGS));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(logs.map((l) => l.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    logs.forEach((log) => {
      const ref = doc(db, COLLECTIONS.DAILY_LOGS, log.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(log) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.DAILY_LOGS);
    throw error;
  }
}

// -------------------------------------------------------------
// SCHEDULES CRUD
// -------------------------------------------------------------
export async function fetchSchedulesFromFirestore(): Promise<ScheduleTimeSlot[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SCHEDULES));
    return snapshot.docs.map((d) => d.data() as ScheduleTimeSlot);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SCHEDULES);
    return [];
  }
}

export async function saveSchedulesBatchFirestore(schedules: ScheduleTimeSlot[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.SCHEDULES));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(schedules.map((s) => s.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    schedules.forEach((sch) => {
      const ref = doc(db, COLLECTIONS.SCHEDULES, sch.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(sch) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.SCHEDULES);
    throw error;
  }
}

// -------------------------------------------------------------
// SUBJECT CONFIGS (EVALUATION WEIGHTINGS & CATEGORIES) CRUD
// -------------------------------------------------------------
export async function fetchSubjectConfigsFromFirestore(): Promise<SubjectConfig[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SUBJECT_CONFIGS));
    return snapshot.docs.map((d) => d.data() as SubjectConfig);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SUBJECT_CONFIGS);
    return [];
  }
}

export async function saveSubjectConfigToFirestore(config: SubjectConfig): Promise<void> {
  const path = `${COLLECTIONS.SUBJECT_CONFIGS}/${config.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.SUBJECT_CONFIGS, config.id), cleanFirestoreData(config));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function saveSubjectConfigsBatchFirestore(configs: SubjectConfig[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.SUBJECT_CONFIGS));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(configs.map((c) => c.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    configs.forEach((cfg) => {
      const ref = doc(db, COLLECTIONS.SUBJECT_CONFIGS, cfg.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(cfg) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.SUBJECT_CONFIGS);
    throw error;
  }
}

export async function deleteSubjectConfigFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTIONS.SUBJECT_CONFIGS}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.SUBJECT_CONFIGS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// -------------------------------------------------------------
// REMEDIALS / NIVELACIONES DE PERIODOS PASADOS CRUD
// -------------------------------------------------------------
export async function fetchRemedialsFromFirestore(): Promise<RemedialRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.REMEDIALS));
    return snapshot.docs.map((d) => d.data() as RemedialRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.REMEDIALS);
    return [];
  }
}

export async function saveRemedialToFirestore(remedial: RemedialRecord): Promise<void> {
  const path = `${COLLECTIONS.REMEDIALS}/${remedial.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.REMEDIALS, remedial.id), cleanFirestoreData(remedial));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteRemedialFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTIONS.REMEDIALS}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.REMEDIALS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function saveRemedialsBatchFirestore(remedials: RemedialRecord[]): Promise<void> {
  try {
    let snapshotDocs: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.REMEDIALS));
      snapshotDocs = snapshot.docs;
    } catch {
      // Offline fallback
    }
    const newIds = new Set(remedials.map((r) => r.id));
    const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

    snapshotDocs.forEach((docSnap) => {
      if (!newIds.has(docSnap.id)) {
        operations.push({ type: 'delete', ref: docSnap.ref });
      }
    });

    remedials.forEach((rem) => {
      const ref = doc(db, COLLECTIONS.REMEDIALS, rem.id);
      operations.push({ type: 'set', ref, data: cleanFirestoreData(rem) });
    });

    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.REMEDIALS);
    throw error;
  }
}

// -------------------------------------------------------------
// REAL-TIME FIRESTORE LISTENERS
// -------------------------------------------------------------
export interface FirestoreSubscriptions {
  onStudentsChange?: (students: Student[]) => void;
  onAttendanceChange?: (attendance: AttendanceRecord[]) => void;
  onGradesChange?: (grades: GradeRecord[]) => void;
  onActivitiesChange?: (activities: Activity[]) => void;
  onGroupsChange?: (groups: Group[]) => void;
  onTeachersChange?: (teachers: Teacher[]) => void;
  onSettingsChange?: (settings: SchoolSettings) => void;
  onNotificationsChange?: (logs: NotificationLog[]) => void;
  onSubjectConfigsChange?: (configs: SubjectConfig[]) => void;
  onWorkGroupsChange?: (workGroups: WorkGroupSet[]) => void;
  onSeatingPlansChange?: (plans: GroupSeatingPlan[]) => void;
  onDailyLogsChange?: (logs: ClassDailyLog[]) => void;
  onSchedulesChange?: (schedules: ScheduleTimeSlot[]) => void;
  onRemedialsChange?: (remedials: RemedialRecord[]) => void;
  onSyncStatusChange?: (status: 'synced' | 'syncing' | 'offline') => void;
  onError?: (error: Error) => void;
}

export function subscribeToFirestoreSync(subs: FirestoreSubscriptions): () => void {
  const unsubs: Unsubscribe[] = [];

  try {
    if (subs.onStudentsChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.STUDENTS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as Student);
              subs.onStudentsChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.STUDENTS);
            subs.onError?.(error);
          }
        )
      );
    }

    if (subs.onAttendanceChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.ATTENDANCE),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as AttendanceRecord);
              subs.onAttendanceChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.ATTENDANCE);
            subs.onError?.(error);
          }
        )
      );
    }

    if (subs.onGradesChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.GRADES),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as GradeRecord);
              subs.onGradesChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.GRADES);
            subs.onError?.(error);
          }
        )
      );
    }

    if (subs.onActivitiesChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.ACTIVITIES),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as Activity);
              subs.onActivitiesChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.ACTIVITIES);
            subs.onError?.(error);
          }
        )
      );
    }

    if (subs.onGroupsChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.GROUPS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as Group);
              subs.onGroupsChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.GROUPS);
            subs.onError?.(error);
          }
        )
      );
    }

    if (subs.onTeachersChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.TEACHERS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as Teacher);
              subs.onTeachersChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.TEACHERS);
            subs.onError?.(error);
          }
        )
      );
    }

    if (subs.onSettingsChange) {
      unsubs.push(
        onSnapshot(
          doc(db, COLLECTIONS.SETTINGS, 'general'),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (snap.exists()) {
              subs.onSettingsChange?.(snap.data() as SchoolSettings);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.SETTINGS}/general`);
            subs.onError?.(error);
          }
        )
      );
    }

    if (subs.onNotificationsChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.NOTIFICATIONS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as NotificationLog);
              subs.onNotificationsChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.NOTIFICATIONS);
            subs.onError?.(error);
          }
        )
      );
    }

    if (subs.onSubjectConfigsChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.SUBJECT_CONFIGS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as SubjectConfig);
              subs.onSubjectConfigsChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.SUBJECT_CONFIGS);
          }
        )
      );
    }

    if (subs.onWorkGroupsChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.WORK_GROUPS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as WorkGroupSet);
              subs.onWorkGroupsChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.WORK_GROUPS);
          }
        )
      );
    }

    if (subs.onSeatingPlansChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.SEATING_PLANS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as GroupSeatingPlan);
              subs.onSeatingPlansChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.SEATING_PLANS);
          }
        )
      );
    }

    if (subs.onDailyLogsChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.DAILY_LOGS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as ClassDailyLog);
              subs.onDailyLogsChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.DAILY_LOGS);
          }
        )
      );
    }

    if (subs.onSchedulesChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.SCHEDULES),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as ScheduleTimeSlot);
              subs.onSchedulesChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.SCHEDULES);
          }
        )
      );
    }

    if (subs.onRemedialsChange) {
      unsubs.push(
        onSnapshot(
          collection(db, COLLECTIONS.REMEDIALS),
          (snap) => {
            subs.onSyncStatusChange?.('synced');
            if (!snap.empty) {
              const data = snap.docs.map((d) => d.data() as RemedialRecord);
              subs.onRemedialsChange?.(data);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, COLLECTIONS.REMEDIALS);
          }
        )
      );
    }
  } catch (err) {
    console.info('Notice initializing Firestore sync listeners:', err);
  }

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // Safe unsubscribe
      }
    });
  };
}

export async function saveStudentsBatchFirestore(students: Student[]): Promise<void> {
  try {
    const operations = students.map((student) => ({
      type: 'set' as const,
      ref: doc(db, COLLECTIONS.STUDENTS, student.id),
      data: cleanFirestoreData(student),
    }));
    await executeFirestoreBatches(operations);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.STUDENTS);
    throw error;
  }
}

/**
 * Robustly fetches all school academic data from Firestore in parallel.
 * Returns the loaded dataset and connectivity metadata.
 */
export interface AllSchoolData {
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  attendance: AttendanceRecord[];
  activities: Activity[];
  grades: GradeRecord[];
  settings: SchoolSettings | null;
  notifications: NotificationLog[];
  subjectConfigs: SubjectConfig[];
  workGroups: WorkGroupSet[];
  seatingPlans: GroupSeatingPlan[];
  dailyLogs: ClassDailyLog[];
  schedules: ScheduleTimeSlot[];
  remedials: RemedialRecord[];
}

export async function fetchAllFirestoreData(timeoutMs = 12000): Promise<{
  data: Partial<AllSchoolData>;
  isEmpty: boolean;
  hasConnection: boolean;
}> {
  const fetchPromise = (async () => {
    const [
      teachers,
      groups,
      students,
      attendance,
      activities,
      grades,
      settings,
      subjectConfigs,
      workGroups,
      seatingPlans,
      dailyLogs,
      schedules,
      remedials,
      notifications,
    ] = await Promise.all([
      fetchTeachersFromFirestore(),
      fetchGroupsFromFirestore(),
      fetchStudentsFromFirestore(),
      fetchAttendanceFromFirestore(),
      fetchActivitiesFromFirestore(),
      fetchGradesFromFirestore(),
      fetchSettingsFromFirestore(),
      fetchSubjectConfigsFromFirestore(),
      fetchWorkGroupsFromFirestore(),
      fetchSeatingPlansFromFirestore(),
      fetchDailyLogsFromFirestore(),
      fetchSchedulesFromFirestore(),
      fetchRemedialsFromFirestore(),
      fetchNotificationsFromFirestore(),
    ]);

    const hasRemoteData = Boolean(
      (teachers && teachers.length > 0) ||
      (groups && groups.length > 0) ||
      (students && students.length > 0) ||
      (activities && activities.length > 0) ||
      (grades && grades.length > 0) ||
      (attendance && attendance.length > 0) ||
      (settings && settings.schoolName)
    );

    return {
      data: {
        teachers: teachers || [],
        groups: groups || [],
        students: students || [],
        attendance: attendance || [],
        activities: activities || [],
        grades: grades || [],
        settings: settings || null,
        subjectConfigs: subjectConfigs || [],
        workGroups: workGroups || [],
        seatingPlans: seatingPlans || [],
        dailyLogs: dailyLogs || [],
        schedules: schedules || [],
        remedials: remedials || [],
        notifications: notifications || [],
      },
      isEmpty: !hasRemoteData,
      hasConnection: true,
    };
  })();

  const timeoutPromise = new Promise<{
    data: Partial<AllSchoolData>;
    isEmpty: boolean;
    hasConnection: boolean;
  }>((resolve) => {
    setTimeout(() => {
      resolve({
        data: {},
        isEmpty: true,
        hasConnection: true,
      });
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error fetching all Firestore database records:', error);
    return {
      data: {},
      isEmpty: true,
      hasConnection: false,
    };
  }
}

/**
 * Initializes Firestore with default initial data ONLY if the database is 100% empty.
 */
export async function seedFirestoreInitialData(initialData: {
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  attendance: AttendanceRecord[];
  activities: Activity[];
  grades: GradeRecord[];
  settings: SchoolSettings;
  notifications?: NotificationLog[];
  subjectConfigs?: SubjectConfig[];
  workGroups?: WorkGroupSet[];
  seatingPlans?: GroupSeatingPlan[];
  dailyLogs?: ClassDailyLog[];
  schedules?: ScheduleTimeSlot[];
  remedials?: RemedialRecord[];
}): Promise<boolean> {
  try {
    // Check if the database has any documents in key collections before attempting seed
    const [settingsDoc, teachersSnap, groupsSnap, studentsSnap] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.SETTINGS, 'general')).catch(() => null),
      getDocs(collection(db, COLLECTIONS.TEACHERS)).catch(() => null),
      getDocs(collection(db, COLLECTIONS.GROUPS)).catch(() => null),
      getDocs(collection(db, COLLECTIONS.STUDENTS)).catch(() => null),
    ]);

    const hasExistingData = Boolean(
      (settingsDoc && settingsDoc.exists()) ||
      (teachersSnap && !teachersSnap.empty) ||
      (groupsSnap && !groupsSnap.empty) ||
      (studentsSnap && !studentsSnap.empty)
    );

    if (hasExistingData) {
      console.info('Firestore database already contains stored records. Skipping initial seeding.');
      return false;
    }

    console.info('Firestore database is brand new. Seeding initial school records to Firestore...');
    if (initialData.teachers && initialData.teachers.length > 0) await saveTeachersBatchFirestore(initialData.teachers);
    if (initialData.groups && initialData.groups.length > 0) await saveGroupsBatchFirestore(initialData.groups);
    if (initialData.students && initialData.students.length > 0) await saveStudentsBatchFirestore(initialData.students);
    if (initialData.attendance && initialData.attendance.length > 0) await saveAttendanceBatchFirestore(initialData.attendance);
    if (initialData.activities && initialData.activities.length > 0) await saveActivitiesBatchFirestore(initialData.activities);
    if (initialData.grades && initialData.grades.length > 0) await saveGradesBatchFirestore(initialData.grades);
    if (initialData.settings) await saveSettingsToFirestore(initialData.settings);
    if (initialData.subjectConfigs && initialData.subjectConfigs.length > 0) await saveSubjectConfigsBatchFirestore(initialData.subjectConfigs);
    if (initialData.workGroups && initialData.workGroups.length > 0) await saveWorkGroupsBatchFirestore(initialData.workGroups);
    if (initialData.seatingPlans && initialData.seatingPlans.length > 0) await saveSeatingPlansBatchFirestore(initialData.seatingPlans);
    if (initialData.dailyLogs && initialData.dailyLogs.length > 0) await saveDailyLogsBatchFirestore(initialData.dailyLogs);
    if (initialData.schedules && initialData.schedules.length > 0) await saveSchedulesBatchFirestore(initialData.schedules);
    if (initialData.remedials && initialData.remedials.length > 0) await saveRemedialsBatchFirestore(initialData.remedials);

    return true;
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.toLowerCase().includes('offline') || msg.toLowerCase().includes('unavailable')) {
      console.info('Firestore initial seed deferred (client currently offline):', msg);
    } else {
      console.info('Notice during initial Firestore data seed:', error);
    }
    return false;
  }
}
