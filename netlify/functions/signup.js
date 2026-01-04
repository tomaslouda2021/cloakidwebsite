const { Resend } = require('resend');
const { getStore } = require('@netlify/blobs');

const resend = new Resend(process.env.RESEND_API_KEY);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appp5kjLRr0PCIhaC';
const AIRTABLE_TABLE_NAME = 'Signups';
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5; // 5 signups per hour per IP

async function isRateLimited(ip) {
    const now = Date.now();

    try {
        const store = getStore('rate-limits');
        const record = await store.get(ip, { type: 'json' });

        if (!record) {
            await store.setJSON(ip, { count: 1, windowStart: now });
            return false;
        }

        // Reset window if expired
        if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
            await store.setJSON(ip, { count: 1, windowStart: now });
            return false;
        }

        // Check if over limit
        if (record.count >= MAX_REQUESTS_PER_WINDOW) {
            return true;
        }

        // Increment count
        await store.setJSON(ip, { count: record.count + 1, windowStart: record.windowStart });
        return false;
    } catch (error) {
        // If Blobs unavailable, allow request (fail open)
        console.error('Rate limit check failed:', error);
        return false;
    }
}

async function verifyRecaptcha(token) {
    if (!RECAPTCHA_SECRET_KEY) {
        console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
        return { success: true, score: 1.0 };
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
    });

    const data = await response.json();
    return data;
}

async function addToAirtable(email, recaptchaScore, clientIP, why, verificationToken) {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            records: [{
                fields: {
                    'Email Address': email,
                    'Signup Date': new Date().toISOString().split('T')[0],
                    'reCAPTCHA Score': recaptchaScore || 0,
                    'IP Address': clientIP,
                    'Why CloakID': why,
                    'Verification Token': verificationToken,
                    'Status': 'unverified'
                }
            }]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Airtable error:', error);
        throw new Error('Failed to add to Airtable');
    }

    return response.json();
}

