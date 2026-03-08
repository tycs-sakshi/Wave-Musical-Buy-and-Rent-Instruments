import nodemailer from 'nodemailer';
import 'dotenv/config'

export const verifyEmail = async (token, email) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        try {
            await transporter.verify();
            console.log('Mail transporter verified');
        } catch (err) {
            console.error('Mail transporter verification failed:', err);
            return null;
        }
        

        const verifyLink = `http://localhost:5173/verify/${token}`;

        const mailConfigurations = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Verify Your Waves Musical Account',
            html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #f8fafc;
              padding: 20px;
            }
            .card {
              background: #ffffff;
              border: 1px solid #fcd34d;
              border-radius: 12px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            }
            .header {
              margin-bottom: 30px;
            }
            .logo-text {
              color: #0f172a;
              font-size: 28px;
              font-weight: bold;
              letter-spacing: 2px;
              margin-bottom: 10px;
            }
            .subheader {
              color: #0f172a;
              font-size: 24px;
              font-weight: 600;
              margin: 20px 0;
            }
            .message {
              color: #334155;
              font-size: 14px;
              line-height: 1.6;
              margin: 20px 0;
            }
            .verify-btn {
              display: inline-block;
              background: #0f172a;
              color: white;
              padding: 14px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 30px 0;
              transition: all 0.3s ease;
              box-shadow: 0 5px 14px rgba(15, 23, 42, 0.2);
            }
            .verify-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
            }
            .link-text {
              color: #64748b;
              font-size: 12px;
              margin-top: 20px;
              word-break: break-all;
            }
            .footer {
              color: #64748b;
              font-size: 12px;
              margin-top: 30px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            .highlight {
              color: #b45309;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo-text">WAVES MUSICAL</div>
              </div>
              
              <div class="subheader">Verify Your Journey</div>
              
              <p class="message">
                Hi <span class="highlight">${email.split('@')[0]}</span>,
              </p>
              <p class="message">
                Thank you for joining our boutique community. One small step stands between you and our handcrafted collections.
              </p>
              
              <a href="${verifyLink}" class="verify-btn">
                VERIFY MY ACCOUNT
              </a>
              
              <p class="message" style="font-size: 12px; color: #64748b;">
                If the button fails, use this link:<br>
                <span class="link-text">${verifyLink}</span>
              </p>
              
              <div class="footer">
                <p>This link expires in 10 minutes. If you didn't sign up for Waves Musical, you can safely ignore this email.</p>
                <p style="margin-top: 15px;">✨ Explore our collection of premium instruments ✨</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
        };

        const info = await transporter.sendMail(mailConfigurations);
        console.log('Email Sent Successfully', info);
        return info;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return null;
    }
}










