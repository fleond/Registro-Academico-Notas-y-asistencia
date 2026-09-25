import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, X, ChevronRight, MessageSquare, Sparkles } from 'lucide-react';
import { createWhatsAppUrl } from '../utils/whatsapp';

export interface QueueItem {
  id: string;
  studentName: string;
  guardianName: string;
  guardianPhone: string;
  guardianCountryCode: string;
  message: string;
  reason: string;
  alreadySent: boolean;
}

interface BulkWhatsAppQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QueueItem[];
  onMarkItemSent: (id: string) => void;
  onFinishAll: () => void;
}

export const BulkWhatsAppQueueModal: React.FC<BulkWhatsAppQueueModalProps> = ({
  isOpen,
  onClose,
  items,
  onMarkItemSent,
  onFinishAll,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];
  const pendingCount = items.filter((i) => !i.alreadySent).length;
  const progressPercent = Math.round(((items.length - pendingCount) / items.length) * 100);

  const handleSendCurrent = () => {
    if (!currentItem) return;
    const url = createWhatsAppUrl(currentItem.guardianPhone, currentItem.guardianCountryCode, currentItem.message);
    window.open(url, '_blank', 'noopener,noreferrer');
    onMarkItemSent(currentItem.id);

    // Auto advance to next pending item if available
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <AnimatePresence>
      <div id="bulk-whatsapp-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          id="bulk-whatsapp-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-800 flex flex-col my-auto max-h-[92dvh] text-slate-100"
        >
          {/* Header */}
          <div className="bg-emerald-800/80 border-b border-emerald-600/30 px-5 sm:px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg leading-tight">Cola de Envíos WhatsApp a Acudientes</h3>
                <p className="text-emerald-200 text-xs">
                  {pendingCount} de {items.length} acudientes pendientes por notificar
                </p>
              </div>
            </div>
            <button
              id="btn-close-bulk-whatsapp"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-900 h-1.5 border-b border-slate-800">
            <div
              className="bg-emerald-500 h-1.5 transition-all duration-300 shadow-sm shadow-emerald-500/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
            {/* Step navigation & student list tags */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all flex items-center space-x-1.5 border ${
                    currentIndex === idx
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950'
                      : item.alreadySent
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{idx + 1}. {item.studentName.split(' ')[0]}</span>
                  {item.alreadySent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>

            {/* Current Item Card */}
            <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {currentItem.reason}
                  </span>
                  <h4 className="text-base font-bold text-slate-100 mt-1">{currentItem.studentName}</h4>
                  <p className="text-xs text-slate-400">
                    Acudiente: <strong className="text-slate-200">{currentItem.guardianName}</strong> ({currentItem.guardianCountryCode} {currentItem.guardianPhone})
                  </p>
                </div>
                {currentItem.alreadySent && (
                  <span className="inline-flex items-center space-x-1 text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enviado</span>
                  </span>
                )}
              </div>

              {/* Message Box */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Mensaje que se enviará al WhatsApp del acudiente:
                </label>
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                  {currentItem.message}
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="bg-slate-900/90 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Estudiante <strong className="text-slate-200">{currentIndex + 1}</strong> de <strong className="text-slate-200">{items.length}</strong>
            </div>

            <div className="flex items-center space-x-2.5">
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
                >
                  Anterior
                </button>
              )}

              {currentIndex < items.length - 1 && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 flex items-center space-x-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleSendCurrent}
                className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar WhatsApp a {currentItem.guardianName.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
