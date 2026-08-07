# SPA.cz Partner mobile app prototype

This repository contains a clickable, mobile-only prototype of the SPA.cz partner experience. The existing `spa/spacz_web` extranet is the source of functionality and business rules; it is not redesigned here and there is no desktop web proposal in this artifact.

The proposal covers the app areas listed below in Czech and English, a shared state engine, review pages, reproducible captures and an editable Figma export. Product screens are plain HTML/CSS/JS and open without a build step.

## Open the prototype

Always use the local or published HTTP URL for review. The product screens can still open from `file://`, but the changelog, use-case and comment pages intentionally fetch sibling data and therefore require HTTP:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. The standard local workshop server for this repository uses `http://127.0.0.1:4173/`.

## Mobile app map

| Area | Czech | English | Purpose |
| --- | --- | --- | --- |
| Dashboard | `m-dashboard.html` | `m-dashboard-en.html` | Start the operational day and route to urgent work. |
| Reservations | `m-reservations.html` | `m-reservations-en.html` | Search, filter and scan the reservation queue. |
| Reservation detail | `m-reservation-detail.html` | `m-reservation-detail-en.html` | Review guest, stay, package, contact and financial context. |
| Availability | `m-availability.html` | `m-availability-en.html` | Review or maintain room-day capacity and closures. |
| Offer | `m-offer.html` | `m-offer-en.html` | Inspect the package promise, meals, services and linked rate. |
| Rate edit | `m-rate-edit.html` | `m-rate-edit-en.html` | Make one deliberate pricing change with validation. |
| Billing | `m-billing.html` | `m-billing-en.html` | Review confirmed reservations and demonstrate approval or dispute. |
| More | `m-more.html` | `m-more-en.html` | Reach rooms, profile, gallery, invoices, users, permissions, settings and help. |

The primary flow is Dashboard → Reservations → Reservation detail → Billing. The commercial and inventory flow is Dashboard → Availability → Offer → Rate edit.

## Prototype state

The floating panel is review scaffolding, not proposed app UI. Each selection is stored in the URL so a reviewer can share an exact state. `nopanel=1` removes the panel for screenshots and Figma export.

| Panel row | Parameter | Values | Default |
| --- | --- | --- | --- |
| Session | `auth` | `in`, `out` | `in` |
| Access | `access` | `full`, `read`, `none` | `full` |
| Inventory connection | `connection` | `manual`, `chm` | `manual` |
| Information density | `density` | `compact`, `dense` | `dense` |
| Demo inventory | `inv` | `many`, `some`, `none` | `many` |
| Property mode | `hotel` | `active`, `test` | `active` |

Language is also switchable in the panel. There is no View/Desktop row because this project proposes only the mobile app.

`usecases.json` is the source of truth for the current set of meaningful product situations. Generate the reviewer payload and engineering reference with:

```bash
node tools/build-usecases.js --no-capture
```

Remove `--no-capture` to create the associated 390 px use-case screenshots once Chrome is available.

## Source-backed functionality

The feature inventory was traced in the existing SPA.cz web repository:

| Evidence | What it establishes |
| --- | --- |
| `app/boot/routerextranetspacz.php:18–150` | Dashboard, reservations, documents, packages, billing, rates, cancellation, photos, users, hotel, availability, channel manager, permissions, settings and help routes. |
| `app/controllers/extranetspacz/ReservationsController.php:46–157` | A reservation is scoped to hotel/product and assembles price, commission, guests, rooms, status, voucher, cancellation, package, contact and invoice context. |
| `app/controllers/extranetspacz/AvailabilityOverviewController.php:19–32,67–118` | Active channel-manager mode is read-only; the overview is built from date range, capacity, closures and room-day data. |
| `app/views/scriptsextranetspacz/availability-overview/index.tpl:1–24` | The current UI explicitly warns that channel-manager availability cannot be changed and exposes the date-range table and save flow. |
| `app/controllers/extranetspacz/PackagesController.php:12–220` | Stay-package creation and maintenance covers approval, rooms, meals, procedures, cancellation and rate plans. |
| `app/controllers/extranetspacz/RatesController.php:9–138` | Accommodation rate plans, pricing models, bulk editing, meals and services. |
| `app/controllers/extranetspacz/BillingController.php:13–139,252–259` | Confirmed reservations for invoicing, account-dependent editing, net/gross handling, frequencies and approval/dispute filters. |
| `app/controllers/extranetspacz/ajax/BillingController.php:43–134` | Approval requires an eligible account; dispute requires a reason and positive price; a prior action can be undone. |

The full evidence map is in `research/fact-base.md`.

