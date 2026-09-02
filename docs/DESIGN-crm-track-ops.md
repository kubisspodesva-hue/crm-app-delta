---
version: alpha
name: CRM-Track-Ops-design
description: A motorsport-engineering interface for a B2B sales CRM, anchored on a near-black canvas with white uppercase headlines and a light-weight, high-legibility body face. There is no decorative photography here (this is a data tool, not a marketing site) - brand energy instead comes from sharp, unrounded geometry and a thin three-stop "pipeline stripe" (blue → violet → rose) that marks the lead funnel (V procesu → Domluvená schůzka → Prodáno) wherever it appears. Status and data stay legible first; the "engineered precision" feel is delivered through corners, spacing and type-weight contrast, not through low-contrast dark-mode compromises.

colors:
  canvas: "#0a0a0b"
  surface-soft: "#111214"
  surface-card: "#17181c"
  surface-elevated: "#202226"
  hairline: "#2a2c30"
  hairline-strong: "#35373c"
  ink: "#ffffff"
  body: "#b7bac1"
  body-strong: "#e5e7eb"
  muted: "#6b7280"
  accent-blue: "#2563eb"
  accent-violet: "#7c3aed"
  accent-rose: "#f43f5e"
  primary: "#3b82f6"
  primary-strong: "#2563eb"
  on-primary: "#ffffff"
  success: "#22c55e"
  success-soft: "#0f2b1c"
  warning: "#f59e0b"
  warning-soft: "#2b230f"
  danger: "#ef4444"
  danger-soft: "#2b1414"
  info: "#3b82f6"
  info-soft: "#101c2b"

typography:
  display-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.5px
  display-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.25px
  title-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  label-uppercase:
    fontFamily: "Inter, sans-serif"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 1px
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  data-value:
    fontFamily: "Inter, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.5px
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.25px
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.5px
  nav-link:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.25px

rounded:
  none: 0px
  xs: 2px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  sidebar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    typography: "{typography.nav-link}"
    width: 256px
  top-header:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    height: 64px
  pipeline-stripe:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    height: 3px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 10px 16px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 10px 16px
    height: 40px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 10px 16px
    height: 40px
  stat-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.data-value}"
    rounded: "{rounded.none}"
    padding: 20px
  data-table:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
  status-tag:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.label-uppercase}"
    rounded: "{rounded.none}"
    padding: 3px 8px
  text-input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 10px 12px
    height: 40px
  modal-surface:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.none}"
    padding: 24px
  notification-dot:
    backgroundColor: "{colors.accent-rose}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 8px
  avatar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 32px
---

## Overview

CRM Track Ops takes BMW M's motorsport-engineering visual language - near-black canvas, confident uppercase type, zero decorative noise - and adapts it to a data-dense B2B sales tool where legibility during an 8-hour workday has to win over pure brand theater. The canvas (`{colors.canvas}` - #0a0a0b) stays dark everywhere; body copy runs at a readable 400 weight (not BMW's marketing-grade 300 Light, which thins out too much at CRM's smaller data-table sizes) while headings stay bold and tight, keeping the "heavy display / calm body" contrast that makes the BMW system feel engineered rather than decorated.

In place of BMW's M tricolor stripe, the system carries a **pipeline stripe** (`{colors.accent-blue}` → `{colors.accent-violet}` → `{colors.accent-rose}`) - three stops that echo the CRM's own lead funnel (V procesu → Domluvená schůzka → Prodáno). Like the M stripe, it is a brand-identity marker only: a 3px accent on section dividers, the sidebar logo mark, and page headers - never a button fill, never a status color in its own right.

