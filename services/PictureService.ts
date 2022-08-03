export type Point = { x: number; y: number }
export type Path = {
  color: string
  width: number
  points: Point[]
  id: string
  isBezier: boolean
  timestamp?: Date
  offsetX: number // TODO: なにこれ
  offsetY: number // TODO: なにこれ
}
