import { Path } from '../../services/PictureService'

export type Operation =
  | Readonly<{
      type: 'add'
      paths: Path[]
    }>
  | Readonly<{
      type: 'remove'
      paths: Path[]
    }>
  | Readonly<{
      type: 'move'
      paths: Path[]
      dx: number
      dy: number
    }>
  | Readonly<{
      type: 'paste'
      paths: Path[]
      offsetX: number
      offsetY: number
    }>
