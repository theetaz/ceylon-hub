#!/usr/bin/env node
/**
 * Fetch a batch of Sri Lanka feature layers from OpenStreetMap via
 * Overpass and write each as its own GeoJSON file under public/geo.
 *
 *  - railways.geojson      (rail lines + station points)
 *  - airports.geojson      (airports + airfields as points)
 *  - hospitals.geojson     (hospitals + clinics)
 *  - education.geojson     (schools, colleges, universities)
 *  - waterways.geojson     (rivers + streams + reservoirs/lakes)
 *  - protected-areas.geojson (national parks, nature reserves)
 *
 * Source: OpenStreetMap contributors (ODbL).
 *
 * Run: npm run data:osm
 */
import { writeFile, mkdir } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { simplify } from "@turf/simplify"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, "../..")
const OUT_DIR = resolve(ROOT, "public/geo")

const BBOX = "5.8,79.3,10.05,82.05"

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass-api.de/api/interpreter",
]

async function fetchOverpass(query) {
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
        body: new URLSearchParams({ data: query }),
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

// ----------------- helpers ----------------

function pointFromElement(el) {
  // `node` → uses el.lat/lon; `way`/`relation` with `out center` → uses el.center
  if (el.type === "node") return [el.lon, el.lat]
  if (el.center) return [el.center.lon, el.center.lat]
  return null
}

function lineFromWay(way) {
  const coords = (way.geometry ?? []).map((p) => [p.lon, p.lat])
  if (coords.length < 2) return null
  return coords
}

function polygonFromWay(way) {
  const coords = (way.geometry ?? []).map((p) => [p.lon, p.lat])
  if (coords.length < 4) return null
  // close ring if not closed
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first)
  return [coords]
}

function baseProps(el, extra = {}) {
  const tags = el.tags ?? {}
  return {
    id: `${el.type}/${el.id}`,
    osmId: el.id,
    osmType: el.type,
    name: tags.name ?? null,
    nameSi: tags["name:si"] ?? null,
    nameTa: tags["name:ta"] ?? null,
    ...extra,
  }
}

async function writeFc(filename, features, metadata = {}) {
  const fc = {
    type: "FeatureCollection",
    metadata: {
      source: "OpenStreetMap",
      license: "ODbL",
      fetchedAt: new Date().toISOString(),
      ...metadata,
    },
    features,
  }
  const path = resolve(OUT_DIR, filename)
  await writeFile(path, JSON.stringify(fc))
  const bytes = Buffer.byteLength(JSON.stringify(fc))
  const kb = (bytes / 1024).toFixed(1)
  console.log(`  → ${filename.padEnd(26)} ${String(features.length).padStart(5)} features (${kb} KB)`)
}

// ----------------- datasets ----------------

async function fetchRailways() {
  const query = `
[out:json][timeout:120];
(
  way["railway"~"^(rail|narrow_gauge)$"](${BBOX});
  node["railway"~"^(station|halt|tram_stop)$"](${BBOX});
);
out geom;
`.trim()
  const { json } = await fetchOverpass(query)
  const features = []
  for (const el of json.elements ?? []) {
    if (el.type === "way") {
      const coords = lineFromWay(el)
      if (!coords) continue
      features.push({
        type: "Feature",
        id: `way/${el.id}`,
        properties: baseProps(el, {
          kind: "rail",
          gauge: el.tags?.gauge ?? null,
          electrified: el.tags?.electrified ?? null,
        }),
        geometry: { type: "LineString", coordinates: coords },
      })
    } else if (el.type === "node") {
      features.push({
        type: "Feature",
        id: `node/${el.id}`,
        properties: baseProps(el, {
          kind: el.tags?.railway ?? "station",
        }),
        geometry: { type: "Point", coordinates: [el.lon, el.lat] },
      })
    }
  }
  await writeFc("railways.geojson", features, {
    query: "railway=rail|narrow_gauge + railway=station|halt",
  })
}

async function fetchAirports() {
  const query = `
[out:json][timeout:60];
(
  node["aeroway"~"^(aerodrome|airport)$"](${BBOX});
  way["aeroway"~"^(aerodrome|airport)$"](${BBOX});
);
out center;
`.trim()
  const { json } = await fetchOverpass(query)
  const features = []
  for (const el of json.elements ?? []) {
    const coords = pointFromElement(el)
    if (!coords) continue
    features.push({
      type: "Feature",
      id: `${el.type}/${el.id}`,
      properties: baseProps(el, {
        kind: el.tags?.aeroway ?? "aerodrome",
        iata: el.tags?.iata ?? null,
        icao: el.tags?.icao ?? null,
        military:
          el.tags?.access === "military" ||
          el.tags?.landuse === "military"
            ? true
            : false,
      }),
      geometry: { type: "Point", coordinates: coords },
    })
  }
  await writeFc("airports.geojson", features, {
    query: "aeroway=aerodrome|airport",
  })
}

