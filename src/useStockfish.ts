import { useEffect, useRef, useState } from 'react'

export type StockfishStatus = 'off' | 'loading' | 'ready' | 'error'

export interface StockfishAnalysis {
  depth: number
  scoreCp: number | null
  mate: number | null
  pvUci: string
}

const EMPTY_ANALYSIS: StockfishAnalysis = {
  depth: 0,
  scoreCp: null,
  mate: null,
  pvUci: '',
}

export function useStockfish(fen: string, enabled: boolean, depth: number) {
  const workerRef = useRef<Worker | null>(null)
  const readyRef = useRef(false)
  const [status, setStatus] = useState<StockfishStatus>('off')
  const [analysis, setAnalysis] = useState<StockfishAnalysis>(EMPTY_ANALYSIS)

  useEffect(() => {
    if (!enabled) {
      workerRef.current?.terminate()
      workerRef.current = null
      readyRef.current = false
      setStatus('off')
      setAnalysis(EMPTY_ANALYSIS)
      return
    }

    setStatus('loading')
    setAnalysis(EMPTY_ANALYSIS)
    readyRef.current = false

    let worker: Worker
    try {
      worker = new Worker('/stockfish/stockfish-19-single.js')
    } catch {
      setStatus('error')
      return
    }

    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const line = typeof event.data === 'string' ? event.data : ''
      if (line === 'uciok') {
        worker.postMessage('isready')
        return
      }
      if (line === 'readyok') {
        readyRef.current = true
        setStatus('ready')
        return
      }
      if (!line.startsWith('info ')) return

      const depthMatch = /\bdepth\s+(\d+)/.exec(line)
      const scoreMatch = /\bscore\s+(cp|mate)\s+(-?\d+)/.exec(line)
      const pvMatch = /\bpv\s+(.+)$/.exec(line)
      if (!depthMatch || !scoreMatch || !pvMatch) return

      const nextDepth = Number(depthMatch[1])
      const nextScore = Number(scoreMatch[2])
      setAnalysis((previous) => {
        if (nextDepth < previous.depth) return previous
        return {
          depth: nextDepth,
          scoreCp: scoreMatch[1] === 'cp' ? nextScore : null,
          mate: scoreMatch[1] === 'mate' ? nextScore : null,
          pvUci: pvMatch[1].trim(),
        }
      })
    }
    worker.onerror = () => setStatus('error')
    worker.postMessage('uci')

    return () => {
      if (workerRef.current === worker) workerRef.current = null
      readyRef.current = false
      worker.terminate()
    }
  }, [enabled])

  useEffect(() => {
    const worker = workerRef.current
    if (!enabled || status !== 'ready' || !readyRef.current || !worker) return

    setAnalysis(EMPTY_ANALYSIS)
    worker.postMessage('stop')
    worker.postMessage('ucinewgame')
    worker.postMessage('position fen ' + fen)
    worker.postMessage('go depth ' + depth)
  }, [depth, enabled, fen, status])

  return { status, analysis }
}
