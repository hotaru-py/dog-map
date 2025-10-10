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

  // Center point of campus
  const center: [number, number] = [12.75147980444429, 80.19654241564324];

  const dogIcons = useMemo(() => {
    const icons: { [key: number]: L.DivIcon } = {};
    dogs.forEach((dog) => {
      icons[dog.id] = L.divIcon({
        className: "custom-dog-marker",
        html: `
          <div class="dog-marker-container">
            <div class="dog-marker-pin">
              <div class="dog-marker-image">
                <img 
                  src="${dog.photos[0]}" 
                  alt="${dog.name}"
                  loading="lazy"
                />
              </div>
              <div class="dog-marker-pointer"></div>
            </div>
            <div class="dog-marker-label">
              <span>${dog.name}</span>
            </div>
          </div>
        `,
        iconSize: [60, 80],
        iconAnchor: [30, 75],
        popupAnchor: [0, -75],
      });
    });
    return icons;
  }, [dogs]);

  // Map boundaries (within campus)
  const maxBounds: L.LatLngBoundsExpression = useMemo(
    () => [
      [12.748110404185605, 80.18809184940014],
      [12.755822524287215, 80.20439967944083],
    ],
    []
  );

  const handleCloseModal = useCallback(() => {
    setSelectedDog(null);
  }, []);

  return (
    <>
      <MapContainer
        center={center}
        zoom={17}
        minZoom={17}
        maxZoom={20}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        preferCanvas={true}
        attributionControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        touchZoom={true}
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
