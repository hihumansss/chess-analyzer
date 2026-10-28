import { useCallback, useMemo, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import './App.css'

type Panel = 'analysis' | 'play' | 'puzzles' | 'learn' | 'library'
type Theme = 'green' | 'blue' | 'brown'

const NAV: { id: Panel; label: string; icon: string }[] = [
  { id: 'analysis', label: 'Analysis board', icon: '⌘' },
  { id: 'play', label: 'Play vs computer', icon: '♟' },
  { id: 'puzzles', label: 'Puzzles', icon: '✦' },
  { id: 'learn', label: 'Learn chess', icon: '▤' },
  { id: 'library', label: 'Game library', icon: '▣' },
]
const START_FEN = 'start'

function safeGameFromFen(fen: string): Chess | null {
  try {
    return new Chess(fen.trim())
  } catch {
    return null
  }
}

function App() {
  const [game, setGame] = useState(() => new Chess())
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [activePanel, setActivePanel] = useState<Panel>('analysis')
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [boardTheme, setBoardTheme] = useState<Theme>('green')
  const [fenInput, setFenInput] = useState('')
  const [pgnInput, setPgnInput] = useState('')
  const [message, setMessage] = useState('')
  const [showFen, setShowFen] = useState(false)
  const [showPgn, setShowPgn] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLegalMoves, setShowLegalMoves] = useState(true)
  const [lastMove, setLastMove] = useState<[Square, Square] | null>(null)
  const [savedGames, setSavedGames] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('chesslab-games') ?? '[]') as string[] } catch { return [] }
  })
  const history = game.history({ verbose: true })
  const currentMove = history.at(-1)
  const movePairs = useMemo(() => {
    const pairs: { number: number; white?: string; black?: string }[] = []
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({ number: i / 2 + 1, white: history[i]?.san, black: history[i + 1]?.san })
    }
    return pairs
  }, [history.length, game])

  const updateGame = useCallback((next: Chess) => {
    setGame(next)
    setHistoryIndex(next.history().length - 1)
    const verbose = next.history({ verbose: true })
    const last = verbose.at(-1)
    setLastMove(last ? [last.from as Square, last.to as Square] : null)
    setMessage('')
  }, [])

  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string }) => {
    if (!targetSquare) return false
    const next = new Chess(game.fen())
    try {
      const move = next.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      if (!move) return false
      updateGame(next)
      return true
    } catch {
      return false
    }
  }, [game, updateGame])

  const newGame = () => {
    updateGame(new Chess())
    setMessage('New game started.')
  }

  const undoMove = () => {
    const next = new Chess(game.fen())
    const undone = next.undo()
    if (!undone) { setMessage('There are no moves to undo.'); return }
    updateGame(next)
    setMessage('Last move undone.')
  }

  const loadFen = () => {
    const next = safeGameFromFen(fenInput)
    if (!next) { setMessage('That FEN is invalid. Check the position and try again.'); return }
    updateGame(next)
    setShowFen(false)
    setMessage('FEN position loaded.')
  }

  const loadPgn = () => {
    const next = new Chess()
    try {
      next.loadPgn(pgnInput)
      updateGame(next)
      setShowPgn(false)
      setMessage('PGN game loaded.')
    } catch {
      setMessage('That PGN could not be read. Check its notation and try again.')
    }
  }

  const copyText = async (value: string, kind: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(`${kind} copied to clipboard.`)
    } catch {
      setMessage('Clipboard access was blocked. Select the text and copy it manually.')
    }
  }

  const saveGame = () => {
    const pgn = game.pgn() || '[Event "ChessLab saved position"]\n\n*'
    const next = [pgn, ...savedGames.filter((item) => item !== pgn)].slice(0, 30)
    setSavedGames(next)
    localStorage.setItem('chesslab-games', JSON.stringify(next))
    setMessage('Game saved in this browser.')
  }

  const status = game.isCheckmate()
    ? `Checkmate — ${game.turn() === 'w' ? 'Black' : 'White'} wins`
    : game.isDraw()
      ? 'Draw — the game is over'
      : game.isCheck()
        ? `${game.turn() === 'w' ? 'White' : 'Black'} to move · Check`
        : `${game.turn() === 'w' ? 'White' : 'Black'} to move`

  const boardOptions = {
    position: game.fen(),
    boardOrientation: orientation,
    allowDragging: !game.isGameOver(),
    squareStyles: {
      ...(showLegalMoves && currentMove ? {
        [currentMove.from]: { background: 'rgba(246, 246, 105, 0.42)' },
        [currentMove.to]: { background: 'rgba(246, 246, 105, 0.58)' },
      } : {}),
      ...(game.isCheck() ? Object.fromEntries(
        Object.entries(game.board().flat().filter(Boolean).map((piece) => piece?.square ?? '')).filter(([square]) => {
          const p = game.get(square as Square)
          return p?.type === 'k' && p.color === game.turn()
        }).map(([, square]) => [square, { background: 'radial-gradient(circle, #ff6464 0%, #ff6464 35%, transparent 70%)' }]),
      ) : {}),
    },
    darkSquareStyle: boardTheme === 'green' ? { backgroundColor: '#779952' } : boardTheme === 'blue' ? { backgroundColor: '#6f95b5' } : { backgroundColor: '#b58863' },
    lightSquareStyle: boardTheme === 'green' ? { backgroundColor: '#ebecd0' } : boardTheme === 'blue' ? { backgroundColor: '#e4edf5' } : { backgroundColor: '#f0d9b5' },
    onPieceDrop,
    arePiecesDraggable: !game.isGameOver(),
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActivePanel('analysis') }}>
          <span className="brand-mark">♞</span><span>Chess<span className="brand-light">Lab</span><small>YOUR CHESS WORKSPACE</small></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <button key={item.id} className={activePanel === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { setActivePanel(item.id); setMessage('') }}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.id === 'analysis' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="engine-card"><span className="engine-orb" /><div><strong>Analysis engine</strong><small>Not connected yet</small></div><span className="engine-status">OFF</span></div>
          <button className="nav-item quiet" onClick={() => setShowSettings((value) => !value)}><span className="nav-icon">⚙</span>Settings</button>
          <div className="sidebar-foot">CHESSLAB PREVIEW <span>v0.1</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="crumb"><span>Workspace</span><span className="crumb-sep">/</span><strong>{NAV.find((item) => item.id === activePanel)?.label}</strong></div>
          <div className="top-actions"><span className="local-pill"><span /> Saved locally</span><button className="icon-button" title="Settings" onClick={() => setShowSettings((value) => !value)}>⚙</button><div className="avatar">CL</div></div>
        </header>

        <section className="page-heading">
          <div><div className="eyebrow">CHESS ANALYSIS STUDIO</div><h1>{activePanel === 'analysis' ? 'Analysis board' : NAV.find((item) => item.id === activePanel)?.label}</h1><p>Study positions, explore variations, and review your games.</p></div>
          <div className="heading-actions"><button className="button secondary" onClick={() => setShowFen(true)}>Import FEN</button><button className="button primary" onClick={newGame}>＋ New game</button></div>
        </section>

        {activePanel !== 'analysis' && (
          <div className="feature-notice">
            <span className="notice-icon">✦</span><div><strong>{NAV.find((item) => item.id === activePanel)?.label} is being built</strong><p>This section is not pretending to be complete. For now, use the working analysis board and saved-game tools. The next milestones will add this section's real functionality.</p></div>
            <button className="button secondary small" onClick={() => setActivePanel('analysis')}>Open analysis</button>
          </div>
        )}

        <div className="workspace-grid">
          <section className="board-column">
            <div className="board-card">
              <div className="board-card-head"><div className="opponent"><div className="piece-avatar black-avatar">♟</div><div><strong>Black pieces</strong><small>Position study</small></div></div><span className="rating-tag">ANALYSIS</span></div>
              <div className="board-wrap">
                <div className="player-label top-player"><span className="player-chip dark-chip">♟</span><span>Black</span><span className="player-meta">To move after White</span></div>
                <div className="chessboard-container">
                  <Chessboard options={boardOptions} />
                </div>
                <div className="player-label bottom-player"><span className="player-chip light-chip">♙</span><span>White</span><span className="player-meta">{status}</span></div>
              </div>
              <div className="board-toolbar">
                <button title="Flip board" onClick={() => setOrientation((value) => value === 'white' ? 'black' : 'white')}>↻ <span>Flip board</span></button>
                <button title="Undo move" onClick={undoMove}>↶ <span>Undo</span></button>
                <button title="Reset game" onClick={newGame}>⟲ <span>Reset</span></button>
                <span className="toolbar-spacer" />
                <button title="Import PGN" onClick={() => { setPgnInput(''); setShowPgn(true) }}>⇧ <span>Import PGN</span></button>
                <button title="Export PGN" onClick={() => void copyText(game.pgn() || '*', 'PGN')}>⇩ <span>Export PGN</span></button>
              </div>
            </div>
            <div className="under-board">
              <div className="under-title"><span className="mini-icon">⌘</span><div><strong>Position tools</strong><small>Import, export and save your work</small></div></div>
              <div className="tool-buttons"><button onClick={() => { setFenInput(game.fen()); setShowFen(true) }}>Copy / load FEN</button><button onClick={saveGame}>Save game</button><button onClick={() => setShowLegalMoves((value) => !value)}>{showLegalMoves ? 'Hide' : 'Show'} last move</button></div>
            </div>
            {message && <div className="feedback" role="status"><span>ⓘ</span>{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
          </section>

          <aside className="analysis-column">
            <section className="panel eval-panel">
              <div className="panel-heading"><div><span className="panel-icon">◒</span><strong>Evaluation</strong></div><span className="waiting-tag">ENGINE OFF</span></div>
              <div className="eval-body"><div className="eval-bar" aria-label="Evaluation unavailable"><div className="eval-neutral" /></div><div className="eval-content"><div className="eval-score">— <small>cp</small></div><strong>Engine not connected</strong><p>No score is shown because Stockfish has not been integrated yet. Connect the real engine to get evaluations and best moves.</p></div></div>
              <div className="engine-controls"><label htmlFor="depth-range">Search depth <span>Unavailable</span></label><input id="depth-range" type="range" min="1" max="40" value="20" disabled /><div className="depth-scale"><span>1</span><span>20</span><span>40</span></div></div>
            </section>

            <section className="panel moves-panel">
              <div className="panel-heading"><div><span className="panel-icon">☷</span><strong>Move history</strong></div><span className="move-count">{history.length} {history.length === 1 ? 'MOVE' : 'MOVES'}</span></div>
              {movePairs.length === 0 ? <div className="empty-moves"><div className="empty-board">♞</div><strong>Your game starts here</strong><p>Make a move on the board. Every legal move will appear here.</p></div> : <div className="move-table"><div className="move-header"><span>#</span><span>WHITE</span><span>BLACK</span></div>{movePairs.map((move) => <div className="move-row" key={move.number}><span className="move-number">{move.number}.</span><button onClick={() => setMessage(`Move ${move.number}: ${move.white}`)}>{move.white}</button><button onClick={() => move.black && setMessage(`Move ${move.number}... ${move.black}`)}>{move.black ?? ''}</button></div>)}</div>}
              <div className="move-footer"><span>{game.isGameOver() ? 'Game finished' : 'Local board · legal moves'}</span><button onClick={() => void copyText(game.pgn() || '*', 'PGN')}>Copy PGN ↗</button></div>
            </section>

            <section className="panel insights-panel"><div className="panel-heading"><div><span className="panel-icon">✧</span><strong>Analysis insights</strong></div></div><div className="insight-row"><span className="insight-symbol">♟</span><div><strong>Board state</strong><p>{game.isCheckmate() ? 'Checkmate position' : game.isCheck() ? 'The side to move is in check' : game.isDraw() ? 'Draw position' : 'Legal position · ready to study'}</p></div></div><div className="insight-row"><span className="insight-symbol">↗</span><div><strong>Best move and variations</strong><p>Available after the Stockfish engine is connected.</p></div></div></section>
          </aside>
        </div>

        {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">PREFERENCES</div><h2 id="settings-title">Board settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close">×</button></div><label className="form-label">Board colour</label><div className="theme-options">{(['green', 'blue', 'brown'] as Theme[]).map((theme) => <button key={theme} className={boardTheme === theme ? 'theme-option selected' : 'theme-option'} onClick={() => setBoardTheme(theme)}><span className={`theme-swatch ${theme}`} />{theme[0]?.toUpperCase() + theme.slice(1)}{boardTheme === theme && ' ✓'}</button>)}</div><label className="check-setting"><input type="checkbox" checked={showLegalMoves} onChange={(event) => setShowLegalMoves(event.target.checked)} /> Highlight the most recent move</label><p className="modal-hint">Preferences apply to this board in the current session.</p></section></div>}

        {showFen && <div className="modal-backdrop" onClick={() => setShowFen(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="fen-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">POSITION EXCHANGE</div><h2 id="fen-title">FEN position</h2></div><button className="icon-button" onClick={() => setShowFen(false)} aria-label="Close">×</button></div><p className="modal-description">Load a position by pasting its FEN string, or copy the current position.</p><textarea value={fenInput || (showFen ? game.fen() : '')} onChange={(event) => setFenInput(event.target.value)} rows={3} spellCheck={false} aria-label="FEN string" /><div className="modal-actions"><button className="button secondary" onClick={() => void copyText(game.fen(), 'FEN')}>Copy current FEN</button><button className="button primary" onClick={loadFen}>Load position</button></div></section></div>}

        {showPgn && <div className="modal-backdrop" onClick={() => setShowPgn(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="pgn-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">GAME EXCHANGE</div><h2 id="pgn-title">Import PGN</h2></div><button className="icon-button" onClick={() => setShowPgn(false)} aria-label="Close">×</button></div><p className="modal-description">Paste a PGN game. Loading it will replace the moves on this board.</p><textarea value={pgnInput} onChange={(event) => setPgnInput(event.target.value)} rows={7} placeholder={'[Event "Casual Game"]\n\n1. e4 e5 2. Nf3 Nc6 *'} spellCheck={false} aria-label="PGN game" /><div className="modal-actions"><button className="button secondary" onClick={() => setShowPgn(false)}>Cancel</button><button className="button primary" onClick={loadPgn}>Load game</button></div></section></div>}

        {activePanel === 'library' && savedGames.length > 0 && <section className="saved-library"><div className="panel-heading"><div><span className="panel-icon">▣</span><strong>Saved games on this device</strong></div><span className="move-count">{savedGames.length} SAVED</span></div>{savedGames.map((pgn, index) => <div className="saved-game" key={`${index}-${pgn}`}><div><strong>Saved game {savedGames.length - index}</strong><small>{pgn.slice(0, 100).replace(/\s+/g, ' ') || 'Position only'}</small></div><button className="button secondary small" onClick={() => { setPgnInput(pgn); setShowPgn(true); setActivePanel('analysis') }}>Open PGN</button></div>)}</section>}
        <footer className="app-footer"><span>♞ ChessLab</span><span>Local-first chess study · No multiplayer</span><span>Built for focused analysis</span></footer>
      </main>
    </div>
  )
}

export default App
