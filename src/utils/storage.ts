import { 
  Group, 
  Student, 
  AttendanceRecord, 
  Activity, 
  GradeRecord, 
  SchoolSettings, 
  NotificationLog, 
  SubjectConfig, 
  EvaluationCategory,
  Teacher,
  AuthUser,
  AttendanceNoveltyConfig,
  UniformNoveltyTag,
  ABPRole,
  WorkGroupSet,
  GroupSeatingPlan,
  ClassDailyLog,
  ScheduleTimeSlot,
  RemedialRecord
} from '../types';

const STORAGE_KEYS = {
  GROUPS: 'educontrol_groups_v1',
  STUDENTS: 'educontrol_students_v1',
  ATTENDANCE: 'educontrol_attendance_v1',
  ACTIVITIES: 'educontrol_activities_v1',
  GRADES: 'educontrol_grades_v1',
  SETTINGS: 'educontrol_settings_v1',
  NOTIFICATIONS: 'educontrol_notifications_v1',
  SUBJECT_CONFIGS: 'educontrol_subject_configs_v1',
  TEACHERS: 'educontrol_teachers_v1',
  AUTH_USER: 'educontrol_auth_user_v1',
  WORK_GROUPS: 'educontrol_work_groups_v1',
  SEATING_PLANS: 'educontrol_seating_plans_v1',
  ABP_ROLES: 'educontrol_abp_roles_v1',
  DAILY_LOGS: 'educontrol_daily_logs_v1',
  SCHEDULES: 'educontrol_schedules_v1',
  REMEDIALS: 'educontrol_remedials_v1',
};

export const DEFAULT_ATTENDANCE_NOVELTIES: AttendanceNoveltyConfig[] = [
  {
    id: 'present',
    code: 'P',
    name: 'Presente (Asistencia puntual)',
    shortName: 'Presente',
    category: 'presence',
    severity: 'low',
    color: 'emerald',
    iconName: 'CheckCircle2',
    description: 'Estudiante asistió puntualmente a la jornada escolar / clase.',
    requiresMinutes: false,
    requiresReason: false,
    isSystemDefault: true,
    isActive: true,
    customWhatsAppTemplate: '',
  },
  {
    id: 'late',
    code: 'R',
    name: 'Retardo (Llegada tarde)',
    shortName: 'Retardo',
    category: 'late',
    severity: 'medium',
    color: 'amber',
    iconName: 'Clock',
    description: 'Llegada con minutos de tardanza a la institución o al aula.',
    requiresMinutes: true,
    requiresReason: false,
    isSystemDefault: true,
    isActive: true,
    customWhatsAppTemplate: '',
  },
  {
    id: 'absent',
    code: 'I',
    name: 'Inasistencia Injustificada',
    shortName: 'Inasistente',
    category: 'absence',
    severity: 'high',
    color: 'rose',
    iconName: 'XCircle',
    description: 'Ausencia total a la jornada sin justificación médica o calamidad previa.',
    requiresMinutes: false,
    requiresReason: false,
    isSystemDefault: true,
    isActive: true,
    customWhatsAppTemplate: '',
  },
  {
    id: 'excused',
    code: 'J',
    name: 'Inasistencia Justificada',
    shortName: 'Justificado',
    category: 'excused',
    severity: 'neutral',
    color: 'sky',
    iconName: 'HelpCircle',
    description: 'Inasistencia con soporte médico, calamidad doméstica o permiso formal.',
    requiresMinutes: false,
    requiresReason: true,
    isSystemDefault: true,
    isActive: true,
    customWhatsAppTemplate: '',
  },
  {
    id: 'evasion',
    code: 'EV',
    name: 'Evasión de Clase / Abandono de Jornada',
    shortName: 'Evasión',
    category: 'incident',
    severity: 'high',
    color: 'orange',
    iconName: 'AlertTriangle',
    description: 'El estudiante ingresó a la institución pero no entró al aula o se fugó de clase/jornada.',
    requiresMinutes: false,
    requiresReason: true,
    isSystemDefault: false,
    isActive: true,
    customWhatsAppTemplate: `🚨 *ALERTA INSTITUCIONAL: EVASIÓN DE CLASE*
🏛️ *{colegio}*
👤 *Docente:* {docente}

👋 Estimado/a acudiente *{acudiente}*,
Le informamos con carácter *URGENTE* sobre la situación de su acudido(a) *{estudiante}* ({curso}):

⚠️ *Novedad registrada:* *EVASIÓN DE CLASE / ABANDONO DE JORNADA*
📅 *Fecha:* {fecha}
📝 *Detalle / Observación:* {observaciones_texto}

Solicitamos ponerse en contacto a la mayor brevedad con la coordinación o rectoría para atender este caso conforme al Manual de Convivencia.`,
  },
  {
    id: 'early_departure',
    code: 'RT',
    name: 'Retiro Temprano / Salida Anticipada',
    shortName: 'Retiro Temp.',
    category: 'departure',
    severity: 'medium',
    color: 'purple',
    iconName: 'LogOut',
    description: 'Salida del estudiante antes de terminar la jornada escolar con debida autorización.',
    requiresMinutes: false,
    requiresReason: true,
    isSystemDefault: false,
    isActive: true,
    customWhatsAppTemplate: `🚪 *NOTIFICACIÓN INSTITUCIONAL: RETIRO TEMPRANO*
🏛️ *{colegio}*
👤 *Docente:* {docente}

👋 Estimado/a acudiente *{acudiente}*,
Le confirmamos que su acudido(a) *{estudiante}* del grado *{curso}* ha registrado *RETIRO TEMPRANO* de la institución hoy {fecha}.

📋 *Motivo / Autorización:* {observaciones_texto}
👔 *Uniforme:* {uniforme_texto}

El registro ha quedado consignado formalmente en el sistema escolar.`,
  },
  {
    id: 'enfermeria',
    code: 'ENF',
    name: 'Atención en Enfermería / Salud',
    shortName: 'Enfermería',
    category: 'health',
    severity: 'medium',
    color: 'teal',
    iconName: 'Activity',
    description: 'Estudiante remitido al área de primeros auxilios / enfermería por molestia o salud.',
    requiresMinutes: false,
    requiresReason: true,
    isSystemDefault: false,
    isActive: true,
    customWhatsAppTemplate: `🩺 *REPORTE DE SALUD / ATENCIÓN EN ENFERMERÍA*
🏛️ *{colegio}*

👋 Estimado/a acudiente *{acudiente}*,
Le informamos que su acudido(a) *{estudiante}* ({curso}) presentó novedad de salud y fue atendido(a) en enfermería/coordinación hoy {fecha}.

📝 *Detalle / Síntomas reportados:* {observaciones_texto}
Agradecemos estar atentos a su estado de salud.`,
  },
  {
    id: 'permiso_especial',
    code: 'PE',
    name: 'Permiso Especial / Comisión Pedagógica',
    shortName: 'Permiso Esp.',
    category: 'excused',
    severity: 'neutral',
    color: 'indigo',
    iconName: 'FileText',
    description: 'Participación en actividad institucional, salida pedagógica o comisión deportiva/cultural.',
    requiresMinutes: false,
    requiresReason: true,
    isSystemDefault: false,
    isActive: true,
    customWhatsAppTemplate: `🎖️ *NOTIFICACIÓN: COMISIÓN / ACTIVIDAD INSTITUCIONAL*
🏛️ *{colegio}*

👋 Estimado/a acudiente *{acudiente}*,
Le informamos que su acudido(a) *{estudiante}* ({curso}) se encuentra participando en una actividad pedagógica o representación institucional autorizada hoy {fecha}.
Detalle: {observaciones_texto}`,
  },
];

