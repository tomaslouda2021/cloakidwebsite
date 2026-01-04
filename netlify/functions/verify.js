const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appp5kjLRr0PCIhaC';
const AIRTABLE_TABLE_NAME = 'Signups';

async function findRecordByToken(token) {
    const filterFormula = encodeURIComponent(`{Verification Token} = "${token}"`);
    const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${filterFormula}`,
        {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to query Airtable');
    }

    const data = await response.json();
    return data.records[0] || null;
}

async function updateRecordStatus(recordId, status) {
    const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Status': status,
                    'Verified Date': new Date().toISOString().split('T')[0]
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error('Failed to update Airtable record');
    }

    return response.json();
}

exports.handler = async (event) => {
    const token = event.queryStringParameters?.token;

    if (!token) {
        return {
            statusCode: 302,
            headers: { Location: '/?error=missing_token' }
        };
    }

    try {
        // Find record by token
        const record = await findRecordByToken(token);

        if (!record) {
            console.log(`Invalid token: ${token}`);
            return {
                statusCode: 302,
                headers: { Location: '/?error=invalid_token' }
            };
        }

        // Check if already verified
        if (record.fields['Status'] === 'verified') {
            return {
                statusCode: 302,
                headers: { Location: `/confirm.html?token=${token}` }
            };
        }

        // Update status to verified
        await updateRecordStatus(record.id, 'verified');

        const email = record.fields['Email Address'];

        // Send notification to team that email was verified
        await resend.emails.send({
            from: 'CloakID <noreply@cloakid.app>',
            to: 'support@cloakid.app',
            subject: 'Beta Application Verified!',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
                    <h2 style="color: #0f172a;">Email Verified</h2>
                    <p style="color: #00C853; font-weight: 600;">✓ Email verified</p>
                    <p style="color: #4b5563; font-size: 16px;">
                        <strong>Email:</strong> ${email}<br>
                        <strong>Time:</strong> ${new Date().toISOString()}
                    </p>
                </div>
            `
        });

        console.log(`Verified: ${email}`);

        // Redirect to confirmation page
        return {
            statusCode: 302,
            headers: { Location: `/confirm.html?token=${token}` }
        };

    } catch (error) {
        console.error('Verification error:', error);
        return {
            statusCode: 302,
            headers: { Location: '/?error=verification_failed' }
        };
    }
};
