import './assets/styles/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Aura from '@primeuix/themes/aura'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'

import App from './App.vue'
import router from './router'
import { definePreset } from '@primeuix/themes'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.directive('tooltip', Tooltip)

const customTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{sky.50}',
      100: '{sky.100}',
      200: '{sky.200}',
      300: '{sky.300}',
      400: '{sky.400}',
      500: '#4095f2', // your primary
      600: '{sky.600}',
      700: '{sky.700}',
      800: '{sky.800}',
      900: '{sky.900}',
      DEFAULT: '#4095f2', // your primary
    },
    // you can also override hover, active, contrast etc
    colorScheme: {
      light: {
        primary: {
          color: '#4095F2', // your new primary
          contrastColor: '#FFFFFF', // text color
          hoverColor: '#2077d6',
          activeColor: '#165ba7',
        },
      },
      dark: {
        primary: {
          color: '#4095F2',
          contrastColor: '#FFFFFF',
          hoverColor: '#5aa9ff',
          activeColor: '#8cc4ff',
        },
      },
    },
  },
})

app.use(PrimeVue, {
  theme: {
    preset: customTheme,
    options: {
      darkModeSelector: '.p-dark',
    },
  },
})
app.mount('#app')

// import Konva from 'konva'
// import { Settings } from './settings'
// import fx from 'glfx'
// const settings = new Settings()
// const stage = new Konva.Stage({
//   container: 'drawingContainer',
//   width: settings.screenWidth,
//   height: settings.screenHeight,
// })
// const layer = new Konva.Layer()
// // layer.on('draw', () => {
// //   window.processImage()
// // })

// stage.add(layer)

// const imageObj = new Image()
// imageObj.src = 'wall.png' // replace with your image path

// const holds = []
// let state
// imageObj.onload = function () {
//   // 3️⃣ Create Konva.Image
//   const konvaImage = new Konva.Image({
//     x: 0,
//     y: 0,
//     image: imageObj,
//   })
//   konvaImage.offsetX(konvaImage.width() / 2)
//   konvaImage.offsetY(konvaImage.height() / 2)
//   konvaImage.position({
//     x: settings.screenWidth / 2,
//     y: settings.screenHeight / 2,
//   })
//   konvaImage.rotate(-90)
//   konvaImage.scale({
//     x: settings.screenHeight / settings.wallWidth,
//     y: settings.screenHeight / settings.wallWidth,
//   })

//   layer.add(konvaImage)
//   konvaImage.moveToBottom()
// }
// fetch('wall.svg')
//   .then((res) => res.text())
//   .then((svgText) => {
//     // 3️⃣ Parse SVG text into DOM
//     const parser = new DOMParser()
//     const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')

//     // 4️⃣ Find all <path> elements
//     const paths = svgDoc.querySelectorAll('path')
//     console.log('Found paths:', paths.length)

//     const group = new Konva.Group()
//     paths.forEach((p, i) => {
//       // Get basic attributes
//       const d = p.getAttribute('d')
//       const fill = p.getAttribute('fill') || 'white'
//       const stroke = p.getAttribute('stroke') || 'black'
//       const strokeWidth = parseFloat(p.getAttribute('stroke-width') || 1)

//       // 5️⃣ Create Konva.Path
//       const konvaPath = new Konva.Path({
//         id: `${i}`,
//         data: d,
//         fill,
//         stroke,
//         strokeWidth,
//       })

//       // 1️⃣ Get current absolute position
//       // const absPos = konvaPath.getAbsolutePosition()

//       // 2️⃣ Get bounding box
//       const box = konvaPath.getClientRect({ skipTransform: true })

//       // 3️⃣ Compute center of bounding box
//       const centerX = box.x + box.width / 2
//       const centerY = box.y + box.height / 2

//       // 4️⃣ Compute offset shift
//       const offsetShiftX = centerX - konvaPath.x()
//       const offsetShiftY = centerY - konvaPath.y()

