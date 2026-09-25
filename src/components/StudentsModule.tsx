import React, { useState, useMemo } from 'react';
import { Group, Student } from '../types';
import { 
  Plus, 
  UploadCloud, 
  FileSpreadsheet, 
  Search, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Phone, 
  PhoneOff,
  Mail, 
  ArrowRightLeft,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { exportStudentsToExcel } from '../utils/excel';
import { deleteRecordFromMySQL } from '../utils/mysqlService';
import { sortGroupsAscending } from '../utils/groupUtils';
import { StudentBulkImportModal } from './StudentBulkImportModal';

interface StudentsModuleProps {
  groups: Group[];
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
}

const COUNTRY_CODES = [
  { code: '+57', country: 'Colombia' },
  { code: '+52', country: 'México' },
  { code: '+54', country: 'Argentina' },
  { code: '+56', country: 'Chile' },
  { code: '+51', country: 'Perú' },
  { code: '+593', country: 'Ecuador' },
  { code: '+58', country: 'Venezuela' },
  { code: '+34', country: 'España' },
  { code: '+1', country: 'USA / Canadá' },
];

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

export const StudentsModule: React.FC<StudentsModuleProps> = ({
  groups,
  students,
  onUpdateStudents,
}) => {
  const sortedGroups = useMemo(() => sortGroupsAscending(groups), [groups]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortBy, setSortBy] = useState<'lastName' | 'firstName' | 'documentId'>('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Single Student Modal (Create / Edit)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState<{
    id?: string;
    documentId: string;
    firstName: string;
    lastName: string;
    groupId: string;
    email?: string;
    guardianName: string;
    guardianPhone: string;
    guardianCountryCode: string;
    guardianEmail: string;
    guardianRelationship: 'Madre' | 'Padre' | 'Acudiente' | 'Tutor' | 'Abuelo/a' | 'Otro';
    status: 'active' | 'inactive';
    observations: string;
  }>({
    documentId: '',
    firstName: '',
    lastName: '',
    groupId: sortedGroups[0]?.id || groups[0]?.id || '',
    email: '',
    guardianName: '',
    guardianPhone: '',
    guardianCountryCode: '+57',
    guardianEmail: '',
    guardianRelationship: 'Madre',
    status: 'active',
    observations: '',
  });

  // Bulk Import Excel Modal
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  // Move group modal (single)
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [newTargetGroupId, setNewTargetGroupId] = useState<string>(sortedGroups[0]?.id || groups[0]?.id || '');

  // Bulk Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>(sortedGroups[0]?.id || groups[0]?.id || '');

  // Filtered & Sorted Students
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      if (selectedGroupId !== 'all' && s.groupId !== selectedGroupId) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const full = `${s.firstName} ${s.lastName}`.toLowerCase();
        const fullReverse = `${s.lastName} ${s.firstName}`.toLowerCase();
        const doc = s.documentId.toLowerCase();
        const guard = s.guardianName.toLowerCase();
        const phone = s.guardianPhone.toLowerCase();
        return full.includes(q) || fullReverse.includes(q) || doc.includes(q) || guard.includes(q) || phone.includes(q);
      }
      return true;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'lastName') {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        comparison = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      } else if (sortBy === 'firstName') {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        comparison = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      } else if (sortBy === 'documentId') {
        comparison = a.documentId.localeCompare(b.documentId, undefined, { numeric: true, sensitivity: 'base' });
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [students, selectedGroupId, filterStatus, searchQuery, sortBy, sortOrder]);

  // Open Create Student
  const handleOpenCreateStudent = () => {
    setStudentForm({
      documentId: '',
      firstName: '',
      lastName: '',
      groupId: selectedGroupId !== 'all' ? selectedGroupId : groups[0]?.id || '',
      email: '',
      guardianName: '',
      guardianPhone: '',
      guardianCountryCode: '+57',
      guardianEmail: '',
      guardianRelationship: 'Madre',
      status: 'active',
      observations: '',
    });
    setIsStudentModalOpen(true);
  };

  // Open Edit Student
  const handleOpenEditStudent = (s: Student) => {
    setStudentForm({
      id: s.id,
      documentId: s.documentId,
      firstName: s.firstName,
      lastName: s.lastName,
      groupId: s.groupId,
      email: s.email || '',
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      guardianCountryCode: s.guardianCountryCode || '+57',
      guardianEmail: s.guardianEmail || '',
      guardianRelationship: s.guardianRelationship,
      status: s.status,
      observations: s.observations || '',
    });
    setIsStudentModalOpen(true);
  };

  // Save Single Student
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.firstName.trim() || !studentForm.lastName.trim() || !studentForm.groupId) return;

    const cleanDoc = studentForm.documentId?.trim().toLowerCase();
    if (cleanDoc) {
      const duplicateStudent = students.find(
        (s) => s.id !== studentForm.id && s.documentId?.trim().toLowerCase() === cleanDoc
      );
      if (duplicateStudent) {
        alert(
          `Ya existe otro estudiante registrado con el documento de identidad "${studentForm.documentId.trim()}":\n` +
          `• Estudiante: ${duplicateStudent.lastName} ${duplicateStudent.firstName}\n` +
          `Por favor verifica el número de documento para evitar duplicados.`
        );
        return;
      }
    }

    if (studentForm.id) {
      // Edit
      const updated = students.map((s) =>
        s.id === studentForm.id
          ? {
              ...s,
              ...studentForm,
              documentId: studentForm.documentId?.trim() || s.documentId,
              firstName: studentForm.firstName.trim(),
              lastName: studentForm.lastName.trim(),
              email: studentForm.email?.trim() || '',
              guardianName: studentForm.guardianName?.trim() || '',
              guardianPhone: studentForm.guardianPhone?.trim() || '',
              guardianCountryCode: studentForm.guardianCountryCode || '+57',
              guardianEmail: studentForm.guardianEmail?.trim() || '',
              guardianRelationship: studentForm.guardianRelationship || 'Acudiente',
              observations: studentForm.observations?.trim() || '',
            }
          : s
      );
      onUpdateStudents(updated);
    } else {
      // Create
      const newStudent: Student = {
        id: `std-${Date.now()}`,
        documentId: studentForm.documentId?.trim() || `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        groupId: studentForm.groupId,
        email: studentForm.email?.trim() || '',
        guardianName: studentForm.guardianName?.trim() || '',
        guardianPhone: studentForm.guardianPhone?.trim() || '',
        guardianCountryCode: studentForm.guardianCountryCode || '+57',
        guardianEmail: studentForm.guardianEmail?.trim() || '',
        guardianRelationship: studentForm.guardianRelationship || 'Acudiente',
        status: studentForm.status,
        observations: studentForm.observations?.trim() || '',
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      };
      onUpdateStudents([...students, newStudent]);
    }

    setIsStudentModalOpen(false);
  };

  // Bulk Selection Handlers
  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  // Bulk Move Group
  const handleConfirmBulkMove = () => {
    if (!bulkTargetGroupId || selectedStudentIds.size === 0) return;
    const targetGroup = groups.find((g) => g.id === bulkTargetGroupId);
    const updated = students.map((s) =>
      selectedStudentIds.has(s.id) ? { ...s, groupId: bulkTargetGroupId } : s
    );
    onUpdateStudents(updated);
    const count = selectedStudentIds.size;
    setSelectedStudentIds(new Set());
    setIsBulkMoveModalOpen(false);
    alert(`¡Se cambiaron ${count} estudiantes al grupo "${targetGroup?.name || 'seleccionado'}" exitosamente!`);
  };

  // Bulk Toggle Active/Inactive Status
  const handleBulkToggleStatus = (newStatus: 'active' | 'inactive') => {
    if (selectedStudentIds.size === 0) return;
    const updated = students.map((s) =>
      selectedStudentIds.has(s.id) ? { ...s, status: newStatus } : s
    );
    onUpdateStudents(updated);
    alert(`¡Se actualizaron ${selectedStudentIds.size} estudiantes a estado "${newStatus === 'active' ? 'Activo' : 'Inactivo'}"!`);
  };

  // Toggle active/inactive single
  const handleToggleStatus = (studentId: string) => {
    const updated = students.map((s) =>
      s.id === studentId ? { ...s, status: (s.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive' } : s
    );
    onUpdateStudents(updated);
  };

  // Delete student
  const handleDeleteStudent = (studentId: string) => {
    if (confirm('¿Estás seguro de eliminar este estudiante del sistema?')) {
      deleteRecordFromMySQL('estudiantes', studentId).catch((err) => {
        console.error('Error al eliminar estudiante de MySQL:', err);
      });
      onUpdateStudents(students.filter((s) => s.id !== studentId));
    }
  };

  // Move student between groups
  const handleConfirmMoveGroup = () => {
    if (!movingStudent || !newTargetGroupId) return;
    const updated = students.map((s) =>
      s.id === movingStudent.id ? { ...s, groupId: newTargetGroupId } : s
    );
    onUpdateStudents(updated);
    setMovingStudent(null);
  };

  const handleExportListExcel = () => {
    const group = groups.find((g) => g.id === selectedGroupId);
    exportStudentsToExcel(filteredStudents, group);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Filter & Actions Header */}
      <div className="bg-slate-900/60 rounded-2xl p-5 shadow-xl border border-slate-800 backdrop-blur-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Group Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Filtrar por Curso
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl p-2.5 min-w-[170px] shadow-sm"
            >
              <option value="all" className="bg-slate-900 text-slate-100">Todos los cursos ({students.length})</option>
              {sortedGroups.map((g) => {
                const count = students.filter((s) => s.groupId === g.id).length;
                return (
                  <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                    {g.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl p-2.5 min-w-[130px] shadow-sm"
            >
              <option value="active" className="bg-slate-900 text-slate-100">Activos</option>
              <option value="inactive" className="bg-slate-900 text-slate-100">Inactivos / Retirados</option>
              <option value="all" className="bg-slate-900 text-slate-100">Todos</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Ordenar por
            </label>
            <div className="flex items-center space-x-1">
              <select
                id="select-student-sort"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'lastName' | 'firstName' | 'documentId');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl p-2.5 min-w-[170px] shadow-sm"
              >
                <option value="lastName-asc" className="bg-slate-900 text-slate-100">Apellidos (A - Z)</option>
                <option value="lastName-desc" className="bg-slate-900 text-slate-100">Apellidos (Z - A)</option>
                <option value="firstName-asc" className="bg-slate-900 text-slate-100">Nombres (A - Z)</option>
                <option value="firstName-desc" className="bg-slate-900 text-slate-100">Nombres (Z - A)</option>
                <option value="documentId-asc" className="bg-slate-900 text-slate-100">Doc. Identidad (0 - 9)</option>
                <option value="documentId-desc" className="bg-slate-900 text-slate-100">Doc. Identidad (9 - 0)</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-[220px]">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Búsqueda Rápida
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nombre, documento, acudiente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            id="btn-export-students-excel"
            onClick={handleExportListExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            id="btn-bulk-import-excel"
            onClick={() => setIsBulkImportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-200 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-teal-400" />
            <span>Importación Masiva Excel</span>
          </button>

          <button
            id="btn-add-single-student"
            onClick={handleOpenCreateStudent}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 hover:shadow-indigo-900/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Estudiante</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Sticky Bar when items are selected */}
      {selectedStudentIds.size > 0 && (
        <div className="bg-indigo-950/90 border-2 border-indigo-500/60 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-3 text-slate-100">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs">
              {selectedStudentIds.size}
            </span>
            <div>
              <p className="text-xs font-bold text-slate-100">
                {selectedStudentIds.size === 1 ? '1 estudiante seleccionado' : `${selectedStudentIds.size} estudiantes seleccionados`}
              </p>
              <p className="text-[11px] text-indigo-300">
                Elige una acción masiva para aplicar a todos los seleccionados
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setBulkTargetGroupId(groups[0]?.id || '');
                setIsBulkMoveModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-indigo-200 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-600/50 rounded-xl transition-colors shadow-sm"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-300" />
              <span>Cambiar de Grupo ({selectedStudentIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkToggleStatus('active')}
              title="Marcar todos como activos"
              className="inline-flex items-center space-x-1 px-2.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 rounded-xl transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Activar</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkToggleStatus('inactive')}
              title="Marcar todos como inactivos"
              className="inline-flex items-center space-x-1 px-2.5 py-2 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/50 rounded-xl transition-colors"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Inactivar</span>
            </button>

            <button
              type="button"
              onClick={handleDeselectAll}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl"
              title="Deseleccionar todos"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Student List Table */}
      <div className="bg-slate-900/60 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                onChange={handleSelectAllFiltered}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-200">
                Seleccionar Todo ({filteredStudents.length})
              </span>
            </label>
            {selectedStudentIds.size > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {selectedStudentIds.size} seleccionados
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {students.filter((s) => s.status === 'active').length} Activos en total
          </span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <UserX className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium">No se encontraron estudiantes con los filtros seleccionados.</p>
            </div>
          ) : (
            filteredStudents.map((student, idx) => {
              const group = groups.find((g) => g.id === student.groupId);
              const isSelected = selectedStudentIds.has(student.id);

              return (
                <div
                  key={student.id}
                  id={`student-row-${student.id}`}
                  className={`p-4 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                    isSelected ? 'bg-indigo-950/30 border-l-4 border-indigo-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Checkbox + Student Info */}
                  <div className="flex items-center space-x-3.5 min-w-[280px]">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectStudent(student.id)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <div className="w-5 text-xs font-semibold text-slate-500 shrink-0 text-center">
                      {idx + 1}
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ${student.avatarColor || 'bg-indigo-600'}`}>
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-100 leading-tight">
                          {student.lastName} {student.firstName}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          student.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {student.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <span>Doc: <strong className="text-slate-300">{student.documentId}</strong></span>
                        <span>•</span>
                        <span className="text-indigo-400 font-semibold bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-800/40">
                          {group ? group.name : 'Sin grupo'}
                        </span>
                        {student.email && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center space-x-1 text-teal-300 font-mono text-[11px]" title={student.email}>
                              <Mail className="w-3 h-3 text-teal-400" />
                              <span>{student.email}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Guardian & WhatsApp Phone */}
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/80 space-y-1 min-w-[260px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">
                        Acudiente {student.guardianRelationship ? `(${student.guardianRelationship})` : ''}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {student.guardianName || <span className="text-amber-400/90 font-normal italic">Por registrar</span>}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      {student.guardianPhone ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{student.guardianCountryCode || '+57'} {student.guardianPhone}</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-slate-500 font-medium italic">
                          <PhoneOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>Sin WhatsApp registrado</span>
                        </span>
                      )}
                      {student.guardianEmail && (
                        <span className="text-slate-400 truncate max-w-[120px] text-[11px]" title={student.guardianEmail}>
                          {student.guardianEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-1.5 w-full lg:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setMovingStudent(student);
                        setNewTargetGroupId(student.groupId);
                      }}
                      title="Cambiar de grupo / curso"
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 rounded-lg hover:bg-indigo-900/40 transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Cambiar Grupo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditStudent(student)}
                      title="Editar datos del estudiante"
                      className="p-2 text-slate-300 hover:text-slate-100 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(student.id)}
                      title={student.status === 'active' ? 'Desactivar estudiante' : 'Reactivar estudiante'}
                      className={`p-2 rounded-lg transition-colors border ${
                        student.status === 'active'
                          ? 'text-amber-400 bg-amber-950/30 border-amber-800/40 hover:bg-amber-900/40'
                          : 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40 hover:bg-emerald-900/40'
                      }`}
                    >
                      {student.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(student.id)}
                      title="Eliminar estudiante permanentemente"
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Single Student Create / Edit */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-xl p-5 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto border border-slate-800 text-slate-100 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                {studentForm.id ? 'Editar Datos del Estudiante' : 'Matricular Nuevo Estudiante'}
              </h3>
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nombres del Estudiante *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Alejandro"
                    value={studentForm.firstName}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Apellidos del Estudiante *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Ramírez Silva"
                    value={studentForm.lastName}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Documento de Identidad (TI / CC) *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: 1098234501"
                    value={studentForm.documentId}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, documentId: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Curso / Grupo Asignado *</label>
                  <select
                    value={studentForm.groupId}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, groupId: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    {sortedGroups.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                        {g.name} ({g.shift})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  <span>Correo Electrónico del Estudiante (Opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="Ej: estudiante@colegio.edu.co"
                  value={studentForm.email || ''}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                />
              </div>

              {/* Acudiente Information (Optional) */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Información del Acudiente (Opcional)
                  </span>
                  <span className="text-[11px] text-slate-400">Puedes completarlo ahora o después</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Nombre del Acudiente (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: Marta Silva"
                      value={studentForm.guardianName}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, guardianName: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Parentesco</label>
                    <select
                      value={studentForm.guardianRelationship}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, guardianRelationship: e.target.value as any }))}
                      className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl"
                    >
                      <option value="Madre" className="bg-slate-900 text-slate-100">Madre</option>
                      <option value="Padre" className="bg-slate-900 text-slate-100">Padre</option>
                      <option value="Acudiente" className="bg-slate-900 text-slate-100">Acudiente</option>
                      <option value="Tutor" className="bg-slate-900 text-slate-100">Tutor / Representante legal</option>
                      <option value="Abuelo/a" className="bg-slate-900 text-slate-100">Abuelo / Abuela</option>
                      <option value="Otro" className="bg-slate-900 text-slate-100">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">País WhatsApp</label>
                    <select
                      value={studentForm.guardianCountryCode}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, guardianCountryCode: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-medium"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-slate-900 text-slate-100">
                          {c.code} ({c.country})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Número de Teléfono / WhatsApp (Opcional)</label>
                    <input
                      type="tel"
                      placeholder="Ej: 3158901234"
                      value={studentForm.guardianPhone}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, guardianPhone: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    placeholder="Ej: marta.silva@email.com"
                    value={studentForm.guardianEmail}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, guardianEmail: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Observaciones Generales / Médicas</label>
                <textarea
                  rows={2}
                  placeholder="Alergias, condiciones médicas, observaciones de convivencia..."
                  value={studentForm.observations}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, observations: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl placeholder-slate-500"
                />
              </div>

              <div className="sticky bottom-0 bg-[#0f172a]/95 backdrop-blur-sm pt-3 pb-1 border-t border-slate-800 flex justify-end space-x-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 cursor-pointer"
                >
                  Guardar Estudiante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Bulk Import Modal */}
      <StudentBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        groups={sortedGroups}
        existingStudents={students}
        onConfirmImport={(newStudents) => onUpdateStudents([...students, ...newStudents])}
        defaultGroupId={selectedGroupId !== 'all' ? selectedGroupId : sortedGroups[0]?.id}
      />

      {/* Modal Move Group */}
      {movingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl shadow-xl w-full max-w-sm p-5 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto border border-slate-800 text-slate-100">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              <span>Cambiar Estudiante de Grupo</span>
            </h3>
            <p className="text-xs text-slate-300">
              Selecciona el nuevo curso para <strong className="text-slate-100">{movingStudent.firstName} {movingStudent.lastName}</strong>:
            </p>
            <select
              value={newTargetGroupId}
              onChange={(e) => setNewTargetGroupId(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              {sortedGroups.map((g) => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                  {g.name} ({g.shift})
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingStudent(null)}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveGroup}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm"
              >
                Actualizar Curso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bulk Move Group */}
      {isBulkMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4 my-auto max-h-[92dvh] overflow-y-auto border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                <span>Cambiar Grupo a {selectedStudentIds.size} Estudiantes</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkMoveModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Selecciona el curso o grupo escolar al que deseas transferir a los <strong className="text-indigo-400 font-bold">{selectedStudentIds.size} estudiantes seleccionados</strong>:
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Curso de Destino:</label>
              <select
                value={bulkTargetGroupId}
                onChange={(e) => setBulkTargetGroupId(e.target.value)}
                className="w-full text-xs font-semibold p-3 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                {sortedGroups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-slate-900 text-slate-100">
                    {g.name} ({g.shift}) - Director: {g.directorName}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3 text-xs text-indigo-300 flex items-start space-x-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Los estudiantes mantendrán su historial y datos personales, actualizando su grupo asignado a la nueva lista.
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkMoveModalOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkMove}
                className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50"
              >
                Mover {selectedStudentIds.size} Estudiantes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
