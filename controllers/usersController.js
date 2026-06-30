import passport from "passport";
import User from "../models/user.js";
import mongoose from "mongoose";
import emailVerificationController from "./emailVerificationController.js";
import appConfig from "../config/appConfig.js";


const usersController = {}


/**
 * Show the registration page
 */
usersController.showRegistrationPage = function (req, res, next) {
    if (req.isAuthenticated()) {
        req.flash('error', 'You are already logged in!');
        return res.redirect('/');
    }

    res.render('users/register.ejs');
}

/**
 * Registers a user
 */
usersController.registerUser = async function (req, res, next) {

    try {
        let { username, password, email } = req.body;

        if (!username || !password || !email) {
            req.flash('Please provide a valid username, password, or email.');
            return res.redirect('/register');
        }

        const displayName = username;

        username = username.toLowerCase();

        const user = new User({ email, username, displayName, emailVerified: false });

        // If we're creating the seed user account, then explicitly set the user's object ID
        const seedUserEmail = appConfig.seedConfig.seedUserEmailAddress;

        if (email === seedUserEmail) {
            const seedUserId = appConfig.seedConfig.seedUserId;
            user._id = new mongoose.Types.ObjectId(seedUserId);
        }

        // The User.register() method will create and return the registeredUser
        const registeredUser = await User.register(user, password);

        // Create a email verification token and send them that email
        await emailVerificationController.createVerificationTokenAndSendEmail(registeredUser);

        console.log(registeredUser);
        // However, by default the registered user won't be logged into the session
        // We can however use the req.login() method to login the newly registered user object into the session
        req.login(registeredUser, async (err) => {
            // Logging in could fail if possible here, so just handle it with the next error handler
            if (err) {
                return next(err);
            }
            // Otherwise we've successfully logged in!
            req.flash('success', 'You Successfully Registered! Please verify your email address.');
            req.session.user_id = registeredUser._id;
            res.redirect('/verifyEmail');
        });

    }
    catch (e) {

        if (e.message.includes('index: email_1 dup key:')) {
            e.message = 'A user with this e-mail already exists. Try resetting your password or logging in.';
        }

        req.flash('error', e.message);
        res.redirect('/register');
    }
}

/**
 * Display the login page
 */
usersController.showLoginPage = function (req, res, next) {

    if (req.isAuthenticated()) {
        req.flash('error', 'You are already logged in!');
        return res.redirect('/');
    }

    // Clear the returnTo url if we're not told to "returnTo"
    if (!req.query.returnTo) {
        req.session.returnTo = undefined;
    }

    res.render('users/login.ejs');
}

/**
 * Move the "returnTo" session variable into the request object.
 * When a user becomes authenticated, Passport clears the session automatically
 */
const storeReturnTo = function (req, res, next) {
    req.returnTo = req.session.returnTo;
    next();
}

const lowerCaseUsername = function (req, res, next) {
    if (req.body.username && typeof (req.body.username) === 'string') {
        req.body.username = req.body.username.toLowerCase();
    }
    next();
}


/**
 * Note the passport.authenticate() middleware we can pass into the route here.
 * We can tell passport to authenticate the request and specify options. If the user doesn't authenticate correctly, then it will redirect to the failure route.
 * Here we specify we want passport to authenticate using the 'local' strategy but we can specify more / different strategies
 * The options pass into it specify to flash an authentication failure if encountered, also where to redirect if an authentication failure is encountered
 * POST login request
 */
const passportAuthenticationMiddleware = passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' });

/**
 * Middleware to call after passport has authenticated
 */
const postAuthenticationMiddleware = (req, res, next) => {

    // If we reach THIS function middleware, then we know that the passport.authenticate() middleware passed and the user successfully authenticated

    req.flash('success', 'You Successfully Logged In!');

    // If there's a returnTo in the request, redirect to it. Otherwise, redirect to the homepage
    const redirectURL = req.returnTo || '/';

    delete req.session.returnTo;

    res.redirect(redirectURL);

}

/**
 * All user login authentication middleware we want executed in order
 */
