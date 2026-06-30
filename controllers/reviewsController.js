import mongoose from "mongoose";
import CampGround from "../models/campgrounds.js";
import Review from "../models/reviews.js";
import { validateReviewObjectSchema } from "../utils/ValidationUtils.js";
import ExpressError from "../utils/ExpressError.js";


const reviewsController = {}


/**
 * Creates a review with the authenticated user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
reviewsController.createReview = async function (req, res, next) {
    const { campgroundId } = req.params;
    if (!mongoose.isValidObjectId(campgroundId)) {
        return next(new ExpressError('Invalid Campground ID', 400));
    }
    const campground = await CampGround.findById(campgroundId);

    if (!campground) {
        return next(new ExpressError('Campground Not Found', 404));
    }

    const { rating, comment } = req.body;

    const userId = req.user._id;

    const newReview = new Review({
        rating,
        comment,
        userId,
        campground: campground._id,
    });

    const reviewSchemaTest = {
        rating: newReview.rating,
        comment: newReview.comment,
        userId: newReview.userId,
        campground: newReview.campground,
    }

    const err = validateReviewObjectSchema(reviewSchemaTest);

    if (err) {
        throw new ExpressError(err, 400);
    }
    campground.reviews.push(newReview);

    await campground.save();
    await newReview.save();

    req.flash('success', 'Successfully Created New Review!');
    res.redirect('/campgrounds/' + campground.id);


}

/**
 * Deletes the review if authorized
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
reviewsController.deleteReview = async function (req, res, next) {
    const { reviewId } = req.params;

    if (!mongoose.isValidObjectId(reviewId)) {
        return next(new ExpressError('Invalid Review Id', 400));
    }

    const review = await Review.findById(reviewId);

    if (!review) {
        return next(new ExpressError('Comment Not Found', 404));
    }

    const isOwner = review.isUserOwner(req.user);

    if (!isOwner) {
        req.flash('error', 'You are not authorized to delete that comment!');
        return res.redirect('/campgrounds/' + review.campground._id);
    }

    await review.deleteOne();

    req.flash('success', 'Review Successfully Deleted!');


    res.redirect('/campgrounds/' + review.campground);
}




export default reviewsController;