import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Player from './pages/Player.jsx'
import GM from './pages/GM.jsx'
import ScreamerOverlay from './components/ScreamerOverlay.jsx'
import HintBubble from './components/HintBubble.jsx'
import HapticsManager from './components/HapticsManager.jsx'
import './App.css'

function App() {
  return (
    <div>
      <HintBubble />
      <HapticsManager />
      <ScreamerOverlay />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/player" element={<Player />} />
        <Route path="/gm" element={<GM />} />
      </Routes>
    </div>
  )
}

export default App
