#!/usr/bin/env node
/**
 * Fetch Sri Lanka road network (trunk + primary + secondary) from
 * OpenStreetMap via Overpass and write a LineString FeatureCollection
 * to public/geo/roads.geojson.
 *
 * Source: OpenStreetMap contributors — ODbL
 *
 * Run: npm run data:roads
 */
import { writeFile, mkdir } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { simplify } from "@turf/simplify"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, "../..")
const OUTPUT = resolve(ROOT, "public/geo/roads.geojson")

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
]

// bbox covers Sri Lanka (south, west, north, east)
const QUERY = `
[out:json][timeout:120];
way["highway"~"^(motorway|trunk|primary|secondary)$"](5.8,79.3,10.05,82.05);
out geom;
`.trim()

async function fetchOverpass() {
  let lastError = null
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "ceylon-hub/0.1 (https://github.com/theetaz/ceylon-hub)",
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: QUERY }),
      })
      if (!res.ok) {
        lastError = new Error(`${url} → ${res.status}`)
        continue
      }
      const json = await res.json()
      return { json, endpoint: url }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError ?? new Error("All Overpass endpoints failed")
}

// Tolerance per road class in degrees. Coarser classes tolerate more
// simplification since they're rendered at lower zoom levels.
const SIMPLIFY_TOLERANCE = {
  motorway: 0.0008,
  trunk: 0.001,
  primary: 0.0015,
  secondary: 0.002,
}

function toFeature(way) {
  const tags = way.tags ?? {}
  const coords = (way.geometry ?? []).map((p) => [p.lon, p.lat])
  return {
    type: "Feature",
    id: way.id,
    properties: {
      id: way.id,
      highway: tags.highway,
      name: tags.name ?? null,
      ref: tags.ref ?? null,
    },
    geometry: {
      type: "LineString",
      coordinates: coords,
    },
  }
}

async function main() {
  console.log("Querying Overpass for Sri Lankan roads…")
  const { json, endpoint } = await fetchOverpass()
  console.log(`  via ${endpoint}`)
  const ways = Array.isArray(json.elements) ? json.elements : []
  const features = ways
    .filter((w) => w.type === "way" && w.geometry?.length >= 2)
    .map(toFeature)
    .map((f) => {
      const tol =
        SIMPLIFY_TOLERANCE[f.properties.highway] ?? 0.002
      return simplify(f, { tolerance: tol, highQuality: false })
    })

  const fc = {
    type: "FeatureCollection",
    metadata: {
      source: "OpenStreetMap",
      license: "ODbL",
      fetchedAt: new Date().toISOString(),
      query: "highway=motorway|trunk|primary|secondary in Sri Lanka",
    },
    features,
  }

  await mkdir(dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(fc))

  const counts = features.reduce((acc, f) => {
    const k = f.properties.highway
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  console.log(
    `Wrote ${features.length} ways to ${OUTPUT}\n  ` +
      Object.entries(counts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
