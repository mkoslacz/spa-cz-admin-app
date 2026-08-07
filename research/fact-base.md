# SPA.cz Partner mobile app — fact base

Captured on **2026-08-07**. This document separates observed product facts from prototype decisions.

## Scope boundary

The current `spa/spacz_web` partner panel is used only as the source of functionality, data concepts and business rules. The proposed artifact is a mobile app at a 390 px design viewport. It contains no desktop web proposal.

The prototype is static and fixture-driven. A local database was not needed, no production database dump was taken, and the supplied `User` table row was not imported or reproduced.

## Product surface inventory

Source repository: `spa/spacz_web`.

| Source | Observed fact | Prototype consequence |
| --- | --- | --- |
| `app/boot/routerextranetspacz.php:14` | The active application module is `extranetspacz`. | Research is scoped to the partner extranet, not the public booking site. |
| `app/boot/routerextranetspacz.php:18–19` | Dashboard routes exist. | Mobile Dashboard is the operational entry point. |
| `app/boot/routerextranetspacz.php:32–35` | Reservations have list, export and detail routes. | Mobile queue and detail are first-class app areas; export remains outside this prototype round. |
| `app/boot/routerextranetspacz.php:37–49` | Documents, object kinds, equipment and packages are routed. | Package/offer information is included; lower-frequency administration is routed through More. |
| `app/boot/routerextranetspacz.php:60–69` | Billing, invoices and payments are routed. | Billing is part of the primary reservation flow. |
| `app/boot/routerextranetspacz.php:71–79` | Rates, guest rates and discounts are routed. | Rate edit is linked to the commercial offer flow. |
| `app/boot/routerextranetspacz.php:81–96` | Cancellation, photos, users and hotel routes exist. | These are represented in reservation context or the More directory. |
| `app/boot/routerextranetspacz.php:98–108` | Change history, availability and channel-manager routes exist. | Availability is a core mobile operation with a distinct channel-manager state. |
| `app/boot/routerextranetspacz.php:110–122` | Permissions, general settings and help routes exist. | Administration remains discoverable under More. |
| `app/boot/routerextranetspacz.php:124–150` | Ajax operations support the routed partner areas. | Clicks can demonstrate realistic transitions, but no backend writes are made. |
| `app/boot/routerextranetspacz.php:158–164` | Authentication routes are separate from the partner workspace. | `auth=out` has an explicit authentication boundary. |

## Detailed business rules

| Area | Source evidence | Rule carried into the prototype |
| --- | --- | --- |
| Reservation detail | `app/controllers/extranetspacz/ReservationsController.php:46–157` | The record is scoped to the selected hotel/product and assembles price, commission, guests, rooms, status, voucher, cancellation conditions, package, contact rules and invoice context. |
| Reservation export | `app/controllers/extranetspacz/ReservationsController.php:159–167` | Export exists in the current panel, but is not claimed as an implemented mobile prototype flow. |
| Billing candidates | `app/controllers/extranetspacz/BillingController.php:13–21` | Confirmed reservations can become invoicing review items. |
| Billing access | `app/controllers/extranetspacz/BillingController.php:42–58` | Accounts without the required billing account get a read-only experience and a settings route. |
| Billing configuration | `app/controllers/extranetspacz/BillingController.php:73–139` | Billing supports net/gross modes and payment/invoice frequencies. |
| Billing filters | `app/controllers/extranetspacz/BillingController.php:252–259` | Approval, approved and disputed are meaningful states. |
| Billing approval | `app/controllers/extranetspacz/ajax/BillingController.php:43–61` | Approval requires an eligible account and marks the invoice item approved. |
| Billing dispute | `app/controllers/extranetspacz/ajax/BillingController.php:63–112`; `app/views/scriptsextranetspacz/billing/modals/dispute.tpl` | Dispute requires an eligible account, a reason and a positive corrected price; the current form also presents commission inputs. |
| Billing undo | `app/controllers/extranetspacz/ajax/BillingController.php:114–134` | A prior decision can be reversed; the prototype should not imply irreversibility. |
| Availability ownership | `app/controllers/extranetspacz/AvailabilityOverviewController.php:19–32`; `app/views/scriptsextranetspacz/availability-overview/index.tpl:1–5` | Active channel-manager integration makes availability changes unavailable in the partner panel. |
| Availability data | `app/controllers/extranetspacz/AvailabilityOverviewController.php:67–118` | The overview is based on a date range, room capacity, closures and room-day values. |
| Manual availability write | `app/controllers/extranetspacz/ajax/AvailabilityOverviewController.php:5–17`; `app/views/scriptsextranetspacz/availability-overview/index.tpl:7–24` | Manual mode can demonstrate editable values, a save action and feedback. |
| Package model | `app/controllers/extranetspacz/PackagesController.php:12–143` | Stay packages include approval state, rooms, meals, procedures, cancellation variants and rate plans. |
| Package discovery | `app/controllers/extranetspacz/PackagesController.php:157–220` | The package list has meaningful filters. |
| Rates | `app/controllers/extranetspacz/RatesController.php:9–138` | Rate plans include accommodation pricing models, bulk edits, meals and services. |

