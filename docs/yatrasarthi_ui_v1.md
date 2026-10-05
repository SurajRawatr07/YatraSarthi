# YatraSarthi: full UI screen plan

Every screen in the app, grouped by flow, with its purpose, on-screen elements, and the actual copy it shows. No visual styling — this is a content and structure spec to build from.

#### Screen map

**A. Onboarding & account**

1. Splash
2. Onboarding carousel
3. Phone sign-in
4. Permissions & consent

**B. Trips home**

1. Trips list
2. Create trip
3. Invite group (Kutumb link)
4. Trip settings

**C. Ingestion**

1. Ingestion hub
2. Email forwarding setup
3. Upload document
4. Extraction review & confirm
5. Add phantom node
6. Booking detail

**D. Trip graph & health**

1. Trip timeline
2. Node detail
3. Group overview
4. Health score

**E. Disruption & recovery**

1. Disruption alert
2. Cascade impact
3. Recovery options
4. Recovery option detail
5. Group decision

**F. Payments**

1. Payment request (split pay)
2. Payment status tracker
3. Payment methods

**G. Execution & vendor comms**

1. Vendor email draft
2. Action status (pending vendor)
3. Upload proof
4. Trip resolved

**H. Suraksha**

1. SOS screen
2. SOS confirm (undo window)
3. SOS sent confirmation
4. Emergency contacts setup

**I. Settings & account**

1. Profile & account
2. Notification preferences
3. Subscription / Pro
4. Policy library / help
5. Trip history

## A. Onboarding & account

### A1. Splash

First frame on launch, while the session is checked.

#### Elements

- Wordmark, centered
- One-line tagline beneath it
- No spinner text — a plain loading indicator only

Tagline

Your trip, still on track — no matter who broke it.

### A2. Onboarding carousel

Three swipeable slides explaining the value before sign-in. Skippable.

#### Elements

- Slide 1 — headline + one line + illustration placeholder
- Slide 2 — headline + one line
- Slide 3 — headline + one line
- Dots indicator, "Skip" (top right), "Next" / "Get started" (bottom)

Slide 1

**One flight's delay is another booking's problem.**\
Your flight, hotel and cab are all connected — even when you booked them separately.

Slide 2

**We catch it before you do.**\
Add every booking, and we'll flag what a delay breaks downstream.

Slide 3

**Travelling as a group? We track everyone.**\
Link your trip with friends and family — one delay, one shared plan to fix it.

Buttons

Skip · Next · Get started

### A3. Phone sign-in

Phone-number entry, then OTP verification, in two steps on one screen.

#### Elements — step 1

- Heading, phone number field with country code (default +91)
- Consent line with links to Terms and Privacy
- "Send OTP" button (disabled until valid)

#### Elements — step 2

- "Enter the code sent to +91 XXXXX XXXXX" with "Change" link
- 6-digit OTP field, auto-read where supported
- Countdown before "Resend code" activates
- "Verify" button

Headline

Enter your phone number

Consent line

By continuing, you agree to the Terms and Privacy Policy.

OTP error

That code didn't match. Check the message and try again.

### A4. Permissions & consent

One screen requesting each permission with its reason, asked in context rather than all at once where possible — this is the fallback summary screen shown once at first launch.

#### Elements

- List of permission rows: Location, Notifications, Contacts (for Suraksha) — each with an icon slot, one-line reason, and an "Allow" action that triggers the native OS prompt
- Data note at the bottom, linking to the full privacy policy
- "Continue" button, enabled regardless of what was allowed

Location

Used to time your phantom-node legs and to share your position if you ever tap Suraksha.

Notifications

Used to alert you the moment a delay affects your plan.

Contacts

Used only to let you pick emergency contacts for Suraksha. Nothing is uploaded until you choose someone.

Data note

Group members only see the parts of your trip you share with them. Read the full privacy policy.

## B. Trips home

### B1. Trips list

Landing screen after sign-in. Every trip the user belongs to, current ones first.

#### Elements

