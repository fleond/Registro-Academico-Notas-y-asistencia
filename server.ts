import express from 'express';
import cors from 'cors';
import path from 'path';
import mysql from 'mysql2/promise';
import { createServer as createViteServer } from 'vite';
import { generateWampMysqlSchemaSQL, generateFullDatabaseDumpSQL } from './src/utils/mysqlGenerator.ts';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database configuration state
let currentDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'registro_academico_fleon',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
  multipleStatements: true,
};

let pool: mysql.Pool | null = null;

function formatDateString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.split('T')[0];
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val);
}

function getMySQLPool(overrideConfig?: any): mysql.Pool {
  const config = overrideConfig ? { ...currentDbConfig, ...overrideConfig } : currentDbConfig;
  return mysql.createPool(config);
}

// =========================================================================
// API ROUTES FIRST (BEFORE VITE MIDDLEWARE)
// =========================================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Registro Académico fleon Server' });
});

// 1. MySQL Status & Diagnostics
app.get('/api/mysql/status', async (req, res) => {
  try {
    const testPool = pool || getMySQLPool();
    const connection = await testPool.getConnection();
    try {
      const [rows]: any = await connection.query(`
        SELECT 
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?) as total_tables
      `, [currentDbConfig.database]);

      let counts = {
        teachers_count: 0,
        groups_count: 0,
        students_count: 0,
        attendance_count: 0,
        activities_count: 0,
        grades_count: 0
      };

      try {
        const [c]: any = await connection.query(`
          SELECT 
            (SELECT COUNT(*) FROM docentes) as teachers_count,
            (SELECT COUNT(*) FROM grupos) as groups_count,
            (SELECT COUNT(*) FROM estudiantes) as students_count,
            (SELECT COUNT(*) FROM asistencias) as attendance_count,
            (SELECT COUNT(*) FROM actividades) as activities_count,
            (SELECT COUNT(*) FROM calificaciones) as grades_count
        `);
        if (c && c[0]) {
          counts = c[0];
        }
      } catch (e) {
        // Tables might not be initialized yet
      }

      res.json({
        connected: true,
        engine: 'MySQL 8.x / WAMP Server',
        host: `${currentDbConfig.host}:${currentDbConfig.port}`,
        database: currentDbConfig.database,
        user: currentDbConfig.user,
        tablesCount: rows[0]?.total_tables || 0,
        counts,
        message: '¡Conexión establecida exitosamente con MySQL!'
      });
    } finally {
      connection.release();
    }
  } catch (err: any) {
    res.json({
      connected: false,
      engine: 'MySQL WAMP Server',
      host: `${currentDbConfig.host}:${currentDbConfig.port}`,
      database: currentDbConfig.database,
      user: currentDbConfig.user,
      error: err.code || 'ECONNREFUSED',
      message: `No se pudo conectar a MySQL (${err.message || 'Servidor local apagado o inaccesible'}). Para entornos locales, verifica que WAMP Server esté en Verde.`,
      hint: 'Puedes descargar el script SQL o exportar datos directamente para importar en phpMyAdmin.'
    });
  }
});

// 2. Test Custom Connection
app.post('/api/mysql/test', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  const tempConfig = {
    host: host || 'localhost',
    port: parseInt(port || '3306', 10),
    user: user || 'root',
    password: password || '',
    database: database || 'registro_academico_fleon',
  };

  try {
    const tempPool = mysql.createPool({
      ...tempConfig,
      connectionLimit: 1,
      connectTimeout: 4000
    });
    const conn = await tempPool.getConnection();
    conn.release();
    await tempPool.end();

    // Update default current config if successful
    currentDbConfig = { ...currentDbConfig, ...tempConfig };
    pool = mysql.createPool(currentDbConfig);

    res.json({
      success: true,
      message: `¡Conexión exitosa a MySQL en ${tempConfig.host}:${tempConfig.port} base de datos '${tempConfig.database}'!`
    });
  } catch (err: any) {
    res.json({
      success: false,
      error: err.code,
      message: `Error al conectar a MySQL: ${err.message}`
    });
  }
});

