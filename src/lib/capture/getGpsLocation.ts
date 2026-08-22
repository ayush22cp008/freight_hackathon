export interface GpsResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export async function getGpsLocation(): Promise<GpsResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported in this environment');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('GPS permission denied'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('GPS position unavailable'));
            break;
          case error.TIMEOUT:
            reject(new Error('GPS request timed out'));
            break;
          default:
            reject(new Error('An unknown GPS error occurred'));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
