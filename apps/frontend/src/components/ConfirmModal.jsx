import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './ConfirmModal.css';

export default function ConfirmModal({
    open,
    title = 'ยืนยันการดำเนินการ',
    message = '',
    confirmLabel = 'ยืนยัน',
    cancelLabel = 'ยกเลิก',
    variant = 'danger',
    hideCancel = false,
    onConfirm,
    onCancel,
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="cm-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={hideCancel ? onConfirm : onCancel}
                >
                    <motion.div
                        className="cm-card"
                        initial={{ opacity: 0, scale: 0.88, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 16 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`cm-icon-ring cm-icon-${variant}`}>
                            {variant === 'danger' && (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            )}
                            {variant === 'warning' && (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            )}
                            {variant === 'success' && (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            )}
                            {variant === 'info' && (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                            )}
                        </div>
                        <h3 className="cm-title">{title}</h3>
                        {message && <p className="cm-message">{message}</p>}
                        <div className="cm-actions">
                            {!hideCancel && (
                                <button className="cm-btn cm-btn-cancel" onClick={onCancel}>{cancelLabel}</button>
                            )}
                            <button className={`cm-btn cm-btn-confirm cm-btn-${variant}`} onClick={onConfirm}>{confirmLabel}</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
