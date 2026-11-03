import { createRoot } from 'react-dom/client'
import '@fontsource/alegreya/latin-500-italic.css'
import '@fontsource/alegreya/latin-700.css'
import '@fontsource/alegreya/vietnamese-500-italic.css'
import '@fontsource/alegreya/vietnamese-700.css'
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import './styles.css'
import { App } from './App'
import { runtime } from './game/runtime'
import { useStore } from './state/store'

// Móc kiểm thử: chỉ bật khi có ?debug=1 (dùng cho Playwright và soát lỗi hình ảnh)
if (new URLSearchParams(location.search).get('debug') === '1') {
  ;(window as unknown as Record<string, unknown>).__chuaol = { runtime, store: useStore }
}

createRoot(document.getElementById('root')!).render(<App />)
