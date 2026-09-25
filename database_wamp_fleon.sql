-- ==============================================================================
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
CREATE DATABASE IF NOT EXISTS `registro_academico_fleon` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `registro_academico_fleon`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABLA: configuracion_institucional (School Settings & WhatsApp Templates)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `configuracion_institucional`;
CREATE TABLE `configuracion_institucional` (
  `id` varchar(50) NOT NULL DEFAULT 'primary_settings',
  `school_name` varchar(255) NOT NULL DEFAULT 'Institución Educativa Departamental',
  `teacher_name` varchar(255) NOT NULL DEFAULT 'Docente Titular',
  `school_year` varchar(20) NOT NULL DEFAULT '2026',
  `current_period` varchar(50) NOT NULL DEFAULT 'Periodo 1',
  `default_country_code` varchar(10) NOT NULL DEFAULT '+57',
  `grading_scale` varchar(20) NOT NULL DEFAULT '1-5',
  `min_passing_score` decimal(4,2) DEFAULT '3.00',
  `passing_score` decimal(4,2) DEFAULT '3.00',
  `admin_password` varchar(255) DEFAULT 'admin123',
  `admin_recovery_email` varchar(255) DEFAULT '',
  `auto_open_whatsapp` tinyint(1) NOT NULL DEFAULT '0',
  `instant_whatsapp_on_attendance` tinyint(1) NOT NULL DEFAULT '0',
  `attendance_template` text DEFAULT NULL,
  `late_template` text DEFAULT NULL,
  `absent_template` text DEFAULT NULL,
  `uniform_template` text DEFAULT NULL,
  `grade_template` text DEFAULT NULL,
  `daily_digest_template` text DEFAULT NULL,
  `institution_subjects_json` longtext DEFAULT NULL,
  `attendance_novelties_json` longtext DEFAULT NULL,
  `uniform_tags_json` longtext DEFAULT NULL,
  `evaluation_categories_json` longtext DEFAULT NULL,
  `periods_json` longtext DEFAULT NULL,
  `db_config_json` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABLA: docentes (Teachers & Coordinators)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `docentes`;
CREATE TABLE `docentes` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT '',
  `document_id` varchar(50) NOT NULL,
  `phone` varchar(50) DEFAULT '',
  `specialty` varchar(255) DEFAULT '',
  `role` enum('teacher','coordinator','admin') NOT NULL DEFAULT 'teacher',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `password` varchar(255) DEFAULT 'docente123',
  `avatar_color` varchar(50) DEFAULT 'bg-indigo-600',
  `assigned_group_ids_json` longtext DEFAULT NULL,
  `assigned_grades_json` longtext DEFAULT NULL,
  `assigned_subjects_json` longtext DEFAULT NULL,
  `assignments_json` longtext DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_docente_doc` (`document_id`),
  KEY `idx_docente_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLA: grupos (Classes & Courses)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `grupos`;
CREATE TABLE `grupos` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `grade` varchar(50) NOT NULL DEFAULT '10°',
  `section` varchar(50) DEFAULT '',
  `school_year` varchar(20) NOT NULL DEFAULT '2026',
  `shift` enum('Mañana','Tarde','Única','Nocturna') NOT NULL DEFAULT 'Mañana',
  `director_name` varchar(255) DEFAULT '',
  `teacher_name` varchar(255) DEFAULT '',
  `teacher_id` varchar(50) DEFAULT NULL,
  `room` varchar(50) DEFAULT '',
  `subjects_json` longtext DEFAULT NULL,
  `assigned_teacher_ids_json` longtext DEFAULT NULL,
  `created_by_teacher_id` varchar(50) DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grupo_grade` (`grade`),
  KEY `idx_grupo_teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLA: estudiantes (Students & Guardian Contacts)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `estudiantes`;
CREATE TABLE `estudiantes` (
  `id` varchar(50) NOT NULL,
  `document_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `group_id` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT '',
  `guardian_name` varchar(255) NOT NULL DEFAULT 'Acudiente',
  `guardian_phone` varchar(50) NOT NULL DEFAULT '',
  `guardian_country_code` varchar(10) NOT NULL DEFAULT '+57',
  `guardian_email` varchar(255) DEFAULT '',
  `guardian_relationship` varchar(50) NOT NULL DEFAULT 'Madre',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `observations` text DEFAULT NULL,
  `avatar_color` varchar(50) DEFAULT 'bg-indigo-500',
  `gender` enum('M','F','Otro') DEFAULT 'M',
  `created_by_teacher_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_estudiante_group_id` (`group_id`),
  KEY `idx_estudiante_doc` (`document_id`),
  KEY `idx_estudiante_phone` (`guardian_phone`),
  CONSTRAINT `fk_estudiantes_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABLA: asistencias (Attendance & Novelties Records)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `asistencias`;
CREATE TABLE `asistencias` (
  `id` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'present',
  `late_minutes` int(11) DEFAULT '0',
  `uniform_status` enum('complete','incomplete','none') NOT NULL DEFAULT 'complete',
  `uniform_notes` text DEFAULT NULL,
  `excuse_reason` text DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `notified_whatsapp` tinyint(1) NOT NULL DEFAULT '0',
  `notified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_asistencia_estudiante_dia` (`student_id`,`date`,`group_id`),
  KEY `idx_asistencia_fecha` (`date`),
  KEY `idx_asistencia_group_id` (`group_id`),
  KEY `idx_asistencia_student_id` (`student_id`),
  CONSTRAINT `fk_asistencias_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asistencias_estudiante` FOREIGN KEY (`student_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLA: actividades (Academic Activities & Tasks)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `actividades`;
CREATE TABLE `actividades` (
  `id` varchar(50) NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `subject` varchar(150) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `assigned_date` date NOT NULL,
  `due_date` date NOT NULL,
  `max_score` decimal(5,2) NOT NULL DEFAULT '5.00',
  `passing_score` decimal(5,2) NOT NULL DEFAULT '3.00',
  `weight_percentage` decimal(5,2) NOT NULL DEFAULT '20.00',
  `type` varchar(50) NOT NULL DEFAULT 'taller',
  `period` varchar(50) NOT NULL DEFAULT 'Periodo 1',
  `category_id` varchar(50) DEFAULT NULL,
  `created_by_teacher_id` varchar(50) DEFAULT NULL,
  `assigned_teacher_id` varchar(50) DEFAULT NULL,
  `attachments_json` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_actividad_group_id` (`group_id`),
  KEY `idx_actividad_subject` (`subject`),
  KEY `idx_actividad_period` (`period`),
  CONSTRAINT `fk_actividades_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABLA: calificaciones (Grades & Scores Records)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `calificaciones`;
CREATE TABLE `calificaciones` (
  `id` varchar(100) NOT NULL,
  `activity_id` varchar(50) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `delivered_on_time` varchar(50) NOT NULL DEFAULT 'yes',
  `comments` text DEFAULT NULL,
  `feedback_date` datetime DEFAULT NULL,
  `notified_whatsapp` tinyint(1) NOT NULL DEFAULT '0',
  `notified_at` datetime DEFAULT NULL,
  `attachments_json` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_nota_actividad_estudiante` (`activity_id`,`student_id`),
  KEY `idx_calif_activity_id` (`activity_id`),
  KEY `idx_calif_student_id` (`student_id`),
  CONSTRAINT `fk_calificaciones_actividad` FOREIGN KEY (`activity_id`) REFERENCES `actividades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_calificaciones_estudiante` FOREIGN KEY (`student_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLA: configuracion_materias (Subject Evaluation Weighting Configs)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `configuracion_materias`;
CREATE TABLE `configuracion_materias` (
  `id` varchar(50) NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `subject_name` varchar(150) NOT NULL,
  `categories_json` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_config_materia_grupo` (`group_id`,`subject_name`),
  KEY `idx_config_mat_group_id` (`group_id`),
  CONSTRAINT `fk_config_materias_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABLA: nivelaciones_remediales (Period Remedial & Recovery Records)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `nivelaciones_remediales`;
CREATE TABLE `nivelaciones_remediales` (
  `id` varchar(50) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `subject` varchar(150) NOT NULL,
  `period` varchar(50) NOT NULL,
  `academic_year` varchar(20) DEFAULT '2026',
  `teacher_id` varchar(50) DEFAULT NULL,
  `teacher_name` varchar(255) DEFAULT '',
  `requires_remedial` tinyint(1) NOT NULL DEFAULT '1',
  `failing_score` decimal(5,2) DEFAULT NULL,
  `failing_reason` text DEFAULT NULL,
  `work_delivered` tinyint(1) NOT NULL DEFAULT '0',
  `work_delivered_date` date DEFAULT NULL,
  `work_score` decimal(5,2) DEFAULT NULL,
  `support_score` decimal(5,2) DEFAULT NULL,
  `final_score` decimal(5,2) DEFAULT NULL,
  `is_passed` tinyint(1) NOT NULL DEFAULT '0',
  `work_drive_link` text DEFAULT NULL,
  `support_drive_link` text DEFAULT NULL,
  `work_attachment_json` longtext DEFAULT NULL,
  `support_attachment_json` longtext DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `notified_whatsapp` tinyint(1) NOT NULL DEFAULT '0',
  `notified_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_remedial_student_id` (`student_id`),
  KEY `idx_remedial_group_id` (`group_id`),
  KEY `idx_remedial_period` (`period`),
  CONSTRAINT `fk_nivelaciones_estudiante` FOREIGN KEY (`student_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_nivelaciones_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABLA: diario_clase (Pedagogical Daily Logs)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `diario_clase`;
CREATE TABLE `diario_clase` (
  `id` varchar(50) NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `teacher_id` varchar(50) NOT NULL,
  `teacher_name` varchar(255) DEFAULT '',
  `subject` varchar(150) NOT NULL,
  `date` date NOT NULL,
  `period` varchar(50) NOT NULL DEFAULT 'Periodo 1',
  `topic` varchar(255) NOT NULL,
  `objective` text DEFAULT NULL,
  `activities_description` longtext NOT NULL,
  `tasks_assigned` text DEFAULT NULL,
  `pedagogical_agreements` text DEFAULT NULL,
  `resources_used` text DEFAULT NULL,
  `attendance_summary_json` longtext DEFAULT NULL,
  `attachments_json` longtext DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_diario_group_id` (`group_id`),
  KEY `idx_diario_teacher_id` (`teacher_id`),
  KEY `idx_diario_date` (`date`),
  CONSTRAINT `fk_diario_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. TABLA: horarios_clase (Teacher & Group Class Schedules)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `horarios_clase`;
CREATE TABLE `horarios_clase` (
  `id` varchar(50) NOT NULL,
  `day` enum('monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  `start_time` varchar(10) NOT NULL,
  `end_time` varchar(10) NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `subject` varchar(150) NOT NULL,
  `teacher_id` varchar(50) NOT NULL,
  `teacher_name` varchar(255) DEFAULT '',
  `classroom_or_lab` varchar(100) DEFAULT '',
  `notes` text DEFAULT NULL,
  `color` varchar(50) DEFAULT 'indigo',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_horario_day` (`day`),
  KEY `idx_horario_group_id` (`group_id`),
  KEY `idx_horario_teacher_id` (`teacher_id`),
  CONSTRAINT `fk_horarios_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. TABLA: grupos_trabajo_abp (ABP Collaborative Workgroups)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `grupos_trabajo_abp`;
CREATE TABLE `grupos_trabajo_abp` (
  `id` varchar(50) NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `subject` varchar(150) DEFAULT '',
  `period` varchar(50) DEFAULT 'Periodo 1',
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `teams_json` longtext NOT NULL,
  `custom_roles_json` longtext DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_abp_group_id` (`group_id`),
  CONSTRAINT `fk_abp_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. TABLA: planos_asientos (Seating Charts & Lab Layouts)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `planos_asientos`;
CREATE TABLE `planos_asientos` (
  `id` varchar(50) NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `classroom_json` longtext NOT NULL,
  `laboratory_json` longtext NOT NULL,
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_plano_grupo` (`group_id`),
  CONSTRAINT `fk_planos_grupo` FOREIGN KEY (`group_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. TABLA: log_notificaciones (WhatsApp Dispatch & Notification History)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `log_notificaciones`;
CREATE TABLE `log_notificaciones` (
  `id` varchar(50) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `student_name` varchar(255) NOT NULL,
  `group_id` varchar(50) DEFAULT NULL,
  `group_name` varchar(100) DEFAULT '',
  `guardian_name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `message` longtext NOT NULL,
  `timestamp` datetime NOT NULL,
  `status` enum('sent','pending','failed') NOT NULL DEFAULT 'sent',
  `method` varchar(50) NOT NULL DEFAULT 'wa_link',
  `teacher_id` varchar(50) DEFAULT NULL,
  `teacher_name` varchar(255) DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_log_timestamp` (`timestamp`),
  KEY `idx_log_student_id` (`student_id`),
  KEY `idx_log_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. VISTAS SQL PARA CONSULTAS EN PHPMYADMIN
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW `vista_resumen_asistencia_estudiantes` AS
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
FROM `estudiantes` e
LEFT JOIN `grupos` g ON e.group_id = g.id
LEFT JOIN `asistencias` a ON e.id = a.student_id
GROUP BY e.id, g.id;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
