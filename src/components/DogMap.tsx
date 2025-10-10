"use client";

import { MapContainer, TileLayer, Marker, ZoomControl } from "react-leaflet";
import { Dog } from "@/types/dog";
import { useState, useMemo, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";

const DogModal = dynamic(() => import("./DogModal"), {
  ssr: false,
});

interface DogMapProps {
  dogs: Dog[];
}

function DogMap({ dogs }: DogMapProps) {
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);

  // Center point
  const center: [number, number] = [12.75147980444429, 80.19654241564324];

  const dogIcons = useMemo(() => {
    const icons: { [key: number]: L.DivIcon } = {};
    dogs.forEach((dog) => {
      icons[dog.id] = L.divIcon({
        className: "custom-dog-marker",
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
            <div style="position: relative;">
              <div style="width: 44px; height: 44px; border-radius: 50%; overflow: hidden; border: 3px solid #ef4444; background: white;">
                <img 
                  src="${dog.photos[0]}" 
                  alt="${dog.name}"
                  style="width: 100%; height: 100%; object-fit: cover;"
                  loading="lazy"
                />
              </div>
              <div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ef4444;"></div>
            </div>
            <div style="margin-top: 4px; padding: 2px 6px; background: rgba(255, 255, 255, 0.95); border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.1); backdrop-filter: blur(4px);">
              <span style="font-size: 10px; font-weight: 700; color: #111827; white-space: nowrap; text-shadow: 0 0 2px rgba(255,255,255,0.8);">${dog.name}</span>
            </div>
          </div>
        `,
        iconSize: [70, 75],
        iconAnchor: [35, 70],
        popupAnchor: [0, -70],
      });
    });
    return icons;
  }, [dogs]);

  const maxBounds: L.LatLngBoundsExpression = useMemo(
    () => [
      [center[0] - 0.018, center[1] - 0.018],
      [center[0] + 0.018, center[1] + 0.018],
    ],
    [center]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedDog(null);
  }, []);

  return (
    <>
      <MapContainer
        center={center}
        zoom={16}
        minZoom={14}
        maxZoom={20}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        preferCanvas={true}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          maxZoom={20}
          keepBuffer={2}
          updateWhenIdle={true}
        />
        <TileLayer
          attribution="&copy; Google"
          url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
          maxZoom={20}
          opacity={1}
        />

        <ZoomControl position="topright" />

        {dogs.map((dog) => (
          <Marker
            key={dog.id}
            position={[dog.location.lat, dog.location.lng]}
            icon={dogIcons[dog.id]}
            eventHandlers={{
              click: () => setSelectedDog(dog),
            }}
          />
        ))}
      </MapContainer>

      {selectedDog && <DogModal dog={selectedDog} onClose={handleCloseModal} />}
    </>
  );
}

export default memo(DogMap);
