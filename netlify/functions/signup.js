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
            subject: "Verify your CloakID beta application",
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #0f172a; font-size: 28px; margin-bottom: 10px;">Verify Your Email</h1>
                        <p style="color: #64748b; font-size: 16px;">One more step to complete your application</p>
                    </div>

                    <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                            Thanks for your interest in CloakID! Please click the button below to verify your email and complete your beta application.
                        </p>
                        <div style="text-align: center; margin-top: 25px;">
                            <a href="${verificationUrl}" style="display: inline-block; background: #00C853; color: white; font-weight: 700; padding: 14px 32px; border-radius: 100px; text-decoration: none; font-size: 16px;">Verify Email</a>
                        </div>
                        <p style="color: #9ca3af; font-size: 14px; margin-top: 20px; text-align: center;">
                            This link expires in 24 hours.
                        </p>
                    </div>

                    <div style="text-align: center; color: #64748b; font-size: 14px;">
                        <p style="margin: 0;">If you didn't request this, you can ignore this email.</p>
                        <p style="margin: 10px 0 0 0;">Niobium LLC</p>
                    </div>
                </div>
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
