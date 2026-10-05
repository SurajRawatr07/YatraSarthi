# YatraSarthi: API contract v1

The single source of truth for every request/response shape in the app. This is the "60–90 minute sync" artifact `work_split.md` Section 7 asks for, written out — read this before writing a route handler or a client fetch call against one. Where the build guide's 14-route list didn't cover something the UI plan needs, this contract adds it; every addition is called out explicitly in Section 11 so nothing here silently overrides what you already agreed.

Stack assumed throughout: Next.js route handlers, MongoDB Atlas, Twilio (Verify + WhatsApp), Razorpay/Cashfree, Ably. Types match `packages/types` and should be copy-pasted there directly.

## 0. Conventions

### 0.1 Base URL and versioning
All routes are relative to `/api`. No version prefix for v1 — if a breaking change is needed later, prefix with `/api/v2/...` rather than versioning per-route.

### 0.2 Auth
Every route except `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, and `POST /api/payments/webhook` requires a Bearer JWT:

```
Authorization: Bearer <jwt>
```

Issued by `POST /api/auth/otp/verify`, an HTTP-only cookie *and* returned in the body (cookie for the web app, body for anything that can't read cookies, e.g. a future native wrapper). Payload: `{ sub: userId, phone, iat, exp }`. 7-day expiry; no refresh-token flow for v1 — re-verify by phone when it expires.

Every trip-scoped route additionally checks the caller is in `trip.memberIds`; routes marked **(owner only)** below also check `trip.ownerId === caller`.

### 0.3 Response envelope

Success:
```json
{ "data": { /* route-specific shape */ } }
```

Error:
```json
{ "error": { "code": "STRING_CODE", "message": "human-readable", "details": {} } }
```
`details` is optional and only present for `VALIDATION_ERROR` (field-level messages) and `CONFLICT` (see 0.6).

### 0.4 IDs, dates, money
- All IDs are MongoDB ObjectIds serialized as strings.
- All timestamps are ISO 8601 with offset, stored and transmitted in IST (`+05:30`) — e.g. `"2026-11-14T16:00:00+05:30"`.
- All money amounts are integers in paise (₹1 = 100), to avoid float rounding on split payments. The UI divides by 100 for display.

### 0.5 Trip status — the UI word vs. the internal colour
The action-lifecycle doc talks in **red/amber/green**; the UI talks in **Healthy / Needs attention / Resolving**. These are the same three states, named differently for two audiences — don't let them drift into two separately-maintained fields. One canonical enum, computed server-side, never set directly by a client:

| Internal colour | `trip.status` (API + UI) | Meaning |
| --- | --- | --- |
| red | `needs_attention` | A node is `broken` with no action yet raised against it |
| amber | `resolving` | At least one action is `proposed`, `awaiting_payment`, `executing`, or `pending_vendor` |
| green | `healthy` | No broken/at-risk node, or every action against one is `confirmed` |

Recomputed on every node/action write inside the same transaction — never cached separately from the write that could invalidate it.

### 0.6 Optimistic concurrency
`trips` and `actions` carry a `version` integer, incremented on every write. Mutating routes on these two collections require the caller's last-known version in the body as `baseVersion`. If it doesn't match the current value, the write is rejected:

```json
// 409 Conflict
{ "error": { "code": "CONFLICT", "message": "Trip changed, review before retrying.",
  "details": { "currentVersion": 7, "current": { /* fresh copy of the resource */ } } } }
