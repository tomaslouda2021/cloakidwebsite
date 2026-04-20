const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appp5kjLRr0PCIhaC';
const AIRTABLE_TABLE_NAME = 'Android Waitlist';
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

const APP_STORE_URL = 'https://apps.apple.com/us/app/cloakid-private-calling/id6761379232';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const rateLimitMap = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return false;
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }

    record.count++;
    return false;
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

async function addToAirtable(email, recaptchaScore, clientIP, source) {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            records: [{
                fields: {
                    'Email': email,
                    'Signup Date': new Date().toISOString().split('T')[0],
                    'IP Address': clientIP,
                    'Source': source || 'direct',
                    'reCAPTCHA Score': recaptchaScore || 0
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

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || 'unknown';

    if (isRateLimited(clientIP)) {
        console.log(`Rate limited: ${clientIP}`);
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        const { email, recaptchaToken, source, website } = req.body;

        // Honeypot — silently fake-succeed for bots
        if (website) {
            console.log(`Honeypot triggered: ${email} from ${clientIP}`);
            return res.status(200).json({ success: true, message: "You're on the list" });
        }

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // TODO: extract disposable-domain list to api/_spam-domains.js and share with signup.js
        const spamDomains = [
            'valvesoftware.com', 'example.com', 'test.com',
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
            return res.status(400).json({ error: 'Please use a valid email address' });
        }

        if (!recaptchaToken) {
            return res.status(400).json({ error: 'reCAPTCHA verification required' });
        }

        const recaptchaResult = await verifyRecaptcha(recaptchaToken);

        if (!recaptchaResult.success) {
            console.log('reCAPTCHA failed:', recaptchaResult);
            return res.status(400).json({ error: 'reCAPTCHA verification failed' });
        }

        // Lower threshold than signup.js (0.7) — waitlist is low-friction and LinkedIn mobile
        // traffic often scores weak even for real humans.
        if (recaptchaResult.score !== undefined && recaptchaResult.score < 0.5) {
            console.log(`Low reCAPTCHA score (${recaptchaResult.score}) for: ${email}`);
            return res.status(400).json({ error: 'Verification failed. Please try again.' });
        }

        const normalizedSource = (source || 'direct').toString().slice(0, 64);

        await addToAirtable(email, recaptchaResult.score, clientIP, normalizedSource);

        // Confirmation email to the user — includes App Store CTA so iOS-household
        // signups can convert immediately instead of waiting for Android to ship.
        await resend.emails.send({
            from: 'CloakID <noreply@cloakid.app>',
            to: email,
            subject: "You're on the CloakID Android waitlist",
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
                                    <tr>
                                        <td style="padding: 32px 32px 0; text-align: center;">
                                            <img src="https://cloakid.app/images/cloakid-icon-black.png" alt="CloakID" width="48" height="48" style="display: block; margin: 0 auto 16px;">
                                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">You're on the list.</h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 24px 32px;">
                                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                                                Thanks for signing up for the CloakID Android waitlist. We'll email you the day the Android build ships — no spam in between.
                                            </p>
                                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                                                <strong style="color: #0f172a;">Have an iPhone or iPad?</strong> CloakID is live on the App Store today — no need to wait.
                                            </p>
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" style="padding: 8px 0 8px;">
                                                        <a href="${APP_STORE_URL}" style="display: inline-block; text-decoration: none;">
                                                            <img src="https://cloakid.app/images/app-store-badge-black@2x.png" alt="Download on the App Store" width="156" height="52" style="display: block; border: 0; outline: none; text-decoration: none;">
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 0 32px;">
                                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 24px 32px 32px; text-align: center;">
                                            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">
                                                Didn't sign up? You can safely ignore this email.
                                            </p>
                                            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                                                © ${new Date().getFullYear()} Niobium LLC · <a href="https://cloakid.app" style="color: #1ba3c6; text-decoration: none;">cloakid.app</a>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        });

        // Team notification — real-time visibility into LinkedIn conversion during launch window.
        // If volume spikes, comment out this single Resend call.
        await resend.emails.send({
            from: 'CloakID <noreply@cloakid.app>',
            to: 'support@cloakid.app',
            subject: 'New Android Waitlist Signup',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
                    <h2 style="color: #0f172a;">New Android Waitlist Signup</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        <strong>Email:</strong> ${email}<br>
                        <strong>Source:</strong> ${normalizedSource}<br>
                        <strong>Time:</strong> ${new Date().toISOString()}<br>
                        <strong>IP:</strong> ${clientIP}<br>
                        <strong>reCAPTCHA Score:</strong> ${recaptchaResult.score ?? 'N/A'}
                    </p>
                </div>
            `
        });

        return res.status(200).json({ success: true, message: "You're on the list" });

    } catch (error) {
        console.error('Android waitlist error:', error);
        return res.status(500).json({ error: 'Failed to process signup' });
    }
};
