# Phoenix spike

Throwaway prototype: `phoenix-event-display` rendered client-side in Next.js, driven by a React panel (object selection, highlighting, camera presets, view state serialised in the URL hash). It will be removed once the explorer scenes exist.

```sh
pnpm install
pnpm assets   # copies ../samples and downloads detector geometries from HSF/phoenix (Apache-2.0)
pnpm dev
```

Event files come from CERN Open Data (CC0): CMS record 300 (`diphoton.ig`, `4lepton.ig`) and ATLAS record 353 (`groupA.zip`, JiveXML). They are not tracked; `pnpm assets` expects them in `../samples`.
