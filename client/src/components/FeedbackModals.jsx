import { CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const spring = { type: 'spring', stiffness: 300, damping: 25 };

export const FeedbackModal = ({ type, title, message, onClose }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm" />
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={spring}
            className="relative w-full max-w-sm glass rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        >
            <div className={`h-1 w-full ${type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`} />
            <div className="p-8 flex flex-col items-center text-center gap-4">
                <div className={`p-4 rounded-2xl ${type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
                    <p className="text-sm text-slate-400">{message}</p>
                </div>
                <button onClick={onClose} className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                    type === 'success' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20'
                }`}>
                    {type === 'success' ? 'Great!' : 'Dismiss'}
                </button>
            </div>
        </motion.div>
    </div>
);

export const ConfirmModal = ({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm" />
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={spring}
            className="relative w-full max-w-sm glass rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        >
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-red-400" />
            <div className="p-8 flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400"><ShieldAlert size={32} /></div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
                    <p className="text-sm text-slate-400">{message}</p>
                </div>
                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
                    <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all border ${confirmColor || 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20'}`}>{confirmLabel}</button>
                </div>
            </div>
        </motion.div>
    </div>
);
