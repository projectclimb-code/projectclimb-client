import { constants } from '@/utils/constants.ts'
import Konva from 'konva'

export async function loadWallSvg(
  onPathClick?: (pathId: string) => void,
  selectedStarts: string[] = [],
  selectedEnd: string | null = null
) {
  const response = await fetch('wall.svg')
  const svgText = await response.text()

  // 3️⃣ Parse SVG text into DOM
  const parser = new DOMParser()
  const holdsLayer = new Konva.Layer()
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')

  // 4️⃣ Find all <path> elements
  const paths = svgDoc.querySelectorAll('path')

  paths.forEach((p, i) => {
    // Get basic attributes
    const d = p.getAttribute('d')
    const fill = p.getAttribute('fill') || 'white'
    const stroke = p.getAttribute('stroke') || 'black'
    const strokeWidth = parseFloat(p.getAttribute('stroke-width') || '13')

    // Extract hold ID from SVG (e.g., "hold_48" -> "48") or use index as fallback
    const holdIdAttr = p.getAttribute('id') || ''
    const holdIdMatch = holdIdAttr.match(/hold_(\d+)/)
    const pathId = holdIdMatch ? holdIdMatch[1] : `${i}`
    const isStart = selectedStarts.includes(pathId || '')
    const isEnd = selectedEnd === pathId

    // Apply color based on selection
    let pathFill = fill
    let pathOpacity = 0.3

    if (isStart) {
      pathFill = 'green'
      pathOpacity = 1
    } else if (isEnd) {
      pathFill = 'red'
      pathOpacity = 1
    }

    // 5️⃣ Create Konva.Path
    const konvaPath = new Konva.Path({
      id: pathId,
      data: d || '',
      fill: pathFill,
      stroke,
      strokeWidth,
      opacity: pathOpacity,
      listening: true,
      perfectDrawEnabled: false,
      hitStrokeWidth: 20, // Increase hit area for better touch interaction
    })

    // Unified click/tap handler for better mobile support
    // Use a flag to prevent multiple rapid fires on mobile
    let lastClickTime = 0
    const CLICK_DEBOUNCE_MS = 300

    const handleInteraction = (e?: any) => {
      // Prevent default touch behavior
      if (e && e.evt) {
        e.evt.preventDefault?.()
        e.evt.stopPropagation?.()
      }

      const now = Date.now()
      // Debounce rapid clicks/taps
      if (now - lastClickTime < CLICK_DEBOUNCE_MS) {
        return
      }
      lastClickTime = now

      if (onPathClick) {
        onPathClick(pathId || '')
      }
    }

    // Use tap for both mobile and desktop - it handles touch and click
    konvaPath.on('tap', handleInteraction)
    // Also listen to click for desktop compatibility
    konvaPath.on('click', (e: any) => {
      // Only handle click if not on a touch device (to avoid double-firing)
      if (!('ontouchstart' in window)) {
        handleInteraction(e)
      }
    })

    const box = konvaPath.getClientRect({ skipTransform: true })
    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2
    const offsetShiftX = centerX - konvaPath.x()
    const offsetShiftY = centerY - konvaPath.y()
    konvaPath.offsetX(offsetShiftX)
    konvaPath.offsetY(offsetShiftY)
    konvaPath.x(konvaPath.x() + offsetShiftX)
    konvaPath.y(konvaPath.y() + offsetShiftY)
    holdsLayer.add(konvaPath)
  })
  return holdsLayer
}

export function scaleLayer(layer: Konva.Layer, stage: Konva.Stage) {
  layer.offsetX(constants.WALL_WIDTH_MM / 2)
  layer.offsetY(constants.WALL_HEIGHT_MM / 2)

  // Calculate uniform scale to fit the wall within the stage while maintaining aspect ratio
  const wallAspectRatio = constants.WALL_WIDTH_MM / constants.WALL_HEIGHT_MM
  const stageAspectRatio = stage.width() / stage.height()

  // Use uniform scale based on the smaller dimension to ensure everything fits
  let scale: number
  if (stageAspectRatio > wallAspectRatio) {
    // Stage is wider than wall - fit based on height
    scale = stage.height() / constants.WALL_HEIGHT_MM
  } else {
    // Stage is taller than wall - fit based on width
    scale = stage.width() / constants.WALL_WIDTH_MM
  }

  layer.position({
    x: stage.width() / 2,
    y: stage.height() / 2,
  })
  layer.scale({
    x: scale,
    y: scale,
  })
  return layer
}
