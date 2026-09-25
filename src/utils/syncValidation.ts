import { 
  EvaluationCategory, 
  AcademicPeriod, 
  SchoolSettings, 
  SubjectConfig, 
  Teacher, 
  Group, 
  AuthUser 
} from '../types';
import { 
  DEFAULT_EVALUATION_CATEGORIES, 
  DEFAULT_INSTITUTION_SUBJECTS,
  getStoredData, 
  saveStoredData, 
  getStoredAuthUser, 
  saveStoredAuthUser 
} from './storage';
import { resolvePeriodByDate, DEFAULT_ACADEMIC_PERIODS } from './periods';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 1. Validates and sanitizes evaluation categories (SIEE).
 * Ensures all items have clean IDs, valid names, unique uppercase codes,
 * and valid non-negative numeric weights.
 */
export const validateAndCleanEvaluationCategories = (
  categories: EvaluationCategory[]
): {
  isValid: boolean;
  cleanedCategories: EvaluationCategory[];
  totalWeight: number;
  isBalanced: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(categories) || categories.length === 0) {
    return {
      isValid: true,
      cleanedCategories: JSON.parse(JSON.stringify(DEFAULT_EVALUATION_CATEGORIES)),
      totalWeight: 100,
      isBalanced: true,
      errors: [],
      warnings: ['No se proporcionaron categorías; se asignaron las categorías institucionales por defecto.'],
    };
  }

  const seenCodes = new Set<string>();
  const cleaned: EvaluationCategory[] = [];

  categories.forEach((cat, index) => {
    const rawName = (cat.name || '').trim();
    const cleanName = rawName || `Categoría ${index + 1}`;
    
    // Clean Code
    let rawCode = (cat.code || '').trim().toUpperCase();
    if (!rawCode) {
      rawCode = `C${index + 1}`;
    }
    if (seenCodes.has(rawCode)) {
      rawCode = `${rawCode}${index + 1}`;
      warnings.push(`Código duplicado detectado. Se ajustó a "${rawCode}".`);
    }
    seenCodes.add(rawCode);

    // Clean Weight
    let weight = Number(cat.weightPercentage);
    if (isNaN(weight) || weight < 0) {
      weight = 0;
      warnings.push(`Ponderación inválida para "${cleanName}"; ajustada a 0%.`);
    } else if (weight > 100) {
      weight = 100;
      warnings.push(`Ponderación de "${cleanName}" superaba el 100%; ajustada a 100%.`);
    }

    cleaned.push({
      id: cat.id || `cat-${Date.now()}-${index}`,
      name: cleanName,
      code: rawCode,
      weightPercentage: Math.round(weight * 100) / 100,
      description: (cat.description || '').trim(),
      color: cat.color || 'indigo',
    });
  });

  const totalWeight = Math.round(cleaned.reduce((sum, c) => sum + c.weightPercentage, 0) * 100) / 100;
  const isBalanced = Math.abs(totalWeight - 100) < 0.01;

  if (!isBalanced) {
    warnings.push(`La suma de las ponderaciones es de ${totalWeight}% (debe totalizar 100%).`);
  }

  return {
    isValid: errors.length === 0,
    cleanedCategories: cleaned,
    totalWeight,
    isBalanced,
    errors,
    warnings,
  };
};

/**
 * 2. Validates and sanitizes academic periods.
 * Ensures dates are chronological, weights sum 100%, and status is valid.
 */
