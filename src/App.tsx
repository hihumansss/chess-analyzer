import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Chess } from 'chess.js'
import { Chessboard, type ChessboardOptions } from 'react-chessboard'
import { useStockfish } from './useStockfish'
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
const FILES = 'abcdefgh'
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function safeGameFromFen(fen: string): Chess | null {
  try {
    const next = new Chess(fen.trim())
    if (next.fen() !== START_FEN) {
      next.header('Event', 'ChessLab Position', 'SetUp', '1', 'FEN', next.fen())
    }
    return next
  } catch {
    return null
  }
}

function cloneGame(source: Chess): Chess {
  const moves = source.history({ verbose: true })
  const headers = source.header()
  const initialFen = headers.FEN ?? (moves.length === 0 && source.fen() !== START_FEN ? source.fen() : undefined)
  const next = initialFen ? new Chess(initialFen) : new Chess()
  if (initialFen) {
    next.header('Event', headers.Event ?? 'ChessLab Position', 'SetUp', '1', 'FEN', initialFen)
  }
  for (const move of moves) {
    next.move({ from: move.from, to: move.to, promotion: move.promotion })
  }
  return next
}

function exportPgn(position: Chess): string {
  const pgn = position.pgn()
  if (pgn.trim()) return pgn
  if (position.fen() !== START_FEN) {
    return `[Event "ChessLab Position"]\n[SetUp "1"]\n[FEN "${position.fen()}"]\n\n*`
  }
  return '*'
}


function pvToSan(fen: string, variation: string): string {
  const replay = safeGameFromFen(fen) ?? new Chess()
  const san: string[] = []
  for (const uci of variation.trim().split(/\s+/)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) break
    const promotion = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined
    try {
      const move = replay.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        ...(promotion ? { promotion } : {}),
      })
      san.push(move.san)
    } catch {
      break
    }
  }
  return san.join(' ')
}

function identifyOpening(position: Chess): string {
  const moves = position.history()
  const openings: { moves: string[]; name: string }[] = [
    { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], name: 'Ruy Lopez (Spanish Opening)' },
    { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], name: 'Italian Game' },
    { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], name: 'Scotch Game' },
    { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], name: 'Nimzo-Indian Defense' },
    { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'], name: 'King’s Indian Defense' },
    { moves: ['d4', 'd5', 'c4'], name: 'Queen’s Gambit' },
    { moves: ['e4', 'c5'], name: 'Sicilian Defense' },
    { moves: ['e4', 'e6'], name: 'French Defense' },
    { moves: ['e4', 'c6'], name: 'Caro-Kann Defense' },
    { moves: ['e4', 'e5'], name: 'Open Game' },
    { moves: ['d4', 'd5'], name: 'Queen’s Pawn Game' },
    { moves: ['e4'], name: 'King’s Pawn Opening' },
    { moves: ['d4'], name: 'Queen’s Pawn Opening' },
  ]
  for (const opening of openings) {
    if (moves.length >= opening.moves.length && opening.moves.every((move, index) => moves[index] === move)) return opening.name
  }
  return moves.length === 0 ? 'Starting position' : 'Opening not identified in the built-in reference set'
}

type Puzzle = { title: string; fen: string; solutionUci: string; hint: string; explanation: string }

const PUZZLES: Puzzle[] = [
  {
    title: 'Mate in one: Queen and king',
    fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
    solutionUci: 'f7g7',
    hint: 'Look for a queen move that gives check while the king protects the queen.',
    explanation: 'Qg7 is checkmate: the queen checks along the seventh rank and is protected by the white king. Black has no legal escape.',
  },
  {
    title: 'Mate in one: Attack on f7',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 3 4',
    solutionUci: 'h5f7',
    hint: 'The f7 square is defended by the bishop on c4. Can the queen deliver mate there?',
    explanation: 'Qxf7 is checkmate. The queen checks the king on e8 and the bishop protects the queen on f7, so the king cannot capture it.',
  },
]

