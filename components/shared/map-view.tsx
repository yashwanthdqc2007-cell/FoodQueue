"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MapPin,
  AlertTriangle,
  Loader2,
  Navigation,
  Compass,
  Building2,
  ChefHat,
  Sparkles,
  Layers,
} from "lucide-react";

export interface MapMarkerLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: "kitchen" | "receiver";
  score?: number;
  distanceKm?: number;
  isTopRecommended?: boolean;
}

interface MapViewProps {
  origin: {
    name: string;
    latitude: number;
    longitude: number;
  };
  destinations?: MapMarkerLocation[];
  height?: string;
}

// 1. High-Performance Esri World Dark Gray Canvas (Zero Watermark, Zero API Key, Native Dark Mode)
const ESRI_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-dark-base": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.esri.com" target="_blank">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors',
    },
    "esri-dark-ref": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: "esri-dark-base-layer",
      type: "raster",
      source: "esri-dark-base",
      minzoom: 0,
      maxzoom: 16,
    },
    {
      id: "esri-dark-ref-layer",
      type: "raster",
      source: "esri-dark-ref",
      minzoom: 0,
      maxzoom: 16,
    },
  ],
};

// 2. OpenStreetMap Street Style for optional high-contrast street inspection
const OSM_STREET_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export function MapView({ origin, destinations = [], height = "380px" }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeTheme, setActiveTheme] = useState<"dark" | "streets">("dark");
  const [webGlSupported, setWebGlSupported] = useState(true);

  // Helper to re-center and fit map bounds to all points
  const fitAllMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([origin.longitude, origin.latitude]);

    destinations.forEach((dest) => {
      if (dest.latitude && dest.longitude) {
        bounds.extend([dest.longitude, dest.latitude]);
      }
    });

    mapRef.current.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 14,
      duration: 800,
    });
  }, [origin, destinations]);

  // Switch between Dark Canvas and Street View
  const toggleMapTheme = () => {
    const next = activeTheme === "dark" ? "streets" : "dark";
    setActiveTheme(next);
    if (mapRef.current) {
      mapRef.current.setStyle(next === "dark" ? ESRI_DARK_STYLE : OSM_STREET_STYLE);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    setMapLoaded(false);

    // Clean up any existing map instance and markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const initialStyle = activeTheme === "dark" ? ESRI_DARK_STYLE : OSM_STREET_STYLE;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: initialStyle,
        center: [origin.longitude, origin.latitude],
        zoom: 12,
        attributionControl: false,
      });
    } catch (err: unknown) {
      console.warn("[MapView] MapLibre initialization failed:", err);
      requestAnimationFrame(() => {
        setWebGlSupported(false);
      });
      return;
    }

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    let markersAdded = false;
    const addMarkers = () => {
      if (markersAdded || !mapRef.current) return;
      markersAdded = true;
      setMapLoaded(true);

      // 1. Add Kitchen Origin Marker (Emerald Pin)
      const kitchenEl = document.createElement("div");
      kitchenEl.className =
        "w-9 h-9 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white cursor-pointer ring-4 ring-emerald-500/30 transform transition-transform hover:scale-110";
      kitchenEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>`;

      const kitchenMarker = new maplibregl.Marker({ element: kitchenEl })
        .setLngLat([origin.longitude, origin.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2.5 text-xs font-sans bg-[#121815] text-[#F8FAFC] rounded-xl border border-[#23352A]">
              <div class="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Origin Kitchen</span>
              </div>
              <strong class="text-white text-xs block">${origin.name}</strong>
              <div class="text-[10px] text-slate-400 mt-1 font-mono">${origin.latitude.toFixed(4)}°N, ${origin.longitude.toFixed(4)}°E</div>
            </div>`
          )
        )
        .addTo(map);

      markersRef.current.push(kitchenMarker);

      // 2. Add Destination Receiver Markers
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([origin.longitude, origin.latitude]);

      destinations.forEach((dest) => {
        if (!dest.latitude || !dest.longitude) return;
        bounds.extend([dest.longitude, dest.latitude]);

        const receiverEl = document.createElement("div");
        if (dest.isTopRecommended) {
          receiverEl.className =
            "w-9 h-9 rounded-full bg-purple-600 border-2 border-amber-300 shadow-xl flex items-center justify-center text-white cursor-pointer ring-4 ring-purple-400/40 animate-pulse transform transition-transform hover:scale-110";
          receiverEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        } else {
          receiverEl.className =
            "w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white cursor-pointer transform transition-transform hover:scale-110";
          receiverEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        }

        const receiverMarker = new maplibregl.Marker({ element: receiverEl })
          .setLngLat([dest.longitude, dest.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div class="p-2.5 text-xs font-sans space-y-1 bg-[#121815] text-[#F8FAFC] rounded-xl border border-[#23352A]">
                <div class="flex items-center gap-1.5 mb-1">
                  ${
                    dest.isTopRecommended
                      ? '<span class="px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-500/50 text-[10px] font-extrabold">Top Match</span>'
                      : '<span class="text-blue-400 text-[10px] font-bold">Candidate Receiver</span>'
                  }
                </div>
                <strong class="text-white block font-bold">${dest.name}</strong>
                ${dest.score !== undefined ? `<div class="text-slate-300 font-semibold">Match Score: <span class="text-[#A999FF] font-black">${dest.score}</span></div>` : ""}
                ${dest.distanceKm !== undefined ? `<div class="text-[11px] text-slate-400 font-medium">${dest.distanceKm} km away from kitchen</div>` : ""}
              </div>`
            )
          )
          .addTo(map);

        markersRef.current.push(receiverMarker);
      });

      // Fit bounds if destinations exist
      if (destinations.length > 0) {
        map.fitBounds(bounds, {
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          maxZoom: 14,
        });
      }
    };

    map.on("load", addMarkers);
    map.once("styledata", () => {
      if (!markersAdded) setTimeout(addMarkers, 150);
    });

    const safetyTimeout = setTimeout(() => {
      if (!markersAdded && mapRef.current) addMarkers();
    }, 1000);

    mapRef.current = map;

    return () => {
      clearTimeout(safetyTimeout);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [origin, destinations, activeTheme]);

  // Graceful Fallback Radar View if WebGL fails
  if (!webGlSupported) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden border border-brand-border bg-brand-surface p-6 flex flex-col items-center justify-between text-center"
        style={{ height }}
      >
        <div className="flex items-center justify-between w-full pb-3 border-b border-brand-border/80">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-text">
            <Compass className="w-4 h-4 text-brand-primary" />
            <span>Geographic Radar &amp; Proximity View</span>
          </div>
          <span className="text-[10px] font-semibold text-brand-muted">
            {destinations.length} Nearby Receivers
          </span>
        </div>

        {/* Central Radar Visualization */}
        <div className="relative w-64 h-64 my-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-brand-border/60 border-dashed" />
          <div className="absolute inset-8 rounded-full border border-brand-border/80" />
          <div className="absolute inset-16 rounded-full border border-brand-primary/20" />

          {/* Origin Center Kitchen */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
              <ChefHat className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-brand-text mt-1 max-w-[120px] truncate">
              {origin.name}
            </span>
          </div>

          {/* Mapped Destination Pins around the radar */}
          {destinations.map((dest, i) => {
            const angle = (i * (360 / Math.max(destinations.length, 1)) - 45) * (Math.PI / 180);
            const radius = dest.isTopRecommended ? 70 : 95;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div
                key={dest.id || i}
                className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                }}
                title={`${dest.name} (${dest.distanceKm || "—"} km)`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md border border-white ${
                    dest.isTopRecommended
                      ? "bg-purple-600 ring-2 ring-amber-300 animate-pulse"
                      : "bg-blue-600"
                  }`}
                >
                  {dest.isTopRecommended ? <Sparkles className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[9.5px] font-bold text-brand-text bg-brand-card/90 px-1.5 py-0.5 rounded border border-brand-border mt-0.5 whitespace-nowrap max-w-[90px] truncate">
                  {dest.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10.5px] font-semibold text-brand-muted pt-3 border-t border-brand-border/80 w-full justify-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Origin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span>Top Match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Candidate</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-brand-border shadow-xs bg-[#121815]"
      style={{ height }}
    >
      {/* MapLibre GL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Overlay (auto-cleared in <1s max) */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-[#121815]/85 backdrop-blur-xs flex items-center justify-center gap-2.5 text-xs font-semibold text-brand-muted z-20">
          <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
          <span>Rendering redistribution map...</span>
        </div>
      )}

      {/* Top Floating Controls: Reset Frame & Theme Toggle */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={fitAllMarkers}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-surface/90 hover:bg-brand-surface border border-brand-border text-brand-text text-xs font-bold shadow-md backdrop-blur-md transition"
          title="Fit map view to all origin and receiver locations"
        >
          <Navigation className="w-3.5 h-3.5 text-brand-primary" />
          <span>Reset Frame</span>
        </button>

        <button
          type="button"
          onClick={toggleMapTheme}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-surface/90 hover:bg-brand-surface border border-brand-border text-brand-text text-xs font-bold shadow-md backdrop-blur-md transition"
          title="Toggle between Dark Canvas and Street View"
        >
          <Layers className="w-3.5 h-3.5 text-brand-muted" />
          <span>{activeTheme === "dark" ? "Dark Map" : "Street Map"}</span>
        </button>
      </div>

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-brand-surface/95 backdrop-blur-md border border-brand-border rounded-xl px-3 py-2 shadow-lg flex items-center justify-between sm:justify-start gap-3 sm:gap-4 text-[11px] font-semibold text-brand-text">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white inline-block shadow-xs" />
          <span>Origin Kitchen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500 border border-amber-300 inline-block shadow-xs" />
          <span>Top Match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 border border-white inline-block shadow-xs" />
          <span>Candidate</span>
        </div>
      </div>
    </div>
  );
}
