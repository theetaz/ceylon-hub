#!/usr/bin/env node
/**
 * Fetch 2024 Sri Lanka Presidential election results (from
 * nuuuwan/lk_elections), parse, and save a structured JSON keyed by
 * electoral / polling division id.
 *
 * Output: scripts/data/election-presidential-2024.json
 * Consumed by: enrich-boundaries.mjs (joins onto electoral-divisions
 * and polling-divisions GeoJSONs).
 *
 * Source: nuuuwan/lk_elections
 *   https://raw.githubusercontent.com/nuuuwan/lk_elections/master/
 *   public/data/elections/government-elections-presidential.regions-ec.2024.tsv
 *
 * Data ultimately sourced from the Election Commission of Sri Lanka.
 *
 * Run: npm run data:election
 */
import { writeFile } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUT = resolve(__dirname, "election-presidential-2024.json")

const URL_2024 =
  "https://raw.githubusercontent.com/nuuuwan/lk_elections/master/public/data/elections/government-elections-presidential.regions-ec.2024.tsv"

// Major parties / candidates in the 2024 presidential election. Any code
// not in this table is lumped into 'OTHER'.
const PARTIES = {
  NPP: {
    name: "National People's Power",
    candidate: "Anura Kumara Dissanayake",
    color: "#dc2626",
  },
  SJB: {
    name: "Samagi Jana Balawegaya",
    candidate: "Sajith Premadasa",
    color: "#16a34a",
  },
  IND16: {
    name: "New Democratic Front (Ranil Wickremesinghe)",
    candidate: "Ranil Wickremesinghe",
    color: "#0ea5e9",
  },
  SLPP: {
    name: "Sri Lanka Podujana Peramuna",
    candidate: "Namal Rajapaksa",
    color: "#b45309",
  },
  IND9: {
    name: "Independent (Dilith Jayaweera)",
    candidate: "Dilith Jayaweera",
    color: "#7c3aed",
  },
}

const OTHER = {
  name: "Other",
  candidate: "Other candidates",
  color: "#94a3b8",
}

async function fetchTsv(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "ceylon-hub/0.1 (https://github.com/theetaz/ceylon-hub)",
    },
  })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.text()
}

function parseTsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const header = lines[0].split("\t")
  return lines.slice(1).map((line) => {
    const cells = line.split("\t")
    const row = {}
    header.forEach((col, i) => {
      row[col] = cells[i] ?? ""
    })
    return row
  })
}

function toInt(value) {
  if (value == null || value === "") return 0
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function summarize(row, parties) {
  const valid = toInt(row.valid)
  const rejected = toInt(row.rejected)
  const polled = toInt(row.polled)
  const electors = toInt(row.electors)

  const byParty = {}
  for (const party of parties) {
    byParty[party] = toInt(row[party])
  }

  const sorted = Object.entries(byParty)
    .map(([party, votes]) => ({ party, votes }))
    .sort((a, b) => b.votes - a.votes)

  const winner = sorted[0]
  const runnerUp = sorted[1]

  const topByVotes = sorted.slice(0, 5).filter((p) => p.votes > 0)
  let otherVotes = 0
  for (let i = 5; i < sorted.length; i++) otherVotes += sorted[i].votes

  return {
    valid,
    rejected,
    polled,
    electors,
    turnoutPct: electors ? Number(((polled / electors) * 100).toFixed(1)) : null,
    rejectedPct: polled ? Number(((rejected / polled) * 100).toFixed(2)) : null,
    winner: winner
      ? {
          party: winner.party,
          votes: winner.votes,
          pct: valid
            ? Number(((winner.votes / valid) * 100).toFixed(2))
            : null,
        }
      : null,
    runnerUp: runnerUp
      ? {
          party: runnerUp.party,
          votes: runnerUp.votes,
          pct: valid
            ? Number(((runnerUp.votes / valid) * 100).toFixed(2))
            : null,
        }
      : null,
    margin:
      winner && runnerUp
        ? Number(
            (
              ((winner.votes - runnerUp.votes) / (valid || 1)) *
              100
            ).toFixed(2)
          )
        : null,
    topParties: topByVotes.map((p) => ({
      party: p.party,
      votes: p.votes,
      pct: valid ? Number(((p.votes / valid) * 100).toFixed(2)) : null,
    })),
    otherVotes,
  }
}

async function main() {
  console.log("Fetching 2024 presidential election results…")
  const text = await fetchTsv(URL_2024)
  const rows = parseTsv(text)
  const header = text.split(/\r?\n/)[0].split("\t")
  const partyCols = header.filter(
    (c) => !["entity_id", "valid", "rejected", "polled", "electors"].includes(c)
  )

  const byEntityId = {}
  for (const row of rows) {
    const id = row.entity_id
    if (!id) continue
    byEntityId[id] = summarize(row, partyCols)
  }

  const payload = {
    source: {
      name: "Election Commission of Sri Lanka via nuuuwan/lk_elections",
      url: URL_2024,
      license: "Open data",
    },
    election: "Presidential 2024",
    electionDate: "2024-09-21",
    fetchedAt: new Date().toISOString(),
    parties: { ...PARTIES, OTHER },
    entities: byEntityId,
  }

  await writeFile(OUT, JSON.stringify(payload, null, 2))

  const edRows = Object.keys(byEntityId).filter((id) => /^EC-\d+$/.test(id))
  const pdRows = Object.keys(byEntityId).filter((id) => /^EC-\d+[A-Za-z]+$/.test(id))

  // Country-level tally — aggregate ED rows only (each ED already sums
  // its own PDs + postal/displaced votes, so this avoids double-counting).
  const countryTotals = {}
  for (const col of partyCols) {
    let total = 0
    for (const row of rows) {
      if (!/^EC-\d+$/.test(row.entity_id)) continue
      total += toInt(row[col])
    }
    countryTotals[col] = total
  }
  const ranked = Object.entries(countryTotals).sort(([, a], [, b]) => b - a)
  const countryWinner = ranked[0]
  const runnerUp = ranked[1]

  console.log(
    `Wrote ${OUT}\n  entities: ${Object.keys(byEntityId).length} (${edRows.length} ED, ${pdRows.length} PD, ${Object.keys(byEntityId).length - edRows.length - pdRows.length} other)\n  country winner: ${countryWinner[0]} ${countryWinner[1].toLocaleString()}  runner-up: ${runnerUp[0]} ${runnerUp[1].toLocaleString()}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
