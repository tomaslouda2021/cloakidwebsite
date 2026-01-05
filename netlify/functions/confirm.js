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

async function updateRecordIntent(recordId, problemCategory, otherProblemText, painLevel) {
    const fields = {
        'Problem Category': problemCategory,
        'Pain Level': painLevel
    };

    if (otherProblemText) {
        fields['Other Problem Text'] = otherProblemText;
    }

    const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields })
        }
    );

    if (!response.ok) {
        throw new Error('Failed to update Airtable record');
    }

    return response.json();
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { token, problemCategory, otherProblemText, painLevel } = JSON.parse(event.body);

        if (!token) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Token is required' })
            };
        }

        if (!problemCategory || !painLevel) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Please complete all fields' })
            };
        }

        // Find record by token
        const record = await findRecordByToken(token);
        console.log('Record lookup result:', record ? 'found' : 'not found');

        if (!record) {
            console.log('No record found for token:', token);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid token' })
            };
        }

        console.log('Record status:', record.fields['Status']);

        // Verify the record is in verified status
        if (record.fields['Status'] !== 'verified') {
            console.log('Status check failed. Expected "verified", got:', record.fields['Status']);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Please verify your email first' })
            };
        }

        // Update record with intent data
        await updateRecordIntent(record.id, problemCategory, otherProblemText, painLevel);

        const email = record.fields['Email Address'];
        const whyCloakID = record.fields['Why CloakID'];

        // Send notification to team with complete application
        await resend.emails.send({
            from: 'CloakID <noreply@cloakid.app>',
            to: 'support@cloakid.app',
            subject: 'Beta Application Complete!',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
                    <h2 style="color: #0f172a;">Complete Beta Application</h2>
                    <p style="color: #00C853; font-weight: 600;">&#10003; Application complete - ready for review</p>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 15px;">
                        <p style="color: #4b5563; font-size: 16px; margin: 0;">
                            <strong>Email:</strong> ${email}<br><br>
                            <strong>Why CloakID:</strong> ${whyCloakID}<br><br>
                            <strong>Problem:</strong> ${problemCategory}${otherProblemText ? ` - ${otherProblemText}` : ''}<br><br>
                            <strong>Pain Level:</strong> ${painLevel}<br><br>
                            <strong>reCAPTCHA Score:</strong> ${record.fields['reCAPTCHA Score'] || 'N/A'}
                        </p>
                    </div>
                </div>
            `
        });

        console.log(`Application complete: ${email}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Confirmation error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process confirmation' })
        };
    }
};