export const DEFAULT_ABP_ROLES: ABPRole[] = [
  {
    id: 'role-lider',
    name: 'Líder / Coordinador',
    description: 'Modera debates, coordina las tareas, gestiona los tiempos del equipo y asegura que todos participen.',
    color: 'indigo',
    iconName: 'Crown',
    isCustom: false,
  },
  {
    id: 'role-relator',
    name: 'Relator / Portavoz',
    description: 'Comunica los avances ante la clase, redacta el informe o síntesis final y representa al equipo.',
    color: 'emerald',
    iconName: 'Mic',
    isCustom: false,
  },
  {
    id: 'role-secretario',
    name: 'Secretario / Organizador',
    description: 'Toma notas y acuerdos en la bitácora, consolida entregables y vigila el cumplimiento de rúbricas.',
    color: 'amber',
    iconName: 'FileText',
    isCustom: false,
  },
  {
    id: 'role-investigador',
    name: 'Investigador / Verificador',
    description: 'Busca fuentes confiables, contrasta datos, verifica la calidad de la información y resuelve dudas técnicas.',
    color: 'purple',
    iconName: 'Search',
    isCustom: false,
  },
  {
    id: 'role-materiales',
    name: 'Gestor de Materiales / Logística',
    description: 'Consigue los recursos, herramientas y materiales necesarios para las dinámicas y prototipos.',
    color: 'sky',
    iconName: 'Package',
    isCustom: false,
  },
  {
    id: 'role-disenador',
    name: 'Diseñador / Creativo',
    description: 'Estructura la presentación visual, diapositivas, infografías, maquetas o recursos multimedia.',
    color: 'rose',
    iconName: 'Palette',
    isCustom: false,
  },
];

export const INITIAL_WORK_GROUPS: WorkGroupSet[] = [
  {
    id: 'wg-set-10a-abp1',
    groupId: 'grp-10a',
    subject: 'Ciencias Naturales',
    period: 'Periodo 1',
    title: 'Proyecto ABP: Sostenibilidad y Energías Renovables',
    description: 'Investigación y diseño de un prototipo de energía solar comunitaria para la institución.',
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-02-18T10:30:00.000Z',
    teams: [
      {
        id: 'team-1',
        name: 'Equipo 1: Los Innovadores Solares',
        color: 'indigo',
        projectTitle: 'Diseño de Paneles Fotovoltaicos Escolares',
        members: [
          { studentId: 'std-101', roleId: 'role-lider' },
          { studentId: 'std-102', roleId: 'role-relator' },
          { studentId: 'std-103', roleId: 'role-investigador' },
        ],
      },
      {
        id: 'team-2',
        name: 'Equipo 2: Eco-Ingenieros',
        color: 'emerald',
        projectTitle: 'Aprovechamiento de Residuos Orgánicos y Biogás',
        members: [
          { studentId: 'std-104', roleId: 'role-lider' },
          { studentId: 'std-105', roleId: 'role-secretario' },
          { studentId: 'std-106', roleId: 'role-materiales' },
        ],
      },
    ],
  },
];

export const INITIAL_SEATING_PLANS: GroupSeatingPlan[] = [
  {
    id: 'seat-plan-10a',
    groupId: 'grp-10a',
    classroom: {
      rows: 5,
      columns: 6,
      seats: [
        { row: 0, col: 0, studentId: 'std-101' },
        { row: 0, col: 1, studentId: 'std-102' },
        { row: 0, col: 2, studentId: 'std-103' },
        { row: 1, col: 0, studentId: 'std-104' },
        { row: 1, col: 1, studentId: 'std-105' },
        { row: 1, col: 2, studentId: 'std-106' },
      ],
    },
    laboratory: {
      tableCount: 6,
      seatsPerTable: 4,
      tableNamePrefix: 'Mesa de Laboratorio',
      seats: [
        { tableIndex: 0, seatIndex: 0, studentId: 'std-101' },
        { tableIndex: 0, seatIndex: 1, studentId: 'std-102' },
        { tableIndex: 0, seatIndex: 2, studentId: 'std-103' },
        { tableIndex: 1, seatIndex: 0, studentId: 'std-104' },
        { tableIndex: 1, seatIndex: 1, studentId: 'std-105' },
        { tableIndex: 1, seatIndex: 2, studentId: 'std-106' },
      ],
    },
    lastUpdated: '2026-02-19T09:00:00.000Z',
  },
];

export const DEFAULT_UNIFORM_TAGS: UniformNoveltyTag[] = [
  { id: 'tag-1', name: 'Sin corbata', isActive: true },
  { id: 'tag-2', name: 'Zapatos no reglamentarios', isActive: true },
  { id: 'tag-3', name: 'Sin chaqueta institucional', isActive: true },
  { id: 'tag-4', name: 'Camisa por fuera', isActive: true },
  { id: 'tag-5', name: 'Ropa de calle particular', isActive: true },
  { id: 'tag-6', name: 'Sin distintivo / escudo', isActive: true },
  { id: 'tag-7', name: 'Falda / Pantalón no reglamentario', isActive: true },
  { id: 'tag-8', name: 'Accesorios / Piercing no permitidos', isActive: true },
];

export const DEFAULT_EVALUATION_CATEGORIES: EvaluationCategory[] = [
  {
    id: 'cat-hetero',
    name: 'Heteroevaluación (Docente)',
    code: 'HET',
    weightPercentage: 50,
    description: 'Talleres individuales y en clase, quices temáticos, tareas y sustentaciones evaluadas por el docente.',
    color: 'indigo',
  },
  {
    id: 'cat-coeval',
    name: 'Coevaluación (Pares)',
    code: 'COE',
    weightPercentage: 15,
    description: 'Valoración entre compañeros, trabajo colaborativo en equipo y sustentaciones grupales.',
    color: 'teal',
  },
  {
    id: 'cat-auto',
    name: 'Autoevaluación (Estudiante)',
    code: 'AUT',
    weightPercentage: 10,
    description: 'Reflexión individual del estudiante sobre su compromiso, puntualidad y cumplimiento.',
    color: 'amber',
  },
  {
    id: 'cat-examen',
    name: 'Examen Final de Periodo',
    code: 'EXF',
    weightPercentage: 25,
    description: 'Evaluación acumulativa o proyecto integrador de cierre de periodo académico.',
    color: 'rose',
  },
];

export interface EvaluationPresetTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  categories: EvaluationCategory[];
}

