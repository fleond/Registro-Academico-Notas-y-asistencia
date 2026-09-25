import React, { useState, useMemo } from 'react';
import { AcademicPeriod, SchoolSettings } from '../types';
import { 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CalendarDays, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Save, 
  SlidersHorizontal,
  ChevronRight,
  Info,
  CalendarCheck,
  CalendarRange,
  Percent
} from 'lucide-react';
import { 
  DEFAULT_ACADEMIC_PERIODS, 
  PRESET_PERIOD_TEMPLATES, 
  resolvePeriodByDate, 
  calculatePeriodProgress,
  formatPeriodDateRange,
  formatSpanishDate
} from '../utils/periods';
import { validateAndCleanAcademicPeriods } from '../utils/syncValidation';

interface AcademicPeriodsAdminProps {
  settings: SchoolSettings;
  onUpdateSettings: (newSettings: SchoolSettings) => void;
}

export const AcademicPeriodsAdmin: React.FC<AcademicPeriodsAdminProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const periods: AcademicPeriod[] = useMemo(() => {
    return settings.periods && settings.periods.length > 0
      ? settings.periods
      : DEFAULT_ACADEMIC_PERIODS;
  }, [settings.periods]);

  // Date testing & simulation
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [testDate, setTestDate] = useState<string>(todayStr);

  // Active detected period for today & testDate
  const detectedTodayPeriod = useMemo(() => resolvePeriodByDate(periods, todayStr), [periods, todayStr]);
  const detectedTestPeriod = useMemo(() => resolvePeriodByDate(periods, testDate), [periods, testDate]);

  // Modal for Add / Edit Period
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Partial<AcademicPeriod>>({
    name: 'Periodo 1',
    code: 'P1',
    startDate: todayStr,
    endDate: todayStr,
    weightPercentage: 25,
    status: 'active',
    description: '',
  });

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return periods.reduce((acc, p) => acc + (Number(p.weightPercentage) || 0), 0);
  }, [periods]);

  const handleOpenCreate = () => {
    const nextIndex = periods.length + 1;
    setEditingPeriod({
      id: `period-${Date.now()}`,
      name: `Periodo ${nextIndex}`,
      code: `P${nextIndex}`,
      startDate: todayStr,
      endDate: todayStr,
      weightPercentage: 25,
      status: 'upcoming',
      description: `Periodo académico ${nextIndex} del año lectivo.`,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: AcademicPeriod) => {
    setEditingPeriod({ ...p });
    setIsModalOpen(true);
  };

  const handleDeletePeriod = (periodId: string) => {
    if (periods.length <= 1) {
      alert('Debe existir al menos un periodo académico configurado en el sistema.');
      return;
    }
    if (confirm('¿Estás seguro de eliminar este periodo académico? Las actividades registradas mantendrán su nombre de periodo.')) {
      const updated = periods.filter((p) => p.id !== periodId);
      savePeriods(updated);
    }
  };

  const handleSavePeriodForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod.name?.trim() || !editingPeriod.startDate || !editingPeriod.endDate) {
      alert('Por favor completa el nombre y las fechas de inicio y finalización.');
      return;
    }

    if (editingPeriod.startDate > editingPeriod.endDate) {
      alert('La fecha de inicio no puede ser posterior a la fecha de finalización.');
      return;
    }

    let updated: AcademicPeriod[];
    const isEdit = periods.some((p) => p.id === editingPeriod.id);

    if (isEdit) {
      updated = periods.map((p) => (p.id === editingPeriod.id ? (editingPeriod as AcademicPeriod) : p));
    } else {
      const newPeriod: AcademicPeriod = {
        id: editingPeriod.id || `period-${Date.now()}`,
        name: editingPeriod.name.trim(),
        code: editingPeriod.code?.trim() || `P${periods.length + 1}`,
        startDate: editingPeriod.startDate,
        endDate: editingPeriod.endDate,
        weightPercentage: Number(editingPeriod.weightPercentage) || 25,
        status: editingPeriod.status || 'upcoming',
        description: editingPeriod.description || '',
      };
      updated = [...periods, newPeriod];
    }

    // Sort chronologically by startDate
    updated.sort((a, b) => a.startDate.localeCompare(b.startDate));

    savePeriods(updated);
    setIsModalOpen(false);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PRESET_PERIOD_TEMPLATES.find((t) => t.id === presetId);
    if (!preset) return;

    if (
      confirm(
        `¿Deseas aplicar la plantilla "${preset.name}"?\nEsto reconfigurará la lista de periodos con las fechas y ponderaciones predeterminadas.`
      )
    ) {
      savePeriods(preset.periods);
    }
  };

  const savePeriods = (newPeriods: AcademicPeriod[]) => {
    // 1. Synchronous validation layer
    const validation = validateAndCleanAcademicPeriods(newPeriods, todayStr);
    const cleaned = validation.cleanedPeriods;

    // Automatically set currentPeriod to the one active today
    const current = validation.activePeriod || resolvePeriodByDate(cleaned, todayStr);
    const updatedSettings: SchoolSettings = {
      ...settings,
      periods: cleaned,
      currentPeriod: current?.name || cleaned[0]?.name || settings.currentPeriod || 'Periodo 1',
    };
    onUpdateSettings(updatedSettings);
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <CalendarRange className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Configuración de Periodos Académicos</h2>
            </div>
            <p className="text-xs text-slate-400">
              Establece las fechas de inicio y cierre de cada periodo. La aplicación detectará automáticamente el periodo en curso según la fecha actual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-add-academic-period"
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Periodo</span>
            </button>
          </div>
        </div>

        {/* Current Auto-Resolved Period Spotlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          {/* Card 1: Today's Period Detection */}
          <div className="bg-slate-900/90 rounded-xl p-3.5 border border-indigo-800/40 flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Periodo Activo Hoy ({formatSpanishDate(todayStr)})
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-emerald-300 truncate">
                  {detectedTodayPeriod ? detectedTodayPeriod.name : 'Sin definir'}
                </span>
                {detectedTodayPeriod && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    {detectedTodayPeriod.weightPercentage}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {detectedTodayPeriod ? formatPeriodDateRange(detectedTodayPeriod) : 'Revisa las fechas configuradas'}
              </p>
            </div>
          </div>

          {/* Card 2: Total Percentage Validator */}
          <div className={`rounded-xl p-3.5 border flex items-center space-x-3 ${
            Math.abs(totalPercentage - 100) < 0.5 
              ? 'bg-slate-900/90 border-slate-800' 
              : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          }`}>
            <div className={`p-2.5 rounded-xl shrink-0 ${
              Math.abs(totalPercentage - 100) < 0.5 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ponderación Total Anual
              </span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${Math.abs(totalPercentage - 100) < 0.5 ? 'text-slate-100' : 'text-amber-300'}`}>
                  {totalPercentage.toFixed(1)}% / 100%
                </span>
                {Math.abs(totalPercentage - 100) < 0.5 ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Correcto</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold">
                    (Debe sumar 100%)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {periods.length} periodos académicos registrados
              </p>
            </div>
          </div>

          {/* Card 3: Date Testing Simulation Tool */}
          <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex items-center space-x-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Simular Fecha de Consulta
              </span>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="text-xs bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 py-1 focus:ring-1 focus:ring-purple-500 [color-scheme:dark]"
                />
                <span className="text-xs font-bold text-purple-300 truncate">
                  → {detectedTestPeriod ? detectedTestPeriod.name : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Templates Selector */}
      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Plantillas Rápidas de Periodos Escolares
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_PERIOD_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-600/50 rounded-xl p-3.5 transition-all flex flex-col justify-between space-y-2"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-100">{tmpl.name}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{tmpl.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleApplyPreset(tmpl.id)}
                className="w-full text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-600 border border-indigo-800/60 hover:border-indigo-500 py-1.5 rounded-lg transition-all"
              >
                Cargar esta estructura
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Period Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Listado de Periodos Académicos ({periods.length})</span>
          </h3>
          <span className="text-xs text-slate-400">
            Ordenados cronológicamente por fecha de inicio
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {periods.map((period, index) => {
            const stats = calculatePeriodProgress(period, todayStr);
            const isDetected = detectedTodayPeriod?.id === period.id;

            return (
              <div
                key={period.id}
                className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                  isDetected
                    ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-indigo-600/70 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 rounded-md">
                        {period.code || `P${index + 1}`}
                      </span>
                      <h4 className="text-base font-bold text-slate-100">{period.name}</h4>
                      {isDetected && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-full animate-pulse">
                          ● Activo Hoy
                        </span>
                      )}
                    </div>
                    {period.description && (
                      <p className="text-xs text-slate-400">{period.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(period)}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar periodo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePeriod(period.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Eliminar periodo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dates info box */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Fecha Inicio</span>
                    <span className="font-bold text-slate-200 block">{formatSpanishDate(period.startDate)}</span>
                    <span className="text-[10px] font-mono text-slate-500">{period.startDate}</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Fecha Cierre</span>
                    <span className="font-bold text-slate-200 block">{formatSpanishDate(period.endDate)}</span>
                    <span className="text-[10px] font-mono text-slate-500">{period.endDate}</span>
                  </div>
                </div>

                {/* Progress bar & percentage weight */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{stats.statusLabel}</span>
                    </span>
                    <span className="font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-2 py-0.5 rounded-md">
                      Ponderación: {period.weightPercentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                    <div
                      className={`h-full transition-all rounded-full ${
                        stats.isCurrent
                          ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                          : stats.progressPercent >= 100
                          ? 'bg-slate-600'
                          : 'bg-indigo-700'
                      }`}
                      style={{ width: `${stats.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Duración: {stats.totalDays} días</span>
                    <span>
                      {stats.isCurrent ? `${stats.daysRemaining} días restantes` : `${stats.progressPercent}% transcurrido`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Add / Edit Period */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <CalendarRange className="w-5 h-5 text-indigo-400" />
                <span>{editingPeriod.id && periods.some((p) => p.id === editingPeriod.id) ? 'Editar Periodo' : 'Crear Periodo'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePeriodForm} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nombre del Periodo *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Periodo 1, Primer Bimestre..."
                    value={editingPeriod.name || ''}
                    onChange={(e) => setEditingPeriod((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Código</label>
                  <input
                    type="text"
                    placeholder="ej. P1"
                    value={editingPeriod.code || ''}
                    onChange={(e) => setEditingPeriod((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={editingPeriod.startDate || ''}
                    onChange={(e) => setEditingPeriod((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Fecha de Cierre *</label>
                  <input
                    type="date"
                    required
                    value={editingPeriod.endDate || ''}
                    onChange={(e) => setEditingPeriod((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Ponderación Anual (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    required
                    value={editingPeriod.weightPercentage || 25}
                    onChange={(e) => setEditingPeriod((prev) => ({ ...prev, weightPercentage: Number(e.target.value) }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Estado</label>
                  <select
                    value={editingPeriod.status || 'upcoming'}
                    onChange={(e) => setEditingPeriod((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Activo</option>
                    <option value="upcoming">Próximo</option>
                    <option value="closed">Cerrado / Finalizado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Descripción / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre este periodo académico..."
                  value={editingPeriod.description || ''}
                  onChange={(e) => setEditingPeriod((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50"
                >
                  Guardar Periodo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
