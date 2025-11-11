#!/usr/bin/env node
/**
 * Usage:
 *   node mirror-svg.js input.svg output.svg
 */

import fs from 'fs'
import { JSDOM } from 'jsdom'
import svgpath from 'svgpath'

const [,, inputFile, outputFile] = process.argv
if (!inputFile || !outputFile) {
  console.error('Usage: node mirror-svg.js input.svg output.svg')
  process.exit(1)
}

// --- Read SVG as text ---
const svgText = fs.readFileSync(inputFile, 'utf8')

// --- Extract original SVG tag (for exact attributes preservation) ---
const svgTagMatch = svgText.match(/<svg[^>]*>/i)
if (!svgTagMatch) {
  console.error('No <svg> root element found.')
  process.exit(1)
}
const originalSvgOpenTag = svgTagMatch[0]

// --- Parse DOM ---
const dom = new JSDOM(svgText, { contentType: 'image/svg+xml' })
const document = dom.window.document
const svg = document.querySelector('svg')
const paths = Array.from(svg.querySelectorAll('path'))

if (!svg || paths.length === 0) {
  console.error('No <path> elements found in SVG.')
  process.exit(1)
}

// --- Helper: find bounding box Y center ---
function getBoundingBoxCenterY(d) {
  const coords = Array.from(d.matchAll(/[-+]?\d*\.?\d+/g)).map(Number)
  const ys = coords.filter((_, i) => i % 2 === 1)
  if (ys.length === 0) return 0
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return (minY + maxY) / 2
}

// --- Sort from bottom to top ---
paths.sort((a, b) => {
  const aY = getBoundingBoxCenterY(a.getAttribute('d') || '')
  const bY = getBoundingBoxCenterY(b.getAttribute('d') || '')
  return bY - aY
})

// --- Rename originals ---
paths.forEach((p, i) => p.setAttribute('id', `hold_${i}`))

// --- Mirror ---
const mirrorAxis = 1250
const mirroredPaths = paths.map((p, i) => {
  const d = p.getAttribute('d')
  const mirrored = svgpath(d)
    .scale(-1, 1)
    .translate(2 * mirrorAxis, 0)
    .toString()
  const clone = p.cloneNode()
  clone.setAttribute('d', mirrored)
  clone.setAttribute('id', `hold_${100 + i}`)
  return clone
})

// --- Append mirrored paths ---
mirroredPaths.forEach(m => svg.appendChild(m))

// --- Extract inner content (everything inside <svg>...</svg>) ---
const inner = Array.from(svg.childNodes).map(n => n.outerHTML || '').join('\n')

// --- Combine original <svg> tag + new content + closing tag ---
const outputSvg = `<?xml version="1.0" encoding="UTF-8"?>\n${originalSvgOpenTag}\n${inner}\n</svg>\n`

// --- Write output ---
fs.writeFileSync(outputFile, outputSvg, 'utf8')
console.log(`✅ Wrote mirrored SVG to: ${outputFile}`)