async function fetchHospitals() {
  const query = `
[out:json][timeout:90];
(
  node["amenity"~"^(hospital|clinic)$"](${BBOX});
  way["amenity"~"^(hospital|clinic)$"](${BBOX});
);
out center;
`.trim()
  const { json } = await fetchOverpass(query)
  const features = []
  for (const el of json.elements ?? []) {
    const coords = pointFromElement(el)
    if (!coords) continue
    features.push({
      type: "Feature",
      id: `${el.type}/${el.id}`,
      properties: baseProps(el, {
        kind: el.tags?.amenity ?? "hospital",
        operator: el.tags?.operator ?? null,
        beds: el.tags?.beds ? Number(el.tags.beds) : null,
        healthcare: el.tags?.healthcare ?? null,
      }),
      geometry: { type: "Point", coordinates: coords },
    })
  }
  await writeFc("hospitals.geojson", features, {
    query: "amenity=hospital|clinic",
  })
}

async function fetchEducation() {
  const query = `
[out:json][timeout:90];
(
  node["amenity"~"^(school|college|university)$"](${BBOX});
  way["amenity"~"^(school|college|university)$"](${BBOX});
);
out center;
`.trim()
  const { json } = await fetchOverpass(query)
  const features = []
  for (const el of json.elements ?? []) {
    const coords = pointFromElement(el)
    if (!coords) continue
    features.push({
      type: "Feature",
      id: `${el.type}/${el.id}`,
      properties: baseProps(el, {
        kind: el.tags?.amenity ?? "school",
        operator: el.tags?.operator ?? null,
      }),
      geometry: { type: "Point", coordinates: coords },
    })
  }
  await writeFc("education.geojson", features, {
    query: "amenity=school|college|university",
  })
}

// Rough polygon "size" heuristic — sum of lat/lon deltas on the ring.
// Used to drop tiny ponds so the file stays lean.
function roughPolygonSize(coords) {
  let size = 0
  for (let i = 1; i < coords.length; i++) {
    const [x1, y1] = coords[i - 1]
    const [x2, y2] = coords[i]
    size += Math.abs(x2 - x1) + Math.abs(y2 - y1)
  }
  return size
}

async function fetchWaterways() {
  // Rivers (dropping streams) + reservoirs/lakes only — skip ponds.
  // Sri Lanka's ancient "tanks" are almost all tagged water=reservoir.
  const query = `
[out:json][timeout:120];
(
  way["waterway"="river"](${BBOX});
  way["natural"="water"]["water"~"^(reservoir|lake|river)$"](${BBOX});
);
out geom;
`.trim()
  const { json } = await fetchOverpass(query)
  const raw = []
  for (const el of json.elements ?? []) {
    if (el.type !== "way") continue
    const tags = el.tags ?? {}
    if (tags.waterway === "river") {
      const coords = lineFromWay(el)
      if (!coords) continue
      raw.push({
        type: "Feature",
        id: `way/${el.id}`,
        properties: baseProps(el, {
          kind: "river",
          waterway: tags.waterway,
        }),
        geometry: { type: "LineString", coordinates: coords },
      })
    } else if (tags.natural === "water") {
      const ring = polygonFromWay(el)
      if (!ring) continue
      const size = roughPolygonSize(ring[0])
      // Drop small unnamed water bodies that clutter the map
      if (!tags.name && size < 0.04) continue
      raw.push({
        type: "Feature",
        id: `way/${el.id}`,
        properties: baseProps(el, {
          kind: "water_body",
          water: tags.water ?? null,
        }),
        geometry: { type: "Polygon", coordinates: ring },
      })
    }
  }
  // Simplify geometry so the file stays lean at country scale.
  const features = raw.map((f) =>
    simplify(f, {
      tolerance: f.geometry.type === "LineString" ? 0.002 : 0.0015,
      highQuality: false,
    })
  )
  await writeFc("waterways.geojson", features, {
    query:
      "waterway=river + natural=water with water=reservoir|lake|river; small unnamed bodies dropped; simplified",
  })
}

async function fetchProtectedAreas() {
  const query = `
[out:json][timeout:120];
(
  way["boundary"="national_park"](${BBOX});
  way["boundary"="protected_area"](${BBOX});
  way["leisure"="nature_reserve"](${BBOX});
);
out geom;
`.trim()
  const { json } = await fetchOverpass(query)
  const features = []
  for (const el of json.elements ?? []) {
    if (el.type !== "way") continue
    const tags = el.tags ?? {}
    const ring = polygonFromWay(el)
    if (!ring) continue
    features.push({
      type: "Feature",
      id: `way/${el.id}`,
      properties: baseProps(el, {
        kind:
          tags.boundary === "national_park"
            ? "national_park"
            : tags.leisure === "nature_reserve"
              ? "nature_reserve"
              : "protected_area",
        protectionType: tags["protect_class"] ?? null,
      }),
      geometry: { type: "Polygon", coordinates: ring },
    })
  }
  await writeFc("protected-areas.geojson", features, {
    query:
      "boundary=national_park|protected_area + leisure=nature_reserve (ways only)",
  })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const jobs = [
    { name: "railways", fn: fetchRailways },
    { name: "airports", fn: fetchAirports },
    { name: "hospitals", fn: fetchHospitals },
    { name: "education", fn: fetchEducation },
    { name: "waterways", fn: fetchWaterways },
    { name: "protected-areas", fn: fetchProtectedAreas },
  ]
  for (const job of jobs) {
    process.stdout.write(`${job.name}…\n`)
    await job.fn()
  }
  console.log("\nAll OSM layers fetched.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
