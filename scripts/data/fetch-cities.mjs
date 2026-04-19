#!/usr/bin/env node
/**
 * Fetch Sri Lanka cities and towns from OpenStreetMap via the Overpass API.
 * Writes public/geo/cities.geojson with points tagged city / town, and
 * their name, place class and (where available) population.
 *
 * Source: OpenStreetMap contributors
 * License: ODbL
 *
 * Run: npm run data:cities
 */
import { writeFile, mkdir } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, "../..")
const OUTPUT = resolve(ROOT, "public/geo/cities.geojson")

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
]

const QUERY = `
[out:json][timeout:60];
area["ISO3166-1"="LK"][admin_level=2]->.lk;
(
  node["place"~"^(city|town|suburb)$"]["name"](area.lk);
);
out body;
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

function toFeature(element) {
  const tags = element.tags ?? {}
  const popRaw = tags.population
  const population = popRaw ? Number(String(popRaw).replace(/[^0-9]/g, "")) : null
  return {
    type: "Feature",
    id: element.id,
    properties: {
      id: element.id,
      name: tags.name,
      nameSi: tags["name:si"],
      nameTa: tags["name:ta"],
      place: tags.place,
      population: Number.isFinite(population) ? population : null,
      capital: tags.capital ?? null,
      admin: tags.admin_level ?? null,
      wikidata: tags.wikidata ?? null,
    },
    geometry: {
      type: "Point",
      coordinates: [element.lon, element.lat],
    },
  }
}

const PLACE_RANK = { city: 0, town: 1, suburb: 2 }

async function main() {
  console.log("Querying Overpass for Sri Lankan cities / towns…")
  const { json, endpoint } = await fetchOverpass()
  console.log(`  via ${endpoint}`)
  const elements = Array.isArray(json.elements) ? json.elements : []
  const features = elements
    .filter((el) => el.type === "node" && el.tags?.name && el.tags?.place)
    .map(toFeature)
    .sort((a, b) => {
      const ra = PLACE_RANK[a.properties.place] ?? 9
      const rb = PLACE_RANK[b.properties.place] ?? 9
      if (ra !== rb) return ra - rb
      const pa = a.properties.population ?? 0
      const pb = b.properties.population ?? 0
      if (pa !== pb) return pb - pa
      return a.properties.name.localeCompare(b.properties.name)
    })

  const fc = {
    type: "FeatureCollection",
    metadata: {
      source: "OpenStreetMap",
      license: "ODbL",
      fetchedAt: new Date().toISOString(),
      query: "place=city|town|suburb in Sri Lanka",
    },
    features,
  }

  await mkdir(dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(fc))

  const counts = features.reduce((acc, f) => {
    const k = f.properties.place
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  console.log(
    `Wrote ${features.length} places to ${OUTPUT}\n  ` +
      Object.entries(counts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
