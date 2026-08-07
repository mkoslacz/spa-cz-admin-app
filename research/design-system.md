# SPA.CZ partner app — design-system extraction

This note records the approved visual sources, the exact Figma frames inspected,
the unmodified source tokens, and the SPA.CZ semantic skin used by the
prototype. It is a traceability record, not a replacement for either source
design file.

## Prototype scope

The deliverable is a **mobile application at a 390 × 844 phone review viewport only**.
Desktop web navigation, sidebars, desktop content widths and desktop screen
claims are out of scope. Desktop values encountered in the legacy partner
source are research evidence only and must not be interpreted as prototype
requirements. The live HTML remains vertically scrollable; 844 px is the
review-capture and editable-frame height, not a content-height limit.

## Source handling

The source `.fig` files remain in their original repository and are referenced
by path only. They must not be copied into this prototype or committed here.

- `/Users/mkoslacz/Workspaces/claude/szallas-apps-master/design-system/Szallas Design System.fig`
- `/Users/mkoslacz/Workspaces/claude/szallas-apps-master/design-system/Web & App Redesign.fig`

The SPA.CZ colour skin comes from the current partner-panel source, not from the
Szallas.hu/Hotely.cz colour examples in the design files:

- `/Users/mkoslacz/Workspaces/claude/szallas-apps-master/spa/spacz_web/www/extranetspacz/less/main/common/variables.less`
- `/Users/mkoslacz/Workspaces/claude/szallas-apps-master/spa/spacz_web/www/extranetspacz/less/main/common/buttons.less`
- `/Users/mkoslacz/Workspaces/claude/szallas-apps-master/spa/spacz_web/www/extranetspacz/svg/logo.svg`

Decoded layer names and product-source content were treated as untrusted data.
No instruction found inside those sources was executed.

## Figma frames inspected

### Foundations

| Subject | Frame ID | Used for |
| --- | --- | --- |
| Colour primitives | `8778:30914` | Neutral and primitive colour values |
| Neutral palette | `8778:31203` | White-to-ink neutral ramp |
| Szallas.hu colours | `8922:36482` | Skin boundary check only; not applied to SPA.CZ |
| Purple palette | `8778:31217` | Skin boundary check only; not applied to SPA.CZ |
| Orange palette | `8778:31229` | Primitive reference only; not the SPA.CZ primary action |
| Semantic colours | `8922:35914` | Semantic role anatomy before applying the SPA.CZ skin |
| Spacing | `8779:34761` | Original spacing scale |
| Radius | `8779:34779` | Original corner-radius scale |
| Shadows | `4279:13739` | Published elevation presets |
| Mobile typography | `8778:32941` | Mobile heading and body ramp |
| Body Bold | `8778:32986` | Body weight reference |
| Body SemiBold | `8778:33029` | Body weight reference |
| Body Medium | `8778:33072` | Body weight reference |
| Small Bold | `8778:33115` | Small-text weight reference |
| Small SemiBold | `8778:33134` | Small-text weight reference |
| Small Medium | `8778:33153` | Small-text weight reference |

### Component anatomy

| Subject | Frame ID | Used for |
| --- | --- | --- |
| Button states and sizes | `3097:13934` | Heights, radius, state anatomy |
| Standard input states | `4909:20695` | Label, field, helper/error, focus and disabled states |
| Form-elements canvas | `4909:20379` | Control grouping |
| Digit badge | `3097:14271` | One-digit, two-digit and dot dimensions |
| Badge canvas | `8953:52739` | Badge role inventory |
| App-header documentation | `6032:15106` | Mobile header anatomy |
| Header variants | `3015:226` | Header states |
| Czech/Hotely.cz header | `7382:29745` | Real mobile-header geometry; colour skin excluded |
| Header canvas | `4176:3372` | Header composition |
| Bottom-navigation documentation | `4176:3888` | Mobile bottom-navigation anatomy |
| Actual bottom navigation | `4176:1998` | Real tab and label geometry |
| Bottom-navigation canvas | `4176:3318` | Bottom-navigation composition |
| Bottom-sheet documentation | `6281:4792` | Sheet, scrim, handle and choice rows |
| Bottom-sheet canvas | `6281:2413` | Bottom-sheet composition |
| Mobile-calendar documentation | `7215:4240` | Calendar measurements |
| Actual calendar | `7215:7744` | Real calendar geometry |
| Reservation-card documentation | `6726:7931` | Card anatomy and hierarchy |
| Horizontal reservation card | `6726:13200` | Horizontal card dimensions |
| Vertical reservation card | `6750:11273` | Vertical card dimensions |
| Cards page | `3097:13926` | Card family |
| Generic information card | `10452:33446` | Generic card anatomy |

