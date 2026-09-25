export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'evasion' | 'early_departure' | string;

export type UniformStatus = 'complete' | 'incomplete' | 'none';

export type NoveltyCategory = 'presence' | 'late' | 'absence' | 'excused' | 'incident' | 'departure' | 'health' | 'other';

export type NoveltySeverity = 'low' | 'medium' | 'high' | 'neutral';

export interface AttendanceNoveltyConfig {
  id: string; // e.g. 'present', 'late', 'absent', 'excused', 'evasion', 'early_departure', 'enfermeria', 'permiso_especial', or custom UUID
  code: string; // e.g. 'P', 'R', 'I', 'J', 'EV', 'RT', 'ENF', 'PE'
  name: string; // Full descriptive name e.g. "Evasión de Clase"
  shortName: string; // Short button label e.g. "Evasión"
  category: NoveltyCategory;
  severity: NoveltySeverity;
  color: 'emerald' | 'amber' | 'rose' | 'sky' | 'orange' | 'purple' | 'red' | 'teal' | 'indigo' | 'slate' | string;
  iconName?: string;
  description?: string;
  requiresMinutes?: boolean;
  requiresReason?: boolean;
  isSystemDefault?: boolean;
  isActive: boolean;
  customWhatsAppTemplate?: string;
}

export interface UniformNoveltyTag {
  id: string;
  name: string;
  isActive: boolean;
}

export type DeliveryStatus = 'yes' | 'late' | 'no' | 'pending' | 'unexcused_absence' | 'excused_absence' | string;

export type ActivityType = 'taller' | 'evaluacion' | 'tarea' | 'proyecto' | 'participacion' | 'otro';

export type UserRole = 'admin' | 'teacher' | 'parent';

export interface TeacherSubjectAssignment {
  groupId: string;
  subject: string;
  assignedAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  documentId: string;
  phone: string;
  specialty: string;
  assignedGroupIds: string[];
  assignedGrades?: string[];
  assignedSubjects: string[];
  assignments?: TeacherSubjectAssignment[];
  role: 'teacher' | 'coordinator';
  status: 'active' | 'inactive';
  password?: string;
  avatarColor?: string;
  createdAt: string;
}

export interface AuthUser {
  role: UserRole;
  id: string;
  name: string;
  email?: string;
  documentId?: string;
  teacher?: Teacher;
  student?: Student;
}

export interface EvaluationCategory {
  id: string;
  name: string; // e.g. "Heteroevaluación", "Coevaluación", "Autoevaluación", "Examen Final", "SABER", "HACER", "SER"
  weightPercentage: number; // e.g. 50, 15, 10, 25 or 40, 40, 20
  description?: string;
  color?: string; // e.g. 'indigo', 'emerald', 'teal', 'amber', 'rose', 'purple', 'sky', 'orange'
  code?: string; // e.g. 'HET', 'COE', 'AUT', 'EXF', 'SAB', 'HAC', 'SER'
}

export interface SubjectConfig {
  id: string;
  groupId: string;
  subjectName: string;
  categories: EvaluationCategory[];
}

export interface AcademicPeriod {
  id: string; // e.g. "p1", "p2", "p3", "p4"
  name: string; // e.g. "Periodo 1", "Periodo 2", "Periodo 3", "Periodo 4"
  code: string; // e.g. "P1", "P2", "P3", "P4"
  startDate: string; // YYYY-MM-DD e.g. "2026-01-15"
  endDate: string; // YYYY-MM-DD e.g. "2026-04-10"
  weightPercentage: number; // e.g. 25 (%)
  status: 'active' | 'closed' | 'upcoming';
  description?: string;
}

export interface Group {
  id: string;
  name: string; // e.g. "10° A", "Grado 10°"
  grade: string; // e.g. "10°", "9°"
  section?: string; // (No se usa, opcional por compatibilidad)
  schoolYear: string; // e.g. "2026"
  shift: 'Mañana' | 'Tarde' | 'Única' | 'Nocturna';
  directorName?: string; // Docente de la Asignatura / Responsable
  teacherName?: string; // Nombre del docente de la asignatura
  teacherId?: string; // ID del docente asignado
  room?: string;
  subjects: string[];
  createdByTeacherId?: string;
  assignedTeacherIds?: string[];
  createdAt: string;
}

export interface Student {
  id: string;
  documentId: string;
  firstName: string;
  lastName: string;
  groupId: string;
  email?: string;
  guardianName: string;
  guardianPhone: string;
  guardianCountryCode: string; // e.g. "+57", "+52", "+1", "+34"
  guardianEmail?: string;
  guardianRelationship: 'Madre' | 'Padre' | 'Acudiente' | 'Tutor' | 'Abuelo/a' | 'Otro' | string;
  status: 'active' | 'inactive';
  observations?: string;
  avatarColor?: string;
  gender?: 'M' | 'F' | 'Otro';
  createdByTeacherId?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  groupId: string;
  studentId: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  uniformStatus: UniformStatus;
  uniformNotes?: string;
  excuseReason?: string;
  observations?: string;
  notifiedWhatsApp: boolean;
  notifiedAt?: string;
}

