// TODO: なんのもの？名前からするとパスの境界
// TODO: 確か、めっちゃレンダリングしてしまうとだるいから部分的にcanvasをレンダリングするようにするやつかも

import { Path } from '../../services/PictureService'

export class PathWithBoundary {
  private readonly originalMinX: number
  private readonly originalMaxX: number
  private readonly originalMinY: number
  private readonly originalMaxY: number
  private path: Path

  constructor(path: Path) {
    this.path = path
    let minX = Number.NEGATIVE_INFINITY
    let maxX = Number.POSITIVE_INFINITY
    let minY = Number.NEGATIVE_INFINITY
    let maxY = Number.POSITIVE_INFINITY

    const w2 = path.width / 2 // TODO: なにこれ
    path.points.forEach(({ x, y }) => {
      minX = Math.min(minX, x - w2)
      maxX = Math.max(maxX, x + w2)
      minY = Math.min(minY, y - w2)
      maxY = Math.max(maxY, y + w2)
    })
    this.originalMinX = minX
    this.originalMaxX = maxX
    this.originalMinY = minY
    this.originalMaxY = maxY
  }

  get minX(): number {
    return this.originalMinX + this.path.offsetX
  }
  get maxX(): number {
    return this.originalMaxX + this.path.offsetX
  }
  get minY(): number {
    return this.originalMinY + this.path.offsetY
  }
  get maxY(): number {
    return this.originalMaxY + this.path.offsetY
  }
}
