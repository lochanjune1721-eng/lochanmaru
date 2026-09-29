import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { audio } from './engine/audio'

audio.init()

createRoot(document.getElementById('root')!).render(<App />)
