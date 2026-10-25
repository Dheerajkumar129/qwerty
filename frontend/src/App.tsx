import { useState } from 'react';
import { Wind, LayoutDashboard, BarChart2, ExternalLink, Github } from 'lucide-react';
import clsx from 'clsx';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

type Tab = 'dashboard' | 'analytics';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top navigation bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
              <Wind className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-white tracking-wide">WindView</span>
              <span className="text-xs text-slate-400">GB Wind Power Intelligence</span>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </button>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-900/40 border border-green-800/50 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live — Elexon BMRS
            </span>
          </div>
        </div>
      </header>

      {/* Page subheader */}
      {activeTab === 'dashboard' && (
        <div className="bg-gradient-to-r from-blue-950/50 to-slate-950 border-b border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <h1 className="text-xl font-bold text-white">Day-Ahead Forecast Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Wind generation actuals and NESO forecasts for day-ahead procurement decisions · January 2026
            </p>
          </div>
        </div>
      )}
      {activeTab === 'analytics' && (
        <div className="bg-gradient-to-r from-purple-950/40 to-slate-950 border-b border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <h1 className="text-xl font-bold text-white">Forecast Accuracy Analytics</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Quantitative evaluation of WINDFOR accuracy · January 2026 · FUELHH vs WINDFOR
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>WindView v1.0.0</span>
            <span>·</span>
            <span>Data source: Elexon BMRS (FUELHH + WINDFOR)</span>
            <span>·</span>
            <span>Scope: January 2026 · GB National</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://bmrs.elexon.co.uk/api-documentation"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-slate-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Elexon API
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