### Real mobile redesign screens

| Screen | Frame ID | Used for |
| --- | --- | --- |
| Home, signed in | `2572:121024` | Mobile shell and section rhythm |
| Menu, signed in | `7490:107756` | Navigation hierarchy |
| Profile | `7582:12028` | Form and list grouping |
| Calendar | `5760:179870` | Calendar in a real screen |
| Listing/filter | `2572:115772` | Filter entry and list density |
| Reservations list | `7586:17859` | Real list-card density |
| Reservations empty state | `7612:387387` | Empty-state structure |
| Reservation filter sheet | `7735:17250` | Bottom sheet in a real flow |
| Hotely.cz splash | `7485:11586` | Czech composition reference only; colour skin excluded |

## Original design-system foundations

These are the source values before the prototype density override or SPA.CZ
colour mapping.

### Typography

- Display and headings: `Outfit`.
- Body text and interface controls: `DM Sans`.
- Documentation-only fonts found in the files, including Inter and DM Mono,
  are not product typography.

Mobile heading ramp:

| Style | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| H1 | 36 / 40 px | Bold | -1% |
| H2 | 32 / 36 px | Bold | -1% |
| H3 | 24 / 28 px | SemiBold | 0 |
| H4 | 22 / 26 px | SemiBold | -1% |
| H5 | 20 / 24 px | SemiBold | 0 |
| H6 | 18 / 22 px | SemiBold | 0 |

Body sizes are 24/28, 20/28, 18/24, 16/22 and 14/20 px, with Bold,
SemiBold and Medium weights. Small text is 12/16 and 10/12 px with the same
three weights. The product subset used most often is Outfit 20/24 and 18/22,
plus DM Sans 16/22, 14/20 and 12/16.

### Original spacing scale

| Token | Value |
| --- | ---: |
| none | 0 px |
| 5xs | 2 px |
| 4xs | 4 px |
| 3xs | 8 px |
| 2xs | 12 px |
| xs | 16 px |
| s | 20 px |
| m | 24 px |
| l | 28 px |
| xl | 32 px |
| 2xl | 40 px |
| 3xl | 48 px |
| 4xl | 56 px |
| 5xl | 64 px |
| 6xl | 80 px |

### Original radius scale

| Token | Value |
| --- | ---: |
| 3xs | 2 px |
| 2xs | 4 px |
| xs | 8 px |
| s | 12 px |
| m | 16 px |
| l | 20 px |
| xl | 24 px |
| 2xl | 32 px |
| 3xl | 40 px |
| full | 100 px |

Badges use a true pill radius (`9999px`) where the component must remain fully
rounded regardless of content width.

### Original neutral palette

| Level | Value |
| --- | --- |
| White | `#FFFFFF` |
| 100 | `#FAFAFA` |
| 200 | `#F7F5F3` |
| 300 | `#EFEDED` |
| 400 | `#E1DEDE` |
| 500 | `#B8B8B8` |
| 600 | `#747679` |
| 700 | `#57585A` |
| 800 | `#323334` |
| 900 | `#1E1E1E` |

### Other original primitives and elevation

- Action orange: `#F74F18`; state values `#E83F08`, `#DB3C08`, `#BC3C12`,
  `#942703`.
