#!/usr/bin/env node
/**
 * Fetch Sri Lanka electoral and polling division boundaries from nuuuwan's
 * sl-topojson repo (sourced from the Sri Lanka Survey Department), convert
 * TopoJSON → GeoJSON, normalize properties, and write to public/geo/.
 *
 *  - electoral-divisions.geojson   22 features  (the 22 electoral districts)
 *  - polling-divisions.geojson    160 features  (160 polling divisions)
 *
 * Source: https://github.com/nuuuwan/sl-topojson (data from Sri Lanka
 * Survey Department). Cite as sl-topojson + original source.
 *
 * Run: npm run data:electoral
 */
import { writeFile, mkdir } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { feature as topoFeature } from "topojson-client"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, "../..")
const OUT_DIR = resolve(ROOT, "public/geo")

// nuuuwan/sl-topojson file snapshot — the 2020-11-20 revision is the
// latest cached on the repo's default branch.
const BASE = "https://raw.githubusercontent.com/nuuuwan/sl-topojson/master"
const FILES = {
  "electoral-divisions": {
    url: `${BASE}/ed.2020-11-20-10%3A40.json`,
    out: "electoral-divisions.geojson",
    level: "ED",
    description: "Electoral divisions (22 districts)",
  },
  "polling-divisions": {
    url: `${BASE}/pd.2020-11-20-10%3A40.json`,
    out: "polling-divisions.geojson",
    level: "PD",
    description: "Polling divisions (160)",
  },
}

async function fetchTopojson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "ceylon-hub/0.1 (https://github.com/theetaz/ceylon-hub)",
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json()
}

function normalize(topo, level) {
  const objectKey = Object.keys(topo.objects)[0]
  const fc = topoFeature(topo, topo.objects[objectKey])
  if (fc.type !== "FeatureCollection") {
    throw new Error(`expected FeatureCollection, got ${fc.type}`)
  }
  return {
    type: "FeatureCollection",
    features: fc.features.map((feat, index) => {
      const props = feat.properties ?? {}
      const id = props.id ?? `${level}-${index}`
      return {
        type: "Feature",
        id,
        properties: {
          id,
          name: props.name ?? `Unit ${index + 1}`,
          level,
          iso: "LKA",
        },
        geometry: feat.geometry,
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
  await mkdir(OUT_DIR, { recursive: true })

  for (const [key, def] of Object.entries(FILES)) {
    process.stdout.write(`${key}… `)
    const topo = await fetchTopojson(def.url)
    const fc = normalize(topo, def.level)
    const path = resolve(OUT_DIR, def.out)
    const body = JSON.stringify(fc)
    await writeFile(path, body)
    console.log(
      `${fc.features.length} features, ${formatBytes(body.length)} → ${def.out}`
    )
  }

  console.log(
    "\nDone. Source: Sri Lanka Survey Department via nuuuwan/sl-topojson"
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
