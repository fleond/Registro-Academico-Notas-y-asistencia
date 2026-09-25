import React, { useState, useMemo } from 'react';
import { Group, Teacher, SchoolSettings, EvaluationCategory, SubjectConfig } from '../types';
import { 
  EVALUATION_PRESET_TEMPLATES, 
  EvaluationPresetTemplate, 
  DEFAULT_EVALUATION_CATEGORIES, 
  getStoredData, 
  saveStoredData 
} from '../utils/storage';
import { 
  validateAndCleanEvaluationCategories,
  executeSynchronousAdminSettingsSave 
} from '../utils/syncValidation';
import { 
  Sliders, 
  Sparkles, 
  Layers, 
  Calculator, 
  CheckCheck, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Check, 
  BookOpen, 
  School, 
  Save, 
  RefreshCw, 
  HelpCircle, 
  Building2, 
  Share2,
  ShieldCheck
} from 'lucide-react';

interface EvaluationSIEEAdminProps {
  groups: Group[];
  teachers: Teacher[];
  settings: SchoolSettings;
  subjectConfigs?: SubjectConfig[];
  onUpdateSettings: (settings: SchoolSettings) => void;
  onUpdateSubjectConfigs?: (configs: SubjectConfig[]) => void;
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

export const EvaluationSIEEAdmin: React.FC<EvaluationSIEEAdminProps> = ({
  groups,
  teachers,
  settings,
  subjectConfigs = [],
  onUpdateSettings,
  onUpdateSubjectConfigs,
}) => {
  // Load current default categories from settings or storage
  const [institutionalCategories, setInstitutionalCategories] = useState<EvaluationCategory[]>(() => {
    return settings.evaluationCategories && settings.evaluationCategories.length > 0
      ? settings.evaluationCategories
      : DEFAULT_EVALUATION_CATEGORIES;
  });

  const [applyToAllExistingCourses, setApplyToAllExistingCourses] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [simulatedScores, setSimulatedScores] = useState<Record<string, number>>({});

  // Color helper
  const getColorDetails = (colorId?: string) => {
    return CATEGORY_COLORS.find((c) => c.id === colorId) || CATEGORY_COLORS[0];
  };

  // Total weight sum
  const totalWeight = useMemo(() => {
    return institutionalCategories.reduce((sum, c) => sum + (Number(c.weightPercentage) || 0), 0);
  }, [institutionalCategories]);

  const isBalanced = totalWeight === 100;

  // Simulator calculation
  const simulatedDefinitive = useMemo(() => {
    if (institutionalCategories.length === 0) return 0;
    let weightedSum = 0;
    institutionalCategories.forEach((c) => {
      const score = simulatedScores[c.id] !== undefined ? simulatedScores[c.id] : 4.0;
      weightedSum += score * ((Number(c.weightPercentage) || 0) / 100);
    });
    return Number(weightedSum.toFixed(2));
  }, [institutionalCategories, simulatedScores]);

  // Handler: Update category
  const handleUpdateCategory = (idx: number, updates: Partial<EvaluationCategory>) => {
    const updated = [...institutionalCategories];
    updated[idx] = { ...updated[idx], ...updates };
    setInstitutionalCategories(updated);
  };

  // Handler: Add category
  const handleAddCategory = () => {
    const newId = `cat-admin-${Date.now()}`;
    const nextColor = CATEGORY_COLORS[institutionalCategories.length % CATEGORY_COLORS.length].id;
    const remaining = Math.max(0, 100 - totalWeight);
    const newCat: EvaluationCategory = {
      id: newId,
      name: `Nueva Categoría ${institutionalCategories.length + 1}`,
      code: `C${institutionalCategories.length + 1}`,
      weightPercentage: remaining > 0 ? remaining : 10,
      description: '',
      color: nextColor,
    };
    setInstitutionalCategories([...institutionalCategories, newCat]);
  };

  // Handler: Delete category
  const handleDeleteCategory = (idx: number) => {
    if (institutionalCategories.length <= 1) {
      alert('Debe existir al menos una categoría institucional.');
      return;
    }
    setInstitutionalCategories(institutionalCategories.filter((_, i) => i !== idx));
  };

  // Handler: Auto-balance
  const handleBalanceProportionally = () => {
    if (totalWeight <= 0 || institutionalCategories.length === 0) return;
    let accumulated = 0;
    const updated = institutionalCategories.map((cat, idx) => {
      if (idx === institutionalCategories.length - 1) {
        const lastVal = Math.max(1, 100 - accumulated);
        return { ...cat, weightPercentage: lastVal };
      }
      const raw = Math.round((cat.weightPercentage / totalWeight) * 100);
      const val = Math.max(1, raw);
      accumulated += val;
      return { ...cat, weightPercentage: val };
    });
    setInstitutionalCategories(updated);
  };

  // Handler: Save Institutional SIEE Config with Synchronous Validation & Propagation
  const handleSaveInstitutionalConfig = async () => {
    // 1. Synchronous Validation Layer
    const validation = validateAndCleanEvaluationCategories(institutionalCategories);
    if (!validation.isBalanced) {
      const confirmSave = confirm(
        `⚠️ La suma de las ponderaciones es de ${validation.totalWeight}% (no suma 100%).\n\n¿Deseas guardar de todas formas?`
      );
      if (!confirmSave) return;
    }

    const updatedSettings: SchoolSettings = {
      ...settings,
      evaluationCategories: validation.cleanedCategories,
    };

    setInstitutionalCategories(validation.cleanedCategories);

    // 2. Synchronous Save & Propagation across settings and subjectConfigs
    const propagation = await executeSynchronousAdminSettingsSave(
      updatedSettings,
      groups,
      teachers,
      subjectConfigs,
      applyToAllExistingCourses
    );

    // 3. Notify parent handlers with cleaned, synchronized objects
    onUpdateSettings(propagation.settings);
    if (onUpdateSubjectConfigs) {
      onUpdateSubjectConfigs(propagation.subjectConfigs);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Handler: Load Preset Template
  const handleApplyPreset = (preset: EvaluationPresetTemplate) => {
    setInstitutionalCategories(JSON.parse(JSON.stringify(preset.categories)));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Sistema Institucional de Evaluación Escolar (SIEE) & Ponderaciones
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Establece los porcentajes y la ponderación predeterminada de las calificaciones para toda la institución. Los cambios que guardes aquí se aplican a los cursos y se reflejan inmediatamente en la sección del docente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleSaveInstitutionalConfig}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>¡Guardado y Sincronizado!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar y Aplicar a Toda la Institución</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Course Sync Option Banner */}
      <div className="bg-slate-900/40 rounded-xl p-3.5 border border-purple-900/30 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <Share2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-xs text-slate-300">
            <strong>Propagación Automática:</strong> Actualizar y sincronizar esta estructura institucional en todos los cursos ({groups.length}) y materias en el módulo del docente.
          </span>
        </div>
        <label className="flex items-center space-x-2 text-xs font-bold text-purple-300 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={applyToAllExistingCourses}
            onChange={(e) => setApplyToAllExistingCourses(e.target.checked)}
            className="w-4 h-4 rounded border-purple-700 text-purple-600 focus:ring-purple-500 bg-slate-800 cursor-pointer"
          />
          <span>Aplicar a todos los cursos</span>
        </label>
      </div>

      {/* Grid: Left column Category Configurator & Right column Templates + Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Category Editor & Weighting Bar */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Categorías Institucionales y Porcentajes</span>
              </h4>
              <span className="text-xs text-slate-400">
                {institutionalCategories.length} categorías activas
              </span>
            </div>

            {/* Category Cards */}
            <div className="space-y-3">
              {institutionalCategories.map((cat, idx) => {
                const col = getColorDetails(cat.color);

                return (
                  <div
                    key={cat.id || idx}
                    className={`p-4 rounded-xl border ${col.bgClass} ${col.borderClass} space-y-3 transition-all`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Nombre de la Categoría
                        </label>
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) => handleUpdateCategory(idx, { name: e.target.value })}
                          placeholder="Ej: Heteroevaluación, Coevaluación, Examen Final..."
                          className="w-full text-xs font-bold p-2 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

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
                              className={`w-5 h-5 rounded-full ${clr.badgeClass} cursor-pointer transition-transform ${
                                cat.color === clr.id ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                              }`}
                              title={clr.label}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="w-28 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Ponderación (%)
                        </label>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={cat.weightPercentage}
                            onChange={(e) =>
                              handleUpdateCategory(idx, { weightPercentage: Number(e.target.value) })
                            }
                            className="w-full text-center text-sm font-mono font-bold p-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <span className="text-xs font-bold text-slate-400">%</span>
                        </div>
                      </div>

                      {institutionalCategories.length > 1 && (
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800/40">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Ajuste de peso:</span>
                          <span className="font-mono font-bold text-slate-200">{cat.weightPercentage}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={cat.weightPercentage}
                          onChange={(e) =>
                            handleUpdateCategory(idx, { weightPercentage: Number(e.target.value) })
                          }
                          className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Instrumentos Evaluativos Comprendidos
                        </label>
                        <input
                          type="text"
                          value={cat.description || ''}
                          onChange={(e) => handleUpdateCategory(idx, { description: e.target.value })}
                          placeholder="Ej: Talleres, quices, exposiciones y autovaloración..."
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
              className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-purple-500 text-slate-400 hover:text-purple-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all bg-slate-900/30 hover:bg-slate-900/70 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Otra Categoría Institucional</span>
            </button>

            {/* Total Weighting Status Bar */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isBalanced ? (
                    <CheckCheck className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">
                      {isBalanced
                        ? 'Ponderación Institucional Correcta (100%)'
                        : `Ponderación Institucional Descuadrada (${totalWeight}% / 100%)`}
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      {isBalanced
                        ? 'La suma de las categorías totaliza el 100% requerido.'
                        : `Diferencia de ${Math.abs(100 - totalWeight)}% respecto al 100%.`}
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

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                {institutionalCategories.map((c, i) => {
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

              {!isBalanced && (
                <button
                  type="button"
                  onClick={handleBalanceProportionally}
                  className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-300 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ajustar Proporcionalmente a 100%</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Preset Templates & Interactive Simulator */}
        <div className="space-y-4">
          
          {/* Preset Templates Card */}
          <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Plantillas Rápidas</span>
            </h4>
            <p className="text-xs text-slate-400">
              Carga una estructura predeterminada con un solo clic:
            </p>

            <div className="space-y-2.5">
              {EVALUATION_PRESET_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-purple-500/50 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-200">{tmpl.name}</h5>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-semibold border border-purple-800/50">
                      {tmpl.badge}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {tmpl.categories.map((c) => (
                      <span key={c.name} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {c.name}: <strong>{c.weightPercentage}%</strong>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(tmpl)}
                    className="w-full py-1.5 text-xs font-bold text-purple-300 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/60 rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Aplicar esta Plantilla</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Live Simulator */}
          <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Simulador de Nota Definitiva</span>
              </h4>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Nota Definitiva Ponderada:
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {simulatedDefinitive.toFixed(2)} / 5.0
              </div>
              <span className="text-[10px] text-slate-500 block">
                {simulatedDefinitive >= 4.6
                  ? '🏅 Desempeño Superior'
                  : simulatedDefinitive >= 4.0
                  ? '⭐ Desempeño Alto'
                  : simulatedDefinitive >= (settings.passingScore || settings.minPassingScore || 3.5)
                  ? '✅ Desempeño Básico'
                  : '⚠️ Desempeño Bajo'}
              </span>
            </div>

            <div className="space-y-2">
              {institutionalCategories.map((c) => {
                const score = simulatedScores[c.id] !== undefined ? simulatedScores[c.id] : 4.0;
                return (
                  <div key={c.id} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>{c.name} ({c.weightPercentage}%):</span>
                      <span className="font-mono font-bold">{score.toFixed(1)}</span>
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
                      className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