usersController.login = [
    storeReturnTo, // first
    lowerCaseUsername, // second
    passportAuthenticationMiddleware, // third
    postAuthenticationMiddleware // fourth
];


/**
 * Middleware to log the user out
 */
usersController.logout = function (req, res, next) {
    if (req.isAuthenticated() === false) {
        req.flash('error', 'You are not logged in');
        return res.redirect('/');
    }

    // Logging out is just a matter of calling req.logout() on the request object. This is provided by Passport JS.
    req.logout((err) => {

        // The logout method has a callback method which passes an error if one is encountered.
        if (err) {
            req.flash('error', `An error was encountered: ${err.message}`);
            return res.redirect('/');
        }

        delete req.session.googleAuthOnboarded;

        // Otherwise, you just successfully logout

        req.flash('success', 'You Successfully Logged Out!');
        return res.redirect('/');
    });

}


/**
 * Send the user to Google to log in
 */
usersController.authenticateWithGoogle = passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account consent' // <-- Forces Google to ask for consent every time (You may remove this in production but might keep this)
});

const postGoogleAuthenticationMiddleware = (req, res, next) => {
    const user = req.user;
    if (user.googleAuthOnboarded === false) {
        console.log('NOT ONBOARDED');
        req.session.googleAuthOnboarded = false;
        return res.redirect('/onboarding');
    } else {
        postAuthenticationMiddleware(req, res, next);
    }
}


/**
 * The Google authentication route callback
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
usersController.googleAuthenticationRedirect = [
    // Save any "returnTo" context to the request before it's cleared post-authentication
    storeReturnTo,
    // authenticate with the Google strategy
    passport.authenticate('google', { failureFlash: true, failureRedirect: '/login' }),
    // then redirect them to the campgrounds homepage upon a successful login
    postGoogleAuthenticationMiddleware,
];



/**
 * Middleware used to check if a user needs to be redirected for onboarding after a Google Oauth login
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
usersController.onboardingDisplay = function (req, res, next) {

    if (req.session && req.session.googleAuthOnboarded === false) {
        return res.render('users/googleOnboarding.ejs');
    }
    else {
        if (req.session) {
            delete req.session.googleAuthOnboarded;
        }
        req.flash('error', 'You do not need to be onboarded');
        return res.redirect('/campgrounds');
    }
}


/**
 * Middleware used to redirect a user for onboarding if necessary after a Google Oauth login
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
usersController.checkForGoogleOnboardingRedirect = function (req, res, next) {
    const isLoggingOut = req.originalUrl === '/logout';
    const isOnboarding = req.path === '/onboarding';

    if (!isLoggingOut && !isOnboarding && req.session && req.session.googleAuthOnboarded === false) {
        return res.redirect('/onboarding');
    }
    next();
}


/**
 * Middleware to process google onboarding
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
usersController.googleOnboardingProcessing = async function (req, res, next) {

    if (req.isAuthenticated() === false) {
        req.flash('error', 'You do not need to be onboarded.');
        delete req.session.googleAuthOnboarded;
        return res.redirect('/campgrounds');
    }

    const displayName = req.body.displayName;

    if (!displayName) {
        req.flash('error', 'Please Enter a Valid Display Name');
        return res.redirect('/onboarding');
    }

    const user = req.user;

    if (!req.user || !req.user.googleId) {
        req.flash('error', 'An error occured. Please logout and try again.');
        return res.redirect('/onboarding');
    }

    console.log(req.user);

    const foundUser = await User.findById(req.user._id);

    if (foundUser.googleAuthOnboarded !== false) {
        req.flash('error', 'You do not need to be onboarded.');
        delete req.session.googleAuthOnboarded;
        return res.redirect('/campgrounds');
    }



    try {

        foundUser.displayName = displayName;
        foundUser.googleAuthOnboarded = true;

        await foundUser.save();

        delete req.session.googleAuthOnboarded;
    }
    catch (e) {
        req.flash('error', `An error occured. ${e.message}`);
        return res.redirect('/onboarding');
    }


    req.flash('success', `Your registration is complete!`);
    return res.redirect('/campgrounds');

}



export default usersController;