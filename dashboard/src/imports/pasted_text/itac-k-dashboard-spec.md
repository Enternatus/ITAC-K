ITAC-K Dashboard — UI/UX Specification

Product: Real-time control dashboard for ITAC-K, a bounded-state distributed resource-allocation controller, demonstrated via smart parking. Core message the interface must communicate: ITAC-K does not try to know everything. It identifies what is uncertain and gathers only the evidence needed to make the next decision. Tone: research control room, not a SaaS analytics app. Restrained, precise, legible from across a demo room.

0. Design Philosophy (read this before building anything)

Every screen answers one of two questions, and the layout must make it obvious which one you're looking at:

"What did it decide?" — big, immediate, confident. Slot recommendation, action taken.
"Why did it decide that?" — smaller, denser, closer inspection. Policy relationship, uncertainty, evidence source.

These two layers are never merged into one card. A user glancing at a screen should be able to answer "what" in under 3 seconds without reading "why" at all.

The visual system should express causal flow (observation → uncertainty → evidence → decision) rather than a dashboard of unrelated widgets. Wherever practical, components are arranged left-to-right or top-to-bottom in that causal order.

1. Design System
1.1 Typography
Display/Numeric font: a monospaced or semi-monospaced technical face (e.g. IBM Plex Mono, JetBrains Mono) for all numeric telemetry, timestamps, IDs, and confidence values. This is what makes it read as instrumentation rather than a marketing dashboard.
UI/Label font: a clean grotesk (e.g. IBM Plex Sans, Inter) for labels, body copy, and the "Why did it do that?" explanations.
Scale (desktop base 16px):
Display XL (slot recommendation): 40 / 44px, monospaced, weight 600
H1 (screen title): 22px sans, weight 600
H2 (card title): 15px sans, weight 600, uppercase, letter-spacing 0.04em
Body: 14px sans
Telemetry value: 18–24px mono, weight 500
Telemetry label / caption: 12px sans, uppercase, letter-spacing 0.06em, muted color
Timestamp/log: 12px mono
1.2 Color System

Restrained, near-monochrome base with a small fixed semantic palette. No decorative gradients.

Base surface: near-black 
#0E1114 (dark mode primary) or off-white 
#F6F7F8 (light mode) — pick one primary theme; dark is preferred for a "control room" read on a demo screen.
Panel surface: one step lighter than base, 
#161A1E on dark, 
#FFFFFF on light, 1px hairline border 
#262B31 / 
#E4E6E8.
Text primary: 
#EDEFF1 / 
#12151A
Text muted: 
#8A929C / 
#5B6470
Semantic (fixed meaning everywhere in the app — never reused for anything else):
Available slot / evidence accepted / recovered → Green 
#33C481
Occupied slot / evidence rejected / alert → Amber-red 
#E5533D
Uncertainty / ambiguity / pending → Amber 
#E8A33D
Local evidence → Cyan 
#3FB6D6
Peer/remote evidence → Violet 
#9A7FE0
Neutral/inactive → grey, 
#4A515A

Uncertainty is never shown as a decorative gauge. It is shown as: (a) a horizontal confidence bar with a visible "ambiguity band" around the decision boundary, and (b) a text-labeled state (CLEAR, NARROW, UNRESOLVED). Color reinforces but never replaces the label — this system must remain readable to colorblind judges.

1.3 Spacing & Grid
Base unit: 8px. Card padding 20px. Card-to-card gutter 16px.
Desktop: 12-column grid, max content width 1440px, side nav 72px (icon-only) or 220px (expanded).
Corner radius: 8px on cards, 4px on badges/buttons — sharp enough to feel engineered, not soft/consumer.
No shadows for depth; use the 1px border + subtle surface-tone difference instead (keeps the "instrument panel" feel and stays legible on a projector).
1.4 Core Components

Card Panel surface, 1px border, H2 title top-left, optional right-aligned meta (timestamp / status badge). No shadow.

Status Badge Rounded-rect, 4px radius, uppercase 11px label, filled with 15%-opacity semantic color + full-opacity text/border of that color. Variants: AVAILABLE, OCCUPIED, RECOMMENDED, EXPLOIT, REMOTE SUBSTITUTE, LOCAL PROBE, ACCEPTED, REJECTED, STALE, CONTEXT-MISMATCH.