// 3. Initialize MySQL Schema (Execute DDL)
app.post('/api/mysql/init-schema', async (req, res) => {
  try {
    const targetPool = pool || getMySQLPool();
    const conn = await targetPool.getConnection();
    try {
      const ddlSql = generateWampMysqlSchemaSQL(currentDbConfig.database);
      const statements = ddlSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      for (const statement of statements) {
        try {
          await conn.query(statement);
        } catch (stmtErr) {
          console.warn('Statement warning/skip in DDL:', stmtErr);
        }
      }

      res.json({
        success: true,
        message: '¡Estructura de tablas y vistas creada exitosamente en MySQL!'
      });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Error ejecutando creación de tablas: ${err.message}`
    });
  }
});

// 4. Pull All Consolidated Data from MySQL
app.get('/api/mysql/sync/pull', async (req, res) => {
  try {
    const targetPool = pool || getMySQLPool();
    const conn = await targetPool.getConnection();
    try {
      // 1. Settings
      let settings: any = null;
      try {
        const [sRows]: any = await conn.query('SELECT * FROM configuracion_institucional WHERE id="primary_settings" LIMIT 1');
        if (sRows && sRows[0]) {
          const r = sRows[0];
          settings = {
            schoolName: r.school_name,
            teacherName: r.teacher_name,
            schoolYear: r.school_year,
            currentPeriod: r.current_period,
            defaultCountryCode: r.default_country_code,
            gradingScale: r.grading_scale,
            minPassingScore: parseFloat(r.min_passing_score),
            passingScore: parseFloat(r.passing_score),
            adminPassword: r.admin_password,
            adminRecoveryEmail: r.admin_recovery_email,
            autoOpenWhatsApp: Boolean(r.auto_open_whatsapp),
            instantWhatsAppOnAttendance: Boolean(r.instant_whatsapp_on_attendance),
            attendanceTemplate: r.attendance_template,
            lateTemplate: r.late_template,
            absentTemplate: r.absent_template,
            uniformTemplate: r.uniform_template,
            gradeTemplate: r.grade_template,
            dailyDigestTemplate: r.daily_digest_template,
            institutionSubjects: JSON.parse(r.institution_subjects_json || '[]'),
            attendanceNovelties: JSON.parse(r.attendance_novelties_json || '[]'),
            uniformTags: JSON.parse(r.uniform_tags_json || '[]'),
            evaluationCategories: JSON.parse(r.evaluation_categories_json || '[]'),
            periods: JSON.parse(r.periods_json || '[]'),
          };
        }
      } catch (e) {}

      // 2. Teachers
      let teachers: any[] = [];
      try {
        const [tRows]: any = await conn.query('SELECT * FROM docentes');
        teachers = (tRows || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          documentId: r.document_id,
          phone: r.phone,
          specialty: r.specialty,
          role: r.role,
          status: r.status,
          password: r.password,
          avatarColor: r.avatar_color,
          assignedGroupIds: JSON.parse(r.assigned_group_ids_json || '[]'),
          assignedGrades: JSON.parse(r.assigned_grades_json || '[]'),
          assignedSubjects: JSON.parse(r.assigned_subjects_json || '[]'),
          assignments: JSON.parse(r.assignments_json || '[]'),
          createdAt: r.created_at,
        }));
      } catch (e) {}

      // 3. Groups
      let groups: any[] = [];
      try {
        const [gRows]: any = await conn.query('SELECT * FROM grupos ORDER BY grade ASC, name ASC');
        groups = (gRows || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          grade: r.grade,
          section: r.section,
          schoolYear: r.school_year,
          shift: r.shift,
          directorName: r.director_name,
          teacherName: r.teacher_name,
          teacherId: r.teacher_id,
          room: r.room,
          subjects: JSON.parse(r.subjects_json || '[]'),
          assignedTeacherIds: JSON.parse(r.assigned_teacher_ids_json || '[]'),
          createdByTeacherId: r.created_by_teacher_id,
          createdAt: r.created_at,
        }));
      } catch (e) {}

      // 4. Students
      let students: any[] = [];
      try {
        const [stRows]: any = await conn.query('SELECT * FROM estudiantes ORDER BY last_name ASC, first_name ASC');
        students = (stRows || []).map((r: any) => ({
          id: r.id,
          documentId: r.document_id,
          firstName: r.first_name,
          lastName: r.last_name,
          groupId: r.group_id,
          email: r.email,
          guardianName: r.guardian_name,
          guardianPhone: r.guardian_phone,
          guardianCountryCode: r.guardian_country_code,
          guardianEmail: r.guardian_email,
          guardianRelationship: r.guardian_relationship,
          status: r.status,
          observations: r.observations,
          avatarColor: r.avatar_color,
          gender: r.gender,
          createdByTeacherId: r.created_by_teacher_id,
        }));
      } catch (e) {}

      // 5. Attendance
      let attendance: any[] = [];
      try {
        const [attRows]: any = await conn.query('SELECT * FROM asistencias ORDER BY date DESC');
        attendance = (attRows || []).map((r: any) => ({
          id: r.id,
          date: formatDateString(r.date),
          groupId: r.group_id,
          studentId: r.student_id,
          status: r.status,
          lateMinutes: r.late_minutes,
          uniformStatus: r.uniform_status,
          uniformNotes: r.uniform_notes,
          excuseReason: r.excuse_reason,
          observations: r.observations,
          notifiedWhatsApp: Boolean(r.notified_whatsapp),
          notifiedAt: r.notified_at,
        }));
      } catch (e) {}

      // 6. Activities
      let activities: any[] = [];
      try {
        const [actRows]: any = await conn.query('SELECT * FROM actividades ORDER BY due_date DESC');
        activities = (actRows || []).map((r: any) => ({
          id: r.id,
          groupId: r.group_id,
          subject: r.subject,
          title: r.title,
          description: r.description,
          assignedDate: formatDateString(r.assigned_date),
          dueDate: formatDateString(r.due_date),
          maxScore: parseFloat(r.max_score),
          passingScore: parseFloat(r.passing_score),
          weightPercentage: parseFloat(r.weight_percentage),
          type: r.type,
          period: r.period,
          categoryId: r.category_id,
          createdByTeacherId: r.created_by_teacher_id,
          assignedTeacherId: r.assigned_teacher_id,
          attachments: JSON.parse(r.attachments_json || '[]'),
        }));
      } catch (e) {}

      // 7. Grades
      let grades: any[] = [];
      try {
        const [grdRows]: any = await conn.query('SELECT * FROM calificaciones');
        grades = (grdRows || []).map((r: any) => ({
          id: r.id,
          activityId: r.activity_id,
          studentId: r.student_id,
          score: r.score !== null ? parseFloat(r.score) : null,
          deliveredOnTime: r.delivered_on_time,
          comments: r.comments,
          feedbackDate: r.feedback_date,
          notifiedWhatsApp: Boolean(r.notified_whatsapp),
          notifiedAt: r.notified_at,
          attachments: JSON.parse(r.attachments_json || '[]'),
        }));
      } catch (e) {}

      // 8. Subject Configs
      let subjectConfigs: any[] = [];
      try {
        const [scRows]: any = await conn.query('SELECT * FROM configuracion_materias');
        subjectConfigs = (scRows || []).map((r: any) => ({
          id: r.id,
          groupId: r.group_id,
          subjectName: r.subject_name,
          categories: JSON.parse(r.categories_json || '[]'),
        }));
      } catch (e) {}

      // 9. Remedials
      let remedials: any[] = [];
      try {
        const [remRows]: any = await conn.query('SELECT * FROM nivelaciones_remediales');
        remedials = (remRows || []).map((r: any) => ({
          id: r.id,
          studentId: r.student_id,
          groupId: r.group_id,
          subject: r.subject,
          period: r.period,
          academicYear: r.academic_year,
          teacherId: r.teacher_id,
          teacherName: r.teacher_name,
          requiresRemedial: Boolean(r.requires_remedial),
          failingScore: r.failing_score !== null ? parseFloat(r.failing_score) : null,
          failingReason: r.failing_reason,
          workDelivered: Boolean(r.work_delivered),
          workDeliveredDate: r.work_delivered_date,
          workScore: r.work_score !== null ? parseFloat(r.work_score) : null,
          supportScore: r.support_score !== null ? parseFloat(r.support_score) : null,
          finalScore: r.final_score !== null ? parseFloat(r.final_score) : null,
          isPassed: Boolean(r.is_passed),
          workDriveLink: r.work_drive_link,
          supportDriveLink: r.support_drive_link,
          workAttachment: JSON.parse(r.work_attachment_json || 'null'),
          supportAttachment: JSON.parse(r.support_attachment_json || 'null'),
          observations: r.observations,
          notifiedWhatsApp: Boolean(r.notified_whatsapp),
          notifiedAt: r.notified_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } catch (e) {}

      // 10. Daily Logs
      let dailyLogs: any[] = [];
      try {
        const [dlRows]: any = await conn.query('SELECT * FROM diario_clase ORDER BY date DESC');
        dailyLogs = (dlRows || []).map((r: any) => ({
          id: r.id,
          groupId: r.group_id,
          teacherId: r.teacher_id,
          teacherName: r.teacher_name,
          subject: r.subject,
          date: r.date,
          period: r.period,
          topic: r.topic,
          objective: r.objective,
          activitiesDescription: r.activities_description,
          tasksAssigned: r.tasks_assigned,
          pedagogicalAgreements: r.pedagogical_agreements,
          resourcesUsed: r.resources_used,
          attendanceSummary: JSON.parse(r.attendance_summary_json || 'null'),
          attachments: JSON.parse(r.attachments_json || '[]'),
          createdAt: r.created_at,
        }));
      } catch (e) {}

      // 11. Schedules
      let schedules: any[] = [];
      try {
        const [schRows]: any = await conn.query('SELECT * FROM horarios_clase');
        schedules = (schRows || []).map((r: any) => ({
          id: r.id,
          day: r.day,
          startTime: r.start_time,
          endTime: r.end_time,
          groupId: r.group_id,
          subject: r.subject,
          teacherId: r.teacher_id,
          teacherName: r.teacher_name,
          classroomOrLab: r.classroom_or_lab,
          notes: r.notes,
          color: r.color,
        }));
      } catch (e) {}

      res.json({
        success: true,
        source: 'mysql_node',
        data: {
          settings,
          teachers,
          groups,
          students,
          attendance,
          activities,
          grades,
          subjectConfigs,
          remedials,
          dailyLogs,
          schedules
        }
      });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Error recuperando datos de MySQL: ${err.message}`
    });
  }
});