export const EVALUATION_PRESET_TEMPLATES: EvaluationPresetTemplate[] = [
  {
    id: 'tmpl-integral',
    name: 'Formación Integral (Hetero / Coev / Auto / Examen)',
    badge: 'Recomendada',
    description: 'Ponderación formativa completa: Heteroevaluación (50%), Coevaluación (15%), Autoevaluación (10%) y Examen Final (25%).',
    categories: [
      {
        id: 'cat-hetero',
        name: 'Heteroevaluación',
        code: 'HET',
        weightPercentage: 50,
        description: 'Talleres, quices, tareas y actividades evaluadas directamente por el docente.',
        color: 'indigo',
      },
      {
        id: 'cat-coeval',
        name: 'Coevaluación',
        code: 'COE',
        weightPercentage: 15,
        description: 'Valoración formativa entre pares y desempeño en equipo.',
        color: 'teal',
      },
      {
        id: 'cat-auto',
        name: 'Autoevaluación',
        code: 'AUT',
        weightPercentage: 10,
        description: 'Autovaloración y reflexión del estudiante sobre su proceso.',
        color: 'amber',
      },
      {
        id: 'cat-examen',
        name: 'Examen Final',
        code: 'EXF',
        weightPercentage: 25,
        description: 'Evaluación sumativa de periodo o prueba acumulativa.',
        color: 'rose',
      },
    ],
  },
  {
    id: 'tmpl-siee',
    name: 'Modelo Tradicional SIEE / MEN (SABER, HACER, SER)',
    badge: 'Estándar MEN',
    description: 'Componente Cognitivo (40%), Procedimental (40%) y Actitudinal (20%).',
    categories: [
      {
        id: 'cat-saber',
        name: 'SABER (Cognitivo)',
        code: 'SAB',
        weightPercentage: 40,
        description: 'Evaluaciones escritas, quices, sustentaciones y exámenes parciales/finales.',
        color: 'indigo',
      },
      {
        id: 'cat-hacer',
        name: 'HACER (Procedimental)',
        code: 'HAC',
        weightPercentage: 40,
        description: 'Talleres en clase, tareas, proyectos de aula, guías de trabajo y laboratorios.',
        color: 'teal',
      },
      {
        id: 'cat-ser',
        name: 'SER (Actitudinal)',
        code: 'SER',
        weightPercentage: 20,
        description: 'Puntualidad, asistencia, porte de uniforme, participación activa y convivencia.',
        color: 'amber',
      },
    ],
  },
  {
    id: 'tmpl-continua',
    name: 'Evaluación Continua por Instrumentos',
    badge: 'Procesual',
    description: 'Talleres (30%), Quices (25%), Proyecto/Práctica (20%), Examen (15%), Auto & Coev (10%).',
    categories: [
      {
        id: 'cat-talleres',
        name: 'Talleres y Guías de Clase',
        code: 'TAL',
        weightPercentage: 30,
        description: 'Guías de aprendizaje, talleres individuales y ejercicios prácticos en clase.',
        color: 'indigo',
      },
      {
        id: 'cat-quices',
        name: 'Quices y Pruebas Cortas',
        code: 'QZ',
        weightPercentage: 25,
        description: 'Controles de lectura, pruebas cortas diagnósticas y quices temáticos.',
        color: 'purple',
      },
      {
        id: 'cat-proyecto',
        name: 'Proyecto / Laboratorio',
        code: 'PRY',
        weightPercentage: 20,
        description: 'Proyecto de investigación, prácticas de laboratorio o producto final.',
        color: 'teal',
      },
      {
        id: 'cat-examen-p',
        name: 'Prueba Acumulativa',
        code: 'EXM',
        weightPercentage: 15,
        description: 'Examen bimestral o trimestral institucional.',
        color: 'rose',
      },
      {
        id: 'cat-auto-coev',
        name: 'Autoevaluación & Coevaluación',
        code: 'A&C',
        weightPercentage: 10,
        description: 'Valoración personal y coevaluación del compromiso escolar.',
        color: 'amber',
      },
    ],
  },
  {
    id: 'tmpl-media-uni',
    name: 'Cortes Parciales (Educación Media / Superior)',
    badge: '3 Cortes',
    description: 'Seguimiento Continuo (40%), Parcial Intermedio (30%), Examen Final (30%).',
    categories: [
      {
        id: 'cat-seguimiento',
        name: 'Seguimiento y Talleres (Corte 1)',
        code: 'SEG',
        weightPercentage: 40,
        description: 'Actividades continuas, talleres y participación en clase.',
        color: 'indigo',
      },
      {
        id: 'cat-parcial',
        name: 'Examen Parcial (Corte 2)',
        code: 'PAR',
        weightPercentage: 30,
        description: 'Evaluación intermedia de mitad de periodo.',
        color: 'teal',
      },
      {
        id: 'cat-final',
        name: 'Examen Final / Proyecto (Corte 3)',
        code: 'FIN',
        weightPercentage: 30,
        description: 'Evaluación sumativa final o proyecto integrador de fin de periodo.',
        color: 'rose',
      },
    ],
  },
];

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tch-1',
    name: 'Prof. Carlos Mendoza',
    email: 'carlos.mendoza@colegio.edu.co',
    documentId: '80123456',
    phone: '3158901234',
    specialty: 'Licenciado en Matemáticas y Física',
    assignedGroupIds: ['grp-10a', 'grp-9b', 'grp-11a'],
    assignedSubjects: ['Matemáticas', 'Física', 'Cálculo'],
    role: 'teacher',
    status: 'active',
    password: 'docente123',
    avatarColor: 'bg-indigo-600',
    createdAt: '2026-01-10',
  },
  {
    id: 'tch-2',
    name: 'Prof. Sandra Gómez',
    email: 'sandra.gomez@colegio.edu.co',
    documentId: '52987654',
    phone: '3207654321',
    specialty: 'Bióloga y Docente de Ciencias Naturales',
    assignedGroupIds: ['grp-9b', 'grp-10a'],
    assignedSubjects: ['Biología', 'Química', 'Ciencias Naturales'],
    role: 'teacher',
    status: 'active',
    password: 'docente123',
    avatarColor: 'bg-emerald-600',
    createdAt: '2026-01-10',
  },
  {
    id: 'tch-3',
    name: 'Prof. Patricia Morales',
    email: 'patricia.morales@colegio.edu.co',
    documentId: '51876543',
    phone: '3114567890',
    specialty: 'Licenciada en Humanidades y Lengua Castellana',
    assignedGroupIds: ['grp-11a', 'grp-10a'],
    assignedSubjects: ['Lengua Castellana', 'Lectura Crítica', 'Inglés'],
    role: 'teacher',
    status: 'active',
    password: 'docente123',
    avatarColor: 'bg-amber-600',
    createdAt: '2026-01-10',
  },
  {
    id: 'tch-4',
    name: 'Prof. Mauricio Velásquez',
    email: 'mauricio.velasquez@colegio.edu.co',
    documentId: '79654321',
    phone: '3187654321',
    specialty: 'Filósofo e Historiador - Ciencias Sociales',
    assignedGroupIds: ['grp-10a', 'grp-9b'],
    assignedSubjects: ['Ciencias Sociales', 'Filosofía'],
    role: 'teacher',
    status: 'active',
    password: 'docente123',
    avatarColor: 'bg-teal-600',
    createdAt: '2026-01-15',
  },
  {
    id: 'tch-5',
    name: 'Prof. Alejandro Restrepo',
    email: 'alejandro.restrepo@colegio.edu.co',
    documentId: '80912345',
    phone: '3128905678',
    specialty: 'Ingeniero en Sistemas y Robótica Educativa',
    assignedGroupIds: ['grp-10a', 'grp-11a', 'grp-9b'],
    assignedSubjects: ['Tecnología e Informática', 'Robótica'],
    role: 'teacher',
    status: 'active',
    password: 'docente123',
    avatarColor: 'bg-cyan-600',
    createdAt: '2026-02-01',
  },
];

export const DEFAULT_INSTITUTION_SUBJECTS: string[] = [
  'Matemáticas',
  'Lengua Castellana',
  'Ciencias Naturales',
  'Biología',
  'Química',
  'Física',
  'Ciencias Sociales',
  'Historia y Geografía',
  'Filosofía',
  'Inglés',
  'Educación Física, Recreación y Deportes',
  'Educación Artística y Cultural',
  'Tecnología e Informática',
  'Ética y Valores Humanos',
  'Educación Religiosa',
  'Cálculo',
  'Lectura Crítica',
  'Ciencias Políticas y Económicas',
  'Emprendimiento',
];

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'Institución Educativa Los Libertadores',
  teacherName: 'Prof. Carlos Mendoza',
  defaultCountryCode: '+57',
  gradingScale: '1-5',
  minPassingScore: 3.5,
  passingScore: 3.5,
  currentPeriod: 'Periodo 1',
  schoolYear: '2026',
  adminPassword: 'admin123',
  adminRecoveryEmail: 'rectoria@colegio.edu.co',
  autoOpenWhatsApp: false,
  instantWhatsAppOnAttendance: false,
  institutionSubjects: DEFAULT_INSTITUTION_SUBJECTS,
  dbConfig: {
    provider: 'local',
    connected: true,
    autoSync: true,
    lastSyncTimestamp: new Date().toISOString(),
  },
  attendanceTemplate: `👋 Estimado/a {acudiente}, le informamos desde {colegio} que su acudido(a) *{estudiante}* del curso *{curso}* se encuentra *{estado_asistencia}* en la jornada de hoy {fecha}.
Uniforme: {uniforme_texto}
{observaciones_texto}
🌐 Consulta en línea: {url_portal}
¡Agradecemos su compromiso con la formación escolar!`,
  lateTemplate: `⏰ Estimado/a {acudiente}, le informamos que su acudido(a) *{estudiante}* ({curso}) llegó con *RETARDO* hoy {fecha} ({minutos_retardo} minutos de tardanza).
Uniforme: {uniforme_texto}
{observaciones_texto}
🌐 Consulta en línea: {url_portal}
Por favor recordarle la importancia de la puntualidad.`,
  absentTemplate: `⚠️ ATENCIÓN: Estimado/a {acudiente}, le comunicamos que el/la estudiante *{estudiante}* del grado *{curso}* registra *INASISTENCIA* hoy {fecha}.
Si cuenta con justificación médica o calamidad, favor remitir el soporte formal a la institución.
{observaciones_texto}
🌐 Consulta en línea: {url_portal}`,
  uniformTemplate: `👔 Estimado/a {acudiente}, le informamos que hoy {fecha} el/la estudiante *{estudiante}* ({curso}) presentó novedad con el porte de su uniforme: *{uniforme_texto}*.
Observación: {observaciones_texto}
🌐 Consulta en línea: {url_portal}
Agradecemos verificar el cumplimiento del manual de convivencia.`,
  gradeTemplate: `📊 *Reporte de Calificación - {colegio}*
Estimado/a {acudiente}, se ha registrado la nota de la actividad *"{actividad}"* ({materia}) para *{estudiante}* ({curso}):
• *Nota obtenida:* {nota} / {nota_maxima}
• *Entrega a tiempo:* {entrega_tiempo}
• *Comentario del docente:* {comentario}
Fecha: {fecha}
🌐 Consulta en línea: {url_portal}`,
  dailyDigestTemplate: `📋 *Resumen de Novedades del Día - {colegio}*
Fecha: {fecha} | Grupo: {curso}
Estudiante: *{estudiante}*
• Estado de asistencia: *{estado_asistencia}*
• Porte de uniforme: {uniforme_texto}
• Observaciones generales: {observaciones_texto}
🌐 Consulta en línea: {url_portal}`,
  attendanceNovelties: DEFAULT_ATTENDANCE_NOVELTIES,
  uniformTags: DEFAULT_UNIFORM_TAGS,
};

