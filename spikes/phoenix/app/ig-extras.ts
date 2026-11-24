// The Phoenix CMSLoader skips the Photons_V1 and METs_V1 collections of an .ig event.
// This adds them to the Phoenix event data, in MeV like the loader's own clusters.
type RawIgEvent = {
  eventPath: string;
  Types: Record<string, [string, string][]>;
  Collections: Record<string, unknown[][]>;
};

function rows(event: RawIgEvent, collection: string): Record<string, unknown>[] {
  const fields = event.Types?.[collection];
  const values = event.Collections?.[collection];
  if (!fields || !values) return [];
  return values.map((row) => Object.fromEntries(fields.map(([name], i) => [name, row[i]])));
}

export function addMissingCollections(raw: RawIgEvent[], events: Record<string, Record<string, unknown>>) {
  for (const event of raw) {
    const target = events[event.eventPath];
    if (!target) continue;
    const photons = rows(event, "Photons_V1").map((p) => ({
      energy: Number(p.energy) * 1000,
      eta: Number(p.eta),
      phi: Number(p.phi),
      pT: Number(p.et) * 1000,
    }));
    if (photons.length) target.Photons = { Photons_V1: photons };
    const met = rows(event, "METs_V1").map((m) => ({ etx: Number(m.px) * 1000, ety: Number(m.py) * 1000 }));
    if (met.length) target.MissingEnergy = { METs_V1: met };
  }
  return events;
}
