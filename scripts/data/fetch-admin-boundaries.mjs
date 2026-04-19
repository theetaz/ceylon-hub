#!/usr/bin/env node
/**
 * Fetch Sri Lanka administrative boundaries (ADM0–ADM3) from geoBoundaries,
 * normalize feature properties, and write simplified GeoJSON to public/geo/.
 *
 * Run: npm run data:boundaries
 */
import { mkdir, writeFile, stat } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, "../..")
const OUTPUT_DIR = resolve(ROOT, "public/geo")

const LEVELS = [
  { level: 0, name: "country", file: "country.geojson", label: "Country" },
  { level: 1, name: "provinces", file: "provinces.geojson", label: "Provinces" },
  { level: 2, name: "districts", file: "districts.geojson", label: "Districts" },
  {
    level: 3,
    name: "ds-divisions",
    file: "ds-divisions.geojson",
    label: "DS Divisions",
  },
]

async function fetchMeta(level) {
  const url = `https://www.geoboundaries.org/api/current/gbOpen/LKA/ADM${level}/`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Meta fetch failed for ADM${level}: ${res.status}`)
  }
  return res.json()
}

async function fetchGeoJSON(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`GeoJSON fetch failed: ${res.status} ${url}`)
  }
  return res.json()
}

function normalize(fc, level) {
  return {
    type: "FeatureCollection",
    features: fc.features.map((feature, index) => {
      const props = feature.properties ?? {}
      const id = props.shapeID ?? `LKA-${level}-${index}`
      return {
        type: "Feature",
        id,
        properties: {
          id,
          name: props.shapeName ?? `Unit ${index + 1}`,
          level,
          iso: props.shapeGroup ?? "LKA",
        },
        geometry: feature.geometry,
      }
    }),
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })
  console.log(`Output: ${OUTPUT_DIR}`)

  for (const def of LEVELS) {
    process.stdout.write(`  ADM${def.level} (${def.label})… `)
    const meta = await fetchMeta(def.level)
    const source = meta.simplifiedGeometryGeoJSON
    if (!source) {
      throw new Error(`No simplified GeoJSON URL for ADM${def.level}`)
    }
    const gj = await fetchGeoJSON(source)
    const normalized = normalize(gj, def.level)
    const path = resolve(OUTPUT_DIR, def.file)
    const body = JSON.stringify(normalized)
    await writeFile(path, body)
    const { size } = await stat(path)
    console.log(`${normalized.features.length} features, ${formatBytes(size)} → ${def.file}`)
  }

  console.log("\nDone. Source: geoBoundaries (gbOpen) — CC BY 3.0 IGO")
  console.log("https://www.geoboundaries.org/")
}

main().catch((err) => {
  console.error("\n✖ Failed:", err.message)
  process.exit(1)
})
