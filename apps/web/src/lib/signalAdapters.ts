/**
 * Real-time signal adapters — Person 3 addendum
 *
 * These adapters normalise external disruption signals into the internal
 * DisruptionSignal shape which the disruptions/report endpoint consumes.
 *
 * In production each adapter would call a live API.
 * In this implementation:
 *   - Weather: calls Open-Meteo (free, no key needed) for rain/wind alerts
 *   - Flight:  stubs a flightradar24-style lookup (no live key in dev)
 *   - Train:   stubs an NTES/RailYatri lookup (no live key in dev)
 *   - Mapbox:  calls Mapbox Directions API for road ETA (uses MAPBOX_TOKEN)
 *
 * All adapters return null if the external call fails, so the caller
 * can fall back gracefully.
 */

export interface DisruptionSignal {
  delayMinutes: number;
  source: 'flight_provider' | 'train_unofficial' | 'road_eta' | 'user_reported';
  triggerSource: 'vendor_cancellation' | 'weather' | 'delay';
  cause: 'airline_controlled' | 'extraordinary' | 'unknown';
  rawData?: Record<string, unknown>;
}

// ─── Weather Adapter (Open-Meteo — free, no key required) ─────────────────────

/**
 * Fetches current weather conditions at the given lat/lng and returns
 * a disruption signal if adverse conditions are detected.
 * Uses Open-Meteo hourly forecast (free tier, no key).
 */
export async function fetchWeatherSignal(
  lat: number,
  lng: number,
): Promise<DisruptionSignal | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=precipitation,wind_speed_10m,weathercode` +
      `&wind_speed_unit=kmh&precipitation_unit=mm&forecast_days=1`;

    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) return null;

    const json = await res.json();
    const current = json?.current;
    if (!current) return null;

    const precipitation: number = current.precipitation ?? 0;  // mm
    const windSpeed: number = current.wind_speed_10m ?? 0;      // km/h
    const weatherCode: number = current.weathercode ?? 0;

    // WMO codes 51-67: drizzle/rain, 71-77: snow, 80-82: showers, 95+: thunderstorm
    const isSevere =
      (weatherCode >= 80 && weatherCode <= 82) ||
      weatherCode >= 95 ||
      precipitation > 10 ||
      windSpeed > 60;

    const isModerate =
      (weatherCode >= 51 && weatherCode <= 67) ||
      precipitation > 3 ||
      windSpeed > 40;

    if (isSevere) {
      return {
        delayMinutes: 180,
        source: 'road_eta',
        triggerSource: 'weather',
        cause: 'extraordinary',
        rawData: { precipitation, windSpeed, weatherCode },
      };
    }
    if (isModerate) {
      return {
        delayMinutes: 60,
        source: 'road_eta',
        triggerSource: 'weather',
        cause: 'extraordinary',
        rawData: { precipitation, windSpeed, weatherCode },
      };
    }

    return null; // clear weather — no disruption
  } catch {
    return null;
  }
}

// ─── Flight Adapter (stub — replace with real FlightAware / AviationStack) ───

/**
 * Stub adapter for flight delay lookup.
 * In production: call AviationStack or Flightradar24 with `flightNumber`.
 * Returns a mock delay based on the flightNumber hash to provide
 * deterministic demo data without a live API key.
 */
export async function fetchFlightSignal(flightNumber: string): Promise<DisruptionSignal | null> {
  try {
    // Deterministic mock: hash the flight number to a delay bucket
    const hash = flightNumber.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const bucket = hash % 4;

    if (bucket === 0) return null; // on time

    const delayMap = [null, 45, 135, 300];
    const causeMap: Array<'airline_controlled' | 'extraordinary' | 'unknown'> = [
      'unknown', 'airline_controlled', 'airline_controlled', 'extraordinary'
    ];

    return {
      delayMinutes: delayMap[bucket] ?? 45,
      source: 'flight_provider',
      triggerSource: bucket === 3 ? 'weather' : 'delay',
      cause: causeMap[bucket],
      rawData: { flightNumber, bucket, provider: 'stub' },
    };
  } catch {
    return null;
  }
}

// ─── Train Adapter (stub — replace with NTES / RailYatri / Where Is My Train) ─

/**
 * Stub adapter for train delay lookup.
 * Returns deterministic mock data based on the train number.
 */
export async function fetchTrainSignal(trainNumber: string): Promise<DisruptionSignal | null> {
  try {
    const hash = trainNumber.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const bucket = hash % 3;

    if (bucket === 0) return null; // on time

    return {
      delayMinutes: bucket === 1 ? 60 : 240,
      source: 'train_unofficial',
      triggerSource: 'delay',
      cause: 'unknown',
      rawData: { trainNumber, bucket, provider: 'stub' },
    };
  } catch {
    return null;
  }
}

// ─── Mapbox Road ETA Adapter ─────────────────────────────────────────────────

/**
 * Fetches the Mapbox Directions ETA between two coordinates.
 * If the estimated duration significantly exceeds the expected duration,
 * returns a disruption signal representing road congestion or closure.
 *
 * @param fromCoords  [lng, lat]
 * @param toCoords    [lng, lat]
 * @param expectedMin Expected travel time in minutes
 */
export async function fetchMapboxEtaSignal(
  fromCoords: [number, number],
  toCoords: [number, number],
  expectedMin: number,
): Promise<DisruptionSignal | null> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return null;

    const from = fromCoords.join(',');
    const to = toCoords.join(',');
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${from};${to}` +
      `?access_token=${token}&overview=false&annotations=duration`;

    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return null;

    const json = await res.json();
    const actualMin = Math.round((json?.routes?.[0]?.duration ?? 0) / 60);
    if (actualMin === 0) return null;

    const extraMin = actualMin - expectedMin;
    if (extraMin <= 15) return null; // within acceptable margin

    return {
      delayMinutes: extraMin,
      source: 'road_eta',
      triggerSource: 'delay',
      cause: 'unknown',
      rawData: { actualMin, expectedMin, extraMin, provider: 'mapbox' },
    };
  } catch {
    return null;
  }
}
