"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SOURCES, type SourceId } from "./sources";
import { decodeView, type ViewState } from "./view-state";
import styles from "./page.module.css";

// Phoenix touches window and WebGL at import time: client only, no prerender.
const PhoenixViewer = dynamic(() => import("./phoenix-viewer"), { ssr: false });

export default function ViewerLoader() {
  const [state, setState] = useState<{ source: SourceId; view: ViewState | null } | null>(null);

  useEffect(() => {
    const view = decodeView(location.hash);
    setState({ source: view?.source ?? "cms-diphoton", view });
  }, []);

  if (!state) return null;
  const spec = SOURCES[state.source];
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <label>
          Source{" "}
          <select
            value={state.source}
            onChange={(e) => {
              history.replaceState(null, "", location.pathname);
              setState({ source: e.target.value as SourceId, view: null });
            }}
          >
            {Object.entries(SOURCES).map(([id, s]) => (
              <option key={id} value={id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <a href={spec.record}>{spec.experiment} Open Data, CC0</a>
      </header>
      <PhoenixViewer key={state.source} source={state.source} initialView={state.view} />
    </main>
  );
}
