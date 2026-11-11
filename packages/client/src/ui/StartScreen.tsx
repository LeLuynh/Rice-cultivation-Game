import { useMemo, useState, type FormEvent } from 'react'
import { useGame, saveStore } from '../game/store'
import { NAME_MAX, NAME_MIN, validatePlayerName } from '../game/name'
import { CONTROLS, continueLabel } from './messages'

interface Props { onOpenGuide?: () => void }

export function StartScreen({ onOpenGuide }: Props) {
  const startNew = useGame(s => s.startNew)
  const continueGame = useGame(s => s.continueGame)
  const saved = useMemo(() => saveStore.load(), [])
  const [askName, setAskName] = useState(saved.status !== 'ok')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    const result = validatePlayerName(name)
    if (!result.ok) {
      setError(result.reason === 'tooShort' ? `Tên cần ít nhất ${NAME_MIN} ký tự` : `Tên tối đa ${NAME_MAX} ký tự`)
      return
    }
    startNew(result.name)
  }

  const newGame = (): void => {
    if (window.confirm('Xóa tiến trình cũ và chơi lại từ đầu?')) setAskName(true)
  }

  return (
    <div className="screen-center">
      <div className="card start-card">
        <h1 className="title">Làng Lúa</h1>
        <p className="subtitle">Cày cấy, làm thuê và trở thành Địa chủ</p>

        {saved.status === 'corrupt' && <p className="warn">Không đọc được bản lưu cũ – hãy bắt đầu chơi mới.</p>}

        {saved.status === 'ok' && !askName ? (
          <>
            <button className="btn btn-primary btn-big" onClick={continueGame}>
              <span>Chơi tiếp</span>
              <small>{continueLabel(saved.state)}</small>
            </button>
            <button className="btn" onClick={newGame}>Chơi mới</button>
          </>
        ) : (
          <form className="name-form" onSubmit={submit}>
            <label htmlFor="player-name">Tên của bạn</label>
            <input
              id="player-name"
              value={name}
              maxLength={40}
              autoFocus
              placeholder="Ví dụ: Tí"
              onChange={e => { setName(e.target.value); setError(null) }}
            />
            {error && <p className="field-error">{error}</p>}
            <button className="btn btn-primary btn-big" type="submit">Vào làng</button>
          </form>
        )}

        <button className="btn" onClick={onOpenGuide} disabled={!onOpenGuide}>Bảng giá &amp; cách chơi</button>

        <h2 className="section">ĐIỀU KHIỂN</h2>
        <dl className="controls">
          {CONTROLS.map(c => (
            <div key={c.keys} className="control-row">
              <dt><kbd>{c.keys}</kbd></dt>
              <dd>{c.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
