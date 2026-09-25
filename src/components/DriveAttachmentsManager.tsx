import React, { useState, useEffect, useRef } from 'react';
import { DriveFileAttachment } from '../types';
import { 
  connectGoogleDrive, 
  uploadFileToGoogleDrive, 
  deleteFileFromGoogleDrive, 
  isDriveConnected,
  subscribeToDriveAuth
} from '../utils/googleDrive';
import { 
  FileText, 
  File, 
  Image as ImageIcon, 
  Paperclip, 
  UploadCloud, 
  ExternalLink, 
  Trash2, 
  FolderTree, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Sparkles,
  HardDrive
} from 'lucide-react';

interface DriveAttachmentsManagerProps {
  attachments: DriveFileAttachment[];
  folderSegments: string[];
  onUpdateAttachments: (newAttachments: DriveFileAttachment[]) => void;
  title?: string;
  description?: string;
  compact?: boolean;
  readOnly?: boolean;
}

export const DriveAttachmentsManager: React.FC<DriveAttachmentsManagerProps> = ({
  attachments = [],
  folderSegments,
  onUpdateAttachments,
  title = 'Documentos, PDFs & Evidencias en Google Drive',
  description = 'Los archivos se organizan automáticamente en tu Google Drive por Colegio, Grado, Grupo y Actividad.',
  compact = false,
  readOnly = false,
}) => {
  const [driveConnected, setDriveConnected] = useState<boolean>(isDriveConnected());
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDriveAuth((_user, token) => {
      setDriveConnected(Boolean(token));
    });
    return () => unsubscribe();
  }, []);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Tamaño desconocido';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file type icon & badge styling
  const getFileBadge = (mimeType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (mimeType.includes('pdf') || ext === 'pdf') {
      return {
        icon: <FileText className="w-4 h-4 text-rose-400" />,
        badge: 'PDF',
        bgColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      };
    }
    if (mimeType.includes('image') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      return {
        icon: <ImageIcon className="w-4 h-4 text-amber-400" />,
        badge: 'FOTO / IMAGEN',
        bgColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      };
    }
    if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) {
      return {
        icon: <FileText className="w-4 h-4 text-sky-400" />,
        badge: 'DOCX / WORD',
        bgColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      };
    }
    if (mimeType.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext)) {
      return {
        icon: <FileText className="w-4 h-4 text-emerald-400" />,
        badge: 'HOJA CÁLCULO',
        bgColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      };
    }
    return {
      icon: <File className="w-4 h-4 text-slate-400" />,
      badge: ext.toUpperCase() || 'ARCHIVO',
      bgColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    };
  };

  // Connect handler
  const handleConnectDrive = async () => {
    try {
      setErrorMessage(null);
      setUploadStatus('Conectando con Google Drive...');
      await connectGoogleDrive();
      setDriveConnected(true);
      setUploadStatus('');
    } catch (err: any) {
      console.error('Error connecting Drive:', err);
      setErrorMessage(err?.message || 'Error al conectar con Google Drive. Verifica que las ventanas emergentes estén permitidas.');
      setUploadStatus('');
    }
  };

  // Upload handler for files
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setIsUploading(true);

    try {
      const newUploadedList: DriveFileAttachment[] = [...attachments];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`[${i + 1}/${files.length}] Preparando "${file.name}"...`);

        const uploadedAttachment = await uploadFileToGoogleDrive({
          file,
          fileName: file.name,
          folderSegments,
          description: `Archivo cargado desde Registro Académico fleon el ${new Date().toLocaleDateString('es-CO')}`,
          onProgress: (status) => setUploadStatus(`[${i + 1}/${files.length}] ${status}`),
        });

        newUploadedList.push(uploadedAttachment);
      }

      onUpdateAttachments(newUploadedList);
      setUploadStatus('¡Archivos subidos exitosamente a tu Google Drive!');
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err: any) {
      console.error('Error in batch upload:', err);
      setErrorMessage(err?.message || 'Error al subir los archivos a Google Drive.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete attachment handler
  const handleDeleteAttachment = async (attachmentId: string) => {
    const item = attachments.find((a) => a.id === attachmentId);
    const confirmDelete = confirm(
      `¿Deseas quitar el archivo "${item?.name || 'este archivo'}" de este registro?\n\n(También se solicitará su remoción en tu Google Drive si está conectado).`
    );
    if (!confirmDelete) return;

    try {
      // Optimistically remove from list
      const updated = attachments.filter((a) => a.id !== attachmentId);
      onUpdateAttachments(updated);

      // Attempt Drive deletion in background
      if (driveConnected) {
        deleteFileFromGoogleDrive(attachmentId).catch((e) => console.warn('Drive deletion notice:', e));
      }
    } catch (e) {
      console.error('Error removing attachment:', e);
    }
  };

  // Folder Path display string
  const displayFolderPath = folderSegments.filter(Boolean).join('  ›  ');

  return (
    <div className={`space-y-3 ${compact ? 'text-xs' : ''}`}>
      {/* Header & Connection Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">{title}</h4>
            {!compact && <p className="text-[11px] text-slate-400">{description}</p>}
          </div>
        </div>

        {/* Connection status badge / button */}
        {!readOnly && (
          <div>
            {driveConnected ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Drive Conectado</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConnectDrive}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-sm transition-all cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Conectar Google Drive</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Target Folder Tree Structure Preview */}
      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-start space-x-2">
        <FolderTree className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Ruta en Google Drive:</span>
          <p className="font-mono text-slate-200 truncate" title={displayFolderPath}>
            📁 {displayFolderPath}
          </p>
        </div>
      </div>

      {/* Upload Drop Zone / Input */}
      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) {
              handleUploadFiles(e.dataTransfer.files);
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
            dragOver
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-700/80 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-600'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={(e) => {
              if (e.target.files) {
                handleUploadFiles(e.target.files);
              }
            }}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.mp4,.zip"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-2 rounded-full bg-slate-800 text-amber-400 shadow-inner">
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-200">
                {isUploading ? (
                  <span className="text-amber-400">{uploadStatus}</span>
                ) : (
                  <>
                    Arrastra aquí tus <span className="text-amber-400 font-bold">archivos, PDFs, fotos o documentos</span> o{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-amber-400 font-bold underline hover:text-amber-300 cursor-pointer"
                    >
                      explora tu dispositivo
                    </button>
                  </>
                )}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Formatos soportados: PDF, Word, Excel, Fotos (JPG/PNG), Rúbricas y Guías didácticas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Feedback */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <p className="flex-1">{errorMessage}</p>
        </div>
      )}

      {/* Upload Success Feedback */}
      {uploadStatus && !isUploading && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <p className="flex-1">{uploadStatus}</p>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Archivos Adjuntos ({attachments.length})</span>
            <span>Guardados en Drive</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((att) => {
              const badge = getFileBadge(att.mimeType, att.name);
              return (
                <div
                  key={att.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-sm transition-all"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-slate-800/80 shrink-0">
                      {att.thumbnailLink ? (
                        <img
                          src={att.thumbnailLink}
                          alt={att.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 object-cover rounded shadow-sm"
                        />
                      ) : (
                        badge.icon
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 truncate" title={att.name}>
                        {att.name}
                      </p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${badge.bgColor}`}>
                          {badge.badge}
                        </span>
                        <span>{formatFileSize(att.size)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <a
                      href={att.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Abrir en Google Drive"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Quitar archivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 text-center text-xs text-slate-500 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
          No hay archivos o evidencias adjuntas aún para este registro.
        </div>
      )}
    </div>
  );
};
