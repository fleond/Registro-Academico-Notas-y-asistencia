/**
 * MySQL Schema & DDL Generator optimized for WAMP Server (Apache, MySQL, PHP / phpMyAdmin)
 * Character set: utf8mb4, Collation: utf8mb4_unicode_ci, Engine: InnoDB
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

/**
 * Escapes strings for MySQL queries
 */
export const escapeSqlString = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return isNaN(value) ? 'NULL' : String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%': return '\\' + char;
        default: return char;
      }
    })}'`;
  }
  const str = String(value);
  return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0': return '\\0';
      case '\x08': return '\\b';
      case '\x09': return '\\t';
      case '\x1a': return '\\z';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%': return '\\' + char;
      default: return char;
    }
  })}'`;
};

/**
 * Generates the clean DDL MySQL Schema for WAMP Server
 */
export const generateWampMysqlSchemaSQL = (
  databaseName: string = 'registro_academico_fleon',
  dropExisting: boolean = false
): string => {
  const dropClause = (tbl: string) => (dropExisting ? `DROP TABLE IF EXISTS \`${tbl}\`;\n` : '');
  const tableCreate = (tbl: string) => (dropExisting ? `CREATE TABLE \`${tbl}\`` : `CREATE TABLE IF NOT EXISTS \`${tbl}\``);

  return `-- ==============================================================================
-- SISTEMA DE CONTROL ACADÉMICO, ASISTENCIA Y CALIFICACIONES (fleon)
-- BASE DE DATOS MYSQL PARA WAMP SERVER (Apache, MySQL, PHP / phpMyAdmin)
-- Cotejamiento: utf8mb4_unicode_ci | Motor: InnoDB
-- Generado para despliegue local en WAMP Server
-- ==============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS \`${databaseName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${databaseName}\`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABLA: configuracion_institucional (School Settings & WhatsApp Templates)
-- ------------------------------------------------------------------------------
${dropClause('configuracion_institucional')}${tableCreate('configuracion_institucional')} (
  \`id\` varchar(50) NOT NULL DEFAULT 'primary_settings',
  \`school_name\` varchar(255) NOT NULL DEFAULT 'Institución Educativa',
  \`teacher_name\` varchar(255) NOT NULL DEFAULT 'Docente Titular',
  \`school_year\` varchar(20) NOT NULL DEFAULT '2026',
  \`current_period\` varchar(50) NOT NULL DEFAULT 'Periodo 1',
  \`default_country_code\` varchar(10) NOT NULL DEFAULT '+57',
  \`grading_scale\` varchar(20) NOT NULL DEFAULT '1-5',
  \`min_passing_score\` decimal(4,2) DEFAULT '3.50',
  \`passing_score\` decimal(4,2) DEFAULT '3.50',
  \`admin_password\` varchar(255) DEFAULT 'admin123',
  \`admin_recovery_email\` varchar(255) DEFAULT '',
  \`auto_open_whatsapp\` tinyint(1) NOT NULL DEFAULT '0',
  \`instant_whatsapp_on_attendance\` tinyint(1) NOT NULL DEFAULT '0',
  \`attendance_template\` text DEFAULT NULL,
  \`late_template\` text DEFAULT NULL,
  \`absent_template\` text DEFAULT NULL,
  \`uniform_template\` text DEFAULT NULL,
  \`grade_template\` text DEFAULT NULL,
  \`daily_digest_template\` text DEFAULT NULL,
  \`institution_subjects_json\` longtext DEFAULT NULL,
  \`attendance_novelties_json\` longtext DEFAULT NULL,
  \`uniform_tags_json\` longtext DEFAULT NULL,
  \`evaluation_categories_json\` longtext DEFAULT NULL,
  \`periods_json\` longtext DEFAULT NULL,
  \`db_config_json\` longtext DEFAULT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABLA: docentes (Teachers & Coordinators)
-- ------------------------------------------------------------------------------
${dropClause('docentes')}${tableCreate('docentes')} (
  \`id\` varchar(50) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`email\` varchar(255) DEFAULT '',
  \`document_id\` varchar(50) NOT NULL,
  \`phone\` varchar(50) DEFAULT '',
  \`specialty\` varchar(255) DEFAULT '',
  \`role\` enum('teacher','coordinator','admin') NOT NULL DEFAULT 'teacher',
  \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
  \`password\` varchar(255) DEFAULT 'docente123',
  \`avatar_color\` varchar(50) DEFAULT 'bg-indigo-600',
  \`assigned_group_ids_json\` longtext DEFAULT NULL,
  \`assigned_grades_json\` longtext DEFAULT NULL,
  \`assigned_subjects_json\` longtext DEFAULT NULL,
  \`assignments_json\` longtext DEFAULT NULL,
  \`created_at\` date DEFAULT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_docente_doc\` (\`document_id\`),
  KEY \`idx_docente_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLA: grupos (Classes & Courses)
-- ------------------------------------------------------------------------------
${dropClause('grupos')}${tableCreate('grupos')} (
  \`id\` varchar(50) NOT NULL,
  \`name\` varchar(100) NOT NULL,
  \`grade\` varchar(50) NOT NULL DEFAULT '10°',
  \`section\` varchar(50) DEFAULT '',
  \`school_year\` varchar(20) NOT NULL DEFAULT '2026',
  \`shift\` enum('Mañana','Tarde','Única','Nocturna') NOT NULL DEFAULT 'Mañana',
  \`director_name\` varchar(255) DEFAULT '',
  \`teacher_name\` varchar(255) DEFAULT '',
  \`teacher_id\` varchar(50) DEFAULT NULL,
  \`room\` varchar(50) DEFAULT '',
  \`subjects_json\` longtext DEFAULT NULL,
  \`assigned_teacher_ids_json\` longtext DEFAULT NULL,
  \`created_by_teacher_id\` varchar(50) DEFAULT NULL,
  \`created_at\` date DEFAULT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_grupo_grade\` (\`grade\`),
  KEY \`idx_grupo_teacher_id\` (\`teacher_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLA: estudiantes (Students & Guardian Contacts)
-- ------------------------------------------------------------------------------
${dropClause('estudiantes')}${tableCreate('estudiantes')} (
  \`id\` varchar(50) NOT NULL,
  \`document_id\` varchar(50) NOT NULL,
  \`first_name\` varchar(100) NOT NULL,
  \`last_name\` varchar(100) NOT NULL,
  \`group_id\` varchar(50) DEFAULT NULL,
  \`email\` varchar(255) DEFAULT '',
  \`guardian_name\` varchar(255) NOT NULL DEFAULT 'Acudiente',
  \`guardian_phone\` varchar(50) NOT NULL DEFAULT '',
  \`guardian_country_code\` varchar(10) NOT NULL DEFAULT '+57',
  \`guardian_email\` varchar(255) DEFAULT '',
  \`guardian_relationship\` varchar(50) NOT NULL DEFAULT 'Madre',
  \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
  \`observations\` text DEFAULT NULL,
  \`avatar_color\` varchar(50) DEFAULT 'bg-indigo-500',
  \`gender\` enum('M','F','Otro') DEFAULT 'M',
  \`created_by_teacher_id\` varchar(50) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_estudiante_group_id\` (\`group_id\`),
  KEY \`idx_estudiante_doc\` (\`document_id\`),
  KEY \`idx_estudiante_phone\` (\`guardian_phone\`),
  CONSTRAINT \`fk_estudiantes_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABLA: asistencias (Attendance & Novelties Records)
-- ------------------------------------------------------------------------------
${dropClause('asistencias')}${tableCreate('asistencias')} (
  \`id\` varchar(100) NOT NULL,
  \`date\` date NOT NULL,
  \`group_id\` varchar(50) NOT NULL,
  \`student_id\` varchar(50) NOT NULL,
  \`status\` varchar(50) NOT NULL DEFAULT 'present',
  \`late_minutes\` int(11) DEFAULT '0',
  \`uniform_status\` enum('complete','incomplete','none') NOT NULL DEFAULT 'complete',
  \`uniform_notes\` text DEFAULT NULL,
  \`excuse_reason\` text DEFAULT NULL,
  \`observations\` text DEFAULT NULL,
  \`notified_whatsapp\` tinyint(1) NOT NULL DEFAULT '0',
  \`notified_at\` datetime DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_asistencia_estudiante_dia\` (\`student_id\`,\`date\`,\`group_id\`),
  KEY \`idx_asistencia_fecha\` (\`date\`),
  KEY \`idx_asistencia_group_id\` (\`group_id\`),
  KEY \`idx_asistencia_student_id\` (\`student_id\`),
  CONSTRAINT \`fk_asistencias_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk_asistencias_estudiante\` FOREIGN KEY (\`student_id\`) REFERENCES \`estudiantes\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLA: actividades (Academic Activities & Tasks)
-- ------------------------------------------------------------------------------
${dropClause('actividades')}${tableCreate('actividades')} (
  \`id\` varchar(50) NOT NULL,
  \`group_id\` varchar(50) NOT NULL,
  \`subject\` varchar(150) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`description\` text DEFAULT NULL,
  \`assigned_date\` date NOT NULL,
  \`due_date\` date NOT NULL,
  \`max_score\` decimal(5,2) NOT NULL DEFAULT '5.00',
  \`passing_score\` decimal(5,2) NOT NULL DEFAULT '3.50',
  \`weight_percentage\` decimal(5,2) NOT NULL DEFAULT '20.00',
  \`type\` varchar(50) NOT NULL DEFAULT 'taller',
  \`period\` varchar(50) NOT NULL DEFAULT 'Periodo 1',
  \`category_id\` varchar(50) DEFAULT NULL,
  \`created_by_teacher_id\` varchar(50) DEFAULT NULL,
  \`assigned_teacher_id\` varchar(50) DEFAULT NULL,
  \`attachments_json\` longtext DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_actividad_group_id\` (\`group_id\`),
  KEY \`idx_actividad_subject\` (\`subject\`),
  KEY \`idx_actividad_period\` (\`period\`),
  CONSTRAINT \`fk_actividades_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABLA: calificaciones (Grades & Scores Records)
-- ------------------------------------------------------------------------------
${dropClause('calificaciones')}${tableCreate('calificaciones')} (
  \`id\` varchar(100) NOT NULL,
  \`activity_id\` varchar(50) NOT NULL,
  \`student_id\` varchar(50) NOT NULL,
  \`score\` decimal(5,2) DEFAULT NULL,
  \`delivered_on_time\` varchar(50) NOT NULL DEFAULT 'yes',
  \`comments\` text DEFAULT NULL,
  \`feedback_date\` datetime DEFAULT NULL,
  \`notified_whatsapp\` tinyint(1) NOT NULL DEFAULT '0',
  \`notified_at\` datetime DEFAULT NULL,
  \`attachments_json\` longtext DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_nota_actividad_estudiante\` (\`activity_id\`,\`student_id\`),
  KEY \`idx_calif_activity_id\` (\`activity_id\`),
  KEY \`idx_calif_student_id\` (\`student_id\`),
  CONSTRAINT \`fk_calificaciones_actividad\` FOREIGN KEY (\`activity_id\`) REFERENCES \`actividades\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk_calificaciones_estudiante\` FOREIGN KEY (\`student_id\`) REFERENCES \`estudiantes\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLA: configuracion_materias (Subject Evaluation Weighting Configs)
-- ------------------------------------------------------------------------------
${dropClause('configuracion_materias')}${tableCreate('configuracion_materias')} (
  \`id\` varchar(50) NOT NULL,
  \`group_id\` varchar(50) NOT NULL,
  \`subject_name\` varchar(150) NOT NULL,
  \`categories_json\` longtext DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_config_materia_grupo\` (\`group_id\`,\`subject_name\`),
  KEY \`idx_config_mat_group_id\` (\`group_id\`),
  CONSTRAINT \`fk_config_materias_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABLA: nivelaciones_remediales (Period Remedial & Recovery Records)
-- ------------------------------------------------------------------------------
${dropClause('nivelaciones_remediales')}${tableCreate('nivelaciones_remediales')} (
  \`id\` varchar(50) NOT NULL,
  \`student_id\` varchar(50) NOT NULL,
  \`group_id\` varchar(50) NOT NULL,
  \`subject\` varchar(150) NOT NULL,
  \`period\` varchar(50) NOT NULL,
  \`academic_year\` varchar(20) DEFAULT '2026',
  \`teacher_id\` varchar(50) DEFAULT NULL,
  \`teacher_name\` varchar(255) DEFAULT '',
  \`requires_remedial\` tinyint(1) NOT NULL DEFAULT '1',
  \`failing_score\` decimal(5,2) DEFAULT NULL,
  \`failing_reason\` text DEFAULT NULL,
  \`work_delivered\` tinyint(1) NOT NULL DEFAULT '0',
  \`work_delivered_date\` date DEFAULT NULL,
  \`work_score\` decimal(5,2) DEFAULT NULL,
  \`support_score\` decimal(5,2) DEFAULT NULL,
  \`final_score\` decimal(5,2) DEFAULT NULL,
  \`is_passed\` tinyint(1) NOT NULL DEFAULT '0',
  \`work_drive_link\` text DEFAULT NULL,
  \`support_drive_link\` text DEFAULT NULL,
  \`work_attachment_json\` longtext DEFAULT NULL,
  \`support_attachment_json\` longtext DEFAULT NULL,
  \`observations\` text DEFAULT NULL,
  \`notified_whatsapp\` tinyint(1) NOT NULL DEFAULT '0',
  \`notified_at\` datetime DEFAULT NULL,
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_remedial_student_id\` (\`student_id\`),
  KEY \`idx_remedial_group_id\` (\`group_id\`),
  KEY \`idx_remedial_period\` (\`period\`),
  CONSTRAINT \`fk_nivelaciones_estudiante\` FOREIGN KEY (\`student_id\`) REFERENCES \`estudiantes\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk_nivelaciones_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABLA: diario_clase (Pedagogical Daily Logs)
-- ------------------------------------------------------------------------------
${dropClause('diario_clase')}${tableCreate('diario_clase')} (
  \`id\` varchar(50) NOT NULL,
  \`group_id\` varchar(50) NOT NULL,
  \`teacher_id\` varchar(50) NOT NULL,
  \`teacher_name\` varchar(255) DEFAULT '',
  \`subject\` varchar(150) NOT NULL,
  \`date\` date NOT NULL,
  \`period\` varchar(50) NOT NULL DEFAULT 'Periodo 1',
  \`topic\` varchar(255) NOT NULL,
  \`objective\` text DEFAULT NULL,
  \`activities_description\` longtext NOT NULL,
  \`tasks_assigned\` text DEFAULT NULL,
  \`pedagogical_agreements\` text DEFAULT NULL,
  \`resources_used\` text DEFAULT NULL,
  \`attendance_summary_json\` longtext DEFAULT NULL,
  \`attachments_json\` longtext DEFAULT NULL,
  \`created_at\` date DEFAULT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_diario_group_id\` (\`group_id\`),
  KEY \`idx_diario_teacher_id\` (\`teacher_id\`),
  KEY \`idx_diario_date\` (\`date\`),
  CONSTRAINT \`fk_diario_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. TABLA: horarios_clase (Teacher & Group Class Schedules)
-- ------------------------------------------------------------------------------
${dropClause('horarios_clase')}${tableCreate('horarios_clase')} (
  \`id\` varchar(50) NOT NULL,
  \`day\` enum('monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  \`start_time\` varchar(10) NOT NULL,
  \`end_time\` varchar(10) NOT NULL,
  \`group_id\` varchar(50) NOT NULL,
  \`subject\` varchar(150) NOT NULL,
  \`teacher_id\` varchar(50) NOT NULL,
  \`teacher_name\` varchar(255) DEFAULT '',
  \`classroom_or_lab\` varchar(100) DEFAULT '',
  \`notes\` text DEFAULT NULL,
  \`color\` varchar(50) DEFAULT 'indigo',
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_horario_day\` (\`day\`),
  KEY \`idx_horario_group_id\` (\`group_id\`),
  KEY \`idx_horario_teacher_id\` (\`teacher_id\`),
  CONSTRAINT \`fk_horarios_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. TABLA: grupos_trabajo_abp (ABP Collaborative Workgroups)
-- ------------------------------------------------------------------------------
${dropClause('grupos_trabajo_abp')}${tableCreate('grupos_trabajo_abp')} (
  \`id\` varchar(50) NOT NULL,
  \`group_id\` varchar(50) NOT NULL,
  \`subject\` varchar(150) DEFAULT '',
  \`period\` varchar(50) DEFAULT 'Periodo 1',
  \`title\` varchar(255) NOT NULL,
  \`description\` text DEFAULT NULL,
  \`teams_json\` longtext NOT NULL,
  \`custom_roles_json\` longtext DEFAULT NULL,
  \`created_at\` date DEFAULT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_abp_group_id\` (\`group_id\`),
  CONSTRAINT \`fk_abp_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. TABLA: planos_asientos (Seating Charts & Lab Layouts)
-- ------------------------------------------------------------------------------
${dropClause('planos_asientos')}${tableCreate('planos_asientos')} (
  \`id\` varchar(50) NOT NULL,
  \`group_id\` varchar(50) NOT NULL,
  \`classroom_json\` longtext NOT NULL,
  \`laboratory_json\` longtext NOT NULL,
  \`last_updated\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_plano_grupo\` (\`group_id\`),
  CONSTRAINT \`fk_planos_grupo\` FOREIGN KEY (\`group_id\`) REFERENCES \`grupos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. TABLA: log_notificaciones (WhatsApp Dispatch & Notification History)
-- ------------------------------------------------------------------------------
${dropClause('log_notificaciones')}${tableCreate('log_notificaciones')} (
  \`id\` varchar(50) NOT NULL,
  \`student_id\` varchar(50) NOT NULL,
  \`student_name\` varchar(255) NOT NULL,
  \`group_id\` varchar(50) DEFAULT NULL,
  \`group_name\` varchar(100) DEFAULT '',
  \`guardian_name\` varchar(255) NOT NULL,
  \`phone\` varchar(50) NOT NULL,
  \`type\` varchar(50) NOT NULL,
  \`message\` longtext NOT NULL,
  \`timestamp\` datetime NOT NULL,
  \`status\` enum('sent','pending','failed') NOT NULL DEFAULT 'sent',
  \`method\` varchar(50) NOT NULL DEFAULT 'wa_link',
  \`teacher_id\` varchar(50) DEFAULT NULL,
  \`teacher_name\` varchar(255) DEFAULT '',
  PRIMARY KEY (\`id\`),
  KEY \`idx_log_timestamp\` (\`timestamp\`),
  KEY \`idx_log_student_id\` (\`student_id\`),
  KEY \`idx_log_phone\` (\`phone\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. VISTAS SQL ÚTILES PARA CONSULTAS Y REPORTES EN WAMP / PHPMYADMIN
-- ------------------------------------------------------------------------------

-- Vista de resumen de asistencia por estudiante
CREATE OR REPLACE VIEW \`vista_resumen_asistencia_estudiantes\` AS
SELECT 
    e.id AS estudiante_id,
    e.document_id AS documento,
    CONCAT(e.first_name, ' ', e.last_name) AS nombre_completo,
    g.name AS grupo_nombre,
    g.grade AS grado,
    COUNT(a.id) AS total_sesiones,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS total_presentes,
    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS total_retardos,
    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS total_inasistencias,
    SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS total_excusas,
    SUM(CASE WHEN a.uniform_status != 'complete' THEN 1 ELSE 0 END) AS total_novedades_uniforme
FROM \`estudiantes\` e
LEFT JOIN \`grupos\` g ON e.group_id = g.id
LEFT JOIN \`asistencias\` a ON e.id = a.student_id
GROUP BY e.id, g.id;

-- Vista de calificaciones y promedios por estudiante y asignatura
CREATE OR REPLACE VIEW \`vista_promedios_asignatura\` AS
SELECT 
    e.id AS estudiante_id,
    CONCAT(e.first_name, ' ', e.last_name) AS estudiante_nombre,
    g.name AS grupo_nombre,
    act.subject AS asignatura,
    act.period AS periodo,
    COUNT(c.id) AS actividades_calificadas,
    ROUND(AVG(c.score), 2) AS promedio_simple,
    ROUND(SUM(c.score * (act.weight_percentage / 100)) / (SUM(act.weight_percentage) / 100), 2) AS promedio_ponderado
FROM \`estudiantes\` e
JOIN \`grupos\` g ON e.group_id = g.id
JOIN \`actividades\` act ON g.id = act.group_id
LEFT JOIN \`calificaciones\` c ON act.id = c.activity_id AND e.id = c.student_id
WHERE c.score IS NOT NULL
GROUP BY e.id, g.id, act.subject, act.period;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
`;
};

