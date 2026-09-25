import { AcademicPeriod } from '../types';

export const DEFAULT_ACADEMIC_PERIODS: AcademicPeriod[] = [
  {
    id: 'period-1',
    name: 'Periodo 1',
    code: 'P1',
    startDate: '2026-01-19',
    endDate: '2026-04-10',
    weightPercentage: 25,
    status: 'active',
    description: 'Primer periodo académico del año lectivo.',
  },
  {
    id: 'period-2',
    name: 'Periodo 2',
    code: 'P2',
    startDate: '2026-04-13',
    endDate: '2026-06-19',
    weightPercentage: 25,
    status: 'upcoming',
    description: 'Segundo periodo académico y cierre de primer semestre.',
  },
  {
    id: 'period-3',
    name: 'Periodo 3',
    code: 'P3',
    startDate: '2026-07-07',
    endDate: '2026-09-18',
    weightPercentage: 25,
    status: 'upcoming',
    description: 'Tercer periodo académico tras receso escolar.',
  },
  {
    id: 'period-4',
    name: 'Periodo 4',
    code: 'P4',
    startDate: '2026-09-21',
    endDate: '2026-11-27',
    weightPercentage: 25,
    status: 'upcoming',
    description: 'Cuarto periodo académico y consolidado final de año.',
  },
];

export const PRESET_PERIOD_TEMPLATES = [
  {
    id: 'preset-4p',
    name: '4 Periodos Regulares (25% cada uno)',
    description: 'Esquema tradicional de 4 bimestres/periodos escolares ponderados equitativamente al 25%.',
    periods: DEFAULT_ACADEMIC_PERIODS,
  },
  {
    id: 'preset-3t',
    name: '3 Trimestres Académicos (33.3%)',
    description: 'Distribución en 3 trimestres de avance curricular (33.3%, 33.3%, 33.4%).',
    periods: [
      {
        id: 'trim-1',
        name: 'Primer Trimestre',
        code: 'T1',
        startDate: '2026-01-19',
        endDate: '2026-05-08',
        weightPercentage: 33.3,
        status: 'active',
        description: 'Primer trimestre de evaluación continua.',
      },
      {
        id: 'trim-2',
        name: 'Segundo Trimestre',
        code: 'T2',
        startDate: '2026-05-11',
        endDate: '2026-08-21',
        weightPercentage: 33.3,
        status: 'upcoming',
        description: 'Segundo trimestre de avance formativo.',
      },
      {
        id: 'trim-3',
        name: 'Tercer Trimestre',
        code: 'T3',
        startDate: '2026-08-24',
        endDate: '2026-11-27',
        weightPercentage: 33.4,
        status: 'upcoming',
        description: 'Tercer trimestre y consolidación final de logros.',
      },
    ] as AcademicPeriod[],
  },
  {
    id: 'preset-2s',
    name: '2 Semestres Académicos (50% cada uno)',
    description: 'Esquema semestralizado dividido en dos grandes bloques de evaluación.',
    periods: [
      {
        id: 'sem-1',
        name: 'Semestre 1',
        code: 'S1',
        startDate: '2026-01-19',
        endDate: '2026-06-19',
        weightPercentage: 50,
        status: 'active',
        description: 'Primer semestre académico.',
      },
      {
        id: 'sem-2',
        name: 'Semestre 2',
        code: 'S2',
        startDate: '2026-07-07',
        endDate: '2026-11-27',
        weightPercentage: 50,
        status: 'upcoming',
        description: 'Segundo semestre y cierre institucional.',
      },
    ] as AcademicPeriod[],
  },
];

/**
 * Resolves the academic period that matches a specific date (YYYY-MM-DD).
 * If no period contains the date, falls back to the one marked 'active' or the first one.
 */
export function resolvePeriodByDate(
  periods: AcademicPeriod[] = DEFAULT_ACADEMIC_PERIODS,
  targetDate?: string
): AcademicPeriod | null {
  if (!periods || periods.length === 0) return null;

  const dateToEvaluate = targetDate || new Date().toISOString().split('T')[0];

  // 1. Direct range match (startDate <= date <= endDate)
  const matched = periods.find((p) => {
    if (!p.startDate || !p.endDate) return false;
    return dateToEvaluate >= p.startDate && dateToEvaluate <= p.endDate;
  });

  if (matched) {
    return matched;
  }

  // 2. If before the earliest period, return the first one
  const sorted = [...periods].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  if (sorted[0]?.startDate && dateToEvaluate < sorted[0].startDate) {
    return sorted[0];
  }

  // 3. If after the latest period, return the last one
  const last = sorted[sorted.length - 1];
  if (last?.endDate && dateToEvaluate > last.endDate) {
    return last;
  }

  // 4. Fallback to status === 'active' or first
  return periods.find((p) => p.status === 'active') || periods[0] || null;
}

/**
 * Format date in readable Spanish format e.g. "19 Ene 2026"
 */
export function formatSpanishDate(dateStr?: string): string {
  if (!dateStr) return '';
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${months[month] || parts[1]} ${year}`;
  }
  return dateStr;
}

/**
 * Returns formatted date range e.g. "19 Ene - 10 Abr 2026"
 */
export function formatPeriodDateRange(p: AcademicPeriod): string {
  if (!p.startDate || !p.endDate) return p.name;
  return `${formatSpanishDate(p.startDate)} al ${formatSpanishDate(p.endDate)}`;
}

/**
 * Calculates progress percentage and remaining days for a period
 */
export function calculatePeriodProgress(period: AcademicPeriod, currentDateStr?: string): {
  progressPercent: number;
  daysRemaining: number;
  totalDays: number;
  isCurrent: boolean;
  statusLabel: string;
} {
  const curDate = currentDateStr ? new Date(currentDateStr) : new Date();
  const start = new Date(period.startDate + 'T00:00:00');
  const end = new Date(period.endDate + 'T23:59:59');

  const totalTime = end.getTime() - start.getTime();
  const totalDays = Math.max(1, Math.round(totalTime / (1000 * 60 * 60 * 24)));

  const elapsedTime = curDate.getTime() - start.getTime();
  const remainingTime = end.getTime() - curDate.getTime();
  const daysRemaining = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));

  let progressPercent = 0;
  if (totalTime > 0) {
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsedTime / totalTime) * 100)));
  }

  const isCurrent = curDate >= start && curDate <= end;
  let statusLabel = 'Próximo';
  if (isCurrent) {
    statusLabel = 'En Curso (Activo Hoy)';
  } else if (curDate > end) {
    statusLabel = 'Finalizado';
  }

  return {
    progressPercent,
    daysRemaining,
    totalDays,
    isCurrent,
    statusLabel,
  };
}
