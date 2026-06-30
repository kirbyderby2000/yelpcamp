import PasswordResetTokens from '../models/passwordResetTokens.js';
import User from "../models/user.js";
import appConfig from "../config/appConfig.js";
import { validateIsString } from "../utils/ValidationUtils.js";
import { sendPasswordResetEmailToUser } from './emailController.js';
import mongoose from 'mongoose';

const resetPasswordController = {};

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
 * Router used to display the reset password page
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns 
 */
resetPasswordController.resetPasswordRequestDisplay = function (req, res, next) {
    const user = req.user;
    // Also check if the user is a GoogleOauth only account here
    if (req.isAuthenticated() && user && user.googleId && user.salt === undefined) {
        req.flash('error', 'You have no password to reset. You may only sign in with your Google account.');
        return res.redirect('/campgrounds');
    }

    return res.render('users/resetPasswordRequest.ejs');

}

/**
 * Route handler used to display a password reset form via the link (/resetPassword/:userId/:tokenId)
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
resetPasswordController.displayPasswordResetForm = async function (req, res, next) {
    const { userId, tokenId } = req.params;

    const token = await PasswordResetTokens.findTokenByRawId(tokenId);

    if (!token) {
        req.flash('error', 'Password reset link not found.');
        return res.redirect('/resetPassword');
    }

    if (token.expired) {
        req.flash('error', 'Your password reset link expired. Please request a new one.');
        return res.redirect('/resetPassword');
    }

    if (!mongoose.isValidObjectId(userId)) {
        req.flash('error', 'Invalid User ID');
        return res.redirect('/resetPassword');
    }

    const user = await User.findById(userId);


    if (!user) {
        await token.deleteOne();
        req.flash('error', 'User not found');
        return res.redirect('/resetPassword');
    }

    return res.render('users/resetPassword.ejs', { tokenId, userId });

}

/**
 * Deletes reset token entries for the given user
 * @param {*} user 
 */
resetPasswordController.deleteResetTokensForUser = async function (user) {
    const deletedTokens = await PasswordResetTokens.deleteMany({ userId: user._id });
    console.log('Deleted Tokens for User', user._id);
    console.log(deletedTokens);
}

/**
 * Creates an password reset token data for the given user. Returns it.
 * @param {*} user 
 * @returns 
 */
resetPasswordController.createResetTokenForUser = async function (user) {

    await resetPasswordController.deleteResetTokensForUser(user);

    const tokenData = PasswordResetTokens.createToken(user);

    return tokenData;
}

/**
 * Sends the user a verification email. Returns an error if one is encountered
 * @param {*} user 
 * @param {*} tokenData 
 */
resetPasswordController.sendPasswordResetEmail = async function (user, tokenData) {

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
    const err = await sendPasswordResetEmailToUser(user.username, email, verificationURL, expirationTimeInHours);

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
resetPasswordController.createResetTokenAndSendEmail = async function (user) {
    // create the token
    const tokenData = await resetPasswordController.createResetTokenForUser(user);
    // send the email
    const err = await resetPasswordController.sendPasswordResetEmail(user, tokenData);

    return err;
}


/**
 * Route handler used to for password reset requests
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
resetPasswordController.resetPasswordRequest = async function (req, res, next) {
    const { userId, email } = req.body;
    let user;

    if (userId) {
        const error = validateIsString(userId);
        if (error) {
            req.flash('error', 'Invalid User ID');
            return res.redirect('/resetPassword');
        }

        if (!mongoose.isValidObjectId(userId)) {
            req.flash('error', 'Invalid User ID');
            return res.redirect('/resetPassword');
        }

        user = await User.findById(userId);
    }

    if (email) {
        const error = validateIsString(email);
        if (error) {
            req.flash('error', 'Invalid email address');
            return res.redirect('/resetPassword');
        }

        user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (user) {

        if (user.emailVerified === false) {
            req.flash('error', 'You need to verify your email first.');
            return res.redirect('/verifyEmail');
        }
        // Also check if the user is a GoogleOauth only account here
        if (user.googleId && user.salt === undefined) {
            if (req.isAuthenticated()) {

                req.flash('error', 'You have no password to reset. You may only sign in with your Google account.');
                return res.redirect('/campgrounds');
            }
            req.flash('error', 'You cannot reset your password. Try signing in with your Google account instead.');

            return res.redirect('/login');
        }

        const token = await PasswordResetTokens.findOne({ userId: user._id });

        if (!token) {

            const err = await resetPasswordController.createResetTokenAndSendEmail(user);

            if (err) {
                req.flash('error', 'There was an error sending your email: ' + err.message);
                return res.redirect('/resetPassword');
            }

            req.flash('success', 'Your password reset link was sent to your email!');
            return res.redirect('/resetPassword');
        }

        if (token.maxGenerated) {
            req.flash('error', `You've reached the max count of password reset attempts. Please try again in ${appConfig.passwordResetOptions.maxResetsTimeInterval} hours`);
            return res.redirect('/resetPassword');
        }

        const tokenData = token.refreshToken();

        const err = await resetPasswordController.sendPasswordResetEmail(user, tokenData);

        if (err) {
            req.flash('error', 'There was an error sending your email: ' + err.message);
            return res.redirect('/resetPassword');
        }

        req.flash('success', 'Your password reset link was sent to your email!');
        return res.redirect('/resetPassword');

    }

    req.flash('error', 'No matching users found.');
    return res.redirect('/resetPassword');
}

/**
 * Actual password reset handler
 */
resetPasswordController.resetPassword = async function (req, res, next) {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        req.flash('error', 'Your passwords did not match.');
        return res.redirect(req.originalUrl);
    }

    if (!password) {
        req.flash('error', 'Please enter a valid password');
        return res.redirect(req.originalUrl);
    };

    if (validateIsString(password)) {
        req.flash('error', 'Please enter a valid password');
        return res.redirect(req.originalUrl);
    }




    const { userId, tokenId } = req.params;

    const token = await PasswordResetTokens.findTokenByRawId(tokenId);

    if (!token) {
        req.flash('error', 'Password reset link not found.');
        return res.redirect('/resetPassword');
    }

    if (token.expired) {
        req.flash('error', 'Your password reset link expired. Please request a new one.');
        return res.redirect('/resetPassword');
    }

    if (!mongoose.isValidObjectId(userId)) {
        req.flash('error', 'Invalid User ID');
        return res.redirect('/resetPassword');
    }

    const user = await User.findById(userId);


    if (!user) {
        await token.deleteOne();
        req.flash('error', 'User not found');
        return res.redirect('/resetPassword');
    }



    try {
        await user.setPassword(password);

        await user.save();

        await token.deleteOne();

        req.flash('success', 'Your password has been successfully reset.');

        return res.redirect('/login');
    }
    catch (e) {
        req.flash('error', `An Error Occurred: ${e.message}`);
        return res.redirect(req.originalUrl);
    }


    return res.render('users/resetPassword.ejs', { tokenId, userId });


}





export default resetPasswordController;