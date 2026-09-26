// Sample detections used by the Walnut AI illustrations. Not model output.

export type Grade = 'A' | 'B' | 'Risk'

export interface WalnutSample {
  id: number
  x: number
  y: number
  r: number
  rot: number
  grade: Grade
  conf: number
}

export const walnutSamples: WalnutSample[] = [
  { id: 1, x: 70, y: 80, r: 34, rot: 10, grade: 'A', conf: 0.94 },
  { id: 2, x: 190, y: 70, r: 32, rot: -25, grade: 'A', conf: 0.91 },
  { id: 3, x: 310, y: 95, r: 35, rot: 40, grade: 'B', conf: 0.78 },
  { id: 4, x: 95, y: 200, r: 33, rot: -8, grade: 'A', conf: 0.89 },
  { id: 5, x: 215, y: 190, r: 36, rot: 65, grade: 'Risk', conf: 0.83 },
  { id: 6, x: 330, y: 215, r: 31, rot: 20, grade: 'A', conf: 0.92 },
  { id: 7, x: 140, y: 300, r: 32, rot: -40, grade: 'B', conf: 0.74 },
  { id: 8, x: 270, y: 305, r: 34, rot: 5, grade: 'A', conf: 0.9 },
]
