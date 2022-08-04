import { Point } from '../../services/PictureService'

export type Pointer = {
  id: number
  type: string
  clientX: number
  clientY: number
}

export function toPointer(event: PointerEvent): Pointer {
  const { pointerId: id, pointerType: type, clientX, clientY } = event
  return { id, type, clientX, clientY }
}

export function pushPoint(points: Point[] | undefined, point: Point) {
  console.log(`before pushPoint > ${JSON.stringify(points)}`)
  if (!points) return

  // ペンが止まってるときに無駄に追加しないようにしてる
  if (points.length > 0) {
    const { x, y } = point
    const { x: lastX, y: lastY } = points[points.length - 1]
    if (lastX === x && lastY === y) {
      return
    }
  }

  // やりたいことはここで、pointsにpointを追加する
  points.push(point)
  console.log(`after pushPoint > ${JSON.stringify(points)}`)
}
