import { Resend } from "resend";
import nodemailer from 'nodemailer';



const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an email using the ethereal dummy client. ONLY USED FOR DEV TESTING
 * @param {*} targetEmailAddress 
 * @param {*} subject 
 * @param {*} emailBody 
 * @returns 
 */
async function sendEtherealEmail(targetEmailAddress, subject, emailBody) {
    // Create a fake test account on Ethereal.email automatically
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for port 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });

    // 3. Define the email options
    const mailOptions = {
        from: 'DEV TEST <noreply@mycoolapp.com>',
        to: targetEmailAddress, // Your personal Gmail address can stay here safely!
        subject: 'DEV TEST - ' + subject,
        html: emailBody,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("-----------------------------------------");
    console.log("Mock Email Sent!");
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    console.log("-----------------------------------------");

    return null;
}

/**
 * Sends an email using the authentic Resend client. USED IN PRODUCTION.
 * @param {*} targetEmailAddress 
 * @param {*} subject 
 * @param {*} emailBody 
 * @returns 
 */
async function sendResendEmail(targetEmailAddress, subject, emailBody) {
    try {
        await resend.emails.send({
            from: 'YelpCamp <noreply@yelpcampproject.com>',
            to: targetEmailAddress,
            subject: subject,
            html: emailBody,
        });
    } catch (error) {
        console.error("Failed to send email:", error);

        return error;
    }

    return null;
}


/**
 * Send a verification email to a user
 * @param {*} targetEmailAddress 
 * @param {*} verificationLink The verification URL to send them
 * @param {*} expirationTime In Hours
 * @returns 
 */
async function sendVerificationEmailToUser(targetEmailAddress, verificationLink, expirationTime) {

    const emailBody = `
        <h1>Welcome to YelpCamp!</h1>
        <p>Please click the link below to verify your email address and activate your account:</p>
        <a href="${verificationLink}" style="padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>This link will expire in ${expirationTime} hour${expirationTime === 1 ? '' : 's'}.</p>
        <p>Please do not respond to this email</p>
      `;
    const subject = 'YelpCamp - Verify your email address';


    // 1. Check if we are in development mode
    if (process.env.NODE_ENV !== 'production') {
        return await sendEtherealEmail(targetEmailAddress, subject, emailBody);
    }

    return await sendResendEmail(targetEmailAddress, subject, emailBody);
}

/**
 * Send a password reset email to a user
 * @param {*} username 
 * @param {*} targetEmailAddress 
 * @param {*} resetLink The reset URL to send them
 * @param {*} expirationTime In Hours
 * @returns 
 */
async function sendPasswordResetEmailToUser(username, targetEmailAddress, resetLink, expirationTime) {

    const emailBody = `
        <h1>YelpCamp - Reset Your Password</h1>
        <p>Greetings ${username.toUpperCase()}! Please click the link below to reset your password.</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">
          Reset Your Password
        </a>
        <p>This link will expire in ${expirationTime} hour${expirationTime === 1 ? '' : 's'}.</p>
        <p>Please do not respond to this email</p>
      `;

    const subject = 'YelpCamp - Reset your password';


    // 1. Check if we are in development mode
    if (process.env.NODE_ENV !== 'production') {
        return await sendEtherealEmail(targetEmailAddress, subject, emailBody);
    }

    return await sendResendEmail(targetEmailAddress, subject, emailBody);
}


export {
    sendVerificationEmailToUser,
    sendPasswordResetEmailToUser
}



