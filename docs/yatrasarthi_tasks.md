# HackCelestial Midnight Tasks: build plan

Two separate, independently demoable mandatory tasks — a weather-driven Digital Twin layer and a Nugen-aligned model — built on top of YatraSarthi without touching the core disruption engine. No automatic weather monitoring: everything here is a user-triggered scenario, not a background detector.

## What is Nugen?

Nugen Intelligence is a Mumbai/San Francisco AI startup whose product is **domain alignment**: you upload a text corpus about your specific domain, it aligns a base language model to that corpus, and you get back a model ID that answers questions grounded in your material — with a **confidence score** on every response, showing how sure the model is that it stayed "on domain" rather than drifting into generic knowledge. It's not a chatbot wrapper — it's closer to a fine-tuning service with a built-in trust signal.

## Task 1, in short — Weather-Driven Digital Twin

Extend YatraSarthi (not a new app) with a layer that simulates how weather changes ripple through your existing trip/node system. Four mandatory pieces: **(1)** a live weather API feeding the model, **(2)** a geospatial map showing locations and impact, **(3)** real-world social signals about the weather event, **(4)** at least one interactive what-if scenario where changing a weather parameter visibly changes the system.

## Task 2, in short — Nugen Mandatory Requirement

Every team must align a base model to their own domain using Nugen, and actually use that aligned model for inference in the working project — not just call a generic API. Must show: Base model → Nugen alignment → domain model → integration into the app.

## Design principle for tonight

- **Keep the two tasks visibly separate.** Judges should see "here's Task 1" and "here's Task 2" as two distinct moments, not one blended feature. This also means two people can build them in parallel starting right now.
- **Nothing runs automatically.** No background weather poller, no auto-detection. Every weather effect and every social-signal pull happens when the user presses a button. This is both faster to build and easier to demo reliably — a live scheduler is one more thing that can misbehave on stage.
- **Reuse your existing cascade engine.** The what-if simulation doesn't need new propagation logic — it feeds a hypothetical delay into the same `propagateDelay` function already built for real disruptions.

## Geospatial map — you asked for more options than Mapbox

| Option | Setup effort | Visual payoff | Notes |
| --- | --- | --- | --- |
| **Mapbox GL JS** | Low reuses your existing token | High — smooth vector map, fly-to animation | You already have a Mapbox account for the Directions API — this is the rendering library, a separate product under the same account. Fastest option specifically for you. |
| **MapLibre GL JS** + a free vector source (MapTiler free tier, or OpenFreeMap) | Low | High — same rendering quality as Mapbox GL | Open-source fork of Mapbox GL, no vendor token needed if you use OpenFreeMap. Worth it only if you'd rather not lean further on one vendor. |
| **Leaflet.js + OpenStreetMap tiles** | Very low — zero signup | Good — simple, clean markers and lines | The lowest-friction option that exists. Plugins for heatmaps (`leaflet.heat`) and clustering are drop-in. Best pick if anything about map setup is eating time. |
| **Google Maps JavaScript API** | Medium — needs a billing-enabled key | High, most familiar look to judges | Extra Cloud Console setup live tonight is the risk; skip unless someone already has a key ready. |
| **deck.gl**, layered on Mapbox or MapLibre | Medium-high | Very high — animated arcs, heatmaps | The single best way to make "impact propagation" look genuinely impressive (an animated line sweeping from broken node to broken node). Treat as a stretch goal, added after the base map works. |

**Recommendation:** Mapbox GL JS for the base map (you already have the account), with a deck.gl arc layer added on top only if time allows after everything else works. Leaflet is the fallback if the Mapbox GL setup fights you at all — swap-in cost is low since it's just the rendering layer.

## Task 1 — detailed build

### 1. Base map easy

- One marker per trip node, colored by its existing status (on-track / at-risk / broken / cancelled) — you already have this field, just render it.
- Tapping a marker shows the node's name, time, and current weather (see below).

### 2. Live weather integration easy

- Pick one: OpenWeatherMap, Tomorrow.io, or WeatherAPI.com — all have a free tier and a single "current + forecast by coordinates" endpoint.
- Called **on-demand**, not on a schedule: when the map loads, and again if the user taps "Refresh."
- Show it as a small icon/badge on each marker (rain cloud, sun, etc.) — this alone satisfies "use weather data as input," visually, with almost no code.

### 3. Real-world social signal integration moderate

- Fastest realistic option tonight: **Reddit's API** (free "script" app, five-minute signup) — search a city subreddit for recent posts mentioning flooding, delay, or the weather event near your demo locations.
- Alternative if Reddit results are thin for your route: a free-tier news API (GNews or NewsData.io) searching headlines for the same terms.
- Pull a handful of items → pass through your existing LLM layer (Gemini/OpenAI, already built) to extract a short structured signal: `{ location, topic, mentionCount }`.
- Show as a small list or a couple of pins near the relevant node — "3 reports of flooding near Andheri in the last hour."
- **Pre-fetch and cache this before your demo slot.** Don't hit a live rate-limited API in front of judges — snapshot the response once it looks good, serve that snapshot during the actual pitch.

