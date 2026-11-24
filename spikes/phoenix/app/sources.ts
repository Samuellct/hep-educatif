export type GeometrySpec =
  | { kind: "root-json"; url: string; name: string; scale: number }
  | { kind: "gltf"; url: string; name: string; menu: string; scale: number };

export type SourceSpec = {
  label: string;
  experiment: "CMS" | "ATLAS";
  eventUrl: string;
  record: string;
  thickTracks?: string[];
  geometry: GeometrySpec[];
};

const ATLAS_GEOMETRY: GeometrySpec[] = [
  { kind: "gltf", url: "/geometry/ATLAS/Pixel.gltf.zip", name: "Pixel", menu: "Inner detector", scale: 1000 },
  { kind: "gltf", url: "/geometry/ATLAS/Lar-Barrel.gltf.zip", name: "LAr Barrel", menu: "Calorimeters", scale: 1000 },
  { kind: "gltf", url: "/geometry/ATLAS/Tile-Barrel.gltf.zip", name: "Tile Barrel", menu: "Calorimeters", scale: 1000 },
  { kind: "gltf", url: "/geometry/ATLAS/Muon-Barrel-Middle.gltf.zip", name: "Muon Barrel Middle", menu: "Muon", scale: 1000 },
  { kind: "gltf", url: "/geometry/ATLAS/Barrel-Toroid.gltf.zip", name: "Barrel Toroid", menu: "Magnets", scale: 1000 },
];

export const SOURCES = {
  "cms-diphoton": {
    label: "CMS H → γγ candidates",
    experiment: "CMS",
    eventUrl: "/events/diphoton.ig",
    record: "https://opendata.cern.ch/record/300",
    geometry: [{ kind: "root-json", url: "/geometry/CMS/cms.json.gz", name: "CMS Detector", scale: 10 }],
  },
  "cms-4lepton": {
    label: "CMS H → 4ℓ candidates",
    experiment: "CMS",
    eventUrl: "/events/4lepton.ig",
    record: "https://opendata.cern.ch/record/300",
    geometry: [{ kind: "root-json", url: "/geometry/CMS/cms.json.gz", name: "CMS Detector", scale: 10 }],
  },
  "atlas-zpath": {
    label: "ATLAS Z-Path event 001",
    experiment: "ATLAS",
    eventUrl: "/events/atlas_zpath_event001.xml",
    record: "https://opendata.cern.ch/record/353",
    thickTracks: ["CombinedMuonTracks", "MuonSpectrometerTracks", "CombinedInDetTracks", "Muons_xAOD"],
    geometry: ATLAS_GEOMETRY,
  },
} satisfies Record<string, SourceSpec>;

export type SourceId = keyof typeof SOURCES;