//       // 5️⃣ Set offset to center
//       konvaPath.offsetX(offsetShiftX)
//       konvaPath.offsetY(offsetShiftY)

//       // 6️⃣ Move path so it visually stays in the same place
//       konvaPath.x(konvaPath.x() + offsetShiftX)
//       konvaPath.y(konvaPath.y() + offsetShiftY)

//       // Optional: redraw layer

//       // Add to layer
//       group.add(konvaPath)
//       holds.push(konvaPath)
//     })
//     group.offsetX(settings.wallWidth / 2)
//     group.offsetY(settings.wallHeight / 2)
//     group.position({
//       x: stage.width() / 2,
//       y: stage.height() / 2,
//     })
//     group.scale({
//       x: settings.screenHeight / settings.wallWidth,
//       y: settings.screenHeight / settings.wallWidth,
//     })
//     group.rotate(-90)

//     layer.add(group)
//     state = holds.map((hold) => ({
//       node: hold,
//       id: hold.id(),
//       // to: Math.random() < 0.5 ? 1 : -1,
//       progress: 0,
//       direction: Math.random() < 0.5 ? 1 : -1,
//     }))
//     animatePaths(holds, layer)
//   })

// function animatePaths(paths, layer) {
//   const anim = new Konva.Animation((frame) => {
//     const dt = frame.timeDiff / 1000
//     const speed = 1
//     state.forEach((s) => {
//       if (!points.includes(parseInt(s.id))) {
//         s.progress += ((0 - s.progress) / speed) * dt * 10
//       } else {
//         s.progress += ((1 - s.progress) / speed) * dt * 10
//       }
//       s.node.strokeWidth(s.progress * 10 > 1 ? s.progress * 10 : 0)
//       s.node.fill(`rgb(30,200,30,${s.progress * 0.4})`)
//       s.node.scale({ x: 1 + (1 - s.progress) * 0.5, y: 1 + (1 - s.progress) * 0.5 })
//     })
//   }, layer)

//   anim.start() // start animation
// }
// function cloneCanvas(sourceCanvas) {
//   const copy = document.createElement('canvas')
//   copy.width = sourceCanvas.width
//   copy.height = sourceCanvas.height

//   const ctx = copy.getContext('2d')
//   ctx.drawImage(sourceCanvas, 0, 0)

//   return copy
// }
// function applyGlfxEffect() {
//   const stageCanvas = document.getElementsByTagName('canvas')[0]
//   const img = new Image()
//   img.src = stageCanvas.toDataURL()
//   img.onload = () => {
//     const fxCanvas = fx.canvas()
//     const texture = fxCanvas.texture(img)
//     fxCanvas
//       .draw(texture)
//       .hueSaturation(0.2, 0.8) // example effect
//       .vignette(0.5, 0.8)
//       .update()
//     const outputImg = document.getElementById('canvasOutput')
//     outputImg.src = fxCanvas.toDataURL()

//     //console.log('Stage canvas:', stageCanvas)
//     // // glfx
//     requestAnimationFrame(applyGlfxEffect)
//     // fxCanvas.blur(22)
//     // // // replace layer content (optional)
//   }
// }
// // applyGlfxEffect()
// const min = 0
// const max = 142
// let points = []
// function updatePoints() {
//   const count = 10 + Math.floor(Math.random() * 31) // 10–40 numbers

//   // Create array [0, 1, 2, ..., 142]
//   const pool = Array.from({ length: max - min + 1 }, (_, i) => i + min)

//   // Shuffle pool using Fisher–Yates
//   for (let i = pool.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1))
//     ;[pool[i], pool[j]] = [pool[j], pool[i]]
//   }

//   // Take first N unique numbers
//   points = pool.slice(0, count)
// }

// // Run immediately once
// updatePoints()

// // Repeat every 4 seconds
// setInterval(updatePoints, 1000)