**Key characteristics:**
- Near-black canvas (`{colors.canvas}`) with white type across every screen - no light-mode fallback, this is a dark-first tool.
- Corners are sharp by default (`{rounded.none}`). The only rounded shapes in the whole system are perfect circles: avatars, the notification dot, and the "+" icon buttons.
- A single vivid blue (`{colors.primary}`) carries every primary action - unlike BMW's white-on-black button, a CRM needs one scannable "go" color that never gets confused with the pipeline stripe.
- Status tags (V procesu / Domluvená schůzka / Prodáno / Odmítnuto) are solid-filled rectangular labels in `{typography.label-uppercase}`, never soft pastel pills - they read as stamped machine labels, not friendly badges.
- Numbers get their own type scale (`{typography.data-value}`, 28px/700) so dashboard stat cards read at a glance from across a desk.

## Colors

### Brand & Accent
- **Primary** (`{colors.primary}` - #3b82f6): The one action color in the system. Every primary button, active nav state, focus ring, and link uses this blue. Nothing else in the interface competes with it for attention.
- **Accent Blue / Violet / Rose** (`{colors.accent-blue}` #2563eb, `{colors.accent-violet}` #7c3aed, `{colors.accent-rose}` #f43f5e): The three pipeline-stripe stops. Identity-only - never used as a fill, background, or button color on their own.

### Surface
- **Canvas** (`{colors.canvas}` - #0a0a0b): Page floor everywhere - sidebar, header, page background.
- **Surface Soft** (`{colors.surface-soft}` - #111214): The top header bar and subtle inset panels.
- **Surface Card** (`{colors.surface-card}` - #17181c): Cards, tables, modals, inputs - the default "content sits here" tone.
- **Surface Elevated** (`{colors.surface-elevated}` - #202226): Hover states, status tags, nested rows inside a card.

### Hairlines
- **Hairline** (`{colors.hairline}` - #2a2c30): Table row dividers, card borders, sidebar item separators.
- **Hairline Strong** (`{colors.hairline-strong}` - #35373c): Active/focused borders, section dividers.

### Text
- **Ink** (`{colors.ink}` - #ffffff): Headlines, primary labels, values in stat cards.
- **Body** (`{colors.body}` - #b7bac1): Default running text, table cell content.
- **Body Strong** (`{colors.body-strong}` - #e5e7eb): Emphasized body, lead-detail field values.
- **Muted** (`{colors.muted}` - #6b7280): Timestamps, placeholder text, secondary metadata.

### Semantic (lead status + system states)
- **Success** (`{colors.success}` #22c55e / soft `{colors.success-soft}` #0f2b1c): "Prodáno" status tag, positive % change indicators.
- **Warning** (`{colors.warning}` #f59e0b / soft `{colors.warning-soft}` #2b230f): "V procesu" status tag, stale-lead notifications.
- **Danger** (`{colors.danger}` #ef4444 / soft `{colors.danger-soft}` #2b1414): "Odmítnuto" status tag, destructive buttons, negative % change.
- **Info** (`{colors.info}` #3b82f6 / soft `{colors.info-soft}` #101c2b): "Domluvená schůzka" status tag, informational banners.

## Typography

### Font Family
**Inter** (variable) is the spec's reference face - the closest open, widely-available match to BMW Type Next Latin's geometric-grotesk feel, at a weight range that stays legible in dense CRM tables. The shipped implementation uses the OS system-font stack (`-apple-system, "Segoe UI", Roboto...`) instead of fetching Inter from Google Fonts, so the build has no external network dependency - visually the two are close enough that swapping in Inter later (e.g. self-hosted) is a drop-in change, not a redesign.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-lg}` | 32px | 700 | 1.15 | -0.5px | Page titles ("Dashboard", "Leady") |
| `{typography.display-md}` | 24px | 700 | 1.2 | -0.25px | Section headers, modal titles |
| `{typography.data-value}` | 28px | 700 | 1.1 | -0.5px | Stat-card numbers, KPI values |
| `{typography.title-lg}` | 18px | 600 | 1.3 | 0 | Card titles, lead name headers |
| `{typography.title-md}` | 16px | 600 | 1.4 | 0 | Table section titles, sub-headers |
| `{typography.label-uppercase}` | 11px | 700 | 1.3 | 1px | Status tags, table column headers, nav-section labels |
| `{typography.body-md}` | 14px | 400 | 1.5 | 0 | Default UI copy, form labels' adjacent text |
| `{typography.body-sm}` | 13px | 400 | 1.5 | 0 | Table cell content, secondary detail |
| `{typography.caption}` | 12px | 400 | 1.4 | 0.25px | Timestamps, history entries |
| `{typography.button}` | 13px | 600 | 1 | 0.5px | All button labels |
| `{typography.nav-link}` | 13px | 500 | 1.4 | 0.25px | Sidebar navigation items |

### Principles
Headlines and stat-card numbers stay bold and tight (700, negative tracking) so they read instantly against the dark canvas; body and table copy stay at a plain, legible 400 with no letter-spacing, since a CRM is read for hours, not glanced at like a hero banner. Status tags and column headers are the one place uppercase + letter-spacing appears in running UI - it marks them as system labels, not conversational copy.

## Layout

### Spacing System
- **Base unit:** 4px. Tokens: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px.
- **Page padding:** `{spacing.lg}` (24px) around the main content area, below the 64px header.
- **Card internal padding:** `{spacing.lg}` (24px) for stat/content cards, `{spacing.md}` (16px) inside table cells.
- **Grid gutters:** `{spacing.md}` (16px) between stat cards in the dashboard row.

### Grid & Container
- **App shell:** Fixed 256px dark sidebar + fluid content column - no marketing-style max-width, the CRM uses the full viewport.
- **Dashboard stat row:** 4-up on desktop, 2-up on tablet, 1-up on mobile.
- **Data tables:** Full-width within the content column, horizontal scroll on narrow viewports rather than column collapse (numbers must stay aligned).

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow | Sidebar, header, page canvas |
| Soft hairline | 1px `{colors.hairline}` border | Card outlines, table row dividers |
| Card surface | `{colors.surface-card}` over canvas, no shadow | Stat cards, tables, modals, inputs |
| Elevated hover | `{colors.surface-elevated}` background | Row hover, active nav item, status tags |

No drop shadows anywhere in the system - depth comes purely from the three-step surface ladder (canvas → surface-card → surface-elevated), same discipline as the BMW reference.

### Decorative Depth
- **Pipeline Stripe** (`{component.pipeline-stripe}`): 3px horizontal stripe, blue → violet → rose, used under the sidebar logo mark and as a top-border accent on the page header. The system's only "decorative" element - reserved for identity, never a status or action color.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Buttons, cards, inputs, tables, modals, status tags - the dominant radius |
| `{rounded.xs}` | 2px | Reserved, effectively unused - kept for parity with the reference system |
| `{rounded.full}` | 9999px | Avatars, notification dot, circular icon/"+" buttons only |

Binary radius, same as the BMW reference: sharp rectangles for anything you read or click as a data control, circles only for anything that represents a person or a status ping.

## Components

### Sidebar
**`sidebar`** - Fixed 256px dark column (`{colors.canvas}`), logo mark at top with the `{component.pipeline-stripe}` beneath it, nav items in `{typography.nav-link}`. Active item gets `{colors.surface-elevated}` background and a 2px left border in `{colors.primary}` - no rounded pill highlight.

### Top Header
**`top-header`** - 64px bar in `{colors.surface-soft}`, page title in `{typography.title-md}`, notification bell and user menu at right. A 1px `{colors.hairline}` bottom border separates it from content.

### Buttons
**`button-primary`** - Solid `{colors.primary}` fill, white text, `{rounded.none}`, height 40px, label in `{typography.button}` (uppercase-adjacent letter-spacing at 0.5px, sentence-case text - CRM copy stays readable, unlike BMW's full-caps).

**`button-secondary`** - `{colors.surface-card}` fill with a 1px `{colors.hairline-strong}` border, white text, same shape as primary.

**`button-danger`** - Solid `{colors.danger}` fill, white text - used for delete/deactivate actions only.

### Cards & Data
**`stat-card`** - `{colors.surface-card}` background, `{rounded.none}`, `{spacing.lg}` padding. Value in `{typography.data-value}`, label above it in `{typography.label-uppercase}`, optional trend chip below.

**`data-table`** - `{colors.surface-card}` container, header row in `{typography.label-uppercase}` over `{colors.surface-elevated}`, body rows in `{typography.body-sm}` with `{colors.hairline}` dividers, hover state lifts row to `{colors.surface-elevated}`.

**`status-tag`** - Solid rectangular label (`{rounded.none}`), background from the relevant semantic `-soft` token, text in the full semantic color, `{typography.label-uppercase}`. Example: "PRODÁNO" = `{colors.success-soft}` background, `{colors.success}` text.

### Inputs & Forms
**`text-input`** - `{colors.surface-card}` background, `{rounded.none}`, 1px `{colors.hairline}` border, focus state switches border to `{colors.primary}` (no glow/shadow ring, a clean color-swap instead).

### Overlays
**`modal-surface`** - `{colors.surface-card}` panel, `{rounded.none}`, `{spacing.lg}` padding, sits over a semi-opaque black scrim (canvas at 70% opacity) rather than a blurred backdrop.

### Signature Components
**`pipeline-stripe`** - The 3px tricolor accent. Used under the sidebar wordmark, as a top-border on the dashboard's welcome header, and nowhere else - it marks "this is CRM Track Ops," not "this is clickable."

## Do's and Don'ts

### Do
- Keep the canvas dark everywhere - there is no light-mode surface in this system.
- Use `{rounded.none}` by default; reserve `{rounded.full}` strictly for avatars, the notification dot, and circular icon buttons.
- Keep status tags solid-filled and uppercase - they should read as system state, not as friendly chips.
- Reserve the pipeline stripe for brand-identity moments only (sidebar, header accent) - never as a status color or button fill.
- Let stat-card numbers dominate visually (`{typography.data-value}`) - the label above them stays small and quiet.

### Don't
- Don't introduce pastel/light badge backgrounds (e.g. light amber, light emerald) - they disappear against the dark canvas and break the "stamped label" status-tag language.
- Don't round card or button corners - the sharp edge is the system's signature, same discipline as the BMW reference.
- Don't use the pipeline stripe's three colors as separate status colors - status semantics come from the success/warning/danger/info tokens only.
- Don't drop body text below 400 weight for the sake of matching BMW's Light body - at CRM table sizes (13-14px) it hurts legibility during long work sessions.
- Don't add drop shadows - depth comes from the canvas → card → elevated surface ladder only.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Sidebar collapses to a bottom/hamburger nav; stat cards 1-up; tables scroll horizontally |
| Tablet | 768-1024px | Sidebar stays, narrower; stat cards 2-up |
| Desktop | 1024-1440px | Full sidebar + content; stat cards 4-up |
| Wide | > 1440px | Content column gets a max inner width for table readability; sidebar unchanged |

### Touch Targets
- `{component.button-primary}` and `{component.button-secondary}` render at 40px height minimum, comfortably tappable.
- Sidebar nav items keep 44px row height even though the label text is small.
- Status tags and table-row action buttons keep 8px vertical padding minimum to stay tappable inside dense rows.

## Iteration Guide

1. Change one shared component at a time - `.card`, `.btn-primary`, `.badge` in the global stylesheet ripple across every page that already uses them.
2. New components default to `{rounded.none}`. Only use `{rounded.full}` for a circular avatar/icon/status-dot.
3. Status colors always come in pairs: a `-soft` background token and a full-strength text token - never invent a new pastel.
4. The pipeline stripe is identity-only. If a new screen wants "brand energy," reach for the stripe before reaching for a new color.
5. Data values get `{typography.data-value}`; everything else stays in the body/label scale - never let a number blend into surrounding copy.
