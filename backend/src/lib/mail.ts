import { Resend } from 'resend'

// Stub implementation - replace with actual Resend initialization when ready
const resendApiKey = process.env.RESEND_API_KEY || 're_placeholder'

export const resend = new Resend(resendApiKey)

export const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@opensquad.com'
