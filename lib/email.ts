export async function sendWarningEmail(email: string, reason: string, strikes: number) {
    console.log(`[EMAIL SIMULATION] To: ${email}, Subject: Safety Warning - DoubtDesk, Message: Your post was flagged for: ${reason}. You have ${strikes}/3 strikes. Further violations will result in an automatic account block.`);
    
    // Placeholder for actual email service integration (e.g., Resend)
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Safety @ DoubtDesk <safety@doubtdesk.com>',
      to: email,
      subject: 'Safety Warning - DoubtDesk',
      html: `<p>Your post was flagged for: <strong>${reason}</strong>.</p>
             <p>This is strike <strong>${strikes}</strong> of 3.</p>
             <p>Further violations will result in an automatic account block.</p>`
    });
    */
}

/**
 * Simulates sending a blocking notification email.
 */
export async function sendBlockEmail(email: string, durationDays: number, totalBlocks: number) {
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + durationDays);

    console.log(`[EMAIL SIMULATION] To: ${email} | Subject: Account Temporarily Blocked`);
    console.log(`Body: Your account has been suspended for ${durationDays} days due to repeated safety violations. This is your block #${totalBlocks}. Your access will be restored on ${unlockDate.toDateString()}.`);
    
    // In production, integrate with Resend here.
}

/**
 * Sends a premium, responsive HTML email notification to the doubt author when a reply is posted.
 */
export async function sendReplyNotificationEmail(params: {
    toEmail: string;
    doubtId: number;
    doubtSubject: string;
    doubtContent: string;
    replierName: string;
    replyContent: string;
}) {
    const { toEmail, doubtId, doubtSubject, doubtContent, replierName, replyContent } = params;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const doubtLink = `${appUrl}`;
    const cleanDoubtContent = doubtContent.length > 100 ? `${doubtContent.slice(0, 97)}...` : doubtContent;
    const cleanReplyContent = replyContent.length > 180 ? `${replyContent.slice(0, 177)}...` : replyContent;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Solution Posted on DoubtDesk</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                background-color: #0f172a;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                color: #e2e8f0;
            }
            .wrapper {
                width: 100%;
                background-color: #0f172a;
                padding: 40px 20px;
                box-sizing: border-box;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            }
            .header {
                background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
                padding: 30px 40px;
                text-align: center;
                border-bottom: 1px solid #475569;
            }
            .logo {
                font-size: 24px;
                font-weight: 800;
                color: #f1f5f9;
                letter-spacing: 0.5px;
                margin: 0 0 10px 0;
            }
            .header-subtitle {
                font-size: 14px;
                color: #94a3b8;
                margin: 0;
            }
            .content {
                padding: 40px;
            }
            .greeting {
                font-size: 18px;
                font-weight: 600;
                color: #f8fafc;
                margin-top: 0;
                margin-bottom: 16px;
            }
            .message {
                font-size: 15px;
                line-height: 24px;
                color: #cbd5e1;
                margin-bottom: 24px;
            }
            .card {
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 30px;
            }
            .card-title {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #38bdf8;
                margin-top: 0;
                margin-bottom: 8px;
            }
            .card-body {
                font-size: 15px;
                line-height: 22px;
                color: #94a3b8;
                font-style: italic;
                margin-bottom: 20px;
                border-left: 3px solid #38bdf8;
                padding-left: 12px;
            }
            .reply-author {
                font-size: 14px;
                font-weight: 700;
                color: #f8fafc;
                margin-bottom: 8px;
            }
            .reply-preview {
                font-size: 15px;
                line-height: 24px;
                color: #cbd5e1;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 8px;
                padding: 16px;
                margin: 0;
            }
            .btn-container {
                text-align: center;
                margin-bottom: 30px;
            }
            .btn {
                display: inline-block;
                background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
                color: #ffffff !important;
                text-decoration: none;
                font-size: 15px;
                font-weight: 600;
                padding: 14px 32px;
                border-radius: 8px;
                box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);
                transition: all 0.2s ease-in-out;
            }
            .footer {
                background: #0f172a;
                padding: 24px 40px;
                text-align: center;
                font-size: 12px;
                color: #64748b;
                border-top: 1px solid #334155;
            }
            .footer a {
                color: #38bdf8;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <div class="logo">⚡ DoubtDesk</div>
                    <p class="header-subtitle">Your peer-to-peer classroom resolution platform</p>
                </div>
                <div class="content">
                    <h3 class="greeting">Hi there,</h3>
                    <p class="message">Great news! Someone has just posted a new response to your doubt regarding <strong>${doubtSubject}</strong>. Here are the details:</p>
                    
                    <div class="card">
                        <div class="card-title">Your Original Doubt</div>
                        <div class="card-body">"${cleanDoubtContent}"</div>
                        
                        <div class="card-title">New Response from ${replierName}</div>
                        <p class="reply-preview">"${cleanReplyContent}"</p>
                    </div>

                    <div class="btn-container">
                        <a href="${doubtLink}" class="btn">View Full Response</a>
                    </div>
                </div>
                <div class="footer">
                    <p>You received this email because you are registered on DoubtDesk.</p>
                    <p>Don't want to receive these emails? You can easily opt-out in your <a href="${appUrl}/profile">User Profile settings</a> anytime.</p>
                    <p>&copy; ${new Date().getFullYear()} DoubtDesk. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    console.log(`[EMAIL SIMULATION] Sending notification email to: ${toEmail}`);
    console.log(`Subject: New reply on your doubt: ${doubtSubject}`);
    console.log(`Body preview: ${cleanReplyContent}`);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === "re_your_actual_key_here") {
        console.log("[EMAIL SIMULATION] Skipping real delivery. Resend API Key is not configured.");
        return { success: true, simulated: true };
    }

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: "DoubtDesk <onboarding@resend.dev>",
                to: [toEmail],
                subject: `[DoubtDesk] New response on your doubt: ${doubtSubject}`,
                html: htmlContent
            })
        });

        if (res.ok) {
            console.log(`[EMAIL SUCCESS] Email successfully delivered to: ${toEmail}`);
            return { success: true, simulated: false };
        } else {
            const errText = await res.text();
            console.error(`[EMAIL ERROR] Resend API responded with status ${res.status}:`, errText);
            return { success: false, error: errText };
        }
    } catch (error: any) {
        console.error("[EMAIL ERROR] Failed to send email via Resend:", error);
        return { success: false, error: error?.message || error };
    }
}

