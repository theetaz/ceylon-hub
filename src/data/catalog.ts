import {
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
  | "population"
  | "infrastructure"
  | "environment"
  | "economy"

export type DatasetStatus = "ready" | "pending"

export type Dataset = {
  id: string
  title: string
  shortTitle: string
  description: string
  category: DatasetCategory
  status: DatasetStatus
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
    id: "population-choropleth",
    title: "Population density",
    shortTitle: "Pop. density",
    description:
      "Color districts by population per km² using a graduated orange scale.",
    category: "population",
    status: "ready",
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
    description: "Ethnic and religious composition by district (pending).",
    category: "population",
    status: "pending",
    source: {
      name: "Dept. of Census & Statistics",
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
  population: IconUsers,
  infrastructure: IconBuildingSkyscraper,
  environment: IconLeaf,
  economy: IconCurrencyDollar,
}
