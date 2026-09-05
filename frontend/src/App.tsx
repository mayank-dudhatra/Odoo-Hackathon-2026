import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-purple-500 selection:text-white">
      {/* Background Gradient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 blur-3xl rounded-full pointer-events-none" />

      <main className="relative z-10 max-w-2xl w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-purple-950/20 text-center">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          Tailwind CSS v4 Active in Frontend
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent mb-4">
          Vite + React + Tailwind CSS
        </h1>

        <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-md mx-auto">
          Tailwind CSS v4 is configured in <code className="text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/40 text-sm">frontend/</code> using <code className="text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/40 text-sm">@tailwindcss/vite</code>.
        </p>

        {/* Interactive Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-6 mb-8 shadow-inner">
          <p className="text-slate-300 mb-4 text-sm font-medium">Test Interactive State</p>
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-semibold rounded-lg shadow-lg shadow-purple-600/25 transition-all duration-200 cursor-pointer"
          >
            Count is: {count}
          </button>
        </div>

        {/* Quick Links / Badges */}
        <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-400">
          <span className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50">React 19</span>
          <span className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50">Vite 8</span>
          <span className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50">Tailwind v4</span>
          <span className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50">TypeScript</span>
        </div>
      </main>
    </div>
  )
}

export default App
