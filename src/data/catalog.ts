import {
  IconBallpen,
  IconBuildingCommunity,
  IconBuildingSkyscraper,
  IconCurrencyDollar,
  IconLeaf,
  IconMap2,
  IconRoad,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"

export type DatasetCategory =
  | "admin"
  | "electoral"
  | "population"
  | "infrastructure"
  | "environment"
  | "economy"

export type DatasetStatus = "ready" | "pending"

export type DatasetKind = "layer" | "choropleth" | "embedded" | "extrusion"

export type Dataset = {
  id: string
  title: string
  shortTitle: string
  description: string
  category: DatasetCategory
  status: DatasetStatus
  /** layer = toggleable map layer; choropleth = rendering mode; embedded = always-on info-panel data */
  kind?: DatasetKind
  path?: string
  featureCount?: number
  source: {
    name: string
    url: string
  }
  license: string
}

export type CategoryMeta = {
  id: DatasetCategory
  label: string
  icon: Icon
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "admin", label: "Administrative", icon: IconMap2 },
  { id: "electoral", label: "Electoral", icon: IconBallpen },
  { id: "population", label: "Population", icon: IconUsers },
  { id: "infrastructure", label: "Infrastructure", icon: IconRoad },
  { id: "environment", label: "Environment", icon: IconLeaf },
  { id: "economy", label: "Economy", icon: IconCurrencyDollar },
]

