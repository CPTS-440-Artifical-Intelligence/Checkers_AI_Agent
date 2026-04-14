import AppHeader from './components/AppHeader'
import CheckersGameWorkspace from './components/CheckersGameWorkspace'
import GameBackground from './components/GameBackground'

function App() {
  return (
    <div className='relative isolate min-h-screen px-4 py-8'>
      <GameBackground />

      <main className='relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[86rem] flex-col items-center justify-center gap-6'>
        <AppHeader
          title='Checkers AI Agent'
          subtitle='Board interaction test view with hovered-cell feedback.'
        />

        <CheckersGameWorkspace />
      </main>
    </div>
  )
}

export default App