// 5. Push / Sync Batch Data to MySQL
app.post('/api/mysql/sync/push', async (req, res) => {
  const payload = req.body;
  if (!payload) {
    return res.status(400).json({ success: false, message: 'Payload vacío' });
  }

  try {
    const targetPool = pool || getMySQLPool();
    const conn = await targetPool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
      await conn.query("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");
      await conn.beginTransaction();

      console.log(
        `[MySQL Push] Syncing payload: ${payload.activities?.length ?? 0} activities, ${payload.grades?.length ?? 0} grades, ${payload.attendance?.length ?? 0} attendance records`
      );

      // Ensure tables exist without dropping existing tables
      const ddlSql = generateWampMysqlSchemaSQL(currentDbConfig.database, false);
      const statements = ddlSql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
      for (const st of statements) {
        try { await conn.query(st); } catch (e) {}
      }

      // Generate Dump SQL with current state without dropping tables and execute it
      const dumpSql = generateFullDatabaseDumpSQL({
        ...payload,
        dropExisting: false,
      });
      const dumpStatements = dumpSql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
      for (const st of dumpStatements) {
        try {
          await conn.query(st);
        } catch (e: any) {
          console.warn('[MySQL Push] Statement warning:', e.message, st.substring(0, 80));
        }
      }

      await conn.commit();
      await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
      res.json({
        success: true,
        message: '¡Datos sincronizados y guardados exitosamente en la base de datos MySQL (WAMP) sin conflictos de claves foráneas!'
      });
    } catch (pushErr: any) {
      try { await conn.rollback(); } catch (e) {}
      try { await conn.query('SET FOREIGN_KEY_CHECKS = 1;'); } catch (e) {}
      throw pushErr;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('[MySQL Push] Error:', err);
    res.status(500).json({
      success: false,
      message: `Error guardando en MySQL: ${err.message}`
    });
  }
});

