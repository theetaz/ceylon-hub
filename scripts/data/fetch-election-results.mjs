#!/usr/bin/env node
/**
 * Fetch every Sri Lanka election configured in election-config.mjs
 * (via nuuuwan/lk_elections, which in turn scrapes the Election
 * Commission of Sri Lanka), and write one structured JSON per election
 * to scripts/data/election-<id>.json.
 *
 * Consumed by: enrich-boundaries.mjs (joins onto electoral-divisions
 * and polling-divisions GeoJSONs).
 *
 * Run: npm run data:election
 */
import { writeFile } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { ELECTIONS } from "./election-config.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  return { header, rows: lines.slice(1).map((line) => {
    const cells = line.split("\t")
    const row = {}
    header.forEach((col, i) => {
      row[col] = cells[i] ?? ""
    })
    return row
  })}
}

function toInt(value) {
  if (value == null || value === "") return 0
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function summarize(row, partyCols) {
  const valid = toInt(row.valid)
  const rejected = toInt(row.rejected)
  const polled = toInt(row.polled)
  const electors = toInt(row.electors)

  const byParty = {}
  for (const party of partyCols) {
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

async function fetchOne(election) {
  process.stdout.write(`${election.id}… `)
  const text = await fetchTsv(election.url)
  const { header, rows } = parseTsv(text)
  const partyCols = header.filter(
    (c) => !["entity_id", "valid", "rejected", "polled", "electors"].includes(c)
  )

  const byEntityId = {}
  for (const row of rows) {
    const id = row.entity_id
    if (!id) continue
    byEntityId[id] = summarize(row, partyCols)
  }

  // Country-level tally — sum only ED rows to avoid double-counting.
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
  const [winnerParty, winnerVotes] = ranked[0]

  const payload = {
    source: {
      name: "Election Commission of Sri Lanka via nuuuwan/lk_elections",
      url: election.url,
      license: "Open data",
    },
    id: election.id,
    type: election.type,
    year: election.year,
    label: election.label,
    date: election.date,
    fetchedAt: new Date().toISOString(),
    parties: election.parties,
    countryWinner: { party: winnerParty, votes: winnerVotes },
    entities: byEntityId,
  }

  const outPath = resolve(__dirname, `election-${election.id}.json`)
  await writeFile(outPath, JSON.stringify(payload, null, 2))
  console.log(
    `${Object.keys(byEntityId).length} entities · country: ${winnerParty} ${winnerVotes.toLocaleString()}`
  )
}

async function main() {
  console.log(`Fetching ${ELECTIONS.length} elections…`)
  for (const election of ELECTIONS) {
    await fetchOne(election)
  }
  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
