import { SOURCES, type SourceId } from "./sources";

export type ViewState = {
  source: SourceId;
  event: string;
  cameraPosition: number[];
  cameraTarget: number[];
  selection?: { collection: string; index: number };
};

export function encodeView(view: ViewState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(view));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeView(hash: string): ViewState | null {
  const match = /view=([A-Za-z0-9_-]+)/.exec(hash);
  if (!match) return null;
  try {
    const base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const view = JSON.parse(new TextDecoder().decode(bytes)) as ViewState;
    return view.source in SOURCES ? view : null;
  } catch {
    return null;
  }
}
