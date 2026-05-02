'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Dialog — accessible modal primitive used as the base for app dialogs.
 *
 * Behaviour:
 *  - Closes on Escape and on overlay click (configurable).
 *  - Locks body scroll while open.
 *  - Auto-focuses the close button on open for keyboard users.
 *  - Reuses the existing `.modal-overlay` class plus new `.dialog-*` styles
 *    in globals.css so it matches the rest of the design system.
 *
 * @param {boolean}  open                 — controlled open state
 * @param {()=>void} onClose              — called on close (Esc / overlay / X)
 * @param {string}   title                — heading text
 * @param {ReactNode} icon                — optional icon shown next to title
 * @param {ReactNode} children            — body content
 * @param {ReactNode} [actions]           — footer buttons (replaces default Close)
 * @param {boolean}   [closeOnOverlay=true]
 * @param {string}    [accent]            — CSS color used for the icon halo
 */
export default function Dialog({
    open,
    onClose,
    title,
    icon,
    children,
    actions,
    closeOnOverlay = true,
    accent = 'var(--amber)',
}) {
    const closeBtnRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);

        // Focus the close button so Tab/Esc immediately works.
        closeBtnRef.current?.focus();

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={closeOnOverlay ? onClose : undefined}
        >
            <div
                className="dialog-card"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    ref={closeBtnRef}
                    className="dialog-close"
                    onClick={onClose}
                    aria-label="Close dialog"
                    type="button"
                >
                    <X size={16} aria-hidden="true" />
                </button>

                <div className="dialog-head">
                    {icon && (
                        <div className="dialog-icon" style={{ color: accent, background: `${accent}1a` }}>
                            {icon}
                        </div>
                    )}
                    <h2 id="dialog-title" className="dialog-title">{title}</h2>
                </div>

                <div className="dialog-body">{children}</div>

                <div className="dialog-actions">
                    {actions ?? (
                        <button className="dialog-btn dialog-btn-primary" onClick={onClose} type="button">
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
