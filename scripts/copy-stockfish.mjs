import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const packageDirectory = resolve(root, 'node_modules/stockfish')
const outputDirectory = resolve(root, 'public/stockfish')
const engineFiles = [
  ['bin/stockfish-19-single.js', 'stockfish-19-single.js'],
  ['bin/stockfish-19-single.wasm', 'stockfish-19-single.wasm'],
  ['Copying.txt', 'Copying.txt'],
]

await mkdir(outputDirectory, { recursive: true })
for (const [source, destination] of engineFiles) {
  await copyFile(resolve(packageDirectory, source), resolve(outputDirectory, destination))
}
console.log('Prepared full Stockfish 19 single-threaded engine and GPL notice in public/stockfish.')