## Fixture data

The app uses deterministic static fixtures. No production database dump is required, and the supplied `User` row is not imported or copied into the prototype.

Product examples are deterministic workshop fixtures, not claims about a currently published commercial offer. Their provenance and any time-sensitive evidence remain isolated in `research/fact-base.md`.

## Visual source of truth

The app combines the supplied Szallas design-system structure with confirmed SPA.cz branding.

- Type: Outfit for headings; DM Sans for body and UI.
- SPA.cz primary: `#1174BB`; dark: `#0F5180`; light: `#3EB3FF`; pale: `#B5D3EA`.
- Dominant surface: white `#FFFFFF`; ink: `#111111`; neutral text: `#3F3F3F`–`#5C5C5C`; structural line: `#C9C9C9`.
- Brand-positive: `#89C02C`; positive action: `#76B82A`; hover: `#5FA013`; error: `#DD1111`.
- Focus: `#1174BB33` halo with `#1174BBCC` edge.
- Cards and controls use the design-system radius scale, typically 8–12 px.
- Layout spacing follows the supplied scale at a 70% rhythm. Body text starts at 17 px, supporting text at 15 px and metadata at 13 px. Icons and touch targets are not compressed; controls remain at least 48 px and tap targets at least 44 px.
- Review captures and editable Figma frames use a real 390 × 844 phone viewport. The HTML application remains vertically scrollable below the fold.

Confirmed design-system frames: color `8778:30914`, semantic color `8922:35914`, spacing `8779:34761`, radius `8779:34779`, shadows `4279:13739`, mobile typography `8778:32941`, buttons `3097:13934`, inputs `4909:20695`, header `6032:15106`, bottom navigation `4176:3888`, sheet `6281:4792`, reservations `6726:7931`.

`tokens-m.css` and `app-m.css` are the mobile visual source of truth. `specs.html` is the reviewer/developer reference for reusable patterns.

## Rebuild artifacts

Install the pinned tooling in its own directory:

```bash
npm --prefix tools ci
```

Then use the narrow command for the artifact being changed:

```bash
node tools/capture-previews.js
node tools/build-usecases.js
node tools/build-changelog.js
node tools/dump-frames.js prototype.json
node tools/generate-fig.js prototype.json
```

Run the project-specific quality gates before publishing:

```bash
npm --prefix tools test
npm --prefix tools run lint
npm --prefix tools run test:browser
```

The browser gate walks all 16 product screens at 390 px and verifies state changes, the floating review panel, bottom sheets, read-only behavior and document-level overflow.

Or refresh the full chain, including the declared preview script:

```bash
node tools/refresh.js --allow-package-scripts
```

`prototype.json` exports 24 editable 390 × 844 frames to `spa-cz-partner-mobile.fig`: 8 Czech screens, 8 English screens and 8 URL-pinned states. The schema donor at `tools/.schema/canvas.fig` is the 28,932-byte schema-only prefix extracted from the supplied `Szallas Design System.fig`; the large source export is not copied into this repository.

## Workshop round 2 — readability correction

The 7 August 2026 review replaced the pale blue-grey application layer with a white and near-black base, neutral grey boundaries, SPA.cz blue for navigation/actions and SPA green for positive states/actions. It raised the entire mobile type floor, removed the top prototype hint bar, changed review-page navigation into a vertical stack, and fixed every visual deliverable to a 390 × 844 phone viewport instead of exporting the full document height.

## Stakeholder comments and privacy

The complete comment layer is included but disabled by default: `comments.config.json` is intentionally absent and ignored by Git. A configured deployment injects the validated JSON from the `COMMENTS_CONFIG_JSON` GitHub Actions secret. Follow the [Firebase comments setup, verification and recovery runbook](docs/firebase-comments-setup.md) to activate it in a dedicated project without committing deployment configuration or reviewer data.

When enabled:

- Google-signed-in comments use the configured third-party Firebase service.
- Threads are stored in that Firebase project, not in these static HTML files.
- Reviewer access must be restricted by the approved email-domain rule; the exact owner must also have an `allowed/{email}` document.
- Comment exports contain names and email addresses. Keep them private and never commit or publish them.

The GitHub Pages workflow publishes the review hub, review pages, `m-*.html` app screens and their required static assets. It deliberately does not package any non-mobile product HTML.

## Handoff boundary

The `.fig` file is the editable design handoff. The HTML/CSS/JS screens provide behavior and review fidelity. `proto-m.js`, `proto-tools.*`, `proto-comments.*` and `proto-discussion.*` are prototype scaffolding and must not be shipped as production application code.
