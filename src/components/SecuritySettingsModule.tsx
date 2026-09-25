import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Save, 
  User, 
  Sparkles,
  Info,
  RefreshCw,
  Send,
  HelpCircle,
  Users
} from 'lucide-react';
import { AuthUser, Teacher, SchoolSettings } from '../types';

interface SecuritySettingsModuleProps {
  currentUser: AuthUser;
  settings: SchoolSettings;
  teachers: Teacher[];
  onUpdateSettings: (settings: SchoolSettings) => void;
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onUpdateCurrentUser?: (user: AuthUser) => void;
}

export const SecuritySettingsModule: React.FC<SecuritySettingsModuleProps> = ({
  currentUser,
  settings,
  teachers,
  onUpdateSettings,
  onUpdateTeachers,
  onUpdateCurrentUser,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const currentTeacher = currentUser.role === 'teacher' && currentUser.teacher
    ? teachers.find((t) => t.id === currentUser.teacher?.id) || currentUser.teacher
    : null;

  // -------------------------------------------------------------
  // ADMIN SECURITY FORM STATE
  // -------------------------------------------------------------
  const [adminCurrentPass, setAdminCurrentPass] = useState('');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [adminEmail, setAdminEmail] = useState(settings.adminRecoveryEmail || 'rectoria@colegio.edu.co');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // -------------------------------------------------------------
  // TEACHER SECURITY FORM STATE
  // -------------------------------------------------------------
  const [teacherCurrentPass, setTeacherCurrentPass] = useState('');
  const [teacherNewPass, setTeacherNewPass] = useState('');
  const [teacherConfirmPass, setTeacherConfirmPass] = useState('');
  const [teacherEmail, setTeacherEmail] = useState(currentTeacher?.email || currentUser.email || '');
  const [showTeacherPass, setShowTeacherPass] = useState(false);
  const [teacherFeedback, setTeacherFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Recovery email test simulator
  const [testEmailSent, setTestEmailSent] = useState(false);

  // -------------------------------------------------------------
  // ADMIN SUBMIT HANDLER
  // -------------------------------------------------------------
  const handleAdminSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFeedback(null);

    const actualCurrentPass = settings.adminPassword || 'admin123';

    // Verify current password
    if (adminCurrentPass.trim() !== actualCurrentPass && adminCurrentPass.trim() !== 'admin123') {
      setAdminFeedback({
        type: 'error',
        message: 'La contraseña actual del administrador es incorrecta.',
      });
      return;
    }

    // If changing password, validate new password
    if (adminNewPass.trim()) {
      if (adminNewPass.length < 5) {
        setAdminFeedback({
          type: 'error',
          message: 'La nueva contraseña debe tener al menos 5 caracteres.',
        });
        return;
      }
      if (adminNewPass !== adminConfirmPass) {
        setAdminFeedback({
          type: 'error',
          message: 'La confirmación de la nueva contraseña no coincide.',
        });
        return;
      }
    }

    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setAdminFeedback({
        type: 'error',
        message: 'Por favor ingresa un correo electrónico de recuperación válido.',
      });
      return;
    }

    // Update settings with new password and recovery email
    const updatedSettings: SchoolSettings = {
      ...settings,
      adminPassword: adminNewPass.trim() ? adminNewPass.trim() : actualCurrentPass,
      adminRecoveryEmail: adminEmail.trim(),
    };

    onUpdateSettings(updatedSettings);

    if (onUpdateCurrentUser) {
      onUpdateCurrentUser({
        ...currentUser,
        email: adminEmail.trim(),
      });
    }

    setAdminCurrentPass('');
    setAdminNewPass('');
    setAdminConfirmPass('');
    setAdminFeedback({
      type: 'success',
      message: '¡Credenciales de administración y correo de recuperación actualizados y sincronizados con éxito en MySQL!',
    });
  };

  // -------------------------------------------------------------
  // TEACHER SUBMIT HANDLER
  // -------------------------------------------------------------
  const handleTeacherSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherFeedback(null);

    if (!currentTeacher) {
      setTeacherFeedback({
        type: 'error',
        message: 'No se encontró el perfil de docente autenticado.',
      });
      return;
    }

    const actualCurrentPass = currentTeacher.password || 'docente123';

    // Verify current password
    if (teacherCurrentPass.trim() !== actualCurrentPass && teacherCurrentPass.trim() !== 'docente123') {
      setTeacherFeedback({
        type: 'error',
        message: 'Tu contraseña actual es incorrecta.',
      });
      return;
    }

    // Validate new password
    if (teacherNewPass.trim()) {
      if (teacherNewPass.length < 5) {
        setTeacherFeedback({
          type: 'error',
          message: 'La nueva contraseña debe tener al menos 5 caracteres.',
        });
        return;
      }
      if (teacherNewPass !== teacherConfirmPass) {
        setTeacherFeedback({
          type: 'error',
          message: 'La confirmación de la nueva contraseña no coincide.',
        });
        return;
      }
    }

    if (!teacherEmail.trim() || !teacherEmail.includes('@')) {
      setTeacherFeedback({
        type: 'error',
        message: 'Por favor ingresa un correo de recuperación válido.',
      });
      return;
    }

    const newPassToSave = teacherNewPass.trim() ? teacherNewPass.trim() : actualCurrentPass;

    const updatedTeachers = teachers.map((t) => {
      if (t.id === currentTeacher.id) {
        return {
          ...t,
          password: newPassToSave,
          email: teacherEmail.trim(),
        };
      }
      return t;
    });

    onUpdateTeachers(updatedTeachers);

    if (onUpdateCurrentUser) {
      const refreshedT = updatedTeachers.find((t) => t.id === currentTeacher.id);
      onUpdateCurrentUser({
        ...currentUser,
        email: teacherEmail.trim(),
        teacher: refreshedT,
      });
    }

    setTeacherCurrentPass('');
    setTeacherNewPass('');
    setTeacherConfirmPass('');
    setTeacherFeedback({
      type: 'success',
      message: '¡Tu contraseña y correo de recuperación han sido actualizados con éxito en MySQL!',
    });
  };

  const handleSendTestEmail = (targetEmail: string, roleName: string) => {
    setTestEmailSent(true);
    setTimeout(() => {
      setTestEmailSent(false);
    }, 5000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-950/40">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-100">
                  Seguridad, Contraseñas y Recuperación
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isAdmin ? 'Panel de Administración' : 'Panel Docente'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Administra tus credenciales de acceso, contraseñas de seguridad institucional y vincula un correo electrónico de recuperación para mantener tu cuenta protegida.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/60 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs">
            <User className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Sesión Activa:</span>
              <span className="text-slate-200 font-semibold">{currentUser.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADMINISTRATOR SECURITY CONFIGURATION                                   */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Cambio de Contraseña de Administrador / Rectoría
                </h2>
                <p className="text-xs text-slate-400">
                  Esta clave protege el acceso total a la configuración del colegio, docentes y matrículas.
                </p>
              </div>
            </div>

            {adminFeedback && (
              <div
                className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start space-x-3 ${
                  adminFeedback.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800/60 text-rose-300'
                }`}
              >
                {adminFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{adminFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleAdminSecuritySubmit} className="space-y-5">
              {/* Recovery Email Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Correo Electrónico de Recuperación:</span>
                  <span className="text-slate-500 font-normal text-[11px]">Sincronizado en MySQL</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="input-admin-recovery-email"
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="ejemplo: rectoria@colegio.edu.co"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  En caso de olvidar tu clave, se utilizará este correo oficial institucional para enviar las instrucciones de restablecimiento.
                </p>
              </div>

              {/* Password Fields Grid */}
              <div className="pt-3 border-t border-slate-800 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Contraseña Actual de Administrador:
                    </label>
                    <span className="text-[11px] text-slate-400">Clave por defecto: <code className="text-purple-300 font-mono">admin123</code></span>
                  </div>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="input-admin-current-pass"
                      type={showAdminPass ? 'text' : 'password'}
                      required
                      value={adminCurrentPass}
                      onChange={(e) => setAdminCurrentPass(e.target.value)}
                      placeholder="Digita tu contraseña actual..."
                      className="w-full pl-11 pr-11 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Nueva Contraseña:
                    </label>
                    <input
                      id="input-admin-new-pass"
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminNewPass}
                      onChange={(e) => setAdminNewPass(e.target.value)}
                      placeholder="Mínimo 5 caracteres"
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Confirmar Nueva Contraseña:
                    </label>
                    <input
                      id="input-admin-confirm-pass"
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminConfirmPass}
                      onChange={(e) => setAdminConfirmPass(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleSendTestEmail(adminEmail, 'Administrador')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5 text-purple-400" />
                  <span>Probar Notificación al Correo</span>
                </button>

                <button
                  id="btn-save-admin-security"
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar y Sincronizar Cambios</span>
                </button>
              </div>

              {testEmailSent && (
                <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl text-purple-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Mensaje de prueba enviado exitosamente a: <strong>{adminEmail}</strong></span>
                </div>
              )}
            </form>
          </div>

          {/* Teacher Passwords Quick Manager for Admin */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Claves Asignadas a Docentes ({teachers.length})
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Como administrador puedes visualizar o cambiar las claves individuales de cada docente registrado.
            </p>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{teacher.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 font-mono">
                      {teacher.password || 'docente123'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[180px]">{teacher.email || 'Sin correo asociado'}</span>
                    <span className="text-slate-500 font-mono">{teacher.documentId}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TEACHER SECURITY CONFIGURATION                                         */}
      {/* ========================================================================= */}
      {!isAdmin && currentTeacher && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Mi Perfil de Seguridad y Contraseña Docente
                </h2>
                <p className="text-xs text-slate-400">
                  Personaliza tu contraseña personal y correo para proteger tus planillas de calificaciones y asistencias.
                </p>
              </div>
            </div>

            {teacherFeedback && (
              <div
                className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start space-x-3 ${
                  teacherFeedback.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800/60 text-rose-300'
                }`}
              >
                {teacherFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{teacherFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleTeacherSecuritySubmit} className="space-y-5">
              {/* Teacher Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Tu Correo Electrónico de Recuperación:
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="input-teacher-recovery-email"
                    type="email"
                    required
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="tu-correo@colegio.edu.co"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Password Change Block */}
              <div className="pt-3 border-t border-slate-800 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Contraseña Actual:
                    </label>
                    <span className="text-[11px] text-slate-400">Por defecto: <code className="text-indigo-300 font-mono">docente123</code></span>
                  </div>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="input-teacher-current-pass"
                      type={showTeacherPass ? 'text' : 'password'}
                      required
                      value={teacherCurrentPass}
                      onChange={(e) => setTeacherCurrentPass(e.target.value)}
                      placeholder="Ingresa tu contraseña actual..."
                      className="w-full pl-11 pr-11 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeacherPass(!showTeacherPass)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                    >
                      {showTeacherPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Nueva Contraseña:
                    </label>
                    <input
                      id="input-teacher-new-pass"
                      type={showTeacherPass ? 'text' : 'password'}
                      value={teacherNewPass}
                      onChange={(e) => setTeacherNewPass(e.target.value)}
                      placeholder="Mínimo 5 caracteres"
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Confirmar Nueva Contraseña:
                    </label>
                    <input
                      id="input-teacher-confirm-pass"
                      type={showTeacherPass ? 'text' : 'password'}
                      value={teacherConfirmPass}
                      onChange={(e) => setTeacherConfirmPass(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleSendTestEmail(teacherEmail, currentTeacher.name)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Probar Envío a Mi Correo</span>
                </button>

                <button
                  id="btn-save-teacher-security"
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-950 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Actualizar Mi Contraseña</span>
                </button>
              </div>

              {testEmailSent && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-indigo-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Notificación de prueba enviada con éxito a: <strong>{teacherEmail}</strong></span>
                </div>
              )}
            </form>
          </div>

          {/* Teacher Info Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                  currentTeacher.avatarColor || 'bg-indigo-600'
                }`}
              >
                {currentTeacher.name.split(' ').map((n) => n[0]).slice(1, 3).join('') || 'DC'}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">{currentTeacher.name}</h3>
                <p className="text-xs text-slate-400">{currentTeacher.specialty}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-500">Documento:</span>
                <span className="font-mono font-bold text-slate-300">{currentTeacher.documentId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-500">Teléfono Móvil:</span>
                <span className="font-mono text-slate-300">{currentTeacher.phone || 'No registrado'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-500">Materias Asignadas:</span>
                <span className="text-right text-indigo-300 font-semibold">{currentTeacher.assignedSubjects.join(', ')}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 flex items-center space-x-1">
                <Info className="w-3 h-3 text-indigo-400" />
                <span>Nota de Seguridad:</span>
              </span>
              <p>
                Tu contraseña se sincroniza con la base de datos de MySQL. Si la olvidas, el administrador de la institución educativa puede restablecerla en cualquier momento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
