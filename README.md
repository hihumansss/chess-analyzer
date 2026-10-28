# ChessLab

ChessLab is a local-first chess study workspace built with React, TypeScript, Vite, `chess.js`, `react-chessboard`, and Stockfish 19.

## Implemented features

- Legal chess movement, check/checkmate/draw detection, move history, undo, board flipping, and last-move/check highlighting.
- Non-destructive move-history browsing. Selecting a move changes the displayed position without deleting later moves; making a move from an earlier position creates a new line.
- FEN import and copy, PGN import/export, and browser-local saved games.
- Board colour themes and responsive layout.
- Real Stockfish 19 single-threaded WebAssembly analysis, evaluation from White's perspective, principal variation, and configurable search depth.
- Single-player games against Stockfish 19, with a choice of playing White or Black. Online human-vs-human multiplayer is intentionally excluded.
- Interactive mate-in-one puzzle practice with legal-move validation, hints, retry, and solution explanations.
- Interactive beginner/intermediate lessons with knowledge checks and session progress.
- Automated chess rules smoke tests for legal moves, FEN/PGN exchange, castling, en passant, promotion, and included puzzle solutions.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

The `predev` script prepares the matching Stockfish JavaScript, WebAssembly, and GPL license files in `public/stockfish/`. Open the local URL printed by Vite.

## Quality checks

```bash
npm run build
npm test
npm run lint
```

The production build checks TypeScript and bundles the application. The test command exercises core chess rules and included puzzle solutions. Lint checks source code. These checks do not replace testing the app in an actual browser.

## Known limits / next milestones

ChessLab is not a finished replacement for every feature on Chess.com and Lichess yet. The current implementation has a small puzzle set and a small lesson set. Important next milestones include:

1. A variation tree with add, select, rename, and delete variation support.
2. Game review with engine-based move classifications, candidate lines, and explanations.
3. A larger, sourced puzzle library with rating progression and persistent progress.
4. Opening explorer and opening statistics.
5. Persistent lesson progress and more complete interactive courses.
6. Browser-level end-to-end tests for board interaction, Stockfish startup, and computer games.
7. Improved saved-game management, search, filtering, and metadata.

ChessLab will not add online human-vs-human play, matchmaking, rooms, or friend challenges.

## Stockfish engine and licence

The full Stockfish 19 single-threaded browser build is approximately 94 MB across its JavaScript and WebAssembly files. The first load can take a while and uses more memory than a lite engine. Single-threaded mode avoids requiring cross-origin-isolation headers.

The Stockfish JavaScript/WebAssembly package is GPL-3.0 licensed. The copy script places the engine's `Copying.txt` notice next to the generated engine files. Upstream projects: https://github.com/nmrugg/stockfish.js and https://github.com/official-stockfish/Stockfish.
