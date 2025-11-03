import { constants } from '@/utils/constants.ts'

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
    const strokeWidth = parseFloat(p.getAttribute('stroke-width') || 13)

    const pathId = `${i}`
    const isStart = selectedStarts.includes(pathId)
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
      data: d,
      fill: pathFill,
      stroke,
      strokeWidth,
      opacity: pathOpacity,
    })

    konvaPath.on('click', (e) => {
      if (onPathClick) {
        onPathClick(pathId)
      }
    })

    konvaPath.on('tap', (e) => {
      if (onPathClick) {
        onPathClick(pathId)
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
  layer.position({
    x: stage.width() / 2,
    y: stage.height() / 2,
  })
  layer.scale({
    x: stage.width() / constants.WALL_WIDTH_MM,
    y: stage.height() / constants.WALL_HEIGHT_MM,
  })
  return layer
}
