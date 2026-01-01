import { useMemo } from "react";
import * as THREE from "three";

const CONTINENT_COLOR = "#e5e5e5"; // Light grey land
const RADIUS = 1.0;

// Simplified continent outlines [lat, lon] - manually crafted for lofi aesthetic
// Each continent is a closed polygon with ~15-30 points
const CONTINENTS: Record<string, [number, number][]> = {
  // North America - includes Alaska, Canada, USA, Mexico, Central America
  northAmerica: [
    [70, -165],
    [72, -130],
    [70, -100],
    [65, -85],
    [60, -65], // Arctic/Canada
    [50, -55],
    [45, -65],
    [35, -75],
    [30, -80],
    [25, -80], // East coast
    [25, -90],
    [20, -100],
    [15, -90],
    [10, -85],
    [8, -80], // Gulf/Central America
    [15, -95],
    [20, -105],
    [25, -110],
    [32, -117], // Mexico west
    [40, -125],
    [48, -125],
    [55, -130],
    [60, -145],
    [65, -168], // West coast/Alaska
  ],

  // South America
  southAmerica: [
    [12, -70],
    [10, -62],
    [5, -52],
    [0, -50],
    [-5, -35], // North/East
    [-15, -40],
    [-25, -48],
    [-35, -55],
    [-45, -65],
    [-55, -68], // Southeast
    [-55, -72],
    [-45, -75],
    [-35, -72],
    [-25, -70], // South/West
    [-15, -75],
    [-5, -80],
    [0, -78],
    [5, -77],
    [10, -75], // Northwest
  ],

  // Europe - simplified blob including UK
  europe: [
    [70, -10],
    [70, 30],
    [65, 50],
    [55, 60], // Scandinavia/Russia edge
    [45, 40],
    [42, 30],
    [37, 25],
    [35, 0],
    [38, -8], // Mediterranean/Iberia
    [43, -10],
    [48, -5],
    [50, 5],
    [52, 0],
    [55, -5], // France/UK
    [58, -8],
    [60, -5],
    [62, 5],
    [65, 10], // UK/Norway
  ],

  // Africa
  africa: [
    [37, -10],
    [37, 10],
    [32, 32],
    [22, 35],
    [12, 45], // North/Northeast
    [5, 42],
    [-5, 40],
    [-15, 35],
    [-25, 32],
    [-35, 20], // East coast
    [-35, 18],
    [-30, 15],
    [-20, 12],
    [-10, 8],
    [-5, 5], // South
    [5, 0],
    [5, -5],
    [0, -5],
    [5, -15],
    [15, -17], // West coast
    [25, -15],
    [32, -8],
    [35, -5], // Northwest
  ],

  // Asia - large mass from Urals to Pacific
  asia: [
    [55, 60],
    [65, 80],
    [75, 100],
    [72, 130],
    [68, 180], // Russia north
    [60, 165],
    [55, 160],
    [45, 145],
    [35, 140],
    [35, 130], // Russia east/Japan area
    [22, 120],
    [20, 110],
    [10, 105],
    [0, 105],
    [-8, 115], // Southeast Asia
    [5, 95],
    [10, 78],
    [20, 72],
    [25, 68],
    [30, 65], // India
    [25, 55],
    [30, 48],
    [35, 35],
    [42, 30],
    [45, 40], // Middle East
  ],

  // Australia
  australia: [
    [-12, 130],
    [-15, 140],
    [-20, 148],
    [-28, 153], // Northeast
    [-35, 150],
    [-38, 145],
    [-35, 137],
    [-32, 130], // Southeast/South
    [-22, 115],
    [-15, 125],
    [-12, 130], // West/North
  ],

  // Greenland (smaller landmass)
  greenland: [
    [82, -35],
    [80, -20],
    [72, -20],
    [68, -30],
    [60, -45],
    [65, -55],
    [72, -55],
    [78, -70],
    [82, -50],
  ],
};

// Convert lat/lon to 3D position on sphere
function latLonToPosition(
  lat: number,
  lon: number,
  radius: number = RADIUS
): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(latRad) * Math.cos(lonRad) * radius,
    Math.sin(latRad) * radius,
    Math.cos(latRad) * Math.sin(lonRad) * radius
  );
}

// Calculate centroid of polygon in lat/lon space
function getCentroid(coords: [number, number][]): [number, number] {
  let latSum = 0,
    lonSum = 0;
  for (const [lat, lon] of coords) {
    latSum += lat;
    lonSum += lon;
  }
  return [latSum / coords.length, lonSum / coords.length];
}

// Interpolate between two points
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Subdivide polygon edges to increase resolution
function subdividePolygon(
  coords: [number, number][],
  subdivisions: number
): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < coords.length; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[(i + 1) % coords.length];

    for (let j = 0; j < subdivisions; j++) {
      const t = j / subdivisions;
      result.push([lerp(lat1, lat2, t), lerp(lon1, lon2, t)]);
    }
  }
  return result;
}

// Generate mesh geometry with multiple concentric rings for smooth fill
function generateContinentGeometry(
  coords: [number, number][]
): THREE.BufferGeometry {
  // Subdivide edges for higher resolution
  const highResCoords = subdividePolygon(coords, 3);

  const vertices: number[] = [];
  const indices: number[] = [];
  const elevation = RADIUS * 1.008;

  // Calculate centroid
  const [centerLat, centerLon] = getCentroid(coords);

  // Create concentric rings from center to edge
  const numRings = 6;
  const numEdgePoints = highResCoords.length;

  // Add center vertex
  const centerPos = latLonToPosition(centerLat, centerLon, elevation);
  vertices.push(centerPos.x, centerPos.y, centerPos.z);

  // Add ring vertices
  for (let ring = 1; ring <= numRings; ring++) {
    const ringFactor = ring / numRings;
    for (let i = 0; i < numEdgePoints; i++) {
      const [lat, lon] = highResCoords[i];
      const ringLat = lerp(centerLat, lat, ringFactor);
      const ringLon = lerp(centerLon, lon, ringFactor);
      const pos = latLonToPosition(ringLat, ringLon, elevation);
      vertices.push(pos.x, pos.y, pos.z);
    }
  }

  // Create triangles - center to first ring
  for (let i = 0; i < numEdgePoints; i++) {
    const next = (i + 1) % numEdgePoints;
    indices.push(0, i + 1, next + 1);
  }

  // Create triangles between rings
  for (let ring = 0; ring < numRings - 1; ring++) {
    const ringStart = 1 + ring * numEdgePoints;
    const nextRingStart = 1 + (ring + 1) * numEdgePoints;

    for (let i = 0; i < numEdgePoints; i++) {
      const next = (i + 1) % numEdgePoints;
      indices.push(ringStart + i, nextRingStart + i, nextRingStart + next);
      indices.push(ringStart + i, nextRingStart + next, ringStart + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function ContinentMesh() {
  const geometries = useMemo(() => {
    return Object.entries(CONTINENTS).map(([name, coords]) => ({
      name,
      geometry: generateContinentGeometry(coords),
    }));
  }, []);

  return (
    <group>
      {/* Base sphere - ocean */}
      <mesh>
        <sphereGeometry args={[RADIUS, 48, 32]} />
        <meshBasicMaterial color="#efefef" />
      </mesh>

      {/* Continent meshes */}
      {geometries.map(({ name, geometry }) => (
        <mesh key={name} geometry={geometry}>
          <meshBasicMaterial color={CONTINENT_COLOR} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
