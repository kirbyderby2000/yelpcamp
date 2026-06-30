import express from 'express';
import { banValidation, lockdownCheckMiddleware, requireAuthentication } from '../utils/Middleware.js';
import reviewsController from '../controllers/reviewsController.js';
import emailVerificationController from '../controllers/emailVerificationController.js';


// Routed at "/reviews"
const reviewsRouter = express.Router();


// Request used to create a campground review
reviewsRouter.post('/:campgroundId', requireAuthentication, banValidation, lockdownCheckMiddleware, emailVerificationController.checkIfUserIsVerifiedMiddleware, reviewsController.createReview);


// Request used to delete a review
reviewsRouter.delete('/:reviewId', requireAuthentication, banValidation, lockdownCheckMiddleware, reviewsController.deleteReview);



export default reviewsRouter;