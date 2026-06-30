import VerificationTokens from "../models/verificationTokens.js";
import crypto from 'crypto';
import User from "../models/user.js";
import { sendVerificationEmailToUser } from "./emailController.js";
import appConfig from "../config/appConfig.js";
import { validateIsString } from "../utils/ValidationUtils.js";

const emailVerificationController = {};

/**
 * Checks the request object if the logged-in user requires an email verification
 * @param {*} req 
 * @returns
 */
function doesUserRequireEmailVerification(req) {
    if (req.isAuthenticated() && req.user && req.user.emailVerified === false) {
        return true;
    }
    return false;
}



/**
 * Middleware that will redirect the user to /verifyEmail if the user is required to verify their email
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
emailVerificationController.checkIfUserIsVerifiedMiddleware = function (req, res, next) {
    if (doesUserRequireEmailVerification(req)) {
        req.flash('error', 'You need to verify your email address to do that.');
        return res.redirect('/verifyEmail');
    }
    next();
}


/**
 * Router used to display the email verification required page
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
emailVerificationController.emailVerificationPromptDisplay = function (req, res, next) {

    if (req.isAuthenticated() && req.user && req.user.emailVerified === true) {
        req.flash('error', 'You do not need to verify your email.')
        return res.redirect('/campgrounds');
    }

    return res.render('users/verifyEmailPrompt.ejs');

}

/**
 * Route handler used to verify an email address via the link (/verifyEmail/:userId/:tokenId)
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
emailVerificationController.verifyEmailAddressLink = async function (req, res, next) {
    const { userId, tokenId } = req.params;

    const token = await VerificationTokens.findTokenByRawId(tokenId);

    if (!token) {
        req.flash('error', 'Verification link not found');
        return res.redirect('/verifyEmail');
    }

    if (token.expired) {
        req.flash('error', 'Your verification link expired. Please request a new one.');
        return res.redirect('/verifyEmail');
    }

    const user = await User.findById(userId);


    if (!user) {
        await token.deleteOne();
        req.flash('error', 'User not found');
        return res.redirect('/verifyEmail');
    }

    user.emailVerified = true;

    if (appConfig.adminEmailAddresses.includes(user.email)) {
        user.admin = true;
    }

    await user.save();

    await token.deleteOne();

    req.flash('success', `You've successfully verified your e-mail!`);
    return res.redirect('/campgrounds');

}

/**
 * Deletes email verification token entries for the given userId
 * @param {*} user 
 */
emailVerificationController.deleteVerificationTokensForUser = async function (user) {
    const deletedTokens = await VerificationTokens.deleteMany({ userId: user._id });
    console.log('Deleted Tokens for User', user._id);
    console.log(deletedTokens);
}

/**
 * Creates an email verification token for the given user. Returns it.
 * @param {*} user 
 * @returns 
 */
emailVerificationController.createVerificationTokenForUser = async function (user) {

    await emailVerificationController.deleteVerificationTokensForUser(user);

    const tokenData = VerificationTokens.createToken(user);

    return tokenData;
}

/**
 * Sends the user a verification email. Returns an error if one is encountered
 * @param {*} user 
 * @param {*} tokenData 
 */
emailVerificationController.sendVerificationEmail = async function (user, tokenData) {

    const email = user.email;

    let verificationURL = tokenData.tokenUrl;
    const expirationTimeInHours = tokenData.token.expirationTimeInHours;
    if (process.env.NODE_ENV === 'production') {
        verificationURL = appConfig.prodDomain + verificationURL;
    }
    else {
        verificationURL = appConfig.devDomain + verificationURL;
    }

    // send the email
    const err = await sendVerificationEmailToUser(email, verificationURL, expirationTimeInHours);

    // If an error was not thrown during email verification send,
    // then save the token
    if (!err) {
        await tokenData.token.save();
    }

    return err;
}

/**
 * Creates an email verification token for the given user, and then send them a verification email. Returns an error if an email is not sent.
 * @param {*} user 
 */
emailVerificationController.createVerificationTokenAndSendEmail = async function (user) {
    // create the token
    const tokenData = await emailVerificationController.createVerificationTokenForUser(user);
    // send the email
    const err = await emailVerificationController.sendVerificationEmail(user, tokenData);

    return err;
}


/**
 * Route handler used to resend a verification email
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
emailVerificationController.resendVerificationEmail = async function (req, res, next) {
    const { userId, email } = req.body;
    let user;

    if (userId) {
        const error = validateIsString(userId);
        if (error) {
            req.flash('error', 'Invalid userId');
            return res.redirect('/verifyEmail');
        }

        user = await User.findById(userId);
    }

    if (email) {
        const error = validateIsString(email);
        if (error) {
            req.flash('error', 'Invalid email address');
            return res.redirect('/verifyEmail');
        }

        user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (user && user.emailVerified === false) {

        const token = await VerificationTokens.findOne({ userId: user._id });

        if (!token) {

            const err = await emailVerificationController.createVerificationTokenAndSendEmail(user);

            if (err) {
                req.flash('error', 'There was an error sending your email: ' + err.message);
                return res.redirect('/verifyEmail');
            }

            req.flash('success', 'Your email verification was succesfully sent!');
            return res.redirect('/verifyEmail');
        }

        if (token.maxGenerated) {
            req.flash('error', `You've reached the max count of email verifications. Please try again in ${appConfig.emailVerificationOptions.maxEmailTimeInterval} hours`);
            return res.redirect('/verifyEmail');
        }

        const tokenData = token.refreshToken();

        const err = await emailVerificationController.sendVerificationEmail(user, tokenData);

        if (err) {
            req.flash('error', 'There was an error sending your email: ' + err.message);
            return res.redirect('/verifyEmail');
        }

        req.flash('success', 'Your email verification was succesfully sent!');
        return res.redirect('/verifyEmail');

    }

    req.flash('error', 'No Matching Users Requiring Validation Were Found');
    return res.redirect('/verifyEmail');
}



export default emailVerificationController;