```
The client shows the "trip changed, review" prompt (Section 14 of the solution doc) and re-diffs against `details.current` rather than blindly retrying. Money-moving routes (`/api/payments/*`, `/api/actions/:id/confirm`) additionally take a per-trip advisory lock server-side so two concurrent confirms can't both win.

### 0.7 Realtime
See Section 8 for the full event catalog. Every route below that mutates `trips`, `nodes`, `edges`, `actions`, or `payments` publishes a matching event to the Ably channel `trip:{tripId}` in the same server-side operation that performs the write — not as a fire-and-forget afterthought, so a dropped publish never leaves the UI silently stale past a page refresh.

---

## 1. Shared types (`packages/types`)

```typescript
// ===== Enums =====
type NodeType        = "flight" | "train" | "bus" | "cab" | "hotel" | "phantom";
type PhantomMode      = "auto_cab" | "walk" | "local_train" | "bus" | "other";
type ConstraintType   = "hard" | "soft";
type NodeStatus       = "pending_review" | "on_track" | "at_risk" | "broken" | "confirmed";
type TripStatus       = "healthy" | "needs_attention" | "resolving";
type ActionState      = "proposed" | "awaiting_payment" | "expired" | "executing"
                       | "pending_vendor" | "confirmed" | "failed";
type ConfirmType      = "self_reported" | "vendor_verified";
type PaymentStatus    = "pending" | "paid" | "refunded" | "failed";
type MemberResponse   = "pending" | "agreed" | "declined";
type DisruptionSource = "user_reported" | "flight_provider" | "train_unofficial" | "road_eta";
type CauseFlag        = "airline_controlled" | "extraordinary" | "unknown";
type RankingMode      = "cheapest" | "fastest" | "preserve_itinerary";
type TrustLevel       = "high" | "medium" | "low";

// ===== Core entities =====
interface User {
  id: string;
  phone: string;                 // E.164
  name: string;
  whatsappOptIn: boolean;
  notificationPrefs: {
    disruptionAlerts: "on" | "quiet";   // never fully off — I2's note
    phantomWarnings: boolean;
    paymentRequests: boolean;
    groupActivity: boolean;
  };
  emergencyContacts: EmergencyContact[];
  subscription: { tier: "free" | "pro"; expiresAt?: string };
  createdAt: string;
}
interface EmergencyContact {
  id: string; name: string; phone: string; deliveryMethod: "sms" | "whatsapp";
}

interface Trip {
  id: string; name: string; destination: string;
  startDate: string; endDate: string;
  ownerId: string; memberIds: string[]; joinCode: string;
  status: TripStatus;                    // derived, see 0.5 — never set by a client
  healthScore: number;                   // 0-100, see Section 5.3
  weakestEdge?: { edgeId: string; label: string; missChance: number };
  activeDisruptionId?: string;
  createdAt: string; updatedAt: string; version: number;
}

interface Node {
  id: string; tripId: string; ownerId: string;   // which member this leg belongs to
  type: NodeType; phantomMode?: PhantomMode;
  vendor?: string; label: string;                // "IndiGo 6E-204", "Auto: Andheri to airport"
  time: string;
  constraintType: ConstraintType;
  status: NodeStatus;
  rawExtract: Record<string, unknown>;
  confidence?: Record<string, number>;           // per-field 0-1, present on LLM-extracted nodes only
  refundPolicy?: {
    source: "extracted" | "policy_library" | "user_provided" | "unmatched";
    summary: string; ruleId?: string;
  };
  routing?: { fromLabel: string; toLabel: string; estimatedMin: number; paddingMin: number; provider: string };
  createdAt: string; updatedAt: string;
}

interface Edge {
  id: string; tripId: string;
  fromNodeId: string; toNodeId: string;
  bufferMin: number; paddingMin: number; constraint: ConstraintType;
  shared: boolean; sharedByMemberIds?: string[];  // group-merged node, e.g. a shared cab
}

interface Action {
  id: string; tripId: string; disruptionId: string; optionId: string;
  state: ActionState;
  confirmType?: ConfirmType; proofRef?: string;
  agreements: { memberId: string; response: MemberResponse; respondedAt?: string }[];
  vendorDraft?: { subject: string; body: string; ruleCited?: string; sentAt?: string; nudgedAt?: string[] };
  costTotal: number; possibleCompensation?: number;
  createdAt: string; updatedAt: string; version: number;
}

interface Payment {
  id: string; tripId: string; actionId: string; memberId: string;
  amount: number;                        // paise
  status: PaymentStatus;
  aggregatorRef?: string; paymentLinkUrl?: string;
  deadlineAt: string; paidAt?: string;
}

interface EventLogEntry {
  id: string; tripId: string; seq: number;
  actor: string;                         // userId or "system"
  type: string;                          // "node.confirmed", "action.state_changed", ...
  payload: Record<string, unknown>;
  ts: string;
}

interface RecoveryOption {
  optionId: string; name: string;
  netCost: number;                       // paise, excludes compensation
  possibleCompensation?: number;         // paise, shown separately per the DGCA rule (Section 8 of solution doc)
  arrivalTime: string;
  nodesDropped: string[];                // node ids
  recommended: boolean;
  scoreBreakdown: { costNorm: number; timeNorm: number; nodesNorm: number };  // 0-1, for the Pareto chart
  changes: { nodeId: string; field: string; from: unknown; to: unknown }[];
  perMemberShare: { memberId: string; amount: number }[];
  quoteExpiresAt: string;
}
```

---

## 2. Auth *(added — not in the original 14; needed to issue the JWT Section 0.2 assumes)*

### `POST /api/auth/otp/send`
No auth. **Body:** `{ phone: string }` → Twilio Verify `startVerification`.
**Response:** `{ data: { sent: true } }`. **Errors:** `RATE_LIMITED` (Twilio Verify's own throttle, surfaced as-is).

### `POST /api/auth/otp/verify`
No auth. **Body:** `{ phone: string; code: string }` → Twilio Verify `checkVerification`.
**Response:** `{ data: { token: string; user: User; isNewUser: boolean } }`, plus sets the HTTP-only cookie. Creates a `users` doc on first verify (`isNewUser: true` tells the client to route to A2 onboarding instead of B1).
**Errors:** `AUTH_INVALID` — maps to A3's *"That code didn't match. Check the message and try again."*

---

## 3. Trip Core & Access — Person 1

### `POST /api/trips`
**Body:** `{ name: string; destination: string; startDate: string; endDate: string }`
**Response:** `{ data: Trip }`. Creates the trip, sets `ownerId`/`memberIds` to the caller, generates a human-readable `joinCode` (format: word + 3 digits, e.g. `GOA123`, collision-checked). `status` starts `healthy`, `healthScore` starts `100`.

### `GET /api/trips` *(added — B1 Trips list needs this)*
**Query:** `?status=active|completed` (optional; omit for all). **Response:** `{ data: { trips: Trip[] } }`, sorted by `startDate` ascending for active, descending for completed. Powers both B1 (default) and I5 (`?status=completed`) — no separate history route needed.

### `GET /api/trips/:id`
**Response:** `{ data: Trip }`. Powers the B4 settings header and the D1 timeline header.

### `PATCH /api/trips/:id` *(added — B4 rename/dates)*
**Body:** `{ baseVersion: number; name?: string; startDate?: string; endDate?: string }`
**Response:** `{ data: Trip }`. **Errors:** `CONFLICT` per 0.6.

### `POST /api/trips/:id/join`
**Body:** `{ joinCode: string }`. **Response:** `{ data: Trip }`. Adds caller to `memberIds` if the code matches; idempotent if already a member.
**Errors:** `NOT_FOUND` if the code doesn't resolve to a trip — maps to B3's join failure.

### `DELETE /api/trips/:id/members/:userId` *(added — B4, owner only)*
**Response:** `{ data: { removed: true } }`. Cannot remove `ownerId` (owner must transfer or delete instead — no transfer flow in v1, so this is a hard restriction, not a gap: `FORBIDDEN` if `userId === trip.ownerId`).

### `POST /api/trips/:id/leave` *(added — B4, non-owner)*
**Response:** `{ data: { left: true } }`. `FORBIDDEN` if caller is the owner — B4 should not render "Leave trip" for the owner; this is the server-side backstop.

### `DELETE /api/trips/:id` *(added — B4, owner only)*
**Response:** `{ data: { deleted: true } }`. Cascades to `nodes`, `edges`, `actions`, `payments`, `events` for the trip. Matches B4's *"This removes it for every member and can't be undone."*

---

## 4. Ingestion — Person 2

### `POST /api/ingest/upload`
**Body:** `multipart/form-data` — `tripId`, plus one of `file` (PDF/image) or `text` (pasted SMS/PNR).
**Response:** `{ data: Node }` with `status: "pending_review"`. The route calls `ExtractorProvider.extractBooking`, writes a `nodes` doc immediately (not held client-side) so the WhatsApp path below can converge on the same downstream shape, and returns it for C4.
**Errors:** `EXTRACTION_FAILED` — maps to C3's *"We couldn't read that clearly"* fallback to C5.

### `POST /api/whatsapp/webhook`
No user-facing auth (Twilio-signed request; verify `X-Twilio-Signature` instead of a JWT). **Body:** Twilio's inbound-message form payload.
**Logic:** look up sender phone in `users`. If unmatched or the body is a bare join code, bind the phone to that `tripId` (a `whatsappBindings` map on the user doc: `{ [phone]: tripId }`) and reply with a template confirmation — no node created. Otherwise download any media, run the same `extractBooking` call as upload, create the `pending_review` node against the bound trip, and push a `node.created` realtime event so the confirm screen appears without the user reopening the app.
**Response:** Twilio expects `200` with TwiML or empty body — this route returns `200` regardless of extraction outcome; extraction failure is reported to the user via a WhatsApp template reply, not an HTTP error (there's no client waiting on this response).

### `GET /api/trips/:id/nodes` *(added — C1 ingestion hub list)*
**Query:** `?status=pending_review` (optional filter). **Response:** `{ data: { nodes: Node[] } }`, grouped client-side by date per C1's spec.

### `GET /api/nodes/:id` *(added — C6 booking detail)*
**Response:** `{ data: Node & { prevNodeId?: string; nextNodeId?: string; bufferToPrevMin?: number; bufferToNextMin?: number } }` — the neighbour/buffer fields are computed from `edges` at read time, not stored redundantly on the node.

### `POST /api/nodes/:id/confirm`
**Body:** `{ fields?: Record<string, unknown>; refundTier?: string }` — `fields` carries any corrections made on C4 to low-confidence values; `refundTier` carries a user-supplied answer when C4's policy line is unmatched.
**Response:** `{ data: Node }` with `status` moved out of `pending_review` (to `on_track` if no disruption is currently active against it, else recomputed against the live cascade). Also creates the `edges` doc(s) linking it into the trip graph if this is the node's first confirm.
**Errors:** `VALIDATION_ERROR` if a required field is still missing after the client's edits.

### `POST /api/nodes/phantom`
**Body:** `{ tripId: string; mode: PhantomMode; fromLabel: string; toLabel: string; paddingMin: number; departsByNodeId: string }`
**Response:** `{ data: Node }`, `type: "phantom"`, `status: "on_track"` (phantom nodes skip `pending_review` — there's nothing to confirm, the user typed it directly). Calls the routing provider server-side for `estimatedMin` and stores it under `routing`.

### `GET /api/routing/estimate` *(added — the live preview C5 needs before the leg is saved)*
**Query:** `?from=&to=`. **Response:** `{ data: { estimatedMin: number; provider: string; fallbackUsed: boolean } }`. Same provider chain as the phantom-node scheduler (Section 11 of the solution doc): primary routing API, Mapbox fallback, `fallbackUsed: true` flags the lower-confidence estimate so C5 can show it honestly.

### `PATCH /api/nodes/:id` *(added — C6 edit, C5 buffer adjustment)*
**Body:** `{ fields?: Record<string, unknown>; paddingMin?: number }`. **Response:** `{ data: Node }`. Changing `paddingMin` updates the adjoining edge's slack and triggers a re-run of the cascade check (Section 5) if a disruption is active, since padding is exactly the "editable slack" the cascade engine reads.

### `DELETE /api/nodes/:id` *(added — C6 "Remove from trip")*
**Response:** `{ data: { removed: true } }`. Removes the node's edges too; if this breaks the trip into a disconnected graph, that's a modelling error the UI should warn about client-side before calling this — the API doesn't block it.

---

## 5. Graph, Health & Cascade — Person 3

### `GET /api/trips/:id/graph`
**Response:**
```json
{ "data": {
  "nodes": [ "Node[]" ],
  "edges": [ "Edge[]" ],
  "trip": { "status": "TripStatus", "healthScore": 92, "weakestEdge": { "edgeId": "...", "label": "Mumbai flight to Goa cab", "missChance": 0.24 } }
} }
```
One call powers D1 (nodes/edges by status), D4 (the embedded `trip.healthScore` + `weakestEdge` — no separate health endpoint; it's a derived field on the trip, recomputed on every node/edge write per 5.3, not a route of its own), and the health-score "Recalculate" note is just "this endpoint reflects the current state, always."

### `GET /api/trips/:id/group` *(added — D3 needs member-level aggregation the raw graph doesn't give)*
**Response:**
```json
{ "data": { "members": [
  { "memberId": "...", "name": "Rahul", "currentLeg": "Node label", "status": "NodeStatus" }
], "sharedNodes": [
  { "nodeId": "...", "label": "Goa airport cab", "sharedByCount": 4 }
], "weakestLinkMemberId": "..." } }
```

### `POST /api/disruptions/report`
**Body:** `{ nodeId: string; delayMinutes: number; source: DisruptionSource; cause?: CauseFlag }`
**Logic:** runs `TripGraph.propagateDelay` (build guide Section 2) from `nodeId`, writes the resulting `broken`/`atRisk` statuses onto the affected `nodes`, creates a `disruption` record (embed on the trip as `activeDisruptionId`, or a lightweight `disruptions` collection — either works; if added, `disruptions: { tripId, sourceNodeId, delayMinutes, source, cause, createdAt }`), and returns the E2 cascade-impact shape directly so the client doesn't need a second round-trip:
```json
{ "data": {
  "disruptionId": "...",
  "brokenNode": { "nodeId": "...", "label": "Rahul's train", "delayMinutes": 240, "source": "user_reported" },
  "effects": [
    { "nodeId": "...", "label": "Goa airport cab", "consequence": "will leave before Rahul arrives", "estimatedCost": 150000, "hard": false },
    { "nodeId": "...", "label": "Airbnb check-in window", "consequence": "closes before the group can arrive together", "estimatedCost": 0, "hard": true }
  ],
  "affectedMemberIds": ["..."]
} }
```
`estimatedCost` in paise, `0` where there's no cost (a hard break like the Airbnb window). This is the exact data E2's two effect-line variants (soft cost vs. hard break) render from.

### `5.3 Health score — computation, not a route`
Recomputed synchronously after any write to `nodes` or `edges` for a trip (buffer change, node confirm/remove), using the formula from the solution doc:
```
r_e   = missProbability(edge)              // from delay distribution + edge.bufferMin + edge.paddingMin
F     = 0.7 * max(r_e) + 0.3 * mean(r_e)
R     = refundFlexibility(weakestNode) in [0,1]
Score = 100 * (1 - F) * (0.85 + 0.15 * R)
```
Stored on `trip.healthScore` and `trip.weakestEdge`. `GET /api/trips/:id/graph` always reflects the latest value — there is deliberately no `POST /recalculate`, since a stale score reachable only by an explicit call is worse than "always fresh, computed on write."

---

## 6. Recovery, Payments & Vendor Execution — Person 4

### `GET /api/trips/:id/recovery-options`
**Query:** `?disruptionId=&mode=cheapest|fastest|preserve_itinerary` (`mode` defaults to `cheapest`).
**Response:** `{ data: { options: RecoveryOption[] } }` — feasibility-filtered, scored, and sorted per the given mode (Section 10 of the solution doc). `scoreBreakdown` on each option is what E3's "Compare on a chart" Pareto view plots directly.

### `GET /api/actions/:id` *(added — needed to persist/reload E4, E5, G2 state on reload)*
**Response:** `{ data: Action }`.

### `POST /api/actions/:id/propose`
**Body:** `{ optionId: string }` (called from E4's "Propose this to the group"; if the action doc doesn't exist yet for this `optionId`, this call creates it in `state: "proposed"`).
**Response:** `{ data: Action }`. Seeds `agreements` with every `trip.memberIds` at `response: "pending"`.

### `POST /api/actions/:id/respond` *(added — E5's Agree / Suggest something else needs a route; the state diagram's "group picks option" transition has to be driven by something)*
**Body:** `{ response: "agreed" | "declined"; suggestion?: string }`.
**Response:** `{ data: Action }`. Once every member's `response` is `agreed`, server-side transitions `state` to `awaiting_payment` (if `costTotal > 0`) or straight to `executing` (free options) — matching the state diagram exactly. A `declined` response with a `suggestion` is logged to the event log for the group to see in E5, not auto-actioned.

### `POST /api/payments/create-links`
**Body:** `{ actionId: string }`. **Response:** `{ data: { payments: Payment[] } }` — one `payments` doc + one Razorpay/Cashfree link per member with a nonzero share, each tagged `actionId`/`memberId` in the aggregator's metadata so the webhook can resolve it. Sets each `deadlineAt` (20 minutes, per F1).

### `POST /api/payments/webhook`
No JWT — verified by the aggregator's signature header instead (`X-Razorpay-Signature` or Cashfree's equivalent). **Body:** aggregator-specific payload.
**Logic:** resolve `actionId`/`memberId` from metadata, flip that `Payment.status` to `paid`, publish `payment.updated`. If every `Payment` for the `actionId` is now `paid`, transition the `Action` to `executing`. On a timeout sweep (worker cron, not this route) unpaid links past `deadlineAt` trigger refunds for any partial payers and move the action back to `proposed` — matches F2's "Time's up" copy.
**Response:** `200` unconditionally to the aggregator (retry storms otherwise); errors are logged, not surfaced to any client waiting on this response.

### `GET /api/payments/:actionId` *(added — F2's live tracker)*
**Response:** `{ data: { payments: Payment[]; allPaid: boolean; deadlineAt: string } }`.

### `POST /api/actions/:id/draft-vendor-email` *(added — G1 needs the draft generated somewhere)*
**Response:** `{ data: { subject: string; body: string; ruleCited?: string } }`. Calls `ExtractorProvider.draftVendorEmail` with the action's booking + matched policy text. Editable client-side before sending — this route only generates, it doesn't persist until `/send` below.

### `POST /api/actions/:id/mark-sent` *(added — G1's "Mark as sent")*
**Body:** `{ subject: string; body: string }` (the possibly-edited draft). **Response:** `{ data: Action }` — stores it under `vendorDraft`, sets `sentAt`, transitions `state` to `pending_vendor`.

### `POST /api/actions/:id/nudge` *(added — G2's "nudge again")*
**Response:** `{ data: Action }` — appends to `vendorDraft.nudgedAt`, no state change. Rate-limited client-side (button disabled until a cooldown per the "after a set time" copy in G2).

### `POST /api/actions/:id/report-failure` *(added — the state diagram's explicit `pending_vendor → failed` transition needs a caller)*
**Body:** `{ reason?: string }`. **Response:** `{ data: Action }`, `state: "failed"`. UI re-plans from here (back to `GET /recovery-options`).

### `POST /api/actions/:id/proof` *(added — G3's upload step, kept separate from confirm so the parsed summary can be shown before committing)*
**Body:** `{ fileUrl?: string; text?: string }`. **Response:** `{ data: { parsedSummary: string; proofRef: string } }`. Runs the same extractor against the vendor's reply; does **not** change `state` yet — G3 shows the summary and asks the user to confirm it via the next call.

### `POST /api/actions/:id/confirm`
**Body:** `{ confirmType: ConfirmType; proofRef?: string }` — `proofRef` required and must reference a prior `/proof` call when `confirmType: "vendor_verified"`; omit both for the plain self-confirm tap.
**Response:** `{ data: Action }`, `state: "confirmed"`. Recomputes `trip.status` (0.5) — if this was the last open action for the active disruption, `trip.status` flips to `healthy` and the client routes to G4.
**Errors:** `VALIDATION_ERROR` if `confirmType: "vendor_verified"` is sent without a valid `proofRef`.

---

## 7. Suraksha, Settings & Realtime — Person 5

### `POST /api/suraksha/trigger`
**Body:** `{ tripId: string; lastNodeId: string; nextNodeId: string; gps: { lat: number; lng: number }; batteryPct?: number }`
**Response:** `{ data: { sentTo: EmergencyContact[]; localNumbers: { national: string; police: string; state: string } } }`. Builds the payload server-side (so the wording is consistent regardless of client), sends via the contact's preferred `deliveryMethod`, and looks up state/district emergency numbers from `gps`. The 5-second undo window (H2) is entirely client-side — this route only fires once the countdown completes, there's nothing to undo server-side.

### `GET/PUT /api/users/me` *(added — I1)*
`GET` returns the caller's `User`. `PUT` body: `{ name?: string }` (phone is immutable post-verification — I1 shows it read-only for a reason).

### `DELETE /api/users/me` *(added — I1 "Delete account")*
**Response:** `{ data: { deleted: true } }`. Strips the user's `name`/`phone` from any trip they don't own (per I1's note: shared trips stay visible, without their details) and transfers or blocks deletion of owned trips — pick one policy and encode it here rather than leaving it to each client to guess; recommend: block deletion while `ownerId` on any active trip, with a clear error telling the user to transfer or delete those trips first.

### `PUT /api/users/me/notification-prefs` *(added — I2)*
**Body:** `Partial<User["notificationPrefs"]>`, with `disruptionAlerts` restricted server-side to `"on" | "quiet"` — never accept a value that fully disables it, per I2's stated rule.

### `GET/PUT /api/users/me/emergency-contacts` *(added — H4)*
`PUT` body: `{ contacts: EmergencyContact[] }` (full replace — H4 is a small list, simpler than per-item CRUD).

### `GET /api/users/me/subscription` and `POST /api/users/me/subscription/upgrade` *(added — I3)*
`POST` body: `{ plan: "per_trip" | "annual"; tripId?: string }` (`tripId` required for `per_trip`). Returns a payment link via the same aggregator integration as Section 6 — this is a `Payment` against the user, not a trip action, so it's its own thin wrapper rather than overloading `/api/payments/create-links`.

### `GET /api/policy-library` *(added — I4)*
**Query:** `?vendor=&fareClass=` (optional — omit for the full browsable list). **Response:** `{ data: { rules: { ruleId: string; text: string; sourceUrl: string; effectiveFrom: string }[] } }` — the same versioned rule table the policy engine (Section 8 of the solution doc) reads from, exposed read-only for the help screen.

---

## 8. Realtime event catalog

Channel: `trip:{tripId}`, one channel per trip, all trip members subscribed. Every event:

```typescript
interface RealtimeEvent {
  type: string;            // see table
  tripId: string;
  entityId: string;        // the node/action/payment id this concerns
  version?: number;        // present for trip/action events, per 0.6 — lets the client detect it's already current
  ts: string;
}
```

Clients refetch only the changed entity (build guide Section 7) — the event is a pointer, never the full payload, so a client that's been offline briefly still ends up consistent on reconnect without a special resync path.

| `type` | Fired by | Client reaction |
| --- | --- | --- |
| `node.created` | ingest/upload, whatsapp webhook | Refresh C1 list; if it's the viewer's own trip open on C1, show the new pending item |
| `node.updated` | confirm, PATCH, disruption cascade | Refetch that node; refresh D1/D2 if open |
| `trip.updated` | any route touching `trip.status`/`healthScore`/`version` | Refresh D1 banner, D4, B1 card |
| `disruption.detected` | POST /disruptions/report | Push notification (E1) + open E2 if the app is foregrounded on that trip |
| `action.updated` | propose, respond, confirm, report-failure | Refetch that action; refresh E4/E5/G2 if open |
| `payment.updated` | payments webhook | Refetch F2's payment list |
| `suraksha.sent` | suraksha/trigger | Informational only — lets other group members see "X used Suraksha" if that's ever surfaced (not in the current UI plan, but the event costs nothing to emit now) |

---

## 9. Error codes

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `AUTH_REQUIRED` | 401 | Missing/expired JWT |
| `AUTH_INVALID` | 401 | OTP didn't match |
| `FORBIDDEN` | 403 | Authenticated, but not a trip member / not the owner where required |
| `NOT_FOUND` | 404 | Resource, or join code, doesn't resolve |
| `VALIDATION_ERROR` | 422 | Bad body shape; `details` has field-level messages |
| `CONFLICT` | 409 | Optimistic-concurrency mismatch — see 0.6 |
| `EXTRACTION_FAILED` | 422 | LLM extractor couldn't parse the input |
| `RATE_LIMITED` | 429 | Twilio Verify throttle, or a nudge sent too soon |
| `PAYMENT_WEBHOOK_INVALID_SIGNATURE` | 400 | Aggregator signature check failed — logged, never surfaced to a user-facing client |

---

## 10. Route index by owner

| Owner | Routes |
| --- | --- |
| **Person 1** | `POST /api/trips`, `GET /api/trips`, `GET /api/trips/:id`, `PATCH /api/trips/:id`, `POST /api/trips/:id/join`, `DELETE /api/trips/:id/members/:userId`, `POST /api/trips/:id/leave`, `DELETE /api/trips/:id` |
| **Auth** *(shared, sits in Person 1's slice)* | `POST /api/auth/otp/send`, `POST /api/auth/otp/verify` |
| **Person 2** | `POST /api/ingest/upload`, `POST /api/whatsapp/webhook`, `GET /api/trips/:id/nodes`, `GET /api/nodes/:id`, `POST /api/nodes/:id/confirm`, `POST /api/nodes/phantom`, `GET /api/routing/estimate`, `PATCH /api/nodes/:id`, `DELETE /api/nodes/:id` |
| **Person 3** | `GET /api/trips/:id/graph`, `GET /api/trips/:id/group`, `POST /api/disruptions/report` |
| **Person 4** | `GET /api/trips/:id/recovery-options`, `GET /api/actions/:id`, `POST /api/actions/:id/propose`, `POST /api/actions/:id/respond`, `POST /api/payments/create-links`, `POST /api/payments/webhook`, `GET /api/payments/:actionId`, `POST /api/actions/:id/draft-vendor-email`, `POST /api/actions/:id/mark-sent`, `POST /api/actions/:id/nudge`, `POST /api/actions/:id/report-failure`, `POST /api/actions/:id/proof`, `POST /api/actions/:id/confirm` |
| **Person 5** | `POST /api/suraksha/trigger`, `GET/PUT /api/users/me`, `DELETE /api/users/me`, `PUT /api/users/me/notification-prefs`, `GET/PUT /api/users/me/emergency-contacts`, `GET /api/users/me/subscription`, `POST /api/users/me/subscription/upgrade`, `GET /api/policy-library` |

---

## 11. What's original vs. added

The build guide named 14 routes. Everything in this contract is either one of those 14, spelled out in full, or an addition needed to make a UI screen in `ui_v1.md` actually work end to end. Additions are marked *(added)* inline at each heading above; the concentration by section:

- **Trip Core:** 6 of 8 routes added (list/detail/patch/leave/remove-member/delete) — the original list only covered create and join.
- **Ingestion:** 5 of 9 added (node list/detail/patch/delete, routing estimate) — the original list covered writing nodes in, not reading or editing them back out.
- **Graph:** 1 of 3 added (`/group` for D3) — health score deliberately stayed a computed field, not a route, per 5.3's reasoning.
- **Recovery/Payments:** 7 of 13 added — the state machine in the solution doc implies several transitions (`respond`, `nudge`, `report-failure`, `proof`) that need a caller, and G1's draft/send split needed two routes where the original list had none for vendor comms.
- **Suraksha/Settings:** 7 of 8 added — the original list only had the SOS trigger; every I-series and H4 settings screen needed something to read/write against.

Nothing here contradicts a decision already made in the solution doc or build guide — every addition fills a gap those two left implicit, not a redesign.