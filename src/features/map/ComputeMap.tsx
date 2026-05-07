import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo, useRef } from 'react';
import Map, { Layer, Marker, Source } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { EntityType } from '../../data/types';
import type { EntityCrossRef, EntityLevel } from '../../data/types';
import { useCountryGeometry, useCrossRef, useLatestIndex } from '../../data/queries';
import { useExplorerStore } from '../../store/explorer-store';
import { joinCountryScores } from './country-join';
import { childrenForSelection, companyOverlays } from './drilldown';
import type { DrilldownChild } from './drilldown';

const mapStyle = 'https://demotiles.maplibre.org/style.json';

type CountryFeature = Feature<Geometry, Record<string, unknown>>;
type CountryCollection = FeatureCollection<Geometry, Record<string, unknown>>;

const entityCoordinates: Record<string, { longitude: number; latitude: number }> = {
  us: { longitude: -98, latitude: 39 },
  cn: { longitude: 104, latitude: 35 },
  de: { longitude: 10, latitude: 51 },
  gb: { longitude: -2, latitude: 54 },
  jp: { longitude: 138, latitude: 36 },
  in: { longitude: 78, latitude: 22 },
  sg: { longitude: 103.82, latitude: 1.35 },
  nl: { longitude: 5.3, latitude: 52.1 },
  ie: { longitude: -8, latitude: 53 },
  ca: { longitude: -106, latitude: 56 },
  br: { longitude: -52, latitude: -10 },
  be: { longitude: 4.6, latitude: 50.6 },
  tw: { longitude: 121, latitude: 23.7 },
  au: { longitude: 134, latitude: -25 },
  ashburn: { longitude: -77.49, latitude: 39.04 },
  portland: { longitude: -122.68, latitude: 45.52 },
  dublin: { longitude: -6.26, latitude: 53.35 },
  frankfurt: { longitude: 8.68, latitude: 50.11 },
  tokyo: { longitude: 139.76, latitude: 35.68 },
  singapore: { longitude: 103.82, latitude: 1.35 },
  'sao-paulo': { longitude: -46.63, latitude: -23.55 },
  amsterdam: { longitude: 4.9, latitude: 52.37 },
  pune: { longitude: 73.86, latitude: 18.52 },
  toronto: { longitude: -79.38, latitude: 43.65 },
  london: { longitude: -0.13, latitude: 51.51 },
  shanghai: { longitude: 121.47, latitude: 31.23 },
  'council-bluffs': { longitude: -95.86, latitude: 41.26 },
  'st-ghislain': { longitude: 3.82, latitude: 50.45 },
  changhua: { longitude: 120.54, latitude: 24.08 },
  dallas: { longitude: -96.8, latitude: 32.78 },
  'san-jose': { longitude: -121.89, latitude: 37.34 },
  mumbai: { longitude: 72.88, latitude: 19.08 },
  osaka: { longitude: 135.5, latitude: 34.69 },
  sydney: { longitude: 151.21, latitude: -33.87 },
};

function hashRoute(level: EntityLevel, id: string) {
  return `#/entity/${level}/${encodeURIComponent(id)}`;
}

function safeRouteLevel(level: EntityLevel) {
  return [EntityType.COUNTRY, EntityType.CITY, EntityType.CLOUD_REGION, EntityType.COMPANY, 'data-center-cluster'].includes(level);
}

function updateHash(level: EntityLevel, id: string) {
  if (safeRouteLevel(level) && id) {
    window.location.hash = hashRoute(level, id).slice(1);
  }
}

function coordinateForChild(child: DrilldownChild, crossRef: EntityCrossRef) {
  if (child.level === 'data-center-cluster') {
    return entityCoordinates[child.city] ?? entityCoordinates[child.country];
  }

  if (child.level === EntityType.CLOUD_REGION) {
    const region = crossRef.cloudRegions[child.id];
    return entityCoordinates[region?.city ?? child.id] ?? entityCoordinates[region?.country ?? child.id];
  }

  if (child.level === EntityType.COMPANY) {
    return entityCoordinates[child.country ?? 'us'];
  }

  return entityCoordinates[child.id] ?? entityCoordinates[child.country ?? child.id];
}

