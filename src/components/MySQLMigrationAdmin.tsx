import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Copy,
  ExternalLink,
  Sliders,
  HardDrive,
  FileCode2,
  Check,
  Info,
  ShieldCheck,
  Layers
} from 'lucide-react';
import {
  Teacher,
  Group,
  Student,
  AttendanceRecord,
  Activity,
  GradeRecord,
  SchoolSettings,
  SubjectConfig,
  RemedialRecord,
  ClassDailyLog,
  ScheduleTimeSlot,
  WorkGroupSet,
  GroupSeatingPlan,
  NotificationLog,
} from '../types';
import {
  getSavedMySQLConfig,
  saveMySQLConfig,
  checkMySQLStatus,
  testMySQLConnection,
  pullAllDataFromMySQL,
  pushAllDataToMySQL,
  fixMySQLConstraints,
  MySQLConnectionConfig,
  MySQLServerStatus,
} from '../utils/mysqlService';
import {
  generateWampMysqlSchemaSQL,
  generateFullDatabaseDumpSQL,
  downloadSqlFile,
} from '../utils/mysqlGenerator';

interface MySQLMigrationAdminProps {
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  attendance: AttendanceRecord[];
  activities?: Activity[];
  grades?: GradeRecord[];
  settings: SchoolSettings;
  subjectConfigs?: SubjectConfig[];
  remedials?: RemedialRecord[];
  dailyLogs?: ClassDailyLog[];
  schedules?: ScheduleTimeSlot[];
  workGroups?: WorkGroupSet[];
  seatingPlans?: GroupSeatingPlan[];
  notifications?: NotificationLog[];
  onDataLoadedFromMySQL?: (data: {
    teachers?: Teacher[];
    groups?: Group[];
    students?: Student[];
    attendance?: AttendanceRecord[];
    activities?: Activity[];
    grades?: GradeRecord[];
    settings?: SchoolSettings;
    subjectConfigs?: SubjectConfig[];
  }) => void;
}