Confidence / Boundary Bar A horizontal bar, 0–100%, with:

a filled segment showing current confidence in the leading policy,
a shaded "ambiguity band" overlay showing how close the two competing policies are,
a small tick + label at the decision boundary. Below it, a state label: CLEAR BOUNDARY (green) / NARROW BOUNDARY (amber) / UNRESOLVED BOUNDARY (amber-red).

Evidence Source Chip Small pill: cyan dot + "LOCAL PROBE" or violet dot + "PEER: NODE-03". Used anywhere evidence provenance must be shown at a glance.

Peer/Node Indicator Circle (12px) representing a physical node. Fill = connectivity (solid = online, hollow = offline). Ring color = qualification state of its most recent evidence (green ring = accepted, red ring = rejected, amber ring = stale, grey ring = context-mismatched). Hover/tap reveals a tooltip with node ID, last-seen time, and last evidence verdict.

Timeline / Event Log Row Left: mono timestamp. Center: icon + event text in sans. Right: optional tag (DECISION, EVIDENCE, SYSTEM). Rows are dense (36px height) and monochrome by default; only state-change rows (decision changed, recovery completed) get a colored left border accent.

Tabs Underline style, uppercase 12px labels, active tab gets a 2px bottom border in text-primary color. Used for screen sub-navigation and for switching chart time ranges.

Table Mono for numeric columns, sans for labels. Zebra-free; row separators are 1px hairlines. Right-align all numeric columns.

Buttons Primary: filled text-primary background, base-surface text, 4px radius, 13px uppercase label. Secondary: 1px border, transparent fill. Icon-only buttons for dense toolbars (e.g. pause log, expand card).

Alert / Inline Notice Left-accent bar (4px, semantic color) + icon + short text. Used for connection loss, stale peer data, sensor fault — never as a full-width banner that pushes content down; it docks into the relevant card.

2. Screen 1 — Overview / Live Parking (the demo screen)

This is the screen on-screen for 90% of a live demonstration. It must be understandable in 10–15 seconds with zero explanation.

Layout hierarchy (desktop, top to bottom / left to right)
Top bar (48px): product mark "ITAC-K" (mono), current mode indicator (LIVE pulsing green dot), connection status, screen tabs (Overview / Decision / Telemetry / History / Performance).
Hero row — visually dominant, ~40% of viewport height:
Left (60% width): Recommended Slot Card. Enormous mono numeral of the recommended slot ("SLOT 2"), status badge RECOMMENDED, one-line plain-English reason directly beneath it in sans (pulled from the Why-panel, truncated to ~18 words, e.g. "Policy A currently more suitable — no probe was needed."), and a "Why did it do that? →" link into Screen 2.
Right (40% width): Current Action Card. The selected action as a large badge (EXPLOIT / REMOTE SUBSTITUTE / LOCAL PROBE), evidence source chip beneath it, decision timestamp in mono, small confidence/boundary bar.
Slot Grid row: three equally-sized Slot Cards (Slot 1 / 2 / 3), each showing: slot number, big status badge (AVAILABLE green / OCCUPIED red), small sensor icon with "sensor OK" / "sensor fault" micro-state, and a subtle highlighted border on the currently recommended slot only (2px accent border — the only card allowed a colored border, to keep it unmistakable).
Secondary row (two cards side by side, ~25% height):
Left: Compact Peer Strip. A horizontal row of node indicators (see component spec) with a one-line summary ("3/4 peers online, 1 evidence rejected — context mismatch").
Right: Live Event Log (compact, last 6 events). Scoped to headline events only (decision changed, recovery completed, probe triggered); full log lives on Screen 4.
What's visually dominant

The Recommended Slot numeral. Everything else is secondary by at least one typographic step. No other element competes with it in size or color saturation.

