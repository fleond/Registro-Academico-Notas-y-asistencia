/**
 * MySQL Service & Synchronization Client
 * Handles communication with Node.js Express backend and WAMP PHP API
 */

import {
  Teacher,
  Group,
  Student,
  AttendanceRecord,
  Activity,
  GradeRecord,
  SchoolSettings,
  SubjectConfig,
  RemedialRecord,
  ClassDailyLog,
  ScheduleTimeSlot,
  WorkGroupSet,
  GroupSeatingPlan,
  NotificationLog,
} from '../types';

export interface MySQLConnectionConfig {
  host: string;
  port: number | string;
  user: string;
  password?: string;
  database: string;
  customApiUrl?: string;
}

export interface MySQLServerStatus {
  connected: boolean;
  engine: string;
  database?: string;
  host?: string;
  message?: string;
  counts?: {
    teachers_count?: number;
    groups_count?: number;
    students_count?: number;
    attendance_count?: number;
    activities_count?: number;
    grades_count?: number;
  };
}

const STORAGE_KEY_MYSQL_CONFIG = 'educontrol_mysql_config';

export const getSavedMySQLConfig = (): MySQLConnectionConfig => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_MYSQL_CONFIG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved MySQL config:', e);
      }
    }
  }
  return {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'registro_academico_fleon',
    customApiUrl: '',
  };
};

export const saveMySQLConfig = (config: MySQLConnectionConfig) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_MYSQL_CONFIG, JSON.stringify(config));
  }
};

/**
 * Checks connectivity to the MySQL backend server (Express or PHP)
 */
export const checkMySQLStatus = async (config?: MySQLConnectionConfig): Promise<MySQLServerStatus> => {
  const currentConfig = config || getSavedMySQLConfig();

  // 1. If custom PHP API URL is provided, test it
  if (currentConfig.customApiUrl && currentConfig.customApiUrl.trim().length > 0) {
    try {
      const url = currentConfig.customApiUrl.replace(/\/+$/, '') + '/?action=status';
      const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        return {
          connected: json.connected ?? true,
          engine: json.engine || 'WAMP PHP API (MySQL)',
          database: json.database || currentConfig.database,
          host: json.host || `${currentConfig.host}:${currentConfig.port}`,
          counts: json.counts,
        };
      }
    } catch (err: any) {
      return {
        connected: false,
        engine: 'WAMP PHP API',
        message: `No se pudo conectar a la URL de la API PHP: ${err.message || 'Verifica que WAMP Apache esté activo'}`,
      };
    }
  }

  // 2. Default to internal fullstack Node Express /api/mysql/status
  try {
    const res = await fetch('/api/mysql/status', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
    return {
      connected: false,
      engine: 'MySQL Node Backend',
      message: `Error HTTP ${res.status}: Servidor backend no respondió adecuadamente`,
    };
  } catch (err: any) {
    return {
      connected: false,
      engine: 'MySQL Backend',
      message: `No se pudo conectar al endpoint local: ${err.message}`,
    };
  }
};

/**
 * Tests connection with specific credentials
 */
