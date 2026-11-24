"use client";

import { useEffect, useRef, useState } from "react";
import { smoothAngle } from "@/lib/geo";
import type { Fix } from "../app/AppProvider";

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number };

/**
 * Compass heading in degrees (0 = north), smoothed.
 *  - Android: `deviceorientationabsolute` alpha
 *  - iOS: `webkitCompassHeading` (permission is requested from the menu tap)
 * When walking faster than ~1 m/s it blends toward the GPS course, which is steadier near buildings.
 * Returns null when the device has no compass (desktop): the view then lets you drag to turn.
 */
export function useHeading(fix: Fix | null) {
  const [heading, setHeading] = useState<number | null>(null);
  const smoothed = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const fixRef = useRef(fix);
  fixRef.current = fix;

  useEffect(() => {
    let absoluteSeen = false;
    const screenAngle = () => (typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : 0);

    const push = (raw: number) => {
      let value = (raw + screenAngle() + 360) % 360;
      const f = fixRef.current;
      if (f?.speed != null && f.speed > 1 && f.course != null) value = smoothAngle(value, f.course, 0.5);
      smoothed.current = smoothAngle(smoothed.current, value, 0.18);
      if (frame.current == null) {
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          setHeading(smoothed.current);
        });
      }
    };

    const onAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return;
      absoluteSeen = true;
      push(360 - e.alpha);
    };
    const onRelative = (e: OrientationEvt) => {
      if (typeof e.webkitCompassHeading === "number" && !Number.isNaN(e.webkitCompassHeading)) push(e.webkitCompassHeading);
      else if (!absoluteSeen && e.absolute && e.alpha != null) push(360 - e.alpha);
    };

    window.addEventListener("deviceorientationabsolute", onAbsolute as EventListener);
    window.addEventListener("deviceorientation", onRelative as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onAbsolute as EventListener);
      window.removeEventListener("deviceorientation", onRelative as EventListener);
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return heading;
}

/** Must be called from a tap on iOS 13+. Resolves true when the compass can be used. */
export async function requestCompass() {
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (!DOE?.requestPermission) return true;
  try {
    return (await DOE.requestPermission()) === "granted";
  } catch {
    return false;
  }
}
