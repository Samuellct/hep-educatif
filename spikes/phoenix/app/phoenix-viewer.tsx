"use client";

import { useEffect, useRef, useState } from "react";
import { CMSLoader, EventDisplay, JiveXMLLoader, type Configuration } from "phoenix-event-display";
import { addMissingCollections } from "./ig-extras";
import { SOURCES, type SourceId } from "./sources";
import { encodeView, type ViewState } from "./view-state";
import styles from "./page.module.css";

type Selected = { name: string; attributes: { attributeName: string; attributeValue: unknown }[] };
type Item = { collection: string; index: number; uuid: string };

const CAMERA_PRESETS: Record<string, { position: number[]; target: number[] }> = {
  Side: { position: [0, 0, 12000], target: [0, 0, 0] },
  Front: { position: [12000, 0, 0], target: [0, 0, 0] },
  Top: { position: [-500, 12000, 0], target: [0, 0, 0] },
};

export default function PhoenixViewer({ source, initialView }: { source: SourceId; initialView: ViewState | null }) {
  const displayRef = useRef<EventDisplay | null>(null);
  const selectedRef = useRef<Selected>({ name: "", attributes: [] });
  const [eventKeys, setEventKeys] = useState<string[]>([]);
  const [eventKey, setEventKey] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [metrics, setMetrics] = useState<{ eventMs?: number; geometryMs?: number; fps?: number }>({});
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const t0 = performance.now();
    const config = SOURCES[source];
    const display = new EventDisplay();
    displayRef.current = display;
    const loader = config.experiment === "CMS" ? new CMSLoader() : new JiveXMLLoader(config.thickTracks);
    const configuration: Configuration = {
      eventDataLoader: loader,
      defaultView: [4000, 0, 4000, 0, 0, 0],
      elementId: "eventDisplay",
      allowUrlOptions: false,
      enableDatGUIMenu: false,
    };
    display.init(configuration);
    display.enableSelecting(true);
    display.allowSelection(selectedRef.current);
    const stopSelection = display.getActiveObjectId().onUpdate(() => {
      // Phoenix fills the attributes right after updating the active id.
      setTimeout(() => setSelected({ ...selectedRef.current, attributes: [...selectedRef.current.attributes] }), 0);
    });

    // Exposed for the measurement scripts of the study.
    (window as unknown as { __phoenix?: EventDisplay }).__phoenix = display;
    const geometryLoads = config.geometry.map((geometry) =>
      geometry.kind === "root-json"
        ? display.loadRootJSONGeometry(geometry.url, geometry.name, undefined, geometry.scale, true)
        : display.loadGLTFGeometry(geometry.url, geometry.name, geometry.menu, geometry.scale),
    );
    void Promise.all(geometryLoads).then(() => {
      const geometryMs = Math.round(performance.now() - t0);
      setMetrics((m) => ({ ...m, geometryMs }));
    });

    const onEvents = (keys: string[]) => {
      setEventKeys(keys);
      const key = initialView?.event && keys.includes(initialView.event) ? initialView.event : keys[0];
      showEvent(display, key);
      requestAnimationFrame(() => {
        const eventMs = Math.round(performance.now() - t0);
        setMetrics((m) => ({ ...m, eventMs }));
      });
      if (initialView) applyView(display, initialView);
    };

    if (loader instanceof CMSLoader) {
      loader.readIgArchive(config.eventUrl, (allEvents: unknown[]) => {
        const events = loader.getAllEventsData(allEvents);
        onEvents(display.parsePhoenixEvents(addMissingCollections(allEvents as never, events)));
      });
    } else {
      void fetch(config.eventUrl)
        .then((response) => response.text())
        .then((xml) => {
          const jive = loader as JiveXMLLoader;
          jive.process(xml);
          onEvents(display.parsePhoenixEvents({ [config.label]: jive.getEventData() }));
        });
    }

    let frames = 0;
    let frameStart = performance.now();
    let raf = 0;
    const count = () => {
      frames += 1;
      const now = performance.now();
      if (now - frameStart >= 5000) {
        const fps = Math.round((frames * 1000) / (now - frameStart));
        setMetrics((m) => ({ ...m, fps }));
        frames = 0;
        frameStart = now;
      }
      raf = requestAnimationFrame(count);
    };
    raf = requestAnimationFrame(count);

    return () => {
      cancelAnimationFrame(raf);
      stopSelection();
      display.cleanup();
      displayRef.current = null;
    };
    // initialView is read once at mount; the source change remounts the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  function showEvent(display: EventDisplay, key: string) {
    display.loadEvent(key);
    setEventKey(key);
    setSelected(null);
    setActiveItem(null);
    const collections = display.getCollections();
    const next: Item[] = [];
    for (const names of Object.values(collections)) {
      for (const collection of names) {
        const objects = display.getCollection(collection) as { uuid?: string }[];
        objects.forEach((object, index) => {
          if (object?.uuid) next.push({ collection, index, uuid: object.uuid });
        });
      }
    }
    setItems(next);
  }

  function applyView(display: EventDisplay, view: ViewState) {
    display.getStateManager().loadStateFromJSON({
      eventDisplay: { cameraPosition: view.cameraPosition, cameraTarget: view.cameraTarget },
    });
    if (view.selection) {
      const objects = display.getCollection(view.selection.collection) as { uuid?: string }[];
      const uuid = objects?.[view.selection.index]?.uuid;
      if (uuid) {
        display.highlightObject(uuid);
        setActiveItem({ ...view.selection, uuid });
      }
    }
  }

  function highlight(item: Item) {
    displayRef.current?.lookAtObject(item.uuid);
    setActiveItem(item);
  }

  function moveCamera(name: string) {
    const preset = CAMERA_PRESETS[name];
    displayRef.current?.getThreeManager().animateCameraTransform(preset.position, preset.target, 800);
  }

  async function copyView() {
    const display = displayRef.current;
    if (!display || !eventKey) return;
    const state = display.getStateManager().getStateAsJSON().eventDisplay;
    const view: ViewState = {
      source,
      event: eventKey,
      cameraPosition: state.cameraPosition,
      cameraTarget: state.cameraTarget,
      selection: activeItem ? { collection: activeItem.collection, index: activeItem.index } : undefined,
    };
    const url = `${location.origin}${location.pathname}#view=${encodeView(view)}`;
    history.replaceState(null, "", url);
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(url);
  }

  return (
    <div className={styles.layout}>
      <div id="eventDisplay" className={styles.canvas} />
      <aside className={styles.panel}>
        <section>
          <h2>Event</h2>
          <select
            aria-label="Event"
            value={eventKey ?? ""}
            onChange={(e) => displayRef.current && showEvent(displayRef.current, e.target.value)}
          >
            {eventKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </section>
        <section>
          <h2>Camera</h2>
          {Object.keys(CAMERA_PRESETS).map((name) => (
            <button key={name} type="button" onClick={() => moveCamera(name)}>
              {name}
            </button>
          ))}
        </section>
        <section>
          <h2>Objects ({items.length})</h2>
          <ul className={styles.items} data-testid="object-list">
            {items.slice(0, 200).map((item) => (
              <li key={item.uuid}>
                <button
                  type="button"
                  aria-pressed={activeItem?.uuid === item.uuid}
                  onClick={() => highlight(item)}
                >
                  {item.collection} #{item.index}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section data-testid="selection">
          <h2>Selection</h2>
          {selected?.name ? (
            <dl>
              <dt>Name</dt>
              <dd>{selected.name}</dd>
              {selected.attributes.slice(0, 12).map((a) => (
                <div key={a.attributeName}>
                  <dt>{a.attributeName}</dt>
                  <dd>{String(a.attributeValue)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>{activeItem ? `${activeItem.collection} #${activeItem.index}` : "None"}</p>
          )}
        </section>
        <section>
          <h2>View state</h2>
          <button type="button" onClick={copyView}>
            Copy view link
          </button>
          {copied && <p className={styles.url} data-testid="view-url">{copied}</p>}
        </section>
        <section data-testid="metrics">
          <h2>Metrics</h2>
          <p>Event shown: {metrics.eventMs ?? "…"} ms</p>
          <p>Geometry loaded: {metrics.geometryMs ?? "…"} ms</p>
          <p>FPS (5 s): {metrics.fps ?? "…"}</p>
        </section>
      </aside>
    </div>
  );
}

