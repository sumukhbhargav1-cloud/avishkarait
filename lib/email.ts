import { Resend } from 'resend';
import { supabaseAdmin, isLiveSupabaseConfigured } from './supabase-admin';
import fs from 'fs';
import path from 'path';

const resendApiKey = process.env.RESEND_API_KEY || '';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@institution.edu.in';

export const isResendLive = Boolean(resendApiKey) && !resendApiKey.includes('placeholder');
const resend = isResendLive ? new Resend(resendApiKey) : null;

// Log email delivery helper
async function logEmailDelivery(params: {
  teamId?: string;
  recipientEmail: string;
  emailType: 'ADMIN_NOTIFICATION' | 'PAYMENT_CONFIRMATION' | 'SYSTEM_NOTIFICATION';
  deliveryStatus: 'SENT' | 'FAILED' | 'PENDING';
  providerMessageId?: string;
  failureReason?: string;
}) {
  const { teamId, recipientEmail, emailType, deliveryStatus, providerMessageId, failureReason } = params;

  if (isLiveSupabaseConfigured && supabaseAdmin) {
    try {
      await (supabaseAdmin.from('email_logs') as any).insert({
        team_id: teamId || null,
        recipient_email: recipientEmail,
        email_type: emailType,
        delivery_status: deliveryStatus,
        provider_message_id: providerMessageId || null,
        failure_reason: failureReason || null,
      });
      return;
    } catch (err) {
      console.error('Failed to write email log to Supabase:', err);
    }
  }

  // Local fallback logging
  try {
    const dataDir = path.join(process.cwd(), '.data');
    const dataFile = path.join(dataDir, 'db.json');
    if (fs.existsSync(dataFile)) {
      const db = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      db.email_logs = db.email_logs || [];
      db.email_logs.push({
        id: `email_${Date.now()}`,
        team_id: teamId || null,
        recipient_email: recipientEmail,
        email_type: emailType,
        delivery_status: deliveryStatus,
        provider_message_id: providerMessageId || null,
        failure_reason: failureReason || null,
        sent_at: new Date().toISOString(),
      });
      fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to log email locally:', err);
  }
}

// 9.1 Send New Registration Notification to Admin
export async function sendAdminRegistrationNotification(params: {
  teamId: string;
  teamUid: string;
  teamName: string;
  eventDomain: string;
  collegeName: string;
  teamLead: {
    fullName: string;
    email: string;
    phone: string;
  };
  participants: Array<{
    fullName: string;
    email: string;
    phone: string;
  }>;
  registrationTimestamp: string;
  paymentStatus: string;
}) {
  const {
    teamId,
    teamUid,
    teamName,
    eventDomain,
    collegeName,
    teamLead,
    participants,
    registrationTimestamp,
    paymentStatus,
  } = params;

  const subject = `New Hackathon Team Registration – ${teamUid}`;

  const participantsListHtml = participants.length
    ? participants
        .map(
          (p, i) =>
            `<tr style="border-bottom: 1px solid #E8EAED;">
              <td style="padding: 10px; font-weight: bold; color: #171717;">Member ${i + 1}</td>
              <td style="padding: 10px; color: #171717;">${p.fullName}</td>
              <td style="padding: 10px; color: #171717;">${p.email}</td>
              <td style="padding: 10px; color: #171717;">${p.phone}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="4" style="padding: 10px; color: #171717;">No additional members</td></tr>';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFFFFF; color: #171717; margin: 0; padding: 24px; }
          .container { max-width: 650px; margin: 0 auto; border: 1px solid #E8EAED; }
          .header { background-color: #171717; color: #FFFFFF; padding: 24px; border-bottom: 4px solid #D71935; }
          .content { padding: 24px; background-color: #FFFFFF; }
          .badge { display: inline-block; background-color: #D71935; color: #FFFFFF; padding: 6px 14px; font-weight: bold; font-size: 14px; letter-spacing: 0.5px; }
          .info-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; font-size: 14px; }
          .info-table td { padding: 10px; border-bottom: 1px solid #E8EAED; }
          .label { width: 35%; font-weight: bold; color: #171717; background-color: #FFFFFF; }
          .footer { background-color: #171717; color: #FFFFFF; padding: 16px 24px; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">New Team Registration Received</h2>
            <p style="margin: 6px 0 0; font-size: 13px; color: #E8EAED;">Administrative Event Notification</p>
          </div>
          <div class="content">
            <p><span class="badge">TEAM ID: ${teamUid}</span></p>
            <table class="info-table">
              <tr><td class="label">Event Domain</td><td><strong>${eventDomain}</strong></td></tr>
              <tr><td class="label">Team Name</td><td><strong>${teamName}</strong></td></tr>
              <tr><td class="label">College Name</td><td>${collegeName}</td></tr>
              <tr><td class="label">Team Lead</td><td>${teamLead.fullName} (${teamLead.email}, ${teamLead.phone})</td></tr>
              <tr><td class="label">Registration Time</td><td>${registrationTimestamp}</td></tr>
              <tr><td class="label">Payment Status</td><td><strong style="color: #D71935;">${paymentStatus}</strong></td></tr>
            </table>

            <h3 style="font-size: 16px; margin-top: 24px; margin-bottom: 12px; color: #171717; border-bottom: 2px solid #171717; padding-bottom: 6px;">Team Members</h3>
            <table class="info-table" style="border: 1px solid #E8EAED;">
              <thead>
                <tr style="background-color: #E8EAED; text-align: left;">
                  <th style="padding: 10px;">Role</th>
                  <th style="padding: 10px;">Full Name</th>
                  <th style="padding: 10px;">Email</th>
                  <th style="padding: 10px;">Contact</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #E8EAED;">
                  <td style="padding: 10px; font-weight: bold; color: #D71935;">Team Lead</td>
                  <td style="padding: 10px; color: #171717;">${teamLead.fullName}</td>
                  <td style="padding: 10px; color: #171717;">${teamLead.email}</td>
                  <td style="padding: 10px; color: #171717;">${teamLead.phone}</td>
                </tr>
                ${participantsListHtml}
              </tbody>
            </table>
          </div>
          <div class="footer">
            College Hackathon Platform | Automated Event Notification System
          </div>
        </div>
      </body>
    </html>
  `;

  if (isResendLive && resend) {
    try {
      const response = await resend.emails.send({
        from: 'Hackathon Admin <onboarding@resend.dev>',
        to: adminEmail,
        subject,
        html,
      });

      await logEmailDelivery({
        teamId,
        recipientEmail: adminEmail,
        emailType: 'ADMIN_NOTIFICATION',
        deliveryStatus: response.error ? 'FAILED' : 'SENT',
        providerMessageId: response.data?.id,
        failureReason: response.error?.message,
      });

      return { success: !response.error };
    } catch (err: any) {
      await logEmailDelivery({
        teamId,
        recipientEmail: adminEmail,
        emailType: 'ADMIN_NOTIFICATION',
        deliveryStatus: 'FAILED',
        failureReason: err.message,
      });
      return { success: false, error: err.message };
    }
  }

  // Local fallback logging
  await logEmailDelivery({
    teamId,
    recipientEmail: adminEmail,
    emailType: 'ADMIN_NOTIFICATION',
    deliveryStatus: 'SENT',
    providerMessageId: `mock_admin_${teamUid}`,
  });
  return { success: true };
}

// 9.2 Send Verified Payment Confirmation to Team Lead
export async function sendPaymentConfirmationEmail(params: {
  teamId: string;
  teamUid: string;
  teamName: string;
  eventDomain: string;
  collegeName: string;
  teamLead: {
    fullName: string;
    email: string;
  };
  participants: Array<{
    fullName: string;
  }>;
  amountPaid: number;
  transactionRef: string;
  paymentDate: string;
  hackathonName?: string;
}) {
  const {
    teamId,
    teamUid,
    teamName,
    eventDomain,
    collegeName,
    teamLead,
    participants,
    amountPaid,
    transactionRef,
    paymentDate,
    hackathonName = 'NATIONAL LEVEL HACKATHON 2K26',
  } = params;

  const subject = `Registration Payment Confirmed – ${teamUid}`;

  const membersHtml = [
    `<li><strong>Team Lead:</strong> ${teamLead.fullName}</li>`,
    ...participants.map((p, i) => `<li><strong>Member ${i + 1}:</strong> ${p.fullName}</li>`),
  ].join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFFFFF; color: #171717; margin: 0; padding: 24px; }
          .container { max-width: 650px; margin: 0 auto; border: 1px solid #E8EAED; }
          .header { background-color: #171717; color: #FFFFFF; padding: 28px; text-align: center; border-bottom: 4px solid #D71935; }
          .content { padding: 28px; background-color: #FFFFFF; }
          .badge { display: inline-block; background-color: #D71935; color: #FFFFFF; padding: 8px 18px; font-weight: bold; font-size: 16px; letter-spacing: 1px; }
          .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 24px; font-size: 14px; }
          .info-table td { padding: 12px; border-bottom: 1px solid #E8EAED; }
          .label { width: 40%; font-weight: bold; color: #171717; }
          .footer { background-color: #171717; color: #FFFFFF; padding: 20px; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; text-transform: uppercase;">${hackathonName}</h1>
            <p style="margin: 8px 0 0; font-size: 14px; color: #E8EAED;">Official Payment Confirmation & Team Pass</p>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${teamLead.fullName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6;">
              Your team registration and payment for <strong>${hackathonName}</strong> have been verified and confirmed.
              Please retain your official Team Registration ID for reporting at the hackathon arena.
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <span class="badge">OFFICIAL TEAM ID: ${teamUid}</span>
            </div>

            <table class="info-table">
              <tr><td class="label">Team Name</td><td><strong>${teamName}</strong></td></tr>
              <tr><td class="label">Event Domain</td><td>${eventDomain}</td></tr>
              <tr><td class="label">Institution / College</td><td>${collegeName}</td></tr>
              <tr><td class="label">Amount Paid</td><td><strong>₹${amountPaid.toLocaleString('en-IN')}/-</strong></td></tr>
              <tr><td class="label">Transaction Reference</td><td>${transactionRef}</td></tr>
              <tr><td class="label">Payment Date</td><td>${paymentDate}</td></tr>
              <tr><td class="label">Payment Status</td><td><strong style="color: #D71935;">SUCCESSFUL</strong></td></tr>
            </table>

            <h3 style="font-size: 15px; margin-top: 24px; margin-bottom: 10px; color: #171717;">Registered Team Members</h3>
            <ul style="font-size: 14px; line-height: 1.8; color: #171717; padding-left: 20px;">
              ${membersHtml}
            </ul>

            <div style="margin-top: 28px; padding: 16px; background-color: #E8EAED; border-left: 4px solid #171717; font-size: 13px; line-height: 1.6;">
              <strong>Important Instructions:</strong>
              <br>1. All team members must carry valid institutional identity cards on the event day.
              <br>2. Report to the venue registration desk 30 minutes before the opening keynote.
              <br>3. Present this Team ID for verification and kit issuance.
            </div>
          </div>
          <div class="footer">
            ${hackathonName} Organizing Committee | Official Electronic Receipt
          </div>
        </div>
      </body>
    </html>
  `;

  if (isResendLive && resend) {
    try {
      const response = await resend.emails.send({
        from: 'Hackathon Committee <onboarding@resend.dev>',
        to: teamLead.email,
        subject,
        html,
      });

      await logEmailDelivery({
        teamId,
        recipientEmail: teamLead.email,
        emailType: 'PAYMENT_CONFIRMATION',
        deliveryStatus: response.error ? 'FAILED' : 'SENT',
        providerMessageId: response.data?.id,
        failureReason: response.error?.message,
      });

      return { success: !response.error };
    } catch (err: any) {
      await logEmailDelivery({
        teamId,
        recipientEmail: teamLead.email,
        emailType: 'PAYMENT_CONFIRMATION',
        deliveryStatus: 'FAILED',
        failureReason: err.message,
      });
      return { success: false, error: err.message };
    }
  }

  // Local fallback logging
  await logEmailDelivery({
    teamId,
    recipientEmail: teamLead.email,
    emailType: 'PAYMENT_CONFIRMATION',
    deliveryStatus: 'SENT',
    providerMessageId: `mock_confirm_${teamUid}`,
  });
  return { success: true };
}
