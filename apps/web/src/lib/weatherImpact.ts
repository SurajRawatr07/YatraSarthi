/**
 * weatherImpact.ts — Task 1: Weather-Driven Digital Twin
 *
 * Deterministic lookup table: converts a weather parameter value
 * into an added delay in minutes for a given transport mode.
 * Result feeds directly into TripGraph.propagateDelay().
 *
 * Intentionally simple and explainable — no model call, impossible
 * to get a hallucinated answer from on stage.
 */

export type WeatherParam = 'rainfall' | 'storm_duration' | 'wind_speed' | 'visibility';
export type TransportMode = 'flight' | 'train' | 'cab' | 'bus' | 'hotel' | 'activity' | 'phantom' | string;

export interface WeatherImpactResult {
  addedDelayMin: number;
  cancelRisk: number;       // 0–1 probability
  confidencePct: number;    // 0–100 — how sure the estimate is
  reason: string;
}

/**
 * estimateWeatherImpact
 *
 * @param mode      Transport mode (flight, train, cab, …)
 * @param param     Weather parameter being simulated
 * @param value     Numeric value (mm/hr for rainfall, hours for storm_duration, km/h for wind)
 * @param constraint 'hard' | 'soft' — affects cancelRisk weighting
 */
export function estimateWeatherImpact(
  mode: TransportMode,
  param: WeatherParam,
  value: number,
  constraint: 'hard' | 'soft' = 'soft',
): WeatherImpactResult {
  const hardMult = constraint === 'hard' ? 1.5 : 1;

  // ─── Rainfall (mm/hr) ─────────────────────────────────────────────────────
  if (param === 'rainfall') {
    if (mode === 'flight') {
      if (value > 50) return { addedDelayMin: Math.round(90 * hardMult), cancelRisk: 0.3,  confidencePct: 85, reason: 'Heavy rain — ground stops likely' };
      if (value > 30) return { addedDelayMin: Math.round(60 * hardMult), cancelRisk: 0.15, confidencePct: 78, reason: 'Moderate-heavy rain — departure holds' };
      if (value > 10) return { addedDelayMin: Math.round(25 * hardMult), cancelRisk: 0.05, confidencePct: 70, reason: 'Light rain — minor taxiing delays' };
      return { addedDelayMin: 0, cancelRisk: 0, confidencePct: 95, reason: 'No significant rain impact on flights' };
    }
    if (mode === 'train') {
      if (value > 60) return { addedDelayMin: Math.round(60 * hardMult), cancelRisk: 0.1,  confidencePct: 75, reason: 'Flooding risk on tracks' };
      if (value > 25) return { addedDelayMin: Math.round(30 * hardMult), cancelRisk: 0.03, confidencePct: 72, reason: 'Slow running orders on waterlogged sections' };
      return { addedDelayMin: 0, cancelRisk: 0, confidencePct: 90, reason: 'Trains largely unaffected by light rain' };
    }
    // Road modes (cab, bus, activity)
    if (value > 40) return { addedDelayMin: Math.round(60 * hardMult), cancelRisk: 0.08, confidencePct: 80, reason: 'Heavy rain — severe road congestion + flooding' };
    if (value > 20) return { addedDelayMin: Math.round(30 * hardMult), cancelRisk: 0.02, confidencePct: 75, reason: 'Moderate rain — road slowdowns' };
    if (value > 5)  return { addedDelayMin: Math.round(12 * hardMult), cancelRisk: 0,    confidencePct: 70, reason: 'Light rain — minor delays' };
    return { addedDelayMin: 0, cancelRisk: 0, confidencePct: 92, reason: 'Dry conditions — no delay' };
  }

  // ─── Storm Duration (hours) ────────────────────────────────────────────────
  if (param === 'storm_duration') {
    if (value > 8)  return { addedDelayMin: Math.round(value * 25 * hardMult), cancelRisk: 0.4,  confidencePct: 82, reason: `Prolonged ${value}h storm — cascading delays across all modes` };
    if (value > 3)  return { addedDelayMin: Math.round(value * 20 * hardMult), cancelRisk: 0.2,  confidencePct: 78, reason: `${value}h storm — significant multi-leg impact` };
    if (value > 1)  return { addedDelayMin: Math.round(value * 12 * hardMult), cancelRisk: 0.06, confidencePct: 72, reason: `${value}h storm — moderate delays` };
    return { addedDelayMin: Math.round(value * 5 * hardMult), cancelRisk: 0, confidencePct: 68, reason: 'Short storm — minimal disruption' };
  }

  // ─── Wind Speed (km/h) ────────────────────────────────────────────────────
  if (param === 'wind_speed') {
    if (mode === 'flight') {
      if (value > 80)  return { addedDelayMin: Math.round(75 * hardMult), cancelRisk: 0.35, confidencePct: 88, reason: 'Strong crosswinds — diversions / holds possible' };
      if (value > 50)  return { addedDelayMin: Math.round(40 * hardMult), cancelRisk: 0.1,  confidencePct: 82, reason: 'High winds — extended approach sequences' };
      if (value > 30)  return { addedDelayMin: Math.round(15 * hardMult), cancelRisk: 0.02, confidencePct: 75, reason: 'Moderate winds — minor delay' };
      return { addedDelayMin: 0, cancelRisk: 0, confidencePct: 94, reason: 'Winds within safe operational limits' };
    }
    // Road / other
    if (value > 70)  return { addedDelayMin: Math.round(40 * hardMult), cancelRisk: 0.05, confidencePct: 78, reason: 'Very strong winds — road closures possible' };
    if (value > 40)  return { addedDelayMin: Math.round(15 * hardMult), cancelRisk: 0,    confidencePct: 72, reason: 'High winds — cautious driving, slower speeds' };
    return { addedDelayMin: 0, cancelRisk: 0, confidencePct: 90, reason: 'Wind within safe limits for road travel' };
  }

  // ─── Visibility (km) ─────────────────────────────────────────────────────
  if (param === 'visibility') {
    if (mode === 'flight') {
      if (value < 0.5) return { addedDelayMin: Math.round(90 * hardMult), cancelRisk: 0.45, confidencePct: 90, reason: 'CAT II/III minimums — ILS holds or diversions' };
      if (value < 2)   return { addedDelayMin: Math.round(45 * hardMult), cancelRisk: 0.15, confidencePct: 85, reason: 'Low visibility — reduced landing rate' };
      if (value < 5)   return { addedDelayMin: Math.round(20 * hardMult), cancelRisk: 0.03, confidencePct: 78, reason: 'Reduced visibility — extended sequencing' };
      return { addedDelayMin: 0, cancelRisk: 0, confidencePct: 96, reason: 'Good visibility — no impact' };
    }
    if (value < 0.5) return { addedDelayMin: Math.round(45 * hardMult), cancelRisk: 0.05, confidencePct: 82, reason: 'Dense fog — severely reduced road speed' };
    if (value < 2)   return { addedDelayMin: Math.round(20 * hardMult), cancelRisk: 0,    confidencePct: 76, reason: 'Low visibility — cautious road driving' };
    return { addedDelayMin: 0, cancelRisk: 0, confidencePct: 92, reason: 'Good visibility for road travel' };
  }

  return { addedDelayMin: 0, cancelRisk: 0, confidencePct: 80, reason: 'No weather impact calculated' };
}

/** Describe the current storm level as a human label */
export function stormLabel(intensity: number): string {
  if (intensity >= 85) return 'Extreme';
  if (intensity >= 65) return 'Severe';
  if (intensity >= 40) return 'Moderate';
  if (intensity >= 20) return 'Light';
  return 'Clear';
}

/** Convert a 0–100 storm intensity to approximate mm/hr rainfall */
export function intensityToRainfall(v: number): number {
  return Math.round((v / 100) * 80);   // 0 → 0 mm/hr, 100 → 80 mm/hr
}

/** Convert a 0–100 storm intensity to approximate storm duration in hours */
export function intensityToDuration(v: number): number {
  return parseFloat(((v / 100) * 12).toFixed(1));  // 0 → 0h, 100 → 12h
}
