// Mirror of scripts/data/election-config.mjs for client-side use.
// Kept in sync manually — if you add a new election there, add it here too.

export type ElectionType = "presidential" | "parliamentary"

export type PartyMeta = {
  candidate: string
  name: string
  color: string
}

export type ElectionConfig = {
  id: string
  type: ElectionType
  year: number
  label: string
  date: string
  parties: Record<string, PartyMeta>
}

export const ELECTIONS: ElectionConfig[] = [
  {
    id: "pres-2024",
    type: "presidential",
    year: 2024,
    label: "2024 Presidential",
    date: "2024-09-21",
    parties: {
      NPP: {
        candidate: "Anura Kumara Dissanayake",
        name: "National People's Power",
        color: "#dc2626",
      },
      SJB: {
        candidate: "Sajith Premadasa",
        name: "Samagi Jana Balawegaya",
        color: "#16a34a",
      },
      IND16: {
        candidate: "Ranil Wickremesinghe",
        name: "New Democratic Front (UNP-backed)",
        color: "#0ea5e9",
      },
      SLPP: {
        candidate: "Namal Rajapaksa",
        name: "Sri Lanka Podujana Peramuna",
        color: "#b45309",
      },
      IND9: {
        candidate: "Dilith Jayaweera",
        name: "Independent",
        color: "#7c3aed",
      },
    },
  },
  {
    id: "pres-2019",
    type: "presidential",
    year: 2019,
    label: "2019 Presidential",
    date: "2019-11-16",
    parties: {
      SLPP: {
        candidate: "Gotabaya Rajapaksa",
        name: "Sri Lanka Podujana Peramuna",
        color: "#b45309",
      },
      NDF: {
        candidate: "Sajith Premadasa",
        name: "New Democratic Front",
        color: "#16a34a",
      },
      NPP: {
        candidate: "Anura Kumara Dissanayake",
        name: "National People's Power",
        color: "#dc2626",
      },
      NMPP: {
        candidate: "Mahesh Senanayake",
        name: "National Movement for Social Justice",
        color: "#7c3aed",
      },
    },
  },
  {
    id: "pres-2015",
    type: "presidential",
    year: 2015,
    label: "2015 Presidential",
    date: "2015-01-08",
    parties: {
      NDF: {
        candidate: "Maithripala Sirisena",
        name: "New Democratic Front (common opposition)",
        color: "#16a34a",
      },
      UPFA: {
        candidate: "Mahinda Rajapaksa",
        name: "United People's Freedom Alliance",
        color: "#b45309",
      },
    },
  },
  {
    id: "parl-2024",
    type: "parliamentary",
    year: 2024,
    label: "2024 Parliamentary",
    date: "2024-11-14",
    parties: {
      NPP: {
        candidate: "National People's Power",
        name: "National People's Power",
        color: "#dc2626",
      },
      SJB: {
        candidate: "Samagi Jana Balawegaya",
        name: "Samagi Jana Balawegaya",
        color: "#16a34a",
      },
      NDF: {
        candidate: "New Democratic Front",
        name: "New Democratic Front",
        color: "#0ea5e9",
      },
      SLPP: {
        candidate: "Sri Lanka Podujana Peramuna",
        name: "Sri Lanka Podujana Peramuna",
        color: "#b45309",
      },
      ITAK: {
        candidate: "Ilankai Tamil Arasu Kachchi",
        name: "Ilankai Tamil Arasu Kachchi",
        color: "#f59e0b",
      },
    },
  },
]

export const OTHER_PARTY: PartyMeta = {
  candidate: "Other candidates",
  name: "Other",
  color: "#94a3b8",
}

export function getElection(id: string | undefined): ElectionConfig | undefined {
  if (!id) return undefined
  return ELECTIONS.find((e) => e.id === id)
}

export function getPartyMeta(election: ElectionConfig | undefined, code: string) {
  if (!election) return OTHER_PARTY
  return election.parties[code] ?? OTHER_PARTY
}

/** Property name on enriched features that stores the winner party code for this election. */
export function winnerPropertyFor(electionId: string) {
  return `winner_${electionId.replace(/-/g, "_")}`
}
