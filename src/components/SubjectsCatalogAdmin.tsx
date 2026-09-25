import React, { useState, useMemo } from 'react';
import { SchoolSettings, Teacher, Group } from '../types';
import { DEFAULT_INSTITUTION_SUBJECTS } from '../utils/storage';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  RotateCcw, 
  Sparkles, 
  GraduationCap, 
  School,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface SubjectsCatalogAdminProps {
  settings: SchoolSettings;
  teachers: Teacher[];
  groups: Group[];
  onUpdateSettings: (settings: SchoolSettings) => void;
  onUpdateTeachers?: (teachers: Teacher[]) => void;
  onUpdateGroups?: (groups: Group[]) => void;
}

const COMMON_SUGGESTED_SUBJECTS = [
  'Matemáticas',
  'Lengua Castellana',
  'Ciencias Naturales y Educación Ambiental',
  'Biología',
  'Química',
  'Física',
  'Ciencias Sociales',
  'Historia',
  'Geografía',
  'Democracia y Constitución',
  'Inglés / Lengua Extranjera',
  'Educación Artística y Cultural',
  'Educación Física, Recreación y Deportes',
  'Tecnología e Informática',
  'Filosofía',
  'Ética y Valores Humanos',
  'Educación Religiosa',
  'Emprendimiento y Finanzas',
  'Ciencias Políticas y Económicas',
  'Estadística y Geometría'
];

