# ChessLab

ChessLab is a local-first chess study and analysis workspace built with React, TypeScript, Vite, chess.js, and react-chessboard.

## Current milestone

- Legal chess moves and game-state checks through chess.js.
- Move history, undo, reset, board flip, and last-move/check highlighting.
- FEN position import/export and PGN game import/export.
- Save PGNs to this browser using local storage.
- Three board colour themes and a responsive analysis layout.
- Real Stockfish 19 full, single-threaded WebAssembly engine for evaluation and principal variations. It is loaded only after you press the engine button.
- Engine evaluation is displayed from White's perspective. No scores are fabricated when the engine is off or unavailable.

**Engine size:** The full Stockfish 19 single-threaded browser build is approximately 94 MB for its JavaScript and WebAssembly files. The first load can take a while and it uses more memory than a lite engine. This project deliberately uses the full build, not the lite build. Single-threaded mode avoids requiring cross-origin-isolation headers.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

The `predev` script prepares the matching Stockfish JavaScript, WebAssembly, and GPL license files in `public/stockfish/`. Open the local URL printed by Vite. For a production build:

```bash
npm run build
npm run lint
```

## Planned milestones

1. Add variation trees, move navigation, and analysis annotations.
2. Implement computer play against the integrated engine, with a selectable colour and thinking depth.
3. Build actual puzzle practice, lessons, opening exploration, and game-library search.
4. Add automated tests for chess rules, FEN/PGN exchange, saved-game persistence, and engine behavior.
5. Expand game review with inaccuracies, mistakes, blunders, and engine-verified explanations.

ChessLab deliberately has no online multiplayer or human-vs-human online play. In-progress sections must not masquerade as implemented features, and analysis must never display invented engine scores.

## Third-party engine and licence

The Stockfish JavaScript/WebAssembly package is GPL-3.0 licensed. The distribution copies the engine's `Copying.txt` licence notice next to the generated engine files. The upstream Stockfish.js source is available at https://github.com/nmrugg/stockfish.js and Stockfish source at https://github.com/official-stockfish/Stockfish.