// ==========================================
// GOOGLE DRIVE FILE ATTACHMENTS
// ==========================================
export interface DriveFileAttachment {
  id: string; // Google Drive File ID
  name: string; // Original or sanitized file name (e.g. "guia_taller_1.pdf")
  mimeType: string; // e.g. "application/pdf", "image/jpeg", "application/vnd.google-apps.document"
  webViewLink: string; // Direct link to open in Google Drive
  webContentLink?: string; // Direct download link
  thumbnailLink?: string; // Image/Doc preview thumbnail
  size?: number; // File size in bytes
  uploadedAt: string; // ISO 8601 timestamp
  folderPathDisplay?: string; // e.g. "Colegio > Grado 5° > Grupo 503 > Actividades > 2026-08-24 - Taller 1"
  driveFolderId?: string; // ID of the enclosing Drive folder
}

export interface Activity {
  id: string;
  groupId: string;
  subject: string;
  title: string;
  description?: string;
  assignedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  maxScore: number; // e.g. 5.0 or 100
  passingScore: number; // e.g. 3.5 or 70
  weightPercentage: number; // e.g. 20%
  type: ActivityType;
  period: string; // e.g. "Periodo 1", "Periodo 2", "Primer Trimestre"
  categoryId?: string; // Link to an EvaluationCategory
  createdByTeacherId?: string;
  assignedTeacherId?: string;
  attachments?: DriveFileAttachment[];
}

export interface GradeRecord {
  id: string;
  activityId: string;
  studentId: string;
  score: number | null; // null if not graded yet
  deliveredOnTime: DeliveryStatus;
  comments: string;
  feedbackDate?: string;
  notifiedWhatsApp: boolean;
  notifiedAt?: string;
  attachments?: DriveFileAttachment[];
}

// ==========================================
// PERIOD REMEDIALS / NIVELACIONES DE PERIODOS PASADOS
// ==========================================
export interface RemedialRecord {
  id: string;
  studentId: string;
  groupId: string;
  subject: string;
  period: string; // The past period being recovered (e.g. "Periodo 1", "Periodo 2", "Primer Trimestre")
  academicYear?: string;
  teacherId?: string;
  teacherName?: string;
  
  // 0. Señalar quién debe nivelar y nota reprobada del periodo
  requiresRemedial?: boolean; // Señala si el estudiante debe nivelar / asignado a nivelación
  failingScore?: number | null; // Nota con la que reprobó la asignatura en el periodo (e.g. 2.4)
  failingReason?: string; // Motivo o debilidad en el desempeño del periodo
  
  // 1. Checklist Entrega de Trabajo
  workDelivered: boolean; // boolean checklist toggle
  workDeliveredDate?: string; // YYYY-MM-DD
  
  // 2. Nota de Trabajo escrito / taller
  workScore: number | null; // e.g. 1.0 - 5.0
  
  // 3. Nota de Sustentación oral / escrita
  supportScore: number | null; // e.g. 1.0 - 5.0
  
  // 4. Definitiva de Nivelación
  finalScore: number | null; // Calculated (e.g. 50% work + 50% support) or manual override
  isPassed?: boolean; // finalScore >= 3.5 (or passing score)

  // 5. Evidencias vinculadas a Google Drive
  workDriveLink?: string; // Enlace a Google Drive del trabajo escrito / taller
  workAttachment?: DriveFileAttachment; // Adjunto de Drive
  supportDriveLink?: string; // Enlace a Google Drive de la sustentación / acta / rúbrica
  supportAttachment?: DriveFileAttachment; // Adjunto de Drive de sustentación

  // 6. Observaciones Pedagógicas y Plan de Mejoramiento
  observations?: string;

