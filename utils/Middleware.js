import CampGround from "../models/campgrounds.js";
import mongoose from "mongoose";
import { authorizedToCampground, isAdmin } from "./ValidationUtils.js";
import Lockdown from "../models/lockdown.js";

/**
 * Middleware used to require the user to be authenticated to access a route. User is redirected to '/login' if the login fails
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const requireAuthentication = function (req, res, next) {
    if (req.isAuthenticated() === false) {

        // If the method is a GET request, then lets remember the URL the user was trying to visit
        // Store it in the session data
        if (req.method === 'GET') {
            const originalUrl = req.originalUrl;
            req.session.returnTo = originalUrl;
        }


        req.flash('error', 'You must be logged in first.');
        return res.redirect('/login?returnTo=true');
    }

    next();
}

/**
 * Validation check to redirect the user if their account has been banned
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const banValidation = function (req, res, next) {
    if (req.isAuthenticated() === false) {
        return;
    }
    if (req.user) {
        if (req.user.banned) {
            req.flash('error', `You're account has been suspended.`);
            return res.redirect('/campgrounds');
        }
    }
    next();
}


/**
 * Validates if the authenticated user is the owner of the campground link (:campId parameter).
 * This will also pass the campground document object instance into req.campground
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const isOwnerOfCampground = async function (req, res, next) {

    const { campId } = req.params;

    if (!mongoose.isValidObjectId(campId)) {
        req.flash('error', 'Campground Not Found');
        return res.redirect('/campgrounds');
    }

    const campFound = await CampGround.findById(campId);

    if (!campFound) {
        req.flash('error', 'Campground Not Found');
        return res.redirect('/campgrounds');
    }
    // Only show display update page if authorized
    if (!req.user) {
        req.flash('error', 'You are not authorized to do that. Please login first.');
        return res.redirect('/campgrounds/' + campFound._id);
    }

    const owner = authorizedToCampground(req, campFound);

    if (!owner) {
        req.flash('error', 'You are not the owner of this campground.');
        return res.redirect('/campgrounds/' + campFound._id);
    }

    req.campground = campFound;
    next();
}


/**
 * Will check the app for a lockdown state and revert to the campgrounds page if so
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function lockdownCheckMiddleware(req, res, next) {
    if (isAdmin(req)) {
        return next();
    }

    const { lockdown, msg } = await Lockdown.isLockedDown();

    if (lockdown) {
        req.flash('error', `Sorry, submissions are temporarily paused: ${msg}`);
        return res.redirect('/campgrounds');
    }
    return next();
}



export { requireAuthentication, isOwnerOfCampground, banValidation, lockdownCheckMiddleware };