const INITIAL_GROUPS: Group[] = [
  {
    id: 'grp-10a',
    name: 'Grado 10° A',
    grade: '10°',
    section: 'A',
    schoolYear: '2026',
    shift: 'Mañana',
    directorName: 'Carlos Mendoza',
    room: 'Aula 204',
    subjects: ['Matemáticas', 'Física', 'Lengua Castellana', 'Inglés', 'Filosofía'],
    createdAt: '2026-01-15',
  },
  {
    id: 'grp-9b',
    name: 'Grado 9° B',
    grade: '9°',
    section: 'B',
    schoolYear: '2026',
    shift: 'Mañana',
    directorName: 'Sandra Gómez',
    room: 'Aula 102',
    subjects: ['Matemáticas', 'Biología', 'Ciencias Sociales', 'Inglés', 'Química'],
    createdAt: '2026-01-15',
  },
  {
    id: 'grp-11a',
    name: 'Grado 11° A',
    grade: '11°',
    section: 'A',
    schoolYear: '2026',
    shift: 'Mañana',
    directorName: 'Patricia Morales',
    room: 'Aula 301',
    subjects: ['Cálculo', 'Física II', 'Química Orgánica', 'Lectura Crítica'],
    createdAt: '2026-01-15',
  },
];

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-101',
    documentId: '1098234501',
    firstName: 'Alejandro',
    lastName: 'Ramírez Silva',
    groupId: 'grp-10a',
    guardianName: 'Marta Silva',
    guardianPhone: '3158901234',
    guardianCountryCode: '+57',
    guardianEmail: 'marta.silva@example.com',
    guardianRelationship: 'Madre',
    status: 'active',
    observations: 'Excelente participación en clase',
    avatarColor: 'bg-indigo-500',
    gender: 'M',
  },
  {
    id: 'std-102',
    documentId: '1098234502',
    firstName: 'Valeria',
    lastName: 'Gómez Castro',
    groupId: 'grp-10a',
    guardianName: 'Roberto Gómez',
    guardianPhone: '3207654321',
    guardianCountryCode: '+57',
    guardianEmail: 'roberto.gomez@example.com',
    guardianRelationship: 'Padre',
    status: 'active',
    observations: 'Líder del comité de convivencia',
    avatarColor: 'bg-emerald-500',
    gender: 'F',
  },
  {
    id: 'std-103',
    documentId: '1098234503',
    firstName: 'Santiago',
    lastName: 'Herrera Morales',
    groupId: 'grp-10a',
    guardianName: 'Claudia Morales',
    guardianPhone: '3104567890',
    guardianCountryCode: '+57',
    guardianEmail: 'claudia.morales@example.com',
    guardianRelationship: 'Madre',
    status: 'active',
    observations: 'Requiere seguimiento en puntualidad',
    avatarColor: 'bg-amber-500',
    gender: 'M',
  },
  {
    id: 'std-104',
    documentId: '1098234504',
    firstName: 'Mariana',
    lastName: 'Torres López',
    groupId: 'grp-10a',
    guardianName: 'Fernando Torres',
    guardianPhone: '3189876543',
    guardianCountryCode: '+57',
    guardianEmail: 'fernando.torres@example.com',
    guardianRelationship: 'Padre',
    status: 'active',
    observations: 'Atenta y destacada en proyectos',
    avatarColor: 'bg-rose-500',
    gender: 'F',
  },
  {
    id: 'std-105',
    documentId: '1098234505',
    firstName: 'Juan David',
    lastName: 'Pérez Vargas',
    groupId: 'grp-10a',
    guardianName: 'Luz Vargas',
    guardianPhone: '3123456789',
    guardianCountryCode: '+57',
    guardianEmail: 'luz.vargas@example.com',
    guardianRelationship: 'Madre',
    status: 'active',
    observations: 'Presenta excusa médica previa por asma',
    avatarColor: 'bg-sky-500',
    gender: 'M',
  },
  {
    id: 'std-106',
    documentId: '1098234506',
    firstName: 'Camila',
    lastName: 'Ortiz Restrepo',
    groupId: 'grp-10a',
    guardianName: 'Elena Restrepo',
    guardianPhone: '3116549870',
    guardianCountryCode: '+57',
    guardianEmail: 'elena.restrepo@example.com',
    guardianRelationship: 'Madre',
    status: 'active',
    observations: 'Sin observaciones',
    avatarColor: 'bg-purple-500',
    gender: 'F',
  },
  {
    id: 'std-201',
    documentId: '1098234601',
    firstName: 'Mateo',
    lastName: 'Suárez Rincón',
    groupId: 'grp-9b',
    guardianName: 'Diana Rincón',
    guardianPhone: '3178901245',
    guardianCountryCode: '+57',
    guardianEmail: 'diana.rincon@example.com',
    guardianRelationship: 'Madre',
    status: 'active',
    observations: 'Buena disposición para el trabajo en equipo',
    avatarColor: 'bg-teal-500',
    gender: 'M',
  },
  {
    id: 'std-202',
    documentId: '1098234602',
    firstName: 'Sofía',
    lastName: 'Navarro Duque',
    groupId: 'grp-9b',
    guardianName: 'Jorge Navarro',
    guardianPhone: '3167894561',
    guardianCountryCode: '+57',
    guardianEmail: 'jorge.navarro@example.com',
    guardianRelationship: 'Padre',
    status: 'active',
    observations: 'Participa activamente en clase',
    avatarColor: 'bg-fuchsia-500',
    gender: 'F',
  },
];