type Lesson = { title: string; objective: string; explanation: string; example: string; question: string; answers: string[]; correct: number }
const LESSONS: Lesson[] = [
  { title: 'Piece movement and check', objective: 'Recognise legal moves and identify check.', explanation: 'A legal move cannot leave your own king in check. When the king is attacked, you must respond by moving the king, capturing the attacker, or blocking the attack when possible.', example: 'A rook attacks along its rank or file, but another piece can block that line.', question: 'Which rule must every legal move obey?', answers: ['It must capture a piece', 'It cannot leave your own king in check', 'It must move a pawn'], correct: 1 },
  { title: 'Tactical patterns: forks', objective: 'Spot a move that attacks two targets at once.', explanation: 'A fork is one move that attacks two or more enemy pieces at the same time. Knights are especially good at forks because their movement is difficult to block.', example: 'A knight checks the king while also attacking the queen. The opponent must answer the check first.', question: 'Why is a knight fork powerful?', answers: ['It can attack multiple targets with one move', 'It always wins the queen', 'It cannot be captured'], correct: 0 },
  { title: 'Basic endgames: opposition', objective: 'Understand the king opposition in king-and-pawn endings.', explanation: 'In a king-and-pawn ending, king activity matters. Opposition occurs when the kings face each other with one square between them and the player not to move can often gain the key tempo.', example: 'Approaching the enemy king directly may let it hold the pawn; using opposition can force it to give ground.', question: 'What is a key goal when using opposition?', answers: ['Keep your king inactive', 'Force the opposing king to give way', 'Trade your king for a pawn'], correct: 1 },
]