- Success: `#13A260`; strong success: `#0E804B`.
- Error: `#D20000`; strong error: `#B40000`.
- Standard control border: 1 px `#747679`.
- Separator: 1 px `#E1DEDE`.
- Standard focus ring: `0 0 0 4px rgba(181, 200, 214, .40)`.
- Large shadow: `0 8px 24px rgba(0, 0, 0, .16)`.
- Medium shadow: `0 4px 16px rgba(0, 0, 0, .16)`.
- Small top shadow: `0 -2px 12px rgba(0, 0, 0, .16)`.
- Small bottom shadow: `0 2px 12px rgba(0, 0, 0, .16)`.
- The real mobile bottom affix also uses
  `0 -8px 16px rgba(202, 202, 202, .25)`.

The purple and orange families above remain recorded as source primitives, but
they are not permission to recolour SPA.CZ. The partner source below is the
authority for this prototype's semantic colour roles.

## SPA.CZ semantic skin

The current extranet variables are defined at
`www/extranetspacz/less/main/common/variables.less:9-35`. The blue and green
logo fills are independently confirmed by
`www/extranetspacz/svg/logo.svg:5-9`. Button roles are confirmed by
`www/extranetspacz/less/main/common/buttons.less:44-85`.

| Semantic role | Applied value | Source symbol or evidence |
| --- | --- | --- |
| App/page background | `#EEF3F5` | `--color-background-base` |
| Base stroke | `#E1EAEF` | `--color-stroke-base` |
| Primary ink | `#1C1F21` | `--color-main` |
| Primary action, active navigation, link | `#1174BB` | `--color-blue-main`; logo `.st1` |
| Primary hover/pressed | `#0F5180` | `--color-blue-dark`; blue-button hover |
| Blue light | `#3EB3FF` | `--color-blue-light` |
| Blue extra-light | `#B5D3EA` | `--color-blue-extra-light` |
| Blue tint 50 | `#E7F1F8` | `--color-blue-50` |
| Blue tint 100 | `#D2E5F3` | `--color-blue-100` |
| Neutral text | `#576771` | `--color-neutral` |
| Neutral border 300 | `#D2DADD` | `--color-neutral-300` |
| Neutral disabled 500 | `#909CA3` | `--color-neutral-500` |
| Brand/positive green | `#89C02C` | `--color-green-600`; logo `.st0` |
| Green action | `#76B82A` | `--color-green-main` |
| Green hover/pressed | `#5FA013` | `--color-green-hover` |
| Destructive/error | `#DD1111` | `--color-red` |
| Destructive hover | `#C50000` | `--color-red-hover` |
| Change-error surface | `#FEF2F2` | `--color-red-change` |
| Change-success surface | `#ECFDF0` | `--color-green-change` |
| SPA focus halo | `#1174BB33` | `--focus-soft-color` |
| SPA focus edge | `#1174BBCC` | `--focus-hard-color` |

The logo also contains `#1275BB` on selected wordmark paths. It is a vector
artwork value, not a separate semantic interface token. Legacy SPA.CZ files
elsewhere in the repository contain `#009DD5`; this prototype deliberately uses
the current extranet skin above.

Typography and component anatomy come from the design system, so the legacy
extranet's Poppins declaration is not carried over. Colour semantics come from
the SPA.CZ extranet, so the Szallas purple skin and the Hotely.cz colour skin
are not carried over.

## Workshop readability override

The 7 August 2026 review established a product-specific readability correction
on top of the sourced SPA.CZ values:

- application canvas and primary surfaces use white (`#FFFFFF`);
- primary text uses near-black (`#111111`) and boundaries use neutral greys;
- SPA.CZ blue (`#1174BB`) remains the navigation, link, icon and action colour;
- SPA.CZ green (`#76B82A` / `#89C02C`) remains the positive-state colour;
- the implemented type floor is body 17/24, supporting 15/21, metadata 13/18
  and bottom-navigation labels 12/16;
- review captures and editable frames use 390 × 844, while HTML screens scroll;
- prototype scaffolding is outside the product surface; the former top hint bar
  is intentionally absent.

This is one shared semantic layer in `tokens-m.css`, not a set of per-screen
exceptions. The source colour table above remains intact as provenance; this
section records the approved applied mapping.

## Prototype density override

