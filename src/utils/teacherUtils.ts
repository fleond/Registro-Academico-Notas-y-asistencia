import { Teacher, Group, SchoolSettings, AuthUser } from '../types';
import { DEFAULT_INSTITUTION_SUBJECTS } from './storage';

/**
 * Filter out academic degrees, university titles, or professional credentials
 * that might have been accidentally saved in subject fields.
 */
export const isTeacherDegreeOrTitle = (str?: string): boolean => {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  return (
    /^(licenciad|magister|magíster|especialista|ingenier|profesor|docente|fil[oó]sof|bi[oó]log|qu[ií]mic|abogad|psic[oó]log|antrop[oó]log)/i.test(
      s
    ) &&
    (s.includes(' en ') ||
      s.includes(' de ') ||
      s.includes(' y ') ||
      s.includes(' con ') ||
      s.includes(' - '))
  );
};

/**
 * Robustly resolves the active Teacher entity from current AuthUser and teachers list.
 * Matches by:
 * 1. Explicit currentUser.teacher
 * 2. Exact ID match (currentUser.id === teacher.id)
 * 3. Document ID match (currentUser.documentId === teacher.documentId)
 * 4. Email match (case-insensitive)
 * 5. Name match (case-insensitive, ignoring titles like "Prof.", "Lic.", etc.)
 */
export const resolveActiveTeacher = (
  currentUser?: AuthUser | null,
  teachers: Teacher[] = []
): Teacher | null => {
  if (!currentUser) return null;
  if (currentUser.teacher) return currentUser.teacher;
  if (!teachers || teachers.length === 0) return null;

  // 1. Direct ID match
  const byId = teachers.find((t) => t.id === currentUser.id);
  if (byId) return byId;

  // 2. Document ID match
  if (currentUser.documentId) {
    const byDoc = teachers.find(
      (t) => t.documentId && t.documentId.trim() === currentUser.documentId?.trim()
    );
    if (byDoc) return byDoc;
  }

  // 3. Email match (critical for Google OAuth users like fleond@gmail.com)
  if (currentUser.email) {
    const userEmail = currentUser.email.trim().toLowerCase();
    const byEmail = teachers.find(
      (t) => t.email && t.email.trim().toLowerCase() === userEmail
    );
    if (byEmail) return byEmail;
  }

  // 4. Name match (flexible cleaning)
  if (currentUser.name) {
    const cleanName = (n: string) =>
      n
        .replace(/^(prof\.|profesor|profesora|lic\.|licenciado|licenciada|docente)\s+/i, '')
        .trim()
        .toLowerCase();

    const targetClean = cleanName(currentUser.name);

    const byName = teachers.find((t) => {
      const tClean = cleanName(t.name);
      return (
        tClean === targetClean ||
        tClean.includes(targetClean) ||
        targetClean.includes(tClean)
      );
    });
    if (byName) return byName;
  }

  return null;
};

/**
 * Extracts and consolidates all teacher-subject associations for a given group.
 */
export interface GroupTeacherAssociation {
  teacherId: string;
  teacherName: string;
  teacherSpecialty?: string;
  subject: string;
  isStructured: boolean; // true if from teacher.assignments
}