- "Trips" heading, "+ New trip" action (top right)
- Section: *Upcoming & active* — trip cards with destination, dates, status word (Healthy / Needs attention / Resolving), member avatars, health score number
- Section: *Past trips* — collapsed by default, link to full history (I5)
- Empty state (no trips yet)

**Empty state:** "No trips yet — add your first booking and we'll start building the plan." with a "+ New trip" button.\
**Needs attention card:** shows the one-line reason, e.g. "Rahul's train is delayed 4h."

### B2. Create trip

Minimal form to start a Trip ID before anything is ingested.

#### Elements

- Trip name field (e.g. "Goa with the gang")
- Destination field
- Start date / end date pickers
- "Create trip" button → lands on Ingestion hub (C1)

Helper text under name field

You can rename this later — group members will see this name.

### B3. Invite group (Kutumb link)

Shown right after trip creation and reachable any time from trip settings. Lets others join the same Trip ID.

#### Elements

- Shareable link and a short join code
- "Share via WhatsApp" / "Share via SMS" / "Copy link" actions
- List of members already joined, with an "Owner" tag on the creator
- "Skip for now" link if travelling alone or inviting later

Headline

Bring the rest of the group in

Body

Anyone with this link can add their own bookings to this trip and see the shared plan.

Share message template

Join our Goa trip on YatraSarthi so we can track everyone's bookings in one place: \[link\]

### B4. Trip settings

Per-trip settings, reached from the trip timeline's overflow menu.

#### Elements

- Rename trip field
- Dates
- Members list with "Remove" (owner only) and "Leave trip" (self)
- Invite link (reuses B3)
- "Delete trip" (owner only, confirmation required)

Delete confirmation

Delete "Goa with the gang"? This removes it for every member and can't be undone.

## C. Ingestion

### C1. Ingestion hub

The screen the user returns to every time they have something new to add to a trip.

#### Elements

- Four add options as rows or tiles: *Forward an email*, *Upload a file or screenshot*, *Paste an SMS*, *Add a manual leg*
- List of everything already added to this trip so far, grouped by date, each row tappable to Booking detail (C6)
- Status tag per item: *Confirmed*, *Needs your review*, *Manual*

Headline

Add what you've booked

Empty state

Nothing added yet. Forward a booking email or upload a screenshot to get started.

### C2. Email forwarding setup

Shows the trip's unique forwarding address and how to use it.

#### Elements

- The forwarding address, with a "Copy" action
- "Add to contacts" shortcut
- Three-step instructions
- List of emails received so far for this trip, with parse status

Headline

Forward booking emails here

Steps

1\. Copy this address.\
2\. Forward any flight, train, hotel or cab confirmation to it.\
3\. We'll pull out the details and ask you to confirm before adding them.

Note

Only emails forwarded from your account are accepted.

### C3. Upload document

Camera capture or file picker for a PDF, screenshot, or PNR text.

#### Elements

- "Take photo" / "Choose from files" / "Paste text" tabs
- Preview of the captured image or pasted text before submitting
- "Extract details" button
- Processing state while Claude parses it

**Processing:** "Reading your booking…"\
**Failure:** "We couldn't read that clearly. Try a clearer photo, or enter the details yourself." with a "Enter manually" fallback to C5.

### C4. Extraction review & confirm

Every parsed booking stops here before it enters the trip graph. Low-confidence fields are visibly flagged, never silently accepted.

#### Elements

- Booking type detected (Flight / Train / Hotel / Cab) with a way to correct it
- Each extracted field as an editable row: label, value, and a "Check this" flag on low-confidence fields
- Detected refund/cancellation policy line, with its source noted (from the booking text, or looked up from the policy library) and an "Is this right?" prompt if unmatched
- "Looks right, add it" primary button; "Cancel" discards

Headline

Confirm what we found

Low-confidence field flag

Check this — we're not fully sure we read it correctly.

Policy line, matched

