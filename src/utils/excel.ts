import * as XLSX from 'xlsx';
import { Student, AttendanceRecord, Activity, GradeRecord, Group, EvaluationCategory } from '../types';

export interface ParsedStudentRow {
  documentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  courseName?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianCountryCode?: string;
  guardianEmail?: string;
  guardianRelationship?: 'Madre' | 'Padre' | 'Acudiente' | 'Tutor' | 'Abuelo/a' | 'Otro' | string;
  observations?: string;
  gender?: 'M' | 'F' | 'Otro';
  error?: string;
}

export interface StudentColumnMapping {
  documentIdKey: string;
  firstNameKey: string;
  lastNameKey: string;
  fullNameKey?: string;
  emailKey?: string;
  courseKey?: string;
  guardianNameKey?: string;
  guardianPhoneKey?: string;
  guardianRelationshipKey?: string;
  observationsKey?: string;
}

export interface RawStudentSheetData {
  headers: string[];
  rawRows: Record<string, any>[];
  detectedMapping: StudentColumnMapping;
  fileName: string;
}

/**
 * Intelligent helper to score and match header columns with aliases & keywords
 */
export const detectStudentColumnMapping = (headers: string[]): StudentColumnMapping => {
  const findBestHeader = (aliasList: string[], exclude: string[] = []): string => {
    // 1. Exact match (case-insensitive & trimmed)
    for (const alias of aliasList) {
      const match = headers.find(
        (h) => !exclude.includes(h) && h.trim().toLowerCase() === alias.toLowerCase()
      );
      if (match) return match;
    }

    // 2. Starts with or includes alias with word boundary
    for (const alias of aliasList) {
      const match = headers.find((h) => {
        if (exclude.includes(h)) return false;
        const cleanH = h.trim().toLowerCase();
        const cleanA = alias.toLowerCase();
        return cleanH.includes(cleanA);
      });
      if (match) return match;
    }

    return '';
  };

  // Prioritize distinct First and Last detection
  const firstNameKey = findBestHeader([
    'first',
    'firstname',
    'first_name',
    'first name',
    'primer nombre',
    'nombres',
    'nombre',
    'primer_nombre',
    'given_name',
    'givenname',
    'nombres_estudiante',
    'nombre_estudiante',
    'name',
  ]);

  const lastNameKey = findBestHeader(
    [
      'last',
      'lastname',
      'last_name',
      'last name',
      'primer apellido',
      'apellidos',
      'apellido',
      'segundo apellido',
      'primer_apellido',
      'segundo_apellido',
      'surname',
      'family_name',
      'familyname',
      'apellidos_estudiante',
      'apellido_estudiante',
    ],
    [firstNameKey]
  );

  const documentIdKey = findBestHeader(
    [
      'documento',
      'documento de identidad',
      'no_documento',
      'identidad',
      'cedula',
      'cédula',
      'tarjeta',
      'ti',
      'rc',
      'dni',
      'rut',
      'nuip',
      'cc',
      'student_id',
      'id_estudiante',
      'codigo',
      'código',
      'matricula',
      'doc',
      'id',
      'identification',
    ],
    [firstNameKey, lastNameKey]
  );

  const emailKey = findBestHeader(
    [
      'correo',
      'email',
      'e-mail',
      'mail',
      'correo electronico',
      'correo electrónico',
      'correo del acudiente',
      'correo estudiante',
      'correo_estudiante',
      'correo_acudiente',
      'student_email',
      'email_estudiante',
      'guardian_email',
    ],
    [firstNameKey, lastNameKey, documentIdKey]
  );

  const courseKey = findBestHeader(
    [
      'curso',
      'grado',
      'grupo',
      'curso / grado',
      'seccion',
      'sección',
      'aula',
      'nivel',
      'grade',
      'group',
      'class',
      'course',
      'salon',
      'salón',
    ],
    [firstNameKey, lastNameKey, documentIdKey, emailKey]
  );

  const guardianNameKey = findBestHeader(
    [
      'nombre del acudiente',
      'acudiente',
      'nombre acudiente',
      'tutor',
      'padre',
      'madre',
      'responsable',
      'contacto',
      'guardian',
      'parent',
      'guardian_name',
      'parent_name',
    ],
    [firstNameKey, lastNameKey, documentIdKey, emailKey, courseKey]
  );

  const guardianPhoneKey = findBestHeader(
    [
      'celular / whatsapp',
      'whatsapp',
      'celular',
      'telefono',
      'teléfono',
      'movil',
      'móvil',
      'tel',
      'phone',
      'guardian_phone',
      'celular_acudiente',
      'telefono_acudiente',
      'mobile',
    ],
    [firstNameKey, lastNameKey, documentIdKey, emailKey, courseKey, guardianNameKey]
  );

  const guardianRelationshipKey = findBestHeader(
    [
      'parentesco',
      'relacion',
      'relación',
      'vinculo',
      'vínculo',
      'relationship',
    ],
    [firstNameKey, lastNameKey, documentIdKey, emailKey, courseKey, guardianNameKey, guardianPhoneKey]
  );

  const observationsKey = findBestHeader(
    [
      'observaciones',
      'observacion',
      'notas',
      'comentarios',
      'salud',
      'observations',
      'notes',
      'comments',
    ],
    [firstNameKey, lastNameKey, documentIdKey, emailKey, courseKey, guardianNameKey, guardianPhoneKey, guardianRelationshipKey]
  );

  const fullNameKey = (!firstNameKey && !lastNameKey)
    ? findBestHeader([
        'nombre completo',
        'nombres y apellidos',
        'apellidos y nombres',
        'estudiante',
        'full_name',
        'fullname',
        'student_name',
      ])
    : '';

  return {
    documentIdKey,
    firstNameKey,
    lastNameKey,
    fullNameKey,
    emailKey,
    courseKey,
    guardianNameKey,
    guardianPhoneKey,
    guardianRelationshipKey,
    observationsKey,
  };
};

