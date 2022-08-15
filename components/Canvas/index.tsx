import React from 'react'
import { getPathBoundary, PathWithBoundary } from './path_boundary'
import { Path, Point } from '../../services/PictureService'
import { drawPath } from './draw'
import { addEventListener } from '../../utils/addEventListener'
import { Pointer, pushPoint, toPointer } from './pointer'
import { generateId } from '../../utils/generateid'
import { Operation } from './operation'
import { addPaths } from './path'
import { GestureInfo } from './gesture_info'

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
  private widthPP = 0 // TODO: なにこれ
  private heightPP = 0 // TODO: なにこれ

  private paths = new Map<string, PathWithBoundary>() // TODO: 多分、パス
  private drawingPath: Path | null = null // 書いてる最中のPath

  private scrollLeft = 0 // TODO: なにこれ
  private scrollTop = 0 // TODO: なにこれ
  private bufferedScrollLeft = 0 // TODO: なにこれ
  private bufferedScrollTop = 0 // TODO: なにこれ

  private tickingDraw = false // TODO: なにこれ
  private tickingScroll = false // TODO: なにこれ
  private tickingResize = false // TODO: なにこれ

  private prevX = 0 // TODO: なにこれ
  private prevY = 0 // TODO: なにこれ
  private isPanning = false // TODO: なにこれ

  private doneOperationStack: Operation[] = []
  private undoneOperationStack: Operation[] = []

  private activePointers: Map<number, Pointer> = new Map()

  // removeEventListener群
  private canvasCleanUpHandler: (() => void) | null = null

  // thisでbindする（環境をthisにする）ので、setCanvasElementは別にクラスメソッドじゃなくても良いが、setCanvasElement内でthisを使ってるのでインスタンスメソッドとして定義している方が都合が良さそう
  private canvasRef = this.setCanvasElement.bind(this)

  private gestureInfo: GestureInfo | null = null

  componentWillUnmount() {
    this.cleanUpCanvas()
  }

  render() {
    return (
      <>
        {/* refを渡すと、実DOMを引数にわたすコールバック */}
        <canvas ref={this.canvasRef} className="bg-white"></canvas>
      </>
    )
  }

  // コンポーネントのrefに渡されたときに、実DOMが渡される
  setCanvasElement(elem: HTMLCanvasElement | null) {
    // canvasが見つからないならなにもしない
    if (elem === null) {
      this.cleanUpCanvas()
      return
    }
    // 実行しない
    if (elem === this.canvasElement) return

    // pointerdownとかpointermoveのイベントリスナを一旦クリーンする
    const { canvasCleanUpHandler } = this
    if (canvasCleanUpHandler != null) {
      canvasCleanUpHandler()
    }

    const parent = elem.parentElement as HTMLDivElement

    this.canvasElement = elem
    this.parentElement = parent
    this.renderingContext = elem.getContext('2d')
    this.dpr = devicePixelRatio
    this.handleResize()

    const unSubscribers = [
      // addEventListener(elem, 'wheel', this.handleWheel.bind(this)),
      // iPadブラウザのデフォジェスチャー操作が無効になる
      addEventListener(elem, 'touchmove', (event) => event.preventDefault()),
      // 筆がタブレットについたとき
      addEventListener(elem, 'pointerdown', this.handlePointerDown.bind(this)),
      // 筆がタブレットで動いたとき
      addEventListener(elem, 'pointermove', this.handlePointerMove.bind(this)),
      // 筆がタブレットから離れたとき
      addEventListener(elem, 'pointerup', this.handlePointerUp.bind(this)),
      // addEventListener(window, 'keydown', this.handleWindowKeyDown.bind(this)),
      // addEventListener(document, 'copy', this.handleCopy.bind(this)),
      // addEventListener(document, 'cut', this.handleCut.bind(this)),
      // addEventListener(document, 'paste', this.handlePaste.bind(this))
    ]

    const resizeObserver = new ResizeObserver(() =>
      this.handleResizeWithThrottling(),
    )
    // parentがresizeしたときにthis.handleResizeWithThrottling()が発火する
    resizeObserver.observe(parent!)

    this.canvasCleanUpHandler = () => {
      // unSubscriberが動くとどうなるの？
      unSubscribers.forEach((f) => f())
      resizeObserver.disconnect()
    }
  }

  // canvasとかの画面サイズ調整してる。初期値的な感じ
  private handleResize() {
    const ce = this.canvasElement
    const parent = this.parentElement
    if (ce == null || parent == null) return

    const rect = parent.getBoundingClientRect()
    this.offsetLeft = rect.left // viewportからのparentの左端までの距離
    this.offsetTop = rect.top // viewportからのparentのtopまでの距離
    this.width = rect.width
    this.height = rect.height
    this.widthPP = rect.width * this.dpr // 物理ピクセルにする
    this.heightPP = rect.height * this.dpr
    ce.width = this.widthPP // キャンパスを物理ピクセルの幅にする（ボケ防止？）
    ce.height = this.heightPP
    ce.style.width = `${rect.width}px` // レンダリングサイズを親と同じサイズにする
    ce.style.height = `${rect.height}px` // レンダリングサイズを親と同じサイズにする

    this.draw()
  }

  // ResizeObserverで画面サイズが検知されたときに、0.3秒後にhandleResizeが実行する
  private handleResizeWithThrottling() {
    // 0.3秒以内に連続的に画面サイズをするときにhandleResizeがめっちゃスタックされてしまうから、画面サイズしてる最中はスタックされないようにしてる
    if (this.tickingResize) return

    this.tickingResize = true
    // 0.3秒後に実行される
    setTimeout(() => {
      this.handleResize()
      this.tickingResize = false
    }, 300)
  }

  private draw() {
    const ctx = this.renderingContext
    if (ctx === null) return

    const { scrollLeft, scrollTop, dpr, drawingPath } = this

    // (0, 0)から(widthPP, widthPP)の長方形を消す
    ctx.clearRect(0, 0, this.widthPP, this.heightPP)

    ctx.lineCap = 'round' // TODO: なんだっけ
    ctx.lineJoin = 'round' // TODO: なんだっけ

    const scale = 1.0

    const minXOnScreen = scrollLeft / scale
    const minYOnScreen = scrollTop / scale
    const maxXOnScreen = (this.width + scrollLeft) / scale
    const maxYOnScreen = (this.height + scrollTop) / scale

    // すべてのパス（線）に対して、drawする
    for (const path of this.paths.values()) {
      const b = getPathBoundary(path)
      // 無駄なパスをdrawしないようにする
      // パスの最小値がスクリーンの最大値より大きければ表示しない
      // パスの最大値がスクリーンの最小値より小さければ表示しない
      if (
        b.minX > maxXOnScreen ||
        b.minY > maxYOnScreen ||
        b.maxX < minXOnScreen ||
        b.maxY < minYOnScreen
      ) {
        continue
      }

      // TODO: いつか実装する
      // if (erasingPathIds != null && erasingPathIds.has(path.id)) {
      //   continue
      // }

      let dx = 0
      let dy = 0
      // TODO: いつか実装する
      // if (currentLasso != null && currentLasso.overlappingPathIds.has(path.id)) {
      //   dx = currentLasso.accumulatedOffsetX
      //   dy = currentLasso.accumulatedOffsetY
      // }

      drawPath(ctx, path, scrollLeft, scrollTop, dpr, scale, dx, dy)
    }

    // 現在書いてるpath
    const isDrawing = drawingPath !== null
    if (isDrawing) {
      drawPath(ctx, drawingPath, scrollLeft, scrollTop, dpr, scale, 0, 0)
    }

    // if (currentLasso != null) {
    //   drawLassoPath(ctx, currentLasso, scrollLeft, scrollTop, dpr, scale, isDarkMode)
    // }
    //
    // if (this.isScrollBarVisible) {
    //   this.drawScrollBar(ctx)
    // }
  }

  // ペンが接地面についたとき
  private handlePointerDown(event: PointerEvent) {
    // 複数のactiveな接地面があるとなにもしない
    if (this.activePointers.size >= 2) return

    // https://developer.mozilla.org/ja/docs/Web/API/Pointer_events#%E3%83%9C%E3%82%BF%E3%83%B3%E3%81%AE%E7%8A%B6%E6%85%8B%E3%81%AE%E5%88%A4%E6%96%AD
    // ボタンの状態の判断
    if (event.button > 1) return

    // これから、このpointerIdに対応したeventをこれから使っていくぞ
    this.canvasElement?.setPointerCapture(event.pointerId)
    this.activePointers.set(event.pointerId, toPointer(event))

    const p = this.getPoint(event)
    if (p) {
      this.drawingPath = {
        id: generateId(),
        color: 'black',
        width: 1,
        points: [p],
        isBezier: false,
        offsetX: 0,
        offsetY: 0,
      }
    }
    // TODO: impl eraser
    // TODO: impl lasso
    // TODO: impl default
  }

  private handlePointerMove(event: PointerEvent) {
    // handlePointerDownで設置したときのpointerIdが違う場合は虫する
    // 多分、Apple pencilで書き始めたときに指で画面をなぞったときに変な感じにしないため
    if (!this.activePointers.has(event.pointerId)) return

    // 書いた座標追加
    this.activePointers.set(event.pointerId, toPointer(event))

    const actualCurrentTool = 'pen'

    switch (actualCurrentTool) {
      case 'pen': {
        const p = this.getPoint(event)
        if (p) {
          const { drawingPath } = this
          if (drawingPath) {
            pushPoint(drawingPath.points, p)
            this.tickDraw()
          }
        }
        break
      }
      default: {
        // const [p1, p2] = this.getPointsForPanning()
        console.log('gesture...!')
        break
      }
    }

    // TODO: impl eraser
    // TODO: impl lasso
    // TODO: impl default
  }

  // private getPointsForPanning(): [Point, Point] {
  //   const points: Point[] = []
  //   // const point = toPointer(event)
  //   // const p = { x: point.clientX, y: point.clientY }
  //
  //   for (const x of ) {
  //
  //   }
  // }

  private handlePointerUp(event: PointerEvent) {
    if (!this.activePointers.has(event.pointerId)) return

    const p = this.getPoint(event)
    if (p) {
      // handlePointerDownで初期化したdrawingPath
      // handlePointerMoveでdrawingPath.pointsに座標を追加する
      // handlePointerUpでdrawingPath.pointsに座標を追加する
      pushPoint(this.drawingPath?.points, p)
      // smoothPathで、パスを滑らかにする
      // if (this.experimentalSettings.value.disableSmoothingPaths !== true) {
      //   smoothPath(this.drawingPath, this.drawingService.scale.value)
      // }
      this.addDrawingPath()
    }
    this.activePointers.delete(event.pointerId)
    if (this.canvasElement!.hasPointerCapture(event.pointerId)) {
      this.canvasElement!.releasePointerCapture(event.pointerId)
    }
  }

  private addDrawingPath() {
    const { drawingPath } = this
    if (drawingPath === null) return

    this.drawingPath = null
    // 複数のパスを追加してる
    if (drawingPath.points.length >= 1) {
      this.doOperation({ type: 'add', paths: [drawingPath] })
    }
  }

  // TODO: なにこれ
  private checkOperationStack() {
    const canUndo = this.doneOperationStack.length !== 0
    const canRedo = this.undoneOperationStack.length !== 0
    // if (this.drawingService.canUndo.value !== canUndo) this.drawingService.canUndo.next(canUndo)
    // if (this.drawingService.canRedo.value !== canRedo) this.drawingService.canRedo.next(canRedo)
  }

  // pathの追加、消しゴム、移動などする
  private doOperation(operation: Operation, redo: boolean = false) {
    this.doneOperationStack.push(operation)
    if (!redo) this.undoneOperationStack = []
    this.checkOperationStack()

    // this.pathsにdrawingPathを追加する
    this.addPathsInternal(operation.paths)
    // switch (operation.type) {
    //   case 'add':
    //     this.addPathsInternal(operation.paths)
    //     break
    //
    //   case 'remove':
    //     this.removePathsInternal(operation.paths)
    //     if (operation.lasso != null) {
    //       this.currentLasso = null
    //     }
    //     break
    //
    //   case 'move': {
    //     this.movePathsInternal(operation.paths, operation.dx, operation.dy)
    //     const lasso = operation.lasso.copy()
    //     lasso.offsetX += operation.dx
    //     lasso.offsetY += operation.dy
    //     this.currentLasso = lasso
    //     break
    //   }
    // }

    this.tickDraw()
  }

  // やってることは、pathの追加
  private addPathsInternal(paths: Path[]) {
    addPaths(this.paths, paths)
    // TODO: impl
    // this.pictureService.addPaths(this.props.pictureId, paths)
  }

  // offsetとか気にした座標を取り出す
  private getPoint(event: PointerEvent): Point | undefined {
    // const palmRejection = this.drawingService.palmRejectionEnabled.value

    for (const pointer of this.activePointers.values()) {
      // if (palmRejection && pointer.type === 'touch') continue

      // アクティブとされてるpointerが現在さわってるpointerと違った場合はなにもしない
      if (pointer.id !== event.pointerId) return undefined

      const rawX = pointer.clientX - this.offsetLeft
      const rawY = pointer.clientY - this.offsetTop

      // const scale = this.drawingService.scale.value
      const scale = 1.0
      // TODO: 座標からscrollLeft足すとどうなるんや
      const x = (rawX + this.scrollLeft) / scale
      const y = (rawY + this.scrollTop) / scale

      return { x, y }
    }

    return undefined
  }

  // 滑らかにdrawを実行する
  private tickDraw() {
    if (this.tickingDraw) return

    // かきはじめましたよ
    this.tickingDraw = true
    // drawだとリフレッシュレート高すぎるから、requestAnimationFrameで抑えるぜ
    requestAnimationFrame(() => {
      // drawで実際描画するぜ
      this.draw()
      this.tickingDraw = false
    })
  }

  cleanUpCanvas() {
    const { canvasCleanUpHandler } = this
    if (canvasCleanUpHandler != null) {
      canvasCleanUpHandler()
      this.canvasCleanUpHandler = null
    }

    this.canvasElement = null
    this.renderingContext = null
  }
}
