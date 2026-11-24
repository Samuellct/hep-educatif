// Copies the study samples and downloads the Phoenix detector geometries into public/.
// Neither is tracked by git: samples come from ../samples (CERN Open Data, CC0),
// geometries from the HSF/phoenix repository (Apache-2.0) at a pinned commit.
import { mkdir, copyFile, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samples = join(root, "..", "samples");
const events = join(root, "public", "events");
const geometry = join(root, "public", "geometry");

const PHOENIX_COMMIT = "4cf4a57d2c";
const PHOENIX_GEOMETRY = `https://raw.githubusercontent.com/HSF/phoenix/${PHOENIX_COMMIT}/packages/phoenix-ng/projects/phoenix-app/src/assets/geometry`;
const GEOMETRY_FILES = [
  "CMS/cms.json.gz",
  "ATLAS/Lar-Barrel.gltf.zip",
  "ATLAS/Tile-Barrel.gltf.zip",
  "ATLAS/Muon-Barrel-Middle.gltf.zip",
  "ATLAS/Barrel-Toroid.gltf.zip",
  "ATLAS/Pixel.gltf.zip",
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

await mkdir(events, { recursive: true });
for (const name of ["diphoton.ig", "4lepton.ig"]) {
  await copyFile(join(samples, name), join(events, name));
}
const zpath = await JSZip.loadAsync(await readFile(join(samples, "groupA.zip")));
await writeFile(join(events, "atlas_zpath_event001.xml"), await zpath.file("event001.xml").async("nodebuffer"));

for (const file of GEOMETRY_FILES) {
  const target = join(geometry, file);
  if (await exists(target)) continue;
  const response = await fetch(`${PHOENIX_GEOMETRY}/${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}
console.log(`events: 3 files in ${events}; geometry: ${GEOMETRY_FILES.length} files in ${geometry}`);
