#!/usr/bin/env node
/**
 * Enrich admin boundary GeoJSONs with:
 *   - parent-child relationships (via centroid-in-polygon)
 *   - district-level population + area + density from census data
 *   - aggregated province population + area + density
 *   - parent summary (district counts, DS division counts)
 *
 * Reads and writes:
 *   public/geo/provinces.geojson
 *   public/geo/districts.geojson
 *   public/geo/ds-divisions.geojson
 *
 * Run: npm run data:enrich (or data:refresh to re-fetch then enrich)
 */
import { readFile, writeFile } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { centroid } from "@turf/centroid"
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon"
import { area as turfArea } from "@turf/area"
import { pointOnFeature } from "@turf/point-on-feature"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, "../..")
const OUT = resolve(ROOT, "public/geo")

async function readJSON(path) {
  const body = await readFile(path, "utf8")
  return JSON.parse(body)
}

async function writeJSON(path, data) {
  await writeFile(path, JSON.stringify(data))
}

function findParent(child, parentFc) {
  // 1. Try child's centroid in parent
  // 2. Try a point guaranteed inside the child
  const probes = [centroid(child), pointOnFeature(child)]
  for (const probe of probes) {
    for (const parent of parentFc.features) {
      if (booleanPointInPolygon(probe, parent)) return parent
    }
  }
  // 3. Fall back to nearest parent by centroid distance
  const c = centroid(child).geometry.coordinates
  let nearest = null
  let nearestDist = Infinity
  for (const parent of parentFc.features) {
    const pc = centroid(parent).geometry.coordinates
    const dx = c[0] - pc[0]
    const dy = c[1] - pc[1]
    const d2 = dx * dx + dy * dy
    if (d2 < nearestDist) {
      nearestDist = d2
      nearest = parent
    }
  }
  return nearest
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-US")
}

async function main() {
  const [provinces, districts, dsDivisions, population] = await Promise.all([
    readJSON(resolve(OUT, "provinces.geojson")),
    readJSON(resolve(OUT, "districts.geojson")),
    readJSON(resolve(OUT, "ds-divisions.geojson")),
    readJSON(resolve(__dirname, "district-population.json")),
  ])

  const popByDistrict = population.districts

  // --- Districts: assign parent province + population + area + density
  console.log("Enriching districts…")
  const districtToProvince = new Map()
  for (const district of districts.features) {
    const parent = findParent(district, provinces)
    if (!parent) {
      console.warn(
        `  ! no province found for ${district.properties.name}`
      )
      continue
    }
    const pop = popByDistrict[district.properties.name]
    const areaKm2 = turfArea(district) / 1_000_000
    district.properties = {
      ...district.properties,
      parentId: parent.properties.id,
      parentName: parent.properties.name,
      population: pop ?? null,
      areaKm2: Number(areaKm2.toFixed(2)),
      density: pop ? Number((pop / areaKm2).toFixed(1)) : null,
    }
    districtToProvince.set(district.properties.id, parent.properties.id)
  }

  // --- DS divisions: assign parent district + province + area
  console.log("Enriching DS divisions…")
  const dsToDistrict = new Map()
  for (const ds of dsDivisions.features) {
    const parentDistrict = findParent(ds, districts)
    if (!parentDistrict) {
      console.warn(`  ! no district found for ${ds.properties.name}`)
      continue
    }
    const provinceId = districtToProvince.get(parentDistrict.properties.id)
    const provinceName = provinces.features.find(
      (p) => p.properties.id === provinceId
    )?.properties.name
    const areaKm2 = turfArea(ds) / 1_000_000
    ds.properties = {
      ...ds.properties,
      parentId: parentDistrict.properties.id,
      parentName: parentDistrict.properties.name,
      provinceId,
      provinceName,
      areaKm2: Number(areaKm2.toFixed(2)),
    }
    dsToDistrict.set(ds.properties.id, parentDistrict.properties.id)
  }

  // --- Provinces: aggregate population + area + district count + DS count
  console.log("Aggregating provinces…")
  for (const province of provinces.features) {
    const provinceId = province.properties.id
    const childDistricts = districts.features.filter(
      (d) => d.properties.parentId === provinceId
    )
    const childDsCount = dsDivisions.features.filter(
      (d) => d.properties.provinceId === provinceId
    ).length
    const totalPop = childDistricts.reduce(
      (sum, d) =>
        d.properties.population != null ? sum + d.properties.population : sum,
      0
    )
    const totalArea = turfArea(province) / 1_000_000
    province.properties = {
      ...province.properties,
      districtCount: childDistricts.length,
      dsDivisionCount: childDsCount,
      population: totalPop,
      areaKm2: Number(totalArea.toFixed(2)),
      density: totalPop
        ? Number((totalPop / totalArea).toFixed(1))
        : null,
    }
  }

  // --- Add child counts to districts (DS divisions per district)
  for (const district of districts.features) {
    const children = dsDivisions.features.filter(
      (d) => d.properties.parentId === district.properties.id
    )
    district.properties.dsDivisionCount = children.length
  }

  await Promise.all([
    writeJSON(resolve(OUT, "provinces.geojson"), provinces),
    writeJSON(resolve(OUT, "districts.geojson"), districts),
    writeJSON(resolve(OUT, "ds-divisions.geojson"), dsDivisions),
  ])

  console.log("\nSummary")
  for (const p of provinces.features) {
    console.log(
      `  ${p.properties.name.padEnd(32)} ` +
        `${String(p.properties.districtCount).padStart(2)} districts · ` +
        `${String(p.properties.dsDivisionCount).padStart(3)} DS · ` +
        `${formatNumber(p.properties.population).padStart(10)} pop · ` +
        `${p.properties.areaKm2.toFixed(0).padStart(6)} km²`
    )
  }
  console.log(
    `\nTotal: ${districts.features.length} districts, ` +
      `${dsDivisions.features.length} DS divisions, ` +
      `population ${formatNumber(provinces.features.reduce((s, p) => s + p.properties.population, 0))}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
