import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, X, ShieldAlert, Wifi, WifiOff } from 'lucide-react';

interface PwaInstallPromptProps {
  onDismiss?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallPromptProps> = ({ onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 text-slate-200 my-auto max-h-[92dvh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-900/40">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Instalar en Android / Móvil</h3>
              <p className="text-xs text-slate-400">PWA con Soporte Offline y Sincronización Automática</p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-2xl border flex items-center space-x-2.5 ${isOnline ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' : 'bg-amber-950/40 border-amber-800/50 text-amber-300'}`}>
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
            <div className="text-xs font-semibold">
              <p>{isOnline ? 'Conexión Activa' : 'Modo Fuera de Línea'}</p>
              <p className="text-[10px] opacity-75 font-normal">{isOnline ? 'Sincronización lista' : 'Guardando en local'}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl border bg-indigo-950/40 border-indigo-800/50 text-indigo-300 flex items-center space-x-2.5">
            <Check className="w-4 h-4 text-indigo-400" />
            <div className="text-xs font-semibold">
              <p>Caché Local Offline</p>
              <p className="text-[10px] opacity-75 font-normal">Almacenamiento persistente</p>
            </div>
          </div>
        </div>

        {/* Key Features & Offline Details */}
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
          <p className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Beneficios en tu dispositivo Android:</p>
          <ul className="space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span><strong>Toma de Asistencia y Calificaciones sin Internet:</strong> Registra asistencias, retardos y notas en aulas sin señal; todo se guarda en la memoria del teléfono.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-400 font-bold">✓</span>
              <span><strong>Auto-Sincronización Automática:</strong> En cuanto el dispositivo detecte conexión de red, los cambios suben automáticamente a tu base de datos MySQL.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-purple-400 font-bold">✓</span>
              <span><strong>Pantalla Completa:</strong> Funciona como una app nativa desde el cajón de aplicaciones de Android, sin barras de navegación del explorador.</span>
            </li>
          </ul>
        </div>

        {/* Installation Steps / Action Button */}
        {deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold flex items-center justify-center space-x-2 shadow-xl shadow-indigo-900/40 cursor-pointer transition-all transform active:scale-98 text-sm"
          >
            <Download className="w-5 h-5" />
            <span>Instalar Aplicación en Android</span>
          </button>
        ) : isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-center font-bold text-xs space-y-1">
            <Check className="w-5 h-5 mx-auto text-emerald-400" />
            <p>¡La aplicación ya está instalada en este dispositivo!</p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs space-y-2">
            <p className="font-bold text-white flex items-center space-x-1.5">
              <span>📱 Pasos para instalar en Google Chrome / Navegador Android:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
              <li>Toca el menú de opciones de Chrome (los <strong>tres puntos ⋮</strong> arriba a la derecha).</li>
              <li>Selecciona <strong>«Instalar aplicación»</strong> o <strong>«Agregar a la pantalla principal»</strong>.</li>
              <li>Acepta y ¡listo! Se creará el acceso directo con icono oficial en tu teléfono.</li>
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onDismiss}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