export const testMySQLConnection = async (config: MySQLConnectionConfig): Promise<{ success: boolean; message: string }> => {
  saveMySQLConfig(config);
  try {
    const res = await fetch('/api/mysql/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    return {
      success: json.success ?? false,
      message: json.message || (json.success ? '¡Conexión a MySQL exitosa!' : 'Error de autenticación o base de datos no encontrada.'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error de red al probar conexión: ${err.message}`,
    };
  }
};

/**
 * Pulls all consolidated data from MySQL
 */
export const pullAllDataFromMySQL = async (config?: MySQLConnectionConfig): Promise<{
  success: boolean;
  data?: {
    settings?: SchoolSettings;
    teachers?: Teacher[];
    groups?: Group[];
    students?: Student[];
    attendance?: AttendanceRecord[];
    activities?: Activity[];
    grades?: GradeRecord[];
    subjectConfigs?: SubjectConfig[];
    remedials?: RemedialRecord[];
    dailyLogs?: ClassDailyLog[];
    schedules?: ScheduleTimeSlot[];
    workGroups?: WorkGroupSet[];
    seatingPlans?: GroupSeatingPlan[];
    notifications?: NotificationLog[];
  };
  message?: string;
}> => {
  const currentConfig = config || getSavedMySQLConfig();

  // If custom PHP API
  if (currentConfig.customApiUrl && currentConfig.customApiUrl.trim().length > 0) {
    try {
      const url = currentConfig.customApiUrl.replace(/\/+$/, '') + '/?action=pull';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          return { success: true, data: json.data };
        }
      }
      return { success: false, message: 'La API PHP no retornó los datos esperados.' };
    } catch (err: any) {
      return { success: false, message: `Error consultando API PHP: ${err.message}` };
    }
  }

  // Internal Node Backend
  try {
    const res = await fetch('/api/mysql/sync/pull');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data };
      }
      return { success: false, message: json.message || 'No se pudieron recuperar los datos de MySQL.' };
    }
    return { success: false, message: `Error HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, message: `Error de conexión: ${err.message}` };
  }
};

/**
 * Sanitizes and guarantees referential integrity across all data collections
 * before exporting to MySQL, preventing Error 1452 (Foreign Key Constraint Violation)
 */
export const sanitizeDataForMySQL = (payload: {
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  attendance: AttendanceRecord[];
  activities: Activity[];
  grades: GradeRecord[];
  settings: SchoolSettings;
  subjectConfigs?: SubjectConfig[];
  remedials?: RemedialRecord[];
  dailyLogs?: ClassDailyLog[];
  schedules?: ScheduleTimeSlot[];
  workGroups?: WorkGroupSet[];
  seatingPlans?: GroupSeatingPlan[];
  notifications?: NotificationLog[];
}) => {
  const groups = Array.isArray(payload.groups) ? [...payload.groups] : [];
  if (groups.length === 0) {
    groups.push({
      id: 'grp-default',
      name: 'Grupo General',
      grade: '10°',
      section: 'A',
      schoolYear: '2026',
      shift: 'Mañana',
      directorName: 'Docente Titular',
      room: 'Aula Principal',
      subjects: ['General'],
      assignedTeacherIds: [],
      createdAt: new Date().toISOString().split('T')[0],
    });
  }

  const groupIds = new Set(groups.map((g) => g.id));
  const fallbackGroupId = groups[0].id;

  // 1. Sanitize students: Ensure each has a valid groupId
  const students = (Array.isArray(payload.students) ? payload.students : []).map((s) => ({
    ...s,
    groupId: s.groupId && groupIds.has(s.groupId) ? s.groupId : fallbackGroupId,
  }));
  const studentIds = new Set(students.map((s) => s.id));

  // 2. Sanitize attendance: Must have existing student and existing group
  const attendance = (Array.isArray(payload.attendance) ? payload.attendance : [])
    .filter((a) => a && a.studentId && studentIds.has(a.studentId))
    .map((a) => ({
      ...a,
      groupId: a.groupId && groupIds.has(a.groupId) ? a.groupId : fallbackGroupId,
    }));

  // 3. Sanitize activities: Must have valid groupId
  const activities = (Array.isArray(payload.activities) ? payload.activities : []).map((ac) => ({
    ...ac,
    groupId: ac.groupId && groupIds.has(ac.groupId) ? ac.groupId : fallbackGroupId,
  }));
  const activityIds = new Set(activities.map((ac) => ac.id));

  // 4. Sanitize grades: Must have existing activityId and studentId (Error 1452 prevention)
  const grades = (Array.isArray(payload.grades) ? payload.grades : []).filter(
    (g) => g && g.activityId && activityIds.has(g.activityId) && g.studentId && studentIds.has(g.studentId)
  );

  // 5. Sanitize remedials
  const remedials = (Array.isArray(payload.remedials) ? payload.remedials : [])
    .filter((r) => r && r.studentId && studentIds.has(r.studentId))
    .map((r) => ({
      ...r,
      groupId: r.groupId && groupIds.has(r.groupId) ? r.groupId : fallbackGroupId,
    }));

  // 6. Sanitize dailyLogs
  const dailyLogs = (Array.isArray(payload.dailyLogs) ? payload.dailyLogs : []).map((dl) => ({
    ...dl,
    groupId: dl.groupId && groupIds.has(dl.groupId) ? dl.groupId : fallbackGroupId,
  }));

  // 7. Sanitize schedules
  const schedules = (Array.isArray(payload.schedules) ? payload.schedules : []).map((sc) => ({
    ...sc,
    groupId: sc.groupId && groupIds.has(sc.groupId) ? sc.groupId : fallbackGroupId,
  }));

  // 8. Sanitize workGroups & seatingPlans
  const workGroups = (Array.isArray(payload.workGroups) ? payload.workGroups : []).map((wg) => ({
    ...wg,
    groupId: wg.groupId && groupIds.has(wg.groupId) ? wg.groupId : fallbackGroupId,
  }));

  const seatingPlans = (Array.isArray(payload.seatingPlans) ? payload.seatingPlans : []).map((sp) => ({
    ...sp,
    groupId: sp.groupId && groupIds.has(sp.groupId) ? sp.groupId : fallbackGroupId,
  }));

  return {
    ...payload,
    groups,
    students,
    attendance,
    activities,
    grades,
    remedials,
    dailyLogs,
    schedules,
    workGroups,
    seatingPlans,
  };
};

/**
 * Pushes entire frontend state to MySQL in a single transaction/batch
 */
export const pushAllDataToMySQL = async (
  payload: {
    teachers: Teacher[];
    groups: Group[];
    students: Student[];
    attendance: AttendanceRecord[];
    activities: Activity[];
    grades: GradeRecord[];
    settings: SchoolSettings;
    subjectConfigs?: SubjectConfig[];
    remedials?: RemedialRecord[];
    dailyLogs?: ClassDailyLog[];
    schedules?: ScheduleTimeSlot[];
    workGroups?: WorkGroupSet[];
    seatingPlans?: GroupSeatingPlan[];
    notifications?: NotificationLog[];
  },
  config?: MySQLConnectionConfig
): Promise<{ success: boolean; message: string }> => {
  const currentConfig = config || getSavedMySQLConfig();
  // Sanitizar automáticamente para evitar error 1452 de clave foránea
  const cleanPayload = sanitizeDataForMySQL(payload);

  // If custom PHP API
  if (currentConfig.customApiUrl && currentConfig.customApiUrl.trim().length > 0) {
    try {
      const url = currentConfig.customApiUrl.replace(/\/+$/, '') + '/?action=push';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        return { success: true, message: json.message || '¡Datos exportados exitosamente a WAMP MySQL!' };
      }
      return { success: false, message: json.message || 'Error en la respuesta de la API PHP.' };
    } catch (err: any) {
      return { success: false, message: `Error al enviar datos a la API PHP: ${err.message}` };
    }
  }

  // Internal Node Backend
  try {
    const res = await fetch('/api/mysql/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cleanPayload, dbConfig: currentConfig }),
    });
    const json = await res.json();
    return {
      success: json.success ?? false,
      message: json.message || (json.success ? '¡Datos exportados exitosamente a MySQL!' : 'No se pudo guardar en MySQL.'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error de red: ${err.message}`,
    };
  }
};

/**
 * Repairs / softens strict foreign key constraints in local database if previously created
 */
export const fixMySQLConstraints = async (config?: MySQLConnectionConfig): Promise<{ success: boolean; message: string }> => {
  const currentConfig = config || getSavedMySQLConfig();

  if (currentConfig.customApiUrl && currentConfig.customApiUrl.trim().length > 0) {
    try {
      const url = currentConfig.customApiUrl.replace(/\/+$/, '') + '/?action=fix_constraints';
      const res = await fetch(url);
      const json = await res.json();
      return {
        success: json.status === 'success',
        message: json.message || 'Restricciones de clave foránea verificadas.',
      };
    } catch (err: any) {
      return { success: false, message: `Error contactando API PHP: ${err.message}` };
    }
  }

  try {
    const res = await fetch('/api/mysql/fix-constraints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentConfig),
    });
    const json = await res.json();
    return {
      success: json.success ?? false,
      message: json.message || 'Restricciones de clave foránea verificadas.',
    };
  } catch (err: any) {
    return { success: false, message: `Error: ${err.message}` };
  }
};

/**
 * Deletes a single record directly from MySQL (WAMP PHP API or internal Express API)
 */
export const deleteRecordFromMySQL = async (
  table: string,
  id: string,
  config?: MySQLConnectionConfig
): Promise<{ success: boolean; message: string }> => {
  const currentConfig = config || getSavedMySQLConfig();

  // If custom PHP API (WAMP)
  if (currentConfig.customApiUrl && currentConfig.customApiUrl.trim().length > 0) {
    try {
      const url = `${currentConfig.customApiUrl.replace(/\/+$/, '')}/?action=delete&table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      return {
        success: json.status === 'success',
        message: json.message || (json.status === 'success' ? `Registro eliminado de ${table}` : 'Error al eliminar en MySQL'),
      };
    } catch (err: any) {
      return { success: false, message: `Error contactando API PHP: ${err.message}` };
    }
  }

  // Internal Node Backend
  try {
    const res = await fetch('/api/mysql/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id }),
    });
    const json = await res.json();
    return {
      success: json.success ?? false,
      message: json.message || (json.success ? `Registro eliminado de ${table}` : 'Error al eliminar en MySQL'),
    };
  } catch (err: any) {
    return { success: false, message: `Error: ${err.message}` };
  }
};