const getTodayString = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: getTodayString(),
    groupId: 'grp-10a',
    studentId: 'std-101',
    status: 'present',
    uniformStatus: 'complete',
    observations: 'Puntual y atento',
    notifiedWhatsApp: true,
    notifiedAt: new Date().toISOString(),
  },
  {
    id: 'att-2',
    date: getTodayString(),
    groupId: 'grp-10a',
    studentId: 'std-102',
    status: 'present',
    uniformStatus: 'complete',
    observations: '',
    notifiedWhatsApp: false,
  },
  {
    id: 'att-3',
    date: getTodayString(),
    groupId: 'grp-10a',
    studentId: 'std-103',
    status: 'late',
    lateMinutes: 15,
    uniformStatus: 'incomplete',
    uniformNotes: 'Sin corbata institucional',
    observations: 'Llegó 15 minutos tarde por congestión vehicular',
    notifiedWhatsApp: false,
  },
  {
    id: 'att-4',
    date: getTodayString(),
    groupId: 'grp-10a',
    studentId: 'std-104',
    status: 'absent',
    uniformStatus: 'none',
    observations: 'Sin aviso previo de inasistencia',
    notifiedWhatsApp: false,
  },
  {
    id: 'att-5',
    date: getTodayString(),
    groupId: 'grp-10a',
    studentId: 'std-105',
    status: 'excused',
    excuseReason: 'Cita médica odontológica programada con certificado',
    uniformStatus: 'complete',
    observations: 'Presentó certificado médico formal',
    notifiedWhatsApp: true,
    notifiedAt: new Date().toISOString(),
  },
  {
    id: 'att-6',
    date: getTodayString(),
    groupId: 'grp-10a',
    studentId: 'std-106',
    status: 'present',
    uniformStatus: 'complete',
    observations: '',
    notifiedWhatsApp: false,
  },
];

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    groupId: 'grp-10a',
    subject: 'Matemáticas',
    title: 'Taller de Funciones Trigonométricas y Teorema de Seno',
    description: 'Ejercicios prácticos del libro págs 45-48 y resolución de triángulos oblicuángulos.',
    assignedDate: '2026-02-10',
    dueDate: '2026-02-18',
    maxScore: 5.0,
    passingScore: 3.5,
    weightPercentage: 25,
    type: 'taller',
    period: 'Periodo 1',
  },
  {
    id: 'act-2',
    groupId: 'grp-10a',
    subject: 'Matemáticas',
    title: 'Evaluación Parcial: Identidades Trigonométricas',
    description: 'Examen escrito individual con 5 problemas de demostración.',
    assignedDate: '2026-02-15',
    dueDate: '2026-02-20',
    maxScore: 5.0,
    passingScore: 3.5,
    weightPercentage: 35,
    type: 'evaluacion',
    period: 'Periodo 1',
  },
  {
    id: 'act-3',
    groupId: 'grp-10a',
    subject: 'Física',
    title: 'Laboratorio: Movimiento Rectilíneo Uniformemente Variado',
    description: 'Informe de laboratorio con gráficas de posición vs tiempo.',
    assignedDate: '2026-02-05',
    dueDate: '2026-02-12',
    maxScore: 5.0,
    passingScore: 3.5,
    weightPercentage: 20,
    type: 'proyecto',
    period: 'Periodo 1',
  },
];

const INITIAL_GRADES: GradeRecord[] = [
  {
    id: 'grd-1',
    activityId: 'act-1',
    studentId: 'std-101',
    score: 4.8,
    deliveredOnTime: 'yes',
    comments: 'Excelente desarrollo paso a paso y gráficas limpias.',
    feedbackDate: '2026-02-19',
    notifiedWhatsApp: true,
    notifiedAt: '2026-02-19T10:30:00Z',
  },
  {
    id: 'grd-2',
    activityId: 'act-1',
    studentId: 'std-102',
    score: 4.5,
    deliveredOnTime: 'yes',
    comments: 'Muy buen trabajo, corregir el punto 4 de identidades.',
    feedbackDate: '2026-02-19',
    notifiedWhatsApp: false,
  },
  {
    id: 'grd-3',
    activityId: 'act-1',
    studentId: 'std-103',
    score: 3.2,
    deliveredOnTime: 'late',
    comments: 'Entregó 1 día tarde. Debe profundizar en el teorema de coseno.',
    feedbackDate: '2026-02-19',
    notifiedWhatsApp: false,
  },
  {
    id: 'grd-4',
    activityId: 'act-1',
    studentId: 'std-104',
    score: 4.9,
    deliveredOnTime: 'yes',
    comments: 'Impecable sustentación y rigor matemático.',
    feedbackDate: '2026-02-19',
    notifiedWhatsApp: true,
    notifiedAt: '2026-02-19T10:35:00Z',
  },
  {
    id: 'grd-5',
    activityId: 'act-1',
    studentId: 'std-105',
    score: 3.8,
    deliveredOnTime: 'yes',
    comments: 'Buen intento, se recibieron dudas aclaradas en asesoría.',
    feedbackDate: '2026-02-19',
    notifiedWhatsApp: false,
  },
  {
    id: 'grd-6',
    activityId: 'act-1',
    studentId: 'std-106',
    score: 2.8,
    deliveredOnTime: 'no',
    comments: 'Taller incompleto, faltaron los ejercicios de aplicación práctica.',
    feedbackDate: '2026-02-19',
    notifiedWhatsApp: false,
  },
];

const INITIAL_SUBJECT_CONFIGS: SubjectConfig[] = [
  {
    id: 'subcfg-10a-mat',
    groupId: 'grp-10a',
    subjectName: 'Matemáticas',
    categories: DEFAULT_EVALUATION_CATEGORIES,
  },
  {
    id: 'subcfg-10a-fis',
    groupId: 'grp-10a',
    subjectName: 'Física',
    categories: DEFAULT_EVALUATION_CATEGORIES,
  },
  {
    id: 'subcfg-10a-len',
    groupId: 'grp-10a',
    subjectName: 'Lengua Castellana',
    categories: DEFAULT_EVALUATION_CATEGORIES,
  },
];