/**
 * Process raw JSON rows using the specified column mapping
 */
export const processRowsWithMapping = (
  rawRows: Record<string, any>[],
  mapping: StudentColumnMapping
): ParsedStudentRow[] => {
  const results: ParsedStudentRow[] = [];

  for (const row of rawRows) {
    const getVal = (key?: string): string => {
      if (!key || row[key] === undefined || row[key] === null) return '';
      return String(row[key]).trim();
    };

    const doc = getVal(mapping.documentIdKey);
    let firstName = getVal(mapping.firstNameKey);
    let lastName = getVal(mapping.lastNameKey);
    const fullName = getVal(mapping.fullNameKey);
    const email = getVal(mapping.emailKey);
    const course = getVal(mapping.courseKey);
    const guardianName = getVal(mapping.guardianNameKey);
    const guardianPhone = getVal(mapping.guardianPhoneKey);
    const guardianEmail = email; // Map imported email to guardian / student email
    const relRaw = getVal(mapping.guardianRelationshipKey);
    const observations = getVal(mapping.observationsKey);

    // If only fullName is provided and first/last are empty, split intelligently
    if ((!firstName || !lastName) && fullName) {
      if (fullName.includes(',')) {
        const parts = fullName.split(',');
        lastName = parts[0].trim();
        firstName = parts.slice(1).join(' ').trim();
      } else {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) {
          firstName = parts[0];
          lastName = '';
        } else if (parts.length === 2) {
          firstName = parts[0];
          lastName = parts[1];
        } else if (parts.length === 3) {
          firstName = parts[0];
          lastName = `${parts[1]} ${parts[2]}`;
        } else {
          firstName = `${parts[0]} ${parts[1]}`;
          lastName = parts.slice(2).join(' ');
        }
      }
    }

    // Skip completely empty rows
    if (!doc && !firstName && !lastName && !course && !guardianName && !guardianPhone && !email) {
      continue;
    }

    let rel: 'Madre' | 'Padre' | 'Acudiente' | 'Tutor' | 'Abuelo/a' | 'Otro' = 'Acudiente';
    if (/madre|mama|mamá/i.test(relRaw)) rel = 'Madre';
    else if (/padre|papa|papá/i.test(relRaw)) rel = 'Padre';
    else if (/tutor/i.test(relRaw)) rel = 'Tutor';
    else if (/abuel/i.test(relRaw)) rel = 'Abuelo/a';
    else if (relRaw) rel = relRaw as any;

    // Clean phone number if provided (strip spaces/dashes)
    let cleanedPhone = guardianPhone ? guardianPhone.replace(/[^\d+]/g, '') : '';
    let countryCode = '+57';
    if (cleanedPhone.startsWith('+')) {
      if (cleanedPhone.startsWith('+57')) {
        cleanedPhone = cleanedPhone.replace('+57', '');
        countryCode = '+57';
      } else if (cleanedPhone.startsWith('+52')) {
        cleanedPhone = cleanedPhone.replace('+52', '');
        countryCode = '+52';
      } else if (cleanedPhone.startsWith('+1')) {
        cleanedPhone = cleanedPhone.replace('+1', '');
        countryCode = '+1';
      }
    }

    // Validation: ONLY firstName, lastName, and documentId are strictly mandatory
    let error = '';
    if (!firstName && !lastName) {
      error = 'Faltan nombres y apellidos del estudiante.';
    } else if (!firstName) {
      error = 'Falta el nombre (First Name) del estudiante.';
    } else if (!lastName) {
      error = 'Faltan los apellidos (Last Name) del estudiante.';
    } else if (!doc) {
      error = 'Falta el documento de identidad del estudiante.';
    }

    results.push({
      documentId: doc,
      firstName,
      lastName,
      email: email || '',
      courseName: course,
      guardianName: guardianName || '',
      guardianPhone: cleanedPhone,
      guardianCountryCode: countryCode,
      guardianEmail: guardianEmail || '',
      guardianRelationship: rel,
      observations: observations || '',
      error,
    });
  }

  return results;
};

