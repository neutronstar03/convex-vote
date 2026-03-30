# Design Direction

## Goal
- Dark, compact, analytical DeFi dashboard.
- Closer to Votium / Llama than to rounded SaaS cards.
- Information first, decoration second.

## Visual Rules
- Prefer rectangular or lightly rounded panels.
- Use compact spacing.
- Keep typography doing most of the hierarchy work.
- Avoid turning every item into a pill.
- Prefer short labels and compact dates.

## Palette

### Accent Colors
- Pearl Aqua (`#78DAE4`)
- Hyper Magenta (`#B026FF`)
- Hot Fuchsia (`#FF1654`)
- Lime Cream (`#FFFD98`)

### Neutral Foundation
- Ash Graphite → page background
- Slate Machine → main panels
- Carbon Ink → deeper cards / inset surfaces
- Gunmetal Mist → hover / raised surfaces
- Steel Haze → borders / dividers
- Cloud Tint → primary text
- Dust Tint → secondary text
- Fog Tint → muted text

## Semantic Mapping
- primary action → Hyper Magenta
- info / live accent → Pearl Aqua
- urgency / ending soon → Hot Fuchsia
- rare highlight → Lime Cream
- page background → Ash Graphite
- standard panel → Slate Machine
- inner card → Carbon Ink

## State Rules
- Open vote → Pearl Aqua
- Open and less than 6h left → Hot Fuchsia
- Selected / active → Hyper Magenta
- Closed / inactive → Fog Tint or Steel Haze
- Connected wallet → Pearl Aqua-leaning success styling

## Surface Hierarchy
- Level 0: page = Ash Graphite
- Level 1: section panels = Slate Machine
- Level 2: stat cards / inner containers = Carbon Ink
- Level 3: hover / selected / live states = Gunmetal Mist or accent tint

## Shape + Spacing
- small radius for badges/buttons
- medium radius for normal cards
- large radius only when clearly justified
- default to tighter spacing unless readability suffers

## Typography
- page title: strong, concise
- section title: clear, smaller than title
- stat value: bold, high contrast
- label: small, muted, consistent
- meta text: subtle and never dominant

## Component Direction
- navbar: compact, clean, wallet action visible
- hero: current vote number + status + links
- summary stats: dense row, high-contrast values
- wallet recap: compact, top allocations only
- timetable: cataloged, not decorative
- tables: dense, scan-friendly, low-noise chrome

## Do / Don’t
- Do use bright colors with purpose.
- Do keep panels clearly layered.
- Do favor compact data presentation.
- Don’t overuse giant rounded corners.
- Don’t use long-form dates by default.
- Don’t use bright colors as generic backgrounds everywhere.

## Next Steps
- Finalize exact neutral hex values.
- Map these names to code tokens.
- Refactor current UI to follow this file.
