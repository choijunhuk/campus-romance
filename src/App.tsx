import { useGame } from './store'
import { TitleScreen } from './components/TitleScreen'
import { Game } from './components/Game'
import { Gallery } from './components/Gallery'

export default function App() {
  const screen = useGame((s) => s.screen)
  return (
    <div className="mx-auto h-full w-full max-w-6xl">
      {screen === 'title' && <TitleScreen />}
      {screen === 'game' && <Game />}
      {screen === 'gallery' && <Gallery />}
    </div>
  )
}