Interaction behavior
Recommended Slot Card and Current Action Card are both clickable → deep-link to Screen 2 (Decision Detail), pre-scrolled to the relevant section.
Slot cards are clickable → filter Screen 4 event log to that slot.
Peer strip nodes are hoverable/tappable → tooltip; tapping opens Screen 3 peer table pre-filtered.
Event log auto-scrolls with new entries; a pause icon freezes it without stopping ingestion.
Empty / loading / error states
Loading: skeleton cards with pulsing placeholder bars; do not show a spinner over the hero card — first-paint should feel instant even if data is 1–2s behind.
No current recommendation (cold start): Recommended Slot Card shows "AWAITING FIRST DECISION" in muted mono instead of a slot number; slot grid still renders with sensor states if available.
Sensor fault on the recommended slot: amber-red inline alert docked at the bottom of that slot card: "Sensor fault — last confirmed state used."
Connection lost: top bar connection indicator turns amber-red and label changes to RECONNECTING; all cards dim to 70% opacity and freeze at last-known values with a timestamp of last update rather than going blank.
Responsive behavior
Tablet: hero row stacks to full-width Recommended Slot Card, then full-width Current Action Card below it. Slot grid stays 3-across if width allows, else 3-across at reduced padding (tablets are rarely narrow enough to force a stack).
Mobile / driver-facing: single column. Order: Recommended Slot Card (full width, numeral scaled down to ~28px but still dominant) → one-line reason → Slot Grid as 3 compact rows instead of cards (slot number, badge, sensor icon inline) → Current Action Card collapsed to a single badge + chip row → Peer strip and event log hidden behind a "Show system detail" disclosure (driver-facing view should default to only what a parking user needs).
3. Screen 2 — Decision Detail

Deep explanation of the current decision. This is the primary destination for the "Why did it do that?" question.

Layout hierarchy
Header: decision timestamp, action badge, "current decision" vs "previous decision" toggle (tabs) so a judge can compare the last two decisions.
Causal Flow Strip (visually distinctive, full width, ~120px tall): a left-to-right horizontal diagram with 5 connected nodes matching the actual causal chain: OBSERVATION → VOLATILITY STATE → PREDICTIVE RELIABILITY → POLICY BOUNDARY → EVIDENCE ACQUIRED → DECISION. Each node is a compact chip with a one-word current value beneath it (e.g. under "VOLATILITY STATE": MODERATE). This is the single element that teaches the whole ITAC-K concept at a glance — it should appear on this screen only, as the anchor for everything below it.
Two-column body below the strip:
Left column — "What": Selected Policy Card (selected policy name, competing policy name, confidence/boundary bar full-size with the ambiguity band clearly labeled), Evidence Card (source chip, peer qualification state if remote, context match indicator, evidence freshness in mono seconds/ms, small map/list of which node supplied it).
Right column — "Why" (plain language): the Why Panel, sans-serif, larger line-height, written as 2–4 short sentences, e.g.: "Slot 2 was selected because Policy A currently has higher expected suitability. The A/B decision boundary was sufficiently clear, so no physical probe was required." This panel is never technical jargon-first; it names the policy and boundary state in words before any numbers.
Footer strip: decision cost/regret for this decision, kinematic urgency value, uncertainty debt value — three small stat tiles, mono numerals with sans captions, no charts (this is a snapshot, not a trend — trends live on Screen 5).
What's visually dominant

The Causal Flow Strip (structural understanding) and the Why Panel (plain-language understanding) — never the raw numeric tiles.

Interaction behavior
Clicking any node in the Causal Flow Strip scrolls/highlights the corresponding card below it.
"Current decision / previous decision" toggle swaps all card contents with a brief cross-fade; the Why Panel updates its wording accordingly.
Evidence Card, if remote: clicking the supplying node deep-links to that node's row on Screen 3.
Empty / loading / error states
If no previous decision exists yet (first decision since boot), the toggle's "previous" tab is disabled with a tooltip "No prior decision yet."
If evidence freshness has expired mid-view (peer went stale while the user is looking), the Evidence Card border shifts to amber and a small "now stale" tag appears without reloading the whole screen.
Responsive behavior
Tablet: Causal Flow Strip becomes horizontally scrollable if it doesn't fit; two-column body stacks to Left-then-Right.
Mobile: Causal Flow Strip becomes a vertical stepper (same 5 nodes, top-to-bottom) since a 5-node horizontal flow won't fit legibly; Why Panel is promoted above the What cards on mobile, since plain-language explanation matters most on the smallest screen.
4. Screen 3 — System / Technical Telemetry

