# Product use cases

Generated from `usecases.json`. The matrix is declared rather than a full cross-product: every switch option is documented and appears in at least one product use case.

## Local workshop

Open [`usecases.html`](../usecases.html) over HTTP to create, edit, duplicate, delete, search, validate, preview, import and export scenarios. Drafts stay in this browser until a normalized `usecases.json` is downloaded and deliberately committed; they do not create Firebase comment anchors.

The workshop protects local work when the published source fingerprint changes, caps imports at 1 MiB / 500 scenarios, and blocks export until every declared state option is covered. After replacing the source JSON, run `node tools/build-usecases.js` to regenerate this document, the review payload and one representative capture per scenario.

## State reference

### Session (`auth`)

Selects whether the prototype represents a partner with an active session or a signed-out visitor.

| Option | Meaning |
| --- | --- |
| `in` — Signed in | Shows the partner workspace and keeps navigation between operational screens available. |
| `out` — Signed out | Shows the authentication boundary instead of exposing partner data. |

### Access (`access`)

Pins the permission level used to demonstrate available, read-only and inaccessible partner operations.

| Option | Meaning |
| --- | --- |
| `full` — Full access | Shows editing and decision actions for an authorized partner account. |
| `read` — Read only | Keeps operational data visible while disabling mutations. |
| `none` — No access | Hides protected operations and explains that the current account lacks access. |

### Inventory connection (`connection`)

Selects whether room availability is maintained directly or supplied by a connected channel manager.

| Option | Meaning |
| --- | --- |
| `manual` — Manual | Allows availability to be edited in the partner app when permissions permit it. |
| `chm` — Channel manager | Makes availability read-only in the app because the active channel manager is the inventory source. |

### Information density (`density`)

Changes presentation density without changing the underlying records or business rules.

| Option | Meaning |
| --- | --- |
| `compact` — Compact | Uses a calmer summary layout for quick scanning. |
| `dense` — Dense | Shows more operational detail at once for routine partner work. |

### Demo inventory (`inv`)

Pins the amount of fixture inventory available in lists and summaries.

| Option | Meaning |
| --- | --- |
| `many` — Many records | Shows a populated operational day with several items to review. |
| `some` — Some records | Shows a shorter queue while preserving normal navigation and actions. |
| `none` — No records | Shows the explicit empty state instead of placeholder rows. |

### Property mode (`hotel`)

Selects an active property or a test property used for demonstration and training.

| Option | Meaning |
| --- | --- |
| `active` — Active property | Uses the SPA HOTEL ČAJKOVSKIJ demo package fixture. |
| `test` — Test property | Clearly labels a non-live property so prototype actions cannot be mistaken for live operations. |

## UC-01 — Start the operational day

A fully authorized hotel partner opens the dashboard, reviews the current workload and moves into reservations or inventory management.

### State

| Axis | Selected option | Meaning |
| --- | --- | --- |
| Session (`auth`) | `in` — Signed in | Shows the partner workspace and keeps navigation between operational screens available. |
| Access (`access`) | `full` — Full access | Shows editing and decision actions for an authorized partner account. |
| Inventory connection (`connection`) | `manual` — Manual | Allows availability to be edited in the partner app when permissions permit it. |
| Information density (`density`) | `dense` — Dense | Shows more operational detail at once for routine partner work. |
| Demo inventory (`inv`) | `many` — Many records | Shows a populated operational day with several items to review. |
| Property mode (`hotel`) | `active` — Active property | Uses the SPA HOTEL ČAJKOVSKIJ demo package fixture. |

### Screens and deep links

- **mobile · 390×844** — [m-dashboard.html](../m-dashboard.html?auth=in&access=full&connection=manual&density=dense&inv=many&hotel=active) · [capture](usecases/UC-01-m-dashboard.png)
- **mobile · 390×844** — [m-reservations.html](../m-reservations.html?auth=in&access=full&connection=manual&density=dense&inv=many&hotel=active)

### Engineering rules

- Dashboard links preserve the selected demo state when they open operational screens.
- The populated fixture is deterministic across Czech and English app screens.

## UC-02 — Review a shorter queue

A partner switches to the compact presentation while working through a smaller set of reservations.

### State

| Axis | Selected option | Meaning |
| --- | --- | --- |
| Session (`auth`) | `in` — Signed in | Shows the partner workspace and keeps navigation between operational screens available. |
| Access (`access`) | `full` — Full access | Shows editing and decision actions for an authorized partner account. |
| Inventory connection (`connection`) | `manual` — Manual | Allows availability to be edited in the partner app when permissions permit it. |
| Information density (`density`) | `compact` — Compact | Uses a calmer summary layout for quick scanning. |
| Demo inventory (`inv`) | `some` — Some records | Shows a shorter queue while preserving normal navigation and actions. |
| Property mode (`hotel`) | `active` — Active property | Uses the SPA HOTEL ČAJKOVSKIJ demo package fixture. |

