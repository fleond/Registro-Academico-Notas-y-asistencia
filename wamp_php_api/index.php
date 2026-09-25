<?php
/**
 * API REST PHP para Sincronización y Persistencia en WAMP Server (MySQL)
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

$pdo = getDBConnection();

// 1. Diagnóstico de Estado y Conexión
if ($action === 'status' || $action === 'ping') {
    try {
        $stmt = $pdo->query("SELECT 
            (SELECT COUNT(*) FROM docentes) as teachers_count,
            (SELECT COUNT(*) FROM grupos) as groups_count,
            (SELECT COUNT(*) FROM estudiantes) as students_count,
            (SELECT COUNT(*) FROM asistencias) as attendance_count,
            (SELECT COUNT(*) FROM actividades) as activities_count,
            (SELECT COUNT(*) FROM calificaciones) as grades_count");
        $counts = $stmt->fetch();

        echo json_encode([
            "status" => "success",
            "connected" => true,
            "engine" => "MySQL WAMP Server",
            "database" => DB_NAME,
            "host" => DB_HOST . ":" . DB_PORT,
            "counts" => $counts,
            "timestamp" => date("c")
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "status" => "error",
            "connected" => false,
            "message" => $e->getMessage()
        ]);
    }
    exit();
}

// 2. PULL: Obtener todos los datos consolidados para el Frontend
if ($action === 'pull') {
    try {
        // Settings
        $stmt = $pdo->query("SELECT * FROM configuracion_institucional WHERE id='primary_settings' LIMIT 1");
        $settingsRow = $stmt->fetch();
        $settings = null;
        if ($settingsRow) {
            $settings = [
                'schoolName' => $settingsRow['school_name'],
                'teacherName' => $settingsRow['teacher_name'],
                'schoolYear' => $settingsRow['school_year'],
                'currentPeriod' => $settingsRow['current_period'],
                'defaultCountryCode' => $settingsRow['default_country_code'],
                'gradingScale' => $settingsRow['grading_scale'],
                'minPassingScore' => (float)$settingsRow['min_passing_score'],
                'passingScore' => (float)$settingsRow['passing_score'],
                'adminPassword' => $settingsRow['admin_password'],
                'adminRecoveryEmail' => $settingsRow['admin_recovery_email'],
                'autoOpenWhatsApp' => (bool)$settingsRow['auto_open_whatsapp'],
                'instantWhatsAppOnAttendance' => (bool)$settingsRow['instant_whatsapp_on_attendance'],
                'attendanceTemplate' => $settingsRow['attendance_template'],
                'lateTemplate' => $settingsRow['late_template'],
                'absentTemplate' => $settingsRow['absent_template'],
                'uniformTemplate' => $settingsRow['uniform_template'],
                'gradeTemplate' => $settingsRow['grade_template'],
                'dailyDigestTemplate' => $settingsRow['daily_digest_template'],
                'institutionSubjects' => json_decode($settingsRow['institution_subjects_json'] ?: '[]', true),
                'attendanceNovelties' => json_decode($settingsRow['attendance_novelties_json'] ?: '[]', true),
                'uniformTags' => json_decode($settingsRow['uniform_tags_json'] ?: '[]', true),
                'evaluationCategories' => json_decode($settingsRow['evaluation_categories_json'] ?: '[]', true),
                'periods' => json_decode($settingsRow['periods_json'] ?: '[]', true),
            ];
        }

        // Teachers
        $stmt = $pdo->query("SELECT * FROM docentes");
        $teachers = array_map(function($r) {
            return [
                'id' => $r['id'],
                'name' => $r['name'],
                'email' => $r['email'],
                'documentId' => $r['document_id'],
                'phone' => $r['phone'],
                'specialty' => $r['specialty'],
                'role' => $r['role'],
                'status' => $r['status'],
                'password' => $r['password'],
                'avatarColor' => $r['avatar_color'],
                'assignedGroupIds' => json_decode($r['assigned_group_ids_json'] ?: '[]', true),
                'assignedGrades' => json_decode($r['assigned_grades_json'] ?: '[]', true),
                'assignedSubjects' => json_decode($r['assigned_subjects_json'] ?: '[]', true),
                'assignments' => json_decode($r['assignments_json'] ?: '[]', true),
                'createdAt' => $r['created_at'],
            ];
        }, $stmt->fetchAll());

        // Groups
        $stmt = $pdo->query("SELECT * FROM grupos ORDER BY grade ASC, name ASC");
        $groups = array_map(function($r) {
            return [
                'id' => $r['id'],
                'name' => $r['name'],
                'grade' => $r['grade'],
                'section' => $r['section'],
                'schoolYear' => $r['school_year'],
                'shift' => $r['shift'],
                'directorName' => $r['director_name'],
                'teacherName' => $r['teacher_name'],
                'teacherId' => $r['teacher_id'],
                'room' => $r['room'],
                'subjects' => json_decode($r['subjects_json'] ?: '[]', true),
                'assignedTeacherIds' => json_decode($r['assigned_teacher_ids_json'] ?: '[]', true),
                'createdByTeacherId' => $r['created_by_teacher_id'],
                'createdAt' => $r['created_at'],
            ];
        }, $stmt->fetchAll());

        // Students
        $stmt = $pdo->query("SELECT * FROM estudiantes ORDER BY last_name ASC, first_name ASC");
        $students = array_map(function($r) {
            return [
                'id' => $r['id'],
                'documentId' => $r['document_id'],
                'firstName' => $r['first_name'],
                'lastName' => $r['last_name'],
                'groupId' => $r['group_id'],
                'email' => $r['email'],
                'guardianName' => $r['guardian_name'],
                'guardianPhone' => $r['guardian_phone'],
                'guardianCountryCode' => $r['guardian_country_code'],
                'guardianEmail' => $r['guardian_email'],
                'guardianRelationship' => $r['guardian_relationship'],
                'status' => $r['status'],
                'observations' => $r['observations'],
                'avatarColor' => $r['avatar_color'],
                'gender' => $r['gender'],
                'createdByTeacherId' => $r['created_by_teacher_id'],
            ];
        }, $stmt->fetchAll());

        // Attendance
        $stmt = $pdo->query("SELECT * FROM asistencias ORDER BY date DESC");
        $attendance = array_map(function($r) {
            return [
                'id' => $r['id'],
                'date' => $r['date'],
                'groupId' => $r['group_id'],
                'studentId' => $r['student_id'],
                'status' => $r['status'],
                'lateMinutes' => (int)$r['late_minutes'],
                'uniformStatus' => $r['uniform_status'],
                'uniformNotes' => $r['uniform_notes'],
                'excuseReason' => $r['excuse_reason'],
                'observations' => $r['observations'],
                'notifiedWhatsApp' => (bool)$r['notified_whatsapp'],
                'notifiedAt' => $r['notified_at'],
            ];
        }, $stmt->fetchAll());

        // Activities
        $stmt = $pdo->query("SELECT * FROM actividades ORDER BY due_date DESC");
        $activities = array_map(function($r) {
            return [
                'id' => $r['id'],
                'groupId' => $r['group_id'],
                'subject' => $r['subject'],
                'title' => $r['title'],
                'description' => $r['description'],
                'assignedDate' => $r['assigned_date'],
                'dueDate' => $r['due_date'],
                'maxScore' => (float)$r['max_score'],
                'passingScore' => (float)$r['passing_score'],
                'weightPercentage' => (float)$r['weight_percentage'],
                'type' => $r['type'],
                'period' => $r['period'],
                'categoryId' => $r['category_id'],
                'createdByTeacherId' => $r['created_by_teacher_id'],
                'assignedTeacherId' => $r['assigned_teacher_id'],
                'attachments' => json_decode($r['attachments_json'] ?: '[]', true),
            ];
        }, $stmt->fetchAll());

        // Grades
        $stmt = $pdo->query("SELECT * FROM calificaciones");
        $grades = array_map(function($r) {
            return [
                'id' => $r['id'],
                'activityId' => $r['activity_id'],
                'studentId' => $r['student_id'],
                'score' => $r['score'] !== null ? (float)$r['score'] : null,
                'deliveredOnTime' => $r['delivered_on_time'],
                'comments' => $r['comments'],
                'feedbackDate' => $r['feedback_date'],
                'notifiedWhatsApp' => (bool)$r['notified_whatsapp'],
                'notifiedAt' => $r['notified_at'],
                'attachments' => json_decode($r['attachments_json'] ?: '[]', true),
            ];
        }, $stmt->fetchAll());

        // Subject Configs
        $stmt = $pdo->query("SELECT * FROM configuracion_materias");
        $subjectConfigs = array_map(function($r) {
            return [
                'id' => $r['id'],
                'groupId' => $r['group_id'],
                'subjectName' => $r['subject_name'],
                'categories' => json_decode($r['categories_json'] ?: '[]', true),
            ];
        }, $stmt->fetchAll());

        // Remedials
        $stmt = $pdo->query("SELECT * FROM nivelaciones_remediales");
        $remedials = array_map(function($r) {
            return [
                'id' => $r['id'],
                'studentId' => $r['student_id'],
                'groupId' => $r['group_id'],
                'subject' => $r['subject'],
                'period' => $r['period'],
                'academicYear' => $r['academic_year'],
                'teacherId' => $r['teacher_id'],
                'teacherName' => $r['teacher_name'],
                'requiresRemedial' => (bool)$r['requires_remedial'],
                'failingScore' => $r['failing_score'] !== null ? (float)$r['failing_score'] : null,
                'failingReason' => $r['failing_reason'],
                'workDelivered' => (bool)$r['work_delivered'],
                'workDeliveredDate' => $r['work_delivered_date'],
                'workScore' => $r['work_score'] !== null ? (float)$r['work_score'] : null,
                'supportScore' => $r['support_score'] !== null ? (float)$r['support_score'] : null,
                'finalScore' => $r['final_score'] !== null ? (float)$r['final_score'] : null,
                'isPassed' => (bool)$r['is_passed'],
                'workDriveLink' => $r['work_drive_link'],
                'supportDriveLink' => $r['support_drive_link'],
                'workAttachment' => json_decode($r['work_attachment_json'] ?: 'null', true),
                'supportAttachment' => json_decode($r['support_attachment_json'] ?: 'null', true),
                'observations' => $r['observations'],
                'notifiedWhatsApp' => (bool)$r['notified_whatsapp'],
                'notifiedAt' => $r['notified_at'],
                'createdAt' => $r['created_at'],
                'updatedAt' => $r['updated_at'],
            ];
        }, $stmt->fetchAll());

        // Daily Logs
        $stmt = $pdo->query("SELECT * FROM diario_clase ORDER BY date DESC");
        $dailyLogs = array_map(function($r) {
            return [
                'id' => $r['id'],
                'groupId' => $r['group_id'],
                'teacherId' => $r['teacher_id'],
                'teacherName' => $r['teacher_name'],
                'subject' => $r['subject'],
                'date' => $r['date'],
                'period' => $r['period'],
                'topic' => $r['topic'],
                'objective' => $r['objective'],
                'activitiesDescription' => $r['activities_description'],
                'tasksAssigned' => $r['tasks_assigned'],
                'pedagogicalAgreements' => $r['pedagogical_agreements'],
                'resourcesUsed' => $r['resources_used'],
                'attendanceSummary' => json_decode($r['attendance_summary_json'] ?: 'null', true),
                'attachments' => json_decode($r['attachments_json'] ?: '[]', true),
                'createdAt' => $r['created_at'],
            ];
        }, $stmt->fetchAll());

        // Schedules
        $stmt = $pdo->query("SELECT * FROM horarios_clase");
        $schedules = array_map(function($r) {
            return [
                'id' => $r['id'],
                'day' => $r['day'],
                'startTime' => $r['start_time'],
                'endTime' => $r['end_time'],
                'groupId' => $r['group_id'],
                'subject' => $r['subject'],
                'teacherId' => $r['teacher_id'],
                'teacherName' => $r['teacher_name'],
                'classroomOrLab' => $r['classroom_or_lab'],
                'notes' => $r['notes'],
                'color' => $r['color'],
            ];
        }, $stmt->fetchAll());

        echo json_encode([
            "status" => "success",
            "source" => "mysql_wamp",
            "data" => [
                'settings' => $settings,
                'teachers' => $teachers,
                'groups' => $groups,
                'students' => $students,
                'attendance' => $attendance,
                'activities' => $activities,
                'grades' => $grades,
                'subjectConfigs' => $subjectConfigs,
                'remedials' => $remedials,
                'dailyLogs' => $dailyLogs,
                'schedules' => $schedules
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// 3. PUSH: Guardar datos en lote desde el Frontend hacia MySQL WAMP
if ($action === 'push' && $method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Cuerpo JSON inválido"]);
        exit();
    }

    try {
        // Desactivar temporalmente verificación de claves foráneas para evitar Error 1452 en inserciones masivas
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $pdo->exec("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");

        $pdo->beginTransaction();

        // 1. Guardar Configuración Institucional
        if (!empty($data['settings'])) {
            $s = $data['settings'];
            $stmt = $pdo->prepare("INSERT INTO configuracion_institucional (
                id, school_name, teacher_name, school_year, current_period, default_country_code,
                grading_scale, min_passing_score, passing_score, admin_password, admin_recovery_email,
                auto_open_whatsapp, instant_whatsapp_on_attendance, attendance_template, late_template,
                absent_template, uniform_template, grade_template, daily_digest_template,
                institution_subjects_json, attendance_novelties_json, uniform_tags_json,
                evaluation_categories_json, periods_json
            ) VALUES (
                'primary_settings', :school_name, :teacher_name, :school_year, :current_period, :default_country_code,
                :grading_scale, :min_passing_score, :passing_score, :admin_password, :admin_recovery_email,
                :auto_open_whatsapp, :instant_whatsapp_on_attendance, :attendance_template, :late_template,
                :absent_template, :uniform_template, :grade_template, :daily_digest_template,
                :institution_subjects_json, :attendance_novelties_json, :uniform_tags_json,
                :evaluation_categories_json, :periods_json
            ) ON DUPLICATE KEY UPDATE 
                school_name=VALUES(school_name), teacher_name=VALUES(teacher_name),
                current_period=VALUES(current_period), institution_subjects_json=VALUES(institution_subjects_json),
                attendance_novelties_json=VALUES(attendance_novelties_json), evaluation_categories_json=VALUES(evaluation_categories_json),
                periods_json=VALUES(periods_json)");

            $stmt->execute([
                ':school_name' => $s['schoolName'] ?? 'Colegio',
                ':teacher_name' => $s['teacherName'] ?? 'Docente',
                ':school_year' => $s['schoolYear'] ?? '2026',
                ':current_period' => $s['currentPeriod'] ?? 'Periodo 1',
                ':default_country_code' => $s['defaultCountryCode'] ?? '+57',
                ':grading_scale' => $s['gradingScale'] ?? '1-5',
                ':min_passing_score' => $s['minPassingScore'] ?? 3.0,
                ':passing_score' => $s['passingScore'] ?? 3.0,
                ':admin_password' => $s['adminPassword'] ?? 'admin123',
                ':admin_recovery_email' => $s['adminRecoveryEmail'] ?? '',
                ':auto_open_whatsapp' => !empty($s['autoOpenWhatsApp']) ? 1 : 0,
                ':instant_whatsapp_on_attendance' => !empty($s['instantWhatsAppOnAttendance']) ? 1 : 0,
                ':attendance_template' => $s['attendanceTemplate'] ?? '',
                ':late_template' => $s['lateTemplate'] ?? '',
                ':absent_template' => $s['absentTemplate'] ?? '',
                ':uniform_template' => $s['uniformTemplate'] ?? '',
                ':grade_template' => $s['gradeTemplate'] ?? '',
                ':daily_digest_template' => $s['dailyDigestTemplate'] ?? '',
                ':institution_subjects_json' => json_encode($s['institutionSubjects'] ?? []),
                ':attendance_novelties_json' => json_encode($s['attendanceNovelties'] ?? []),
                ':uniform_tags_json' => json_encode($s['uniformTags'] ?? []),
                ':evaluation_categories_json' => json_encode($s['evaluationCategories'] ?? []),
                ':periods_json' => json_encode($s['periods'] ?? []),
            ]);
        }

        // 2. Guardar Docentes
        if (!empty($data['teachers'])) {
            $stmt = $pdo->prepare("INSERT INTO docentes (
                id, name, email, document_id, phone, specialty, role, status, password, avatar_color,
                assigned_group_ids_json, assigned_grades_json, assigned_subjects_json, assignments_json, created_at
            ) VALUES (
                :id, :name, :email, :document_id, :phone, :specialty, :role, :status, :password, :avatar_color,
                :assigned_group_ids_json, :assigned_grades_json, :assigned_subjects_json, :assignments_json, :created_at
            ) ON DUPLICATE KEY UPDATE 
                name=VALUES(name), email=VALUES(email), phone=VALUES(phone), specialty=VALUES(specialty),
                assigned_group_ids_json=VALUES(assigned_group_ids_json), assignments_json=VALUES(assignments_json)");

            foreach ($data['teachers'] as $t) {
                $stmt->execute([
                    ':id' => $t['id'],
                    ':name' => $t['name'] ?? '',
                    ':email' => $t['email'] ?? '',
                    ':document_id' => $t['documentId'] ?? '',
                    ':phone' => $t['phone'] ?? '',
                    ':specialty' => $t['specialty'] ?? '',
                    ':role' => $t['role'] ?? 'teacher',
                    ':status' => $t['status'] ?? 'active',
                    ':password' => $t['password'] ?? 'docente123',
                    ':avatar_color' => $t['avatarColor'] ?? 'bg-indigo-600',
                    ':assigned_group_ids_json' => json_encode($t['assignedGroupIds'] ?? []),
                    ':assigned_grades_json' => json_encode($t['assignedGrades'] ?? []),
                    ':assigned_subjects_json' => json_encode($t['assignedSubjects'] ?? []),
                    ':assignments_json' => json_encode($t['assignments'] ?? []),
                    ':created_at' => $t['createdAt'] ?? date('Y-m-d'),
                ]);
            }
        }

        // 3. Guardar Grupos (Primero para asegurar claves foráneas)
        $knownGroupIds = [];
        if (!empty($data['groups'])) {
            $stmt = $pdo->prepare("INSERT INTO grupos (
                id, name, grade, section, school_year, shift, director_name, teacher_name, teacher_id, room,
                subjects_json, assigned_teacher_ids_json, created_by_teacher_id, created_at
            ) VALUES (
                :id, :name, :grade, :section, :school_year, :shift, :director_name, :teacher_name, :teacher_id, :room,
                :subjects_json, :assigned_teacher_ids_json, :created_by_teacher_id, :created_at
            ) ON DUPLICATE KEY UPDATE 
                name=VALUES(name), grade=VALUES(grade), shift=VALUES(shift), subjects_json=VALUES(subjects_json)");

            foreach ($data['groups'] as $g) {
                if (empty($g['id'])) continue;
                $knownGroupIds[$g['id']] = true;
                $stmt->execute([
                    ':id' => $g['id'],
                    ':name' => $g['name'] ?? '',
                    ':grade' => $g['grade'] ?? '10°',
                    ':section' => $g['section'] ?? '',
                    ':school_year' => $g['schoolYear'] ?? '2026',
                    ':shift' => $g['shift'] ?? 'Mañana',
                    ':director_name' => $g['directorName'] ?? '',
                    ':teacher_name' => $g['teacherName'] ?? '',
                    ':teacher_id' => !empty($g['teacherId']) ? $g['teacherId'] : null,
                    ':room' => $g['room'] ?? '',
                    ':subjects_json' => json_encode($g['subjects'] ?? []),
                    ':assigned_teacher_ids_json' => json_encode($g['assignedTeacherIds'] ?? []),
                    ':created_by_teacher_id' => !empty($g['createdByTeacherId']) ? $g['createdByTeacherId'] : null,
                    ':created_at' => $g['createdAt'] ?? date('Y-m-d'),
                ]);
            }
        }

        // Asegurar grupo por defecto si no existe ninguno
        if (empty($knownGroupIds)) {
            $defaultGrpId = 'grp-default';
            $pdo->exec("INSERT IGNORE INTO grupos (id, name, grade, section, school_year, shift, director_name, room, subjects_json) 
                        VALUES ('grp-default', 'Grupo General', '10°', 'A', '2026', 'Mañana', 'Docente Titular', 'Aula Principal', '[]')");
            $knownGroupIds[$defaultGrpId] = true;
        }
        $fallbackGroupId = array_key_first($knownGroupIds);

        // 4. Guardar Estudiantes
        $knownStudentIds = [];
        if (!empty($data['students'])) {
            $stmt = $pdo->prepare("INSERT INTO estudiantes (
                id, document_id, first_name, last_name, group_id, email, guardian_name, guardian_phone,
                guardian_country_code, guardian_email, guardian_relationship, status, observations, avatar_color, gender
            ) VALUES (
                :id, :document_id, :first_name, :last_name, :group_id, :email, :guardian_name, :guardian_phone,
                :guardian_country_code, :guardian_email, :guardian_relationship, :status, :observations, :avatar_color, :gender
            ) ON DUPLICATE KEY UPDATE 
                first_name=VALUES(first_name), last_name=VALUES(last_name), group_id=VALUES(group_id),
                guardian_phone=VALUES(guardian_phone), guardian_name=VALUES(guardian_name)");

            foreach ($data['students'] as $st) {
                if (empty($st['id'])) continue;
                $stGroupId = (!empty($st['groupId']) && isset($knownGroupIds[$st['groupId']])) ? $st['groupId'] : $fallbackGroupId;
                $knownStudentIds[$st['id']] = true;

                $stmt->execute([
                    ':id' => $st['id'],
                    ':document_id' => $st['documentId'] ?? '',
                    ':first_name' => $st['firstName'] ?? '',
                    ':last_name' => $st['lastName'] ?? '',
                    ':group_id' => $stGroupId,
                    ':email' => $st['email'] ?? '',
                    ':guardian_name' => $st['guardianName'] ?? 'Acudiente',
                    ':guardian_phone' => $st['guardianPhone'] ?? '',
                    ':guardian_country_code' => $st['guardianCountryCode'] ?? '+57',
                    ':guardian_email' => $st['guardianEmail'] ?? '',
                    ':guardian_relationship' => $st['guardianRelationship'] ?? 'Madre',
                    ':status' => $st['status'] ?? 'active',
                    ':observations' => $st['observations'] ?? '',
                    ':avatar_color' => $st['avatarColor'] ?? 'bg-indigo-500',
                    ':gender' => $st['gender'] ?? 'M',
                ]);
            }
        }

        // 5. Guardar Asistencias
        if (!empty($data['attendance'])) {
            $stmt = $pdo->prepare("INSERT INTO asistencias (
                id, date, group_id, student_id, status, late_minutes, uniform_status, uniform_notes,
                excuse_reason, observations, notified_whatsapp, notified_at
            ) VALUES (
                :id, :date, :group_id, :student_id, :status, :late_minutes, :uniform_status, :uniform_notes,
                :excuse_reason, :observations, :notified_whatsapp, :notified_at
            ) ON DUPLICATE KEY UPDATE 
                status=VALUES(status), late_minutes=VALUES(late_minutes), uniform_status=VALUES(uniform_status),
                observations=VALUES(observations), notified_whatsapp=VALUES(notified_whatsapp)");

            foreach ($data['attendance'] as $a) {
                $studentId = $a['studentId'] ?? '';
                // Evitar violación de clave foránea si el estudiante no existe
                if (empty($studentId) || !isset($knownStudentIds[$studentId])) {
                    continue;
                }
                $groupId = (!empty($a['groupId']) && isset($knownGroupIds[$a['groupId']])) ? $a['groupId'] : $fallbackGroupId;

                $stmt->execute([
                    ':id' => $a['id'] ?? ($studentId . '_' . ($a['date'] ?? date('Y-m-d'))),
                    ':date' => $a['date'] ?? date('Y-m-d'),
                    ':group_id' => $groupId,
                    ':student_id' => $studentId,
                    ':status' => $a['status'] ?? 'present',
                    ':late_minutes' => $a['lateMinutes'] ?? $a['minutesLate'] ?? 0,
                    ':uniform_status' => $a['uniformStatus'] ?? 'complete',
                    ':uniform_notes' => $a['uniformNotes'] ?? '',
                    ':excuse_reason' => $a['excuseReason'] ?? $a['reason'] ?? '',
                    ':observations' => $a['observations'] ?? '',
                    ':notified_whatsapp' => !empty($a['notifiedWhatsApp']) ? 1 : 0,
                    ':notified_at' => $a['notifiedAt'] ?? null,
                ]);
            }
        }

        // 6. Guardar Actividades
        $knownActivityIds = [];
        if (!empty($data['activities'])) {
            $stmt = $pdo->prepare("INSERT INTO actividades (
                id, group_id, subject, title, description, assigned_date, due_date, max_score,
                passing_score, weight_percentage, type, period, category_id, attachments_json
            ) VALUES (
                :id, :group_id, :subject, :title, :description, :assigned_date, :due_date, :max_score,
                :passing_score, :weight_percentage, :type, :period, :category_id, :attachments_json
            ) ON DUPLICATE KEY UPDATE 
                title=VALUES(title), max_score=VALUES(max_score), weight_percentage=VALUES(weight_percentage)");

            foreach ($data['activities'] as $ac) {
                if (empty($ac['id'])) continue;
                $groupId = (!empty($ac['groupId']) && isset($knownGroupIds[$ac['groupId']])) ? $ac['groupId'] : $fallbackGroupId;
                $knownActivityIds[$ac['id']] = true;

                $stmt->execute([
                    ':id' => $ac['id'],
                    ':group_id' => $groupId,
                    ':subject' => $ac['subject'] ?? 'General',
                    ':title' => $ac['title'] ?? 'Actividad',
                    ':description' => $ac['description'] ?? '',
                    ':assigned_date' => $ac['assignedDate'] ?? date('Y-m-d'),
                    ':due_date' => $ac['dueDate'] ?? date('Y-m-d'),
                    ':max_score' => $ac['maxScore'] ?? 5.0,
                    ':passing_score' => $ac['passingScore'] ?? 3.0,
                    ':weight_percentage' => $ac['weightPercentage'] ?? 20.0,
                    ':type' => $ac['type'] ?? 'taller',
                    ':period' => $ac['period'] ?? 'Periodo 1',
                    ':category_id' => $ac['categoryId'] ?? null,
                    ':attachments_json' => json_encode($ac['attachments'] ?? []),
                ]);
            }
        }

        // 7. Guardar Calificaciones
        if (!empty($data['grades'])) {
            $stmt = $pdo->prepare("INSERT INTO calificaciones (
                id, activity_id, student_id, score, delivered_on_time, comments, feedback_date,
                notified_whatsapp, notified_at, attachments_json
            ) VALUES (
                :id, :activity_id, :student_id, :score, :delivered_on_time, :comments, :feedback_date,
                :notified_whatsapp, :notified_at, :attachments_json
            ) ON DUPLICATE KEY UPDATE 
                score=VALUES(score), delivered_on_time=VALUES(delivered_on_time), comments=VALUES(comments)");

            foreach ($data['grades'] as $g) {
                $activityId = $g['activityId'] ?? '';
                $studentId = $g['studentId'] ?? '';

                // Validar existencia de clave foránea antes de insertar
                if (empty($activityId) || empty($studentId)) {
                    continue;
                }
                if (!isset($knownActivityIds[$activityId]) || !isset($knownStudentIds[$studentId])) {
                    continue;
                }

                $stmt->execute([
                    ':id' => $g['id'] ?? ($activityId . '_' . $studentId),
                    ':activity_id' => $activityId,
                    ':student_id' => $studentId,
                    ':score' => $g['score'] !== null ? $g['score'] : null,
                    ':delivered_on_time' => $g['deliveredOnTime'] ?? 'yes',
                    ':comments' => $g['comments'] ?? '',
                    ':feedback_date' => $g['feedbackDate'] ?? null,
                    ':notified_whatsapp' => !empty($g['notifiedWhatsApp']) ? 1 : 0,
                    ':notified_at' => $g['notifiedAt'] ?? null,
                    ':attachments_json' => json_encode($g['attachments'] ?? []),
                ]);
            }
        }

        // 8. Guardar Configuración de Materias SIEE
        if (!empty($data['subjectConfigs'])) {
            $colName = 'subject_name';
            try {
                $checkCol = $pdo->query("SHOW COLUMNS FROM configuracion_materias LIKE 'subject_name'")->fetch();
                if (empty($checkCol)) {
                    $checkSub = $pdo->query("SHOW COLUMNS FROM configuracion_materias LIKE 'subject'")->fetch();
                    if (!empty($checkSub)) {
                        $colName = 'subject';
                    }
                }
            } catch (Exception $ex) {}

            $stmt = $pdo->prepare("INSERT INTO configuracion_materias (
                id, group_id, {$colName}, categories_json
            ) VALUES (
                :id, :group_id, :subject_val, :categories_json
            ) ON DUPLICATE KEY UPDATE 
                categories_json=VALUES(categories_json)");

            foreach ($data['subjectConfigs'] as $sc) {
                $groupId = (!empty($sc['groupId']) && isset($knownGroupIds[$sc['groupId']])) ? $sc['groupId'] : $fallbackGroupId;
                $subjectName = $sc['subjectName'] ?? $sc['subject'] ?? 'General';
                $stmt->execute([
                    ':id' => $sc['id'] ?? ($groupId . '_' . preg_replace('/[^a-zA-Z0-9]/', '_', $subjectName)),
                    ':group_id' => $groupId,
                    ':subject_val' => $subjectName,
                    ':categories_json' => json_encode($sc['categories'] ?? $sc['evaluationCategories'] ?? []),
                ]);
            }
        }

        // 9. Guardar Nivelaciones Remediales
        if (!empty($data['remedials'])) {
            $stmt = $pdo->prepare("INSERT INTO nivelaciones_remediales (
                id, student_id, group_id, subject, period, academic_year,
                teacher_id, teacher_name, requires_remedial, failing_score,
                failing_reason, work_delivered, work_delivered_date, work_score,
                support_score, final_score, is_passed, work_drive_link,
                support_drive_link, work_attachment_json, support_attachment_json,
                observations, notified_whatsapp, notified_at
            ) VALUES (
                :id, :student_id, :group_id, :subject, :period, :academic_year,
                :teacher_id, :teacher_name, :requires_remedial, :failing_score,
                :failing_reason, :work_delivered, :work_delivered_date, :work_score,
                :support_score, :final_score, :is_passed, :work_drive_link,
                :support_drive_link, :work_attachment_json, :support_attachment_json,
                :observations, :notified_whatsapp, :notified_at
            ) ON DUPLICATE KEY UPDATE 
                final_score=VALUES(final_score), work_delivered=VALUES(work_delivered), observations=VALUES(observations)");

            foreach ($data['remedials'] as $r) {
                if (empty($r['studentId']) || !isset($knownStudentIds[$r['studentId']])) {
                    continue;
                }
                $groupId = (!empty($r['groupId']) && isset($knownGroupIds[$r['groupId']])) ? $r['groupId'] : $fallbackGroupId;
                $stmt->execute([
                    ':id' => $r['id'] ?? ($r['studentId'] . '_' . ($r['subject'] ?? '') . '_' . ($r['period'] ?? '')),
                    ':student_id' => $r['studentId'],
                    ':group_id' => $groupId,
                    ':subject' => $r['subject'] ?? 'General',
                    ':period' => $r['period'] ?? 'Periodo 1',
                    ':academic_year' => $r['academicYear'] ?? '2026',
                    ':teacher_id' => !empty($r['teacherId']) ? $r['teacherId'] : null,
                    ':teacher_name' => $r['teacherName'] ?? '',
                    ':requires_remedial' => isset($r['requiresRemedial']) ? ($r['requiresRemedial'] ? 1 : 0) : 1,
                    ':failing_score' => $r['failingScore'] ?? $r['initialScore'] ?? null,
                    ':failing_reason' => $r['failingReason'] ?? '',
                    ':work_delivered' => !empty($r['workDelivered']) ? 1 : 0,
                    ':work_delivered_date' => $r['workDeliveredDate'] ?? null,
                    ':work_score' => $r['workScore'] ?? null,
                    ':support_score' => $r['supportScore'] ?? null,
                    ':final_score' => $r['finalScore'] ?? $r['remedialScore'] ?? null,
                    ':is_passed' => !empty($r['isPassed']) ? 1 : 0,
                    ':work_drive_link' => $r['workDriveLink'] ?? '',
                    ':support_drive_link' => $r['supportDriveLink'] ?? '',
                    ':work_attachment_json' => json_encode($r['workAttachments'] ?? $r['workAttachment'] ?? []),
                    ':support_attachment_json' => json_encode($r['supportAttachments'] ?? $r['supportAttachment'] ?? []),
                    ':observations' => $r['observations'] ?? '',
                    ':notified_whatsapp' => !empty($r['notifiedWhatsApp']) ? 1 : 0,
                    ':notified_at' => $r['notifiedAt'] ?? null,
                ]);
            }
        }

        // 10. Guardar Diario de Clase
        if (!empty($data['dailyLogs'])) {
            $stmt = $pdo->prepare("INSERT INTO diario_clase (
                id, group_id, teacher_id, teacher_name, subject, date, period,
                topic, objective, activities_description, tasks_assigned,
                pedagogical_agreements, resources_used, attendance_summary_json, attachments_json, created_at
            ) VALUES (
                :id, :group_id, :teacher_id, :teacher_name, :subject, :date, :period,
                :topic, :objective, :activities_description, :tasks_assigned,
                :pedagogical_agreements, :resources_used, :attendance_summary_json, :attachments_json, :created_at
            ) ON DUPLICATE KEY UPDATE 
                topic=VALUES(topic), activities_description=VALUES(activities_description), tasks_assigned=VALUES(tasks_assigned)");

            foreach ($data['dailyLogs'] as $dl) {
                $groupId = (!empty($dl['groupId']) && isset($knownGroupIds[$dl['groupId']])) ? $dl['groupId'] : $fallbackGroupId;
                $stmt->execute([
                    ':id' => $dl['id'] ?? ($groupId . '_' . ($dl['date'] ?? date('Y-m-d')) . '_' . uniqid()),
                    ':group_id' => $groupId,
                    ':teacher_id' => !empty($dl['teacherId']) ? $dl['teacherId'] : 'doc-1',
                    ':teacher_name' => $dl['teacherName'] ?? '',
                    ':subject' => $dl['subject'] ?? 'General',
                    ':date' => $dl['date'] ?? date('Y-m-d'),
                    ':period' => $dl['period'] ?? 'Periodo 1',
                    ':topic' => $dl['topic'] ?? 'Clase regular',
                    ':objective' => $dl['objective'] ?? '',
                    ':activities_description' => $dl['activitiesDescription'] ?? $dl['activitiesDone'] ?? '',
                    ':tasks_assigned' => $dl['tasksAssigned'] ?? $dl['homework'] ?? '',
                    ':pedagogical_agreements' => $dl['pedagogicalAgreements'] ?? $dl['observations'] ?? '',
                    ':resources_used' => $dl['resourcesUsed'] ?? '',
                    ':attendance_summary_json' => json_encode($dl['attendanceSummary'] ?? null),
                    ':attachments_json' => json_encode($dl['attachments'] ?? []),
                    ':created_at' => $dl['createdAt'] ?? date('Y-m-d'),
                ]);
            }
        }

        // 11. Guardar Horarios de Clase
        if (!empty($data['schedules'])) {
            $stmt = $pdo->prepare("INSERT INTO horarios_clase (
                id, day, start_time, end_time, group_id, subject, teacher_id, teacher_name, classroom_or_lab, notes, color
            ) VALUES (
                :id, :day, :start_time, :end_time, :group_id, :subject, :teacher_id, :teacher_name, :classroom_or_lab, :notes, :color
            ) ON DUPLICATE KEY UPDATE 
                subject=VALUES(subject), classroom_or_lab=VALUES(classroom_or_lab)");

            $validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            foreach ($data['schedules'] as $sc) {
                $groupId = (!empty($sc['groupId']) && isset($knownGroupIds[$sc['groupId']])) ? $sc['groupId'] : $fallbackGroupId;
                $day = strtolower($sc['day'] ?? '');
                if (!in_array($day, $validDays)) {
                    $day = 'monday';
                }

                $stmt->execute([
                    ':id' => $sc['id'] ?? ($groupId . '_' . $day . '_' . str_replace(':', '', $sc['startTime'] ?? '0700')),
                    ':day' => $day,
                    ':start_time' => $sc['startTime'] ?? '07:00',
                    ':end_time' => $sc['endTime'] ?? '08:00',
                    ':group_id' => $groupId,
                    ':subject' => $sc['subject'] ?? 'General',
                    ':teacher_id' => !empty($sc['teacherId']) ? $sc['teacherId'] : 'doc-1',
                    ':teacher_name' => $sc['teacherName'] ?? '',
                    ':classroom_or_lab' => $sc['classroomOrLab'] ?? $sc['classroom'] ?? '',
                    ':notes' => $sc['notes'] ?? '',
                    ':color' => $sc['color'] ?? 'indigo',
                ]);
            }
        }

        // 12. Guardar Equipos ABP
        if (!empty($data['workGroups'])) {
            $stmt = $pdo->prepare("INSERT INTO grupos_trabajo_abp (
                id, group_id, subject, period, title, description, teams_json, custom_roles_json, created_at
            ) VALUES (
                :id, :group_id, :subject, :period, :title, :description, :teams_json, :custom_roles_json, :created_at
            ) ON DUPLICATE KEY UPDATE 
                title=VALUES(title), teams_json=VALUES(teams_json)");

            foreach ($data['workGroups'] as $wg) {
                $groupId = (!empty($wg['groupId']) && isset($knownGroupIds[$wg['groupId']])) ? $wg['groupId'] : $fallbackGroupId;
                $stmt->execute([
                    ':id' => $wg['id'],
                    ':group_id' => $groupId,
                    ':subject' => $wg['subject'] ?? 'General',
                    ':period' => $wg['period'] ?? 'Periodo 1',
                    ':title' => $wg['title'] ?? 'Proyecto ABP',
                    ':description' => $wg['description'] ?? '',
                    ':teams_json' => json_encode($wg['teams'] ?? []),
                    ':custom_roles_json' => json_encode($wg['customRoles'] ?? []),
                    ':created_at' => $wg['createdAt'] ?? date('Y-m-d'),
                ]);
            }
        }

        // 13. Guardar Planos de Asientos
        if (!empty($data['seatingPlans'])) {
            $stmt = $pdo->prepare("INSERT INTO planos_asientos (
                id, group_id, classroom_json, laboratory_json
            ) VALUES (
                :id, :group_id, :classroom_json, :laboratory_json
            ) ON DUPLICATE KEY UPDATE 
                classroom_json=VALUES(classroom_json), laboratory_json=VALUES(laboratory_json)");

            foreach ($data['seatingPlans'] as $sp) {
                $groupId = (!empty($sp['groupId']) && isset($knownGroupIds[$sp['groupId']])) ? $sp['groupId'] : $fallbackGroupId;
                $stmt->execute([
                    ':id' => $sp['id'] ?? ('seat-' . $groupId),
                    ':group_id' => $groupId,
                    ':classroom_json' => json_encode($sp['classroom'] ?? []),
                    ':laboratory_json' => json_encode($sp['laboratory'] ?? []),
                ]);
            }
        }

        // 14. Guardar Log de Notificaciones
        if (!empty($data['notifications'])) {
            $stmt = $pdo->prepare("INSERT INTO log_notificaciones (
                id, student_id, student_name, group_id, group_name, guardian_name,
                phone, type, message, timestamp, status
            ) VALUES (
                :id, :student_id, :student_name, :group_id, :group_name, :guardian_name,
                :phone, :type, :message, :timestamp, :status
            ) ON DUPLICATE KEY UPDATE 
                status=VALUES(status)");

            foreach ($data['notifications'] as $nl) {
                $stmt->execute([
                    ':id' => $nl['id'] ?? uniqid('notif_'),
                    ':student_id' => $nl['studentId'] ?? '',
                    ':student_name' => $nl['studentName'] ?? '',
                    ':group_id' => $nl['groupId'] ?? null,
                    ':group_name' => $nl['groupName'] ?? '',
                    ':guardian_name' => $nl['guardianName'] ?? '',
                    ':phone' => $nl['phone'] ?? '',
                    ':type' => $nl['type'] ?? 'general',
                    ':message' => $nl['message'] ?? '',
                    ':timestamp' => $nl['timestamp'] ?? date('Y-m-d H:i:s'),
                    ':status' => $nl['status'] ?? 'sent',
                ]);
            }
        }

        $pdo->commit();

        // Reactivar verificación de claves foráneas
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

        echo json_encode([
            "status" => "success",
            "message" => "¡Datos sincronizados y persistidos exitosamente en MySQL (WAMP) sin conflictos de claves foráneas!",
            "timestamp" => date("c")
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
        http_response_code(500);
        echo json_encode([
            "status" => "error", 
            "message" => "Error MySQL: " . $e->getMessage(),
            "hint" => "Si persiste algún problema con claves foráneas, verifique que los registros secundarios pertenezcan a un estudiante o grupo válido o desactive las restricciones temporalmente."
        ]);
    }
    exit();
}

// 4. DELETE: Eliminar un registro específico
if ($action === 'delete') {
    $table = $_GET['table'] ?? $_POST['table'] ?? '';
    $id = $_GET['id'] ?? $_POST['id'] ?? '';
    if (empty($table) || empty($id)) {
        $input = json_decode(file_get_contents('php://input'), true);
        if ($input) {
            $table = $table ?: ($input['table'] ?? '');
            $id = $id ?: ($input['id'] ?? '');
        }
    }

    $allowedTables = [
        'docentes', 'grupos', 'estudiantes', 'asistencias',
        'actividades', 'calificaciones', 'configuracion_materias',
        'nivelaciones_remediales', 'diario_clase', 'horarios_clase',
        'grupos_trabajo_abp', 'planos_asientos', 'log_notificaciones'
    ];

    if (!in_array($table, $allowedTables) || empty($id)) {
        echo json_encode(["status" => "error", "message" => "Tabla no válida o ID vacío"]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM `{$table}` WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode([
            "status" => "success",
            "message" => "Registro {$id} eliminado de la tabla {$table} en MySQL",
            "deleted_id" => $id
        ]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// 5. FIX CONSTRAINTS: Reparar y asegurar claves foráneas y columnas si la base de datos previa tenía restricciones rígidas
if ($action === 'fix_constraints') {
    try {
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        // Permitir que group_id en estudiantes sea NULLable para evitar error 1452 si se crean sin grupo
        try {
            $pdo->exec("ALTER TABLE estudiantes MODIFY COLUMN group_id varchar(50) DEFAULT NULL;");
        } catch (Exception $e) {}

        // Asegurar que configuracion_materias tenga subject_name
        try {
            $colCheck = $pdo->query("SHOW COLUMNS FROM configuracion_materias LIKE 'subject_name'")->fetch();
            if (empty($colCheck)) {
                $subCol = $pdo->query("SHOW COLUMNS FROM configuracion_materias LIKE 'subject'")->fetch();
                if (!empty($subCol)) {
                    $pdo->exec("ALTER TABLE configuracion_materias CHANGE COLUMN subject subject_name varchar(150) NOT NULL;");
                } else {
                    $pdo->exec("ALTER TABLE configuracion_materias ADD COLUMN subject_name varchar(150) NOT NULL AFTER group_id;");
                }
            }
        } catch (Exception $e) {}

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

        echo json_encode([
            "status" => "success",
            "message" => "Restricciones de integridad y estructura de columnas ajustadas con éxito."
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "status" => "error",
            "message" => $e->getMessage()
        ]);
    }
    exit();
}

// Default response
echo json_encode([
    "status" => "ok",
    "service" => "Registro Académico fleon - WAMP MySQL API",
    "available_actions" => ["status", "pull", "push", "fix_constraints"]
]);
