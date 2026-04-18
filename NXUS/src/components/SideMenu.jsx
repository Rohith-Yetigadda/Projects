import { useRef, useState } from 'react'
import {
  Sun, Layers, Download, RefreshCw, Trash2,
  LogOut, Pencil, ChevronRight, Settings
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import HeatmapGrid from './HeatmapGrid'

const PALETTES = [
  { name: 'emerald', color: '#63e6a4', title: 'Emerald' },
  { name: 'cyan',    color: '#4fd1ff', title: 'Ocean'   },
  { name: 'violet',  color: '#a78bfa', title: 'Violet'  },
  { name: 'sunset',  color: '#fb923c', title: 'Sunset'  },
  { name: 'rose',    color: '#fb7185', title: 'Rose'    },
]

function SideMenu({
  /* open state */
  isOpen,
  onClose,

  /* profile */
  displayName,
  email,
  onSaveName,

  /* heatmap */
  habits,
  year,
  monthIndex,

  /* appearance */
  theme,             // 'dark' | 'light'
  onToggleTheme,
  density,           // 'comfortable' | 'compact'
  onToggleDensity,
  palette,           // 'emerald' | 'cyan' | ...
  onChangePalette,

  /* data actions */
  onExportCSV,
  onSync,
  onReset,
  onSignOut,
}) {
  const navigate = useNavigate()
  const [isEditingName, setIsEditingName] = useState(false)
  const nameInputRef = useRef(null)

  const avatarLetter = (displayName || 'U').charAt(0).toUpperCase()

  const handleEditStart = () => {
    setIsEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 50)
  }

  const handleNameCommit = async (e) => {
    const newName = e.target.value.trim() || 'User'
    setIsEditingName(false)
    await onSaveName?.(newName)
  }

  const handleNameKeyDown = async (e) => {
    if (e.key === 'Enter') { e.currentTarget.blur(); return }
    if (e.key === 'Escape') { setIsEditingName(false) }
  }

  return (
    <>
      {/* OVERLAY */}
      <div
        className={`menu-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* PANEL */}
      <aside className={`side-menu ${isOpen ? 'open' : ''}`} aria-label="Settings menu">

        {/* ── PROFILE ──────────────────────────────── */}
        <div className="menu-header">
          <div className="menu-profile">
            <div className="menu-avatar" id="menuAvatar">{avatarLetter}</div>
            <div className="menu-profile-info">
              <div className="menu-name-row">
                <span className="menu-display-name" id="menuDisplayName">
                  {displayName}
                </span>
              </div>
              <span className="menu-email" id="menuEmail">{email || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── HEATMAP ──────────────────────────────── */}
        <div className="menu-heatmap-section">
          <div
            className="menu-section-label"
            style={{ padding: '10px 20px 6px 20px', fontSize: 9 }}
          >
            This Month
          </div>
          <div style={{ padding: '0 20px 14px 20px' }}>
            <HeatmapGrid habits={habits} year={year} monthIndex={monthIndex} />
          </div>
        </div>

        {/* ── NAVIGATION ─────────────────────────────── */}
        <div className="menu-section">
          <div className="menu-section-label">Navigation</div>
          <div
            className="menu-row"
            id="menuSettings"
            onClick={() => { onClose(); navigate('/settings') }}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && (onClose(), navigate('/settings'))}
          >
            <div className="menu-row-left">
              <Settings style={{ width: 15, height: 15 }} />
              <span>Settings</span>
            </div>
            <ChevronRight style={{ width: 14, height: 14, opacity: 0.4 }} />
          </div>
        </div>

        {/* ── APPEARANCE ───────────────────────────── */}
        <div className="menu-section">
          <div className="menu-section-label">Appearance</div>

          {/* Light Mode toggle */}
          <div
            className="menu-row"
            id="themeToggleRow"
            onClick={onToggleTheme}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onToggleTheme?.()}
          >
            <div className="menu-row-left">
              <Sun style={{ width: 15, height: 15 }} />
              <span>Light Mode</span>
            </div>
            <div className={`menu-toggle ${theme === 'light' ? 'on' : ''}`} id="themeToggle">
              <div className="menu-toggle-thumb" />
            </div>
          </div>

          {/* Compact View toggle */}
          <div
            className="menu-row"
            onClick={onToggleDensity}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onToggleDensity?.()}
          >
            <div className="menu-row-left">
              <Layers style={{ width: 15, height: 15 }} />
              <span>Compact View</span>
            </div>
            <div className={`menu-toggle ${density === 'compact' ? 'on' : ''}`} id="densityToggle">
              <div className="menu-toggle-thumb" />
            </div>
          </div>

          {/* Accent colour */}
          <div className="menu-row-label">Accent Color</div>
          <div className="palette-grid" id="paletteGrid">
            {PALETTES.map(p => (
              <div
                key={p.name}
                className={`palette-dot ${palette === p.name ? 'active' : ''}`}
                data-palette={p.name}
                style={{ background: p.color }}
                title={p.title}
                onClick={() => onChangePalette?.(p.name)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onChangePalette?.(p.name)}
                aria-label={`${p.title} accent`}
                aria-pressed={palette === p.name}
              />
            ))}
          </div>
        </div>

        {/* ── DATA ─────────────────────────────────── */}
        <div className="menu-section">
          <div className="menu-section-label">Data</div>

          <div className="menu-row" id="exportBtn" onClick={onExportCSV} role="button" tabIndex={0}>
            <div className="menu-row-left">
              <Download style={{ width: 15, height: 15 }} />
              <span>Export Month CSV</span>
            </div>
            <ChevronRight style={{ width: 14, height: 14, opacity: 0.4 }} />
          </div>

          <div className="menu-row" id="syncBtn" onClick={onSync} role="button" tabIndex={0}>
            <div className="menu-row-left">
              <RefreshCw style={{ width: 16, height: 16 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>Sync from Last Month</span>
              </div>
            </div>
            <ChevronRight style={{ width: 14, height: 14, opacity: 0.4, flexShrink: 0 }} />
          </div>

          <div className="menu-row" id="resetBtn" onClick={onReset} role="button" tabIndex={0}>
            <div className="menu-row-left">
              <Trash2 style={{ width: 15, height: 15 }} />
              <span>Reset All Data</span>
            </div>
            <ChevronRight style={{ width: 14, height: 14, opacity: 0.4 }} />
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────────── */}
        <div className="menu-footer">
          <div className="menu-app-info">
            <div className="menu-app-version">version 1.1.2</div>
          </div>
          <div
            className="menu-row menu-signout"
            id="menuSignOut"
            onClick={onSignOut}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onSignOut?.()}
          >
            <div className="menu-row-left">
              <LogOut style={{ width: 15, height: 15 }} />
              <span>Sign Out</span>
            </div>
          </div>
        </div>

      </aside>
    </>
  )
}

export default SideMenu
