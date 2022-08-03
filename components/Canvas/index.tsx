import React from 'react'
import { PathWithBoundary } from './path_boundary'
import { Path } from '../../services/PictureService'

export class Canvas extends React.Component<{}, {}> {
  private canvasElement: HTMLCanvasElement | null = null // canvas
  private parentElement: HTMLDivElement | null = null // 親
  private renderingContext: CanvasRenderingContext2D | null = null // canvasElementのコンテキスト
  private dpr = 1.0 // devicePixelRatio

  private offsetLeft = 0 // TODO: なにこれ
  private offsetTop = 0 // TODO: なにこれ

  private width = 0 // TODO: なにこれ
  private height = 0 // TODO: なにこれ

  // sizes in physical pixel
  private widthHH = 0 // TODO: なにこれ
  private heightHH = 0 // TODO: なにこれ

  private paths = new Map<string, PathWithBoundary>() // TODO: 多分、パス
  private drawingPath: Path | null = null // 書いてる最中のPath

  render() {
    return (
      <>
        <canvas></canvas>
      </>
    )
  }

  // setCanvasElement(elem: HTMLCanvasElement | null) {
  //   if (elem === null) {
  //     this.cleanUpCanvas()
  //     return
  //   }
  // }
}