function fitCountry(map: MapRef | null, countryId: string) {
  const center = entityCoordinates[countryId] ?? { longitude: 0, latitude: 20 };
  map?.flyTo?.({ center: [center.longitude, center.latitude], zoom: countryId === 'us' ? 3 : 4, duration: 650 });
}

function selectedLabel(level: EntityLevel, selectedId: string | null, crossRef: EntityCrossRef | undefined) {
  if (!selectedId || !crossRef) {
    return 'Global';
  }

  if (level === EntityType.COUNTRY) return crossRef.countries[selectedId]?.name ?? selectedId;
  if (level === EntityType.CITY) return crossRef.cities[selectedId]?.name ?? selectedId;
  if (level === EntityType.CLOUD_REGION) return selectedId;
  if (level === EntityType.COMPANY) return crossRef.companies[selectedId]?.name ?? selectedId;
  return selectedId;
}

function Breadcrumb({ level, selectedId }: { level: EntityLevel; selectedId: string | null }) {
  const labels: Record<EntityLevel, string> = {
    [EntityType.COUNTRY]: 'Country',
    [EntityType.CITY]: 'City',
    [EntityType.CLOUD_REGION]: 'Cloud Region',
    [EntityType.COMPANY]: 'Company',
    'data-center-cluster': 'Data Center Cluster',
  };

  return <p className="text-xs uppercase tracking-[0.08em] text-[var(--ca-cyan)]">Global{selectedId ? ` / ${labels[level]}` : ''}</p>;
}

export function ComputeMap() {
  const mapRef = useRef<MapRef>(null);
  const latest = useLatestIndex();
  const crossRef = useCrossRef();
  const countryGeometry = useCountryGeometry<CountryCollection>();
  const { level, selectedId, setSelection, setViewportIntent } = useExplorerStore();

  const joinedCountries = useMemo(() => {
    if (!countryGeometry.data || !crossRef.data || !latest.data) return null;
    return joinCountryScores(countryGeometry.data, crossRef.data, latest.data) as CountryCollection;
  }, [countryGeometry.data, crossRef.data, latest.data]);

  const nextSteps = useMemo(() => {
    if (!crossRef.data || !latest.data) return [];
    return childrenForSelection(level, selectedId, crossRef.data, latest.data);
  }, [crossRef.data, latest.data, level, selectedId]);

  const overlays = useMemo(() => (crossRef.data ? companyOverlays(crossRef.data) : []), [crossRef.data]);

  function selectEntity(nextLevel: EntityLevel, id: string) {
    setSelection(nextLevel, id);
    setViewportIntent(nextLevel === EntityType.COUNTRY ? { type: 'fit-country', id } : { type: 'focus-entity', id });
    updateHash(nextLevel, id);
  }

  function handleCountryClick(event: { features?: CountryFeature[] }) {
    const id = event.features?.[0]?.properties?.computeAtlasId;
    if (typeof id !== 'string') return;

    fitCountry(mapRef.current, id);
    setViewportIntent({ type: 'fit-country', id });
    setSelection(EntityType.COUNTRY, id);
    updateHash(EntityType.COUNTRY, id);
  }

  if (latest.isLoading || crossRef.isLoading || countryGeometry.isLoading) {
    return <div className="flex h-full min-h-[560px] items-center justify-center font-mono text-sm text-[var(--ca-cyan)]">Loading compute index</div>;
  }

  if (latest.isError || crossRef.isError || countryGeometry.isError || !joinedCountries || !crossRef.data) {
    return <div className="flex h-full min-h-[560px] items-center justify-center font-mono text-sm text-amber-300">Compute data could not load. Check the static data files, then retry or continue with the last committed dataset.</div>;
  }

  return (
    <section className="relative h-full min-h-[560px] overflow-hidden rounded-3xl" aria-label="ComputeAtlas MapLibre choropleth explorer">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 0, latitude: 22, zoom: 1.15 }}
        mapStyle={mapStyle}
        interactiveLayerIds={['country-score-fill']}
        onClick={handleCountryClick}
        style={{ height: '100%', minHeight: 560 }}
      >
        <Source id="countries" type="geojson" data={joinedCountries}>
          <Layer
            id="country-score-fill"
            type="fill"
            paint={{
              'fill-color': ['interpolate', ['linear'], ['get', 'score'], 0, '#10202a', 50, '#22D3EE', 100, '#22C55E'],
              'fill-opacity': ['case', ['get', 'hasComputeSignal'], 0.74, 0.28],
            }}
          />
          <Layer id="country-score-outline" type="line" paint={{ 'line-color': '#22D3EE', 'line-opacity': 0.24, 'line-width': 1 }} />
        </Source>

        {nextSteps.map((child) => {
          const coordinate = coordinateForChild(child, crossRef.data);
          if (!coordinate) return null;
          const isCluster = child.level === 'data-center-cluster';

          return (
            <Marker key={`${child.level}-${child.id}`} longitude={coordinate.longitude} latitude={coordinate.latitude} anchor="bottom">
              <button
                className={`rounded-full border px-2 py-1 font-mono text-[10px] font-semibold shadow-lg ${
                  isCluster
                    ? 'border-amber-300/70 bg-amber-400/20 text-amber-100'
                    : 'border-cyan-300/60 bg-slate-950/80 text-cyan-100'
                }`}
                onClick={() => selectEntity(child.level, child.id)}
                type="button"
              >
                {isCluster ? 'modeled cluster proxy' : child.label}
              </button>
            </Marker>
          );
        })}

        {overlays.map((overlay) => {
          const coordinate = coordinateForChild(overlay, crossRef.data);
          if (!coordinate) return null;

          return (
            <Marker key={overlay.id} longitude={coordinate.longitude} latitude={coordinate.latitude} anchor="top">
              <button
                className="rounded-full border border-emerald-300/50 bg-emerald-400/15 px-2 py-1 font-mono text-[10px] font-semibold text-emerald-100"
                onClick={() => selectEntity(EntityType.COMPANY, overlay.id)}
                title={overlay.description}
                type="button"
              >
                {overlay.label} — AI CapEx signal
              </button>
            </Marker>
          );
        })}
      </Map>

      <aside className="absolute left-4 top-4 max-h-[calc(100%-2rem)] w-[min(360px,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-[var(--ca-border)] bg-[rgba(11,17,32,0.86)] p-4 font-mono shadow-2xl backdrop-blur">
        <Breadcrumb level={level} selectedId={selectedId} />
        <h2 className="mt-2 text-lg font-semibold text-[var(--ca-text)]">{selectedLabel(level, selectedId, crossRef.data)}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ca-muted)]">
          Country clicks are zoom-first, then this rail exposes city, cloud-region, company, and data-center-cluster next steps.
        </p>

        <div className="mt-4 space-y-2">
          {nextSteps.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm text-[var(--ca-muted)]">Select a country or cloud region to reveal drill-down next steps.</p>
          ) : (
            nextSteps.map((child) => (
              <button
                className="w-full rounded-xl border border-white/10 bg-white/[0.045] p-3 text-left text-sm text-[var(--ca-text)] transition hover:border-[var(--ca-border-strong)] hover:text-[var(--ca-cyan)]"
                key={`${child.level}-rail-${child.id}`}
                onClick={() => selectEntity(child.level, child.id)}
                type="button"
              >
                <span className="block text-xs uppercase tracking-[0.08em] text-[var(--ca-muted)]">{child.level}</span>
                <span className="mt-1 block font-semibold">{child.label}</span>
                {child.level === 'data-center-cluster' ? (
                  <span className="mt-1 block text-xs leading-5 text-amber-200">{child.description}</span>
                ) : null}
              </button>
            ))
          )}
        </div>

        <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
          Company overlays are symbolic AI CapEx signal markers for corporate compute influence, not an exact facility location.
        </div>
      </aside>
    </section>
  );
}