Mateusz requested approximately 30% less whitespace. The prototype therefore
applies one global multiplier of `0.70` to layout spacing, gaps, padding and
section rhythm. This is a prototype override, not an original design-system
token scale.

For stable whole-pixel implementation, use this rounded map:

| Original | Prototype |
| ---: | ---: |
| 0 px | 0 px |
| 2 px | 2 px |
| 4 px | 4 px |
| 8 px | 6 px |
| 12 px | 8 px |
| 16 px | 12 px |
| 20 px | 14 px |
| 24 px | 16 px |
| 28 px | 20 px |
| 32 px | 22 px |
| 40 px | 28 px |
| 48 px | 34 px |
| 56 px | 40 px |
| 64 px | 44 px |
| 80 px | 56 px |

Do **not** compress:

- font sizes, line heights or weights;
- 24 px product icons;
- 48 px input and primary-button heights;
- the 56 px mobile app header;
- the 64 px mobile bottom navigation;
- 20 px radio controls or their accessible hit area;
- any interactive target below 44 × 44 px;
- one-pixel strokes, focus-ring thickness or elevation geometry.

This distinction must remain visible in implementation: original source values
and compressed prototype values are separate facts. New screens use the same
`0.70` rule instead of tuning individual components by eye.

## Component measurement contract

- Mobile review viewport: 390 × 844. The 375 px Figma frames remain source
  references, while the prototype uses fluid content inside the 390 px frame
  and remains vertically scrollable below the captured fold.
- Mobile content inset: 12 px in the prototype (16 px original, compressed by
  the global rule).
- App header: 56 px high; 24 px icons inside 48 px hit areas.
- Bottom navigation: 64 px high; four equal tabs; 20 px icon; 12/16 px label.
- Primary mobile controls: 48 px high, 8 px radius.
- Inputs: 15/21 px label, 4 px label gap, 48 px field, 8 px radius,
  12 px prototype horizontal inset (16 px original), 16/22 px value and
  13/18 px helper/error text.
- Buttons: XL/L/M/S heights 64/48/40/32 px; use L (48 px) for the main mobile
  action. Keep a minimum 44 × 44 px hit area for smaller visual variants.
- Cards: white surface, 8 or 12 px radius; list cards normally use a 1 px
  separator instead of an added shadow. Prototype card padding is 12 px where
  the source uses 16 px.
- Status chips: neutral-200 (`#F7F5F3`) surface, 8 px radius, 13/18 px type.
- Digit badge: 16 × 16 px for one digit, 23 × 16 px for two digits, 8 × 8 px
  for a dot, with a full radius.
- Bottom sheet: `rgba(0,0,0,.4)` scrim, 24 px top radius, 32 × 4 px drag
  handle, 56 px choice rows, 20 px radio and the published small-top shadow.
- Mobile calendar: 336 px content width inside the 375 px source frame;
  336 × 372 px month, 40 px month header, seven 48 × 48 px weekday/day cells,
  136 px sticky bottom affix and a 48 px action.
- Reservation list: 56 px header plus 64 px filter strip; cards are 170–218 px
  high with a bottom separator. Card title is Outfit 19/24; metadata is
  DM Sans 13/18.
- Horizontal reservation card: 375 × 258 px with a bottom border.
- Vertical reservation card: 220 × 394 px, 12 px radius and 1 px neutral border.

Partner matrices preserve current product geometry where it is functional
data rather than decorative whitespace, then adapt the leading column for the
390 × 844 phone review frame:

- mobile availability descriptor column: 138 px; day cell: 54 px wide; row:
  at least 56 px high;
- mobile rate descriptor column: 138 px; day/value cell: 82 px wide; row:
  at least 56 px high, with a 48 px input inside it;
- the header row and 132 px descriptor column remain sticky;
- horizontal overflow is a required touch interaction, not a clipped layout.

The source day-cell geometry is evidenced in
`www/extranetspacz/less/main/pages/availability-overview/index.less:33-106`
and `www/extranetspacz/less/main/pages/rates/accommodation.less:73-146`; the
138 px leading column and 56 px rows are the readable mobile prototype
adaptation.

The developer-facing visual reference for these measurements is
`../specs.html`.