For the technical evaluator. Densest screen in the product; this is where progressive depth pays off.

Layout hierarchy
Header: screen title + a "compact / detailed" density toggle (detailed adds numeric precision and extra columns to every table on this screen).
Top row — three telemetry tiles: Environmental Volatility (state label + small sparkline of last N minutes, not a gauge), Uncertainty Debt (mono value + short trend arrow), Kinematic Urgency (mono value + short trend arrow). Sparklines are thin, single-color, axis-free — context, not analysis (deep trends belong on Screen 5).
Policy Relationship Card (full width): the competing-policy pair named explicitly (e.g. "Policy A vs Policy B"), the confidence/boundary bar at full size, and a small history strip beneath it showing the boundary state over the last ~10 decisions as a row of small colored ticks (green/amber/red) — a compact, non-chart way to show "has this boundary been stable?"
Peer / Swarm Table (full width): one row per node — Node ID, connectivity (online/offline), last evidence timestamp, verdict badge (ACCEPTED / REJECTED / STALE / CONTEXT-MISMATCH), context-match score (mono, e.g. 0.82), freshness (mono, e.g. 340ms). Sortable by any column.
Node Map (optional secondary panel beside the table, collapsible): simple schematic layout of node positions (not a real map — a labeled diagram matching the physical demo layout) with the same ring-indicator component as the Overview peer strip, at larger size with live labels.
What's visually dominant

The Policy Relationship Card — it's the one place the full uncertainty picture (current + recent history) lives in one place.

