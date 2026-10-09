/**
 * Geographic Distance Calculator
 *
 * Implements deterministic Haversine distance formula between coordinate pairs.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the great-circle distance between two points in kilometers.
 */
export function calculateHaversineDistanceKm(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's mean radius in km

  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 100) / 100; // 2 decimal places
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