### Screens and deep links

- **mobile · 390×844** — [m-reservations.html](../m-reservations.html?auth=in&access=full&connection=manual&density=compact&inv=some&hotel=active) · [capture](usecases/UC-02-m-reservations.png)
- **mobile · 390×844** — [m-reservation-detail.html](../m-reservation-detail.html?auth=in&access=full&connection=manual&density=compact&inv=some&hotel=active)

### Engineering rules

- Density changes presentation only; reservation identity and amounts remain unchanged.
- The selected reservation opens the same detail record from each queue presentation.

## UC-03 — Understand an empty reservations view

A partner opens reservations for a period with no matching records and gets a purposeful next step instead of an empty table shell.

### State

| Axis | Selected option | Meaning |
| --- | --- | --- |
| Session (`auth`) | `in` — Signed in | Shows the partner workspace and keeps navigation between operational screens available. |
| Access (`access`) | `full` — Full access | Shows editing and decision actions for an authorized partner account. |
| Inventory connection (`connection`) | `manual` — Manual | Allows availability to be edited in the partner app when permissions permit it. |
| Information density (`density`) | `dense` — Dense | Shows more operational detail at once for routine partner work. |
| Demo inventory (`inv`) | `none` — No records | Shows the explicit empty state instead of placeholder rows. |
| Property mode (`hotel`) | `active` — Active property | Uses the SPA HOTEL ČAJKOVSKIJ demo package fixture. |

### Screens and deep links

- **mobile · 390×844** — [m-reservations.html](../m-reservations.html?auth=in&access=full&connection=manual&density=dense&inv=none&hotel=active) · [capture](usecases/UC-03-m-reservations.png)

### Engineering rules

- The empty state must not fabricate reservation rows.
- Filters remain available so the partner can broaden the search.

## UC-04 — Inspect data without edit permission

A read-only user reviews reservations, rates and billing while every operation that would mutate data remains unavailable.

### State

| Axis | Selected option | Meaning |
| --- | --- | --- |
| Session (`auth`) | `in` — Signed in | Shows the partner workspace and keeps navigation between operational screens available. |
| Access (`access`) | `read` — Read only | Keeps operational data visible while disabling mutations. |
| Inventory connection (`connection`) | `manual` — Manual | Allows availability to be edited in the partner app when permissions permit it. |
| Information density (`density`) | `compact` — Compact | Uses a calmer summary layout for quick scanning. |
| Demo inventory (`inv`) | `many` — Many records | Shows a populated operational day with several items to review. |
| Property mode (`hotel`) | `active` — Active property | Uses the SPA HOTEL ČAJKOVSKIJ demo package fixture. |

### Screens and deep links

- **mobile · 390×844** — [m-reservation-detail.html](../m-reservation-detail.html?auth=in&access=read&connection=manual&density=compact&inv=many&hotel=active) · [capture](usecases/UC-04-m-reservation-detail.png)
- **mobile · 390×844** — [m-rate-edit.html](../m-rate-edit.html?auth=in&access=read&connection=manual&density=compact&inv=many&hotel=active)
- **mobile · 390×844** — [m-billing.html](../m-billing.html?auth=in&access=read&connection=manual&density=compact&inv=many&hotel=active)

### Engineering rules

- Read-only access keeps source data visible and disables mutation controls.
- Billing approval and dispute are exposed only to accounts that satisfy the corresponding backend authorization checks.

## UC-05 — Reach the authentication and permission boundary

A signed-out visitor or an account without property access sees no protected hotel information and a clear recovery path.

### State

| Axis | Selected option | Meaning |
| --- | --- | --- |
| Session (`auth`) | `out` — Signed out | Shows the authentication boundary instead of exposing partner data. |
| Access (`access`) | `none` — No access | Hides protected operations and explains that the current account lacks access. |
| Inventory connection (`connection`) | `manual` — Manual | Allows availability to be edited in the partner app when permissions permit it. |
| Information density (`density`) | `compact` — Compact | Uses a calmer summary layout for quick scanning. |
| Demo inventory (`inv`) | `some` — Some records | Shows a shorter queue while preserving normal navigation and actions. |
| Property mode (`hotel`) | `test` — Test property | Clearly labels a non-live property so prototype actions cannot be mistaken for live operations. |

