import { Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'

function ConfirmModal({ isOpen, icon: IconComponent, iconColor, iconBg, title, message, confirmText, confirmColor, onCancel, onConfirm }) {
  if (!isOpen) return null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="confirm-modal-backdrop" onClick={onCancel}>
      <div className="confirm-modal-card" onClick={e => e.stopPropagation()}>
        {(IconComponent || iconBg) && (
          <div className="confirm-modal-icon" style={{ background: iconBg || 'rgba(239,68,68,0.15)' }}>
            {IconComponent && <IconComponent style={{ width: 22, height: 22, color: iconColor || '#ef4444' }} />}
          </div>
        )}
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-modal-actions">
          <button type="button" className="confirm-modal-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="confirm-modal-btn confirm"
            style={{ background: confirmColor || '#ef4444' }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmModal
