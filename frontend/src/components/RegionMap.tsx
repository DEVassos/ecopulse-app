import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSourceSpecification, Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// O worker do MapLibre 6 é procurado ao lado do módulo, e o build do Vite não o copia: sem ele, o contorno dos países
// (GeoJSON) não aparece. `?worker&url` faz o Vite empacotar o worker como .js, extensão que o nginx serve como JavaScript
// (o .mjs sairia como application/octet-stream, recusado pelo navegador com o nosniff do nginx.conf).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { REGION_STATUSES } from '../services/regions.types';
import type { RegionStatus } from '../services/regions.types';
import { formatQuantity } from '../utils/units';
import { bubbleDiameter, IDLE_DOT, ringPercent } from '../utils/region-map';
import type { ListedRegion, RegionOverview } from '../utils/region-map';
import countries from './countries-110m.json';
import './RegionMap.css';

/**
 * Imagens de satélite: EOX Sentinel-2 cloudless 2025, licença CC BY-NC-SA 4.0 (ADR 0010). Livre para uso não comercial,
 * com o crédito no canto do mapa; uso comercial do EcoPulse exige licenciar as imagens com a EOX ou trocar a fonte.
 */
const SATELLITE_TILES = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg';
const SATELLITE_CREDIT =
  '<a href="https://cloudless.eox.at" target="_blank" rel="noopener noreferrer">EOxCloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)';

/** Visão geral: o globo enquadrando as Américas, a Europa e a África. */
const HOME = { center: [-40, 15] as [number, number], zoom: 1.7 };
/** Nível de cidade: a posição é da região, não do prédio (RF13), então o mapa não chega mais perto que isso. */
const REGION_ZOOM = 9;
const MAX_ZOOM = 11;
/** Altura de cruzeiro da viagem: o zoom em que o globo aparece inteiro. */
const CRUISE_ZOOM = 1.9;
/** Folga do anel de energia em volta da bolha, em px (a mesma do CSS). */
const RING_GAP = 9;

/** Os mesmos nomes do selo da tabela (StatusBadge): um estado, um nome em toda a página. */
const STATE_LABEL: Record<RegionStatus, string> = { ativo: 'Ativo', indisponivel: 'Indisponível', sem_metricas: 'Sem métricas' };

/** Uma região com coordenada: só ela vira bolha. As sem coordenada ficam na lista e no aviso "fora do mapa". */
type PlacedRegion = ListedRegion & { latitude: number; longitude: number };

interface View {
  center: [number, number];
  zoom: number;
  /** Chega sem inclinar a câmera (enquadramento de várias bolhas). */
  flat?: boolean;
}

interface Props {
  overview: RegionOverview;
  /** Região selecionada, a mesma da lista e da tabela (#342); o mapa viaja até ela. */
  selectedCode: string | null;
  /** Clique numa bolha separada: o Dashboard seleciona a região, ou desfaz a seleção se ela já estava escolhida. */
  onSelect: (code: string) => void;
  /** A última busca falhou: os números são da atualização anterior (#261). */
  stale?: boolean;
}

/** Curva de aceleração das etapas da viagem: parte e chega devagar. */
function smooth(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isPlaced(region: ListedRegion): region is PlacedRegion {
  return region.latitude !== null && region.longitude !== null;
}

function regionLabel(region: PlacedRegion): string {
  if (region.worstStatus === null && region.co2eGrams === null) {
    const grid = region.carbonIntensityGco2ePerKwh === null ? '' : `, rede com ${region.carbonIntensityGco2ePerKwh} gCO₂e/kWh`;
    return `${region.name}, sem serviço hoje${grid}`;
  }
  return [
    region.name,
    region.worstStatus === null ? null : STATE_LABEL[region.worstStatus],
    region.co2eGrams === null ? null : `${formatQuantity('co2e', region.co2eGrams)} de CO₂e`,
    region.energyKwh === null ? null : `${formatQuantity('energy', region.energyKwh)} de energia`,
  ].filter((part) => part !== null).join(', ');
}

/**
 * Mapa de bolhas do Dashboard (#322, RF13). Uma bolha por região com serviço: a cor é o pior estado, o tamanho é o CO₂e
 * e o anel amarelo é a energia. Regiões sem serviço são pontos neutros. A seleção é a mesma da lista de regiões e da
 * tabela (#342): escolher uma região em qualquer um dos três leva o mapa até ela. Sem imagens de satélite, o contorno
 * dos países aparece por baixo.
 */
export default function RegionMap({ overview, selectedCode, onSelect, stale = false }: Props) {
  const monitored = useMemo(() => overview.monitored.filter(isPlaced), [overview]);
  const regions = useMemo(() => [...monitored, ...overview.idle.filter(isPlaced)], [monitored, overview]);
  const maxCo2e = useMemo(() => Math.max(0, ...monitored.map((region) => region.co2eGrams ?? 0)), [monitored]);
  const maxEnergy = useMemo(() => Math.max(0, ...monitored.map((region) => region.energyKwh ?? 0)), [monitored]);

  const [zoomed, setZoomed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libraryRef = useRef<typeof import('maplibre-gl') | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; element: HTMLButtonElement }>());
  /** Cada viagem tem um número: uma etapa só continua se nenhuma viagem mais nova começou. */
  const flightRef = useRef(0);
  const bubbleClickRef = useRef<(code: string) => void>(() => {});
  const followRef = useRef<(code: string | null) => void>(() => {});
  /** Região da última viagem: a seleção só move o mapa quando muda, nunca a cada ciclo do polling. */
  const followedRef = useRef<string | null>(null);

  // O mapa nasce uma vez. A biblioteca vem por import dinâmico e o componente inteiro por React.lazy (Dashboard).
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const markers = markersRef.current;
    void (async () => {
      try {
        const library = await import('maplibre-gl');
        if (cancelled || !containerRef.current) return;
        library.setWorkerUrl(workerUrl);
        map = new library.Map({
          container: containerRef.current,
          center: HOME.center,
          zoom: HOME.zoom,
          maxZoom: MAX_ZOOM,
          // Crédito da EOX (ADR 0010) no modo automático do MapLibre, combinado com o Gabriel em 13/11: aberto no canto em
          // mapas a partir de 640 px; mais estreito (celular), atrás do botão "i", para não cobrir o mapa
          attributionControl: {},
          style: {
            version: 8,
            sources: {
              // Fundo sem internet (ADR 0010): contorno dos países da Natural Earth 1:110m (domínio público), embutido
              countries: { type: 'geojson', data: countries as GeoJSONSourceSpecification['data'] },
              satellite: { type: 'raster', tileSize: 256, maxzoom: 14, tiles: [SATELLITE_TILES], attribution: SATELLITE_CREDIT },
            },
            layers: [
              // Azul de oceano, e não preto: enquanto uma imagem carrega, a tela parece mar, e não apagada
              { id: 'space', type: 'background', paint: { 'background-color': '#0a1a2f' } },
              { id: 'countries-fill', type: 'fill', source: 'countries', paint: { 'fill-color': '#1a2a40' } },
              { id: 'countries-line', type: 'line', source: 'countries', paint: { 'line-color': '#3b4d6b', 'line-width': 0.8 } },
              // A imagem fica por cima: quando os tiles não chegam, o contorno aparece por baixo
              { id: 'satellite', type: 'raster', source: 'satellite' },
            ],
          },
        });
        map.addControl(new library.NavigationControl({ showCompass: false }), 'top-right');
        // Globo na visão geral; ao aproximar, o MapLibre passa sozinho para o plano
        map.on('style.load', () => map?.setProjection({ type: 'globe' }));
        map.on('error', (event) => {
          if ('sourceId' in event && event.sourceId === 'satellite') setTilesFailed(true);
        });
        map.on('sourcedata', (event) => {
          if (event.sourceId === 'satellite' && event.tile !== undefined) setTilesFailed(false);
        });
        if (!navigator.onLine) setTilesFailed(true);
        libraryRef.current = library;
        mapRef.current = map;
        setMapReady(true);
      } catch {
        // Sem WebGL ou sem a biblioteca: a lista de regiões continua com os dados de cada região
        if (!cancelled) setMapFailed(true);
      }
    })();
    const offline = () => setTilesFailed(true);
    window.addEventListener('offline', offline);
    return () => {
      cancelled = true;
      flightRef.current += 1;
      window.removeEventListener('offline', offline);
      map?.remove();
      mapRef.current = null;
      libraryRef.current = null;
      markers.clear();
    };
  }, []);

  /** Viagem em três tempos: sobe até o globo, gira até o destino e desce inclinando a câmera. */
  function goTo(view: View) {
    const map = mapRef.current;
    if (!map) return;
    flightRef.current += 1;
    map.stop();
    const landing = view.zoom > CRUISE_ZOOM + 1;
    const tilt = landing && !view.flat;
    const end = { center: view.center, zoom: view.zoom, pitch: tilt ? 50 : 0, bearing: tilt ? -12 : 0 };
    // "Reduzir movimento" ligado no sistema: salta em vez de voar
    if (prefersReducedMotion()) {
      map.jumpTo(end);
      return;
    }
    const flight = flightRef.current;
    const leg = (options: { center?: [number, number]; zoom: number; pitch: number; bearing: number; duration: number }, next?: () => void) => {
      map.once('moveend', () => {
        if (flight === flightRef.current && next) next();
      });
      map.easeTo({ ...options, easing: smooth, essential: true });
    };
    const from = map.getCenter();
    const deltaLongitude = Math.abs(((view.center[0] - from.lng + 540) % 360) - 180);
    const distance = deltaLongitude + Math.abs(view.center[1] - from.lat);
    // Destino vizinho e câmera já perto: não sobe até o globo, mas também não desliza no zoom de cidade (as imagens não
    // carregariam a tempo e a tela ficaria preta). O flyTo afasta no meio do caminho, na medida da distância, e desce.
    if (distance < 15 && map.getZoom() > CRUISE_ZOOM + 0.5) {
      map.once('moveend', () => {
        if (flight === flightRef.current) map.easeTo({ pitch: end.pitch, bearing: end.bearing, duration: 900, easing: smooth, essential: true });
      });
      map.flyTo({ center: end.center, zoom: end.zoom, pitch: 0, bearing: 0, curve: 1.6, speed: 0.9, essential: true });
      return;
    }
    const cruise = () =>
      leg({ center: view.center, zoom: CRUISE_ZOOM, pitch: 0, bearing: 0, duration: Math.round(900 + Math.min(2400, distance * 18)) }, () => {
        if (landing) leg({ ...end, duration: 3200 });
      });
    if (map.getZoom() <= CRUISE_ZOOM + 0.5) cruise();
    else leg({ zoom: CRUISE_ZOOM, pitch: 0, bearing: 0, duration: 1800 }, cruise);
  }

  /** Segue a seleção da página: viaja até a região escolhida, ou volta à visão geral quando a seleção é desfeita. */
  function follow(code: string | null) {
    const region = regions.find((item) => item.code === code);
    if (region) {
      setZoomed(true);
      goTo({ center: [region.longitude, region.latitude], zoom: REGION_ZOOM });
    } else if (followedRef.current !== null) {
      setZoomed(false);
      goTo(HOME);
    }
    followedRef.current = code;
  }

  /** "Visão geral": desfaz a seleção (o mapa volta pela seleção) ou, sem seleção, só afasta. */
  function showOverview() {
    if (selectedCode !== null) {
      onSelect(selectedCode);
      return;
    }
    setZoomed(false);
    goTo(HOME);
  }

  /**
   * Clique numa bolha. Se ela está encostada em outras na tela, o primeiro clique aproxima só o bastante para o grupo
   * se separar; com as bolhas separadas, o clique seleciona a região (na lista e na tabela também).
   */
  function clickBubble(code: string) {
    const map = mapRef.current;
    const library = libraryRef.current;
    if (!map || !library) return;
    const placed = regions.map((item) => ({
      region: item,
      point: map.project([item.longitude, item.latitude]),
      radius: (item.worstStatus === null && item.co2eGrams === null ? IDLE_DOT : bubbleDiameter(item.co2eGrams, maxCo2e)) / 2 + RING_GAP,
    }));
    const group = placed.filter((item) => item.region.code === code);
    for (let index = 0; index < group.length; index += 1) {
      for (const candidate of placed) {
        if (group.includes(candidate)) continue;
        const distance = Math.hypot(group[index].point.x - candidate.point.x, group[index].point.y - candidate.point.y);
        if (distance < group[index].radius + candidate.radius) group.push(candidate);
      }
    }
    if (group.length < 2) {
      onSelect(code);
      return;
    }
    const bounds = new library.LngLatBounds();
    for (const item of group) bounds.extend([item.region.longitude, item.region.latitude]);
    const camera = map.cameraForBounds(bounds, { padding: 110 });
    const center = bounds.getCenter();
    setZoomed(true);
    goTo({ center: [center.lng, center.lat], zoom: Math.min(camera?.zoom ?? 4, REGION_ZOOM), flat: true });
  }

  // As bolhas são elementos do MapLibre, fora da árvore do React: o clique delas chama sempre a função desta renderização
  useEffect(() => {
    bubbleClickRef.current = clickBubble;
    followRef.current = follow;
  });

  // A seleção mudou (na lista, na tabela ou numa bolha), ou o mapa acabou de abrir com uma região já escolhida
  useEffect(() => {
    if (mapReady && selectedCode !== followedRef.current) followRef.current(selectedCode);
  }, [mapReady, selectedCode]);

  // Bolhas em dia com os dados a cada ciclo, sem recriar o mapa: cria as que faltam, atualiza as outras, tira as que saíram
  useEffect(() => {
    const map = mapRef.current;
    const library = libraryRef.current;
    if (!mapReady || !map || !library) return;
    const markers = markersRef.current;
    const current = new Set(regions.map((region) => region.code));
    for (const [code, entry] of markers) {
      if (current.has(code)) continue;
      entry.marker.remove();
      markers.delete(code);
    }
    for (const region of regions) {
      let entry = markers.get(region.code);
      if (!entry) {
        const element = document.createElement('button');
        element.type = 'button';
        element.append(document.createElement('b'), document.createElement('i'));
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          // Bolha do outro lado do globo fica invisível (opacityWhenCovered) e não responde ao clique
          if (element.style.opacity === '0') return;
          bubbleClickRef.current(region.code);
        });
        entry = { element, marker: new library.Marker({ element, opacityWhenCovered: '0' }).setLngLat([region.longitude, region.latitude]).addTo(map) };
        markers.set(region.code, entry);
      }
      const { element, marker } = entry;
      const idle = region.worstStatus === null && region.co2eGrams === null;
      const diameter = idle ? IDLE_DOT : bubbleDiameter(region.co2eGrams, maxCo2e);
      const ring = idle ? null : ringPercent(region.energyKwh, maxEnergy);
      const [bubble, ringElement] = [element.children[0] as HTMLElement, element.children[1] as HTMLElement];
      marker.setLngLat([region.longitude, region.latitude]);
      // classList, e não className: o MapLibre põe no mesmo elemento as classes que o posicionam no mapa
      element.classList.add('region-bubble');
      element.classList.toggle('region-bubble--idle', idle);
      for (const state of REGION_STATUSES) element.classList.toggle(`region-bubble--${state}`, state === region.worstStatus);
      element.classList.toggle('region-bubble--selected', region.code === selectedCode);
      element.setAttribute('aria-pressed', String(region.code === selectedCode));
      // As menores por cima, para continuarem clicáveis quando encostam numa maior
      element.style.zIndex = String(200 - diameter);
      bubble.style.width = bubble.style.height = `${diameter}px`;
      ringElement.className = 'region-bubble__ring';
      ringElement.hidden = ring === null;
      if (ring !== null) ringElement.style.setProperty('--ring', String(ring));
      const label = regionLabel(region);
      element.setAttribute('aria-label', label);
      element.title = label;
    }
  }, [mapReady, regions, maxCo2e, maxEnergy, selectedCode]);

  if (monitored.length === 0) return null;

  return (
    <section className={stale ? 'region-map region-map--stale' : 'region-map'} aria-labelledby="region-map-title">
      <h2 id="region-map-title" className="sr-only">Mapa das regiões</h2>
      <div className="region-map__stage">
        <div ref={containerRef} className="region-map__canvas" aria-label="Globo com uma bolha por região monitorada" />
        {zoomed && (
          <button type="button" className="region-map__overview" onClick={showOverview}>
            Visão geral
          </button>
        )}
        {tilesFailed && !mapFailed && (
          <p className="region-map__notice" role="status">Sem imagens de satélite agora. O mapa mostra o contorno dos países.</p>
        )}
        {mapFailed && <p className="region-map__failed" role="status">Não foi possível abrir o mapa neste navegador. A lista de regiões continua com os dados de cada região.</p>}
      </div>
      {/* Fora do palco: no celular ela desce para baixo do mapa e não cobre o botão "i" do crédito */}
      <ul className="region-map__legend" aria-label="Legenda do mapa">
        <li><i className="region-map__key region-map__key--ativo" aria-hidden="true" />Ativo</li>
        <li><i className="region-map__key region-map__key--indisponivel" aria-hidden="true" />Indisponível</li>
        <li><i className="region-map__key region-map__key--sem_metricas" aria-hidden="true" />Sem métricas</li>
        <li><i className="region-map__key region-map__key--idle" aria-hidden="true" />Sem serviço hoje</li>
        <li><i className="region-map__key region-map__key--size" aria-hidden="true" />Tamanho: CO₂e</li>
        <li><i className="region-map__key region-map__key--ring" aria-hidden="true" />Anel: energia</li>
      </ul>
    </section>
  );
}
