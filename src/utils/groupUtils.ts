import { Group } from '../types';

/**
 * Extracts a numeric sorting score for school grades and group names.
 * Lower numbers represent earlier grades (Preescolar -> Transición -> 1° -> ... -> 11° -> 12°).
 */
export function getGradeRank(gradeStr: string, nameStr: string): {
  gradeNum: number;
  subGradeNum: number;
  sectionCode: string;
} {
  const gradeClean = (gradeStr || '').toLowerCase().trim();
  const nameClean = (nameStr || '').toLowerCase().trim();
  const combined = `${gradeClean} ${nameClean}`.trim();

  // 1. Early Childhood / Preschool levels
  if (/maternal|lactantes/i.test(combined)) {
    return { gradeNum: -5, subGradeNum: 0, sectionCode: '' };
  }
  if (/p[aá]rvulo/i.test(combined)) {
    return { gradeNum: -4, subGradeNum: 0, sectionCode: '' };
  }
  if (/pre[- ]?jard[ií]n/i.test(combined)) {
    return { gradeNum: -3, subGradeNum: 0, sectionCode: '' };
  }
  if (/\bjard[ií]n\b/i.test(combined)) {
    return { gradeNum: -2, subGradeNum: 0, sectionCode: '' };
  }
  if (/transici[oó]n|pre[- ]?escolar|prescolar|kinder|iniciaci[oó]n/i.test(combined)) {
    const subMatch = combined.match(/transici[oó]n\s*(\d+|[a-z])/i);
    const sub = subMatch ? (isNaN(Number(subMatch[1])) ? 0 : Number(subMatch[1])) : 0;
    const sec = subMatch && isNaN(Number(subMatch[1])) ? subMatch[1].toUpperCase() : '';
    return { gradeNum: -1, subGradeNum: sub, sectionCode: sec };
  }
  if (/\b(cero|0°|grado\s*0)\b/i.test(combined) || combined === '0') {
    return { gradeNum: 0, subGradeNum: 0, sectionCode: '' };
  }

  // 2. Adult Education (CLEI)
  const cleiMatch = combined.match(/clei\s*([ivx\d]+)/i);
  if (cleiMatch) {
    const rawVal = cleiMatch[1].toUpperCase();
    const cleiMap: Record<string, number> = {
      '1': 1.5, 'I': 1.5,
      '2': 3.5, 'II': 3.5,
      '3': 6.5, 'III': 6.5,
      '4': 8.5, 'IV': 8.5,
      '5': 10.5, 'V': 10.5,
      '6': 11.5, 'VI': 11.5,
    };
    return { gradeNum: cleiMap[rawVal] || 100, subGradeNum: 0, sectionCode: '' };
  }

  // 3. Word grades (Primero, Segundo, etc.)
  const wordGrades: Array<{ regex: RegExp; grade: number }> = [
    { regex: /\bprimero\b/i, grade: 1 },
    { regex: /\bsegundo\b/i, grade: 2 },
    { regex: /\btercero\b/i, grade: 3 },
    { regex: /\bcuarto\b/i, grade: 4 },
    { regex: /\bquinto\b/i, grade: 5 },
    { regex: /\bsexto\b/i, grade: 6 },
    { regex: /\bs[eé]ptimo\b/i, grade: 7 },
    { regex: /\boctavo\b/i, grade: 8 },
    { regex: /\bnoveno\b/i, grade: 9 },
    { regex: /\bd[eé]cimo\b/i, grade: 10 },
    { regex: /\b(und[eé]cimo|once)\b/i, grade: 11 },
    { regex: /\b(duod[eé]cimo|doce)\b/i, grade: 12 },
  ];

  for (const { regex, grade } of wordGrades) {
    if (regex.test(combined)) {
      return { gradeNum: grade, subGradeNum: 0, sectionCode: '' };
    }
  }

  // 4. Check hyphenated or sectioned format e.g. "6-1", "10-2", "11-3", "6.1", "10.2", "11_1"
  const hyphenMatch = combined.match(/\b(\d{1,2})[-._/](\d{1,2})\b/);
  if (hyphenMatch) {
    return {
      gradeNum: parseInt(hyphenMatch[1], 10),
      subGradeNum: parseInt(hyphenMatch[2], 10),
      sectionCode: '',
    };
  }

  // 5. Check 3-digit or 4-digit standard codes e.g. "601", "602", "1001", "1102"
  const roomCodeMatch = combined.match(/\b(\d{3,4})\b/);
  if (roomCodeMatch) {
    const digits = roomCodeMatch[1];
    if (digits.length === 3) {
      const g = parseInt(digits[0], 10);
      const sub = parseInt(digits.slice(1), 10);
      return { gradeNum: g, subGradeNum: sub, sectionCode: '' };
    } else if (digits.length === 4) {
      const g = parseInt(digits.slice(0, 2), 10);
      const sub = parseInt(digits.slice(2), 10);
      return { gradeNum: g, subGradeNum: sub, sectionCode: '' };
    }
  }

  // 6. Check grade from gradeStr (e.g. "10°" -> 10, "9°" -> 9, "1°" -> 1)
  const gradeNumMatch = gradeClean.match(/\b(\d{1,2})\b/);
  if (gradeNumMatch) {
    const g = parseInt(gradeNumMatch[1], 10);
    // Look for subgrade or section letter in nameClean
    const secLetterMatch = nameClean.match(/\b(?:grado\s*\d+[°º]?\s*)?([a-zA-Z])\b/i);
    const subNumMatch = nameClean.match(/[-_#\s](\d{1,2})\b/);
    return {
      gradeNum: g,
      subGradeNum: subNumMatch ? parseInt(subNumMatch[1], 10) : 0,
      sectionCode: secLetterMatch ? secLetterMatch[1].toUpperCase() : '',
    };
  }

  // 7. Check numbers in nameClean (e.g. "Grado 6° A" -> 6)
  const nameNumMatch = nameClean.match(/\b(\d{1,2})\b/);
  if (nameNumMatch) {
    const secLetterMatch = nameClean.match(/\b(?:grado\s*\d+[°º]?\s*)?([a-zA-Z])\b/i);
    return {
      gradeNum: parseInt(nameNumMatch[1], 10),
      subGradeNum: 0,
      sectionCode: secLetterMatch ? secLetterMatch[1].toUpperCase() : '',
    };
  }

  // Fallback for custom or text-only group names
  return {
    gradeNum: 999,
    subGradeNum: 0,
    sectionCode: '',
  };
}

/**
 * Sorts an array of groups from lowest grade to highest grade (Menor a Mayor).
 * E.g., Transición -> 1° -> 2° -> ... -> 9° -> 10° -> 11°.
 * Returns a new sorted array.
 */
export function sortGroupsAscending<T extends Group>(groups: T[]): T[] {
  if (!groups || groups.length <= 1) return groups ? [...groups] : [];

  return [...groups].sort((a, b) => {
    const rankA = getGradeRank(a.grade || '', a.name || '');
    const rankB = getGradeRank(b.grade || '', b.name || '');

    // 1. Primary: Numeric Grade (e.g. -1 < 1 < 2 < ... < 10 < 11)
    if (rankA.gradeNum !== rankB.gradeNum) {
      return rankA.gradeNum - rankB.gradeNum;
    }

    // 2. Secondary: Subgrade number (e.g. 6-1 before 6-2, or 601 before 602)
    if (rankA.subGradeNum !== rankB.subGradeNum) {
      return rankA.subGradeNum - rankB.subGradeNum;
    }

    // 3. Tertiary: Section letter (e.g. 10° A before 10° B)
    if (rankA.sectionCode && rankB.sectionCode && rankA.sectionCode !== rankB.sectionCode) {
      return rankA.sectionCode.localeCompare(rankB.sectionCode);
    }

    // 4. Natural language comparison on full group name
    const nameComp = (a.name || '').localeCompare(b.name || '', 'es', {
      numeric: true,
      sensitivity: 'base',
    });
    if (nameComp !== 0) return nameComp;

    // 5. Fallback: Shift order (Mañana -> Tarde -> Única -> Nocturna)
    const shiftOrder: Record<string, number> = {
      'Mañana': 1,
      'Tarde': 2,
      'Única': 3,
      'Nocturna': 4,
    };
    const sA = shiftOrder[a.shift] || 5;
    const sB = shiftOrder[b.shift] || 5;
    if (sA !== sB) return sA - sB;

    return (a.id || '').localeCompare(b.id || '');
  });
}