export const INITIAL_DAILY_LOGS: ClassDailyLog[] = [
  // --- Prof. Carlos Mendoza (tch-1) - Matemáticas y Física ---
  {
    id: 'log-1',
    groupId: 'grp-10a',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    subject: 'Matemáticas',
    date: '2026-02-18',
    period: 'Periodo 1',
    topic: 'Funciones Cuadráticas y Gráficas Parabólicas',
    objective: 'Identificar el vértice, eje de simetría y puntos de corte de una función cuadrática en el plano cartesiano.',
    activitiesDescription: '1. Repaso de saberes previos sobre ecuaciones de segundo grado.\n2. Explicación magistral del modelo f(x) = ax² + bx + c y cálculo del vértice.\n3. Resolución guiada de 3 ejercicios en el tablero con participación activa.\n4. Trabajo en parejas resolviendo situaciones problémicas del texto guía.',
    tasksAssigned: 'Terminar ejercicios 5 al 10 de la página 45 del módulo de álgebra para la próxima clase.',
    pedagogicalAgreements: 'Se acordó traer calculadora científica y regla para la sesión de laboratorio geométrico del viernes.',
    resourcesUsed: 'Pizarrón, Calculadoras científicas, Guía de trabajo impresa #2',
    attendanceSummary: {
      totalStudents: 6,
      presentCount: 5,
      absentCount: 1,
      lateCount: 0,
    },
    createdAt: '2026-02-18T10:30:00Z',
    updatedAt: '2026-02-18T10:30:00Z',
  },
  {
    id: 'log-2',
    groupId: 'grp-10a',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    subject: 'Física',
    date: '2026-02-19',
    period: 'Periodo 1',
    topic: 'Cinemática: Movimiento Rectilíneo Uniformemente Variado (MRUV)',
    objective: 'Aplicar las ecuaciones del MRUV para calcular aceleración y distancia recorrida.',
    activitiesDescription: '1. Introducción al concepto de aceleración constante con video demostrativo.\n2. Deducción de las 4 fórmulas fundamentales del movimiento acelerado.\n3. Simulación virtual de carritos en plano inclinado con cronómetro digital.\n4. Retroalimentación grupal de errores comunes en despeje de variables.',
    tasksAssigned: 'Elaborar el pre-informe de laboratorio sobre caída libre para entregar en hojas examen.',
    pedagogicalAgreements: 'Excelente atención y participación durante la simulación interactiva.',
    resourcesUsed: 'Proyector multimedia, simulador PhET Interactive Simulations, Texto guía',
    attendanceSummary: {
      totalStudents: 6,
      presentCount: 5,
      absentCount: 1,
      lateCount: 1,
    },
    createdAt: '2026-02-19T11:45:00Z',
    updatedAt: '2026-02-19T11:45:00Z',
  },
  {
    id: 'log-3',
    groupId: 'grp-9b',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    subject: 'Matemáticas',
    date: '2026-02-20',
    period: 'Periodo 1',
    topic: 'Factorización de Trinomios Cuadrados Perfectos',
    objective: 'Reconocer y factorizar trinomios cuadrados perfectos y trinomios de la forma x² + bx + c.',
    activitiesDescription: '1. Actividad de calentamiento con cálculo mental.\n2. Explicación de la regla del doble producto para verificar si es TCP.\n3. Taller práctico grupal con roles ABP en mesas de trabajo.\n4. Evaluación formativa rápida de 2 preguntas al cierre de la sesión.',
    tasksAssigned: 'Resolver los ejercicios impares del taller #3 en el cuaderno.',
    pedagogicalAgreements: 'Los relatores de cada equipo expusieron su procedimiento en el tablero.',
    resourcesUsed: 'Fichas algebraicas de colores, Cuaderno de trabajo',
    attendanceSummary: {
      totalStudents: 5,
      presentCount: 5,
      absentCount: 0,
      lateCount: 0,
    },
    createdAt: '2026-02-20T09:15:00Z',
    updatedAt: '2026-02-20T09:15:00Z',
  },

  // --- Prof. Sandra Gómez (tch-2) - Biología y Química ---
  {
    id: 'log-sandra-1',
    groupId: 'grp-10a',
    teacherId: 'tch-2',
    teacherName: 'Prof. Sandra Gómez',
    subject: 'Química',
    date: '2026-02-18',
    period: 'Periodo 1',
    topic: 'Estructura Atómica y Enlace Químico Covalente',
    objective: 'Diferenciar entre enlaces iónicos y covalentes mediante la regla del octeto.',
    activitiesDescription: '1. Pregunta orientadora: ¿Por qué el agua conduce electricidad con sal pero no con azúcar?\n2. Estructuras de Lewis en el pizarrón.\n3. Demostración experimental en laboratorio con solución salina y sacarosa.\n4. Conclusiones individuales en el cuaderno.',
    tasksAssigned: 'Completar los diagramas de Lewis para 5 compuestos inorgánicos.',
    pedagogicalAgreements: 'Uso obligatorio de gafas de seguridad y bata en el laboratorio.',
    resourcesUsed: 'Laboratorio de Química, Reactivos, Guía de laboratorio #1',
    attendanceSummary: {
      totalStudents: 6,
      presentCount: 6,
      absentCount: 0,
      lateCount: 0,
    },
    createdAt: '2026-02-18T14:00:00Z',
    updatedAt: '2026-02-18T14:00:00Z',
  },
  {
    id: 'log-sandra-2',
    groupId: 'grp-9b',
    teacherId: 'tch-2',
    teacherName: 'Prof. Sandra Gómez',
    subject: 'Biología',
    date: '2026-02-19',
    period: 'Periodo 1',
    topic: 'Genética Mendeliana: Primera y Segunda Ley de Mendel',
    objective: 'Predecir proporciones fenotípicas y genotípicas mediante cuadros de Punnett.',
    activitiesDescription: '1. Introducción histórica sobre Gregor Mendel y el cultivo de guisantes.\n2. Explicación de alelos dominantes y recesivos.\n3. Taller en parejas resolviendo cruces monohíbridos.\n4. Socialización colectiva.',
    tasksAssigned: 'Resolver 3 problemas de cruces genéticos del módulo didáctico.',
    pedagogicalAgreements: 'Participación activa y respeto por los turnos de palabra.',
    resourcesUsed: 'Pizarrón, Cuaderno de trabajo, Láminas didácticas de genética',
    attendanceSummary: {
      totalStudents: 5,
      presentCount: 5,
      absentCount: 0,
      lateCount: 0,
    },
    createdAt: '2026-02-19T08:30:00Z',
    updatedAt: '2026-02-19T08:30:00Z',
  },

  // --- Prof. Patricia Morales (tch-3) - Lengua Castellana e Inglés ---
  {
    id: 'log-patricia-1',
    groupId: 'grp-11a',
    teacherId: 'tch-3',
    teacherName: 'Prof. Patricia Morales',
    subject: 'Lengua Castellana',
    date: '2026-02-18',
    period: 'Periodo 1',
    topic: 'El Ensayo Argumentativo: Tesis, Argumentos y Contraargumentos',
    objective: 'Construir una postura crítica frente a problemáticas contemporáneas mediante la estructura del ensayo.',
    activitiesDescription: '1. Análisis de un editorial de prensa contemporáneo.\n2. Identificación de falacias argumentativas y tipos de argumentos.\n3. Taller de redacción del párrafo introductorio con tesis explícita.\n4. Co-evaluación entre pares con rúbrica estandarizada.',
    tasksAssigned: 'Escribir el primer borrador del ensayo (mínimo 500 palabras) para revisión.',
    pedagogicalAgreements: 'Puntualidad en la entrega del borrador y citación bajo normas APA.',
    resourcesUsed: 'Fotocopias de editoriales, Rúbrica de redacción impresa, Cuaderno',
    attendanceSummary: {
      totalStudents: 7,
      presentCount: 7,
      absentCount: 0,
      lateCount: 0,
    },
    createdAt: '2026-02-18T07:30:00Z',
    updatedAt: '2026-02-18T07:30:00Z',
  },
];

export const INITIAL_SCHEDULE_SLOTS: ScheduleTimeSlot[] = [
  // --- Prof. Carlos Mendoza (tch-1) - Matemáticas y Física ---
  {
    id: 'slot-1',
    day: 'monday',
    startTime: '07:00',
    endTime: '08:30',
    groupId: 'grp-10a',
    subject: 'Matemáticas',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Aula 201',
    notes: 'Teoría y resolución de ejercicios',
    color: 'indigo',
  },
  {
    id: 'slot-2',
    day: 'monday',
    startTime: '08:30',
    endTime: '10:00',
    groupId: 'grp-9b',
    subject: 'Matemáticas',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Aula 105',
    notes: 'Taller práctico de álgebra',
    color: 'sky',
  },
  {
    id: 'slot-3',
    day: 'tuesday',
    startTime: '07:00',
    endTime: '08:30',
    groupId: 'grp-10a',
    subject: 'Física',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Laboratorio de Ciencias',
    notes: 'Práctica experimental con carritos',
    color: 'emerald',
  },
  {
    id: 'slot-4',
    day: 'tuesday',
    startTime: '10:30',
    endTime: '12:00',
    groupId: 'grp-11a',
    subject: 'Física',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Laboratorio de Física',
    notes: 'Ondas y electromagnetismo',
    color: 'purple',
  },
  {
    id: 'slot-5',
    day: 'wednesday',
    startTime: '07:00',
    endTime: '08:30',
    groupId: 'grp-10a',
    subject: 'Matemáticas',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Aula 201',
    notes: 'Evaluación periódica y quiz corto',
    color: 'indigo',
  },
  {
    id: 'slot-6',
    day: 'wednesday',
    startTime: '08:30',
    endTime: '10:00',
    groupId: 'grp-9b',
    subject: 'Matemáticas',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Aula 105',
    notes: 'Geometría y trigonometría básica',
    color: 'sky',
  },
  {
    id: 'slot-7',
    day: 'thursday',
    startTime: '07:00',
    endTime: '08:30',
    groupId: 'grp-10a',
    subject: 'Física',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Aula 201',
    notes: 'Resolución de problemas numéricos',
    color: 'emerald',
  },
  {
    id: 'slot-8',
    day: 'thursday',
    startTime: '10:30',
    endTime: '12:00',
    groupId: 'grp-11a',
    subject: 'Matemáticas',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Aula 302',
    notes: 'Cálculo diferencial: límites y derivadas',
    color: 'amber',
  },
  {
    id: 'slot-9',
    day: 'friday',
    startTime: '07:00',
    endTime: '08:30',
    groupId: 'grp-10a',
    subject: 'Matemáticas',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Sala TIC / Informática',
    notes: 'Uso de GeoGebra para modelado',
    color: 'indigo',
  },
  {
    id: 'slot-10',
    day: 'friday',
    startTime: '08:30',
    endTime: '10:00',
    groupId: 'grp-9b',
    subject: 'Estadística',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    classroomOrLab: 'Aula 105',
    notes: 'Tablas de frecuencia y diagramas',
    color: 'teal',
  },

  // --- Prof. Sandra Gómez (tch-2) - Biología y Química ---
  {
    id: 'slot-sandra-1',
    day: 'monday',
    startTime: '10:30',
    endTime: '12:00',
    groupId: 'grp-10a',
    subject: 'Química',
    teacherId: 'tch-2',
    teacherName: 'Prof. Sandra Gómez',
    classroomOrLab: 'Laboratorio de Química',
    notes: 'Enlaces químicos y tabla periódica',
    color: 'emerald',
  },
  {
    id: 'slot-sandra-2',
    day: 'tuesday',
    startTime: '08:30',
    endTime: '10:00',
    groupId: 'grp-9b',
    subject: 'Biología',
    teacherId: 'tch-2',
    teacherName: 'Prof. Sandra Gómez',
    classroomOrLab: 'Aula 105',
    notes: 'Genética mendeliana y cruces',
    color: 'teal',
  },
  {
    id: 'slot-sandra-3',
    day: 'thursday',
    startTime: '08:30',
    endTime: '10:00',
    groupId: 'grp-10a',
    subject: 'Biología',
    teacherId: 'tch-2',
    teacherName: 'Prof. Sandra Gómez',
    classroomOrLab: 'Laboratorio de Ciencias',
    notes: 'Microscopía de células vegetales',
    color: 'emerald',
  },

  // --- Prof. Patricia Morales (tch-3) - Lengua Castellana e Inglés ---
  {
    id: 'slot-patricia-1',
    day: 'monday',
    startTime: '07:00',
    endTime: '08:30',
    groupId: 'grp-11a',
    subject: 'Lengua Castellana',
    teacherId: 'tch-3',
    teacherName: 'Prof. Patricia Morales',
    classroomOrLab: 'Aula 302',
    notes: 'Análisis textual y ensayo argumentativo',
    color: 'amber',
  },
  {
    id: 'slot-patricia-2',
    day: 'wednesday',
    startTime: '10:30',
    endTime: '12:00',
    groupId: 'grp-10a',
    subject: 'Lengua Castellana',
    teacherId: 'tch-3',
    teacherName: 'Prof. Patricia Morales',
    classroomOrLab: 'Aula 201',
    notes: 'Literatura contemporánea',
    color: 'rose',
  },
  {
    id: 'slot-patricia-3',
    day: 'friday',
    startTime: '10:30',
    endTime: '12:00',
    groupId: 'grp-11a',
    subject: 'Inglés',
    teacherId: 'tch-3',
    teacherName: 'Prof. Patricia Morales',
    classroomOrLab: 'Aula 302',
    notes: 'Reading comprehension & debate',
    color: 'sky',
  },
];