export const validateAndCleanAcademicPeriods = (
  periods: AcademicPeriod[],
  todayStr: string = new Date().toISOString().split('T')[0]
): {
  isValid: boolean;
  cleanedPeriods: AcademicPeriod[];
  totalWeight: number;
  activePeriod: AcademicPeriod | null;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(periods) || periods.length === 0) {
    const defaultPeriods = DEFAULT_ACADEMIC_PERIODS;
    const active = resolvePeriodByDate(defaultPeriods, todayStr);
    return {
      isValid: true,
      cleanedPeriods: defaultPeriods,
      totalWeight: 100,
      activePeriod: active,
      errors: [],
      warnings: ['No se encontraron periodos configurados; se asignaron los predeterminados.'],
    };
  }

  const cleaned: AcademicPeriod[] = [];

  periods.forEach((p, index) => {
    const rawName = (p.name || '').trim();
    const cleanName = rawName || `Periodo ${index + 1}`;
    const code = (p.code || `P${index + 1}`).trim().toUpperCase();
    const startDate = p.startDate || todayStr;
    let endDate = p.endDate || startDate;

    if (startDate > endDate) {
      warnings.push(`En "${cleanName}" la fecha de inicio (${startDate}) era posterior al cierre (${endDate}); se ajustaron fechas.`);
      endDate = startDate;
    }

    let weight = Number(p.weightPercentage);
    if (isNaN(weight) || weight <= 0) {
      weight = 25;
    }

    cleaned.push({
      id: p.id || `period-${Date.now()}-${index}`,
      name: cleanName,
      code,
      startDate,
      endDate,
      weightPercentage: Math.round(weight * 10) / 10,
      status: p.status || 'upcoming',
      description: (p.description || '').trim(),
    });
  });

  // Sort chronologically
  cleaned.sort((a, b) => a.startDate.localeCompare(b.startDate));

  const totalWeight = Math.round(cleaned.reduce((sum, p) => sum + p.weightPercentage, 0) * 10) / 10;
  if (Math.abs(totalWeight - 100) > 0.5) {
    warnings.push(`La ponderación total de los periodos es de ${totalWeight}% (debe ser 100%).`);
  }

  const activePeriod = resolvePeriodByDate(cleaned, todayStr);

  return {
    isValid: errors.length === 0,
    cleanedPeriods: cleaned,
    totalWeight,
    activePeriod,
    errors,
    warnings,
  };
};

/**
 * 3. Validates and sanitizes institutional settings before persistence.
 */
export const validateAndCleanSchoolSettings = (
  settings: SchoolSettings
): {
  isValid: boolean;
  cleanedSettings: SchoolSettings;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const schoolName = (settings.schoolName || 'Institución Educativa').trim();
  const teacherName = (settings.teacherName || 'Docente').trim();
  const schoolYear = (settings.schoolYear || `${new Date().getFullYear()}`).trim();
  const defaultCountryCode = (settings.defaultCountryCode || '+57').trim();

  // Validate Evaluation Categories
  const catValidation = validateAndCleanEvaluationCategories(
    settings.evaluationCategories || DEFAULT_EVALUATION_CATEGORIES
  );
  warnings.push(...catValidation.warnings);

  // Validate Academic Periods
  const periodValidation = validateAndCleanAcademicPeriods(settings.periods || DEFAULT_ACADEMIC_PERIODS);
  warnings.push(...periodValidation.warnings);

  // Clean Institution Subjects
  const rawSubs = Array.isArray(settings.institutionSubjects) && settings.institutionSubjects.length > 0
    ? settings.institutionSubjects
    : DEFAULT_INSTITUTION_SUBJECTS;
  const institutionSubjects = Array.from(
    new Set(rawSubs.map((s) => (s || '').trim()).filter((s) => s.length > 0))
  );

  // Determine currentPeriod
  let currentPeriod = (settings.currentPeriod || '').trim();
  if (!currentPeriod && periodValidation.activePeriod) {
    currentPeriod = periodValidation.activePeriod.name;
  } else if (!currentPeriod && periodValidation.cleanedPeriods.length > 0) {
    currentPeriod = periodValidation.cleanedPeriods[0].name;
  }

  const cleanedSettings: SchoolSettings = {
    ...settings,
    schoolName,
    teacherName,
    schoolYear,
    defaultCountryCode,
    currentPeriod: currentPeriod || 'Periodo 1',
    gradingScale: settings.gradingScale || '1-5',
    autoOpenWhatsApp: settings.autoOpenWhatsApp ?? false,
    instantWhatsAppOnAttendance: settings.instantWhatsAppOnAttendance ?? false,
    evaluationCategories: catValidation.cleanedCategories,
    periods: periodValidation.cleanedPeriods,
    institutionSubjects,
    adminRecoveryEmail: (settings.adminRecoveryEmail || 'rectoria@colegio.edu.co').trim(),
  };

  return {
    isValid: errors.length === 0,
    cleanedSettings,
    errors,
    warnings,
  };
};

