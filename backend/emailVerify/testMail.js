import 'dotenv/config'
import { verifyEmail } from './verifyEmail.js'
import { sendOTPMail } from './sendOTPMail.js'

const run = async () => {
  const testEmail = process.env.MAIL_USER
  if (!testEmail) {
    console.error('MAIL_USER not set in .env')
    process.exit(1)
  }

  console.log('Testing verifyEmail...')
  const res1 = await verifyEmail('TEST_TOKEN_123', testEmail)
  console.log('verifyEmail result:', res1)

  console.log('Testing sendOTPMail...')
  const res2 = await sendOTPMail('123456', testEmail)
  console.log('sendOTPMail result:', res2)
}

run().catch(err => {
  console.error('Test script error:', err)
})
