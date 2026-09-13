# CloakID marketing website

Static HTML site deployed through the existing Vercel/GitHub integration. Preserve `vercel.json`, including the persona-sharing rewrite and Android redirect. No application build is required.

## Verified content baseline — September 13, 2026

- Personal: $14.99/month, up to 3 active numbers including at most 1 temporary; 200 connected minutes, 400 outgoing SMS parts, 2 replacement numbers per billing period.
- Pro: $34.99/month, up to 6 active numbers including at most 2 temporary; 600 minutes, 1,000 outgoing SMS parts, 3 replacements per billing period.
- Executive: $249/month or $2,400/year, contact-sales only (not sold in the app); up to 15 numbers including at most 3 temporary; 2,000 minutes, 4,000 outgoing SMS parts, 6 replacements. Page: `executive.html`.
- Office: custom agreement, not a self-serve team-administration product.
- Allowances are per subscription billing period (not calendar month); minutes = connected calls in and out; SMS = outgoing parts only (MMS = 3); in-progress calls are never cut at a limit.
- Personal and Pro are bought in the iPhone app (Apple In-App Purchase) or at app.cloakid.app (Stripe). Android uses the web checkout. Same price on both rails. Plan CTAs on this site link to app.cloakid.app, not to Stripe Payment Links.
- Temporary numbers count within the total allowance, not in addition to it.
- iPhone and Android listings are live. iPhone requires iOS 16+. US mobile number required; service is US-only.
- Profile → Manage subscription opens billing management in the app (Apple or Stripe depending on where the plan was bought).

Source of truth for prices and limits: `GET https://api.cloakid.app/api/billing/plans/` (the same catalog the app reads).
Compare facts to `CloakIDV2/backend/core/plans.py`, `backend/core/subscription_limits.py`, `backend/api/views/user_views.py`, `mobile/src/screens/settings/ProfileScreen.js`, and `docs/BILLING_ARCHITECTURE.md` before changing published allowances or billing instructions.

## Privacy wording

The security page distinguishes account-number and voicemail encryption from other records and from ordinary carrier transport. Screening transcripts can persist in call history. Encryption keys are server-managed. Never claim that all communications are end-to-end encrypted, screening is infallible, or a whole call takes under one second.

Account deletion removes app records and requests number release. Message media cleanup runs separately; stored voicemail audio, backups, provider records, and billing records must not be described as instantly erased. Individual voicemail deletion removes its stored audio. Trial accounts that never subscribed can leave an abuse-prevention hash for up to 180 days. Account deletion does not substitute for subscription cancellation.

Evidence: `backend/core/crypto.py`, `backend/telephony/services/secure_storage.py`, `backend/telephony/call_control_webhooks.py`, `backend/api/views/user_views.py`, `backend/telephony/services/mms_media_lifecycle.py`, and `backend/telephony/tasks/demo_line_cleanup.py`.

## Local checks

Serve this directory with a local static HTTP server. Check all page links and local assets, inline JavaScript and JSON syntax, and the diff before release. Root-relative anchors resolve against the homepage. Production clean URLs map to the corresponding HTML file.

`site-navigation.css` supplies the shared native small-screen menu. `styles-v2.css` styles secondary pages; the homepage retains its existing inline design. The plan comparison has accessible included labels and a keyboard-focusable horizontal scroll area on small screens.

Store and checkout clicks are intent events, not verified purchases. The Office inquiry must not emit a Stripe checkout conversion. Do not add fabricated testimonials, adoption counts, certification claims, screening benchmarks, or a hardcoded operational-status badge.

Real customer testimonials and a recorded product demo require approved source material. The public call-demo link remains available. Do not invent those assets.
