import express from 'express';
import CampGround from '../models/campgrounds.js';
import appConfig from '../config/appConfig.js';
import Review from '../models/reviews.js';



const apiRouter = express.Router();





apiRouter.get('/campgrounds', async function (req, res, next) {

    try {
        /**
         * total count of campgrounds
         */
        let totalCamps = await CampGround.countDocuments({});

        /**
         * Count of campgrounds per page
         */
        const perPage = appConfig.campgroundsPaginationCount;

        /**
         * Requested page #
         */
        const page = (parseInt(req.query.page) || 1); // default to page 1 if a page is not provided

        let campgrounds;

        if (req.query.q) {
            campgrounds = await CampGround.find(
                { $text: { $search: req.query.q } },
                { score: { $meta: "textScore" } } // Optional: gets a relevance score
            )
                .sort({ score: { $meta: "textScore" } }) // Sorts by best match
                .skip(perPage * (page - 1))
                .limit(perPage);

            totalCamps = await CampGround.countDocuments(
                { $text: { $search: req.query.q } },
                { score: { $meta: "textScore" } } // Optional: gets a relevance score
            );

        }
        else {
            totalCamps = await CampGround.countDocuments({});
            campgrounds = await CampGround.find({}).skip(perPage * (page - 1)).limit(perPage);
        }

        return res.json({
            metadata: {
                totalCount: totalCamps,
                page: page,
                perPage: perPage,
                totalPages: Math.ceil(totalCamps / perPage),
            },
            data: campgrounds,
        });

    } catch (e) {
        res.status(500).json({
            error: `Failed to fetch campgrounds: ${e.message}`,
        });
    }
});


apiRouter.get('/campgrounds/:id/reviews', async function (req, res, next) {
    try {

        const campId = req.params.id;

        if (!campId) {
            throw new Error('Invalid CampID');
        }

        /**
         * Campground found
         */
        const campgroundFound = await CampGround.findById(campId);

        if (!campgroundFound) {
            throw new Error('Campground not found');
        }

        /**
         * Count of campgrounds per page
         */
        const perPage = appConfig.reviewsPaginationCount;

        /**
         * Requested page #
         */
        const page = (parseInt(req.query.page) || 1); // default to page 1 if a page is not provided

        const totalReviews = await Review.countDocuments({ campground: campgroundFound._id });


        const reviews = await Review.find({ campground: campgroundFound._id })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate('userId', 'displayName');

        const reviewsJSON = [];

        for (let index = 0; index < reviews.length; index++) {
            const review = reviews[index];
            const { campground, comment, rating, _id } = review;


            let displayName = 'User Not Found', userId = 'User Not Found';

            if (review.userId) {
                displayName = review.userId.displayName;
                userId = review.userId._id;
            }

            let isOwner = review.isUserOwner(req.user);

            reviewsJSON.push({
                campgroundId: campground, comment, rating, reviewId: _id, displayName, isOwner
            });

        }


        return res.json({
            metadata: {
                totalCount: totalReviews,
                page: page,
                perPage: perPage,
                totalPages: Math.ceil(totalReviews / perPage),
            },
            data: reviewsJSON,
        });

    } catch (e) {
        res.status(500).json({
            error: `Failed to fetch reviews: ${e.message}`,
        });
    }
});







export default apiRouter;