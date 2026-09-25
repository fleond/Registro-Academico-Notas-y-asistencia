import React, { useState, useMemo } from 'react';
import { 
  Group, 
  SchoolSettings, 
  Activity, 
  ClassDailyLog, 
  DriveFileAttachment 
} from '../types';
import { sortGroupsAscending } from '../utils/groupUtils';
import { 
  connectGoogleDrive, 
  disconnectGoogleDrive, 
  isDriveConnected, 
  subscribeToDriveAuth,
  deleteFileFromGoogleDrive
} from '../utils/googleDrive';
import { 
  HardDrive, 
  FolderTree, 
  FileText, 
  Image as ImageIcon, 
  File, 
  Search, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  UploadCloud, 
  LogOut, 
  X, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Sparkles,
  Layers
} from 'lucide-react';

interface GoogleDriveExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchoolSettings;
  groups: Group[];
  activities: Activity[];
  dailyLogs: ClassDailyLog[];
  onUpdateActivities?: (activities: Activity[]) => void;
  onUpdateDailyLogs?: (logs: ClassDailyLog[]) => void;
}

export const GoogleDriveExplorerModal: React.FC<GoogleDriveExplorerModalProps> = ({
  isOpen,
  onClose,
  settings,
  groups,
  activities,
  dailyLogs,
  onUpdateActivities,
  onUpdateDailyLogs,
}) => {
  const [driveConnected, setDriveConnected] = useState<boolean>(isDriveConnected());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'activities' | 'dailylogs'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  React.useEffect(() => {
    const unsub = subscribeToDriveAuth((user, token) => {
      setDriveConnected(Boolean(token));
      setUserEmail(user?.email || null);
    });
    return () => unsub();
  }, []);

  // Aggregate all attachments from activities and daily logs with contextual metadata
  const allFiles = useMemo(() => {
    const items: Array<{
      attachment: DriveFileAttachment;
      sourceType: 'activity' | 'dailylog';
      sourceId: string;
      sourceTitle: string;
      groupName: string;
      grade: string;
      date: string;
      subject: string;
    }> = [];

    // 1. Files from Activities
    activities.forEach((act) => {
      const grp = groups.find((g) => g.id === act.groupId);
      if (act.attachments && act.attachments.length > 0) {
        act.attachments.forEach((att) => {
          items.push({
            attachment: att,
            sourceType: 'activity',
            sourceId: act.id,
            sourceTitle: act.title,
            groupName: grp?.name || 'Grupo',
            grade: grp?.grade || 'Grado',
            date: act.assignedDate,
            subject: act.subject,
          });
        });
      }
    });

    // 2. Files from Class Daily Logs
    dailyLogs.forEach((log) => {
      const grp = groups.find((g) => g.id === log.groupId);
      if (log.attachments && log.attachments.length > 0) {
        log.attachments.forEach((att) => {
          items.push({
            attachment: att,
            sourceType: 'dailylog',
            sourceId: log.id,
            sourceTitle: log.topic || 'Diario de Campo',
            groupName: grp?.name || 'Grupo',
            grade: grp?.grade || 'Grado',
            date: log.date,
            subject: log.subject,
          });
        });
      }
    });

    return items;
  }, [activities, dailyLogs, groups]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    return allFiles.filter((item) => {
      if (selectedCategory === 'activities' && item.sourceType !== 'activity') return false;
      if (selectedCategory === 'dailylogs' && item.sourceType !== 'dailylog') return false;

      if (selectedGroupId !== 'all') {
        const actOrLogGroup = item.sourceType === 'activity' 
          ? activities.find((a) => a.id === item.sourceId)?.groupId
          : dailyLogs.find((l) => l.id === item.sourceId)?.groupId;
        if (actOrLogGroup !== selectedGroupId) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.attachment.name.toLowerCase().includes(q);
        const matchesTitle = item.sourceTitle.toLowerCase().includes(q);
        const matchesSubject = item.subject.toLowerCase().includes(q);
        const matchesPath = (item.attachment.folderPathDisplay || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesSubject && !matchesPath) return false;
      }

      return true;
    });
  }, [allFiles, selectedCategory, selectedGroupId, searchQuery, activities, dailyLogs]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    try {
      await connectGoogleDrive();
    } catch (e: any) {
      alert(`Error al conectar con Google Drive: ${e.message}`);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
  };

  const handleDeleteFile = async (item: typeof allFiles[0]) => {
    const confirmDel = confirm(
      `¿Deseas desvincular el archivo "${item.attachment.name}" de este registro?`
    );
    if (!confirmDel) return;

    if (item.sourceType === 'activity' && onUpdateActivities) {
      const updated = activities.map((a) => {
        if (a.id === item.sourceId) {
          return {
            ...a,
            attachments: (a.attachments || []).filter((x) => x.id !== item.attachment.id),
          };
        }
        return a;
      });
      onUpdateActivities(updated);
    } else if (item.sourceType === 'dailylog' && onUpdateDailyLogs) {
      const updated = dailyLogs.map((l) => {
        if (l.id === item.sourceId) {
          return {
            ...l,
            attachments: (l.attachments || []).filter((x) => x.id !== item.attachment.id),
          };
        }
        return l;
      });
      onUpdateDailyLogs(updated);
    }

    if (driveConnected) {
      deleteFileFromGoogleDrive(item.attachment.id).catch((e) => console.warn(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <span>Google Drive: Árbol de Carpetas & Archivos</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                  {settings.schoolName || 'Institución'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Visualiza y gestiona las guías, PDFs, rúbricas y fotografías organizadas por Colegio, Grado, Grupo y Actividad.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Estado de conexión:</span>
            {driveConnected ? (
              <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Conectado {userEmail ? `(${userEmail})` : ''}</span>
              </span>
            ) : (
              <span className="text-slate-400">No conectado</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {driveConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión de Drive</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Conectar con Google Drive</span>
              </button>
            )}
          </div>
        </div>

        {/* Tree Path Info */}
        <div className="p-4 bg-slate-900/40 border-b border-slate-800">
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-xs text-slate-300 space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
              <FolderTree className="w-4 h-4" />
              <span>Estructura de Árbol Automatizada:</span>
            </div>
            <p className="font-mono text-[11px] text-slate-300">
              📁 Mi Google Drive / 📁 {settings.schoolName || 'Institución'} / 📁 Grado [Grado] / 📁 Grupo [Grupo] / 📁 [Actividades | Diario de Campo] / 📁 [Fecha - Título]
            </p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Tabs */}
          <div className="flex p-1 bg-slate-950/70 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({allFiles.length})
            </button>
            <button
              onClick={() => setSelectedCategory('activities')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'activities'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Actividades
            </button>
            <button
              onClick={() => setSelectedCategory('dailylogs')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'dailylogs'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Diario Campo
            </button>
          </div>

          {/* Group Filter */}
          <div>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos los Cursos</option>
              {sortGroupsAscending(groups).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar archivo, materia, tema..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 text-slate-200 text-xs rounded-xl placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Content Files Grid */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {filteredFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFiles.map((item) => (
                <div
                  key={`${item.sourceId}-${item.attachment.id}`}
                  className="bg-slate-950/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                      {item.attachment.thumbnailLink ? (
                        <img
                          src={item.attachment.thumbnailLink}
                          alt={item.attachment.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded-lg shadow-sm"
                        />
                      ) : item.attachment.mimeType.includes('pdf') ? (
                        <FileText className="w-6 h-6 text-rose-400" />
                      ) : item.attachment.mimeType.includes('image') ? (
                        <ImageIcon className="w-6 h-6 text-amber-400" />
                      ) : (
                        <File className="w-6 h-6 text-sky-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.sourceType === 'activity'
                              ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {item.sourceType === 'activity' ? 'Actividad' : 'Diario de Campo'}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate font-medium">
                          {item.groupName} • {item.subject}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-100 truncate" title={item.attachment.name}>
                        {item.attachment.name}
                      </h5>

                      <p className="text-[10px] text-slate-400 truncate">
                        Registro: <span className="text-slate-300">{item.sourceTitle}</span> ({item.date})
                      </p>
                    </div>
                  </div>

                  {/* Folder path */}
                  <div className="text-[10px] font-mono text-slate-400 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/80 truncate" title={item.attachment.folderPathDisplay}>
                    📁 {item.attachment.folderPathDisplay || 'Google Drive'}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500">
                      Subido el {new Date(item.attachment.uploadedAt).toLocaleDateString('es-CO')}
                    </span>

                    <div className="flex items-center space-x-2">
                      <a
                        href={item.attachment.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir en Drive</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteFile(item)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Desvincular archivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <div className="p-4 rounded-full bg-slate-950/80 w-16 h-16 mx-auto flex items-center justify-center border border-slate-800 text-slate-500">
                <HardDrive className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                No hay archivos adjuntos en Google Drive todavía
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Puedes adjuntar guías, rúbricas en PDF o fotografías desde el módulo de <span className="text-amber-400">Calificaciones</span> al crear/editar una actividad, o desde el <span className="text-amber-400">Diario de Campo</span>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Total de archivos gestionados: <strong className="text-slate-200">{filteredFiles.length}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all cursor-pointer"
          >
            Cerrar Explorador
          </button>
        </div>
      </div>
    </div>
  );
};