## Public fixture

Source: [Wellness pobyt dle Vašeho výběru — SPA HOTEL ČAJKOVSKIJ](https://www.spa.cz/lazne-karlovy-vary/spa-hotel-cajkovskij/wellness-pobyt-dle-vaseho-vyberu/), observed on 2026-08-07.

| Fixture field | Verified value |
| --- | --- |
| Property | SPA HOTEL ČAJKOVSKIJ |
| Duration | 3 days |
| Nights | 2 nights |
| Public starting price | 3,577 CZK |
| Check-in | 14:00 |
| Check-out | 10:00 |

These values are deterministic demo content, not a live quotation. The public source additionally exposed half board and three procedures in its commerce payload, but this prototype should not extend that observation into unverified operational rules.

## Design-system evidence

Source export: `Szallas Design System.fig` in the supplied design-system repository.

| Design evidence | Frame | Applied decision |
| --- | --- | --- |
| Base color | `8778:30914` | Neutral foundation from the supplied system. |
| Semantic color | `8922:35914` | Status roles remain semantic; SPA.cz values supply the product palette. |
| Spacing | `8779:34761` | Global layout rhythm uses 70% of the original spacing steps. |
| Radius | `8779:34779` | Controls and cards primarily use 8–12 px radii. |
| Shadows | `4279:13739` | Elevation is restrained and used for hierarchy, not decoration. |
| Mobile typography | `8778:32941` | Outfit headings and DM Sans body/UI. |
| Buttons | `3097:13934` | Button hierarchy and minimum control height are preserved. |
| Inputs | `4909:20695` | Form controls follow the supplied interaction pattern. |
| Header | `6032:15106` | Mobile header behavior is adapted to SPA.cz navigation. |
| Bottom navigation | `4176:3888` | Primary app destinations use the supplied mobile navigation logic. |
| Sheet | `6281:4792` | Phone-sized filtering and secondary actions can rise from the bottom. |
| Reservations | `6726:7931` | Reservation information hierarchy informs the mobile queue/detail relationship. |

Confirmed SPA.cz values come from `www/extranetspacz/less/main/common/variables.less:9–35` and `www/extranetspacz/svg/logo.svg`:

- primary `#1174BB`
- dark `#0F5180`
- light `#3EB3FF`
- extra-light `#B5D3EA`
- blue 50 `#E7F1F8`
- blue 100 `#D2E5F3`
- background `#EEF3F5`
- stroke `#E1EAEF`
- main ink `#1C1F21`
- neutral `#576771`
- brand-positive `#89C02C`; green action `#76B82A`; hover `#5FA013`
- error `#DD1111`
- focus halo `#1174BB33`; focus edge `#1174BBCC`

The old `#009DD5` value is not used as the SPA.cz primary in this prototype.

Spacing is compressed at the layout level only: 8→6, 12→8, 16→12, 20→14, 24→16, 28→20, 32→22, 40→28, 48→34, 56→40, 64→44 and 80→56. Typography and icons are not scaled down. Controls remain at least 48 px, the app header 56 px, bottom navigation 64 px and tap targets at least 44 px.

## Prototype decisions

The following are design decisions for this proposal, not claims about the current product:

- Eight mobile areas form two connected daily-work paths.
- The app uses a bottom navigation plus a More directory for lower-frequency functions.
- Information density can be demonstrated as compact or dense without changing fixture identities.
- Empty, read-only, no-access, channel-manager and test-property states are deliberately visible.
- Czech and English screens share one fixture and one state model.

## Comments and external data

The comment code is present, but no `comments.config.json` exists by default. If configured, signed-in review threads are stored in the selected third-party Firebase project. Allowlisting and Firebase rules must restrict access. Any comment export contains reviewer names and email addresses, must remain private, and must never be committed or included in a published package.