### 4. What-if simulation moderate — but this is your best demo moment

This is the one genuinely new piece of logic, and it's small:

```
function estimateWeatherImpact(node, param, value) {
  // A short, explainable lookup table — no ML needed
  if (param === "rainfall" && node.mode === "road" && value > 20) return { addedDelayMin: 30 };
  if (param === "rainfall" && node.mode === "flight" && value > 40) return { addedDelayMin: 60, cancelRisk: 0.15 };
  if (param === "storm_duration" && value > 3) return { addedDelayMin: value * 20 };
  return { addedDelayMin: 0 };
}
```

- **UI:** a small panel on the map screen — sliders or dropdowns for rainfall intensity, storm duration, temperature. A single "Simulate" button, pressed by the user — this is the explicit, manual trigger that keeps it a scenario tool, not a detector.
- **On press:** run the lookup above for the selected node, feed the resulting delay into your existing `propagateDelay` cascade function unchanged, and get back the same broken/at-risk list your real disruption flow already produces.
- **On the map:** affected nodes change color, and a line draws along the affected path connecting them — this is the single moment that visually proves "changing a weather parameter produces a corresponding change in the system," which is exactly what's mandatory.
- This is deterministic and explainable on purpose — no model call needed here, which keeps it fast to build and impossible to get an embarrassing hallucinated answer from live on stage.

### 5. "Continuously updating" requirement, done simply easy

The brief wants the twin to update as new data arrives. Since there's no background poller, satisfy this with a plain **"Refresh"** button on the map screen: re-fetches weather and social signals, re-runs the last simulation with the new values. Technically satisfies the requirement, costs almost nothing to build.

## Task 2 — detailed build

Build this as its own small panel — a "Policy & Recovery Assistant" — deliberately separable from the map so it reads as a distinct, second achievement in the demo.

### 1. Prepare the corpus easy

- Plain text only on the developer tier — `.txt`/`.md`, convert anything else first.
- 10–20 short files is enough for a hackathon alignment run: the DGCA passenger-rights rules, two or three vendor cancellation/refund policies, and a handful of hand-written Q&A pairs explaining your own recovery-ranking logic ("why is this option cheaper," "what does amber mean").

### 2. Align a model easy — mostly waiting, not building

```
POST /api/v3/documents                        → upload the .txt files, get document_ids
GET  /api/v3/documents/{id}/status             → poll until READY

POST /api/v3/alignment-projects/create
{
  "alignment_name": "YatraSarthi Policy Alignment",
  "base_model_id": "qwen-v2p5-0p5b-instruct",   // small model, fastest to align
  "document_ids": [...]
}

GET /api/v3/alignment-projects/{id}/status     → poll until COMPLETED, take model_id
```

Start this the moment the corpus is ready — it's an async job with a real minimum wait, the one part of tonight you can't speed up by typing faster. Build the chat panel UI while it runs.

### 3. Wire it into a chat panel easy

```
POST /api/v3/inference/chat/completions
{
  "model": "aligned-model-...",
  "messages": [{"role": "user", "content": "Can I get compensation for my delayed flight?"}],
  "max_tokens": 400
}
→ response includes "confidence_score": 87.3
```

- Display the `confidence_score` next to every answer — this is your single best visual for proving alignment actually happened, not just an API call.
- Prep 3–4 demo questions in advance: a compensation question, a "why this option" question about the recovery ranker, a cancellation-policy question — pick ones the corpus clearly covers so the confidence score reads high on stage.

## Build order — now parallel

| Track | Who | Order |
| --- | --- | --- |
| Task 1 | One person, owns the map | Base map + markers → weather badges → what-if panel + lookup table → cascade wiring → social signals last, cached before demo |
| Task 2 | Second person, owns Nugen | Corpus files → kick off alignment immediately → build chat panel UI while waiting → wire aligned model in → prep demo questions |

Because the two tasks no longer share any logic, these two tracks genuinely don't block each other — start both right now.

## Demo script

1. **Task 1:** open the map, point at a node, drag the rainfall slider, hit Simulate — downstream nodes light up as at-risk with the new delay, a path draws connecting them. One interaction, all four mandatory pieces visible at once (weather in, map, social-signal pins already on screen, interactive what-if).
2. **Task 2:** switch to the assistant panel, ask a prepped question, point at the confidence score in the response. Name the pipeline out loud: base model → Nugen alignment on your policy corpus → this domain model → answering live.