import express, { response } from 'express';
import morgan from 'morgan';
import methodOverride from 'method-override';
import path from 'path';
import mongoose from 'mongoose';
import CampGround from './models/campgrounds.js';
// EJS Mate allows us to override the native EJS render engine
import ejsMate from 'ejs-mate';
import ExpressError from './utils/ExpressError.js';
import session from 'express-session';
import flash from 'connect-flash'
import passport from 'passport'; // import base passport allows us to plugin multiple strategies for authentication
import LocalStrategy from 'passport-local'; // import the passport local strategy plugin for use. This allows username + password authentication
import User from './models/user.js'; // Import our User schema with the passport-local-mongoose plugin already
import MongoStore from 'connect-mongo';

import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import campgroundsRouter from './routes/campgrounds.js';
import reviewsRouter from './routes/reviews.js';
import authenticationRoutes from './routes/authenticationRoutes.js';
import helmetSecurityMiddleware from './middleware/helmetSecurityMiddleware.js';
import usersController from './controllers/usersController.js';
import apiRouter from './routes/apiRouter.js';
import verifyEmailRouter from './routes/verifyEmailRouter.js';
import appConfig from './config/appConfig.js';
import resetPasswordRouter from './routes/resetPasswordRouter.js';
import adminRouter from './routes/adminRouter.js';


const __dirName = import.meta.dirname;

// init the app
const app = express();
const port = appConfig.port;


// Setup the EJS view engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirName, '/views'));

// Setup the middleware
app.use(morgan('tiny')); // See the GitHub page for format name options: https://github.com/expressjs/morgan#tiny
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirName, '/public')));
app.use(express.json());


app.use(helmetSecurityMiddleware());

/**
 * The mongoDB connection URL
 */
const mongoDbUrl = appConfig.mongoDbUrl;


// Here we're using "connect-mongo" to setup the Express datastore to use MongoDB
const store = MongoStore.create({
    mongoUrl: mongoDbUrl, // the mongoDB connect URL
    touchAfter: 24 * 60 * 60, // Update sessions once every 24 hours (saves database writes)
    // Here we're setting up our cryptography settings in our Mongo datastore,
    // namely the secret settings
    crypto: {
        secret: process.env.SESSION_SECRET,
    }
});

// Here we're subscribing to any error events thrown on the datastore
store.on('error', function (e) {
    console.log(`SESSION STORE ERROR: `, e);
});

// Setup the session cookie middleware
const sessionConfig = {
    // Here we're passing our connect-mongo object as our session datastore to leverage MongoDB
    store: store,
    name: 'lksjfowijflksafnc', // This is the name of the session cookie in the client-browser (not connect.sid which is the default express session cookie name)
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // in milliseconds
    }
};


if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
    // Settings cookie.secure = true ensures that session cookies can only be handled with clients connected through HTTPS
    // WE WANT THIS IN PRODUCTION!
    sessionConfig.cookie.secure = true;
}

// setup the express-session middleware to use sessions
app.use(session(sessionConfig));

// Setup the connect-flash (flash messaging) middleware
app.use((flash()));

// Setup core passport middleware initialization
app.use(passport.initialize());
// Setup Express Passport session middleware to use persistent login sessions. The alternative of this would be logging in on EVERY request.
// passport.session() need to come AFTER the base express-session middleware is setup
app.use(passport.session());
// With passport, we can add middleware to it to tell it what authentication strategies to use just like express can use different middleware
// Here's we're telling passport to use the local strategy, and the authentication method (provided from passport-local-mongoose)
passport.use(new LocalStrategy(User.authenticate()));