export const INITIAL_REMEDIALS: RemedialRecord[] = [
  {
    id: 'rem-101-mat-p1',
    studentId: 'std-3',
    groupId: 'grp-10a',
    subject: 'Matemáticas',
    period: 'Periodo 1',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    workDelivered: true,
    workDeliveredDate: '2026-04-15',
    workScore: 4.0,
    supportScore: 3.5,
    finalScore: 3.8,
    isPassed: true,
    workDriveLink: 'https://drive.google.com/file/d/1A2B3C4D5E-demo-taller-matematicas/view',
    supportDriveLink: 'https://drive.google.com/file/d/1X9Y8Z7W6V-demo-acta-sustentacion/view',
    observations: 'Presentó el taller completo de funciones algebraicas y demostró dominio en la sustentación oral.',
    notifiedWhatsApp: true,
    notifiedAt: '2026-04-16T10:30:00Z',
    createdAt: '2026-04-15T08:00:00Z',
    updatedAt: '2026-04-16T10:30:00Z',
  },
  {
    id: 'rem-102-mat-p1',
    studentId: 'std-4',
    groupId: 'grp-10a',
    subject: 'Matemáticas',
    period: 'Periodo 1',
    teacherId: 'tch-1',
    teacherName: 'Prof. Carlos Mendoza',
    workDelivered: true,
    workDeliveredDate: '2026-04-18',
    workScore: 3.8,
    supportScore: 3.6,
    finalScore: 3.7,
    isPassed: true,
    workDriveLink: 'https://drive.google.com/file/d/1MNO5PQR7S-demo-guia-nivelacion/view',
    supportDriveLink: '',
    observations: 'Alcanzó los desempeños básicos tras la sustentación.',
    notifiedWhatsApp: false,
    createdAt: '2026-04-18T14:00:00Z',
    updatedAt: '2026-04-18T14:00:00Z',
  }
];

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error loading key ${key} from storage:`, error);
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving key ${key} to storage:`, error);
  }
};

export const getStoredData = () => {
  const rawSettings = loadFromStorage<SchoolSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const settings: SchoolSettings = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    passingScore: (!rawSettings.passingScore || rawSettings.passingScore === 3.0) ? 3.5 : rawSettings.passingScore,
    minPassingScore: (!rawSettings.minPassingScore || rawSettings.minPassingScore === 3.0) ? 3.5 : rawSettings.minPassingScore,
    attendanceNovelties: (rawSettings.attendanceNovelties && rawSettings.attendanceNovelties.length > 0)
      ? rawSettings.attendanceNovelties
      : DEFAULT_ATTENDANCE_NOVELTIES,
    uniformTags: (rawSettings.uniformTags && rawSettings.uniformTags.length > 0)
      ? rawSettings.uniformTags
      : DEFAULT_UNIFORM_TAGS,
    institutionSubjects: (rawSettings.institutionSubjects && rawSettings.institutionSubjects.length > 0)
      ? rawSettings.institutionSubjects
      : DEFAULT_INSTITUTION_SUBJECTS,
  };

  const rawGroups = loadFromStorage<Group[]>(STORAGE_KEYS.GROUPS, INITIAL_GROUPS);
  const groups = (Array.isArray(rawGroups) && rawGroups.length > 0) ? rawGroups : INITIAL_GROUPS;
  if (!rawGroups || rawGroups.length === 0) {
    saveStoredData.groups(groups);
  }

  const rawTeachers = loadFromStorage<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
  let teachers: Teacher[] = (Array.isArray(rawTeachers) && rawTeachers.length > 0) ? rawTeachers : INITIAL_TEACHERS;
  const existingTeacherIds = new Set(teachers.map((t) => t.id));
  const missingInitialTeachers = INITIAL_TEACHERS.filter((t) => !existingTeacherIds.has(t.id));
  if (missingInitialTeachers.length > 0) {
    teachers = [...teachers, ...missingInitialTeachers];
    saveStoredData.teachers(teachers);
  } else if (!rawTeachers || rawTeachers.length === 0) {
    saveStoredData.teachers(teachers);
  }

  const rawStudents = loadFromStorage<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  const students = (Array.isArray(rawStudents) && rawStudents.length > 0) ? rawStudents : INITIAL_STUDENTS;
  if (!rawStudents || rawStudents.length === 0) {
    saveStoredData.students(students);
  }

  const rawAttendance = loadFromStorage<AttendanceRecord[] | null>(STORAGE_KEYS.ATTENDANCE, null);
  const baseAttendance = rawAttendance !== null ? rawAttendance : INITIAL_ATTENDANCE;
  const attendance = (baseAttendance || []).map((r) => {
    const s = r.status as string;
    if (s === 'unexcused_absence') return { ...r, status: 'absent' };
    if (s === 'excused_absence') return { ...r, status: 'excused' };
    return r;
  });

  const rawActivities = loadFromStorage<Activity[] | null>(STORAGE_KEYS.ACTIVITIES, null);
  const baseActivities = rawActivities !== null ? rawActivities : INITIAL_ACTIVITIES;
  const activities = (baseActivities || []).map((act) => {
    if (!act.passingScore || act.passingScore === 3.0) {
      return { ...act, passingScore: 3.5 };
    }
    return act;
  });

  const rawGrades = loadFromStorage<GradeRecord[] | null>(STORAGE_KEYS.GRADES, null);
  const grades = rawGrades !== null ? rawGrades : INITIAL_GRADES;

  const rawSubjectConfigs = loadFromStorage<SubjectConfig[] | null>(STORAGE_KEYS.SUBJECT_CONFIGS, null);
  const subjectConfigs = rawSubjectConfigs !== null ? rawSubjectConfigs : INITIAL_SUBJECT_CONFIGS;

  const rawWorkGroups = loadFromStorage<WorkGroupSet[] | null>(STORAGE_KEYS.WORK_GROUPS, null);
  const workGroups = rawWorkGroups !== null ? rawWorkGroups : INITIAL_WORK_GROUPS;

  const rawSeatingPlans = loadFromStorage<GroupSeatingPlan[] | null>(STORAGE_KEYS.SEATING_PLANS, null);
  const seatingPlans = rawSeatingPlans !== null ? rawSeatingPlans : INITIAL_SEATING_PLANS;

  const rawDailyLogs = loadFromStorage<ClassDailyLog[] | null>(STORAGE_KEYS.DAILY_LOGS, null);
  let dailyLogs: ClassDailyLog[] = rawDailyLogs !== null ? rawDailyLogs : INITIAL_DAILY_LOGS;

  // Auto-migrate legacy daily logs missing teacherId or teacherName
  let dailyLogsMigrated = false;
  dailyLogs = dailyLogs.map((log) => {
    if (!log.teacherId || !log.teacherName) {
      dailyLogsMigrated = true;
      const matchedTeacher = teachers.find(
        (t) =>
          t.id === log.teacherId ||
          (t.assignedSubjects || []).some((s) => s.toLowerCase() === (log.subject || '').toLowerCase()) ||
          (t.assignedGroupIds || []).includes(log.groupId)
      ) || teachers[0] || { id: 'tch-1', name: 'Prof. Carlos Mendoza' };
      return {
        ...log,
        teacherId: log.teacherId || matchedTeacher.id,
        teacherName: log.teacherName || matchedTeacher.name,
      };
    }
    return log;
  });

  if (dailyLogsMigrated || !rawDailyLogs || rawDailyLogs.length === 0) {
    saveStoredData.dailyLogs(dailyLogs);
  }

  const rawSchedules = loadFromStorage<ScheduleTimeSlot[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULE_SLOTS);
  let schedules: ScheduleTimeSlot[] = (Array.isArray(rawSchedules) && rawSchedules.length > 0) ? rawSchedules : INITIAL_SCHEDULE_SLOTS;

  // Auto-migrate legacy slots missing teacherId
  let schedulesMigrated = false;
  schedules = schedules.map((slot) => {
    if (!slot.teacherId) {
      schedulesMigrated = true;
      const matchedTeacher = teachers.find(
        (t) =>
          (t.assignedSubjects || []).some((s) => s.toLowerCase() === (slot.subject || '').toLowerCase()) ||
          (t.assignedGroupIds || []).includes(slot.groupId)
      ) || teachers[0] || { id: 'tch-1', name: 'Prof. Carlos Mendoza' };
      return {
        ...slot,
        teacherId: matchedTeacher.id,
        teacherName: slot.teacherName || matchedTeacher.name,
      };
    }
    return slot;
  });

  if (schedulesMigrated || !rawSchedules || rawSchedules.length === 0) {
    saveStoredData.schedules(schedules);
  }

  const rawRemedials = loadFromStorage<RemedialRecord[]>(STORAGE_KEYS.REMEDIALS, INITIAL_REMEDIALS);
  const remedials = (Array.isArray(rawRemedials) && rawRemedials.length > 0) ? rawRemedials : INITIAL_REMEDIALS;

  return {
    groups,
    students,
    attendance,
    activities,
    grades,
    settings,
    notifications: loadFromStorage<NotificationLog[]>(STORAGE_KEYS.NOTIFICATIONS, []),
    subjectConfigs,
    teachers,
    workGroups,
    seatingPlans,
    abpRoles: loadFromStorage<ABPRole[]>(STORAGE_KEYS.ABP_ROLES, DEFAULT_ABP_ROLES),
    dailyLogs,
    schedules,
    remedials,
  };
};

