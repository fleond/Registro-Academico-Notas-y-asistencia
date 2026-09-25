import React, { useState, useEffect, useMemo } from 'react';
import { EvaluationCategory, Group, SubjectConfig } from '../types';
import { 
  EVALUATION_PRESET_TEMPLATES, 
  EvaluationPresetTemplate, 
  DEFAULT_EVALUATION_CATEGORIES,
  getStoredData, 
  saveStoredData 
} from '../utils/storage';
import { validateAndCleanEvaluationCategories } from '../utils/syncValidation';
import { 
  Sliders, 
  CheckCheck, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Calculator, 
  Info, 
  X, 
  Check, 
  ChevronRight,
  HelpCircle,
  Copy,
  Building2,
  RefreshCw
} from 'lucide-react';

export interface EvaluationSaveScopeOptions {
  applyToAllSubjectsInGroup?: boolean;
  applyToAllGroupsForSubject?: boolean;
  applyToAllTeacherAssignments?: boolean;
}

export interface EvaluationWeightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup?: Group | null;
  selectedSubject?: string;
  currentCategories?: EvaluationCategory[];
  allGroups?: Group[];
  allTeacherSubjects?: string[];
  institutionalCategories?: EvaluationCategory[];
  onSaveCategories: (
    updatedCategories: EvaluationCategory[], 
    options?: EvaluationSaveScopeOptions | boolean
  ) => void;
  // Aliases for compatibility
  categories?: EvaluationCategory[];
  subjectName?: string;
  groupName?: string;
  onApplyToAllGroups?: (newCategories: EvaluationCategory[], targetGroupIds: string[]) => void;
}

