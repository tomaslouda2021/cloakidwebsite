const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appp5kjLRr0PCIhaC';
const AIRTABLE_TABLE_NAME = 'Signups';

async function addToAirtable(email) {
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
                    'Signup Date': new Date().toISOString().split('T')[0]
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

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        // Send welcome email to the user
        await resend.emails.send({
            from: 'CloakID <noreply@cloakid.app>',
            to: email,
            subject: "You're on the CloakID beta list!",
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #0f172a; font-size: 28px; margin-bottom: 10px;">Welcome to CloakID!</h1>
                        <p style="color: #64748b; font-size: 16px;">You're on the early access list</p>
                    </div>

                    <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                            Thanks for signing up for early access to CloakID - the professional identity management platform.
                        </p>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px; margin-bottom: 0;">
                            We'll notify you as soon as beta access is available. In the meantime, keep an eye on your inbox for updates.
                        </p>
                    </div>

                    <div style="text-align: center; color: #64748b; font-size: 14px;">
                        <p style="margin: 0;">Niobium LLC</p>
                        <p style="margin: 5px 0 0 0;">Questions? Reply to this email or contact support@cloakid.app</p>
                    </div>
                </div>
            `
        });

        // Send notification to the team
        await resend.emails.send({
            from: 'CloakID <noreply@cloakid.app>',
            to: 'support@cloakid.app',
            subject: 'New Beta Signup!',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
                    <h2 style="color: #0f172a;">New Beta Signup</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        <strong>Email:</strong> ${email}<br>
                        <strong>Time:</strong> ${new Date().toISOString()}
                    </p>
                </div>
            `
        });

        // Add to Airtable
        await addToAirtable(email);

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
