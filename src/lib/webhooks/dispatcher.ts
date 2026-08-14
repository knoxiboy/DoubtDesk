import crypto from 'crypto';

type WebhookPlatform = 'discord' | 'slack' | 'custom';

export interface WebhookPayload {
    event: string;
    data: any;
}

export async function dispatchWebhook(url: string, secret: string, platform: WebhookPlatform, payload: WebhookPayload) {
    let body: any;

    if (platform === 'discord') {
        body = {
            embeds: [{
                title: payload.event === 'doubt.created' ? 'New Doubt Posted' : payload.event === 'doubt.flagged' ? 'Doubt Flagged/Hidden' : 'Webhook Test',
                description: payload.data.content || 'Test notification from DoubtDesk.',
                color: payload.event === 'doubt.flagged' ? 15158332 : 5814783, // Red for flagged, Blurple for others
                url: payload.data.url || 'https://doubtdesk.com',
                fields: [
                    payload.data.subject ? { name: 'Subject', value: payload.data.subject, inline: true } : null,
                    payload.data.difficulty ? { name: 'Difficulty', value: payload.data.difficulty, inline: true } : null,
                ].filter(Boolean)
            }]
        };
    } else if (platform === 'slack') {
        body = {
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*${payload.event === 'doubt.created' ? 'New Doubt Posted' : payload.event === 'doubt.flagged' ? 'Doubt Flagged/Hidden' : 'Webhook Test'}*`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: payload.data.content || 'Test notification from DoubtDesk.'
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `Subject: ${payload.data.subject || 'N/A'} | Difficulty: ${payload.data.difficulty || 'N/A'}`
                        }
                    ]
                }
            ]
        };
    } else {
        body = payload;
    }

    const bodyString = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-DoubtDesk-Signature': signature
            },
            body: bodyString
        });

        if (!response.ok) {
            throw new Error(`Webhook delivered with non-2xx status: ${response.status}`);
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Webhook dispatch failed:", error);
        throw error;
    }
}
