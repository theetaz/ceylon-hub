# Ceylon Hub

An open-source, interactive GIS web application that aggregates and visualizes geospatial and demographic data for Sri Lanka — provinces, districts, divisional secretariats, cities, postal codes, population distribution, demographics and more.

Built entirely on open data and open-source technology.

## Goals

- Provide a single, beautiful interface to explore Sri Lanka's geospatial and statistical data.
- Keep every data source and every dependency open.
- Prioritize modern UX with fast, interactive 2D and 3D map experiences.

## Tech stack

- **Frontend:** React 19 + Vite + TypeScript
- **UI:** shadcn/ui + Tailwind CSS v4
- **Maps:** MapLibre GL JS (OpenStreetMap-based, Mapbox-free)
- **Data viz:** deck.gl for layered geospatial visualizations
- **3D:** Three.js for cinematic scenes and custom 3D representations
- **Charts:** to be decided (Apache ECharts / Recharts)
- **Tiles:** PMTiles for static vector tile hosting
- **Data pipeline:** Python + GeoPandas (planned)

## Data sources (planned)

- [OpenStreetMap](https://www.openstreetmap.org/) — base map, roads, POIs
- [GADM](https://gadm.org/) — administrative boundaries
- [Department of Census and Statistics, Sri Lanka](http://www.statistics.gov.lk/) — population and demographics
- [Humanitarian Data Exchange](https://data.humdata.org/group/lka) — humanitarian datasets
- [WorldPop](https://www.worldpop.org/) — high-resolution population
- [Copernicus / SRTM](https://www.copernicus.eu/) — elevation and terrain

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint
- `npm run format` — format with Prettier
- `npm run typecheck` — TypeScript-only check

## Status

Early-stage scaffolding. See issues and commits for progress.

## License

[MIT](./LICENSE)
