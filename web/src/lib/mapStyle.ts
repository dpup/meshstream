import type { StyleSpecification } from "maplibre-gl";

const CARTO_TILES = [
  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
];

const CARTO_SOURCE = {
  type: "raster" as const,
  tiles: CARTO_TILES,
  tileSize: 256,
  attribution:
    '© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  maxzoom: 19,
};

/** Base CartoDB Dark Matter style — raster tiles, no labels */
export const CARTO_DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: { carto: CARTO_SOURCE },
  layers: [{ id: "carto-dark", type: "raster", source: "carto" }],
};

/** CartoDB Dark Matter style with glyph support for GL text labels */
export const CARTO_DARK_STYLE_LABELLED: StyleSpecification = {
  version: 8,
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: { carto: CARTO_SOURCE },
  layers: [{ id: "carto-dark", type: "raster", source: "carto" }],
};
