# CloakID marketing website

Static HTML site deployed through the existing Vercel/GitHub integration. Preserve `vercel.json`, including the persona-sharing rewrite and Android redirect. No application build is required.

## Verified content baseline — September 11, 2026

- Principal: $99/month, up to 5 active numbers, including at most 1 temporary number; 400 call minutes and 750 SMS in the calendar-month usage display.
- Executive: $2,400/year ($200/month equivalent), or $249/month by inquiry; up to 8 active numbers, including at most 2 temporary numbers; 1,500 call minutes and 1,500 SMS.
- Temporary numbers count within the total allowance, not in addition to it.
- New purchases use Stripe. Apple renewals are grandfathered; Google acquisition is disabled. Historical store refunds remain with the original provider.
- Office is a custom agreement, not a self-serve team-administration product.
- iPhone and Android listings are live. iPhone requires iOS 16+. US mobile number required; service is US-only.
- Create the account first, then use the same mobile number at Stripe checkout. Profile → Manage subscription opens billing management in the app.

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
