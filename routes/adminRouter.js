import express from 'express';
import User from '../models/user.js';
import Review from '../models/reviews.js';
import CampGround from '../models/campgrounds.js';
import appConfig from '../config/appConfig.js';
import Lockdown from '../models/lockdown.js'
import { isAdmin } from '../utils/ValidationUtils.js';



const adminRouter = express.Router();

async function setBanUser(banValue, user) {
    // Don't touch admins
    if (user.admin) {
        return;
    }

    // User is already banned or unbanned
    if (user.banned === banValue) {
        return;
    }

    user.banned = banValue;

    await user.save();

}

async function setBanUsers(banValue, users) {
    for (let index = 0; index < users.length; index++) {
        const userToSetBan = users[index];
        await setBanUser(banValue, userToSetBan);
    }
}


async function removeContentByUser(user) {
    // Don't touch admin content
    if (user.admin) {
        return;
    }

    const reviewsToRemove = await Review.find({ userId: user._id });

    for (let index = 0; index < reviewsToRemove.length; index++) {
        const review = reviewsToRemove[index];
        await review.deleteOne();
    }

    const campgroundsToRemove = await CampGround.find({ author: user._id });

    for (let index = 0; index < campgroundsToRemove.length; index++) {
        const campground = campgroundsToRemove[index];
        await campground.deleteOne();
    }

}


async function removeContentByUsers(users) {

    for (let index = 0; index < users.length; index++) {
        const user = users[index];
        await removeContentByUser(user);
    }
}



adminRouter.get('/', async (req, res, next) => {
    if (isAdmin(req) === false) {
        return next();
    }

    let users;

    const currentPage = req.query.p ? parseInt(req.query.p) : 1;

    let totalFound = 0;

    const perPageCount = appConfig.adminDashboardUsersPerPage;

    let currentQuery = '';

    if (req.query.q) {
        const query = req.query.q;
        currentQuery = query;
        const searchRegex = new RegExp(query, 'i'); // Make it case insensitive
        users = await User.find({
            $or: [
                { email: searchRegex },
                { displayName: searchRegex },
                { username: searchRegex },
            ],
        }).skip((currentPage - 1) * perPageCount).limit(perPageCount);

        totalFound = await User.countDocuments({
            $or: [
                { email: searchRegex },
                { displayName: searchRegex },
                { username: searchRegex },
            ],
        })

    }
    else {
        users = await User.find({}).skip((currentPage - 1) * perPageCount).limit(perPageCount);;

        totalFound = await User.countDocuments({});
    }

    const totalPages = Math.ceil(totalFound / perPageCount) || 1;

    res.render('admin/adminDashboard.ejs', { users, currentPage: currentPage, totalPages: totalPages, totalFound, currentQuery });
});


adminRouter.get('/lockdown', async (req, res, next) => {
    if (isAdmin(req) === false) {
        return next();
    }

    const { lockdown, msg, doc } = await Lockdown.isLockedDown();

    res.render('admin/adminLockdown.ejs', { lockdown, msg })
});

adminRouter.post('/lockdown', async (req, res, next) => {
    if (isAdmin(req) === false) {
        return next();
    }

    req.body.lockdown = req.body.lockdown === 'true';

    await Lockdown.setLockdownState(req, req.body.lockdown, req.body.msg);

    if (req.body.lockdown) {
        req.flash('success', `You've put the app on lockdown!`);
    }
    else {
        req.flash('success', `You've put the app off lockdown!`);
    }

    return res.redirect('/admin/lockdown');
});




adminRouter.get('/:userId', async (req, res, next) => {
    if (isAdmin(req) === false) {
        return next();
    }

    const { userId } = req.params;

    const inspectUser = await User.findById(userId);



    if (!inspectUser) {
        req.flash('error', 'User not found');
        return res.redirect('/admin');
    }


    const campgrounds = await CampGround.find({ author: userId });

    const reviews = await Review.find({ userId: userId }).populate('campground', 'title');

    res.render('admin/adminUserInspect', { inspectUser, campgrounds, reviews });

});


/**
 * POST response to take an admin action
 */
adminRouter.post('/action', async (req, res, next) => {
    if (isAdmin(req) === false) {
        return next();
    }

    const users = req.body.users || [];
    const action = req.body.action;

    const usersFound = await User.find({ _id: { $in: users } });
    if (action === 'BanRemoveContent') {
        await setBanUsers(true, usersFound);
        await removeContentByUsers(usersFound);

        req.flash('success', `Banned and Removed Content of ${users.length} Users`);
        return res.redirect('/admin');
    }
    else if (action === 'RemoveContent') {
        await removeContentByUsers(usersFound);

        req.flash('success', `Removed Content of ${users.length} Users`);
        return res.redirect('/admin');
    }
    else if (action === 'Ban') {
        await setBanUsers(true, usersFound);

        req.flash('success', `Banned ${users.length} Users`);
        return res.redirect('/admin');
    }
    else if (action === 'Unban') {
        await setBanUsers(false, usersFound);

        req.flash('success', `Unbanned ${users.length} Users`);
        return res.redirect('/admin');
    }

    req.flash('error', 'Invalid Action Selection');
    return res.redirect('/admin')

});






export default adminRouter;