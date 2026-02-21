import Board from "./components/Board"
import AppHeader from "./components/AppHeader"

function App() {

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 px-4 py-8">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center justify-center gap-6">
        <AppHeader
          title="Checkers AI Agent"
          subtitle="Board interaction test view with hovered-cell feedback."
        />

        <Board />
      </main>
    </div>
  )
}

export default App
