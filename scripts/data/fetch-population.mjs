#!/usr/bin/env node
/**
 * Fetch Sri Lanka subnational population statistics (2023 projections)
 * from OCHA's Common Operational Datasets on HDX. Pulls ADM0, ADM1 and
 * ADM2 CSVs, parses them, and writes a structured JSON under
 * scripts/data/population-2023.json consumed by enrich-boundaries.mjs.
 *
 * Source: https://data.humdata.org/dataset/cod-ps-lka
 * License: CC BY-IGO
 *
 * Run: npm run data:population
 */
import { writeFile } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUT = resolve(__dirname, "population-2023.json")

const SOURCES = {
  adm0: "https://data.humdata.org/dataset/e982aec3-478e-4910-ae5c-072ae2cf6933/resource/c309ff4c-f435-4cad-85ea-97c39a963f90/download/lka_admpop_adm0_2023.csv",
  adm1: "https://data.humdata.org/dataset/e982aec3-478e-4910-ae5c-072ae2cf6933/resource/62dbf08d-a2bb-42bd-bdb5-aa5b6903ea98/download/lka_admpop_adm1_2023.csv",
  adm2: "https://data.humdata.org/dataset/e982aec3-478e-4910-ae5c-072ae2cf6933/resource/4405f46a-e4b3-4778-9290-131613a7ce71/download/lka_admpop_adm2_2023.csv",
}

const AGE_BUCKETS = [
  "00_04",
  "05_09",
  "10_14",
  "15_19",
  "20_24",
  "25_29",
  "30_34",
  "35_39",
  "40_44",
  "45_49",
  "50_54",
  "55_59",
  "60_64",
  "65_69",
  "70_74",
  "75_79",
  "80Plus",
]

async function fetchCsv(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`)
  const text = await res.text()
  // Strip BOM if present
  return text.replace(/^\uFEFF/, "")
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const header = lines[0].split(",")
  return lines.slice(1).map((line) => {
    const cells = line.split(",")
    const row = {}
    header.forEach((col, i) => {
      row[col.trim()] = cells[i]?.trim() ?? ""
    })
    return row
  })
}

function toInt(value) {
  if (value == null || value === "") return 0
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function extractRow(row) {
  const female = toInt(row.F_TL)
  const male = toInt(row.M_TL)
  const total = toInt(row.T_TL) || female + male
  const age = {}
  for (const bucket of AGE_BUCKETS) {
    const f = toInt(row[`F_${bucket}`])
    const m = toInt(row[`M_${bucket}`])
    age[bucket] = { female: f, male: m, total: f + m }
  }
  return { total, female, male, age }
}

async function main() {
  console.log("Fetching ADM0, ADM1, ADM2 from OCHA / HDX…")
  const [adm0, adm1, adm2] = await Promise.all([
    fetchCsv(SOURCES.adm0).then(parseCsv),
    fetchCsv(SOURCES.adm1).then(parseCsv),
    fetchCsv(SOURCES.adm2).then(parseCsv),
  ])

  const country = adm0[0] ? extractRow(adm0[0]) : null

  const provinces = {}
  for (const row of adm1) {
    const name = row.ADM1_EN
    if (!name) continue
    provinces[name] = {
      pcode: row.ADM1_PCODE,
      nameSi: row.ADM1_NAME_SI,
      nameTa: row.ADM1_NAME_TA,
      ...extractRow(row),
    }
  }

  const districts = {}
  for (const row of adm2) {
    const name = row.ADM2_NAME
    if (!name) continue
    districts[name] = {
      pcode: row.ADM2_PCODE,
      province: row.ADM1_EN,
      nameSi: row.ADM2_NAME_SI,
      nameTa: row.ADM2_NAME_TA,
      ...extractRow(row),
    }
  }

  const payload = {
    source: {
      name: "OCHA ROAP — Sri Lanka Subnational Population Statistics",
      hdxDataset: "https://data.humdata.org/dataset/cod-ps-lka",
      license: "CC BY-IGO",
    },
    year: 2023,
    fetchedAt: new Date().toISOString(),
    ageBuckets: AGE_BUCKETS,
    country,
    provinces,
    districts,
  }

  await writeFile(OUT, JSON.stringify(payload, null, 2))
  console.log(
    `Wrote ${OUT}:\n` +
      `  country total: ${country?.total.toLocaleString()}\n` +
      `  provinces: ${Object.keys(provinces).length}\n` +
      `  districts: ${Object.keys(districts).length}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
