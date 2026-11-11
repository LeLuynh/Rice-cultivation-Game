import { Component, type ReactNode } from 'react'

interface Props { onReset: () => void; children: ReactNode }

/** Bắt lỗi hiển thị (ví dụ bản lưu lạ) để không trắng trang; cho về màn hình đầu. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="screen-center">
        <div className="card start-card">
          <h2>Có lỗi khi hiển thị game</h2>
          <p className="muted">Bản lưu có thể bị hỏng. Hãy về màn hình đầu và chọn chơi mới.</p>
          <button className="btn btn-primary" onClick={() => { this.setState({ failed: false }); this.props.onReset() }}>
            Về màn hình đầu
          </button>
        </div>
      </div>
    )
  }
}
