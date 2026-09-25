import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, Activity } from '../types';
import { 
  Sparkles, 
  RotateCcw, 
  UserCheck, 
  UserX, 
  X, 
  Volume2, 
  VolumeX, 
  Award, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Shuffle,
  History,
  GraduationCap
} from 'lucide-react';

interface StudentRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  groupName: string;
  subjectName: string;
  attendanceRecords?: AttendanceRecord[];
  onSelectStudentForGrading?: (student: Student) => void;
}

const ROULETTE_PALETTE = [
  '#4f46e5', // indigo-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#dc2626', // rose-600
  '#7c3aed', // purple-600
  '#0284c7', // sky-600
  '#0d9488', // teal-600
  '#e11d48', // pink-600
  '#ea580c', // orange-600
  '#4338ca', // indigo-700
  '#15803d', // green-700
  '#9333ea', // purple-700
];

export const StudentRouletteModal: React.FC<StudentRouletteModalProps> = ({
  isOpen,
  onClose,
  students,
  groupName,
  subjectName,
  attendanceRecords = [],
  onSelectStudentForGrading,
}) => {
  // Web Audio Context Synthesizer for tick and celebration chimes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const initAudio = () => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
  };

  const playTickSound = () => {
    if (!isSoundEnabled) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 + Math.random() * 80, audioCtxRef.current.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.04);
    } catch {
      // Audio not supported or blocked
    }
  };

  const playFanfareSound = () => {
    if (!isSoundEnabled) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch {
      // Ignore audio failure
    }
  };

  // Identify today's or current attendance records
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Map of absent students (strict exclusion by attendance novelty)
  const absentStudentIds = useMemo(() => {
    const absentIds = new Set<string>();
    attendanceRecords.forEach((rec) => {
      // Consider today's records or general absence status
      if (rec.date === todayStr || !rec.date) {
        const isAbsentStatus = 
          rec.status === 'absent' || 
          rec.status === 'evasion' || 
          rec.status === 'falta' || 
          rec.status === 'injustificada' || 
          rec.status === 'inasistencia';
        if (isAbsentStatus) {
          absentIds.add(rec.studentId);
        }
      }
    });
    return absentIds;
  }, [attendanceRecords, todayStr]);

  // Option to filter absent students
  const [excludeAbsent, setExcludeAbsent] = useState(true);

  // Eligible pool of active students
  const eligibleStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== 'active') return false;
      if (excludeAbsent && absentStudentIds.has(s.id)) return false;
      return true;
    });
  }, [students, excludeAbsent, absentStudentIds]);

  const absentStudentsList = useMemo(() => {
    return students.filter((s) => absentStudentIds.has(s.id));
  }, [students, absentStudentIds]);

  // Roulette Active Pool (students remaining to be picked)
  const [remainingPool, setRemainingPool] = useState<Student[]>([]);
  const [pickedHistory, setPickedHistory] = useState<{ student: Student; round: number; time: string }[]>([]);
  const [currentWinner, setCurrentWinner] = useState<Student | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Canvas ref for drawing the roulette wheel
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Sync remaining pool when eligible students change or on initial open
  useEffect(() => {
    if (isOpen) {
      // Keep only students in remaining pool that are still eligible
      setRemainingPool((prev) => {
        if (prev.length === 0 && pickedHistory.length === 0) {
          return eligibleStudents;
        }
        const pickedIds = new Set(pickedHistory.map((p) => p.student.id));
        return eligibleStudents.filter((s) => !pickedIds.has(s.id));
      });
    }
  }, [isOpen, eligibleStudents, pickedHistory]);

  // Reset roulette completely
  const handleResetRoulette = () => {
    if (isSpinning) return;
    setRemainingPool(eligibleStudents);
    setPickedHistory([]);
    setCurrentWinner(null);
  };

  // Draw the roulette wheel on canvas
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    const count = remainingPool.length;

    if (count === 0) {
      // Empty wheel placeholder
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡Todos los estudiantes', centerX, centerY - 10);
      ctx.fillText('ya fueron seleccionados!', centerX, centerY + 12);
      ctx.restore();
      return;
    }

    const arcSize = (2 * Math.PI) / count;

    // Draw slices
    remainingPool.forEach((student, index) => {
      const sliceStart = angle + index * arcSize;
      const sliceEnd = sliceStart + arcSize;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, sliceStart, sliceEnd);
      ctx.closePath();

      // Slice color
      ctx.fillStyle = ROULETTE_PALETTE[index % ROULETTE_PALETTE.length];
      ctx.fill();

      // Border between slices
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text inside slice
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(sliceStart + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = count > 20 ? 'bold 10px system-ui, sans-serif' : count > 12 ? 'bold 11px system-ui, sans-serif' : 'bold 13px system-ui, sans-serif';

      // Format display name (First name + Last name initial)
      const displayName = `${student.firstName.split(' ')[0]} ${student.lastName.split(' ')[0]}`;
      const truncated = displayName.length > 16 ? displayName.slice(0, 14) + '…' : displayName;
      ctx.fillText(truncated, radius - 20, 4);
      ctx.restore();

      ctx.restore();
    });

    // Draw Outer rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    // Draw Center hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center icon/text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RULETA', centerX, centerY);
    ctx.restore();
  };

  // Re-draw wheel on angle or pool update
  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [remainingPool]);

  // Spin the wheel
  const handleSpinWheel = () => {
    if (isSpinning || remainingPool.length === 0) return;

    setIsSpinning(true);
    setCurrentWinner(null);
    initAudio();

    // Calculate random winner
    const count = remainingPool.length;
    const winningIndex = Math.floor(Math.random() * count);
    const chosenStudent = remainingPool[winningIndex];

    const arcSize = (2 * Math.PI) / count;
    // Pointer is at the top (angle -Math.PI / 2 or 3*Math.PI/2)
    // Slices are drawn starting from angle.
    // Winning slice center is at `angle + winningIndex * arcSize + arcSize / 2`.
    // We want that center to align with top pointer:
    // (angle + winningIndex * arcSize + arcSize / 2) % (2*PI) = 3*Math.PI / 2
    const targetSliceAngle = (3 * Math.PI) / 2 - (winningIndex * arcSize + arcSize / 2);
    
    // Add multiple full rotations (5 to 8 full spins)
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const startAngle = currentAngleRef.current % (2 * Math.PI);
    const totalDelta = extraSpins + (targetSliceAngle - startAngle + 4 * Math.PI) % (2 * Math.PI);

    const duration = 4200; // ms
    const startTime = performance.now();
    let lastTickAngle = startAngle;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + totalDelta * easeOut;
      currentAngleRef.current = currentAngle;

      drawWheel(currentAngle);

      // Play tick sound when passing slice boundaries
      if (Math.abs(currentAngle - lastTickAngle) >= arcSize * 0.75) {
        playTickSound();
        lastTickAngle = currentAngle;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin complete
        setIsSpinning(false);
        playFanfareSound();
        setCurrentWinner(chosenStudent);

        // Record history
        const roundNum = pickedHistory.length + 1;
        const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        setPickedHistory((prev) => [
          { student: chosenStudent, round: roundNum, time: now },
          ...prev,
        ]);

        // REMOVE WINNING STUDENT FROM REMAINING POOL
        setRemainingPool((prev) => prev.filter((s) => s.id !== chosenStudent.id));
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh]">
        {/* Header */}
        <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-950">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-100">
                  Ruleta de Participación Aleatoria
                </h3>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Docente
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Curso: <span className="font-semibold text-slate-200">{groupName}</span> • Materia: <span className="font-semibold text-indigo-400">{subjectName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`p-2 rounded-xl border transition-colors ${
                isSoundEnabled
                  ? 'bg-slate-800 text-indigo-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-800/50 text-slate-500 border-slate-800'
              }`}
              title={isSoundEnabled ? 'Sonido Activado' : 'Sonido Silenciado'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
          {/* Left Column: Roulette Wheel Canvas & Controls */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-4">
            {/* Top Wheel Pointer Indicator */}
            <div className="relative flex flex-col items-center">
              {/* Pointer Arrow pointing downward onto wheel top */}
              <div className="z-10 -mb-3 text-rose-500 drop-shadow-md">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21L3 7h18l-9 14z" />
                </svg>
              </div>

              {/* Roulette Canvas */}
              <div className="p-2 rounded-full bg-slate-950/60 border-2 border-slate-800 shadow-2xl">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={340}
                  className="rounded-full max-w-full aspect-square"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-wrap items-center justify-center gap-3">
              <button
                id="btn-spin-student-roulette"
                type="button"
                onClick={handleSpinWheel}
                disabled={isSpinning || remainingPool.length === 0}
                className="flex-1 max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-950/50 hover:shadow-indigo-900/60 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Girando Ruleta...' : '¡Girar Ruleta!'}</span>
              </button>

              <button
                id="btn-reset-student-roulette"
                type="button"
                onClick={handleResetRoulette}
                disabled={isSpinning}
                className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs shadow transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Reiniciar lista de estudiantes para volver a sortear a todos"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Reiniciar Ruleta</span>
              </button>
            </div>

            {/* Attendance Filter Toggle and Stats Bar */}
            <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeAbsent}
                    onChange={(e) => {
                      if (!isSpinning) setExcludeAbsent(e.target.checked);
                    }}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    Excluir automáticamente estudiantes ausentes hoy ({absentStudentIds.size})
                  </span>
                </label>

                <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-800/40">
                  En Ruleta: {remainingPool.length} / {eligibleStudents.length}
                </span>
              </div>

              {absentStudentIds.size > 0 && excludeAbsent && (
                <div className="flex items-center space-x-2 text-[11px] text-amber-400 bg-amber-950/30 p-2 rounded-xl border border-amber-800/30">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {absentStudentIds.size} estudiante(s) con registro de inasistencia/falta hoy no participarán en el sorteo.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Winner Banner & History */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Winner Announcement Box */}
            {currentWinner ? (
              <div className="bg-gradient-to-br from-indigo-950/80 via-purple-950/60 to-slate-900 border-2 border-indigo-500/70 rounded-2xl p-4 shadow-xl text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>¡Estudiante Seleccionado(a)!</span>
                </div>

                <div className="flex items-center justify-center space-x-3 pt-1">
                  <div
                    className={`w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shadow-lg ${
                      currentWinner.avatarColor || 'bg-indigo-600'
                    }`}
                  >
                    {currentWinner.firstName[0]}
                  </div>
                  <div className="text-left">
                    <h4 className="text-base font-black text-slate-100">
                      {currentWinner.lastName} {currentWinner.firstName}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      Doc: {currentWinner.documentId}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-indigo-300 font-medium">
                  Ha sido retirado(a) del listado de la ruleta para las próximas rondas.
                </p>

                {onSelectStudentForGrading && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectStudentForGrading(currentWinner);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Calificar a {currentWinner.firstName.split(' ')[0]}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 text-center text-slate-400 space-y-2">
                <Shuffle className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">
                  Presiona "¡Girar Ruleta!" para elegir un estudiante
                </p>
                <p className="text-[11px] text-slate-500">
                  El estudiante seleccionado responderá y saldrá automáticamente del sorteo.
                </p>
              </div>
            )}

            {/* Selection History / Participation List */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-purple-400" />
                  <h4 className="font-bold text-xs text-slate-200">
                    Historial de Participación ({pickedHistory.length})
                  </h4>
                </div>
                {pickedHistory.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {remainingPool.length} restantes
                  </span>
                )}
              </div>

              <div className="overflow-y-auto max-h-44 space-y-1.5 pr-1 divide-y divide-slate-800/40">
                {pickedHistory.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-4">
                    Aún no se han sorteado estudiantes en esta sesión.
                  </p>
                ) : (
                  pickedHistory.map((item, idx) => (
                    <div
                      key={item.student.id + idx}
                      className="flex items-center justify-between pt-1.5 pb-0.5 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 flex items-center justify-center font-bold text-[10px]">
                          #{pickedHistory.length - idx}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-200">
                            {item.student.lastName} {item.student.firstName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Absent Excluded Students Accordion / Summary */}
            {absentStudentsList.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                  <div className="flex items-center space-x-1.5">
                    <UserX className="w-3.5 h-3.5 text-rose-400" />
                    <span>Estudiantes Ausentes Excluidos ({absentStudentsList.length})</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {absentStudentsList.map((s) => (
                    <span
                      key={s.id}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/40 font-medium"
                    >
                      {s.firstName} {s.lastName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950/80 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Quedan <strong className="text-slate-200">{remainingPool.length}</strong> de <strong className="text-slate-200">{eligibleStudents.length}</strong> estudiantes por participar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
