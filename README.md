# ChessLab

ChessLab is a local-first chess study and analysis workspace built with React, TypeScript, Vite, chess.js, and react-chessboard.

## Current milestone

- Legal chess moves and game-state checks through chess.js.
- Move history, undo, reset, and board flip.
- FEN position import/export and PGN game import/export.
- Save PGNs to this browser using local storage.
- Three board colour themes, recent-move highlighting, and a responsive analysis layout.
- Clearly shows that engine analysis is unavailable until a real Stockfish worker is connected.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Run the production build and lint checks with:

```bash
npm run build
npm run lint
```

## Planned milestones

1. Integrate a genuine Stockfish Web Worker with evaluation, principal variation, stop/restart, and depth controls.
2. Add move navigation, variation trees, and analysis annotations.
3. Implement computer play using the integrated engine.
4. Build real puzzle practice, lessons, opening exploration, and game-library search.
5. Add automated tests for chess rules, FEN/PGN exchange, saved-game persistence, and engine behavior.

ChessLab deliberately has no online multiplayer or human-vs-human online play. In-progress sections must not masquerade as implemented features, and analysis must never display invented engine scores.