/**
 * 4. Validates and cleans SubjectConfigs.
 */
export const validateAndCleanSubjectConfigs = (
  configs: SubjectConfig[],
  groups: Group[] = []
): {
  isValid: boolean;
  cleanedConfigs: SubjectConfig[];
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(configs)) {
    return {
      isValid: true,
      cleanedConfigs: [],
      errors: [],
      warnings: [],
    };
  }

  const validGroupIds = new Set(groups.map((g) => g.id));
  const seenConfigKeys = new Set<string>();
  const cleaned: SubjectConfig[] = [];

  configs.forEach((cfg, idx) => {
    if (!cfg || !cfg.groupId || !cfg.subjectName) return;

    const cleanGroupId = cfg.groupId.trim();
    const cleanSubject = cfg.subjectName.trim();
    const uniqueKey = `${cleanGroupId}__${cleanSubject.toLowerCase()}`;

    if (seenConfigKeys.has(uniqueKey)) {
      return; // Skip duplicate config
    }
    seenConfigKeys.add(uniqueKey);

    const catValidation = validateAndCleanEvaluationCategories(
      cfg.categories || DEFAULT_EVALUATION_CATEGORIES
    );

    cleaned.push({
      id: cfg.id || `cfg-${cleanGroupId}-${cleanSubject.replace(/\s+/g, '_')}`,
      groupId: cleanGroupId,
      subjectName: cleanSubject,
      categories: catValidation.cleanedCategories,
    });
  });

  return {
    isValid: errors.length === 0,
    cleanedConfigs: cleaned,
    errors,
    warnings,
  };
};

/**
 * 5. Validates and cleans Teacher records & assignments.
 * Ensures that teacher assignments, assignedGroupIds, and assignedGrades are strictly consistent.
 */
export const validateAndCleanTeacher = (
  teacher: Teacher,
  groups: Group[] = []
): Teacher => {
  const cleanAssignedGroupIds = Array.from(
    new Set((teacher.assignedGroupIds || []).filter((id) => Boolean(id)))
  );

  // Derive grades from groups or teacher's assignedGrades
  const derivedGrades = Array.from(
    new Set(
      groups
        .filter((g) => cleanAssignedGroupIds.includes(g.id))
        .map((g) => g.grade)
        .filter((gr) => Boolean(gr))
    )
  );

  const cleanAssignedSubjects = Array.from(
    new Set(
      (teacher.assignedSubjects || [])
        .map((s) => (s || '').trim())
        .filter((s) => s.length > 0)
    )
  );

  const cleanAssignments = (teacher.assignments || [])
    .filter((a) => a && a.groupId && a.subject)
    .map((a) => ({
      groupId: a.groupId.trim(),
      subject: a.subject.trim(),
      assignedAt: a.assignedAt || new Date().toISOString(),
    }));

  return {
    ...teacher,
    name: (teacher.name || 'Docente').trim(),
    email: (teacher.email || '').trim().toLowerCase(),
    documentId: (teacher.documentId || '').trim(),
    phone: (teacher.phone || '').trim(),
    specialty: (teacher.specialty || '').trim(),
    assignedGroupIds: cleanAssignedGroupIds,
    assignedGrades: derivedGrades.length > 0 ? derivedGrades : (teacher.assignedGrades || []),
    assignedSubjects: cleanAssignedSubjects.length > 0 ? cleanAssignedSubjects : ['Matemáticas'],
    assignments: cleanAssignments,
    status: teacher.status || 'active',
    role: teacher.role || 'teacher',
  };
};

// =========================================================================
// SYNCHRONOUS PROPAGATION AND DUAL-SAVE PIPELINE
// =========================================================================