// Generate a random verification token
function generateVerificationToken() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get client IP for rate limiting
    const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || event.headers['client-ip']
        || 'unknown';

    // Check rate limit
    if (await isRateLimited(clientIP)) {
        console.log(`Rate limited: ${clientIP}`);
        return {
            statusCode: 429,
            body: JSON.stringify({ error: 'Too many requests. Please try again later.' })
        };
    }

    try {
        const { email, recaptchaToken, why, website } = JSON.parse(event.body);

        // Honeypot check - silently reject bots (return fake success)
        if (website) {
            console.log(`Honeypot triggered: ${email} from ${clientIP}`);
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Signup successful' })
            };
        }

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid email format' })
            };
        }

        // Block spam and disposable email domains
        const spamDomains = [
            // Original spam domains
            'valvesoftware.com', 'example.com', 'test.com',
            // Disposable email providers
            'mailinator.com', 'mailinator2.com', 'mailinater.com',
            'tempmail.com', 'temp-mail.org', 'temp-mail.io',
            'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz',
            'throwaway.email', 'throwawaymail.com',
            '10minutemail.com', '10minutemail.net', '10minutemail.org',
            'fakeinbox.com', 'fakemailgenerator.com',
            'disposablemail.com', 'disposable.com',
            'yopmail.com', 'yopmail.fr', 'yopmail.net',
            'maildrop.cc', 'mailnesia.com',
            'sharklasers.com', 'guerrillamail.info',
            'trashmail.com', 'trashmail.net', 'trashmail.org',
            'getnada.com', 'nada.email',
            'tempinbox.com', 'tempmailaddress.com',
            'emailondeck.com', 'instantemailaddress.com',
            'mohmal.com', 'dispostable.com',
            'mailcatch.com', 'mytrashmail.com',
            'spamgourmet.com', 'spamex.com',
            'getairmail.com', 'discard.email',
            'mailsac.com', 'inboxalias.com',
            'burnermail.io', 'tempail.com',
            'emailfake.com', 'crazymailing.com',
            'tempmailo.com', 'tempr.email',
            'fakemail.net', 'fakemailgenerator.net',
            'mintemail.com', 'mailforspam.com',
            'spamfree24.org', 'spamfree24.com',
            'jetable.org', 'filzmail.com',
            'anonymbox.com', 'sogetthis.com',
            'mailmoat.com', 'spam4.me'
        ];
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (spamDomains.includes(emailDomain)) {
            console.log(`Blocked spam domain: ${email}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Please use a valid email address' })
            };
        }

        // Validate "why" field
        if (!why || why.trim().length < 20) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Please tell us why you want CloakID (at least 20 characters)' })
            };
        }

        // Reject URLs in "why" field (spam indicator)
        if (/https?:\/\//i.test(why)) {
            console.log(`URL in why field rejected: ${email}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Please provide a genuine response without URLs' })
            };
        }

        // Reject repeated characters (spam indicator like "aaaaaaaaaa")
        if (/(.)\1{5,}/.test(why)) {
            console.log(`Repeated chars in why field rejected: ${email}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Please provide a genuine response' })
            };
        }

        // Verify reCAPTCHA
        if (!recaptchaToken) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'reCAPTCHA verification required' })
            };
        }

        const recaptchaResult = await verifyRecaptcha(recaptchaToken);

        if (!recaptchaResult.success) {
            console.log('reCAPTCHA failed:', recaptchaResult);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'reCAPTCHA verification failed' })
            };
        }

        // Check reCAPTCHA score (v3 returns 0.0 - 1.0, higher is more likely human)
        if (recaptchaResult.score !== undefined && recaptchaResult.score < 0.7) {
            console.log(`Low reCAPTCHA score (${recaptchaResult.score}) for: ${email}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Verification failed. Please try again.' })
            };
        }

        // Generate verification token
        const verificationToken = generateVerificationToken();
        const verificationUrl = `https://cloakid.app/.netlify/functions/verify?token=${verificationToken}`;

        // Add to Airtable first (with unverified status)
        await addToAirtable(email, recaptchaResult.score, clientIP, why, verificationToken);

        // Send verification email to the user
        await resend.emails.send({
            from: 'CloakID <noreply@cloakid.app>',
            to: email,
            subject: "Verify your email to join CloakID beta",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                                    <!-- Header with logo -->
                                    <tr>
                                        <td style="padding: 32px 32px 0; text-align: center;">
                                            <img src="https://cloakid.app/images/cloakid-icon-black.png" alt="CloakID" width="48" height="48" style="display: block; margin: 0 auto 16px;">
                                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">Verify your email</h1>
                                        </td>
                                    </tr>

                                    <!-- Main content -->
                                    <tr>
                                        <td style="padding: 24px 32px;">
                                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                                                Thanks for your interest in CloakID! Click the button below to verify your email and complete your beta application.
                                            </p>

                                            <!-- CTA Button -->
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" style="padding: 8px 0 24px;">
                                                        <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #00C853 0%, #00a843 100%); color: white; font-weight: 600; font-size: 16px; padding: 14px 40px; border-radius: 100px; text-decoration: none; box-shadow: 0 4px 14px rgba(0, 200, 83, 0.4);">Verify Email Address</a>
                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- Link expires notice -->
                                            <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
                                                This link expires in 24 hours
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Divider -->
                                    <tr>
                                        <td style="padding: 0 32px;">
                                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="padding: 24px 32px 32px; text-align: center;">
                                            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">
                                                Didn't request this? You can safely ignore this email.
                                            </p>
                                            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                                                © ${new Date().getFullYear()} Niobium LLC · <a href="https://cloakid.app" style="color: #1ba3c6; text-decoration: none;">cloakid.app</a>
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Fallback link -->
                                <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
                                    Button not working? Copy and paste this link:<br>
                                    <a href="${verificationUrl}" style="color: #1ba3c6; word-break: break-all;">${verificationUrl}</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        });

        // Send notification to the team
        await resend.emails.send({
            from: 'CloakID <noreply@cloakid.app>',
            to: 'support@cloakid.app',
            subject: 'New Beta Application (Unverified)',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
                    <h2 style="color: #0f172a;">New Beta Application</h2>
                    <p style="color: #f59e0b; font-weight: 600;">⏳ Awaiting email verification</p>
                    <p style="color: #4b5563; font-size: 16px;">
                        <strong>Email:</strong> ${email}<br>
                        <strong>Why CloakID:</strong> ${why}<br>
                        <strong>Time:</strong> ${new Date().toISOString()}<br>
                        <strong>IP:</strong> ${clientIP}<br>
                        <strong>reCAPTCHA Score:</strong> ${recaptchaResult.score || 'N/A'}
                    </p>
                </div>
            `
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Signup successful' })
        };

    } catch (error) {
        console.error('Signup error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process signup' })
        };
    }
};