/**
 * Parses uploaded Excel (.xlsx, .xls) or CSV file into raw rows and detected mapping
 */
export const parseRawStudentFile = async (file: File): Promise<RawStudentSheetData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // Extract unique column headers from rawJson
        const headerSet = new Set<string>();
        rawJson.forEach((row) => {
          Object.keys(row).forEach((k) => {
            if (k && k.trim() && !k.startsWith('__EMPTY')) {
              headerSet.add(k.trim());
            }
          });
        });

        const headers = Array.from(headerSet);
        const detectedMapping = detectStudentColumnMapping(headers);

        resolve({
          headers,
          rawRows: rawJson,
          detectedMapping,
          fileName: file.name,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Downloads a ready-to-use sample Excel template for bulk student import
 */
export const downloadStudentTemplate = () => {
  const sampleData = [
    {
      'Documento de Identidad (Obligatorio)': '1098234701',
      'First / Nombres (Obligatorio)': 'Carlos Andrés',
      'Last / Apellidos (Obligatorio)': 'García Mendoza',
      'Correo / Email (Opcional)': 'carlos.garcia@estudiante.edu.co',
      'Curso / Grado (Opcional)': 'Grado 10° A',
      'Nombre del Acudiente (Opcional)': 'Lucía Mendoza',
      'Celular / WhatsApp (Opcional)': '3151234567',
      'Parentesco (Opcional)': 'Madre',
      'Correo del Acudiente (Opcional)': 'lucia.mendoza@email.com',
      'Observaciones (Opcional)': 'Alérgico a picaduras',
    },
    {
      'Documento de Identidad (Obligatorio)': '1098234702',
      'First / Nombres (Obligatorio)': 'Laura Daniela',
      'Last / Apellidos (Obligatorio)': 'Pardo Castro',
      'Correo / Email (Opcional)': 'laura.pardo@estudiante.edu.co',
      'Curso / Grado (Opcional)': 'Grado 10° A',
      'Nombre del Acudiente (Opcional)': '',
      'Celular / WhatsApp (Opcional)': '',
      'Parentesco (Opcional)': '',
      'Correo del Acudiente (Opcional)': '',
      'Observaciones (Opcional)': 'Contacto pendiente por registrar',
    },
    {
      'Documento de Identidad (Obligatorio)': '1098234703',
      'First / Nombres (Obligatorio)': 'Esteban',
      'Last / Apellidos (Obligatorio)': 'Quintero Ríos',
      'Correo / Email (Opcional)': 'esteban.quintero@estudiante.edu.co',
      'Curso / Grado (Opcional)': 'Grado 9° B',
      'Nombre del Acudiente (Opcional)': 'María Ríos',
      'Celular / WhatsApp (Opcional)': '3104561234',
      'Parentesco (Opcional)': 'Madre',
      'Correo del Acudiente (Opcional)': 'maria.rios@email.com',
      'Observaciones (Opcional)': '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Estudiantes');

  // Adjust column widths
  worksheet['!cols'] = [
    { wch: 32 },
    { wch: 24 },
    { wch: 24 },
    { wch: 30 },
    { wch: 24 },
    { wch: 28 },
    { wch: 28 },
    { wch: 22 },
    { wch: 28 },
    { wch: 28 },
  ];

  XLSX.writeFile(workbook, 'Plantilla_Importar_Estudiantes.xlsx');
};

/**
 * Legacy wrapper: Parses uploaded Excel (.xlsx, .xls) or CSV file buffer
 */
export const parseStudentFile = async (file: File): Promise<ParsedStudentRow[]> => {
  const rawData = await parseRawStudentFile(file);
  return processRowsWithMapping(rawData.rawRows, rawData.detectedMapping);
};

/**
 * Export current students to Excel
 */
export const exportStudentsToExcel = (students: Student[], group?: Group) => {
  const data = students.map((s, index) => ({
    'N°': index + 1,
    'Documento': s.documentId,
    'Apellidos': s.lastName,
    'Nombres': s.firstName,
    'Curso / Grado': group ? group.name : s.groupId,
    'Acudiente': s.guardianName,
    'Parentesco': s.guardianRelationship,
    'WhatsApp': `${s.guardianCountryCode} ${s.guardianPhone}`,
    'Correo': s.guardianEmail || '',
    'Estado': s.status === 'active' ? 'Activo' : 'Inactivo',
    'Observaciones': s.observations || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');
  XLSX.writeFile(workbook, `Listado_Estudiantes_${group ? group.name.replace(/\s+/g, '_') : 'General'}.xlsx`);
};

/**
 * Export attendance history to Excel
 */
export const exportAttendanceToExcel = (
  records: AttendanceRecord[],
  students: Student[],
  group: Group,
  date: string
) => {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const statusLabel: Record<string, string> = {
    present: 'Presente',
    late: 'Retardo',
    absent: 'Inasistente',
    unexcused_absence: 'Inasistente',
    excused: 'Justificado',
    excused_absence: 'Justificado',
    evasion: 'Evasión de Clase',
    early_departure: 'Retiro Temprano',
    enfermeria: 'Enfermería / Salud',
    permiso_especial: 'Permiso Especial',
  };

  const uniformLabel = {
    complete: 'Completo',
    incomplete: 'Incompleto',
    none: 'No portó uniforme',
  };

  const data = records.map((r, i) => {
    const std = studentMap.get(r.studentId);
    return {
      'N°': i + 1,
      'Documento': std?.documentId || '',
      'Estudiante': std ? `${std.lastName} ${std.firstName}` : r.studentId,
      'Fecha': r.date,
      'Curso': group.name,
      'Estado Asistencia': statusLabel[r.status] || r.status,
      'Minutos Retardo': r.lateMinutes || (r.status === 'late' ? 'Sí' : '-'),
      'Uniforme': uniformLabel[r.uniformStatus] || r.uniformStatus,
      'Novedades Uniforme': r.uniformNotes || '',
      'Justificación / Excusa': r.excuseReason || '',
      'Observaciones': r.observations || '',
      'Notificado WhatsApp': r.notifiedWhatsApp ? 'Sí' : 'No',
      'Contacto Acudiente': std ? `${std.guardianName} (${std.guardianPhone})` : '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Asistencia ${date}`);
  XLSX.writeFile(workbook, `Asistencia_${group.name.replace(/\s+/g, '_')}_${date}.xlsx`);
};

/**
 * Export Single Activity Gradebook to Excel
 */
export const exportGradesToExcel = (
  activity: Activity,
  grades: GradeRecord[],
  students: Student[],
  group: Group
) => {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const deliveryMap = {
    yes: 'A tiempo',
    late: 'Con retraso',
    no: 'No entregada',
    pending: 'Pendiente',
  };

  const data = grades.map((g, i) => {
    const std = studentMap.get(g.studentId);
    return {
      'N°': i + 1,
      'Documento': std?.documentId || '',
      'Estudiante': std ? `${std.lastName} ${std.firstName}` : g.studentId,
      'Curso': group.name,
      'Materia': activity.subject,
      'Actividad': activity.title,
      'Tipo': activity.type.toUpperCase(),
      'Nota Obtenida': g.score !== null ? g.score : 'Pendiente',
      'Nota Máxima': activity.maxScore,
      'Estado Aprobación': g.score !== null ? (g.score >= activity.passingScore ? 'APROBADO' : 'REPROBADO') : '-',
      'Entrega a Tiempo': deliveryMap[g.deliveredOnTime] || g.deliveredOnTime,
      'Comentarios': g.comments || '',
      'Notificado WhatsApp': g.notifiedWhatsApp ? 'Sí' : 'No',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Calificaciones');
  XLSX.writeFile(workbook, `Notas_${activity.subject}_${activity.title.substring(0, 20).replace(/\s+/g, '_')}.xlsx`);
};

/**
 * Export Master Consolidated Gradebook (Sábana de Calificaciones) to Excel
 */
export const exportMasterGradebookToExcel = (
  group: Group,
  subject: string,
  period: string,
  categories: EvaluationCategory[],
  activities: Activity[],
  grades: GradeRecord[],
  students: Student[],
  attendance: AttendanceRecord[]
) => {
  const gradeMap = new Map<string, number>();
  grades.forEach((g) => {
    if (g.score !== null) {
      gradeMap.set(`${g.activityId}-${g.studentId}`, g.score);
    }
  });

  const data = students.map((std, i) => {
    const row: Record<string, any> = {
      'N°': i + 1,
      'Documento': std.documentId,
      'Estudiante': `${std.lastName} ${std.firstName}`,
    };

    let totalWeightedScore = 0;
    let totalWeightApplied = 0;

    categories.forEach((cat) => {
      const catActivities = activities.filter((a) => {
        if (a.categoryId) return a.categoryId === cat.id;
        // Fallback categorization based on type
        if (cat.id === 'cat-saber' && (a.type === 'evaluacion' || a.type === 'otro')) return true;
        if (cat.id === 'cat-hacer' && (a.type === 'taller' || a.type === 'tarea' || a.type === 'proyecto')) return true;
        if (cat.id === 'cat-ser' && a.type === 'participacion') return true;
        return false;
      });

      let catScoresSum = 0;
      let catScoresCount = 0;

      catActivities.forEach((act) => {
        const score = gradeMap.get(`${act.id}-${std.id}`);
        row[`${cat.name.split(' ')[0]}: ${act.title.substring(0, 18)}`] = score !== undefined ? score : '-';
        if (score !== undefined) {
          catScoresSum += score;
          catScoresCount++;
        }
      });

      const catAvg = catScoresCount > 0 ? catScoresSum / catScoresCount : 0;
      row[`PROMEDIO ${cat.name} (${cat.weightPercentage}%)`] = catScoresCount > 0 ? Number(catAvg.toFixed(2)) : '-';

      if (catScoresCount > 0) {
        totalWeightedScore += catAvg * (cat.weightPercentage / 100);
        totalWeightApplied += cat.weightPercentage;
      }
    });

    // Attendance correlation
    const stdAtt = attendance.filter((a) => a.studentId === std.id && a.groupId === group.id);
    const totalDays = stdAtt.length;
    const presentDays = stdAtt.filter((a) => a.status === 'present').length;
    const attPercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
    row['Asistencia (%)'] = `${attPercentage}%`;

    const finalGrade = totalWeightApplied > 0 ? (totalWeightedScore / (totalWeightApplied / 100)) : 0;
    row['NOTA DEFINITIVA'] = Number(finalGrade.toFixed(2));
    row['DESEMPEÑO'] =
      finalGrade >= 4.6
        ? 'SUPERIOR'
        : finalGrade >= 4.0
        ? 'ALTO'
        : finalGrade >= 3.5
        ? 'BÁSICO'
        : 'BAJO';

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Sábana ${subject}`);
  XLSX.writeFile(workbook, `Sabana_Calificaciones_${group.name.replace(/\s+/g, '_')}_${subject}_${period.replace(/\s+/g, '_')}.xlsx`);
};

