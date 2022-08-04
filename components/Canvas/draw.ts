import { Path } from '../../services/PictureService'

export function drawPath(
  ctx: CanvasRenderingContext2D,
  { width, color: originalColor, points, isBezier, offsetX, offsetY }: Path,
  scrollLeft: number,
  scrollTop: number,
  dpr: number,
  scale: number,
  dx: number,
  dy: number,
  isDarkMode: boolean,
) {
  // pathに軌跡がなければ何もかかない
  if (points.length === 0) return

  // TODO: impl
  // const color = isDarkMode ? transformColorForDarkMode(originalColor) : originalColor

  // TODO: なんでこれでいい感じになる？
  ctx.lineWidth = width * scale * dpr
  ctx.strokeStyle = originalColor
  let first = true
  ctx.beginPath()

  // 一点しか実装されてないとき、丸を書く
  if (points.length === 1) {
    const { x, y } = points[0]
    // TODO: なにを実装してるの
    const realX = ((x + offsetX + dx) * scale - scrollLeft) * dpr
    const realY = ((y + offsetY + dy) * scale - scrollTop) * dpr
    ctx.fillStyle = originalColor
    ctx.arc(realX, realY, (width * scale * dpr) / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  // ベジェ曲線のとき
  if (isBezier) {
    let args: number[] = []
    for (const { x, y } of points) {
      const realX = ((x + offsetX + dx) * scale - scrollLeft) * dpr
      const realY = ((y + offsetY + dy) * scale - scrollTop) * dpr
      if (first) {
        ctx.moveTo(realX, realY)
        first = false
      } else {
        args.push(realX, realY)
        if (args.length === 6) {
          ctx.bezierCurveTo(
            ...(args as [number, number, number, number, number, number]),
          )
          args = []
        }
      }
    }
  } else {
    for (const { x, y } of points) {
      const realX = (x * scale - scrollLeft) * dpr
      const realY = (y * scale - scrollTop) * dpr
      if (first) {
        ctx.moveTo(realX, realY)
        first = false
      } else {
        ctx.lineTo(realX, realY)
      }
    }
    ctx.stroke() // TODO: なんだっけ
  }
}