function App() {
  const [game, setGame] = useState(() => new Chess())
  const [selectedPly, setSelectedPly] = useState<number | null>(null)
  const [activePanel, setActivePanel] = useState<Panel>('analysis')
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [boardTheme, setBoardTheme] = useState<Theme>('green')
  const [fenInput, setFenInput] = useState('')
  const [pgnInput, setPgnInput] = useState('')
  const [message, setMessage] = useState('')
  const [showFen, setShowFen] = useState(false)
  const [showPgn, setShowPgn] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [engineEnabled, setEngineEnabled] = useState(false)
  const [engineDepth, setEngineDepth] = useState(20)
  const [computerGameEnabled, setComputerGameEnabled] = useState(false)
  const [humanColor, setHumanColor] = useState<'white' | 'black'>('white')
  const lastComputerMoveFen = useRef('')
  const [showLastMove, setShowLastMove] = useState(true)
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [puzzleGame, setPuzzleGame] = useState(() => new Chess(PUZZLES[0].fen))
  const [puzzleSolved, setPuzzleSolved] = useState(false)
  const [puzzleFeedback, setPuzzleFeedback] = useState('Find the best move on the board.')
  const [lessonIndex, setLessonIndex] = useState(0)
  const [lessonChoice, setLessonChoice] = useState<number | null>(null)
  const [lessonFeedback, setLessonFeedback] = useState('')
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [libraryQuery, setLibraryQuery] = useState('')
  const [variations, setVariations] = useState<string[]>([])
  const [savedGames, setSavedGames] = useState<string[]>(() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem('chesslab-games') ?? '[]')
      return Array.isArray(data) && data.every((item) => typeof item === 'string') ? data : []
    } catch {
      return []
    }
  })

  const displayGame = useMemo(() => {
    if (selectedPly === null || selectedPly >= game.history().length) return game
    const position = cloneGame(game)
    while (position.history().length > selectedPly) position.undo()
    return position
  }, [game, selectedPly])

  const history = game.history({ verbose: true })
  const cursorPly = selectedPly ?? history.length
  const currentMove = displayGame.history({ verbose: true }).at(-1)
  const movePairs = useMemo(() => {
    const pairs: { number: number; white?: string; black?: string }[] = []
    const moves = game.history()
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] })
    }
    return pairs
  }, [game])

  const updateGame = useCallback((next: Chess) => {
    setGame(next)
    setSelectedPly(null)
    setMessage('')
  }, [])

  const preserveLineIfBranching = useCallback(() => {
    if (selectedPly === null || selectedPly >= game.history().length) return
    const previousLine = exportPgn(game)
    setVariations((current) => [previousLine, ...current.filter((line) => line !== previousLine)].slice(0, 20))
  }, [game, selectedPly])

  const loadVariation = (pgn: string) => {
    const next = new Chess()
    try {
      next.loadPgn(pgn)
      updateGame(next)
      setMessage('Variation loaded into the main board.')
    } catch {
      setMessage('This saved variation could not be loaded.')
    }
  }

  const onPuzzlePieceDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare || puzzleSolved) return false
    const next = cloneGame(puzzleGame)
    try {
      const move = next.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      const uci = move.from + move.to + (move.promotion ?? '')
      if (uci !== PUZZLES[puzzleIndex].solutionUci) {
        setPuzzleFeedback('Not the solution. Try again; look for the forcing move.')
        return false
      }
      setPuzzleGame(next)
      setPuzzleSolved(true)
      setPuzzleFeedback('Solved! ' + PUZZLES[puzzleIndex].explanation)
      return true
    } catch {
      setPuzzleFeedback('That move is not legal. Try another move.')
      return false
    }
  }, [puzzleGame, puzzleIndex, puzzleSolved])

  const selectPuzzle = (index: number) => {
    const safeIndex = (index + PUZZLES.length) % PUZZLES.length
    setPuzzleIndex(safeIndex)
    setPuzzleGame(new Chess(PUZZLES[safeIndex].fen))
    setPuzzleSolved(false)
    setPuzzleFeedback(PUZZLES[safeIndex].hint)
  }

  const chooseLesson = (index: number) => {
    setLessonIndex((index + LESSONS.length) % LESSONS.length)
    setLessonChoice(null)
    setLessonFeedback('')
  }

  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false
    if (activePanel === 'play' && computerGameEnabled && displayGame.turn() !== (humanColor === 'white' ? 'w' : 'b')) return false
    const next = cloneGame(displayGame)
    try {
      next.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      preserveLineIfBranching()
      updateGame(next)
      return true
    } catch {
      return false
    }
  }, [activePanel, computerGameEnabled, displayGame, humanColor, preserveLineIfBranching, updateGame])

  const newGame = () => {
    lastComputerMoveFen.current = ''
    updateGame(new Chess())
    setMessage('New game started.')
  }

  const undoMove = () => {
    if (selectedPly !== null && selectedPly < game.history().length) {
      if (selectedPly === 0) {
        setMessage('Already at the starting position.')
        return
      }
      setSelectedPly(selectedPly - 1)
      setMessage('Moved back one ply in the game.')
      return
    }
    const next = cloneGame(game)
    if (!next.undo()) {
      setMessage('There are no moves to undo.')
      return
    }
    updateGame(next)
    setMessage('Last move undone.')
  }

  // Browsing the move list changes the displayed position without deleting later moves.
  // Making a move from a historical position intentionally creates a new branch.
  const jumpToPly = (ply: number) => {
    setSelectedPly(ply >= game.history().length ? null : ply)
    setMessage(ply === 0 ? 'Showing the starting position.' : `Showing position after ply ${ply}.`)
  }

  const loadFen = () => {
    if (!fenInput.trim()) {
      setMessage('Paste a FEN position first.')
      return
    }
    const next = safeGameFromFen(fenInput)
    if (!next) {
      setMessage('That FEN is invalid. Check the position and try again.')
      return
    }
    updateGame(next)
    setShowFen(false)
    setFenInput('')
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
    const pgn = exportPgn(game)
    const next = [pgn, ...savedGames.filter((item) => item !== pgn)].slice(0, 30)
    setSavedGames(next)
    try {
      localStorage.setItem('chesslab-games', JSON.stringify(next))
      setMessage('Game saved in this browser.')
    } catch {
      setMessage('Browser storage is unavailable. The game could not be saved.')
    }
  }

  const deleteSavedGame = (pgn: string) => {
    const next = savedGames.filter((item) => item !== pgn)
    setSavedGames(next)
    try {
      localStorage.setItem('chesslab-games', JSON.stringify(next))
      setMessage('Saved game deleted from this browser.')
    } catch {
      setMessage('The game was removed from this session, but browser storage could not be updated.')
    }
  }

  const stockfish = useStockfish(displayGame.fen(), engineEnabled, engineDepth)
  const engineAnalysis = stockfish.analysis

  useEffect(() => {
    if (activePanel !== 'play' || !computerGameEnabled || !engineEnabled || stockfish.status !== 'ready') return
    if (selectedPly !== null || displayGame.isGameOver()) return
    const computerColor = humanColor === 'white' ? 'b' : 'w'
    if (displayGame.turn() !== computerColor) return
    if (engineAnalysis.fen !== displayGame.fen() || !engineAnalysis.pvUci) return
    if (lastComputerMoveFen.current === displayGame.fen()) return

    const uci = engineAnalysis.pvUci.trim().split(/\\s+/)[0]
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return
    const next = cloneGame(displayGame)
    try {
      const move = next.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        ...(uci[4] ? { promotion: uci[4] as 'q' | 'r' | 'b' | 'n' } : {}),
      })
      lastComputerMoveFen.current = displayGame.fen()
      updateGame(next)
      setMessage('Stockfish played ' + move.san + '.')
    } catch {
      setMessage('Stockfish returned a move that was not legal in the current position. The move was not applied.')
    }
  }, [activePanel, computerGameEnabled, displayGame, engineAnalysis.fen, engineAnalysis.pvUci, engineEnabled, humanColor, selectedPly, stockfish.status, updateGame])
  const scoreWhiteCp = engineAnalysis.scoreCp === null
    ? null
    : displayGame.turn() === 'w' ? engineAnalysis.scoreCp : -engineAnalysis.scoreCp
  const mateWhite = engineAnalysis.mate === null
    ? null
    : displayGame.turn() === 'w' ? engineAnalysis.mate : -engineAnalysis.mate
  const evaluationText = mateWhite !== null
    ? (mateWhite >= 0 ? '+' : '-') + 'M' + Math.abs(mateWhite)
    : scoreWhiteCp === null
      ? '—'
      : (scoreWhiteCp >= 0 ? '+' : '') + (scoreWhiteCp / 100).toFixed(2)
  const evaluationPercent = scoreWhiteCp === null
    ? 50
    : Math.max(6, Math.min(94, 50 + scoreWhiteCp / 100 * 8))
  const pvSan = engineAnalysis.pvUci ? pvToSan(displayGame.fen(), engineAnalysis.pvUci) : ''
  const engineStatusLabel = stockfish.status === 'ready'
    ? 'STOCKFISH 19'
    : stockfish.status === 'loading'
      ? 'LOADING'
      : stockfish.status === 'error'
        ? 'ENGINE ERROR'
        : 'ENGINE OFF'
  const engineStatusMessage = stockfish.status === 'ready'
    ? 'Engine ready · depth ' + (engineAnalysis.depth || engineDepth)
    : stockfish.status === 'loading'
      ? 'Starting the full Stockfish engine. The first load can take a while because the engine files are large.'
      : stockfish.status === 'error'
        ? 'Stockfish failed to start. Check that the generated engine files are available, then refresh and try again.'
        : 'No score is shown until you start Stockfish. This button loads the full-strength single-threaded engine, not a lite build.'
  const enginePvMessage = stockfish.status === 'ready'
    ? (pvSan ? 'Depth ' + engineAnalysis.depth + ' · ' + pvSan : 'Waiting for the analysis line...')
    : stockfish.status === 'loading'
      ? 'Engine is starting...'
      : stockfish.status === 'error'
        ? 'The engine could not start.'
        : 'Start Stockfish to calculate a real best line.'

  const playBestMove = () => {
    if (stockfish.status !== 'ready' || engineAnalysis.fen !== displayGame.fen() || !engineAnalysis.pvUci) {
      setMessage('Wait for Stockfish to finish analysing this exact position.')
      return
    }
    const uci = engineAnalysis.pvUci.trim().split(/\\s+/)[0]
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
      setMessage('Stockfish has not returned a usable best move yet.')
      return
    }
    const next = cloneGame(displayGame)
    try {
      const move = next.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        ...(uci[4] ? { promotion: uci[4] as 'q' | 'r' | 'b' | 'n' } : {}),
      })
      preserveLineIfBranching()
      updateGame(next)
      setMessage('Played Stockfish’s top move: ' + move.san + '.')
    } catch {
      setMessage('The engine move was not legal in the displayed position, so it was not applied.')
    }
  }

  const openingName = identifyOpening(displayGame)

  const status = displayGame.isCheckmate()
    ? `Checkmate — ${displayGame.turn() === 'w' ? 'Black' : 'White'} wins`
    : displayGame.isDraw()
      ? 'Draw — the game is over'
      : displayGame.isCheck()
        ? `${displayGame.turn() === 'w' ? 'White' : 'Black'} to move · Check`
        : `${displayGame.turn() === 'w' ? 'White' : 'Black'} to move`

  const board = displayGame.board()
  const kingSquare = board.flatMap((rank, row) =>
    rank.map((piece, column) => piece?.type === 'k' && piece.color === displayGame.turn()
      ? `${FILES[column]}${8 - row}`
      : ''),
  ).find((square) => square.length > 0)

  const squareStyles: Record<string, CSSProperties> = {}
  if (showLastMove && currentMove) {
    squareStyles[currentMove.from] = { background: 'rgba(246, 246, 105, 0.42)' }
    squareStyles[currentMove.to] = { background: 'rgba(246, 246, 105, 0.58)' }
  }
  if (displayGame.isCheck() && kingSquare) {
    squareStyles[kingSquare] = { background: 'radial-gradient(circle, rgba(255, 90, 90, .88) 0%, rgba(255, 90, 90, .55) 38%, transparent 72%)' }
  }

  const puzzleBoardOptions: ChessboardOptions = {
    position: puzzleGame.fen(),
    boardOrientation: 'white',
    allowDragging: !puzzleSolved,
    darkSquareStyle: { backgroundColor: '#779952' },
    lightSquareStyle: { backgroundColor: '#ebecd0' },
    onPieceDrop: onPuzzlePieceDrop,
  }

  const boardOptions: ChessboardOptions = {
    position: displayGame.fen(),
    boardOrientation: orientation,
    allowDragging: !displayGame.isGameOver(),
    squareStyles,
    darkSquareStyle: boardTheme === 'green'
      ? { backgroundColor: '#779952' }
      : boardTheme === 'blue'
        ? { backgroundColor: '#6f95b5' }
        : { backgroundColor: '#b58863' },
    lightSquareStyle: boardTheme === 'green'
      ? { backgroundColor: '#ebecd0' }
      : boardTheme === 'blue'
        ? { backgroundColor: '#e4edf5' }
        : { backgroundColor: '#f0d9b5' },
    onPieceDrop,
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActivePanel('analysis') }}>
          <span className="brand-mark">♞</span>
          <span>Chess<span className="brand-light">Lab</span><small>YOUR CHESS WORKSPACE</small></span>
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
          <div className={stockfish.status === 'ready' ? 'engine-card engine-card-active' : 'engine-card'}><span className={stockfish.status === 'ready' ? 'engine-orb engine-orb-active' : 'engine-orb'} /><div><strong>Stockfish 19</strong><small>{stockfish.status === 'ready' ? 'Full engine ready' : stockfish.status === 'loading' ? 'Loading full engine' : stockfish.status === 'error' ? 'Failed to start' : 'Not started'}</small></div><span className="engine-status">{stockfish.status === 'ready' ? 'ON' : stockfish.status === 'loading' ? 'LOAD' : stockfish.status === 'error' ? 'ERR' : 'OFF'}</span></div>
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
          <div className="heading-actions"><button className="button secondary" onClick={() => { setFenInput(displayGame.fen()); setShowFen(true) }}>Import FEN</button><button className="button primary" onClick={newGame}>＋ New game</button></div>
        </section>

        {activePanel === 'play' && (
          <section className="panel play-setup">
            <div className="panel-heading"><div><span className="panel-icon">♟</span><strong>Play against Stockfish 19</strong></div><span className="move-count">SINGLE-PLAYER</span></div>
            <div className="play-setup-body">
              <div className="play-choice"><label htmlFor="human-colour">Your colour</label><select id="human-colour" value={humanColor} onChange={(event) => { setHumanColor(event.target.value as 'white' | 'black'); lastComputerMoveFen.current = '' }}><option value="white">White — move first</option><option value="black">Black — Stockfish moves first</option></select></div>
              <button className="button primary" onClick={() => { lastComputerMoveFen.current = ''; setComputerGameEnabled(true); setEngineEnabled(true); updateGame(new Chess()); setMessage('Computer game started. Stockfish is loading; its first move will be made when analysis is ready.') }}>Start / restart game</button>
              {computerGameEnabled && <button className="button secondary" onClick={() => { setComputerGameEnabled(false); setMessage('Computer game paused. The board is now in analysis mode.') }}>Pause computer game</button>}
              <p>The full Stockfish engine is required. Its first browser load is about 94 MB and may take time. No multiplayer is included.</p>
              {computerGameEnabled && stockfish.status !== 'ready' && <p role="status">Engine status: {stockfish.status === 'loading' ? 'loading Stockfish 19…' : stockfish.status === 'error' ? 'failed to start; stop and retry the engine' : 'waiting to start'}.</p>}
            </div>
          </section>
        )}

        {activePanel === 'puzzles' && (
          <section className="feature-page puzzle-page">
            <div className="feature-page-copy"><div className="eyebrow">TACTICS TRAINING</div><h2>{PUZZLES[puzzleIndex].title}</h2><p>Find the forcing move. Make your move directly on the board; incorrect moves are not committed.</p><div className="puzzle-progress">Puzzle {puzzleIndex + 1} of {PUZZLES.length} · {puzzleSolved ? 'Solved' : 'Unsolved'}</div><p className="puzzle-hint">{puzzleSolved ? PUZZLES[puzzleIndex].explanation : PUZZLES[puzzleIndex].hint}</p><div className={puzzleSolved ? 'feature-feedback success' : 'feature-feedback'} role="status">{puzzleFeedback}</div><div className="feature-actions"><button className="button secondary" onClick={() => setPuzzleFeedback(PUZZLES[puzzleIndex].hint)}>Show hint</button><button className="button secondary" onClick={() => selectPuzzle(puzzleIndex + 1)}>Next puzzle</button><button className="button primary" onClick={() => selectPuzzle(puzzleIndex)}>Retry puzzle</button></div></div>
            <div className="feature-board"><Chessboard options={puzzleBoardOptions} /></div>
          </section>
        )}

        {activePanel === 'learn' && (
          <section className="feature-page learn-page">
            <aside className="lesson-list"><div className="eyebrow">CHESS SCHOOL</div><h2>Learning path</h2>{LESSONS.map((lesson, index) => <button key={lesson.title} className={lessonIndex === index ? 'lesson-link selected' : 'lesson-link'} onClick={() => chooseLesson(index)}><span>{completedLessons.includes(index) ? '✓' : index + 1}</span><span>{lesson.title}</span></button>)}</aside>
            <article className="lesson-content"><div className="eyebrow">LESSON {lessonIndex + 1} OF {LESSONS.length}</div><h2>{LESSONS[lessonIndex].title}</h2><p className="lesson-objective">Goal: {LESSONS[lessonIndex].objective}</p><p>{LESSONS[lessonIndex].explanation}</p><div className="lesson-example"><strong>Example</strong><p>{LESSONS[lessonIndex].example}</p></div><div className="lesson-quiz"><h3>Quick check</h3><p>{LESSONS[lessonIndex].question}</p>{LESSONS[lessonIndex].answers.map((answer, index) => <button key={answer} className={lessonChoice === index ? 'lesson-answer chosen' : 'lesson-answer'} onClick={() => { setLessonChoice(index); setLessonFeedback(index === LESSONS[lessonIndex].correct ? 'Correct. You understood the key idea.' : 'Not quite. Review the explanation and try again.') }}>{answer}</button>)}{lessonFeedback && <p className={lessonChoice === LESSONS[lessonIndex].correct ? 'feature-feedback success' : 'feature-feedback'} role="status">{lessonFeedback}</p>}</div><div className="feature-actions"><button className="button secondary" disabled={lessonIndex === 0} onClick={() => chooseLesson(lessonIndex - 1)}>Previous lesson</button><button className="button primary" disabled={lessonChoice !== LESSONS[lessonIndex].correct} onClick={() => { setCompletedLessons((done) => done.includes(lessonIndex) ? done : [...done, lessonIndex]); if (lessonIndex < LESSONS.length - 1) chooseLesson(lessonIndex + 1) }}>Mark complete / continue</button></div><p className="lesson-progress">{completedLessons.length} of {LESSONS.length} lessons completed in this session.</p></article>
          </section>
        )}

        {(activePanel === 'analysis' || activePanel === 'play') && (
        <div className="workspace-grid">
          <section className="board-column">
            <div className="board-card">
              <div className="board-card-head"><div className="opponent"><div className="piece-avatar black-avatar">♟</div><div><strong>{activePanel === 'play' && computerGameEnabled ? 'Stockfish 19' : 'Board position'}</strong><small>{activePanel === 'play' && computerGameEnabled ? (humanColor === 'white' ? 'You are White' : 'You are Black') : 'Position study'}</small></div></div><span className="rating-tag">{activePanel === 'play' && computerGameEnabled ? 'VS COMPUTER' : 'ANALYSIS'}</span></div>
              <div className="board-wrap">
                <div className="player-label top-player"><span className="player-chip dark-chip">♟</span><span>Black</span><span className="player-meta">Board orientation: {orientation}</span></div>
                <div className="chessboard-container"><Chessboard options={boardOptions} /></div>
                <div className="player-label bottom-player"><span className="player-chip light-chip">♙</span><span>White</span><span className="player-meta">{status}</span></div>
              </div>
              <div className="board-toolbar">
                <button title="Flip board" onClick={() => setOrientation((value) => value === 'white' ? 'black' : 'white')}>↻ <span>Flip board</span></button>
                <button title="Undo move" onClick={undoMove}>↶ <span>Undo</span></button>
                <button title="Reset game" onClick={newGame}>⟲ <span>Reset</span></button>
                <span className="toolbar-spacer" />
                <button title="Import PGN" onClick={() => { setPgnInput(''); setShowPgn(true) }}>⇧ <span>Import PGN</span></button>
                <button title="Export PGN" onClick={() => void copyText(exportPgn(game), 'PGN')}>⇩ <span>Export PGN</span></button>
              </div>
            </div>
            <div className="under-board">
              <div className="under-title"><span className="mini-icon">⌘</span><div><strong>Position tools</strong><small>Import, export and save your work</small></div></div>
              <div className="tool-buttons"><button onClick={() => { setFenInput(displayGame.fen()); setShowFen(true) }}>Copy / load FEN</button><button onClick={saveGame}>Save game</button><button onClick={() => setShowLastMove((value) => !value)}>{showLastMove ? 'Hide' : 'Show'} last move</button></div>
            </div>
            {message && <div className="feedback" role="status"><span>ⓘ</span>{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
          </section>

          <aside className="analysis-column">
            <section className="panel eval-panel">
              <div className="panel-heading"><div><span className="panel-icon">◒</span><strong>Evaluation</strong></div><span className={stockfish.status === 'ready' ? 'engine-on-tag' : 'waiting-tag'}>{engineStatusLabel}</span></div>
              <div className="eval-body"><div className="eval-bar" aria-label="Stockfish evaluation from White's perspective"><div className="eval-neutral" style={{ height: evaluationPercent + '%' }} /></div><div className="eval-content"><div className="eval-score">{evaluationText} <small>{mateWhite !== null ? 'MATE' : 'WHITE POV'}</small></div><strong>{stockfish.status === 'ready' ? 'Live Stockfish evaluation' : stockfish.status === 'loading' ? 'Starting Stockfish 19' : stockfish.status === 'error' ? 'Engine unavailable' : 'Engine is stopped'}</strong><p>{engineStatusMessage}</p></div></div>
              <div className="engine-controls"><label htmlFor="depth-range">Search depth <span>{stockfish.status === 'ready' ? engineDepth + ' ply' : 'Start engine to enable'}</span></label><input id="depth-range" type="range" min="1" max="40" value={engineDepth} onChange={(event) => setEngineDepth(Number(event.target.value))} disabled={!engineEnabled || stockfish.status !== 'ready'} /><div className="depth-scale"><span>1</span><span>{engineDepth}</span><span>40</span></div><div className="engine-actions">{!engineEnabled ? <button className="button primary engine-load-button" onClick={() => setEngineEnabled(true)}>Load full Stockfish 19 (~94 MB)</button> : <button className="button secondary engine-load-button" onClick={() => setEngineEnabled(false)}>Stop engine</button>}{activePanel !== 'play' && <button className="button secondary engine-load-button" disabled={stockfish.status !== 'ready' || engineAnalysis.fen !== displayGame.fen() || !engineAnalysis.pvUci} onClick={playBestMove}>Play top move</button>}{activePanel !== 'play' && pvSan && <button className="button secondary engine-load-button" onClick={() => void copyText(pvSan, 'Principal variation')}>Copy principal variation</button>}</div></div>
            </section>

            <section className="panel variations-panel">
              <div className="panel-heading"><div><span className="panel-icon">⑂</span><strong>Variations</strong></div><span className="move-count">{variations.length} SAVED</span></div>
              {variations.length === 0 ? <div className="variation-empty">Select an earlier move, then make a different move to preserve the original line here.</div> : variations.map((pgn, index) => <div className="variation-item" key={pgn}><div><strong>Variation {variations.length - index}</strong><small>{pgn.replace(/\\s+/g, ' ').slice(0, 120)}</small></div><div className="variation-actions"><button className="button secondary small" onClick={() => loadVariation(pgn)}>Load</button><button className="button secondary small" onClick={() => setVariations((current) => current.filter((line) => line !== pgn))}>Delete</button></div></div>)}
            </section>

            <section className="panel moves-panel">
              <div className="panel-heading"><div><span className="panel-icon">☷</span><strong>Move history</strong></div><span className="move-count">{history.length} {history.length === 1 ? 'MOVE' : 'MOVES'}</span></div>
              {movePairs.length === 0 ? <div className="empty-moves"><div className="empty-board">♞</div><strong>Your game starts here</strong><p>Make a move on the board. Every legal move will appear here.</p></div> : <div className="move-table"><div className="move-header"><span>#</span><span>WHITE</span><span>BLACK</span></div>{movePairs.map((move) => <div className={cursorPly >= move.number * 2 - 1 && cursorPly <= move.number * 2 ? 'move-row active' : 'move-row'} key={move.number}><span className="move-number">{move.number}.</span><button title={`Jump to ${move.number}. ${move.white}`} onClick={() => jumpToPly((move.number - 1) * 2 + 1)}>{move.white}</button><button title={move.black ? `Jump to ${move.number}... ${move.black}` : 'Black has not moved'} disabled={!move.black} onClick={() => jumpToPly(move.number * 2)}>{move.black ?? ''}</button></div>)}</div>}
              <div className="move-footer"><span>{displayGame.isGameOver() ? 'Game finished' : selectedPly !== null ? 'Browsing move ' + selectedPly : 'Local board · legal moves'}</span><div className="move-nav"><button title="First position" disabled={cursorPly === 0} onClick={() => jumpToPly(0)}>|‹</button><button title="Previous ply" disabled={cursorPly === 0} onClick={() => jumpToPly(cursorPly - 1)}>‹</button><button title="Next ply" disabled={cursorPly >= history.length} onClick={() => jumpToPly(cursorPly + 1)}>›</button><button title="Latest position" disabled={selectedPly === null} onClick={() => jumpToPly(history.length)}>›|</button><button onClick={() => void copyText(exportPgn(game), 'PGN')}>Copy PGN ↗</button></div></div>
            </section>

            <section className="panel insights-panel"><div className="panel-heading"><div><span className="panel-icon">✧</span><strong>Position insights</strong></div></div><div className="insight-row"><span className="insight-symbol">♟</span><div><strong>Board state</strong><p>{displayGame.isCheckmate() ? 'Checkmate position' : displayGame.isCheck() ? 'The side to move is in check' : displayGame.isDraw() ? 'Draw position' : 'Legal position · ready to study'}</p></div></div><div className="insight-row"><span className="insight-symbol">⌂</span><div><strong>Opening reference</strong><p>{openingName}</p></div></div><div className="insight-row"><span className="insight-symbol">↗</span><div><strong>Best move and variations</strong><p>{enginePvMessage}</p></div></div></section>
          </aside>
        </div>
        )}

        {activePanel === 'library' && <section className="saved-library"><div className="panel-heading"><div><span className="panel-icon">▣</span><strong>Saved games on this device</strong></div><span className="move-count">{savedGames.length} SAVED</span></div><div className="library-controls"><input type="search" aria-label="Search saved games" placeholder="Search saved PGNs…" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} /></div>{savedGames.length === 0 ? <div className="library-empty"><strong>No saved games yet</strong><p>Open the analysis board, play a game, and select “Save game” to keep it in this browser.</p><button className="button primary" onClick={() => setActivePanel('analysis')}>Open analysis board</button></div> : savedGames.filter((pgn) => pgn.toLowerCase().includes(libraryQuery.toLowerCase())).length === 0 ? <div className="library-empty"><strong>No matching games</strong><p>Try a different search term.</p></div> : savedGames.filter((pgn) => pgn.toLowerCase().includes(libraryQuery.toLowerCase())).map((pgn) => <div className="saved-game" key={pgn}><div><strong>Saved game {savedGames.indexOf(pgn) + 1}</strong><small>{pgn.slice(0, 150).replace(/\s+/g, ' ') || 'Position only'}</small></div><div className="saved-game-actions"><button className="button secondary small" onClick={() => { setPgnInput(pgn); setShowPgn(true); setActivePanel('analysis') }}>Open PGN</button><button className="button secondary small" onClick={() => deleteSavedGame(pgn)}>Delete</button></div></div>)}</section>}
        <footer className="app-footer"><span>♞ ChessLab</span><span>Local-first chess study · No multiplayer</span><span>Built for focused analysis</span></footer>
      </main>

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">PREFERENCES</div><h2 id="settings-title">Board settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close">×</button></div><label className="form-label">Board colour</label><div className="theme-options">{(['green', 'blue', 'brown'] as Theme[]).map((theme) => <button key={theme} className={boardTheme === theme ? 'theme-option selected' : 'theme-option'} onClick={() => setBoardTheme(theme)}><span className={`theme-swatch ${theme}`} />{theme[0]?.toUpperCase() + theme.slice(1)}{boardTheme === theme && ' ✓'}</button>)}</div><label className="check-setting"><input type="checkbox" checked={showLastMove} onChange={(event) => setShowLastMove(event.target.checked)} /> Highlight the most recent move</label><p className="modal-hint">Preferences apply to this board in the current session.</p></section></div>}

      {showFen && <div className="modal-backdrop" onClick={() => setShowFen(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="fen-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">POSITION EXCHANGE</div><h2 id="fen-title">FEN position</h2></div><button className="icon-button" onClick={() => setShowFen(false)} aria-label="Close">×</button></div><p className="modal-description">Load a position by pasting its FEN string, or copy the current position.</p><textarea value={fenInput} onChange={(event) => setFenInput(event.target.value)} rows={3} spellCheck={false} aria-label="FEN string" /><div className="modal-actions"><button className="button secondary" onClick={() => void copyText(displayGame.fen(), 'FEN')}>Copy current FEN</button><button className="button primary" onClick={loadFen}>Load position</button></div></section></div>}

      {showPgn && <div className="modal-backdrop" onClick={() => setShowPgn(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="pgn-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">GAME EXCHANGE</div><h2 id="pgn-title">Import PGN</h2></div><button className="icon-button" onClick={() => setShowPgn(false)} aria-label="Close">×</button></div><p className="modal-description">Paste a PGN game. Loading it will replace the moves on this board.</p><textarea value={pgnInput} onChange={(event) => setPgnInput(event.target.value)} rows={7} placeholder={'[Event "Casual Game"]\n\n1. e4 e5 2. Nf3 Nc6 *'} spellCheck={false} aria-label="PGN game" /><div className="modal-actions"><button className="button secondary" onClick={() => setShowPgn(false)}>Cancel</button><button className="button primary" onClick={loadPgn}>Load game</button></div></section></div>}
    </div>
  )
}

export default App