### Screens and deep links

- **mobile · 390×844** — [m-more.html](../m-more.html?auth=out&access=none&connection=manual&density=compact&inv=some&hotel=test) · [capture](usecases/UC-05-m-more.png)

### Engineering rules

- Protected partner data is not rendered when the session or access requirement is not met.
- The test-property label remains visible wherever it prevents confusion about live operations.

## UC-06 — Check channel-managed availability

A hotel connected to a channel manager reviews room availability while the partner app prevents conflicting manual changes.

### State

| Axis | Selected option | Meaning |
| --- | --- | --- |
| Session (`auth`) | `in` — Signed in | Shows the partner workspace and keeps navigation between operational screens available. |
| Access (`access`) | `full` — Full access | Shows editing and decision actions for an authorized partner account. |
| Inventory connection (`connection`) | `chm` — Channel manager | Makes availability read-only in the app because the active channel manager is the inventory source. |
| Information density (`density`) | `dense` — Dense | Shows more operational detail at once for routine partner work. |
| Demo inventory (`inv`) | `many` — Many records | Shows a populated operational day with several items to review. |
| Property mode (`hotel`) | `active` — Active property | Uses the SPA HOTEL ČAJKOVSKIJ demo package fixture. |

### Screens and deep links

- **mobile · 390×844** — [m-availability.html](../m-availability.html?auth=in&access=full&connection=chm&density=dense&inv=many&hotel=active) · [capture](usecases/UC-06-m-availability.png)

### Engineering rules

- An active channel-manager connection makes availability editing unavailable in this app.
- The page still presents the selected date range and room-day values for review.

## UC-07 — Maintain an offer and its rate

A partner reviews the demo package fixture, then moves to the related price configuration without losing context.

### State

| Axis | Selected option | Meaning |
| --- | --- | --- |
| Session (`auth`) | `in` — Signed in | Shows the partner workspace and keeps navigation between operational screens available. |
| Access (`access`) | `full` — Full access | Shows editing and decision actions for an authorized partner account. |
| Inventory connection (`connection`) | `manual` — Manual | Allows availability to be edited in the partner app when permissions permit it. |
| Information density (`density`) | `dense` — Dense | Shows more operational detail at once for routine partner work. |
| Demo inventory (`inv`) | `some` — Some records | Shows a shorter queue while preserving normal navigation and actions. |
| Property mode (`hotel`) | `active` — Active property | Uses the SPA HOTEL ČAJKOVSKIJ demo package fixture. |

### Screens and deep links

- **mobile · 390×844** — [m-offer.html](../m-offer.html?auth=in&access=full&connection=manual&density=dense&inv=some&hotel=active) · [capture](usecases/UC-07-m-offer.png)
- **mobile · 390×844** — [m-rate-edit.html](../m-rate-edit.html?auth=in&access=full&connection=manual&density=dense&inv=some&hotel=active)

### Engineering rules

- The demo fixture stays consistent within the prototype: SPA HOTEL ČAJKOVSKIJ, three days, two nights, from 3,577 CZK, check-in 14:00 and check-out 10:00.
- Offer and rate actions respect the selected access level.

## UC-08 — Approve or dispute a billing line

An authorized account reviews a confirmed reservation and chooses either approval or a dispute supported by a reason and a corrected positive amount.

### State

| Axis | Selected option | Meaning |
| --- | --- | --- |
| Session (`auth`) | `in` — Signed in | Shows the partner workspace and keeps navigation between operational screens available. |
| Access (`access`) | `full` — Full access | Shows editing and decision actions for an authorized partner account. |
| Inventory connection (`connection`) | `manual` — Manual | Allows availability to be edited in the partner app when permissions permit it. |
| Information density (`density`) | `dense` — Dense | Shows more operational detail at once for routine partner work. |
| Demo inventory (`inv`) | `many` — Many records | Shows a populated operational day with several items to review. |
| Property mode (`hotel`) | `test` — Test property | Clearly labels a non-live property so prototype actions cannot be mistaken for live operations. |

### Screens and deep links

- **mobile · 390×844** — [m-billing.html](../m-billing.html?auth=in&access=full&connection=manual&density=dense&inv=many&hotel=test) · [capture](usecases/UC-08-m-billing.png)
- **mobile · 390×844** — [m-reservation-detail.html](../m-reservation-detail.html?auth=in&access=full&connection=manual&density=dense&inv=many&hotel=test)

### Engineering rules

- Approval and dispute require an authorized account.
- A dispute requires a reason and a positive price; the prototype demonstrates validation without making a backend write.