export const saveStoredData = {
  groups: (data: Group[]) => saveToStorage(STORAGE_KEYS.GROUPS, data),
  students: (data: Student[]) => saveToStorage(STORAGE_KEYS.STUDENTS, data),
  attendance: (data: AttendanceRecord[]) => {
    const normalized = (data || []).map((r) => {
      const s = r.status as string;
      if (s === 'unexcused_absence') return { ...r, status: 'absent' };
      if (s === 'excused_absence') return { ...r, status: 'excused' };
      return r;
    });
    return saveToStorage(STORAGE_KEYS.ATTENDANCE, normalized);
  },
  activities: (data: Activity[]) => saveToStorage(STORAGE_KEYS.ACTIVITIES, data),
  grades: (data: GradeRecord[]) => saveToStorage(STORAGE_KEYS.GRADES, data),
  settings: (data: SchoolSettings) => saveToStorage(STORAGE_KEYS.SETTINGS, data),
  notifications: (data: NotificationLog[]) => saveToStorage(STORAGE_KEYS.NOTIFICATIONS, data),
  subjectConfigs: (data: SubjectConfig[]) => saveToStorage(STORAGE_KEYS.SUBJECT_CONFIGS, data),
  teachers: (data: Teacher[]) => saveToStorage(STORAGE_KEYS.TEACHERS, data),
  workGroups: (data: WorkGroupSet[]) => saveToStorage(STORAGE_KEYS.WORK_GROUPS, data),
  seatingPlans: (data: GroupSeatingPlan[]) => saveToStorage(STORAGE_KEYS.SEATING_PLANS, data),
  abpRoles: (data: ABPRole[]) => saveToStorage(STORAGE_KEYS.ABP_ROLES, data),
  dailyLogs: (data: ClassDailyLog[]) => saveToStorage(STORAGE_KEYS.DAILY_LOGS, data),
  schedules: (data: ScheduleTimeSlot[]) => saveToStorage(STORAGE_KEYS.SCHEDULES, data),
  remedials: (data: RemedialRecord[]) => saveToStorage(STORAGE_KEYS.REMEDIALS, data),
};

export const getStoredAuthUser = (): AuthUser | null => {
  return loadFromStorage<AuthUser | null>(STORAGE_KEYS.AUTH_USER, null);
};

export const saveStoredAuthUser = (user: AuthUser | null): void => {
  saveToStorage(STORAGE_KEYS.AUTH_USER, user);
};

/**
 * Creates a downloadable JSON file with the entire application database
 */
export const exportFullDatabaseBackup = () => {
  const data = getStoredData();
  const backupPayload = {
    appName: 'EduControl Pro',
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    data,
  };

  const jsonStr = JSON.stringify(backupPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `EduControl_Backup_Completo_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Restores all database collections from a JSON backup file
 */
export const restoreDatabaseFromBackup = async (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !parsed.data) {
          throw new Error('Formato de backup inválido: falta la propiedad data.');
        }

        const { 
          groups, 
          students, 
          attendance, 
          activities, 
          grades, 
          settings, 
          notifications, 
          subjectConfigs, 
          teachers,
          workGroups,
          seatingPlans,
          dailyLogs,
          schedules,
          remedials
        } = parsed.data;

        if (groups) saveStoredData.groups(groups);
        if (students) saveStoredData.students(students);
        if (attendance) saveStoredData.attendance(attendance);
        if (activities) saveStoredData.activities(activities);
        if (grades) saveStoredData.grades(grades);
        if (settings) saveStoredData.settings(settings);
        if (notifications) saveStoredData.notifications(notifications);
        if (subjectConfigs) saveStoredData.subjectConfigs(subjectConfigs);
        if (teachers) saveStoredData.teachers(teachers);
        if (workGroups) saveStoredData.workGroups(workGroups);
        if (seatingPlans) saveStoredData.seatingPlans(seatingPlans);
        if (dailyLogs) saveStoredData.dailyLogs(dailyLogs);
        if (schedules) saveStoredData.schedules(schedules);
        if (remedials) saveStoredData.remedials(remedials);

        resolve(true);
      } catch (err) {
        console.error('Error al restaurar base de datos:', err);
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};

/**
 * Clears all user data and resets to initial defaults
 */
export const resetToFactoryDefaults = () => {
  localStorage.removeItem(STORAGE_KEYS.GROUPS);
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
  localStorage.removeItem(STORAGE_KEYS.GRADES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  localStorage.removeItem(STORAGE_KEYS.SUBJECT_CONFIGS);
  localStorage.removeItem(STORAGE_KEYS.TEACHERS);
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  localStorage.removeItem(STORAGE_KEYS.DAILY_LOGS);
  localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
  localStorage.removeItem(STORAGE_KEYS.REMEDIALS);
  window.location.reload();
};
