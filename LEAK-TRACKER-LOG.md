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
| Public Listing    | Craigslist Listing (Control)   | 6725           | 46      |
| Education         | Arizona State University Online| 9245           | 46      |

---

## Day 1 — March 9, 2026

### Mortgage (8417) — LendingTree
- **SMS** 12:07 AM from +19127129937 (Tomo Mortgage): "Maggie here at Tomo. If you're like most folks, you've already dodged 3 lender voicemails today. Texting you instead, with your actual rate - 5.125..."
- **SMS** 12:07 AM from +19127129937 (Tomo Mortgage): Link to quote — https://s.tomo.com/dAfuthbOfeLd
- **SMS** 2:04 PM from +19495709546 (Unknown lender): "Hi John, I just received your inquiry about obtaining a new property and I look forward to working with you..."
- **CALL** 2:20 PM from +15125002528: Missed, 2 seconds, screened out
- **SMS** 3:07 PM from +19127129937 (Tomo Mortgage): "Hey John - did you take a look at your quote? Any questions on it? I'd love to lock you in..."
- **Verdict:** All expected. LendingTree distributes leads to partner lenders by design.

### Car Buying (1579) — Toyota of Cedar Park
- **SMS** 2:52 PM from +17373831804 (Christian Behl, Toyota of Cedar Park): "John, this is Christian Behl from Toyota of Cedar Park. Is it okay to text you? Reply YES to confirm..."
- **Verdict:** Expected. Dealership opt-in confirmation.

### Education (9245) — Arizona State University Online
- **CALL** 3:20 PM from +14807809632 (480 = Phoenix/Tempe AZ area code): No-answer, 22 seconds, screened
- **Transcript:** "Hello. This is Arizona State University. Sorry we missed you today. Thank you for your interest in our programs."
- **Verdict:** Expected. ASU admissions callback.

### All Other Personas
- Moving (9399): No activity
- Apartment Search (9528): No activity
- Solar (0884): No activity
- Home Contractor (9454): No activity
- Insurance (2843): No activity
- Travel (6208): No activity
- Public Listing / Control (6725): No activity (1 outbound call from Feb 24, pre-experiment)

### Day 1 Summary
- **Legitimate responses:** 6 (4 SMS + 1 call on Mortgage, 1 SMS on Car Buying, 1 call on Education)
- **Spam detected:** 0
- **Leaks detected:** 0
- **Experiment status:** Clean. Numbers are active and receiving expected responses.
