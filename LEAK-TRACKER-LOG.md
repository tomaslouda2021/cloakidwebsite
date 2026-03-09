# Leak Tracker — Internal Log

> This is an internal log for the CloakID Leak Tracker experiment.
> It is NOT published on the website. It tracks all activity across the 10 personas
> to maintain a credible, auditable dataset.

## Experiment Rules

**Count as spam (leak detected):**
- Calls/SMS unrelated to the company the number was given to
- Telemarketing, robocalls, suspicious marketing
- Unknown parties who should not have the number

**Do NOT count as spam:**
- LendingTree partner lenders responding to your inquiry
- Toyota of Cedar Park dealership contacting you
- ASU admissions calling back
- Solar installers responding via EnergySage
- Contractors responding via Angi
- Any legitimate response from the company or its known distribution network

---

## Persona Reference

| Persona           | Company                        | Number Ends In | User ID |
|-------------------|--------------------------------|----------------|---------|
| Moving            | Moving.com                     | 9399           | 46      |
| Apartment Search  | Apartments.com                 | 9528           | 111     |
| Solar             | EnergySage                     | 0884           | 111     |
| Home Contractor   | Angi                           | 9454           | 111     |
| Mortgage          | LendingTree                    | 8417           | 111     |
| Insurance         | HealthMarkets                  | 2843           | 111     |
| Car Buying        | Toyota of Cedar Park           | 1579           | 111     |
| Travel            | Southwest Airlines             | 6208           | 46      |
| Public Listing    | Craigslist Listing (Control)   | 9291           | 46      |
| Education         | Arizona State University Online| 9245           | 46      |

---

## Day 1 — March 9, 2026

### Mortgage (8417) — LendingTree
- **SMS** 12:07 AM from +19127129937 (Tomo Mortgage): "Maggie here at Tomo. If you're like most folks, you've already dodged 3 lender voicemails today. Texting you instead, with your actual rate - 5.125..."
- **SMS** 12:07 AM from +19127129937 (Tomo Mortgage): Link to quote — https://s.tomo.com/dAfuthbOfeLd
- **SMS** 2:04 PM from +19495709546 (Unknown lender): "Hi John, I just received your inquiry about obtaining a new property and I look forward to working with you..."
- **CALL** 2:20 PM from +15125002528 (Austin VoIP block 512-500): Missed, 3 seconds, screened out. Predictive dialer pattern — connected, heard screening TTS, auto-disconnected. The 512-500 block is widely used by VoIP carriers serving mortgage brokers, insurance lead buyers, solar sales, and home service dialers. Dialer detected IVR/screening and dropped the call.
- **SMS** 3:07 PM from +19127129937 (Tomo Mortgage): "Hey John - did you take a look at your quote? Any questions on it? I'd love to lock you in..."
- **CALL** 5:17 PM from +15127207735 (Austin VoIP block 512-720): Missed, <1 second (256ms), screened out. Same predictive dialer pattern as previous call — connected, heard screening TTS, auto-disconnected instantly. Second dialer hit on Mortgage number.
- **Classification:** Likely a LendingTree partner lender using a predictive dialer. LendingTree distributes leads to multiple lenders, so dialers calling from VoIP blocks is expected behavior. Not counted as spam — but this is the pattern that precedes leaks when leads get resold downstream.
- **Verdict:** Expected (lead marketplace partner). Not a leak.

### Car Buying (1579) — Toyota of Cedar Park
- **SMS** 2:52 PM from +17373831804 (Christian Behl, Toyota of Cedar Park): "John, this is Christian Behl from Toyota of Cedar Park. Is it okay to text you? Reply YES to confirm..."
- **Verdict:** Expected. Dealership opt-in confirmation.

### Education (9245) — Arizona State University Online
- **CALL** 3:20 PM from +14807809632 (Phoenix/Tempe, AZ): No-answer, 43 seconds (22s screening + ringing). AI decision: ALLOW 90% confidence. Screened successfully.
- **Transcript:** "Hello. This is Arizona State University. Sorry we missed you today. Thank you for your interest in our programs."
- **Verdict:** Expected. ASU admissions callback from Tempe campus area code.

### Public Listing (9291) — Craigslist (Control)
- **CALL** 12:29 AM from +19137095399 (Kansas City, KS — Danielle West): 79 seconds, originator cancelled (SIP 487). Never reached CloakID call control — cancelled before answer. No CallLog created. First attempt.
- **CALL** 7:17 PM from +19137095399 (Kansas City, KS — Danielle West): 44.8 seconds, hit screening TIMEOUT, routed to voicemail. Recording saved. Second attempt.
- **Transcript:** "Hey my name is Danielle West, I was calling about the [car] advertised on Craigslist. Um, feel free give me a call back, 913-709-5399."
- **Classification:** Legitimate response to Craigslist listing. Same caller tried twice — first attempt cancelled before answer, second attempt left voicemail.
- **Verdict:** Expected. Control persona working as intended.
- **Note:** On second call, caller spoke after the screening window timed out, so speech arrived in TIMEOUT state. Voicemail captured the message.

### All Other Personas
- Moving (9399): No activity
- Apartment Search (9528): No activity
- Solar (0884): No activity
- Home Contractor (9454): No activity
- Insurance (2843): No activity
- Travel (6208): No activity

### Day 1 Summary

| Company | Number | Legit | Spam | Notes |
|---------|--------|-------|------|-------|
| Moving.com | 9399 | 0 | 0 | No activity |
| Apartments.com | 9528 | 0 | 0 | No activity |
| EnergySage | 0884 | 0 | 0 | No activity |
| Angi | 9454 | 0 | 0 | No activity |
| LendingTree | 8417 | 6 | 0 | 3 SMS (Tomo Mortgage), 1 SMS (unknown lender), 2 calls (dialers, both screened out) |
| HealthMarkets | 2843 | 0 | 0 | No activity |
| Toyota of Cedar Park | 1579 | 1 | 0 | 1 SMS (dealership opt-in) |
| Southwest Airlines | 6208 | 0 | 0 | No activity |
| Craigslist | 9291 | 2 | 0 | 2 calls (Danielle West — 1st cancelled, 2nd left voicemail re: Craigslist ad) |
| ASU Online | 9245 | 1 | 0 | 1 call (ASU admissions, screened ALLOW) |

- **Total legitimate responses:** 10 (6 Mortgage + 1 Car Buying + 1 Education + 2 Craigslist)
- **Total spam detected:** 0
- **Leaks detected:** 0
- **Experiment status:** Clean. Numbers are active and receiving expected responses.
- **CDR verified:** All activity cross-referenced against Telnyx CDR export (8 CDR rows, 4 distinct inbound calls).
