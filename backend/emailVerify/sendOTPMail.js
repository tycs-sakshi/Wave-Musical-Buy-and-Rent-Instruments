import nodemailer from 'nodemailer';
import 'dotenv/config'

export const sendOTPMail = async (otp, email) => {
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

        const mailConfigurations = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Password Reset Otp',
            html: `<p>Your OTP for Password Reset is :<b>${otp}</b></p>`,
        };

        const info = await transporter.sendMail(mailConfigurations);
        console.log('OTP Sent Successfully', info);
        return info;
    } catch (error) {
        console.error('Error sending OTP mail:', error);
        return null;
    }
}










