import { AttendanceRecord, Student, Group, Activity, GradeRecord, SchoolSettings, RemedialRecord } from '../types';

/**
 * Cleans and formats phone numbers for WhatsApp international format (e.g. +573158901234 -> 573158901234)
 */
export const formatPhoneNumberForWhatsApp = (phone: string, countryCode: string = '+57'): string => {
  if (!phone) return '';
  // Remove spaces, hyphens, parentheses
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // If already starts with '+', remove it
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else {
    // If doesn't have country code, clean the countryCode prefix and prepend
    const cleanCC = countryCode.replace('+', '');
    if (!cleaned.startsWith(cleanCC)) {
      cleaned = cleanCC + cleaned;
    }
  }

  return cleaned;
};

export const getAppCurrentUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return '';
};

/**
 * Replaces placeholders in templates
 */
export const fillTemplate = (template: string, variables: Record<string, string>): string => {
  const currentUrl = getAppCurrentUrl();
  const allVariables: Record<string, string> = {
    ...variables,
    app_url: currentUrl,
    url_app: currentUrl,
    url_portal: currentUrl,
    portal_url: currentUrl,
    link_consulta: currentUrl,
  };

  let result = template;
  for (const [key, value] of Object.entries(allVariables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
};

export const getUniformStatusText = (status: 'complete' | 'incomplete' | 'none', notes?: string): string => {
  switch (status) {
    case 'complete':
      return '✅ Completo y reglamentario';
    case 'incomplete':
      return `⚠️ Incompleto${notes ? ` (${notes})` : ''}`;
    case 'none':
      return `❌ No portó el uniforme${notes ? ` (${notes})` : ''}`;
    default:
      return 'No registrado';
  }
};

export const getAttendanceStatusText = (
  rawStatus: string, 
  lateMinutes?: number, 
  novelties?: SchoolSettings['attendanceNovelties']
): string => {
  const status = rawStatus === 'unexcused_absence' ? 'absent' : (rawStatus === 'excused_absence' ? 'excused' : rawStatus);
  // Check if a custom novelty config exists
  if (novelties && novelties.length > 0) {
    const matched = novelties.find((n) => n.id === status || n.code.toLowerCase() === status.toLowerCase());
    if (matched) {
      if (matched.id === 'late' || matched.requiresMinutes) {
        return `${matched.name.toUpperCase()} (${lateMinutes ? `${lateMinutes} min` : 'Tardanza'})`;
      }
      return matched.name.toUpperCase();
    }
  }

  switch (status) {
    case 'present':
      return 'PRESENTE (Asistió puntual)';
    case 'late':
      return `RETARDO (${lateMinutes ? `${lateMinutes} min` : 'Tardanza'})`;
    case 'absent':
      return 'INASISTENTE (Ausente sin justificar)';
    case 'excused':
      return 'JUSTIFICADO (Inasistencia con excusa)';
    case 'evasion':
      return '⚠️ EVASIÓN DE CLASE / JORNADA';
    case 'early_departure':
      return '🚪 RETIRO TEMPRANO';
    case 'enfermeria':
      return '🩺 ATENCIÓN EN ENFERMERÍA';
    case 'permiso_especial':
      return '🎖️ PERMISO ESPECIAL / COMISIÓN';
    default:
      return status.toUpperCase();
  }
};

export const generateAttendanceMessage = (
  attendance: AttendanceRecord,
  student: Student,
  group: Group,
  settings: SchoolSettings
): string => {
  const rawStatus = attendance.status as string;
  const status = rawStatus === 'unexcused_absence' ? 'absent' : (rawStatus === 'excused_absence' ? 'excused' : rawStatus);
  const matchedNovelty = settings.attendanceNovelties?.find(
    (n) => n.id === status || n.code.toLowerCase() === status.toLowerCase()
  );

  const vars: Record<string, string> = {
    acudiente: student.guardianName || 'Acudiente',
    estudiante: `${student.firstName} ${student.lastName}`,
    curso: group.name,
    colegio: settings.schoolName,
    docente: settings.teacherName,
    fecha: attendance.date,
    estado_asistencia: getAttendanceStatusText(status, attendance.lateMinutes, settings.attendanceNovelties),
    minutos_retardo: attendance.lateMinutes ? String(attendance.lateMinutes) : '0',
    uniforme_texto: getUniformStatusText(attendance.uniformStatus, attendance.uniformNotes),
    observaciones_texto: attendance.observations 
      ? `📝 Observaciones: ${attendance.observations}` 
      : (attendance.excuseReason ? `📄 Motivo/Justificación: ${attendance.excuseReason}` : 'Sin observaciones adicionales.'),
  };

  // Select appropriate template
  let template = settings.attendanceTemplate;

  // 1. If novelty has a specific custom template, use it
  if (matchedNovelty?.customWhatsAppTemplate && matchedNovelty.customWhatsAppTemplate.trim().length > 0) {
    template = matchedNovelty.customWhatsAppTemplate;
  } else if (status === 'late' && settings.lateTemplate) {
    template = settings.lateTemplate;
  } else if (status === 'absent' && settings.absentTemplate) {
    template = settings.absentTemplate;
  } else if (attendance.uniformStatus !== 'complete' && settings.uniformTemplate && status === 'present') {
    template = settings.uniformTemplate;
  }

  return fillTemplate(template, vars);
};

export const generateGradeMessage = (
  grade: GradeRecord,
  activity: Activity,
  student: Student,
  group: Group,
  settings: SchoolSettings
): string => {
  const deliveryMap = {
    yes: '✅ Sí, entregada a tiempo',
    late: '⚠️ Entregada con retraso',
    no: '❌ No entregada',
    pending: '⏳ Pendiente de entrega',
  };

  const vars: Record<string, string> = {
    acudiente: student.guardianName || 'Acudiente',
    estudiante: `${student.firstName} ${student.lastName}`,
    curso: group.name,
    colegio: settings.schoolName,
    docente: settings.teacherName,
    materia: activity.subject,
    actividad: activity.title,
    fecha: activity.dueDate,
    nota: grade.score !== null ? grade.score.toFixed(1) : 'Pendiente',
    nota_maxima: activity.maxScore.toFixed(1),
    entrega_tiempo: deliveryMap[grade.deliveredOnTime] || grade.deliveredOnTime,
    comentario: grade.comments || 'Sin comentarios adicionales.',
  };

  return fillTemplate(settings.gradeTemplate, vars);
};

export const generateDailySummaryMessage = (
  attendance: AttendanceRecord,
  student: Student,
  group: Group,
  settings: SchoolSettings
): string => {
  const vars: Record<string, string> = {
    acudiente: student.guardianName || 'Acudiente',
    estudiante: `${student.firstName} ${student.lastName}`,
    curso: group.name,
    colegio: settings.schoolName,
    docente: settings.teacherName,
    fecha: attendance.date,
    estado_asistencia: getAttendanceStatusText(attendance.status, attendance.lateMinutes),
    uniforme_texto: getUniformStatusText(attendance.uniformStatus, attendance.uniformNotes),
    observaciones_texto: attendance.observations || attendance.excuseReason || 'Ninguna.',
  };

  return fillTemplate(settings.dailyDigestTemplate, vars);
};

export const generateMasterGradebookMessage = (
  student: Student,
  group: Group,
  subject: string,
  period: string,
  definitiveScore: number,
  achievementLevel: string,
  categorySummaries: { name: string; weight: number; average: number }[],
  attendanceStats: { totalClasses: number; presents: number; absents: number; lates: number; percentage: number },
  settings: SchoolSettings
): string => {
  const categoriesText = categorySummaries
    .map((c) => `• *${c.name} (${c.weight}%):* ${c.average.toFixed(1)}`)
    .join('\n');

  const appUrl = getAppCurrentUrl();
  const linkText = appUrl ? `\n🌐 *Portal de Consulta:* ${appUrl}` : '';

  return `📊 *INFORME DE CALIFICACIONES Y DESEMPEÑO*
🏛️ *${settings.schoolName}*
👤 *Docente:* ${settings.teacherName}

👋 Estimado/a acudiente *${student.guardianName || 'de familia'}*,
Le compartimos el consolidado académico de *${student.firstName} ${student.lastName}*:

📚 *Materia:* ${subject}
📅 *Periodo:* ${period} | *Curso:* ${group.name}

📈 *PROMEDIOS POR CATEGORÍA:*
${categoriesText}

🏆 *NOTA DEFINITIVA PONDERADA:* *${definitiveScore.toFixed(1)} / 5.0*
🏅 *Nivel de Desempeño:* *${achievementLevel.toUpperCase()}*

🕒 *REGISTRO DE ASISTENCIA:*
• Asistencias puntuales: ${attendanceStats.presents}
• Retardos: ${attendanceStats.lates}
• Inasistencias: ${attendanceStats.absents}
• Porcentaje de asistencia: *${attendanceStats.percentage}%*
${linkText}
¡Agradecemos su constante acompañamiento en el proceso educativo!`;
};

/**
 * Formats WhatsApp message for past period recovery / remedial results
 */
export const generateRemedialMessage = (
  remedial: RemedialRecord,
  student: Student,
  group: Group,
  settings: SchoolSettings
): string => {
  const deliveryStatusText = remedial.workDelivered 
    ? `✅ Sí, entregado (${remedial.workDeliveredDate || 'Registrado'})` 
    : '❌ No entregado';
  const failingScoreText = remedial.failingScore !== null && remedial.failingScore !== undefined
    ? `${remedial.failingScore.toFixed(1)} / 5.0`
    : 'Sin registrar';
  const workScoreText = remedial.workScore !== null ? `${remedial.workScore.toFixed(1)} / 5.0` : 'Sin calificar';
  const supportScoreText = remedial.supportScore !== null ? `${remedial.supportScore.toFixed(1)} / 5.0` : 'Sin calificar';
  const finalScoreText = remedial.finalScore !== null ? `${remedial.finalScore.toFixed(1)} / 5.0` : 'Pendiente';
  
  let resultBadge = '⏳ EN PROCESO';
  if (remedial.finalScore !== null) {
    resultBadge = remedial.isPassed || remedial.finalScore >= (settings.passingScore || settings.minPassingScore || 3.5) 
      ? '🎉 APROBADA (Superada)' 
      : '⚠️ NO APROBADA (Insuficiente)';
  }

  const appUrl = getAppCurrentUrl();
  const linkText = appUrl ? `\n🌐 *Portal de Consulta:* ${appUrl}` : '';

  let driveLinks = '';
  const workLink = remedial.workDriveLink || remedial.workAttachment?.webViewLink;
  if (workLink) {
    driveLinks += `\n📁 *Evidencia de Trabajo (Google Drive):*\n${workLink}`;
  }
  const supportLink = remedial.supportDriveLink || remedial.supportAttachment?.webViewLink;
  if (supportLink) {
    driveLinks += `\n🗣️ *Evidencia de Sustentación (Google Drive):*\n${supportLink}`;
  }

  const obsText = remedial.observations ? `\n📝 *Observaciones pedagógicas:* ${remedial.observations}` : '';

  return `📑 *INFORME DE NIVELACIÓN DE PERIODO*
🏛️ *${settings.schoolName}*
👤 *Docente:* ${remedial.teacherName || settings.teacherName}

👋 Estimado/a acudiente *${student.guardianName || 'de familia'}*,
Le compartimos el informe de recuperación y nivelación de su acudido(a) *${student.firstName} ${student.lastName}*:

📚 *Asignatura:* ${remedial.subject}
📅 *Periodo Nivelado:* ${remedial.period}
👥 *Curso:* ${group.name}
📉 *Nota con la que reprobó el periodo:* *${failingScoreText}*

📋 *CRITERIOS Y CALIFICACIONES:*
• *Entrega del Trabajo / Taller:* ${deliveryStatusText}
• *Calificación del Trabajo Escrito:* ${workScoreText}
• *Calificación de la Sustentación:* ${supportScoreText}
---------------------------------
🏆 *NOTA DEFINITIVA DE NIVELACIÓN:* *${finalScoreText}*
📌 *Estado de Nivelación:* *${resultBadge}*
${driveLinks}${obsText}
${linkText}
¡Agradecemos su constante apoyo y compromiso en el proceso de nivelación!`;
};

/**
 * Creates the official WhatsApp Click-to-Chat URL
 */
export const createWhatsAppUrl = (phone: string, countryCode: string, message: string): string => {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone, countryCode);
  const encodedText = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
};

/**
 * Opens WhatsApp link in a new tab or app
 */
export const openWhatsAppDirectly = (phone: string, countryCode: string, message: string): void => {
  const url = createWhatsAppUrl(phone, countryCode, message);
  window.open(url, '_blank');
};
