"use client";

import dynamic from "next/dynamic";
import dogsData from "@/data/dogs.json";
import { Dog } from "@/types/dog";

const dogs = dogsData as Dog[];

const DogMap = dynamic(() => import("@/components/DogMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="relative w-screen h-screen">
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🐕 Dog Map
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click on any marker to see dog details • Google Satellite imagery •
            No API key required
          </p>
        </div>
      </div>
      <div className="absolute inset-0 pt-[88px]">
        <DogMap dogs={dogs} />
      </div>
    </div>
  );
}
