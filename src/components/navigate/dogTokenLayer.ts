import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { maplibregl } from "@/lib/maplibre";
import { type CustomLayerInterface, type Map as MLMap } from "maplibre-gl";
import { DOG_SILHOUETTE_PATHS } from "../icons";

export interface TokenDog {
  id: number;
  lat: number;
  lng: number;
  color: string;
  /** 0–1; stale sightings are drawn translucent */
  opacity: number;
  /** Token height in metres */
  size: number;
  ring: string;
  target: boolean;
}

/**
 * MapLibre custom layer that draws each dog as a floating, extruded version of
 * the dog SVG silhouette (SVGLoader -> ExtrudeGeometry), bobbing and turning
 * gently and always facing the camera.
 */
export function createDogTokenLayer(opts: { animate: boolean }) {
  let map: MLMap | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  const groups = new Map<number, { root: THREE.Group; pivot: THREE.Group; body: THREE.Mesh; ring: THREE.Mesh; phase: number }>();
  let dogs: TokenDog[] = [];

  // ---- Shared geometry (SVG units: 64 x 64, y down) ----
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${DOG_SILHOUETTE_PATHS.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((p) => p.toShapes());
  const DEPTH = 7;
  const bodyGeo = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.1, bevelSegments: 2, curveSegments: 10 });
  bodyGeo.translate(-32, -32, -DEPTH / 2);
  bodyGeo.computeVertexNormals();

  const front = DEPTH / 2 + 1.7;
  const ellipse = (cx: number, cy: number, rx: number, ry: number) => {
    const s = new THREE.Shape();
    s.absellipse(cx - 32, cy - 32, rx, ry, 0, Math.PI * 2, false, 0);
    return s;
  };
  const muzzleGeo = new THREE.ShapeGeometry(ellipse(32, 43, 10, 8), 24).translate(0, 0, front);
  const featureGeo = new THREE.ShapeGeometry([ellipse(25, 31, 2.8, 2.8), ellipse(39, 31, 2.8, 2.8), ellipse(32, 39, 4, 2.8)], 16).translate(0, 0, front + 0.15);
  const muzzleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
  const featureMat = new THREE.MeshBasicMaterial({ color: 0x15141f, transparent: true });
  const ringGeo = new THREE.RingGeometry(0.78, 1, 48);
  const shadowGeo = new THREE.CircleGeometry(0.62, 32);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });

  function ensure(dog: TokenDog) {
    let g = groups.get(dog.id);
    if (!g) {
      const root = new THREE.Group();
      const pivot = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: dog.color, roughness: 0.55, metalness: 0.05, transparent: true }));
      const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
      const features = new THREE.Mesh(featureGeo, featureMat);
      // SVG y is down: flip, then stand the shape up (its plane becomes vertical, face toward -y)
      const face = new THREE.Group();
      face.add(body, muzzle, features);
      face.scale.set(1 / 64, -1 / 64, 1 / 64);
      face.rotation.x = Math.PI / 2;
      pivot.add(face);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: dog.ring, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      root.add(shadow, ring, pivot);
      scene.add(root);
      g = { root, pivot, body, ring, phase: Math.random() * Math.PI * 2 };
      groups.set(dog.id, g);
    }
    (g.body.material as THREE.MeshStandardMaterial).color.set(dog.color);
    (g.body.material as THREE.MeshStandardMaterial).opacity = dog.opacity;
    muzzleMat.opacity = 1;
    (g.ring.material as THREE.MeshBasicMaterial).color.set(dog.ring);
    return g;
  }

  const layer: CustomLayerInterface = {
    id: "dog-tokens",
    type: "custom",
    renderingMode: "3d",
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl as WebGL2RenderingContext, antialias: true });
      renderer.autoClear = false;
      scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.8);
      sun.position.set(0.6, -1, 1.4);
      scene.add(sun);
    },
    render(_gl, args) {
      if (!map || !renderer || dogs.length === 0) return;
      const center = map.getCenter();
      const ref = maplibregl.MercatorCoordinate.fromLngLat(center, 0);
      const s = ref.meterInMercatorCoordinateUnits();
      const bearing = (map.getBearing() * Math.PI) / 180;
      const t = performance.now() / 1000;

      for (const dog of dogs) {
        const g = ensure(dog);
        const mc = maplibregl.MercatorCoordinate.fromLngLat([dog.lng, dog.lat], 0);
        const x = (mc.x - ref.x) / s;
        const y = -(mc.y - ref.y) / s;
        const bob = opts.animate ? Math.sin(t * 2 + g.phase) * dog.size * 0.05 : 0;
        const sway = opts.animate ? Math.sin(t * 0.7 + g.phase) * 0.45 : 0;
        // Geometry is centred, so lift by more than half its height to float above the ring
        const lift = dog.size * 0.8;
        g.root.position.set(x, y, 0);
        g.pivot.position.set(0, 0, lift + bob);
        g.pivot.scale.setScalar(dog.size);
        // Face the camera (rotate by -bearing about the vertical axis), plus a gentle sway
        g.pivot.rotation.set(0, 0, -bearing + sway);
        const ringScale = dog.size * (dog.target ? 0.62 + Math.sin(t * 3) * 0.04 : 0.5);
        g.root.children[0].scale.setScalar(dog.size * 0.5 * (1 - bob / (dog.size * 0.4)));
        g.ring.scale.setScalar(ringScale);
        g.ring.position.z = 0.05;
      }
      for (const [id, g] of groups) {
        if (!dogs.some((d) => d.id === id)) {
          scene.remove(g.root);
          groups.delete(id);
        }
      }

      // mainMatrix projects mercator 0..1 coordinates (modelViewProjectionMatrix uses world pixels)
      const mvp = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix as unknown as number[]);
      const local = new THREE.Matrix4().makeTranslation(ref.x, ref.y, ref.z).scale(new THREE.Vector3(s, -s, s));
      camera.projectionMatrix = mvp.multiply(local);
      renderer.resetState();
      // Draw tokens over buildings so a dog behind a block is still visible
      renderer.clearDepth();
      renderer.render(scene, camera);
      if (opts.animate) map.triggerRepaint();
    },
    onRemove() {
      renderer?.dispose();
      renderer = null;
      map = null;
    },
  };

  return {
    layer,
    setDogs(next: TokenDog[]) {
      dogs = next;
      map?.triggerRepaint();
    },
  };
}
