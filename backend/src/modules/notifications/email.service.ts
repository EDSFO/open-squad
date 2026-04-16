import { resend, EMAIL_FROM } from '../../lib/mail'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Types
interface User {
  id: string
  email: string
  name: string | null
  locale?: string | null
}

interface Squad {
  id: string
  name: string
  description?: string | null
}

interface Execution {
  id: string
  squadId: string
  status: string
  output?: Record<string, unknown>
  completedAt?: string | null
}

// Email templates
function getWelcomeEmailHtml(user: User): { subject: string; html: string } {
  const name = user.name || 'there'
  return {
    subject: 'Welcome to Opensquad!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Opensquad</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #6366f1; margin: 0;">Opensquad</h1>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="margin-top: 0; color: #111;">Hi ${name},</h2>
    <p style="margin-bottom: 16px;">Welcome to Opensquad! We're excited to have you on board.</p>
    <p style="margin-bottom: 0;">You can now start exploring our marketplace and purchase squads to automate your workflows.</p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${FRONTEND_URL}/dashboard/marketplace" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Browse Marketplace</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

  <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
    If you have any questions, reply to this email or visit our support page.
  </p>
</body>
</html>
    `,
  }
}

function getPurchaseConfirmationHtml(user: User, squad: Squad): { subject: string; html: string } {
  const name = user.name || 'there'
  const squadName = squad.name || 'Squad'
  return {
    subject: `Purchase Confirmed: ${squadName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #6366f1; margin: 0;">Opensquad</h1>
  </div>

  <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid #86efac;">
    <h2 style="margin-top: 0; color: #166534;">Purchase Confirmed!</h2>
    <p style="margin-bottom: 16px;">Hi ${name},</p>
    <p style="margin-bottom: 0;">Your purchase of <strong>${squadName}</strong> has been confirmed.</p>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h3 style="margin-top: 0; color: #111;">What happens next?</h3>
    <ol style="margin-bottom: 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Go to your dashboard</li>
      <li style="margin-bottom: 8px;">Find your new squad under "Meus Squads"</li>
      <li style="margin-bottom: 8px;">Configure the inputs and run the squad</li>
    </ol>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${FRONTEND_URL}/dashboard/meus-squads" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View My Squads</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

  <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
    Thank you for your purchase!
  </p>
</body>
</html>
    `,
  }
}

function getExecutionCompleteHtml(user: User, execution: Execution, squad: Squad): { subject: string; html: string } {
  const name = user.name || 'there'
  const squadName = squad.name || 'Squad'
  const completedAt = execution.completedAt ? new Date(execution.completedAt).toLocaleString() : 'just now'
  return {
    subject: `Execution Complete: ${squadName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Execution Complete</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #6366f1; margin: 0;">Opensquad</h1>
  </div>

  <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid #86efac;">
    <h2 style="margin-top: 0; color: #166534;">Execution Complete!</h2>
    <p style="margin-bottom: 16px;">Hi ${name},</p>
    <p style="margin-bottom: 0;">Your squad <strong>${squadName}</strong> has finished executing.</p>
    <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">Completed at: ${completedAt}</p>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${FRONTEND_URL}/dashboard/meus-squads" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Results</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

  <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
    Check your dashboard for detailed execution results.
  </p>
</body>
</html>
    `,
  }
}

// Email sending functions - non-blocking
export async function sendWelcomeEmail(user: User): Promise<void> {
  try {
    const { subject, html } = getWelcomeEmailHtml(user)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject,
      html,
    })
    console.log(`Welcome email sent to ${user.email}`)
  } catch (error) {
    // Log error but don't fail the main operation
    console.error(`Failed to send welcome email to ${user.email}:`, error)
  }
}

export async function sendPurchaseConfirmationEmail(
  user: User,
  squad: Squad
): Promise<void> {
  try {
    const { subject, html } = getPurchaseConfirmationHtml(user, squad)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject,
      html,
    })
    console.log(`Purchase confirmation email sent to ${user.email}`)
  } catch (error) {
    // Log error but don't fail the main operation
    console.error(`Failed to send purchase confirmation email to ${user.email}:`, error)
  }
}

export async function sendExecutionCompleteEmail(
  user: User,
  execution: Execution,
  squad: Squad
): Promise<void> {
  try {
    const { subject, html } = getExecutionCompleteHtml(user, execution, squad)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject,
      html,
    })
    console.log(`Execution complete email sent to ${user.email}`)
  } catch (error) {
    // Log error but don't fail the main operation
    console.error(`Failed to send execution complete email to ${user.email}:`, error)
  }
}

// Fire-and-forget wrappers for non-blocking email sending
export function sendWelcomeEmailNonBlocking(user: User): void {
  // Fire and forget - don't await
  sendWelcomeEmail(user).catch((error) => {
    console.error(`Welcome email failed (non-blocking): ${error.message}`)
  })
}

export function sendPurchaseConfirmationEmailNonBlocking(
  user: User,
  squad: Squad
): void {
  // Fire and forget - don't await
  sendPurchaseConfirmationEmail(user, squad).catch((error) => {
    console.error(`Purchase confirmation email failed (non-blocking): ${error.message}`)
  })
}

export function sendExecutionCompleteEmailNonBlocking(
  user: User,
  execution: Execution,
  squad: Squad
): void {
  // Fire and forget - don't await
  sendExecutionCompleteEmail(user, execution, squad).catch((error) => {
    console.error(`Execution complete email failed (non-blocking): ${error.message}`)
  })
}