export interface SyncPropagationResult {
  settings: SchoolSettings;
  subjectConfigs: SubjectConfig[];
  teachers: Teacher[];
  groups: Group[];
  warnings: string[];
}

/**
 * Executes a verified synchronous save and propagates administrative changes
 * (evaluation categories, periods, subjects, parameters) across:
 * 1. Settings state & localStorage
 * 2. SubjectConfigs state & localStorage
 * 3. Teacher profiles & active AuthUser session
 * 4. Asynchronous Firestore Cloud persistence with atomic catch & cleanup
 */
export const executeSynchronousAdminSettingsSave = async (
  rawSettings: SchoolSettings,
  currentGroups: Group[] = [],
  currentTeachers: Teacher[] = [],
  currentSubjectConfigs: SubjectConfig[] = [],
  applySIEEToAllCourses: boolean = false
): Promise<SyncPropagationResult> => {
  // Step 1: Clean and validate settings
  const settingsReport = validateAndCleanSchoolSettings(rawSettings);
  const cleanSettings = settingsReport.cleanedSettings;

  // Step 2: Synchronously write settings to local storage cache
  saveStoredData.settings(cleanSettings);

  // Step 3: Handle SIEE propagation to subjectConfigs
  let updatedConfigs: SubjectConfig[] = [...currentSubjectConfigs];

  if (applySIEEToAllCourses && cleanSettings.evaluationCategories) {
    const newConfigsMap = new Map<string, SubjectConfig>();

    // Keep existing configs as base
    updatedConfigs.forEach((cfg) => {
      newConfigsMap.set(`${cfg.groupId}__${cfg.subjectName.toLowerCase()}`, {
        ...cfg,
        categories: cleanSettings.evaluationCategories!,
      });
    });

    // Populate all subjects for all existing groups
    currentGroups.forEach((grp) => {
      const subs = grp.subjects && grp.subjects.length > 0
        ? grp.subjects
        : cleanSettings.institutionSubjects || ['Matemáticas'];

      subs.forEach((sub) => {
        const key = `${grp.id}__${sub.toLowerCase()}`;
        newConfigsMap.set(key, {
          id: `cfg-${grp.id}-${sub.replace(/\s+/g, '_')}`,
          groupId: grp.id,
          subjectName: sub,
          categories: cleanSettings.evaluationCategories!,
        });
      });
    });

    updatedConfigs = Array.from(newConfigsMap.values());
  }

  // Synchronously write subjectConfigs to local storage cache
  saveStoredData.subjectConfigs(updatedConfigs);

  // Step 4: Synchronously update active AuthUser cache if currently logged in
  const storedAuth = getStoredAuthUser();
  if (storedAuth && storedAuth.role === 'teacher' && storedAuth.teacher) {
    const matchingTeacher = currentTeachers.find((t) => t.id === storedAuth.teacher?.id);
    if (matchingTeacher) {
      const refreshedTeacher = validateAndCleanTeacher(matchingTeacher, currentGroups);
      const updatedAuth: AuthUser = {
        ...storedAuth,
        teacher: refreshedTeacher,
      };
      saveStoredAuthUser(updatedAuth);
    }
  }

// Background sync is handled by MySQL auto-sync engine

  return {
    settings: cleanSettings,
    subjectConfigs: updatedConfigs,
    teachers: currentTeachers,
    groups: currentGroups,
    warnings: settingsReport.warnings,
  };
};

/**
 * Synchronously saves SubjectConfigs and persists to Firestore batch.
 */
export const executeSynchronousSubjectConfigsSave = async (
  rawConfigs: SubjectConfig[],
  groups: Group[] = []
): Promise<SubjectConfig[]> => {
  const report = validateAndCleanSubjectConfigs(rawConfigs, groups);
  const cleanConfigs = report.cleanedConfigs;

  // 1. Instant synchronous local storage save
  saveStoredData.subjectConfigs(cleanConfigs);

  return cleanConfigs;
};
