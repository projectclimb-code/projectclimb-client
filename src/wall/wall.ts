import { constants } from '@/utils/constants.ts'

export async function loadWallSvg() {

  const response = await fetch('wall.svg')
  console.log('Found paths:')
  const svgText = await response.text()

  // 3️⃣ Parse SVG text into DOM
  const parser = new DOMParser()
  const holdsLayer = new Konva.Group()
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')

  // 4️⃣ Find all <path> elements
  const paths = svgDoc.querySelectorAll('path')
  console.log('Found paths:', paths.length)

  paths.forEach((p, i) => {

    // Get basic attributes
    const d = p.getAttribute('d')
    const fill = p.getAttribute('fill') || 'white'
    const stroke = p.getAttribute('stroke') || 'black'
    const strokeWidth = parseFloat(p.getAttribute('stroke-width') || 13)

    // 5️⃣ Create Konva.Path
    const konvaPath = new Konva.Path({
      id: `${i}`,
      data: d,
      fill,
      stroke,
      strokeWidth,
      opacity: 0.3,
    })

    // konvaPath.on('click', (e) => {
    //   console.log('Path clicked:', konvaPath.id())

    //   // Example: change color on click
    //   if (konvaPath.opacity() < 1) {
    //     konvaPath.opacity(1)
    //   } else {
    //     konvaPath.opacity(0.3)
    //   }

    //   konvaPath.getLayer().batchDraw()
    // })

    // 1️⃣ Get current absolute position
    // const absPos = konvaPath.getAbsolutePosition()

    // 2️⃣ Get bounding box
    const box = konvaPath.getClientRect({ skipTransform: true })

    // 3️⃣ Compute center of bounding box
    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2

    // 4️⃣ Compute offset shift
    const offsetShiftX = centerX - konvaPath.x()
    const offsetShiftY = centerY - konvaPath.y()

    // 5️⃣ Set offset to center
    konvaPath.offsetX(offsetShiftX)
    konvaPath.offsetY(offsetShiftY)

    // 6️⃣ Move path so it visually stays in the same place
    konvaPath.x(konvaPath.x() + offsetShiftX)
    konvaPath.y(konvaPath.y() + offsetShiftY)
    holdsLayer.add(konvaPath)
  })
  console.log('holdsLayer', holdsLayer)
  return holdsLayer
}

export function scaleLayer(layer: Konva.Layer, stage: Konva.Stage) {
  layer.offsetX(constants.WALL_WIDTH_MM / 2)
  layer.offsetY(constants.WALL_HEIGHT_MM / 2)
  layer.position({
    x: stage.getNode().width() / 2,
    y: stage.getNode().height() / 2,
  })
  layer.scale({
    x: stage.getNode().width() / constants.WALL_WIDTH_MM,
    y: stage.getNode().height() / constants.WALL_HEIGHT_MM,
  })
  return layer
}