const CATEGORY_COLORS = [
  { id: 'indigo', label: 'Índigo', bgClass: 'bg-indigo-500/20', textClass: 'text-indigo-300', borderClass: 'border-indigo-500/40', badgeClass: 'bg-indigo-600' },
  { id: 'teal', label: 'Verde Azulado', bgClass: 'bg-teal-500/20', textClass: 'text-teal-300', borderClass: 'border-teal-500/40', badgeClass: 'bg-teal-600' },
  { id: 'amber', label: 'Ámbar', bgClass: 'bg-amber-500/20', textClass: 'text-amber-300', borderClass: 'border-amber-500/40', badgeClass: 'bg-amber-600' },
  { id: 'rose', label: 'Rosa / Rojo', bgClass: 'bg-rose-500/20', textClass: 'text-rose-300', borderClass: 'border-rose-500/40', badgeClass: 'bg-rose-600' },
  { id: 'purple', label: 'Púrpura', bgClass: 'bg-purple-500/20', textClass: 'text-purple-300', borderClass: 'border-purple-500/40', badgeClass: 'bg-purple-600' },
  { id: 'emerald', label: 'Esmeralda', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-300', borderClass: 'border-emerald-500/40', badgeClass: 'bg-emerald-600' },
  { id: 'sky', label: 'Celeste', bgClass: 'bg-sky-500/20', textClass: 'text-sky-300', borderClass: 'border-sky-500/40', badgeClass: 'bg-sky-600' },
  { id: 'orange', label: 'Naranja', bgClass: 'bg-orange-500/20', textClass: 'text-orange-300', borderClass: 'border-orange-500/40', badgeClass: 'bg-orange-600' },
];

const SUGGESTED_QUICK_CATEGORIES = [
  { name: 'Heteroevaluación', code: 'HET', defaultWeight: 50, color: 'indigo', desc: 'Evaluaciones, talleres y quices valorados por el docente' },
  { name: 'Coevaluación', code: 'COE', defaultWeight: 15, color: 'teal', desc: 'Evaluación formativa entre pares y trabajo en equipo' },
  { name: 'Autoevaluación', code: 'AUT', defaultWeight: 10, color: 'amber', desc: 'Reflexión y compromiso individual del estudiante' },
  { name: 'Examen Final', code: 'EXF', defaultWeight: 25, color: 'rose', desc: 'Prueba acumulativa o proyecto integrador de fin de periodo' },
  { name: 'SABER (Cognitivo)', code: 'SAB', defaultWeight: 40, color: 'indigo', desc: 'Pruebas escritas, quices y exámenes teóricos' },
  { name: 'HACER (Procedimental)', code: 'HAC', defaultWeight: 40, color: 'teal', desc: 'Talleres, guías, tareas, proyectos y laboratorios' },
  { name: 'SER (Actitudinal)', code: 'SER', defaultWeight: 20, color: 'amber', desc: 'Puntualidad, asistencia, convivencia y valores' },
  { name: 'Talleres y Guías', code: 'TAL', defaultWeight: 30, color: 'sky', desc: 'Ejercicios y guías desarrolladas en clase' },
  { name: 'Quices / Pruebas', code: 'QZ', defaultWeight: 20, color: 'purple', desc: 'Comprobaciones cortas de lectura y conocimiento' },
  { name: 'Proyecto de Aula', code: 'PRY', defaultWeight: 25, color: 'emerald', desc: 'Investigación formativa o producto de periodo' },
];

export const EvaluationWeightingModal: React.FC<EvaluationWeightingModalProps> = ({
  isOpen,
  onClose,
  selectedGroup,
  selectedSubject,
  currentCategories,
  allGroups = [],
  allTeacherSubjects = [],
  institutionalCategories,
  onSaveCategories,
  categories: legacyCategories,
  subjectName: legacySubjectName,
  groupName: legacyGroupName,
  onApplyToAllGroups,
}) => {
  const [categories, setCategories] = useState<EvaluationCategory[]>([]);
  const [saveScope, setSaveScope] = useState<'single' | 'group_subjects' | 'subject_all_groups' | 'all_assignments'>('single');
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'simulator'>('editor');
  
  // Simulator state
  const [simulatedScores, setSimulatedScores] = useState<Record<string, number>>({});

  const effectiveSubject = selectedSubject || legacySubjectName || 'Materia';
  const effectiveGroupName = selectedGroup?.name || legacyGroupName || 'Curso Seleccionado';

  // Initialize categories when modal opens or incoming categories change
  useEffect(() => {
    if (isOpen) {
      const incoming = currentCategories || legacyCategories;
      if (incoming && incoming.length > 0) {
        setCategories(JSON.parse(JSON.stringify(incoming)));
      } else if (institutionalCategories && institutionalCategories.length > 0) {
        setCategories(JSON.parse(JSON.stringify(institutionalCategories)));
      } else {
        setCategories(JSON.parse(JSON.stringify(DEFAULT_EVALUATION_CATEGORIES)));
      }
      setSaveScope('single');
    }
  }, [isOpen, currentCategories, legacyCategories, institutionalCategories]);

  // Initialize simulated scores for each category
  useEffect(() => {
    const initialSim: Record<string, number> = {};
    categories.forEach((c) => {
      initialSim[c.id] = simulatedScores[c.id] !== undefined ? simulatedScores[c.id] : 4.0;
    });
    setSimulatedScores(initialSim);
  }, [categories.length]);

  // Total weight sum
  const totalWeight = useMemo(() => {
    return categories.reduce((sum, c) => sum + (Number(c.weightPercentage) || 0), 0);
  }, [categories]);

  const isBalanced = totalWeight === 100;

  // Simulator calculation
  const simulatedDefinitive = useMemo(() => {
    if (categories.length === 0) return 0;
    let weightedSum = 0;
    categories.forEach((c) => {
      const score = simulatedScores[c.id] !== undefined ? simulatedScores[c.id] : 4.0;
      weightedSum += score * ((Number(c.weightPercentage) || 0) / 100);
    });
    return Number(weightedSum.toFixed(2));
  }, [categories, simulatedScores]);

  // Color lookup helper
  const getColorDetails = (colorId?: string) => {
    return CATEGORY_COLORS.find((c) => c.id === colorId) || CATEGORY_COLORS[0];
  };

  // Handler: Update category properties
  const handleUpdateCategory = (idx: number, updates: Partial<EvaluationCategory>) => {
    const updated = [...categories];
    updated[idx] = { ...updated[idx], ...updates };
    setCategories(updated);
  };

  // Handler: Add new blank category
  const handleAddCategory = () => {
    const newId = `cat-${Date.now()}`;
    const nextColor = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length].id;
    const remaining = Math.max(0, 100 - totalWeight);
    const newCat: EvaluationCategory = {
      id: newId,
      name: `Nueva Categoría ${categories.length + 1}`,
      code: `C${categories.length + 1}`,
      weightPercentage: remaining > 0 ? remaining : 10,
      description: '',
      color: nextColor,
    };
    setCategories([...categories, newCat]);
  };

  // Handler: Add quick suggested category
  const handleAddQuickSuggestion = (sug: typeof SUGGESTED_QUICK_CATEGORIES[0]) => {
    const exists = categories.some((c) => c.name.toLowerCase() === sug.name.toLowerCase());
    if (exists) {
      alert(`La categoría "${sug.name}" ya está en la lista.`);
      return;
    }
    const newId = `cat-${Date.now()}`;
    const remaining = Math.max(0, 100 - totalWeight);
    const assignedWeight = remaining > 0 ? Math.min(sug.defaultWeight, remaining) : sug.defaultWeight;

    const newCat: EvaluationCategory = {
      id: newId,
      name: sug.name,
      code: sug.code,
      weightPercentage: assignedWeight,
      description: sug.desc,
      color: sug.color,
    };
    setCategories([...categories, newCat]);
  };

  // Handler: Delete category
  const handleDeleteCategory = (idx: number) => {
    if (categories.length <= 1) {
      alert('Debe existir al menos una categoría de evaluación.');
      return;
    }
    const updated = categories.filter((_, i) => i !== idx);
    setCategories(updated);
  };

  // Handler: Load Preset Template
  const handleApplyPreset = (preset: EvaluationPresetTemplate) => {
    setCategories(JSON.parse(JSON.stringify(preset.categories)));
  };

  // Handler: Load Institutional SIEE
  const handleApplyInstitutionalSIEE = () => {
    if (institutionalCategories && institutionalCategories.length > 0) {
      setCategories(JSON.parse(JSON.stringify(institutionalCategories)));
    } else {
      setCategories(JSON.parse(JSON.stringify(DEFAULT_EVALUATION_CATEGORIES)));
    }
  };

  // Handler: Auto-balance percentages proportionally to sum 100%
  const handleBalanceProportionally = () => {
    if (totalWeight <= 0 || categories.length === 0) return;
    let accumulated = 0;
    const updated = categories.map((cat, idx) => {
      if (idx === categories.length - 1) {
        // Last one gets remainder to guarantee exact 100
        const lastVal = Math.max(1, 100 - accumulated);
        return { ...cat, weightPercentage: lastVal };
      }
      const raw = Math.round((cat.weightPercentage / totalWeight) * 100);
      const val = Math.max(1, raw);
      accumulated += val;
      return { ...cat, weightPercentage: val };
    });
    setCategories(updated);
  };

  // Handler: Distribute Equally
  const handleDistributeEqually = () => {
    if (categories.length === 0) return;
    const count = categories.length;
    const base = Math.floor(100 / count);
    const remainder = 100 % count;
    const updated = categories.map((cat, idx) => ({
      ...cat,
      weightPercentage: base + (idx < remainder ? 1 : 0),
    }));
    setCategories(updated);
  };

  // Handler: Save
  const handleSave = () => {
    if (categories.length === 0) {
      alert('Debes agregar al menos una categoría de evaluación.');
      return;
    }

    const validation = validateAndCleanEvaluationCategories(categories);

    if (!validation.isBalanced) {
      const confirmSave = confirm(
        `⚠️ La suma de las ponderaciones es de ${validation.totalWeight}% (no totaliza el 100%).\n\n¿Deseas guardar esta configuración de todas formas?`
      );
      if (!confirmSave) return;
    }

    const options: EvaluationSaveScopeOptions = {
      applyToAllSubjectsInGroup: saveScope === 'group_subjects',
      applyToAllGroupsForSubject: saveScope === 'subject_all_groups',
      applyToAllTeacherAssignments: saveScope === 'all_assignments',
    };

    onSaveCategories(validation.cleanedCategories, options);

    if (onApplyToAllGroups && (saveScope === 'all_assignments' || saveScope === 'subject_all_groups')) {
      const targetGroupIds = allGroups.map((g) => g.id);
      onApplyToAllGroups(validation.cleanedCategories, targetGroupIds);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-3xl my-auto max-h-[92dvh] flex flex-col border border-slate-800 text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">
                  Ponderación y Categorías de Evaluación
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  SIEE Personalizable
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ajusta las categorías (Heteroevaluación, Coevaluación, Autoevaluación, Examen Final, etc.) y su peso en la nota definitiva.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Context Banner & Tabs */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Aplicando para:</span>
            <span className="font-bold text-indigo-300 bg-indigo-950/50 px-2.5 py-0.5 rounded-md border border-indigo-800/40">
              {effectiveGroupName} • {effectiveSubject}
            </span>
          </div>

          {/* Sub-tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustar Categorías</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Plantillas Rápidas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulador</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: CATEGORIES EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-5">
              
              {/* Quick suggestions pills and Institutional Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Añadir Componente Rápido o Cargar Institucional:
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyInstitutionalSIEE}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Restablecer a la ponderación oficial configurada por Rectoría / Administración"
                  >
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Cargar Modelo Institucional (SIEE)</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUICK_CATEGORIES.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => handleAddQuickSuggestion(sug)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/60 transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-indigo-400" />
                      <span>{sug.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({sug.defaultWeight}%)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Category List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Categorías Activas ({categories.length})</span>
                  <span className="text-slate-400">Ponderación (%)</span>
                </div>

                <div className="space-y-3">
                  {categories.map((cat, idx) => {
                    const colorSpec = getColorDetails(cat.color);

                    return (
                      <div
                        key={cat.id || idx}
                        className={`p-4 rounded-xl border transition-all ${colorSpec.bgClass} ${colorSpec.borderClass} space-y-3`}
                      >
                        {/* Main row: Name, Code, Weight, Color, Delete */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          {/* Name Input */}
                          <div className="flex-1 w-full space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              Nombre de la Categoría
                            </label>
                            <input
                              type="text"
                              required
                              value={cat.name}
                              onChange={(e) => handleUpdateCategory(idx, { name: e.target.value })}
                              placeholder="Ej: Heteroevaluación, Coevaluación, Examen Final..."
                              className="w-full text-xs font-bold p-2 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                            />
                          </div>

                          {/* Code Tag (Optional) */}
                          <div className="w-20 space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              Código
                            </label>
                            <input
                              type="text"
                              maxLength={5}
                              value={cat.code || ''}
                              onChange={(e) => handleUpdateCategory(idx, { code: e.target.value.toUpperCase() })}
                              placeholder="HET"
                              className="w-full text-center text-xs font-mono font-bold p-2 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 uppercase focus:outline-none"
                            />
                          </div>

                          {/* Color Selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              Color
                            </label>
                            <div className="flex items-center space-x-1 p-1 bg-slate-900/90 border border-slate-700 rounded-lg">
                              {CATEGORY_COLORS.slice(0, 4).map((clr) => (
                                <button
                                  key={clr.id}
                                  type="button"
                                  onClick={() => handleUpdateCategory(idx, { color: clr.id })}
                                  className={`w-5 h-5 rounded-full ${clr.badgeClass} transition-transform cursor-pointer ${
                                    cat.color === clr.id
                                      ? 'ring-2 ring-white scale-110'
                                      : 'opacity-60 hover:opacity-100'
                                  }`}
                                  title={clr.label}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Weight input */}
                          <div className="w-28 space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              Ponderación (%)
                            </label>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={cat.weightPercentage}
                                onChange={(e) =>
                                  handleUpdateCategory(idx, {
                                    weightPercentage: Number(e.target.value),
                                  })
                                }
                                className="w-full text-center text-sm font-mono font-bold p-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                              <span className="text-xs font-bold text-slate-400">%</span>
                            </div>
                          </div>

                          {/* Delete Button */}
                          {categories.length > 1 && (
                            <div className="sm:pt-5">
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(idx)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900/60 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Slider and Description Sub-Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800/50">
                          {/* Slider for smooth weight adjusting */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Ajuste con barra:</span>
                              <span className="font-mono font-bold text-slate-200">
                                {cat.weightPercentage}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={cat.weightPercentage}
                              onChange={(e) =>
                                handleUpdateCategory(idx, {
                                  weightPercentage: Number(e.target.value),
                                })
                              }
                              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                            />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              Descripción / Instrumentos incluidos
                            </label>
                            <input
                              type="text"
                              value={cat.description || ''}
                              onChange={(e) =>
                                handleUpdateCategory(idx, { description: e.target.value })
                              }
                              placeholder="Ej: Quices, talleres, participación, proyectos..."
                              className="w-full text-xs p-1.5 bg-slate-900/70 border border-slate-700/70 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Category Button */}
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all bg-slate-900/30 hover:bg-slate-900/70 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Otra Categoría de Evaluación</span>
                </button>
              </div>

              {/* Total Weight Status Bar */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isBalanced ? (
                      <CheckCheck className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {isBalanced
                          ? 'Ponderación Perfecta (100%)'
                          : `Ponderación Descuadrada (${totalWeight}% / 100%)`}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {isBalanced
                          ? 'Todas las categorías suman el 100% de la nota final del periodo.'
                          : `Diferencia de ${Math.abs(100 - totalWeight)}% respecto al 100% requerido.`}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-sm font-bold px-3 py-1 rounded-lg ${
                      isBalanced
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                        : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                    }`}
                  >
                    {totalWeight}%
                  </span>
                </div>

                {/* Visual Multi-color Progress bar */}
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  {categories.map((c, i) => {
                    const colorSpec = getColorDetails(c.color);
                    const widthPercent = totalWeight > 0 ? (c.weightPercentage / Math.max(100, totalWeight)) * 100 : 0;
                    return (
                      <div
                        key={i}
                        style={{ width: `${widthPercent}%` }}
                        className={`${colorSpec.badgeClass} h-full transition-all`}
                        title={`${c.name}: ${c.weightPercentage}%`}
                      />
                    );
                  })}
                </div>

                {/* Quick Auto-balance helpers */}
                {!isBalanced && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBalanceProportionally}
                      className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ajustar Proporcionalmente a 100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDistributeEqually}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Distribuir en Partes Iguales
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRESET TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Modelos Evaluativos Predeterminados
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecciona una plantilla estandarizada según el enfoque pedagógico de tu institución:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EVALUATION_PRESET_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-100">{tmpl.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-semibold border border-indigo-800/50">
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{tmpl.description}</p>

                      <div className="space-y-1.5 pt-2">
                        {tmpl.categories.map((c) => (
                          <div
                            key={c.name}
                            className="flex items-center justify-between text-xs p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/60"
                          >
                            <span className="text-slate-300">{c.name}</span>
                            <span className="font-mono font-bold text-indigo-300">
                              {c.weightPercentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleApplyPreset(tmpl);
                        setActiveTab('editor');
                      }}
                      className="w-full py-2 text-xs font-bold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Cargar esta Plantilla</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-5">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>Simulador Interactivo de Calificación Final</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Prueba cómo afectará esta ponderación al promedio definitivo de un estudiante moviendo las notas simuladas:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Result Card */}
                <div className="p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 rounded-2xl border border-indigo-900/50 flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Nota Definitiva Ponderada
                  </span>
                  <div className="text-4xl font-bold font-mono text-emerald-400">
                    {simulatedDefinitive.toFixed(2)}
                  </div>
                  <span className="text-xs font-bold text-slate-400">Escala de 1.0 a 5.0</span>
                  <div className="text-xs px-3 py-1 rounded-full font-bold bg-slate-800 border border-slate-700 text-slate-200">
                    {simulatedDefinitive >= 4.6
                      ? '🏅 Desempeño Superior'
                      : simulatedDefinitive >= 4.0
                      ? '⭐ Desempeño Alto'
                      : simulatedDefinitive >= 3.5
                      ? '✅ Desempeño Básico'
                      : '⚠️ Desempeño Bajo'}
                  </div>
                </div>

                {/* Sliders */}
                <div className="md:col-span-2 space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  {categories.map((c) => {
                    const score = simulatedScores[c.id] !== undefined ? simulatedScores[c.id] : 4.0;
                    const colorSpec = getColorDetails(c.color);

                    return (
                      <div key={c.id} className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorSpec.badgeClass}`} />
                            <span className="font-semibold text-slate-200">{c.name}</span>
                            <span className="text-slate-500">({c.weightPercentage}%)</span>
                          </div>
                          <div className="font-mono font-bold text-slate-100 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {score.toFixed(1)} / 5.0
                          </div>
                        </div>

                        <input
                          type="range"
                          min="1.0"
                          max="5.0"
                          step="0.1"
                          value={score}
                          onChange={(e) =>
                            setSimulatedScores((prev) => ({
                              ...prev,
                              [c.id]: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer: Propagation Scope & Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
          {/* Scope Selector */}
          <div className="w-full md:w-auto space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Ámbito de Aplicación de estos Porcentajes:
            </label>
            <select
              value={saveScope}
              onChange={(e) => setSaveScope(e.target.value as any)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer w-full md:w-auto"
            >
              <option value="single">
                Solo para {effectiveGroupName} en {effectiveSubject}
              </option>
              <option value="group_subjects">
                Para todas las materias de este curso ({effectiveGroupName})
              </option>
              <option value="subject_all_groups">
                Para todos mis cursos en la asignatura ({effectiveSubject})
              </option>
              <option value="all_assignments">
                Para todos mis cursos y todas mis materias asignadas
              </option>
            </select>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-950 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Aplicar Ponderaciones</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
