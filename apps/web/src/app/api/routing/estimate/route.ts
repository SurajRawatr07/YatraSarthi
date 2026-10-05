import { NextResponse } from 'next/server';

// GET /api/routing/estimate?from=&to=
// Primary: Mapbox Directions API. Fallback: static heuristic.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'from and to are required' } }, { status: 422 });
  }

  // Try Mapbox Directions API if token is available
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    try {
      // Mapbox requires coordinates, so we geocode both addresses first using Mapbox Geocoding API
      const geocode = async (address: string): Promise<[number, number] | null> => {
        const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&limit=1&access_token=${mapboxToken}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const coords = data.features?.[0]?.geometry?.coordinates;
        return coords ? [coords[0], coords[1]] : null;
      };

      const [fromCoords, toCoords] = await Promise.all([geocode(from), geocode(to)]);

      if (fromCoords && toCoords) {
        const [fromLng, fromLat] = fromCoords;
        const [toLng, toLat] = toCoords;
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${mapboxToken}&overview=false`;
        const resp = await fetch(directionsUrl);

        if (resp.ok) {
          const data = await resp.json();
          const durationSec = data.routes?.[0]?.duration;
          if (durationSec > 0) {
            return NextResponse.json({
              data: { estimatedMin: Math.ceil(durationSec / 60), provider: 'mapbox', fallbackUsed: false },
            });
          }
        }
      }
    } catch {
      // fall through to heuristic
    }
  }

  // Static heuristic fallback: 45 min, flagged as lower confidence
  return NextResponse.json({
    data: { estimatedMin: 45, provider: 'heuristic', fallbackUsed: true },
  });
}
