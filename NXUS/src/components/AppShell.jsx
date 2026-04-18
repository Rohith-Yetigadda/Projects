import { Sparkles } from 'lucide-react'

function AppShell() {
  return (
    <main className="app-shell">
      <section className="glass-panel">
        <div className="brand-row">
          <Sparkles size={18} />
          <h1>NXUS</h1>
        </div>
        <p>React migration scaffold is ready for feature-by-feature build.</p>
      </section>
    </main>
  )
}

export default AppShell
