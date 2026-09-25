import React, { useState, useEffect, useMemo } from 'react';
import { Group, Student } from '../types';
import { sortGroupsAscending } from '../utils/groupUtils';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  SlidersHorizontal,
  Mail,
  RefreshCw,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  downloadStudentTemplate,
  parseRawStudentFile,
  processRowsWithMapping,
  RawStudentSheetData,
  StudentColumnMapping,
  ParsedStudentRow,
} from '../utils/excel';

interface StudentBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  existingStudents: Student[];
  onConfirmImport: (newStudents: Student[]) => void;
  defaultGroupId?: string;
}

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-fuchsia-500',
];

export const StudentBulkImportModal: React.FC<StudentBulkImportModalProps> = ({
  isOpen,
  onClose,
  groups,
  existingStudents,
  onConfirmImport,
  defaultGroupId,
}) => {
  const sortedGroups = useMemo(() => sortGroupsAscending(groups), [groups]);
  const [targetGroupId, setTargetGroupId] = useState<string>(defaultGroupId || sortedGroups[0]?.id || groups[0]?.id || '');
  const [rawSheetData, setRawSheetData] = useState<RawStudentSheetData | null>(null);
  const [columnMapping, setColumnMapping] = useState<StudentColumnMapping>({
    documentIdKey: '',
    firstNameKey: '',
    lastNameKey: '',
    fullNameKey: '',
    emailKey: '',
    courseKey: '',
    guardianNameKey: '',
    guardianPhoneKey: '',
    guardianRelationshipKey: '',
    observationsKey: '',
  });
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMappingConfig, setShowMappingConfig] = useState(false);

  // Sync default target group when props change or groups change
  useEffect(() => {
    if (defaultGroupId && sortedGroups.some((g) => g.id === defaultGroupId)) {
      setTargetGroupId(defaultGroupId);
    } else if (sortedGroups.length > 0 && !targetGroupId) {
      setTargetGroupId(sortedGroups[0].id);
    }
  }, [defaultGroupId, sortedGroups]);

  // Reset modal state on close
  const handleClose = () => {
    setRawSheetData(null);
    setParsedRows([]);
    setShowMappingConfig(false);
    onClose();
  };

  // Re-process parsed rows whenever raw data, mapping, or existing students change
  useEffect(() => {
    if (!rawSheetData) {
      setParsedRows([]);
      return;
    }

    const processed = processRowsWithMapping(rawSheetData.rawRows, columnMapping);

    // Build index of currently registered documents in database
    const existingDocMap = new Map<string, string>();
    existingStudents.forEach((s) => {
      if (s.documentId?.trim()) {
        existingDocMap.set(s.documentId.trim().toLowerCase(), `${s.lastName} ${s.firstName}`);
      }
    });

    const seenInBatch = new Set<string>();
    const verifiedRows: ParsedStudentRow[] = processed.map((r) => {
      if (r.error) return r;
      const cleanDoc = r.documentId?.trim().toLowerCase();
      if (!cleanDoc) {
        return { ...r, error: 'Documento de identidad no especificado' };
      }
      if (existingDocMap.has(cleanDoc)) {
        return {
          ...r,
          error: `Documento ya registrado (${cleanDoc}) - Pertenece a: ${existingDocMap.get(cleanDoc)}`,
        };
      }
      if (seenInBatch.has(cleanDoc)) {
        return {
          ...r,
          error: `Documento repetido en este mismo archivo (${r.documentId})`,
        };
      }
      seenInBatch.add(cleanDoc);
      return r;
    });

    setParsedRows(verifiedRows);
  }, [rawSheetData, columnMapping, existingStudents]);

  // Process selected file
  const processUploadedFile = async (file: File) => {
    setIsParsing(true);
    try {
      const data = await parseRawStudentFile(file);
      setRawSheetData(data);
      setColumnMapping(data.detectedMapping);
      // If any of the mandatory keys weren't auto-detected, expand mapping config
      if (!data.detectedMapping.documentIdKey || (!data.detectedMapping.firstNameKey && !data.detectedMapping.fullNameKey)) {
        setShowMappingConfig(true);
      }
    } catch (err) {
      alert('Error al leer el archivo. Asegúrate de que sea un archivo Excel (.xlsx, .xls) o CSV válido.');
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Resolve group ID for each student row
  const resolveGroupIdForImport = (rowCourseName?: string): string => {
    if (!rowCourseName) return targetGroupId;
    const clean = rowCourseName.toLowerCase().trim();
    const matched = groups.find(
      (g) =>
        g.name.toLowerCase().includes(clean) ||
        clean.includes(g.name.toLowerCase()) ||
        clean.includes(g.grade.toLowerCase())
    );
    return matched ? matched.id : targetGroupId;
  };

  // Confirm import
  const handleConfirmBulkImport = () => {
    if (!targetGroupId || parsedRows.length === 0) return;

    const validRows = parsedRows.filter((r) => !r.error);
    if (validRows.length === 0) {
      alert(
        'No hay estudiantes nuevos válidos para importar. Todos los registros tienen errores o documentos ya existentes en el sistema.'
      );
      return;
    }

    const newStudents: Student[] = validRows.map((r, i) => {
      const assignedGroup = resolveGroupIdForImport(r.courseName);
      return {
        id: `std-imp-${Date.now()}-${i}`,
        documentId: r.documentId.trim(),
        firstName: r.firstName.trim(),
        lastName: r.lastName.trim(),
        groupId: assignedGroup,
        email: r.email?.trim() || r.guardianEmail?.trim() || '',
        guardianName: r.guardianName || '',
        guardianPhone: r.guardianPhone || '',
        guardianCountryCode: r.guardianCountryCode || '+57',
        guardianEmail: r.guardianEmail?.trim() || r.email?.trim() || '',
        guardianRelationship: r.guardianRelationship || 'Acudiente',
        status: 'active',
        observations: r.observations || '',
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      };
    });

    onConfirmImport(newStudents);
    handleClose();
    alert(`¡Se importaron ${newStudents.length} estudiantes exitosamente sin duplicados!`);
  };

  if (!isOpen) return null;

  const validCount = parsedRows.filter((r) => !r.error).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-4xl p-4 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto border border-slate-800 text-slate-100 animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/50 text-teal-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Importación Masiva de Estudiantes (Excel / CSV)
              </h3>
              <p className="text-xs text-slate-400">
                Reconocimiento inteligente de campos (First, Last, Nombre, Apellido, Email, Correo, etc.)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Destination Course & Sample Download */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              1. Curso de Destino por Defecto:
            </label>
            <select
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-teal-500"
            >
              {sortedGroups.map((g) => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                  {g.name} ({g.shift})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Si el archivo incluye columna de curso/grado, se asignará a cada curso automáticamente.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              2. ¿Deseas una plantilla prediseñada?
            </label>
            <button
              type="button"
              onClick={downloadStudentTemplate}
              className="w-full inline-flex items-center justify-center space-x-2 text-xs font-bold text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/50 p-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plantilla Excel Ejemplo (.XLSX)</span>
            </button>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Compatible con encabezados en español e inglés (First, Last, Nombre, Apellido, Email).
            </span>
          </div>
        </div>

        {/* Information Banner */}
        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-indigo-200">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">
              Reconocimiento Flexible de Columnas y Encabezados
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              El sistema identifica automáticamente códigos y variantes como <code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-300">First / FirstName</code> (Nombres), <code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-300">Last / LastName</code> (Apellidos), <code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-300">Email / Correo</code> y Documento. Además, puedes ajustar manualmente qué columna corresponde a cada dato.
            </p>
          </div>
        </div>

        {/* Step 2: Upload Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 block">
              3. Selecciona o arrastra tu archivo Excel (.xlsx, .xls) o CSV:
            </label>
            {rawSheetData && (
              <button
                type="button"
                onClick={() => {
                  setRawSheetData(null);
                  setParsedRows([]);
                }}
                className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Cargar otro archivo</span>
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragOver
                ? 'border-teal-400 bg-teal-950/40 scale-[1.01]'
                : rawSheetData
                ? 'border-teal-500/50 bg-teal-950/20'
                : 'border-slate-700 hover:border-teal-500 bg-slate-900/60'
            }`}
          >
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              id="student-bulk-excel-upload-input"
            />
            <label
              htmlFor="student-bulk-excel-upload-input"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <FileSpreadsheet
                className={`w-10 h-10 ${
                  isDragOver ? 'text-teal-300 scale-110' : rawSheetData ? 'text-teal-400' : 'text-slate-400'
                } transition-transform`}
              />
              <span className="text-xs font-bold text-slate-200">
                {isParsing
                  ? 'Analizando y extrayendo columnas...'
                  : rawSheetData
                  ? `Archivo cargado: ${rawSheetData.fileName} (${rawSheetData.rawRows.length} filas leídas)`
                  : 'Arrastra tu archivo aquí o haz clic para seleccionarlo'}
              </span>
              <span className="text-[11px] text-slate-500">
                Formatos compatibles: Microsoft Excel (.xlsx, .xls) o valores separados por comas (.csv)
              </span>
            </label>
          </div>
        </div>

        {/* Step 3: Column Mapping Configuration (Always available once file is loaded) */}
        {rawSheetData && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <button
              type="button"
              onClick={() => setShowMappingConfig(!showMappingConfig)}
              className="w-full p-3.5 flex items-center justify-between bg-slate-800/70 hover:bg-slate-800 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <SlidersHorizontal className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-slate-200">
                  Mapeo y Asignación de Columnas del Archivo
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-950/60 border border-teal-800/60 text-teal-300 font-semibold">
                  {rawSheetData.headers.length} columnas detectadas
                </span>
              </div>
              <span className="text-xs font-semibold text-teal-400 hover:underline">
                {showMappingConfig ? 'Ocultar Mapeo' : 'Ajustar / Ver Asignación de Columnas'}
              </span>
            </button>

            {showMappingConfig && (
              <div className="p-4 bg-slate-900/95 border-t border-slate-800 space-y-4 animate-fade-in">
                <p className="text-xs text-slate-400">
                  Indica qué columna de tu archivo corresponde a cada dato. Si tu archivo ya tiene encabezados como <strong className="text-slate-200">First, Last, Nombre, Apellido, Correo</strong>, han sido seleccionados automáticamente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* Document */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Documento de Identidad *</span>
                      {columnMapping.documentIdKey && (
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-detectado</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.documentIdKey}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, documentIdKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* First Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Nombres / First Name *</span>
                      {columnMapping.firstNameKey && (
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-detectado</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.firstNameKey}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, firstNameKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Apellidos / Last Name *</span>
                      {columnMapping.lastNameKey && (
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-detectado</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.lastNameKey}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, lastNameKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Seleccionar Columna --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Full Name Alternative */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                      <span>Nombre Completo (si vienen juntos)</span>
                      {columnMapping.fullNameKey && (
                        <span className="text-[10px] text-teal-400 font-mono">Activo</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.fullNameKey || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, fullNameKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Ninguna (Usar Nombres y Apellidos separados) --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email / Correo */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-teal-300">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Correo Electrónico / Email</span>
                      </span>
                      {columnMapping.emailKey && (
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-detectado</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.emailKey || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, emailKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-teal-800/60 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Opcional (No importar email) --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course / Grade */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Curso / Grado (Opcional)</span>
                      {columnMapping.courseKey && (
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-detectado</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.courseKey || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, courseKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Usar Curso de Destino Seleccionado --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Guardian Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Nombre del Acudiente</span>
                      {columnMapping.guardianNameKey && (
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-detectado</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.guardianNameKey || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, guardianNameKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Opcional --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Guardian Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>WhatsApp / Teléfono</span>
                      {columnMapping.guardianPhoneKey && (
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-detectado</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.guardianPhoneKey || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, guardianPhoneKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Opcional --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Guardian Relationship */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Parentesco</span>
                      {columnMapping.guardianRelationshipKey && (
                        <span className="text-[10px] text-emerald-400 font-mono">Auto-detectado</span>
                      )}
                    </label>
                    <select
                      value={columnMapping.guardianRelationshipKey || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, guardianRelationshipKey: e.target.value }))
                      }
                      className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Opcional --</option>
                      {rawSheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-200">
                  Vista Previa ({parsedRows.length} registros extraídos)
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-bold">
                  {validCount} válidos para importar
                </span>
                {errorCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold">
                    {errorCount} con advertencia o duplicados
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowMappingConfig(true)}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Modificar columnas</span>
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-300 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">Documento</th>
                    <th className="p-2.5">Estudiante (Apellidos & Nombres)</th>
                    <th className="p-2.5">Correo / Email</th>
                    <th className="p-2.5">Curso Asignado</th>
                    <th className="p-2.5">Acudiente</th>
                    <th className="p-2.5">WhatsApp</th>
                    <th className="p-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parsedRows.map((row, i) => {
                    const targetGId = resolveGroupIdForImport(row.courseName);
                    const targetG = groups.find((g) => g.id === targetGId);
                    return (
                      <tr key={i} className={row.error ? 'bg-rose-950/30' : 'hover:bg-slate-800/40'}>
                        <td className="p-2.5 font-mono text-slate-300">
                          {row.documentId || <span className="text-rose-400 italic">Faltante</span>}
                        </td>
                        <td className="p-2.5 font-bold text-slate-100">
                          {row.lastName || row.firstName ? (
                            <span>
                              {row.lastName} {row.firstName}
                            </span>
                          ) : (
                            <span className="text-rose-400 italic">Sin nombre</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {row.email || row.guardianEmail ? (
                            <span className="inline-flex items-center space-x-1 text-teal-300 font-mono text-[11px]">
                              <Mail className="w-3 h-3 text-teal-400 shrink-0" />
                              <span>{row.email || row.guardianEmail}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-950/60 border border-indigo-700/50 text-indigo-300">
                            {targetG ? targetG.name : 'Por defecto'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400">
                          {row.guardianName ? (
                            `${row.guardianName} (${row.guardianRelationship || 'Acudiente'})`
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Opcional</span>
                          )}
                        </td>
                        <td className="p-2.5 font-medium">
                          {row.guardianPhone ? (
                            <span className="text-emerald-400">
                              {row.guardianCountryCode || '+57'} {row.guardianPhone}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Opcional</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {row.error ? (
                            <span className="text-rose-400 font-semibold flex items-center space-x-1 text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{row.error}</span>
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold flex items-center space-x-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Listo</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[#0f172a]/95 backdrop-blur-sm z-10 flex flex-wrap items-center justify-between gap-3 pt-3 pb-1 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {parsedRows.length > 0 ? (
              <span>
                Total procesados: <strong className="text-slate-200">{parsedRows.length}</strong> | Listos para matricular: <strong className="text-emerald-400">{validCount}</strong>
              </span>
            ) : (
              <span>Sube un archivo para comenzar la importación</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={validCount === 0}
              onClick={handleConfirmBulkImport}
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-teal-950/50 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirmar e Importar {validCount > 0 ? `(${validCount})` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