/**
 * Generates a full SQL Dump with INSERT statements for all existing live data
 */
export const generateFullDatabaseDumpSQL = (data: {
  teachers?: Teacher[];
  groups?: Group[];
  students?: Student[];
  attendance?: AttendanceRecord[];
  activities?: Activity[];
  grades?: GradeRecord[];
  settings?: SchoolSettings;
  subjectConfigs?: SubjectConfig[];
  remedials?: RemedialRecord[];
  dailyLogs?: ClassDailyLog[];
  schedules?: ScheduleTimeSlot[];
  workGroups?: WorkGroupSet[];
  seatingPlans?: GroupSeatingPlan[];
  notifications?: NotificationLog[];
  databaseName?: string;
  dropExisting?: boolean;
}): string => {
  const dbName = data.databaseName || 'registro_academico_fleon';
  let sql = generateWampMysqlSchemaSQL(dbName, data.dropExisting ?? false);

  sql += `\n-- ==============================================================================
-- INSERTANDO DATOS ACTUALES DEL SISTEMA
-- ==============================================================================\n\n`;

  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // 1. Settings
  if (data.settings && Object.keys(data.settings).length > 0) {
    const s = data.settings;
    sql += `-- 1. Configuración Institucional\n`;
    sql += `INSERT INTO \`configuracion_institucional\` (
  \`id\`, \`school_name\`, \`teacher_name\`, \`school_year\`, \`current_period\`, 
  \`default_country_code\`, \`grading_scale\`, \`min_passing_score\`, \`passing_score\`, 
  \`admin_password\`, \`admin_recovery_email\`, \`auto_open_whatsapp\`, \`instant_whatsapp_on_attendance\`, 
  \`attendance_template\`, \`late_template\`, \`absent_template\`, \`uniform_template\`, 
  \`grade_template\`, \`daily_digest_template\`, \`institution_subjects_json\`, 
  \`attendance_novelties_json\`, \`uniform_tags_json\`, \`evaluation_categories_json\`, 
  \`periods_json\`, \`db_config_json\`
) VALUES (
  'primary_settings',
  ${escapeSqlString(s.schoolName || 'Institución Educativa')},
  ${escapeSqlString(s.teacherName || 'Docente')},
  ${escapeSqlString(s.schoolYear || '2026')},
  ${escapeSqlString(s.currentPeriod || 'Periodo 1')},
  ${escapeSqlString(s.defaultCountryCode || '+57')},
  ${escapeSqlString(s.gradingScale || '1-5')},
  ${s.minPassingScore || s.passingScore || 3.5},
  ${s.passingScore || s.minPassingScore || 3.5},
  ${escapeSqlString(s.adminPassword || 'admin123')},
  ${escapeSqlString(s.adminRecoveryEmail || '')},
  ${s.autoOpenWhatsApp ? 1 : 0},
  ${s.instantWhatsAppOnAttendance ? 1 : 0},
  ${escapeSqlString(s.attendanceTemplate || '')},
  ${escapeSqlString(s.lateTemplate || '')},
  ${escapeSqlString(s.absentTemplate || '')},
  ${escapeSqlString(s.uniformTemplate || '')},
  ${escapeSqlString(s.gradeTemplate || '')},
  ${escapeSqlString(s.dailyDigestTemplate || '')},
  ${escapeSqlString(s.institutionSubjects || [])},
  ${escapeSqlString(s.attendanceNovelties || [])},
  ${escapeSqlString(s.uniformTags || [])},
  ${escapeSqlString(s.evaluationCategories || [])},
  ${escapeSqlString(s.periods || [])},
  ${escapeSqlString(s.dbConfig || null)}
) ON DUPLICATE KEY UPDATE 
  \`school_name\` = VALUES(\`school_name\`),
  \`teacher_name\` = VALUES(\`teacher_name\`),
  \`current_period\` = VALUES(\`current_period\`),
  \`institution_subjects_json\` = VALUES(\`institution_subjects_json\`),
  \`attendance_novelties_json\` = VALUES(\`attendance_novelties_json\`),
  \`evaluation_categories_json\` = VALUES(\`evaluation_categories_json\`),
  \`periods_json\` = VALUES(\`periods_json\`);\n\n`;
  }

  // 2. Teachers
  if (data.teachers && data.teachers.length > 0) {
    sql += `-- 2. Docentes (${data.teachers.length} registros)\n`;
    const teacherRows = data.teachers.map((t) => {
      return `(
  ${escapeSqlString(t.id)},
  ${escapeSqlString(t.name)},
  ${escapeSqlString(t.email || '')},
  ${escapeSqlString(t.documentId || '')},
  ${escapeSqlString(t.phone || '')},
  ${escapeSqlString(t.specialty || '')},
  ${escapeSqlString(t.role || 'teacher')},
  ${escapeSqlString(t.status || 'active')},
  ${escapeSqlString(t.password || 'docente123')},
  ${escapeSqlString(t.avatarColor || 'bg-indigo-600')},
  ${escapeSqlString(t.assignedGroupIds || [])},
  ${escapeSqlString(t.assignedGrades || [])},
  ${escapeSqlString(t.assignedSubjects || [])},
  ${escapeSqlString(t.assignments || [])},
  ${escapeSqlString(t.createdAt || new Date().toISOString().split('T')[0])}
)`;
    });
    sql += `INSERT INTO \`docentes\` (
  \`id\`, \`name\`, \`email\`, \`document_id\`, \`phone\`, \`specialty\`, 
  \`role\`, \`status\`, \`password\`, \`avatar_color\`, \`assigned_group_ids_json\`, 
  \`assigned_grades_json\`, \`assigned_subjects_json\`, \`assignments_json\`, \`created_at\`
) VALUES \n${teacherRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`email\`=VALUES(\`email\`), \`phone\`=VALUES(\`phone\`), \`specialty\`=VALUES(\`specialty\`);\n\n`;
  }

  // 3. Groups
  if (data.groups && data.groups.length > 0) {
    sql += `-- 3. Grupos y Cursos (${data.groups.length} registros)\n`;
    const groupRows = data.groups.map((g) => {
      return `(
  ${escapeSqlString(g.id)},
  ${escapeSqlString(g.name)},
  ${escapeSqlString(g.grade || '10°')},
  ${escapeSqlString(g.section || '')},
  ${escapeSqlString(g.schoolYear || '2026')},
  ${escapeSqlString(g.shift || 'Mañana')},
  ${escapeSqlString(g.directorName || g.teacherName || '')},
  ${escapeSqlString(g.teacherName || g.directorName || '')},
  ${escapeSqlString(g.teacherId || null)},
  ${escapeSqlString(g.room || '')},
  ${escapeSqlString(g.subjects || [])},
  ${escapeSqlString(g.assignedTeacherIds || [])},
  ${escapeSqlString(g.createdByTeacherId || null)},
  ${escapeSqlString(g.createdAt || new Date().toISOString().split('T')[0])}
)`;
    });
    sql += `INSERT INTO \`grupos\` (
  \`id\`, \`name\`, \`grade\`, \`section\`, \`school_year\`, \`shift\`, 
  \`director_name\`, \`teacher_name\`, \`teacher_id\`, \`room\`, 
  \`subjects_json\`, \`assigned_teacher_ids_json\`, \`created_by_teacher_id\`, \`created_at\`
) VALUES \n${groupRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`grade\`=VALUES(\`grade\`), \`subjects_json\`=VALUES(\`subjects_json\`);\n\n`;
  }

  // 4. Students
  if (data.students && data.students.length > 0) {
    sql += `-- 4. Estudiantes (${data.students.length} registros)\n`;
    const studentRows = data.students.map((st) => {
      return `(
  ${escapeSqlString(st.id)},
  ${escapeSqlString(st.documentId || '')},
  ${escapeSqlString(st.firstName || '')},
  ${escapeSqlString(st.lastName || '')},
  ${escapeSqlString(st.groupId)},
  ${escapeSqlString(st.email || '')},
  ${escapeSqlString(st.guardianName || 'Acudiente')},
  ${escapeSqlString(st.guardianPhone || '')},
  ${escapeSqlString(st.guardianCountryCode || '+57')},
  ${escapeSqlString(st.guardianEmail || '')},
  ${escapeSqlString(st.guardianRelationship || 'Madre')},
  ${escapeSqlString(st.status || 'active')},
  ${escapeSqlString(st.observations || '')},
  ${escapeSqlString(st.avatarColor || 'bg-indigo-500')},
  ${escapeSqlString(st.gender || 'M')},
  ${escapeSqlString(st.createdByTeacherId || null)}
)`;
    });
    sql += `INSERT INTO \`estudiantes\` (
  \`id\`, \`document_id\`, \`first_name\`, \`last_name\`, \`group_id\`, \`email\`, 
  \`guardian_name\`, \`guardian_phone\`, \`guardian_country_code\`, \`guardian_email\`, 
  \`guardian_relationship\`, \`status\`, \`observations\`, \`avatar_color\`, 
  \`gender\`, \`created_by_teacher_id\`
) VALUES \n${studentRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`first_name\`=VALUES(\`first_name\`), \`last_name\`=VALUES(\`last_name\`), \`guardian_phone\`=VALUES(\`guardian_phone\`), \`group_id\`=VALUES(\`group_id\`);\n\n`;
  }

  // 5. Subject Configs
  if (data.subjectConfigs && data.subjectConfigs.length > 0) {
    sql += `-- 5. Ponderación de Asignaturas (${data.subjectConfigs.length} registros)\n`;
    const configRows = data.subjectConfigs.map((sc) => {
      return `(
  ${escapeSqlString(sc.id || `sc-${Date.now()}`)},
  ${escapeSqlString(sc.groupId)},
  ${escapeSqlString(sc.subjectName)},
  ${escapeSqlString(sc.categories || [])}
)`;
    });
    sql += `INSERT INTO \`configuracion_materias\` (
  \`id\`, \`group_id\`, \`subject_name\`, \`categories_json\`
) VALUES \n${configRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`categories_json\`=VALUES(\`categories_json\`);\n\n`;
  }

  // 6. Attendance
  if (data.attendance && data.attendance.length > 0) {
    sql += `-- 6. Asistencias y Novedades (${data.attendance.length} registros)\n`;
    const attendanceBatches: string[] = [];
    // Chunk in batches of 200 rows for high performance
    for (let i = 0; i < data.attendance.length; i += 200) {
      const slice = data.attendance.slice(i, i + 200);
      const rows = slice.map((a) => {
        return `(
  ${escapeSqlString(a.id || `att-${a.studentId}-${a.date}`)},
  ${escapeSqlString(a.date)},
  ${escapeSqlString(a.groupId)},
  ${escapeSqlString(a.studentId)},
  ${escapeSqlString(a.status || 'present')},
  ${a.lateMinutes || 0},
  ${escapeSqlString(a.uniformStatus || 'complete')},
  ${escapeSqlString(a.uniformNotes || '')},
  ${escapeSqlString(a.excuseReason || '')},
  ${escapeSqlString(a.observations || '')},
  ${a.notifiedWhatsApp ? 1 : 0},
  ${a.notifiedAt ? escapeSqlString(a.notifiedAt) : 'NULL'}
)`;
      });
      attendanceBatches.push(`INSERT INTO \`asistencias\` (
  \`id\`, \`date\`, \`group_id\`, \`student_id\`, \`status\`, \`late_minutes\`, 
  \`uniform_status\`, \`uniform_notes\`, \`excuse_reason\`, \`observations\`, 
  \`notified_whatsapp\`, \`notified_at\`
) VALUES \n${rows.join(',\n')}\nON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`), \`late_minutes\`=VALUES(\`late_minutes\`), \`uniform_status\`=VALUES(\`uniform_status\`), \`observations\`=VALUES(\`observations\`);`);
    }
    sql += attendanceBatches.join('\n\n') + '\n\n';
  }

  // 7. Activities
  if (data.activities && data.activities.length > 0) {
    sql += `-- 7. Actividades Académicas (${data.activities.length} registros)\n`;
    const actRows = data.activities.map((ac) => {
      return `(
  ${escapeSqlString(ac.id)},
  ${escapeSqlString(ac.groupId)},
  ${escapeSqlString(ac.subject)},
  ${escapeSqlString(ac.title)},
  ${escapeSqlString(ac.description || '')},
  ${escapeSqlString(ac.assignedDate)},
  ${escapeSqlString(ac.dueDate)},
  ${ac.maxScore || 5.0},
  ${ac.passingScore || 3.5},
  ${ac.weightPercentage || 20.0},
  ${escapeSqlString(ac.type || 'taller')},
  ${escapeSqlString(ac.period || 'Periodo 1')},
  ${escapeSqlString(ac.categoryId || null)},
  ${escapeSqlString(ac.createdByTeacherId || null)},
  ${escapeSqlString(ac.assignedTeacherId || null)},
  ${escapeSqlString(ac.attachments || [])}
)`;
    });
    sql += `INSERT INTO \`actividades\` (
  \`id\`, \`group_id\`, \`subject\`, \`title\`, \`description\`, 
  \`assigned_date\`, \`due_date\`, \`max_score\`, \`passing_score\`, \`weight_percentage\`, 
  \`type\`, \`period\`, \`category_id\`, \`created_by_teacher_id\`, \`assigned_teacher_id\`, 
  \`attachments_json\`
) VALUES \n${actRows.join(',\n')}\nON DUPLICATE KEY UPDATE 
  \`group_id\`=VALUES(\`group_id\`),
  \`subject\`=VALUES(\`subject\`),
  \`title\`=VALUES(\`title\`),
  \`description\`=VALUES(\`description\`),
  \`assigned_date\`=VALUES(\`assigned_date\`),
  \`due_date\`=VALUES(\`due_date\`),
  \`max_score\`=VALUES(\`max_score\`),
  \`passing_score\`=VALUES(\`passing_score\`),
  \`weight_percentage\`=VALUES(\`weight_percentage\`),
  \`type\`=VALUES(\`type\`),
  \`period\`=VALUES(\`period\`),
  \`category_id\`=VALUES(\`category_id\`),
  \`assigned_teacher_id\`=VALUES(\`assigned_teacher_id\`),
  \`attachments_json\`=VALUES(\`attachments_json\`);\n\n`;
  }

  // 8. Grades
  if (data.grades && data.grades.length > 0) {
    sql += `-- 8. Calificaciones (${data.grades.length} registros)\n`;
    const gradeBatches: string[] = [];
    for (let i = 0; i < data.grades.length; i += 200) {
      const slice = data.grades.slice(i, i + 200);
      const rows = slice.map((g) => {
        return `(
  ${escapeSqlString(g.id || `grd-${g.activityId}-${g.studentId}`)},
  ${escapeSqlString(g.activityId)},
  ${escapeSqlString(g.studentId)},
  ${g.score !== null && g.score !== undefined ? g.score : 'NULL'},
  ${escapeSqlString(g.deliveredOnTime || 'yes')},
  ${escapeSqlString(g.comments || '')},
  ${g.feedbackDate ? escapeSqlString(g.feedbackDate) : 'NULL'},
  ${g.notifiedWhatsApp ? 1 : 0},
  ${g.notifiedAt ? escapeSqlString(g.notifiedAt) : 'NULL'},
  ${escapeSqlString(g.attachments || [])}
)`;
      });
      gradeBatches.push(`INSERT INTO \`calificaciones\` (
  \`id\`, \`activity_id\`, \`student_id\`, \`score\`, \`delivered_on_time\`, 
  \`comments\`, \`feedback_date\`, \`notified_whatsapp\`, \`notified_at\`, 
  \`attachments_json\`
) VALUES \n${rows.join(',\n')}\nON DUPLICATE KEY UPDATE 
  \`score\`=VALUES(\`score\`), 
  \`delivered_on_time\`=VALUES(\`delivered_on_time\`), 
  \`comments\`=VALUES(\`comments\`),
  \`feedback_date\`=VALUES(\`feedback_date\`),
  \`notified_whatsapp\`=VALUES(\`notified_whatsapp\`),
  \`notified_at\`=VALUES(\`notified_at\`),
  \`attachments_json\`=VALUES(\`attachments_json\`);`);
    }
    sql += gradeBatches.join('\n\n') + '\n\n';
  }

  // 9. Remedials
  if (data.remedials && data.remedials.length > 0) {
    sql += `-- 9. Nivelaciones y Recuperaciones (${data.remedials.length} registros)\n`;
    const remRows = data.remedials.map((r) => {
      return `(
  ${escapeSqlString(r.id)},
  ${escapeSqlString(r.studentId)},
  ${escapeSqlString(r.groupId)},
  ${escapeSqlString(r.subject)},
  ${escapeSqlString(r.period)},
  ${escapeSqlString(r.academicYear || '2026')},
  ${escapeSqlString(r.teacherId || null)},
  ${escapeSqlString(r.teacherName || '')},
  ${r.requiresRemedial ? 1 : 0},
  ${r.failingScore !== null && r.failingScore !== undefined ? r.failingScore : 'NULL'},
  ${escapeSqlString(r.failingReason || '')},
  ${r.workDelivered ? 1 : 0},
  ${r.workDeliveredDate ? escapeSqlString(r.workDeliveredDate) : 'NULL'},
  ${r.workScore !== null && r.workScore !== undefined ? r.workScore : 'NULL'},
  ${r.supportScore !== null && r.supportScore !== undefined ? r.supportScore : 'NULL'},
  ${r.finalScore !== null && r.finalScore !== undefined ? r.finalScore : 'NULL'},
  ${r.isPassed ? 1 : 0},
  ${escapeSqlString(r.workDriveLink || '')},
  ${escapeSqlString(r.supportDriveLink || '')},
  ${escapeSqlString(r.workAttachment || null)},
  ${escapeSqlString(r.supportAttachment || null)},
  ${escapeSqlString(r.observations || '')},
  ${r.notifiedWhatsApp ? 1 : 0},
  ${r.notifiedAt ? escapeSqlString(r.notifiedAt) : 'NULL'}
)`;
    });
    sql += `INSERT INTO \`nivelaciones_remediales\` (
  \`id\`, \`student_id\`, \`group_id\`, \`subject\`, \`period\`, \`academic_year\`, 
  \`teacher_id\`, \`teacher_name\`, \`requires_remedial\`, \`failing_score\`, 
  \`failing_reason\`, \`work_delivered\`, \`work_delivered_date\`, \`work_score\`, 
  \`support_score\`, \`final_score\`, \`is_passed\`, \`work_drive_link\`, 
  \`support_drive_link\`, \`work_attachment_json\`, \`support_attachment_json\`, 
  \`observations\`, \`notified_whatsapp\`, \`notified_at\`
) VALUES \n${remRows.join(',\n')}\nON DUPLICATE KEY UPDATE 
  \`work_score\`=VALUES(\`work_score\`),
  \`support_score\`=VALUES(\`support_score\`),
  \`final_score\`=VALUES(\`final_score\`),
  \`work_delivered\`=VALUES(\`work_delivered\`),
  \`work_delivered_date\`=VALUES(\`work_delivered_date\`),
  \`requires_remedial\`=VALUES(\`requires_remedial\`),
  \`failing_score\`=VALUES(\`failing_score\`),
  \`failing_reason\`=VALUES(\`failing_reason\`),
  \`is_passed\`=VALUES(\`is_passed\`),
  \`work_drive_link\`=VALUES(\`work_drive_link\`),
  \`support_drive_link\`=VALUES(\`support_drive_link\`),
  \`work_attachment_json\`=VALUES(\`work_attachment_json\`),
  \`support_attachment_json\`=VALUES(\`support_attachment_json\`),
  \`observations\`=VALUES(\`observations\`),
  \`notified_whatsapp\`=VALUES(\`notified_whatsapp\`),
  \`notified_at\`=VALUES(\`notified_at\`);\n\n`;
  }

  // 10. Daily Logs
  if (data.dailyLogs && data.dailyLogs.length > 0) {
    sql += `-- 10. Diario de Clase / Bitácora Pedagógica (${data.dailyLogs.length} registros)\n`;
    const logRows = data.dailyLogs.map((dl) => {
      return `(
  ${escapeSqlString(dl.id)},
  ${escapeSqlString(dl.groupId)},
  ${escapeSqlString(dl.teacherId)},
  ${escapeSqlString(dl.teacherName || '')},
  ${escapeSqlString(dl.subject)},
  ${escapeSqlString(dl.date)},
  ${escapeSqlString(dl.period || 'Periodo 1')},
  ${escapeSqlString(dl.topic)},
  ${escapeSqlString(dl.objective || '')},
  ${escapeSqlString(dl.activitiesDescription)},
  ${escapeSqlString(dl.tasksAssigned || '')},
  ${escapeSqlString(dl.pedagogicalAgreements || '')},
  ${escapeSqlString(dl.resourcesUsed || '')},
  ${escapeSqlString(dl.attendanceSummary || null)},
  ${escapeSqlString(dl.attachments || [])}
)`;
    });
    sql += `INSERT INTO \`diario_clase\` (
  \`id\`, \`group_id\`, \`teacher_id\`, \`teacher_name\`, \`subject\`, 
  \`date\`, \`period\`, \`topic\`, \`objective\`, \`activities_description\`, 
  \`tasks_assigned\`, \`pedagogical_agreements\`, \`resources_used\`, 
  \`attendance_summary_json\`, \`attachments_json\`
) VALUES \n${logRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`topic\`=VALUES(\`topic\`), \`activities_description\`=VALUES(\`activities_description\`);\n\n`;
  }

  // 11. Schedules
  if (data.schedules && data.schedules.length > 0) {
    sql += `-- 11. Horarios de Clase (${data.schedules.length} registros)\n`;
    const schedRows = data.schedules.map((sc) => {
      return `(
  ${escapeSqlString(sc.id)},
  ${escapeSqlString(sc.day)},
  ${escapeSqlString(sc.startTime)},
  ${escapeSqlString(sc.endTime)},
  ${escapeSqlString(sc.groupId)},
  ${escapeSqlString(sc.subject)},
  ${escapeSqlString(sc.teacherId)},
  ${escapeSqlString(sc.teacherName || '')},
  ${escapeSqlString(sc.classroomOrLab || '')},
  ${escapeSqlString(sc.notes || '')},
  ${escapeSqlString(sc.color || 'indigo')}
)`;
    });
    sql += `INSERT INTO \`horarios_clase\` (
  \`id\`, \`day\`, \`start_time\`, \`end_time\`, \`group_id\`, 
  \`subject\`, \`teacher_id\`, \`teacher_name\`, \`classroom_or_lab\`, 
  \`notes\`, \`color\`
) VALUES \n${schedRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`subject\`=VALUES(\`subject\`), \`classroom_or_lab\`=VALUES(\`classroom_or_lab\`);\n\n`;
  }

  // 12. Workgroup Sets (ABP)
  if (data.workGroups && data.workGroups.length > 0) {
    sql += `-- 12. Grupos de Trabajo Colaborativo ABP (${data.workGroups.length} registros)\n`;
    const wgRows = data.workGroups.map((wg) => {
      return `(
  ${escapeSqlString(wg.id)},
  ${escapeSqlString(wg.groupId)},
  ${escapeSqlString(wg.subject || '')},
  ${escapeSqlString(wg.period || 'Periodo 1')},
  ${escapeSqlString(wg.title)},
  ${escapeSqlString(wg.description || '')},
  ${escapeSqlString(wg.teams || [])},
  ${escapeSqlString(wg.customRoles || [])}
)`;
    });
    sql += `INSERT INTO \`grupos_trabajo_abp\` (
  \`id\`, \`group_id\`, \`subject\`, \`period\`, \`title\`, \`description\`, 
  \`teams_json\`, \`custom_roles_json\`
) VALUES \n${wgRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`teams_json\`=VALUES(\`teams_json\`);\n\n`;
  }

  // 13. Seating Plans
  if (data.seatingPlans && data.seatingPlans.length > 0) {
    sql += `-- 13. Planos de Asientos y Laboratorios (${data.seatingPlans.length} registros)\n`;
    const spRows = data.seatingPlans.map((sp) => {
      return `(
  ${escapeSqlString(sp.id || `seat-${sp.groupId}`)},
  ${escapeSqlString(sp.groupId)},
  ${escapeSqlString(sp.classroom)},
  ${escapeSqlString(sp.laboratory)}
)`;
    });
    sql += `INSERT INTO \`planos_asientos\` (
  \`id\`, \`group_id\`, \`classroom_json\`, \`laboratory_json\`
) VALUES \n${spRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`classroom_json\`=VALUES(\`classroom_json\`), \`laboratory_json\`=VALUES(\`laboratory_json\`);\n\n`;
  }

  // 14. Notification Logs
  if (data.notifications && data.notifications.length > 0) {
    sql += `-- 14. Logs de Notificaciones WhatsApp (${data.notifications.length} registros)\n`;
    const notifRows = data.notifications.map((nl) => {
      return `(
  ${escapeSqlString(nl.id)},
  ${escapeSqlString(nl.studentId)},
  ${escapeSqlString(nl.studentName)},
  ${escapeSqlString(nl.groupId || null)},
  ${escapeSqlString(nl.groupName || '')},
  ${escapeSqlString(nl.guardianName)},
  ${escapeSqlString(nl.phone)},
  ${escapeSqlString(nl.type)},
  ${escapeSqlString(nl.message)},
  ${escapeSqlString(nl.timestamp || new Date().toISOString())},
  ${escapeSqlString(nl.status || 'sent')},
  ${escapeSqlString(nl.method || 'wa_link')},
  ${escapeSqlString(nl.teacherId || null)},
  ${escapeSqlString(nl.teacherName || '')}
)`;
    });
    sql += `INSERT INTO \`log_notificaciones\` (
  \`id\`, \`student_id\`, \`student_name\`, \`group_id\`, \`group_name\`, 
  \`guardian_name\`, \`phone\`, \`type\`, \`message\`, \`timestamp\`, 
  \`status\`, \`method\`, \`teacher_id\`, \`teacher_name\`
) VALUES \n${notifRows.join(',\n')}\nON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`);\n\n`;
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\nCOMMIT;\n\n-- Fin del script de migración para WAMP Server.\n`;

  return sql;
};

/**
 * Triggers file download in the browser
 */
export const downloadSqlFile = (filename: string, text: string) => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:application/sql;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