Cancellation: free up to 48h before check-in (from \[Hotel\]'s policy).

Policy line, unmatched

We couldn't confirm this vendor's cancellation policy. Do you know it?

with a text field and "Skip for now".

### C5. Add phantom node

Manual entry for legs with no ticket — an auto, a walk, a local train.

#### Elements

- Mode selector: Auto/cab, Walk, Local train, Bus, Other
- From / To fields (free text or map pin)
- Estimated time, pre-filled from the routing provider once From/To are set, shown as "Estimated: 22 min"
- "Add buffer" stepper to pad the estimate, with the resulting total shown live
- Departs-by time, calculated backward from the next fixed booking
- "Add leg" button

Headline

Add an unbooked leg

Buffer helper

Indian traffic can run long — pad this if you'd rather be early.

Departs-by note

Leave by 6:40 AM to make your 9:10 AM flight with this buffer.

### C6. Booking detail

Full view of a single node — what was booked, its timing, and its place in the trip.

#### Elements

- Vendor, booking reference, date/time, status word
- Full extracted fields (read-only, with an "Edit" action back to C4-style fields)
- Cancellation/refund policy, as confirmed
- Position in the trip: previous and next node, buffer to each
- "Remove from trip" action

## D. Trip graph & health

### D1. Trip timeline

The main screen for an active trip — every node in order, with its status.

#### Elements

- Trip name, dates, overall status word at the top (Healthy / Needs attention / Resolving)
- Vertical sequence of nodes: icon by mode, name, time, status word per node (On track / At risk / Broken / Confirmed)
- Buffer indicator between consecutive nodes, tappable to adjust
- Banner at top when a disruption is active, linking to Cascade impact (E2)
- Floating "+" to return to Ingestion hub
- Tabs or toggle: *My path* / *Whole group* (jumps to D3)

Banner, active disruption

Rahul's train is delayed 4h — see what it affects

### D2. Node detail

Tapping any node on the timeline opens its status and controls, distinct from Booking detail (C6) by focusing on timing and dependencies rather than the raw booking.

#### Elements

- Node name, current status word, live estimate if in-window (phantom nodes)
- Buffer to previous and next node, each editable
- Constraint type shown in plain words: "Fixed pickup time" (hard) or "Can wait, at a cost" (soft)
- If at risk or broken: the reason, and a link into Recovery options (E3)
- Link back to the full booking (C6)

### D3. Group overview

For multi-origin trips — shows every member's path converging on shared nodes.

#### Elements

- One row per member: name, current leg, status word
- Shared nodes marked distinctly (e.g. "Goa airport cab — shared by 4")
- Weakest-link callout naming whoever is most at risk
- Tap a member to see their individual timeline (D1 filtered)

Weakest-link callout

Rahul's train is the tightest link right now — everyone else has slack.

### D4. Health score

Pre-trip screen showing how fragile the plan is, reachable from the trip timeline before departure.

#### Elements

- Score, shown as a number out of 100 with a one-word read (Solid / Fragile / At risk)
- The single weakest edge, named, with its estimated miss chance
- One or two suggested fixes as actionable rows (e.g. "Add 30 min buffer here", "Consider an earlier train")
- "Recalculate" note explaining the score updates as bookings and buffers change

Headline

How solid is this plan?

Weakest-edge line

Your tightest connection: Mumbai flight to Goa cab, 45 min buffer. About a 1-in-4 chance this gets tight.

Suggested fix

Push the cab pickup 30 minutes later to bring this down.

## E. Disruption & recovery

### E1. Disruption alert

Push notification plus its matching in-app banner/modal when the user opens the app from it.

#### Elements — push notification

- Title naming what broke
- Body with the immediate consequence
- Tapping opens Cascade impact (E2) directly

Push title

Rahul's train is delayed 4 hours

Push body

This affects your shared cab at Goa airport. Tap to see the plan.

### E2. Cascade impact

What broke and everything it affects downstream, before any recovery options are shown.

#### Elements

- Broken node at the top, with the delay and its source (e.g. "user-reported", "flight provider")
- List of downstream effects, each as a line: affected node, consequence, estimated cost if any
- Who is affected (which group members)
- "See recovery options" primary button

Headline

Here's what this breaks

Effect line

Goa airport cab — will leave before Rahul arrives. Waiting incurs a ₹1,500 charge.

Effect line, hard break

Airbnb check-in window — closes before the group can arrive together.

### E3. Recovery options

Ranked list of recovery plans, with a way to re-sort by what matters most.

#### Elements

- Preference toggle: Cheapest / Fastest / Preserve itinerary, re-ranks the list live
- Each option as a card: short name, net cost, arrival time, nodes dropped (if any), a "Recommended" tag on the top-ranked one
- "Compare on a chart" link opening a cost-vs-time view for people who want to see trade-offs directly
- Tap an option to open its detail (E4)

Headline

Here's how to fix it

Option card

Push the cab by 4 hours — ₹1,200 total, everyone arrives together

Option card, alternative

Split up — Priya takes a taxi now, Rahul takes a bus later — saves ₹400

### E4. Recovery option detail

Full breakdown of one option before the group commits to it.

#### Elements

- What changes, node by node, compared to the original plan
- Cost breakdown: penalty or new booking cost, any possible compensation shown separately and marked "possible, not guaranteed"
- Per-member share if a split payment will be needed
- Quote validity note if pulled from live inventory ("Prices confirmed as of 2 minutes ago")
- "Propose this to the group" button

Compensation line

Possible DGCA compensation: up to ₹10,000, if the airline confirms the cause. Not included in the cost above.

### E5. Group decision

Shows the group's live response to a proposed option — a lightweight vote, not a full chat.

#### Elements

- The proposed option, restated briefly
- Each member's response: Agreed / Not yet / Declined, with avatars
- "Agree" / "Suggest something else" buttons for the current user
- Once everyone agrees, auto-advances to Payment request (F1) if payment is needed, or straight to execution

Waiting state

Waiting on Rahul and Priya to confirm.

## F. Payments

### F1. Payment request (split pay)

Shown to each payer once the group has agreed on an option requiring money.

#### Elements

- What this payment is for, one line
- This member's share, clearly separated from the group total
- "Pay now" button opening the aggregator's payment link
- Countdown to the payment deadline
- "Ask someone to cover me" fallback linking to the group decision screen

Headline

Your share for pushing the cab

Amount line

₹600 of ₹1,200 total — split between you and Rahul

Deadline note

Pay within 20 minutes or this option expires and we'll re-plan.

### F2. Payment status tracker

Live view of who has paid, visible to the whole group while a payment is pending.

#### Elements

- Each member's row: name, amount, status (Paid / Pending)
- Overall countdown to timeout
- Once all paid: confirmation and a hand-off line to execution
- On timeout: what happens next, and a re-plan action

**All paid:** "Everyone's paid — sending this to the cab operator now."\
**Timeout, partial:** "Time's up — Priya's ₹600 will be refunded. Want to try again or pick a different option?"

### F3. Payment methods

Settings screen for linking a payment method used to pay one's own share faster.

#### Elements

- Linked UPI ID or card, masked
- "Change" / "Remove" actions
- Note on what this is used for

Note

This speeds up paying your share during a disruption. We never charge you without a payment you've approved.

## G. Execution & vendor comms

### G1. Vendor email draft

Shown when a recovery step needs a message to a vendor with no booking API — the most common case.

#### Elements

- Drafted subject and body, fully editable
- Note on which policy or rule the draft is based on
- "Send from my email" / "Copy to send via WhatsApp" actions
- "Mark as sent" once the user has actually sent it, moving the action to pending vendor

Draft subject

Request to move booking \[ref\] to a later time

Draft body excerpt

Hi, our train has been delayed and we'd like to push our pickup from 4:00 PM to 8:00 PM instead of cancelling. Please confirm if this is possible and any change in cost.

Send confirmation prompt

Sent it? Tap "Mark as sent" so we can track their reply.

### G2. Action status (pending vendor)

Holding screen for an action waiting on a vendor's reply — this is what keeps a trip amber rather than green.

#### Elements

- Status word: Pending vendor
- What was sent and when
- "Upload their reply" action
- "No reply yet — nudge again" action after a set time
- Manual override: "I confirmed by phone" leading into G3

Status line

Waiting on the cab operator to confirm the new pickup time.

### G3. Upload proof

Where a vendor's confirmation gets turned into a confirmed state.

#### Elements

- Upload or paste the vendor's reply (screenshot, forwarded email, text)
- Parsed confirmation summary for the user to confirm
- "Confirm and update trip" button

Parsed summary

Looks like the cab operator confirmed the 8:00 PM pickup. Mark this action as confirmed?

### G4. Trip resolved

Shown once every action tied to a disruption reaches confirmed.

#### Elements

- "Back to healthy" headline
- Summary of what changed from the original plan
- Link back to the trip timeline

Headline

You're back on track

Summary line

Cab pickup moved to 8:00 PM, confirmed by the operator. Everyone's plan is updated.

## H. Suraksha

### H1. SOS screen

Reached from a persistent, minimal entry point on the trip timeline, not buried in a menu.

#### Elements

- Single large "I'M STUCK" action, nothing else competing for attention
- One line explaining what happens when it's tapped
- Small link to Emergency contacts setup (H4) if none are set yet

Explainer line

This sends your location and trip status to your emergency contacts.

No contacts set

Add someone to alert before you need this.

### H2. SOS confirm (undo window)

Appears immediately after tapping SOS — a five-second window to cancel a mistaken tap, not a screen requiring extra confirmation steps.

#### Elements

- Countdown (5 seconds)
- What will be sent and to whom, shown plainly
- "Cancel" action, large and easy to hit
- Auto-sends when the countdown ends

Line

Sending your location to Mom and Priya in 5… Cancel

### H3. SOS sent confirmation

Confirms what went out, and keeps the recovery engine visibly working in the background.

#### Elements

- What was sent: location, battery level, last completed node, next intended node
- Who received it
- Local emergency numbers for the current state/district
- "We're also working on your next travel option" status line, linking to Recovery options (E3) once ready
- "Send again" / "I'm safe now" actions

Sent summary

Sent to Mom and Priya: your location, that you last reached BOM Airport, and that you were heading to the Goa Airbnb.

Local numbers

Maharashtra emergency: 112 · Police: 100

### H4. Emergency contacts setup

Settings screen for choosing who Suraksha alerts.

#### Elements

- List of selected contacts, pulled from device contacts
- "Add contact" action
- Per-contact toggle for SMS vs. WhatsApp delivery

## I. Settings & account

### I1. Profile & account

Basic account management.

#### Elements

- Name, phone number (read-only, tied to sign-in)
- "Delete account" action, with a clear explanation of what happens to shared trips

Delete account note

Your bookings are removed. Trips shared with a group stay visible to other members, without your details.

### I2. Notification preferences

Controls which alerts the user receives.

#### Elements

- Toggles: Disruption alerts, Proactive phantom-node warnings, Payment requests, Group activity
- Note that disruption alerts can't be fully turned off, only quieted, since they're safety-relevant

### I3. Subscription / Pro

Upgrade screen shown when a free-tier user hits a Pro feature, or reached directly from settings.

#### Elements

- What's included free vs. Pro, as a short comparison list
- Price: per-trip or annual, with a toggle
- "Upgrade" button

Free includes

Parsing, timeline, health score, passive alerts

Pro includes

Group sync, recovery plans, split payments, vendor email drafts, Suraksha contacts

### I4. Policy library / help

Reference screen explaining the rules the app uses, and general help.

#### Elements

- Plain-language summary of DGCA passenger rules, with a link to the source
- FAQ list: how recovery ranking works, how payments work, what "pending vendor" means
- Contact/support link

### I5. Trip history

Past trips, reached from the Trips list.

#### Elements

- List of completed trips, dates, a one-line note if any disruption occurred and was resolved
- Tap to view the final state of that trip's timeline, read-only