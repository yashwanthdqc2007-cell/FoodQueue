"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation } from "lucide-react";

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

export function MapView({ origin, destinations = [], height = "360px" }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapStyle =
      process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
      "https://demotiles.maplibre.org/style.json";

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [origin.longitude, origin.latitude],
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      setMapLoaded(true);

      // 1. Add Kitchen Marker (Emerald Origin Pin)
      const kitchenEl = document.createElement("div");
      kitchenEl.className =
        "w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white cursor-pointer transform -translate-x-1/2 -translate-y-1/2";
      kitchenEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>`;

      new maplibregl.Marker({ element: kitchenEl })
        .setLngLat([origin.longitude, origin.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2 text-xs font-sans">
              <strong class="text-emerald-700 block text-xs">Origin Kitchen</strong>
              <span class="text-slate-800 font-semibold">${origin.name}</span>
            </div>`
          )
        )
        .addTo(map);

      // 2. Add Receiver Markers
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([origin.longitude, origin.latitude]);

      destinations.forEach((dest) => {
        if (!dest.latitude || !dest.longitude) return;

        bounds.extend([dest.longitude, dest.latitude]);

        const receiverEl = document.createElement("div");
        if (dest.isTopRecommended) {
          receiverEl.className =
            "w-9 h-9 rounded-full bg-purple-600 border-2 border-amber-300 shadow-xl flex items-center justify-center text-white cursor-pointer ring-4 ring-purple-400/40 animate-pulse";
          receiverEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        } else {
          receiverEl.className =
            "w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white cursor-pointer";
          receiverEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        }

        new maplibregl.Marker({ element: receiverEl })
          .setLngLat([dest.longitude, dest.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div class="p-2 text-xs font-sans space-y-1">
                <div class="flex items-center gap-1">
                  ${dest.isTopRecommended ? '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">Top Match</span>' : ''}
                  <strong class="text-slate-900 block">${dest.name}</strong>
                </div>
                ${dest.score !== undefined ? `<div class="text-slate-600 font-semibold">Match Score: <span class="text-purple-700 font-bold">${dest.score}</span></div>` : ''}
                ${dest.distanceKm !== undefined ? `<div class="text-[11px] text-slate-500">${dest.distanceKm} km away</div>` : ''}
              </div>`
            )
          )
          .addTo(map);
      });

      if (destinations.length > 0) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [origin, destinations]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-xl px-3 py-2 shadow-xs flex items-center gap-3 text-[11px] font-semibold text-slate-700 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white inline-block shadow-xs" />
          <span>Origin Kitchen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-600 border border-amber-300 inline-block shadow-xs" />
          <span>Recommended Match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 border border-white inline-block shadow-xs" />
          <span>Candidate Receiver</span>
        </div>
      </div>
    </div>
  );
}