export const SubjectsCatalogAdmin: React.FC<SubjectsCatalogAdminProps> = ({
  settings,
  teachers,
  groups,
  onUpdateSettings,
  onUpdateTeachers,
  onUpdateGroups,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentSubjects = useMemo(() => {
    if (settings.institutionSubjects && settings.institutionSubjects.length > 0) {
      return settings.institutionSubjects;
    }
    return DEFAULT_INSTITUTION_SUBJECTS;
  }, [settings.institutionSubjects]);

  const filteredSubjects = useMemo(() => {
    return currentSubjects.filter((subj) =>
      subj.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentSubjects, searchTerm]);

  // Suggestions that are not yet in current subjects
  const unaddedSuggestions = useMemo(() => {
    const set = new Set(currentSubjects.map((s) => s.toLowerCase()));
    return COMMON_SUGGESTED_SUBJECTS.filter((s) => !set.has(s.toLowerCase()));
  }, [currentSubjects]);

  const showFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Add a new subject
  const handleAddSubject = (subjectName: string) => {
    const trimmed = subjectName.trim();
    if (!trimmed) return;

    if (currentSubjects.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      alert(`La asignatura "${trimmed}" ya existe en el catálogo institucional.`);
      return;
    }

    const updated = [...currentSubjects, trimmed];
    onUpdateSettings({
      ...settings,
      institutionSubjects: updated,
    });

    setNewSubjectInput('');
    showFeedback(`Asignatura "${trimmed}" agregada exitosamente.`);
  };

  // Start editing a subject
  const handleStartEdit = (index: number, val: string) => {
    setEditingIndex(index);
    setEditingValue(val);
  };

  // Save edited subject
  const handleSaveEdit = (oldVal: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === oldVal) {
      setEditingIndex(null);
      return;
    }

    const updated = currentSubjects.map((s) => (s === oldVal ? trimmed : s));
    onUpdateSettings({
      ...settings,
      institutionSubjects: updated,
    });

    // Update teachers if they had this subject
    if (onUpdateTeachers) {
      const updatedTeachers = teachers.map((t) => {
        const hasOld = (t.assignedSubjects || []).includes(oldVal);
        const hasAssignment = (t.assignments || []).some((a) => a.subject === oldVal);

        if (hasOld || hasAssignment) {
          const newAssignedSubjects = (t.assignedSubjects || []).map((s) => (s === oldVal ? trimmed : s));
          const newAssignments = (t.assignments || []).map((a) =>
            a.subject === oldVal ? { ...a, subject: trimmed } : a
          );
          return {
            ...t,
            assignedSubjects: newAssignedSubjects,
            assignments: newAssignments,
          };
        }
        return t;
      });
      onUpdateTeachers(updatedTeachers);
    }

    // Update groups if they had this subject
    if (onUpdateGroups) {
      const updatedGroups = groups.map((g) => {
        if ((g.subjects || []).includes(oldVal)) {
          return {
            ...g,
            subjects: g.subjects.map((s) => (s === oldVal ? trimmed : s)),
          };
        }
        return g;
      });
      onUpdateGroups(updatedGroups);
    }

    setEditingIndex(null);
    showFeedback(`Asignatura renombrada a "${trimmed}".`);
  };

  // Delete a subject
  const handleDeleteSubject = (subjectToDelete: string) => {
    const teachersTeaching = teachers.filter((t) =>
      (t.assignedSubjects || []).includes(subjectToDelete) ||
      (t.assignments || []).some((a) => a.subject === subjectToDelete)
    );

    if (teachersTeaching.length > 0) {
      if (
        !confirm(
          `⚠️ La asignatura "${subjectToDelete}" está asignada a ${teachersTeaching.length} docente(s).\n\n¿Deseas eliminarla del catálogo de todos modos?`
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`¿Eliminar la asignatura "${subjectToDelete}" del catálogo institucional?`)) {
        return;
      }
    }

    const updated = currentSubjects.filter((s) => s !== subjectToDelete);
    onUpdateSettings({
      ...settings,
      institutionSubjects: updated,
    });

    showFeedback(`Asignatura "${subjectToDelete}" eliminada del catálogo.`);
  };

  // Restore default subjects
  const handleRestoreDefaults = () => {
    if (
      confirm(
        '¿Deseas restaurar la lista de asignaturas institucionales a los valores predeterminados?'
      )
    ) {
      onUpdateSettings({
        ...settings,
        institutionSubjects: DEFAULT_INSTITUTION_SUBJECTS,
      });
      showFeedback('Catálogo de asignaturas restaurado a los valores predeterminados.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Catálogo Institucional de Asignaturas
              </h2>
              <p className="text-xs text-slate-400">
                Define las áreas y materias disponibles para que los docentes las seleccionen y asocien a sus cursos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5 border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar Predeterminadas</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center space-x-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Add New Subject Form & Search Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Add Subject Card */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Agregar Nueva Asignatura</span>
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddSubject(newSubjectInput);
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Nombre de la Asignatura:
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Educación Ambiental, Robótica..."
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={!newSubjectInput.trim()}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-950/50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar en Catálogo</span>
            </button>
          </form>

          {/* Quick Suggestions */}
          {unaddedSuggestions.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Sugerencias rápidas para agregar (+1 clic):</span>
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {unaddedSuggestions.slice(0, 10).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleAddSubject(sug)}
                    className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/50 text-[10px] font-medium text-slate-300 hover:text-purple-200 border border-slate-700/60 hover:border-purple-600/60 transition-all text-left truncate max-w-full"
                    title={`Agregar ${sug}`}
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Subjects List & Search */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Asignaturas Registradas ({currentSubjects.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Estas asignaturas aparecen en los desplegables de docentes y grupos.
              </p>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar asignatura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Subjects Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredSubjects.map((subject, idx) => {
              const isEditing = editingIndex === idx;
              
              // Count teachers who teach this subject
              const teachersWithSubject = teachers.filter((t) =>
                (t.assignedSubjects || []).some((s) => s.toLowerCase() === subject.toLowerCase()) ||
                (t.assignments || []).some((a) => a.subject.toLowerCase() === subject.toLowerCase())
              );

              // Count groups where this subject is registered
              const groupsWithSubject = groups.filter((g) =>
                (g.subjects || []).some((s) => s.toLowerCase() === subject.toLowerCase())
              );

              return (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-all gap-2"
                >
                  {isEditing ? (
                    <div className="flex items-center space-x-1.5 flex-1">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 px-2 py-1 bg-slate-800 border border-purple-500 rounded-lg text-xs text-slate-100 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(subject)}
                        className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                        title="Guardar cambio"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-100 block truncate">
                          {subject}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="flex items-center space-x-1">
                            <GraduationCap className="w-3 h-3 text-purple-400" />
                            <span>{teachersWithSubject.length} docentes</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <School className="w-3 h-3 text-indigo-400" />
                            <span>{groupsWithSubject.length} cursos</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx, subject)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Renombrar asignatura"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(subject)}
                          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-800/30 transition-colors"
                          title="Eliminar del catálogo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