export const getGroupTeacherAssociations = (
  group: Group,
  teachers: Teacher[] = []
): GroupTeacherAssociation[] => {
  const assocs: GroupTeacherAssociation[] = [];
  const seenKeys = new Set<string>();

  teachers.forEach((t) => {
    // 1. Structured assignments
    if (t.assignments && t.assignments.length > 0) {
      t.assignments
        .filter((a) => a.groupId === group.id)
        .forEach((a) => {
          const subject = a.subject?.trim();
          if (subject && !isTeacherDegreeOrTitle(subject)) {
            const key = `${t.id}_${subject.toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              assocs.push({
                teacherId: t.id,
                teacherName: t.name,
                teacherSpecialty: t.specialty,
                subject,
                isStructured: true,
              });
            }
          }
        });
    }

    // 2. Fallback: teacher is assigned to this group via assignedGroupIds
    if ((t.assignedGroupIds || []).includes(group.id)) {
      const cleanSubs = (t.assignedSubjects || [])
        .map((s) => s.trim())
        .filter((s) => s && !isTeacherDegreeOrTitle(s));

      const cleanGroupSubs = (group.subjects || [])
        .map((s) => s.trim())
        .filter((s) => s && !isTeacherDegreeOrTitle(s));

      // Subjects that this teacher teaches in this group
      cleanSubs.forEach((sub) => {
        const key = `${t.id}_${sub.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          assocs.push({
            teacherId: t.id,
            teacherName: t.name,
            teacherSpecialty: t.specialty,
            subject: sub,
            isStructured: false,
          });
        }
      });
    }
  });

  return assocs;
};

/**
 * Resolves the valid, prioritized subjects list for a group and teacher.
 * Fixes the issue where an active teacher saw a generic or unassigned subject instead
 * of their actual associated subject (e.g. Tecnología for Fredy León in 503).
 */
export const getSubjectsForGroupAndTeacher = (
  group?: Group | null,
  teacher?: Teacher | null,
  allTeachers: Teacher[] = [],
  settings?: SchoolSettings,
  isTeacherView: boolean = true
): string[] => {
  if (!group) {
    const institutionSubs = (settings?.institutionSubjects || DEFAULT_INSTITUTION_SUBJECTS)
      .map((s) => s.trim())
      .filter((s) => s && !isTeacherDegreeOrTitle(s));
    return institutionSubs.length > 0 ? institutionSubs : ['Matemáticas'];
  }

  // -------------------------------------------------------------
  // TEACHER VIEW: Strict prioritization for the active teacher
  // -------------------------------------------------------------
  if (isTeacherView && teacher) {
    // 1. Direct explicit assignments for this teacher in this group
    const directTeacherAssocs = (teacher.assignments || [])
      .filter((a) => a.groupId === group.id)
      .map((a) => a.subject?.trim())
      .filter((s) => s && !isTeacherDegreeOrTitle(s));

    if (directTeacherAssocs.length > 0) {
      return Array.from(new Set(directTeacherAssocs));
    }

    // 2. Clean teacher assigned subjects from their profile
    const teacherProfileSubs = (teacher.assignedSubjects || [])
      .map((s) => s.trim())
      .filter((s) => s && !isTeacherDegreeOrTitle(s));

    // 3. Clean group subjects
    const groupSubs = (group.subjects || [])
      .map((s) => s.trim())
      .filter((s) => s && !isTeacherDegreeOrTitle(s));

    // 4. Check intersection between teacher's subjects and group's subjects
    if (teacherProfileSubs.length > 0 && groupSubs.length > 0) {
      const intersection = groupSubs.filter((gsub) =>
        teacherProfileSubs.some((tsub) => tsub.toLowerCase() === gsub.toLowerCase())
      );
      if (intersection.length > 0) {
        return intersection;
      }
    }

    // 5. If teacher has assigned subjects (e.g. ['Tecnología e Informática']), return those!
    if (teacherProfileSubs.length > 0) {
      return teacherProfileSubs;
    }

    // 6. Fallback to group's subjects
    if (groupSubs.length > 0) {
      return groupSubs;
    }
  }

  // -------------------------------------------------------------
  // ADMIN / GENERAL VIEW: Comprehensive list of all subjects in the group
  // -------------------------------------------------------------
  const fromTeachersForGroup = allTeachers.flatMap((t) =>
    (t.assignments || [])
      .filter((a) => a.groupId === group.id)
      .map((a) => a.subject?.trim())
      .filter((s) => s && !isTeacherDegreeOrTitle(s))
  );

  const cleanGroupBase = (group.subjects || [])
    .map((s) => s.trim())
    .filter((s) => s && !isTeacherDegreeOrTitle(s));

  const combined = Array.from(new Set([...cleanGroupBase, ...fromTeachersForGroup]));
  if (combined.length > 0) {
    return combined;
  }

  const institutionSubs = (settings?.institutionSubjects || DEFAULT_INSTITUTION_SUBJECTS)
    .map((s) => s.trim())
    .filter((s) => s && !isTeacherDegreeOrTitle(s));

  return institutionSubs.length > 0
    ? institutionSubs
    : ['Matemáticas', 'Lengua Castellana', 'Ciencias Naturales', 'Tecnología e Informática', 'Inglés', 'Ciencias Sociales'];
};