// 5.5 Fix / Soften Foreign Key Constraints & Column Compatibility
app.post('/api/mysql/fix-constraints', async (req, res) => {
  try {
    const targetPool = pool || getMySQLPool();
    const conn = await targetPool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
      await conn.query('ALTER TABLE estudiantes MODIFY COLUMN group_id varchar(50) DEFAULT NULL;');
      try {
        const [colCheck]: any = await conn.query("SHOW COLUMNS FROM configuracion_materias LIKE 'subject_name'");
        if (!colCheck || colCheck.length === 0) {
          const [subCol]: any = await conn.query("SHOW COLUMNS FROM configuracion_materias LIKE 'subject'");
          if (subCol && subCol.length > 0) {
            await conn.query("ALTER TABLE configuracion_materias CHANGE COLUMN subject subject_name varchar(150) NOT NULL;");
          } else {
            await conn.query("ALTER TABLE configuracion_materias ADD COLUMN subject_name varchar(150) NOT NULL AFTER group_id;");
          }
        }
      } catch (e) {}
      await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
      res.json({ success: true, message: 'Restricciones de clave foránea y columnas ajustadas correctamente.' });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Error ajustando restricciones: ${err.message}` });
  }
});

// 5.6 Delete a specific record in MySQL
app.post('/api/mysql/delete', async (req, res) => {
  const { table, id } = req.body || {};
  const allowedTables = [
    'docentes', 'grupos', 'estudiantes', 'asistencias',
    'actividades', 'calificaciones', 'configuracion_materias',
    'nivelaciones_remediales', 'diario_clase', 'horarios_clase',
    'grupos_trabajo_abp', 'planos_asientos', 'log_notificaciones'
  ];

  if (!table || !id || !allowedTables.includes(table)) {
    return res.status(400).json({ success: false, message: 'Tabla no válida o ID vacío' });
  }

  try {
    const targetPool = pool || getMySQLPool();
    const conn = await targetPool.getConnection();
    try {
      await conn.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
      res.json({ success: true, message: `Registro ${id} eliminado de ${table} en MySQL` });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Error al eliminar de MySQL: ${err.message}` });
  }
});

// 6. Generate downloadable SQL file on the fly
app.post('/api/mysql/export-sql', (req, res) => {
  try {
    const data = req.body || {};
    const sql = generateFullDatabaseDumpSQL(data);
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="database_wamp_fleon.sql"');
    res.send(sql);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// VITE MIDDLEWARE / STATIC ASSETS
// =========================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[fleon] Server running on http://localhost:${PORT}`);
  });
}

startServer();
