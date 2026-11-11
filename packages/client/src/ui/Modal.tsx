import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose?: () => void
  wide?: boolean
  children: ReactNode
}

/** Khung bảng nổi giữa màn hình; không có onClose thì không có nút đóng. */
export function Modal({ title, onClose, wide, children }: Props) {
  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className={`card modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          {onClose && <button className="btn btn-close" onClick={onClose} aria-label="Đóng">✕</button>}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, active, onChange }: {
  tabs: { id: T; label: string; disabled?: boolean }[]; active: T; onChange: (id: T) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          className={`tab${t.id === active ? ' tab-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