// Here we're setting up a GoogleStrategy middleware for logging in to Passport
passport.use(new GoogleStrategy(
    // Use the same config settings as the Google developer console
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/redirect',
    },
    // This is the callback that happens when the user successfully authenticates
    // The 
    async function (accessToken, refreshToken, profile, done) {
        try {
            // 1. Check if a user with this googleId already exists
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {

                const email = profile.emails[0].value.toLowerCase();

                // 3. Check if a user already exists with the given email address
                user = await User.findOne({ email: email });

                // If a user exists with that email address, prompt them to sign in using their username and password
                if (user) {

                    // If the user doesn't have a google account linked on their account, then just link it
                    if (!user.googleId && user.emailVerified === true) {
                        user.googleId = profile.id;
                        user.googleAuthOnboarded = true;
                        await user.save();
                        return done(null, user);
                    }

                    const returnError = new Error(`An account already exists with that email address: ${profile.emails[0].value}. Please validate your email address first and then link your Google Account.`);
                    return done(returnError, null);
                }


                // 4. If not, create a new user using Google's data
                user = new User({
                    googleId: profile.id,
                    username: profile.emails[0].value, // Local username becomes their email
                    email: email,
                    displayName: profile.emails[0].value,
                    googleAuthOnboarded: false,
                    emailVerified: true,
                });


                // If we're creating the seed user account, then explicitly set the user's object ID
                const seedUserEmail = appConfig.seedConfig.seedUserEmailAddress;

                if (email === seedUserEmail) {
                    const seedUserId = appConfig.seedConfig.seedUserId;
                    user._id = new mongoose.Types.ObjectId(seedUserId);
                }

                if (appConfig.adminEmailAddresses.includes(email)) {
                    user.admin = true;
                }

                // Save them to the database (without a password!)
                await user.save();
            }

            // 5. Pass the user to Passport
            /**
             * Upon receiving that user object from done(),
             * Passport immediately calls req.login() internally before passing control to your final controller function
             * (usersController.googleAuthenticationRedirect).
             */
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

// In this context, serialization refers to "how do we store users in the session", "how do we get users from the session"
// Add passport serialization / deserialization of our model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// Note: As a reminder, these static methods on User weren't defined by us, they were defined by the passport-local-mongoose package


// Make a reference assignment to our flashed "success" messages
app.use((req, res, next) => {
    // Now all of our render pages have access to this variable "success" array of string flash messages (if any)
    res.locals.success = req.flash('success');

    // Now all of our render pages have access to this variable "error" array of string flash messages (if any)
    res.locals.error = req.flash('error');

    res.locals.currentPage = '';


    // We can also setup the EJS template to have access to the user object deserialized from Passport session:
    res.locals.currentUser = req.user;

    next();
});


mongoose.connect(mongoDbUrl, {
    sanitizeFilter: true,
}).then((v) => {
    console.log("Database connected!");
}).catch((e) => {
    console.error("connection error");
});

// Export bootstrap distribution / compiled files
app.use('/bootstrap', express.static(path.join(__dirName, '/node_modules/bootstrap/dist/')));

// Export Mapbox-GL distribution / compiled files
app.use('/mapbox-gl', express.static(path.join(__dirName, '/node_modules/mapbox-gl/dist/')));

// Export starability files
app.use('/starability', express.static(path.join(__dirName, '/node_modules/starability/starability-minified/')));


app.use('/api', apiRouter);

app.post('/onboarding', usersController.googleOnboardingProcessing);

app.get('/onboarding', usersController.onboardingDisplay);

app.use('/verifyEmail', verifyEmailRouter);

app.use('/resetPassword', resetPasswordRouter);


app.use(usersController.checkForGoogleOnboardingRedirect);

// Setup the home page response
app.get('/', (req, res) => {
    res.render('home.ejs');
});

// Setup the about page response
app.get('/about', (req, res) => {
    res.render('about.ejs');
});

app.use('/admin', adminRouter);


app.use('/', authenticationRoutes);

// Setup the campgrounds router
app.use('/campgrounds', campgroundsRouter);


// Setup the reviews router
app.use('/reviews', reviewsRouter);



// Setup the 404 response. This will handle ALL types of HTTP verb requests
app.all('/{*path}', (req, res, next) => {
    next(new ExpressError('Page not found', 404));
});

// Error handling
app.use((err, req, res, next) => {
    let { status = 500, message = 'Something went wrong.', stack = '' } = err;

    if (process.env.NODE_ENV === 'production') {
        stack = '';
    }

    return res.status(status).render('error.ejs', { status, message, stack });
});





// Finally listen
app.listen(port, (err) => {
    console.log(`YelpCamp Initiated! Listening on port ${port}`);
});

app.use(express.static(path.join(__dirName, '/public')));