  // 7. Notificación WhatsApp al acudiente
  notifiedWhatsApp?: boolean;
  notifiedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface DatabaseConfig {
  provider: 'local' | 'firestore' | 'cloudsql' | 'supabase' | 'rest_api';
  connected: boolean;
  endpointUrl?: string;
  apiKey?: string;
  autoSync: boolean;
  lastSyncTimestamp?: string;
}

export interface SchoolSettings {
  schoolName: string;
  teacherName: string;
  defaultCountryCode: string;
  gradingScale: '1-5' | '0-10' | '0-100';
  minPassingScore?: number;
  passingScore?: number;
  currentPeriod: string;
  schoolYear: string;
  adminPassword?: string;
  adminRecoveryEmail?: string;
  autoOpenWhatsApp: boolean;
  instantWhatsAppOnAttendance?: boolean;
  attendanceTemplate: string;
  lateTemplate: string;
  absentTemplate: string;
  uniformTemplate: string;
  gradeTemplate: string;
  dailyDigestTemplate: string;
  attendanceNovelties?: AttendanceNoveltyConfig[];
  uniformTags?: UniformNoveltyTag[];
  evaluationCategories?: EvaluationCategory[];
  periods?: AcademicPeriod[];
  institutionSubjects?: string[];
  dbConfig?: DatabaseConfig;
}

export interface NotificationLog {
  id: string;
  studentId: string;
  studentName: string;
  groupId?: string;
  groupName?: string;
  guardianName: string;
  phone: string;
  type: 'attendance' | 'late' | 'absent' | 'uniform' | 'grade' | 'general';
  message: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'failed';
  method: 'wa_link' | 'api_cloud' | 'manual';
  teacherId?: string;
  teacherName?: string;
}

// ==========================================
// ABP WORK GROUPS & COLLABORATIVE ROLES
// ==========================================
export interface ABPRole {
  id: string;
  name: string; // e.g. "Líder / Coordinador", "Relator / Portavoz", "Secretario / Organizador", "Investigador / Verificador"
  description: string;
  color: string; // 'indigo' | 'emerald' | 'amber' | 'purple' | 'sky' | 'rose' | 'teal' | 'orange'
  iconName?: string;
  isCustom?: boolean;
}

export interface WorkGroupMember {
  studentId: string;
  roleId?: string; // id of ABPRole
  notes?: string;
}

export interface WorkGroupTeam {
  id: string;
  name: string; // e.g. "Equipo 1 - Alfa", "Mesa 1: Proyecto Energías Limpias"
  color?: string;
  members: WorkGroupMember[];
  projectTitle?: string;
  observations?: string;
}

export interface WorkGroupSet {
  id: string;
  groupId: string; // Course/Group id (e.g. "grp-10a")
  subject?: string; // Subject (e.g. "Ciencias Naturales")
  period?: string; // Period (e.g. "Periodo 1")
  title: string; // e.g. "Proyecto ABP: Ecosistemas Sostenibles"
  description?: string;
  createdAt: string;
  updatedAt: string;
  teams: WorkGroupTeam[];
  customRoles?: ABPRole[];
}

// ==========================================
// SEATING CHARTS & CLASSROOM / LAB LAYOUTS
// ==========================================
export type SeatingChartType = 'classroom' | 'laboratory';

export interface ClassroomSeat {
  row: number; // 0-indexed row
  col: number; // 0-indexed col
  studentId?: string | null;
}

export interface ClassroomLayout {
  rows: number; // e.g. 5
  columns: number; // e.g. 6
  seats: ClassroomSeat[];
}

export interface LaboratoryTableSeat {
  tableIndex: number; // 0-indexed table
  seatIndex: number; // 0-indexed seat on that table
  studentId?: string | null;
}

export interface LaboratoryLayout {
  tableCount: number; // e.g. 6 mesas
  seatsPerTable: number; // e.g. 4 puestos por mesa
  tableNamePrefix?: string; // "Mesa", "Estación", "Módulo"
  seats: LaboratoryTableSeat[];
}

export interface GroupSeatingPlan {
  id: string;
  groupId: string;
  classroom: ClassroomLayout;
  laboratory: LaboratoryLayout;
  lastUpdated?: string;
}

// ==========================================
// DAILY CLASS DIARY / BITÁCORA PEDAGÓGICA
// ==========================================
export interface AttendanceDiarySummary {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount?: number;
}

export interface ClassDailyLog {
  id: string;
  groupId: string;
  teacherId: string;
  teacherName?: string;
  subject: string;
  date: string; // YYYY-MM-DD
  period: string; // e.g. "Periodo 1", "Periodo 2"
  topic: string; // Tema / DBA / Eje temático tratado
  objective?: string; // Objetivo de aprendizaje / Competencia
  activitiesDescription: string; // Desarrollo de la clase / Metodología
  tasksAssigned?: string; // Compromisos / Tareas / Taller dejado
  pedagogicalAgreements?: string; // Acuerdos de convivencia / Observaciones
  resourcesUsed?: string; // Recursos didácticos (Laboratorio, TICs, Guías, etc.)
  attendanceSummary?: AttendanceDiarySummary;
  attachments?: DriveFileAttachment[];
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// TEACHER CLASS SCHEDULE / HORARIO DOCENTE
// ==========================================
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface ScheduleTimeSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // e.g. "06:30", "07:00", "08:30"
  endTime: string; // e.g. "08:00", "08:30", "10:00"
  groupId: string;
  subject: string;
  teacherId: string; // Strictly associated to a single teacher
  teacherName?: string; // Display name of teacher for fast lookup & cross-checks
  classroomOrLab?: string; // e.g. "Aula 204", "Laboratorio de Ciencias", "Sala TIC"
  notes?: string;
  color?: string; // e.g. "indigo", "emerald", "amber", "purple", "sky", "teal", "rose"
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleConflict {
  type: 'group_overlap' | 'teacher_busy' | 'room_occupied';
  message: string;
  conflictingSlot: ScheduleTimeSlot;
}

export interface TeacherScheduleConfig {
  teacherId: string;
  timeSlots: ScheduleTimeSlot[];
  lastUpdated?: string;
}
