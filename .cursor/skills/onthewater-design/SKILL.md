---
name: onthewater-design
description: >-
  Designs and implements modern ONTHEWATER (boatrent) UI: registration/login,
  booking panels, marketing pages, and design renders. Enforces navy brand,
  Montserrat, water imagery, and anti-AI-generic patterns. Use when redesigning
  pages, matching Figma/screenshots, generating registration/auth UI mocks,
  restyling modals/forms, or when the user asks for modern/premium site design.
---

# ONTHEWATER design

## Before coding

1. Read [tokens.md](tokens.md) for colors, type, radii, CTAs.
2. Match **existing shell**: SiteHeader + SiteFooter stay unless user says otherwise.
3. Prefer **real product UI** (app screenshots, boat photos) over generic stock/maps invent.
4. Desktop and mobile (≤768 app shell) can differ — don't break the other.

## Visual direction

- Match **homepage** (`precision-home`): Montserrat, ink `#0a0a0a`, muted `#6b7280`, line `#e5e7eb`, navy `#1b365d`, radius `2px`, white canvas.
- Primary CTA = header «Разместить объявление»: black `#0a0a0a`, uppercase, hover navy.
- Section titles: uppercase, weight 800, letter-spacing `0.1em` (`.pm-sectionTitle`).
- Motion: 2–3 intentional transitions max; no glow spam.

## Do / Don't

**Do**
- One job per section; generous whitespace
- Store badges like homepage (`pm-app__badge` pattern: black App Store / Google Play)
- Field icons inside inputs (right), navy titles, muted gray body
- Terms checkbox linking `/terms` + `/privacy`

**Don't**
- Purple/indigo gradients, cream+terracotta+serif, broadsheet hairlines
- Dark mode by default, emoji, floating promo stickers on photos
- Invent fake app UI inside phone frames — use real screenshots when provided
- Touch global header/footer CSS unless asked

## Auth / registration layouts (preferred)

When user attaches or picks a concept, implement that. Default modern target:

**Split (preferred for `/register`):**
- Left ~45%: logo + «Создайте аккаунт» + form + blue CTA + login link
- Right ~55%: full-bleed boat/water photo in large rounded panel; optional soft **curved** vertical edge
- Optional overlay on photo: short Russian headline + line («Катера. Яхты. Путешествия.»)
- Optional under form: App Store / Google Play badges
- Keep password + password repeat + phone mask `+7 (___) ___-__-__`

**Benefits + form (alternate):**
- Left: «Преимущества с ONTHEWATER» + 3 circular soft-blue icons (избранное / бронь / чат) + store badges
- Right: white card form — **no phone mockup** unless user supplies a real app screenshot

## Workflow: design → code

1. If user wants **renders**: generate 3–5 variants with `GenerateImage`, same brand, label differences in chat.
2. Wait for pick (number / mix). Then implement in `site/src` only for chosen concept.
3. Pixel-check against attached screenshot: button color, icon shape (circle vs square), store badge style, column ratio.
4. Mobile: form first, image/benefits stack below; header/footer unchanged.

## Files

- Register: `site/src/pages/RegisterPage.jsx` + auth styles in `site/src/styles/global.css` (`.auth-register*`)
- Login: keep simpler unless asked to match split
- Booking C06: `BookingPanelC06.jsx`, `boat-detail-c06.css` — preserve patterns
- Store URLs: `site/src/constants/appStores.js` (client vs owner)

## Quality bar

Ship when: matches chosen render, brand tokens correct, desktop + mobile usable, no header/footer regressions, Russian copy intact.