Interaction behavior
Density toggle affects tables and tiles only, not layout structure.
Table rows expand inline on click to show the Decision-Detail-style evidence explanation for that node's most recent contribution, without navigating away.
Sparklines are non-interactive (deliberately — this screen shows current+recent state, not analysis; analysis is Screen 5's job).
Empty / loading / error states
Zero connected peers: Peer Table shows a single centered row: "No peers currently reachable — running on local evidence only," and the Node Map dims to greyscale outlines.
Sensor read failure feeding volatility state: the Environmental Volatility tile shows STALE INPUT in amber instead of a value, with last-known value retained at reduced opacity.
Responsive behavior
Tablet: three top tiles go 2-up + 1 below; table remains full width with horizontal scroll for extra columns in detailed mode.
Mobile: top tiles stack vertically as compact rows (label + value + trend arrow inline, no sparkline); Peer Table becomes a stacked card list (one card per node) instead of a table; Node Map is hidden behind a toggle button, off by default.
5. Screen 4 — Event History

Timeline of controller decisions and state transitions — the audit trail.

Layout hierarchy
Header + filter bar: tabs or chip-filters for event category (ALL / DECISIONS / EVIDENCE / SYSTEM), a slot filter (carried over from Screen 1 deep-links), a time-range control, and a search box for free-text event matching.
Main timeline (single column, full width, vertical): dense rows as specified in the Timeline component (§1.4), grouped by day with a sticky date divider. Decision-change and recovery-completed events get the colored left-border accent; routine events (peer evidence received, sensor ping) are visually quiet by default and only surface on hover/expand — this keeps the log scannable rather than noisy, matching principle #2 (don't overwhelm).
Row expansion: clicking a decision-change row expands it inline into a compact version of the Screen 2 Why Panel + causal snapshot, so a judge can replay past reasoning without leaving the log.
What's visually dominant

The colored-accent rows (decision changes, recoveries) — routine telemetry rows recede so the meaningful transitions stand out even in a long log.

Interaction behavior
Infinite scroll / virtualized list for performance over long demo sessions.
Filter chips are multi-select and combine with AND logic; active filters shown as removable tags above the timeline.
"Jump to now" floating button appears once the user has scrolled away from the live edge.
Empty / loading / error states
No events matching filters: centered message "No events match these filters" with a "Clear filters" button.
Log ingestion paused (connection lost): a docked banner at the top of the timeline ("Log paused — reconnecting…") rather than a blocking overlay, so historical rows remain fully readable.
Responsive behavior
Tablet: filter bar wraps to two rows if needed; timeline unchanged.
Mobile: filter bar collapses into a single "Filters" button opening a sheet; timeline rows drop the right-aligned tag to a small icon to save width; row expansion becomes a full-screen modal instead of inline (there isn't room to expand in place on a phone).
6. Screen 5 — Performance

Charts comparing ITAC-K behaviour over time. This is the only screen where charts are the primary content — everywhere else, charts are secondary or absent, per principle #10.

Layout hierarchy
Header: time-range tabs (1H / 1D / 7D / ALL), export/share icon.
Top stat row (4 compact tiles, no charts): Total Decisions, Physical Probes Triggered, Physical Probes Avoided (this is the number that matters most for the thesis — give it a subtly larger tile or an accent border), Recovery Delay (avg).
Chart grid (2 columns on desktop):
Decision Cost / Regret over time: line chart, mono axis labels, single accent line, shaded area under the curve kept very subtle (10% opacity) so it doesn't read as "busy."
Physical Probes: Triggered vs Avoided: stacked bar chart per time bucket (e.g. per hour), two-color (amber-red = triggered, green = avoided) — this is the chart that most directly proves the system's core value proposition (evidence-efficiency), so give it the most generous width if only one chart can be full-width.
Recovery Delay after environment change: bar chart, one bar per recorded volatility-change event, mono value labels on top of each bar.
Bad Aggressive Decisions over time: line chart (should trend toward zero/flat); annotate any spikes with a small marker linking to that event in Screen 4.
Local vs Peer Evidence Usage: stacked bar or 100%-stacked bar per time bucket, cyan (local) vs violet (peer) — reuses the same evidence color coding from every other screen so the mapping is learned once and holds everywhere.
Each chart card has a one-line plain-language caption beneath its title (e.g. "Fewer physical probes over time means the controller is relying more on cheap peer/local evidence and less on expensive direct sensing.") — charts are never left to speak entirely for themselves, per the same "why, not just what" principle used elsewhere.
What's visually dominant

The Physical Probes Triggered vs Avoided chart — it's the clearest, most legible proof of the system's design thesis, and should draw the eye first in the grid (top-left position, or full-width if a single-column mobile-first grid order is used).

Interaction behavior
Hover/tap on any chart point shows a tooltip with exact mono value + timestamp, and (for decision-related charts) a "View decision →" link into Screen 2 or 4.
Time-range tabs re-fetch and re-render all charts together, with a shared loading skeleton so charts don't resolve at staggered times.
Empty / loading / error states
Insufficient data for the selected range (e.g. 7D selected on a system that's been running 20 minutes): chart area shows a centered muted message "Not enough data yet for this range" with a suggestion to switch to 1H, rather than an empty axis.
Chart data fetch error: card-level inline alert ("Couldn't load this chart") with a retry icon button, isolated to that one card — other charts continue to render normally.
Responsive behavior
Tablet: chart grid drops to single column, in the priority order listed above (Probes chart first).
Mobile: stat row becomes a horizontally swipeable strip of tiles instead of a 4-up grid; charts render full-width, height reduced, x-axis labels thinned to avoid crowding (show every Nth label); captions remain (they matter more, not less, at small size).
7. Cross-Screen Rules (apply everywhere)
Color meaning is global and fixed (§1.2) — cyan always means local evidence, violet always means peer evidence, amber always means unresolved/ambiguous, everywhere in the product. This repetition is what lets a judge "learn the language" of the interface in the first screen and read every subsequent screen without re-explanation.
No element above the Recommended Slot numeral in size or saturation, anywhere in the product, except full-screen error states.
Every technical term that appears as a raw label (e.g. "kinematic urgency," "uncertainty debt") must have a one-line plain-English tooltip on hover/tap, so the interface is self-teaching without a separate glossary screen.
Progressive disclosure: Overview → Decision Detail → Technical Telemetry is the intended depth ramp. No screen before Technical Telemetry should require understanding a term that hasn't already been introduced in plain language one screen earlier.
Live/demo resilience: every screen must degrade gracefully to "last known state, clearly timestamped" rather than blanking, since the interface must survive real Wi-Fi/ESP-NOW hiccups during a live hardware demo without looking broken.