export const CATALOG: Dataset[] = [
  {
    id: "provinces",
    title: "Provinces",
    shortTitle: "Provinces",
    description:
      "9 provinces with 2023 population totals and sex/age breakdown.",
    category: "admin",
    status: "ready",
    path: "/geo/provinces.geojson",
    featureCount: 9,
    source: { name: "geoBoundaries (ADM1)", url: "https://www.geoboundaries.org/" },
    license: "CC BY 3.0 IGO",
  },
  {
    id: "districts",
    title: "Districts",
    shortTitle: "Districts",
    description:
      "25 administrative districts with 2023 population totals and sex/age breakdown.",
    category: "admin",
    status: "ready",
    path: "/geo/districts.geojson",
    featureCount: 25,
    source: { name: "geoBoundaries (ADM2)", url: "https://www.geoboundaries.org/" },
    license: "CC BY 3.0 IGO",
  },
  {
    id: "ds-divisions",
    title: "Divisional Secretariats",
    shortTitle: "DS Divisions",
    description: "330 divisional secretariat divisions.",
    category: "admin",
    status: "ready",
    path: "/geo/ds-divisions.geojson",
    featureCount: 330,
    source: { name: "geoBoundaries (ADM3)", url: "https://www.geoboundaries.org/" },
    license: "CC BY 3.0 IGO",
  },
  {
    id: "gn-divisions",
    title: "Grama Niladhari Divisions",
    shortTitle: "GN Divisions",
    description: "≈14,000 Grama Niladhari divisions (deferred — requires vector tiles).",
    category: "admin",
    status: "pending",
    source: { name: "geoBoundaries (ADM4)", url: "https://www.geoboundaries.org/" },
    license: "CC BY 3.0 IGO",
  },
  {
    id: "electoral-divisions",
    title: "Electoral divisions",
    shortTitle: "Electoral",
    description:
      "22 electoral districts that elect Members of Parliament to the Sri Lankan Parliament.",
    category: "electoral",
    status: "ready",
    path: "/geo/electoral-divisions.geojson",
    featureCount: 22,
    source: {
      name: "Sri Lanka Survey Department via nuuuwan/sl-topojson",
      url: "https://github.com/nuuuwan/sl-topojson",
    },
    license: "Open data (via nuuuwan)",
  },
  {
    id: "polling-divisions",
    title: "Polling divisions",
    shortTitle: "Polling",
    description:
      "160 polling divisions — the finer-grained subdivisions that together make up each electoral district.",
    category: "electoral",
    status: "ready",
    path: "/geo/polling-divisions.geojson",
    featureCount: 160,
    source: {
      name: "Sri Lanka Survey Department via nuuuwan/sl-topojson",
      url: "https://github.com/nuuuwan/sl-topojson",
    },
    license: "Open data (via nuuuwan)",
  },
  {
    id: "pres-2024",
    title: "2024 presidential results",
    shortTitle: "Pres 2024",
    description:
      "Color each electoral division by the winning party in the 22 September 2024 presidential election. Underlying vote counts appear in the info panel.",
    category: "electoral",
    status: "ready",
    kind: "choropleth",
    featureCount: 22,
    source: {
      name: "Election Commission of Sri Lanka via nuuuwan/lk_elections",
      url: "https://github.com/nuuuwan/lk_elections",
    },
    license: "Open data",
  },
  {
    id: "population-choropleth",
    title: "Population density",
    shortTitle: "Pop. density",
    description:
      "Color districts by population per km² using a graduated orange scale.",
    category: "population",
    status: "ready",
    kind: "choropleth",
    featureCount: 25,
    source: {
      name: "OCHA — Sri Lanka Subnational Population Statistics (HDX)",
      url: "https://data.humdata.org/dataset/cod-ps-lka",
    },
    license: "CC BY-IGO",
  },
  {
    id: "population-extrusion",
    title: "3D population columns",
    shortTitle: "3D population",
    description:
      "Extrude each district to a height proportional to population. Camera tilts automatically when enabled.",
    category: "population",
    status: "ready",
    kind: "extrusion",
    featureCount: 25,
    source: {
      name: "OCHA — Sri Lanka Subnational Population Statistics (HDX)",
      url: "https://data.humdata.org/dataset/cod-ps-lka",
    },
    license: "CC BY-IGO",
  },
  {
    id: "demographics-ethnicity",
    title: "Ethnicity and religion",
    shortTitle: "Ethnicity",
    description:
      "Ethnic and religious composition (2012 census) — shown in the info panel for provinces and districts.",
    category: "population",
    status: "ready",
    kind: "embedded",
    featureCount: 25,
    source: {
      name: "Dept. of Census & Statistics (2012)",
      url: "http://www.statistics.gov.lk/",
    },
    license: "Open data",
  },
  {
    id: "cities",
    title: "Cities and towns",
    shortTitle: "Cities",
    description:
      "Populated places from OpenStreetMap. Labels gate by zoom — only cities at country view, towns mid-zoom, suburbs when zoomed in.",
    category: "infrastructure",
    status: "ready",
    path: "/geo/cities.geojson",
    featureCount: 553,
    source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    license: "ODbL",
  },
  {
    id: "roads",
    title: "Road network",
    shortTitle: "Roads",
    description:
      "Motorway, trunk, primary and secondary roads. Widths scale with zoom.",
    category: "infrastructure",
    status: "ready",
    path: "/geo/roads.geojson",
    featureCount: 11252,
    source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    license: "ODbL",
  },
  {
    id: "railways",
    title: "Railways",
    shortTitle: "Railways",
    description:
      "Rail lines (rail + narrow gauge) and train stations / halts.",
    category: "infrastructure",
    status: "ready",
    path: "/geo/railways.geojson",
    featureCount: 1618,
    source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    license: "ODbL",
  },
  {
    id: "airports",
    title: "Airports and airfields",
    shortTitle: "Airports",
    description: "Civilian and military aerodromes across Sri Lanka.",
    category: "infrastructure",
    status: "ready",
    path: "/geo/airports.geojson",
    featureCount: 30,
    source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    license: "ODbL",
  },
  {
    id: "hospitals",
    title: "Hospitals and clinics",
    shortTitle: "Hospitals",
    description: "Healthcare facilities (hospital + clinic).",
    category: "infrastructure",
    status: "ready",
    path: "/geo/hospitals.geojson",
    featureCount: 1228,
    source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    license: "ODbL",
  },
  {
    id: "education",
    title: "Schools and universities",
    shortTitle: "Education",
    description:
      "Schools, colleges and universities. Larger dots for tertiary institutions.",
    category: "infrastructure",
    status: "ready",
    path: "/geo/education.geojson",
    featureCount: 5390,
    source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    license: "ODbL",
  },
  {
    id: "waterways",
    title: "Rivers and water bodies",
    shortTitle: "Waterways",
    description:
      "Rivers (lines) plus reservoirs, lakes and large tanks (polygons). Small unnamed ponds filtered out.",
    category: "environment",
    status: "ready",
    path: "/geo/waterways.geojson",
    featureCount: 3919,
    source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    license: "ODbL",
  },
  {
    id: "protected-areas",
    title: "Protected areas",
    shortTitle: "Protected",
    description:
      "National parks, protected areas and nature reserves (ways only — relations excluded).",
    category: "environment",
    status: "ready",
    path: "/geo/protected-areas.geojson",
    featureCount: 66,
    source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    license: "ODbL",
  },
  {
    id: "land-cover",
    title: "Land cover",
    shortTitle: "Land cover",
    description: "10m global land cover from ESA WorldCover.",
    category: "environment",
    status: "pending",
    source: { name: "ESA WorldCover", url: "https://esa-worldcover.org/" },
    license: "CC BY 4.0",
  },
  {
    id: "elevation",
    title: "Elevation (DEM)",
    shortTitle: "Elevation",
    description: "Digital elevation model at 30m resolution.",
    category: "environment",
    status: "pending",
    source: { name: "Copernicus DEM", url: "https://spacedata.copernicus.eu/" },
    license: "Copernicus",
  },
]

export function datasetsByCategory(category: DatasetCategory) {
  return CATALOG.filter((d) => d.category === category)
}

export function readyDatasets() {
  return CATALOG.filter((d) => d.status === "ready")
}

export function getDataset(id: string) {
  return CATALOG.find((d) => d.id === id)
}

export type IconMap = Record<DatasetCategory, Icon>

export const CATEGORY_ICONS: IconMap = {
  admin: IconBuildingCommunity,
  electoral: IconBallpen,
  population: IconUsers,
  infrastructure: IconBuildingSkyscraper,
  environment: IconLeaf,
  economy: IconCurrencyDollar,
}
