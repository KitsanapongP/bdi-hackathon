import { Routes, Route, Navigate } from 'react-router-dom'
import GameThemePage from './pages/GameTheme/GameTheme'
import GameRegisterPage from './pages/GameTheme/GameRegister'
import GameLobbyPage from './pages/GameTheme/GameLobby'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/gametheme" replace />} />
      <Route path="/gametheme" element={<GameThemePage />} />
      <Route path="/gametheme/register" element={<GameRegisterPage />} />
      <Route path="/gametheme/lobby" element={<GameLobbyPage />} />
    </Routes>
  )
}

export default App
