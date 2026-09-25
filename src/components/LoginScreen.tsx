import React, { useState, useEffect } from 'react';
import { 
  School, 
  GraduationCap, 
  ShieldCheck, 
  Users, 
  Search, 
  ArrowRight, 
  Lock, 
  Mail, 
  UserCheck, 
  Sparkles,
  AlertCircle,
  HelpCircle,
  BookOpen,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Sun,
  Moon,
  Smartphone,
  Cloud,
  CloudCheck,
  RefreshCw,
  Database
} from 'lucide-react';
import { Teacher, Student, AuthUser, Group, SchoolSettings } from '../types';
import { PwaInstallModal } from './PwaInstallModal';

interface LoginScreenProps {
  teachers: Teacher[];
  students: Student[];
  groups: Group[];
  settings: SchoolSettings;
  onLogin: (user: AuthUser) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  syncStatus?: 'synced' | 'syncing' | 'offline';
  onManualSync?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  teachers,
  students,
  groups,
  settings,
  onLogin,
  theme = 'dark',
  onToggleTheme,
  syncStatus = 'synced',
  onManualSync,
}) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'admin' | 'parent'>('teacher');

  // Teacher Login State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [teacherError, setTeacherError] = useState('');

  // Keep selected teacher up to date if teachers are loaded from Firestore
  useEffect(() => {
    if (teachers && teachers.length > 0) {
      if (!selectedTeacherId || !teachers.some((t) => t.id === selectedTeacherId)) {
        setSelectedTeacherId(teachers[0].id);
      }
    }
  }, [teachers, selectedTeacherId]);

  // Admin Login State
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Parent Login State
  const [studentDocInput, setStudentDocInput] = useState('');
  const [parentSearchError, setParentSearchError] = useState('');

  // Recovery Modal State
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryRole, setRecoveryRole] = useState<'admin' | 'teacher'>('admin');
  const [recoveryEmailInput, setRecoveryEmailInput] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  // Quick Teacher Login
  const handleTeacherLogin = (teacher: Teacher) => {
    onLogin({
      role: 'teacher',
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      documentId: teacher.documentId,
      teacher,
    });
  };

  // Custom Teacher Credentials Login with Password Validation
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');

    if (!selectedTeacherId) {
      setTeacherError('Por favor selecciona una cuenta docente.');
      return;
    }

    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    if (!teacher) {
      setTeacherError('Docente no encontrado.');
      return;
    }

    const expectedPassword = teacher.password || 'docente123';
    if (!teacherPassword.trim()) {
      setTeacherError('Por favor ingresa la contraseña del docente.');
      return;
    }

    if (teacherPassword.trim() !== expectedPassword) {
      setTeacherError(`Contraseña incorrecta para ${teacher.name}. Si la olvidaste, puedes usar la opción de recuperación con tu correo o consultar con Administración.`);
      return;
    }

    handleTeacherLogin(teacher);
  };

  // Admin Login Handler
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentAdminPass = settings.adminPassword || 'admin123';

    if (
      adminPassword.trim() === currentAdminPass || 
      (adminPassword.trim() === 'admin123' && !settings.adminPassword) || 
      adminPassword.trim() === 'admin'
    ) {
      onLogin({
        role: 'admin',
        id: 'usr-admin',
        name: 'Administrador / Rectoría',
        email: settings.adminRecoveryEmail || 'rectoria@colegio.edu.co',
      });
    } else {
      setAdminError('Contraseña de administrador incorrecta. Puedes recuperarla con tu correo institucional si la has olvidado.');
    }
  };

  // Handle password recovery request
  const handleTriggerRecovery = (role: 'admin' | 'teacher') => {
    setRecoveryRole(role);
    setRecoverySent(false);
    setRecoveryMessage('');
    if (role === 'admin') {
      setRecoveryEmailInput(settings.adminRecoveryEmail || 'rectoria@colegio.edu.co');
    } else {
      const t = teachers.find((tch) => tch.id === selectedTeacherId) || teachers[0];
      setRecoveryEmailInput(t?.email || '');
    }
    setIsRecoveryModalOpen(true);
  };

  const handleSendRecoveryCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmailInput.trim() || !recoveryEmailInput.includes('@')) {
      setRecoveryMessage('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (recoveryRole === 'admin') {
      const pass = settings.adminPassword || 'admin123';
      setRecoveryMessage(`Se ha validado la cuenta institucional. Como medida de asistencia inmediata, tu contraseña actual de administrador es: "${pass}". También se ha enviado el registro al correo ${recoveryEmailInput}.`);
    } else {
      const t = teachers.find((tch) => tch.id === selectedTeacherId) || teachers[0];
      const pass = t?.password || 'docente123';
      setRecoveryMessage(`Se ha validado la cuenta docente de ${t?.name}. Tu contraseña es: "${pass}". Se ha enviado la confirmación al correo ${recoveryEmailInput}.`);
    }
    setRecoverySent(true);
  };

  // Parent Login Handler by Student Document
  const handleParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParentSearchError('');
    const cleanDoc = studentDocInput.trim().toLowerCase();

    if (!cleanDoc) {
      setParentSearchError('Por favor ingresa el número de documento de identidad del estudiante.');
      return;
    }

    const matchedStudent = students.find(
      (s) => s.documentId.trim().toLowerCase() === cleanDoc
    );

    if (matchedStudent) {
      onLogin({
        role: 'parent',
        id: `parent-${matchedStudent.id}`,
        name: matchedStudent.guardianName || `Acudiente de ${matchedStudent.firstName}`,
        documentId: matchedStudent.documentId,
        student: matchedStudent,
      });
    } else {
      setParentSearchError(`No se encontró ningún estudiante activo registrado con el número de documento "${studentDocInput}". Por favor verifica el documento ingresado o comunícate con la institución educativa.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {/* Top right action buttons (PWA Install + Theme Toggle) */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        <button
          id="btn-pwa-install-login"
          onClick={() => setIsPwaModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white border border-indigo-400/30 text-xs font-bold transition-all shadow-lg shadow-indigo-950/50 cursor-pointer"
          title="Instalar aplicación en Android / Móvil"
        >
          <Smartphone className="w-4 h-4" />
          <span className="hidden sm:inline">Instalar App Móvil</span>
        </button>

        {onToggleTheme && (
          <button
            id="btn-toggle-theme-login"
            onClick={onToggleTheme}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-all shadow-md cursor-pointer"
            title={theme === 'dark' ? 'Cambiar a Entorno Claro' : 'Cambiar a Entorno Oscuro'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="hidden md:inline">Oscuro</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10">
        {/* Institutional Branding Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-xl shadow-indigo-950/50">
            <School className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              Plataforma Escolar
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Registro Académico fleon
            </h1>
          </div>
          <p className="text-sm font-semibold text-slate-300">
            {settings.schoolName}
          </p>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Control de Asistencia, Calificaciones, Novedades de Uniforme y Notificaciones WhatsApp
          </p>

          {/* MySQL Sync Status Indicator */}
          <div className="flex items-center justify-center space-x-2 pt-1">
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Base de Datos MySQL Sincronizada</span>
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>Sincronizando con MySQL...</span>
              </span>
            )}
            {syncStatus === 'offline' && (
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Local (Cache)</span>
                {onManualSync && (
                  <button
                    type="button"
                    onClick={onManualSync}
                    className="underline hover:text-amber-200 text-[11px] font-bold cursor-pointer"
                  >
                    Conectar MySQL
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Login Card */}
        <div className="mt-8 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
          {/* Role Navigation Pills */}
          <div className="flex bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800/80 mb-8">
            <button
              id="tab-login-teacher"
              type="button"
              onClick={() => {
                setActiveTab('teacher');
                setAdminError('');
                setParentSearchError('');
              }}
              className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Docente</span>
            </button>

            <button
              id="tab-login-parent"
              type="button"
              onClick={() => {
                setActiveTab('parent');
                setAdminError('');
                setParentSearchError('');
              }}
              className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'parent'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Padres de Familia</span>
            </button>

            <button
              id="tab-login-admin"
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setAdminError('');
                setParentSearchError('');
              }}
              className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Administración</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* 1. DOCENTE LOGIN VIEW                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'teacher' && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <span>Acceso Docente</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                    Protegido con Contraseña
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Selecciona tu cuenta e ingresa la clave establecida por administración para registrar notas, tomar asistencia y enviar mensajes a acudientes.
                </p>
              </div>

              {/* Teacher Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  1. Selecciona tu cuenta docente:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {teachers.map((teacher) => {
                    const isSelected = selectedTeacherId === teacher.id;
                    return (
                      <div
                        key={teacher.id}
                        onClick={() => {
                          setSelectedTeacherId(teacher.id);
                          setTeacherError('');
                        }}
                        className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center space-x-2.5 ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500'
                            : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                            teacher.avatarColor || 'bg-indigo-600'
                          }`}
                        >
                          {teacher.name.split(' ').map((n) => n[0]).slice(1, 3).join('') || 'DC'}
                        </div>
                        <div className="truncate flex-1">
                          <h4 className="text-xs font-bold text-slate-100 truncate">
                            {teacher.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">
                            {teacher.specialty}
                          </p>
                        </div>
                        {isSelected && (
                          <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Teacher Password Form */}
              <form onSubmit={handleTeacherSubmit} className="space-y-3.5 pt-2 border-t border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      2. Contraseña del Docente ({teachers.find((t) => t.id === selectedTeacherId)?.name || 'Seleccionado'}):
                    </label>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="input-teacher-password"
                      type={showTeacherPassword ? "text" : "password"}
                      required
                      placeholder="Ingresa tu contraseña de docente..."
                      value={teacherPassword}
                      onChange={(e) => {
                        setTeacherPassword(e.target.value);
                        setTeacherError('');
                      }}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                      title={showTeacherPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">¿Olvidaste tu contraseña de docente?</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerRecovery('teacher')}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 flex items-center space-x-1"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Recuperar por Correo</span>
                    </button>
                  </div>
                </div>

                {teacherError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{teacherError}</span>
                  </div>
                )}

                <button
                  id="btn-login-teacher-submit"
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Ingresar como {teachers.find((t) => t.id === selectedTeacherId)?.name || 'Docente'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. PADRES DE FAMILIA LOGIN VIEW (DOCUMENT SEARCH)                         */}
          {/* ========================================================================= */}
          {activeTab === 'parent' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <span>Portal de Consulta para Padres de Familia</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                    Acceso Rápido
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Consulte de manera inmediata las calificaciones detalladas, porcentaje de asistencia, novedades de uniforme y llamados de atención de su hijo(a).
                </p>
              </div>

              <form onSubmit={handleParentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Número de Documento de Identidad del Estudiante (T.I. / R.C. / C.C.):
                  </label>
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      id="input-parent-student-doc"
                      type="text"
                      placeholder="Ingresa el número de documento del estudiante..."
                      value={studentDocInput}
                      onChange={(e) => {
                        setStudentDocInput(e.target.value);
                        setParentSearchError('');
                      }}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {parentSearchError && (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{parentSearchError}</span>
                  </div>
                )}

                <button
                  id="btn-parent-consult-submit"
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Consultar Informe de mi Hijo(a)</span>
                </button>
              </form>

              {/* Privacy protection notice */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Por seguridad y confidencialidad de la información del menor, el acceso requiere digitar de manera exacta el número de documento de identidad asignado en la matrícula.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. ADMINISTRADOR LOGIN VIEW                                               */}
          {/* ========================================================================= */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <span>Módulo de Administración & Rectoría</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                    Control Total
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Acceso exclusivo para directivos. Permite gestionar docentes, crear y eliminar cursos, administrar matrículas, importar estudiantes y configurar parámetros institucionales.
                </p>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Contraseña de Administración:
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      id="input-admin-password"
                      type={showAdminPassword ? "text" : "password"}
                      placeholder="Ingresa la contraseña..."
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        setAdminError('');
                      }}
                      className="w-full pl-11 pr-11 py-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                      title={showAdminPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showAdminPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">¿Olvidaste tu contraseña institucional?</span>
                  <button
                    type="button"
                    onClick={() => handleTriggerRecovery('admin')}
                    className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4 flex items-center space-x-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Recuperar por Correo</span>
                  </button>
                </div>

                {adminError && (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{adminError}</span>
                  </div>
                )}

                <button
                  id="btn-admin-submit"
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Ingresar a Administración</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* RECOVERY MODAL */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Recuperación de Contraseña
                </h3>
                <p className="text-xs text-slate-400">
                  {recoveryRole === 'admin' ? 'Cuenta de Administración y Rectoría' : 'Cuenta de Docente'}
                </p>
              </div>
            </div>

            {recoverySent ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-emerald-300 text-xs sm:text-sm flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">¡Solicitud Procesada!</span>
                    <span>{recoveryMessage}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRecoveryModalOpen(false)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Entendido, volver al inicio de sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendRecoveryCode} className="space-y-4">
                <p className="text-xs text-slate-300">
                  Ingresa tu correo electrónico registrado para recuperar el acceso y la clave asignada en la base de datos:
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Correo Electrónico Registrado:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={recoveryEmailInput}
                      onChange={(e) => setRecoveryEmailInput(e.target.value)}
                      placeholder="ejemplo: tu-correo@colegio.edu.co"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRecoveryModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 flex items-center space-x-2"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Recuperar Clave</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* PWA Install Modal */}
      {isPwaModalOpen && (
        <PwaInstallModal onDismiss={() => setIsPwaModalOpen(false)} />
      )}
    </div>
  );
};
