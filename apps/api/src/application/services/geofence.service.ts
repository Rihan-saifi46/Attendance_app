export interface GeofenceEvaluationResult {
  distanceMeters: number;
  effectiveRadiusMeters: number;
  isWithinGeofence: boolean;
  isAccuracySufficient: boolean;
}

export class GeofenceService {
  private static readonly EARTH_RADIUS_METERS = 6371000;
  private static readonly MAX_ACCEPTABLE_ACCURACY_METERS = 50;
  private static readonly MAX_ACCURACY_BUFFER_METERS = 20;

  /**
   * Calculates the Great Circle distance between two coordinates in meters using the Haversine formula.
   */
  static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const deltaPhi = toRadians(lat2 - lat1);
    const deltaLambda = toRadians(lon2 - lon1);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(this.EARTH_RADIUS_METERS * c * 10) / 10;
  }

  /**
   * Evaluates whether submitted coordinates and reported accuracy are within the geofenced boundary.
   */
  static evaluateGeofence(
    punchLat: number,
    punchLon: number,
    punchAccuracyMeters: number,
    targetLat: number,
    targetLon: number,
    baseRadiusMeters: number
  ): GeofenceEvaluationResult {
    const isAccuracySufficient = punchAccuracyMeters <= this.MAX_ACCEPTABLE_ACCURACY_METERS;

    const distanceMeters = this.calculateDistanceMeters(
      punchLat,
      punchLon,
      targetLat,
      targetLon
    );

    // Dynamic GPS accuracy buffer capped at 20 meters
    const dynamicBuffer = Math.min(
      Math.max(0, punchAccuracyMeters),
      this.MAX_ACCURACY_BUFFER_METERS
    );
    const effectiveRadiusMeters = baseRadiusMeters + dynamicBuffer;

    const isWithinGeofence = isAccuracySufficient && distanceMeters <= effectiveRadiusMeters;

    return {
      distanceMeters,
      effectiveRadiusMeters,
      isWithinGeofence,
      isAccuracySufficient
    };
  }
}
