import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useGame } from './game/store'
import './styles.css'

// ?debug: mở store cho công cụ chụp màn hình tự động (chỉnh giờ, trạng thái ô)
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __rice: typeof useGame }).__rice = useGame

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
