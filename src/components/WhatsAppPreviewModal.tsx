import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Copy, Check, X, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { createWhatsAppUrl, formatPhoneNumberForWhatsApp } from '../utils/whatsapp';

interface WhatsAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  guardianName: string;
  guardianPhone: string;
  guardianCountryCode: string;
  initialMessage: string;
  onSendConfirm: () => void;
}

export const WhatsAppPreviewModal: React.FC<WhatsAppPreviewModalProps> = ({
  isOpen,
  onClose,
  studentName,
  guardianName,
  guardianPhone,
  guardianCountryCode,
  initialMessage,
  onSendConfirm,
}) => {
  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);

  // Sync initial message when opened
  React.useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage, isOpen]);

  if (!isOpen) return null;

  const formattedPhone = formatPhoneNumberForWhatsApp(guardianPhone, guardianCountryCode);
  const isValidPhone = formattedPhone.length >= 8;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying text:', err);
    }
  };

  const handleSend = () => {
    if (!isValidPhone) return;
    const url = createWhatsAppUrl(guardianPhone, guardianCountryCode, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    onSendConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      <div id="whatsapp-preview-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          id="whatsapp-preview-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800 flex flex-col my-auto max-h-[92dvh] overflow-y-auto text-slate-100"
        >
          {/* Header */}
          <div className="bg-emerald-700/80 border-b border-emerald-600/30 px-5 sm:px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                <MessageSquare className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg leading-tight">Enviar Mensaje de WhatsApp</h3>
                <p className="text-emerald-200 text-xs">Acudiente de {studentName}</p>
              </div>
            </div>
            <button
              id="btn-close-whatsapp-preview"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
            {/* Recipient info badge */}
            <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destinatario</span>
                <p className="text-sm font-bold text-slate-100">{guardianName}</p>
                <div className="flex items-center text-xs text-slate-300 space-x-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 inline" />
                  <span>{guardianCountryCode} {guardianPhone}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  isValidPhone 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {isValidPhone ? 'Número Válido' : 'Número Inválido'}
                </span>
              </div>
            </div>

            {!isValidPhone && (
              <div className="bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>El estudiante no tiene un número telefónico válido registrado para el acudiente.</span>
              </div>
            )}

            {/* Editable message box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Mensaje a Enviar (Editable)
                </label>
                <span className="text-xs text-slate-500">Formato WhatsApp (*negrita*, _cursiva_)</span>
              </div>
              <div className="relative">
                <textarea
                  id="whatsapp-message-editor"
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-sm font-sans p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Tip note */}
            <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 leading-normal">
              💡 Al hacer clic en <strong className="text-slate-200">"Abrir WhatsApp"</strong>, se abrirá la aplicación oficial de WhatsApp o WhatsApp Web con el mensaje pre-cargado listo para presionar enviar.
            </p>
          </div>

          {/* Footer actions */}
          <div className="bg-slate-900/90 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between">
            <button
              id="btn-copy-whatsapp-text"
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg hover:bg-slate-700 shadow-sm transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <button
                id="btn-cancel-whatsapp"
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-send-whatsapp"
                type="button"
                disabled={!isValidPhone}
                onClick={handleSend}
                className={`inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all ${
                  isValidPhone
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer'
                    : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Abrir WhatsApp y Enviar</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