export const MySQLMigrationAdmin: React.FC<MySQLMigrationAdminProps> = ({
  teachers,
  groups,
  students,
  attendance,
  activities = [],
  grades = [],
  settings,
  subjectConfigs = [],
  remedials = [],
  dailyLogs = [],
  schedules = [],
  workGroups = [],
  seatingPlans = [],
  notifications = [],
  onDataLoadedFromMySQL,
}) => {
  const [config, setConfig] = useState<MySQLConnectionConfig>(getSavedMySQLConfig());
  const [status, setStatus] = useState<MySQLServerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [activeView, setActiveView] = useState<'status' | 'sql_preview' | 'guide'>('status');

  const refreshStatus = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await checkMySQLStatus(config);
      setStatus(res);
    } catch (err: any) {
      setStatus({
        connected: false,
        engine: 'MySQL',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestResult(null);
    setActionSuccess(null);
    setActionError(null);

    saveMySQLConfig(config);
    const result = await testMySQLConnection(config);
    setTestResult(result);
    if (result.success) {
      await refreshStatus();
    }
    setLoading(false);
  };

  const handleDownloadSchemaOnly = () => {
    const sql = generateWampMysqlSchemaSQL(config.database);
    downloadSqlFile(sql, `schema_wamp_${config.database}.sql`);
    setActionSuccess('¡Script DDL de tablas y vistas descargado con éxito!');
  };

  const handleDownloadFullDump = () => {
    const sql = generateFullDatabaseDumpSQL({
      teachers,
      groups,
      students,
      attendance,
      activities,
      grades,
      settings,
      subjectConfigs,
      remedials,
      dailyLogs,
      schedules,
      workGroups,
      seatingPlans,
      notifications,
    });
    downloadSqlFile(sql, `database_wamp_fleon_backup_${new Date().toISOString().split('T')[0]}.sql`);
    setActionSuccess('¡Respaldo SQL completo con todos los datos generado y descargado!');
  };

  const handlePushDataToMySQL = async () => {
    if (!window.confirm(`¿Confirmas que deseas migrar y guardar ${students.length} estudiantes, ${groups.length} grupos, ${teachers.length} docentes, ${attendance.length} asistencias y ${activities.length} actividades en tu base de datos MySQL local?`)) {
      return;
    }

    setLoading(true);
    setActionSuccess(null);
    setActionError(null);

    const res = await pushAllDataToMySQL(
      {
        teachers,
        groups,
        students,
        attendance,
        activities,
        grades,
        settings,
        subjectConfigs,
        remedials,
        dailyLogs,
        schedules,
        workGroups,
        seatingPlans,
        notifications,
      },
      config
    );

    if (res.success) {
      setActionSuccess(res.message);
      await refreshStatus();
    } else {
      setActionError(res.message);
    }
    setLoading(false);
  };

  const handleFixConstraints = async () => {
    setLoading(true);
    setActionError(null);
    setActionSuccess(null);
    const res = await fixMySQLConstraints(config);
    if (res.success) {
      setActionSuccess('¡Restricciones de clave foránea reparadas con éxito! Ahora puedes reintentar enviar los datos.');
    } else {
      setActionError(res.message);
    }
    setLoading(false);
  };

  const handlePullDataFromMySQL = async () => {
    if (!window.confirm('¿Deseas cargar y sincronizar los datos almacenados en MySQL hacia la aplicación web?')) {
      return;
    }

    setLoading(true);
    setActionSuccess(null);
    setActionError(null);

    const res = await pullAllDataFromMySQL(config);
    if (res.success && res.data) {
      if (onDataLoadedFromMySQL) {
        onDataLoadedFromMySQL(res.data);
      }
      setActionSuccess(`¡Datos cargados exitosamente desde MySQL! (${res.data.students?.length || 0} estudiantes, ${res.data.groups?.length || 0} grupos)`);
      await refreshStatus();
    } else {
      setActionError(res.message || 'No se pudieron recuperar los datos de MySQL.');
    }
    setLoading(false);
  };

  const handleCopySchemaToClipboard = () => {
    const sql = generateWampMysqlSchemaSQL(config.database);
    navigator.clipboard.writeText(sql);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Database className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  WAMP Server / MySQL Local
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
                  InnoDB UTF-8
                </span>
              </div>
              <h2 className="text-2xl font-bold mt-1">Migración y Persistencia en MySQL Local</h2>
              <p className="text-emerald-100 text-sm mt-0.5">
                Conecta tu sistema a tu servidor local WAMP (Apache + MySQL + phpMyAdmin) o descarga el volcado SQL completo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={refreshStatus}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium border border-white/20 backdrop-blur-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Diagnóstico
            </button>
            <button
              onClick={handleDownloadFullDump}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm shadow-lg shadow-emerald-950/20 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              Descargar SQL Completo
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveView('status')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeView === 'status'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          Conexión y Sincronización
        </button>
        <button
          onClick={() => setActiveView('sql_preview')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeView === 'sql_preview'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          Esquema SQL y Tablas
        </button>
        <button
          onClick={() => setActiveView('guide')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeView === 'guide'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Info className="w-4 h-4" />
          Guía Paso a Paso WAMP
        </button>
      </div>

      {/* Feedback Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">{actionSuccess}</p>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            &times;
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium">{actionError}</p>
              {(actionError.includes('1452') || actionError.includes('1054') || actionError.toLowerCase().includes('foreign key') || actionError.toLowerCase().includes('constraint') || actionError.toLowerCase().includes('column')) && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Conflicto de esquema o clave foránea detectado. Puedes sincronizar o corregir la tabla con un clic:
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(actionError.includes('1452') || actionError.includes('1054') || actionError.toLowerCase().includes('foreign key') || actionError.toLowerCase().includes('constraint') || actionError.toLowerCase().includes('column')) && (
              <button
                type="button"
                onClick={handleFixConstraints}
                disabled={loading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow transition-all disabled:opacity-50"
              >
                🛠️ Reparar Esquema / Columnas en MySQL
              </button>
            )}
            <button onClick={() => setActionError(null)} className="text-amber-500 hover:text-amber-700 p-1">
              &times;
            </button>
          </div>
        </div>
      )}

      {activeView === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Connection Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Configuración del Servidor MySQL</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Parámetros de conexión para tu instancia de WAMP Server
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveAndTest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Host del Servidor
                    </label>
                    <input
                      type="text"
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                      placeholder="localhost o 127.0.0.1"
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Puerto MySQL
                    </label>
                    <input
                      type="number"
                      value={config.port}
                      onChange={(e) => setConfig({ ...config, port: e.target.value })}
                      placeholder="3306"
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Usuario MySQL
                    </label>
                    <input
                      type="text"
                      value={config.user}
                      onChange={(e) => setConfig({ ...config, user: e.target.value })}
                      placeholder="root"
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contraseña MySQL (vacía por defecto en WAMP)
                    </label>
                    <input
                      type="password"
                      value={config.password || ''}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      placeholder="Dejar vacía si usas WAMP por defecto"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de la Base de Datos
                  </label>
                  <input
                    type="text"
                    value={config.database}
                    onChange={(e) => setConfig({ ...config, database: e.target.value })}
                    placeholder="registro_academico_fleon"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    URL Opcional API PHP WAMP (Ej: http://localhost/registro_academico_api/)
                  </label>
                  <input
                    type="url"
                    value={config.customApiUrl || ''}
                    onChange={(e) => setConfig({ ...config, customApiUrl: e.target.value })}
                    placeholder="http://localhost/registro_academico_api/"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Si copiaste los archivos de la carpeta <code className="text-indigo-600 dark:text-indigo-400">/wamp_php_api/</code> a <code className="text-indigo-600 dark:text-indigo-400">C:\wamp64\www\registro_academico_api\</code>, ingresa su URL aquí.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Guardar y Probar Conexión
                  </button>
                  <button
                    type="button"
                    onClick={refreshStatus}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-all"
                  >
                    Reintentar Diagnóstico
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl text-sm border flex items-center gap-2.5 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Migration & Synchronization Actions */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                Acciones de Migración y Transferencia de Datos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Transfiere en lote los registros existentes entre la memoria / Firestore y tu servidor MySQL local.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                    <Upload className="w-4 h-4" />
                    Exportar / Guardar en MySQL
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Inserta o actualiza todos los registros actuales ({students.length} estudiantes, {groups.length} grupos, {teachers.length} docentes, {attendance.length} asistencias) directamente en la base de datos MySQL de WAMP.
                  </p>
                  <button
                    onClick={handlePushDataToMySQL}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Migrar a MySQL Ahora
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    <Download className="w-4 h-4" />
                    Cargar / Sincronizar desde MySQL
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Lee los datos de las tablas de MySQL en tu WAMP Server y los carga en vivo en la aplicación.
                  </p>
                  <button
                    onClick={handlePullDataFromMySQL}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Cargar desde MySQL
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Server State & Summary */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
                <span>Estado del Servidor</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    status?.connected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {status?.connected ? 'Conectado a MySQL' : 'Servidor en Espera'}
                </span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Motor:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{status?.engine || 'MySQL 8.x'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Base de Datos:</span>
                  <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">{config.database}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Host / Puerto:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{config.host}:{config.port}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Usuario:</span>
                  <span className="font-mono text-slate-900 dark:text-white">{config.user}</span>
                </div>
              </div>

              {status?.counts && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Registros en Base de Datos MySQL:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-center">
                      <div className="text-base font-bold text-indigo-600">{status.counts.students_count ?? 0}</div>
                      <div className="text-[10px] text-slate-500">Estudiantes</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-center">
                      <div className="text-base font-bold text-indigo-600">{status.counts.groups_count ?? 0}</div>
                      <div className="text-[10px] text-slate-500">Grupos</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-center">
                      <div className="text-base font-bold text-indigo-600">{status.counts.teachers_count ?? 0}</div>
                      <div className="text-[10px] text-slate-500">Docentes</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-center">
                      <div className="text-base font-bold text-indigo-600">{status.counts.attendance_count ?? 0}</div>
                      <div className="text-[10px] text-slate-500">Asistencias</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Export Tools */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-600" />
                Descargas Directas para phpMyAdmin
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Archivos SQL compatibles 100% con phpMyAdmin en WAMP Server:
              </p>

              <button
                onClick={handleDownloadFullDump}
                className="w-full py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 font-medium text-xs rounded-xl flex items-center justify-between transition-colors"
              >
                <span>Descargar Base de Datos Completa (.sql)</span>
                <Download className="w-4 h-4 shrink-0" />
              </button>

              <button
                onClick={handleDownloadSchemaOnly}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium text-xs rounded-xl flex items-center justify-between transition-colors"
              >
                <span>Descargar Solo Esquema DDL (.sql)</span>
                <FileCode2 className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Preview View */}
      {activeView === 'sql_preview' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-indigo-600" />
                Esquema DDL de Tablas MySQL (WAMP)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Contiene las 14 tablas relacionales, claves foráneas en cascada, índices y vistas de consulta para phpMyAdmin.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySchemaToClipboard}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {copiedSQL ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSQL ? '¡Copiado!' : 'Copiar SQL'}
              </button>
              <button
                onClick={handleDownloadSchemaOnly}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar .sql
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed border border-slate-800">
              {generateWampMysqlSchemaSQL(config.database)}
            </pre>
          </div>
        </div>
      )}

      {/* WAMP Step-by-Step Guide */}
      {activeView === 'guide' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-600" />
              Guía de Puesta en Marcha en tu Servidor WAMP (Windows)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sigue estos 3 sencillos pasos para tener tu base de datos MySQL local corriendo y recibiendo datos.
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                Crear la Base de Datos en phpMyAdmin
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Abre tu navegador en <code className="text-indigo-600 dark:text-indigo-400 font-mono">http://localhost/phpmyadmin</code>. Inicia sesión con usuario <code className="font-mono">root</code> (sin contraseña). En la columna izquierda haz clic en <strong>"Nueva"</strong>, escribe como nombre de base de datos <strong className="font-mono text-emerald-600">{config.database}</strong>, selecciona cotejamiento <code className="font-mono">utf8mb4_unicode_ci</code> y presiona <strong>"Crear"</strong>.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
                Importar el Archivo SQL
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Dentro de la base de datos recién creada en phpMyAdmin, haz clic en la pestaña superior <strong>"Importar"</strong>. Selecciona el archivo <code className="font-mono">database_wamp_fleon.sql</code> (descargado desde el botón verde superior) y haz clic en <strong>"Importar"</strong>. Todas las tablas, llaves e índices se crearán instantáneamente.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
                Ejecutar con Node.js o con Apache PHP
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 pl-8 space-y-2">
                <p>
                  <strong>Opción A (Node / React):</strong> En tu máquina local, ejecuta <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">npm run dev</code>. La aplicación se comunicará directamente con tu base de datos MySQL local en el puerto 3306.
                </p>
                <p>
                  <strong>Opción B (PHP WAMP nativo):</strong> Copia la carpeta <code className="font-mono text-indigo-600 dark:text-indigo-400">/wamp_php_api/</code> a <code className="font-mono">C:\wamp64\www\registro_academico_api\</code> para procesar peticiones a través del servidor Apache de WAMP.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
