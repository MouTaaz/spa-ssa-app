import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// ========================================
// EMAIL SERVICE
// ========================================

/**
 * Service class for handling SMTP email notifications
 */
export class EmailService {
  private smtpHost: string;
  private smtpPort: number;
  private smtpUsername: string;
  private smtpPassword: string;
  private smtpFromAddress: string;

  constructor() {
    this.smtpHost = Deno.env.get("SMTP_HOST") ?? "";
    this.smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
    this.smtpUsername = Deno.env.get("SMTP_USER") ?? "";
    this.smtpPassword = Deno.env.get("SMTP_PASS") ?? "";
    this.smtpFromAddress = Deno.env.get("SMTP_FROM") ?? "notifications@yourapp.com";

    console.log("🔍 DEBUG: SMTP Environment Variables");
    console.log("SMTP_HOST:", this.smtpHost || "***NOT SET***");
    console.log("SMTP_PORT:", this.smtpPort);
    console.log("SMTP_USER:", this.smtpUsername || "***NOT SET***");
    console.log("SMTP_PASS:", this.smtpPassword ? "***SET***" : "***NOT SET***");
    console.log("SMTP_FROM:", this.smtpFromAddress);

    // Validate SMTP configuration
    if (!this.smtpHost || !this.smtpUsername || !this.smtpPassword) {
      console.warn("⚠️ SMTP configuration incomplete - email notifications disabled");
    } else {
      console.log("✅ Email service configured successfully");
    }
  }

  /**
   * Check if SMTP is properly configured
   */
  isConfigured(): boolean {
    return !!(this.smtpHost && this.smtpUsername && this.smtpPassword);
  }

  /**
   * Send an appointment notification email
   * @param recipientEmail - Email address of the recipient
   * @param emailSubject - Subject line of the email
   * @param htmlBody - HTML content of the email
   * @param textBody - Plain text fallback content
   * @returns Promise<boolean> - True if email was sent successfully
   */
  async sendAppointmentEmail(
    recipientEmail: string,
    emailSubject: string,
    htmlBody: string,
    textBody: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn("Email service not configured - skipping email notification");
      return false;
    }

    try {
      // Prepare email data structure
      const emailPayload = {
        to: recipientEmail,
        from: this.smtpFromAddress,
        subject: emailSubject,
        html: htmlBody,
        text: textBody,
      };

      // Send email via SMTP
      const sendResult = await this.sendViaSMTP(emailPayload);

      if (sendResult) {
        console.log(`✅ Email sent successfully to ${recipientEmail}`);
        return true;
      } else {
        console.error(`❌ Failed to send email to ${recipientEmail}`);
        return false;
      }
    } catch (error) {
      console.error(`Email service error for ${recipientEmail}:`, error);
      return false;
    }
  }

  /**
   * Send email via SMTP protocol
   * @param emailPayload - Email data containing to, from, subject, html, and text
   * @returns Promise<boolean> - True if SMTP send was successful
   */
  private async sendViaSMTP(emailPayload: any): Promise<boolean> {
    try {
      const smtpClient = new SmtpClient();

      // Establish SMTP connection with authentication
      await smtpClient.connect({
        hostname: this.smtpHost,
        port: this.smtpPort,
        tls: this.smtpPort === 465, // Use TLS for port 465, STARTTLS for others
        auth: {
          username: this.smtpUsername,
          password: this.smtpPassword,
        },
      });

      // Send the email with both HTML and text content
      await smtpClient.send({
        from: this.smtpFromAddress,
        to: emailPayload.to,
        subject: emailPayload.subject,
        content: emailPayload.text,
        html: emailPayload.html,
      });

      await smtpClient.close();

      console.log(`📧 Email sent successfully via SMTP to ${emailPayload.to}`);
      return true;
    } catch (error) {
      console.error("SMTP send error:", error);
      return false;
    }
  }

  /**
   * Generate HTML and text email templates for appointment notifications
   * @param appointmentData - Appointment object with customer and service details
   * @param actionType - Type of appointment action (booked, edited, cancelled, rescheduled)
   * @returns Object containing HTML and text versions of the email
   */
  generateAppointmentEmailHtml(appointmentData: any, actionType: string): { html: string; text: string } {
    // Map action types to user-friendly titles
    const actionTitleMap = {
      booked: "New Appointment Booked",
      edited: "Appointment Updated",
      cancelled: "Appointment Cancelled",
      rescheduled: "Appointment Rescheduled",
      reminder: "Appointment Reminder"
    };

    const emailTitle = actionTitleMap[actionType as keyof typeof actionTitleMap] || "Appointment Update";

    // Generate HTML email template
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emailTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .appointment-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; color: #475569; }
    .value { color: #1e293b; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
    .action-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emailTitle}</h1>
      <p>SSA Appointment Management System</p>
    </div>

    <div class="content">
      <div class="appointment-details">
        <div class="detail-row">
          <span class="label">Customer:</span>
          <span class="value">${appointmentData.customer_name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Service:</span>
          <span class="value">${appointmentData.service_name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date & Time:</span>
          <span class="value">${appointmentData.start_time ? new Date(appointmentData.start_time).toLocaleString() : 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Vehicle:</span>
          <span class="value">${appointmentData.vehicle_make_model || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Location:</span>
          <span class="value">${appointmentData.location || 'TBD'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Phone:</span>
          <span class="value">${appointmentData.customer_phone || 'N/A'}</span>
        </div>
        ${appointmentData.customer_notes ? `
        <div class="detail-row">
          <span class="label">Notes:</span>
          <span class="value">${appointmentData.customer_notes}</span>
        </div>
        ` : ''}
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${appointmentData.web_meeting_url || '#'}" class="action-button">View Appointment</a>
        ${appointmentData.customer_phone ? `<a href="tel:${appointmentData.customer_phone}" class="action-button">Call Customer</a>` : ''}
      </div>
    </div>

    <div class="footer">
      <p>This is an automated notification from your SSA Appointment Management System.</p>
      <p>Please check your dashboard for the latest appointment details.</p>
    </div>
  </div>
</body>
</html>`;

    // Generate plain text email template (fallback for HTML clients)
    const textTemplate = `
${emailTitle}

Customer: ${appointmentData.customer_name || 'N/A'}
Service: ${appointmentData.service_name || 'N/A'}
Date & Time: ${appointmentData.start_time ? new Date(appointmentData.start_time).toLocaleString() : 'N/A'}
Vehicle: ${appointmentData.vehicle_make_model || 'N/A'}
Location: ${appointmentData.location || 'TBD'}
Phone: ${appointmentData.customer_phone || 'N/A'}
${appointmentData.customer_notes ? `Notes: ${appointmentData.customer_notes}` : ''}

View appointment: ${appointmentData.web_meeting_url || 'Check your dashboard'}
${appointmentData.customer_phone ? `Call customer: ${appointmentData.customer_phone}` : ''}

This is an automated notification from your SSA Appointment Management System.
`;

    return { html: htmlTemplate, text: textTemplate };
  }
}