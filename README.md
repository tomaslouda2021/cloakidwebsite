# Handoff: CloakID Marketing Website — Path B

## What Changed from v2.4

v2.4 was factually correct but visually wrong for the audience. Dense monospace metadata, indexed section tags, stat cards full of implementation detail. It read like a developer-tool landing when the buyer is someone stressed about their ex, their landlord, or a data broker.

Path B replaces the aesthetic and voice, not the facts. Every factual guardrail from the v2.4 audit still applies (correct persona counts, US-only, iOS 16+, correct App Store URL, no invented metrics, no claims about features that don't exist). What changes:

- **Voice:** problem-first. Each section opens with a scene the buyer recognizes.
- **Rhythm:** Apple-style vertical scroll. One idea per section, alternating sides, breathing room.
- **Aesthetic:** monochrome + one warm neutral. Monospace only on pricing digits. No hairline grids. No indexed section tags. No feature-card specs.
- **Scope:** one variant, not two. No switcher, no scaffolding bar.

If you saw v2.4: imagine the same typography system and color discipline, but with Apple product-page pacing and a human voice.

---

## Product Facts — Bind Copy to These

These are the facts the copy is bound to. Changing the copy without changing the facts (or vice versa) creates App Store review and FTC risk. Verified against the shipping product as of April 2026.

### Platform + geography
- **iOS only at launch.** Minimum deployment: **iOS 16** (`mobile/ios/CloakIDmobile.xcodeproj/project.pbxproj: IPHONEOS_DEPLOYMENT_TARGET = 16.0`).
- **Android in development, not shipped.** The "Android waitlist →" footer link points to the existing `android.html` page. Do not commit to a release date.
- **US-only.** Telnyx number search is hardcoded to US (`backend/telephony/telnyx_client.py: filter[country_code] = 'US'`). Never claim international availability.

### Pricing + number limits (authoritative: `backend/core/subscription_limits.py`)
| Plan | Monthly price | Permanent numbers | Disposable numbers | Notes |
|---|---|---|---|---|
| Trial | Free, 7 days | 2 | 1 | No card required |
| Core | $9.99 | 3 | 1 | Customer-facing |
| Executive | $19.99 | 8 | 2 | Customer-facing |
| Beta | n/a | 15 | 3 | Internal only |

Public max is **eight permanent + two disposable** on Executive. Never say "sixteen" in public copy. Never cite the Beta tier.

### Disposable numbers — the differentiator
Disposable numbers auto-delete after **7 days** (the `is_temporary` flag on `Persona`). This is the single strongest sell vs. Google Voice. Scene 2 ("Sell the couch. Burn the number.") is built around this.

### Screening pipeline (`backend/telephony/` + `backend/ai_services/call_screening_agent.py`)
Screening runs **server-side**. When a call comes in:
1. Telnyx webhook → `backend/telephony/telnyx_webhooks.py`
2. Policy engine (`backend/telephony/services/policy_engine.py`) evaluates trust + caller context
3. Screening agent (GPT-4o-mini via LangChain) challenges unknown callers when needed
4. Deepgram Nova-2 handles real-time transcription
5. Decision: `ALLOW` / `BLOCK` / `CHALLENGE` / `VOICEMAIL`

In public copy: never say "on-device," "carrier-side," "agent," "GPT," "LangChain," or "taxonomy." Just describe what the buyer feels: "the pharmacy gets through, the scammer doesn't."

### Features that ship and can be marketed
- Real US numbers per context.
- Per-number inbound and outbound SMS.
- Outbound calls with persona caller ID.
- Voicemail with automatic transcription (Deepgram).
- iOS home screen widget (`mobile/ios/widget/CloakIDWidget.swift`).
- Face ID / Touch ID app lock.
- Per-number allow/block rules (backend category system, 7 buckets — never name the buckets in copy).
- Unified activity feed labelled by the number that received the call.

### Features that do NOT exist — do not mention
- Quiet hours / time-of-day blocking
- Area-code blocking
- VIP contacts / VIP screening
- Per-number ringtones
- Per-number auto-reply
- CSV export
- iCloud sync of any kind (Keychain credentials are explicitly device-only via `WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- "On-device screening"

### Encryption + analytics (honest story, Three Rules section)
- Phone numbers encrypted at rest with Fernet; SHA-256 hashes for lookups (`backend/telephony/models.py`). **Do not** say "end-to-end" or "zero-knowledge."
- Voicemail audio is not retained long-term; transcripts are stored encrypted alongside the call record.
- Face ID / Touch ID lock on launch. Refresh tokens in Keychain, access tokens in memory only.
- **No advertising SDKs.** Verified: no AdMob, Facebook, AppLovin, Unity, MoPub.
- **Sentry present** with PII stripping (`send_default_pii=False` + `beforeSend` hook scrubs email/phone). The Three Rules copy calls this "no third-party analytics beyond a scrubbed crash reporter" — that's the honest framing.

### App Store
- **URL: `https://apps.apple.com/us/app/cloakid-private-calling/id6761379232`**
- Every CTA in the prototype uses this URL. Do not change the ID.

---

## Design Tokens

All tokens in `:root`. Port to the codebase's theme system under the same names.

### Colors
| Token | Value | Use |
|---|---|---|
| `--ink` | `#0A0A0A` | Primary text, CTAs, featured pricing card |
| `--ink-2` | `#1F1F21` | Secondary text, nav links, list items |
| `--ink-3` | `#5C5C60` | Body copy (slightly warmer than v2.4's `#6B6B6F`) |
| `--ink-4` | `#9A9A9E` | `.muted` headline halves, small metadata, check glyphs |
| `--line` | `#EAEAEC` | Primary hairlines, card borders |
| `--line-soft` | `#F2F2F4` | List row dividers |
| `--bg` | `#FFFFFF` | Canvas |
| `--bg-warm` | `#FAF8F4` | Alternating scene sections + pricing surface |

No gradients. No other colors. No green status dots, no red stat rows. The color story is quiet: white, warm neutral, ink.

### Typography
- **Sans:** Inter, weights 400/500/600/700.
- **Mono:** JetBrains Mono 500 — used **only** on pricing digits. Everywhere else is sans.
- Body letter-spacing: `-0.011em` globally. Headlines tighten to `-0.025em` → `-0.03em` at largest sizes.
- Headlines: weight 600, line-height 1.02–1.1.
- `text-wrap: balance` on headlines, `text-wrap: pretty` on body.
- Pricing digits use `font-variant-numeric: tabular-nums`.

### Spacing
- Section vertical padding: `120px` desktop, `80px` mobile. Hero/rules/final: `140px`.
- Side padding: `40px` desktop, `24px` mobile.
- Max content width: `1240px` (scenes), `1080px` (pricing), `880px` (rules), `640px` (final CTA).
- Card radii: `24px` pricing cards, `999px` CTA pills.
- Phone bezel: `48px` outer, `38px` inner. Dynamic Island `106×28`.

### Shadow
One recipe, for the phone:
`0 24px 60px -24px rgba(0,0,0,0.22), 0 4px 12px -4px rgba(0,0,0,0.06)`

Softer than v2.4's four-layer phone shadow. Fits the warmer aesthetic.

### Motion
- CTA hover: `translateY(-1px)` with `transition .2s ease`. Nothing else.
- No scroll effects, no reveals, no parallax. Respect `prefers-reduced-motion` around the hover lift.

---

## Structure — 7 Sections

All sections share the same `.section` container (`min-height: 100vh`, centered flex). Alternating `.warm` class toggles background color.

1. **Nav** — sticky, ink CTA right, transparent-on-white with backdrop blur. No version badge, no compare chrome.
2. **Hero** — `1.25fr 0.75fr` grid. H1 left (two lines, second line muted), sub + two CTAs, phone right.
3. **Scene 1 — Dating + deliveries** (`.warm`, flipped: phone left, text right). Title: *"Your match. Not your number."*
4. **Scene 2 — Sell the couch** (white, text left, phone right). Title: *"Sell the couch. Burn the number."* — the disposable-numbers story.
5. **Scene 3 — Who got through** (`.warm`, flipped). Title: *"Your pediatrician rang. The scammer didn't."* — screening, felt not explained.
6. **Three Rules** — centered, white, hairline top + bottom. No table, no mono. Three sentences at display-size.
7. **Pricing** (`.warm`) — two cards, warm language. Executive card is `.featured` (ink bg).
8. **Final CTA** — centered, one line + two CTAs.
9. **Footer** — single-line, legal + Android waitlist link.

(Nav and footer aren't counted as scenes but are present on every page.)

---

## Copy — Verbatim

Do not paraphrase. The hero and scene titles are the product's voice.

- **Nav links:** How it works · Privacy · Pricing
- **Nav CTA:** Get CloakID →
- **Hero H1:** "You shouldn't need your real number for a dry cleaner loyalty card." (second clause muted)
- **Hero sub:** "CloakID gives you up to eight real US phone numbers — one for each part of your life. Share the one that fits. Retire any of them when you're done."
- **Scene 1 title:** "Your match. Not your number."
- **Scene 1 body:** "Give the dating app one number. Give DoorDash another. Give the pediatrician a third. If a Hinge match turns weird, you retire their number — not yours. The people you care about still reach you on the one you've had since high school."
- **Scene 2 title:** "Sell the couch. Burn the number."
- **Scene 2 body:** "Temporary numbers delete themselves after seven days. Post the Craigslist ad, take the weird texts, and move on. Nobody's calling you back about that futon in 2027."
- **Scene 3 title:** "Your pediatrician rang. The scammer didn't."
- **Scene 3 body:** "CloakID listens to unknown callers before your phone does. A call from a real pharmacy goes through. A robocall trying to pass as one doesn't. You set the rules per number — your dating line can be tight, your work line loose."
- **Rules title:** "Built on three rules."
- **Rule 1:** *"We don't sell your data."* Not to advertisers. Not to brokers. Not ever.
- **Rule 2:** *"We don't keep what we don't need."* Voicemails become transcripts; the audio goes.
- **Rule 3:** *"Your phone is your phone."* Face ID lock, no tracking, no ads, no third-party analytics beyond a scrubbed crash reporter.
- **Pricing head:** "Two plans. Seven-day trial." / "No credit card required to start. Cancel anytime, keep what you've logged, lose nothing."
- **Core note:** "Three numbers. Plus one disposable that deletes itself after a week. Everything you need to unhook your real number from every form you've ever filled out."
- **Executive note:** "Eight numbers. Plus two disposables. For people who keep work, dating, family, and everything else in separate lanes."
- **Final CTA:** "Take your number off the table." (second clause muted)

---

## Assets

| Path | Purpose |
|---|---|
| `images/cloakid-icon-black.png` | Brand mark in nav |
| `images/app-store-badge-black@2x.png` | App Store badge |
| `images/screenshots/hero-screen.png` | Hero iPhone mockup |
| `images/screenshots/persona-list.png` | Scene 1 — number list |
| `images/screenshots/messages.png` | Scene 2 — disposable number SMS thread |
| `images/screenshots/call-screened.png` | Scene 3 — screening decision |

All six exist in the repo already. Swap in better production shots as they arrive. Phone screenshots should be 9:19.5, chrome-free; the bezel is applied via CSS.

---

## Responsive

- **< 960px:** all `.section-inner` grids collapse to single column, nav links become an icon menu (not wired yet — add on implementation), hero min-height relaxes, pricing plans stack, phones cap at 320px.
- **< 520px:** hero headline drops to `clamp(32px, 8vw, 48px)` — adjust in the media query if needed after content testing.

---

## Accessibility

- Color contrast: ink (`#0A0A0A`) on white passes AAA. `--ink-3` (`#5C5C60`) on white passes AA at 5.6:1. `--ink-4` (`#9A9A9E`) is for muted headline halves only — do not use for body copy.
- Every interactive element keyboard-reachable. Sticky nav CTA focusable.
- Every phone mockup image has a descriptive `alt`.
- Respect `prefers-reduced-motion` around the CTA hover lift.

---

## Regression Guard — Run Before Every Deploy

Marketing copy drift is the #1 risk. Before every deploy, run:

```bash
# Banned product claims
grep -niE 'iCloud|\bE2E\b|on-device|CSV export|94\.2|sixteen|16 personas|\bVIP\b|quiet hours|auto-reply|ring pattern|area[- ]code blocking|time[- ]of[- ]day|34 countries|zero third-party SDK' CloakID_Website.html

# App Store URL drift
grep -nE 'apps\.apple\.com' CloakID_Website.html | grep -v 'id6761379232'

# Aesthetic drift (Path B guards)
grep -nE 'feature · 0|01 · |02 · |03 · |cc-seg|hero-float-meta' CloakID_Website.html
grep -nE '<dl>|<dt>|<dd>' CloakID_Website.html
```

All four blocks must return zero results.

---

## Files

- `CloakID_Website.html` — the prototype. Opens standalone in a browser.
- `README.md` — this document.

A developer who wasn't in the design conversation should be able to implement from this file alone. If anything conflicts, the **Product Facts** section wins — facts are bound to code, copy isn't.
