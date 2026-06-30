import express from 'express';
import CampGround from '../models/campgrounds.js';
import { validateCampgroundMiddleware } from '../utils/ValidationUtils.js';
import { banValidation, isOwnerOfCampground, lockdownCheckMiddleware, requireAuthentication } from '../utils/Middleware.js';
import campgroundController from '../controllers/campgroundController.js';
import multer from 'multer';
import path from 'path';
import { uploadImagesToCloudinary, uploadImagesToCloudinaryMiddleware, uploadImageToCloudinary } from '../cloudinary/index.js';
import { forwardGeocodeLocationMiddleware } from '../middleware/mapboxMiddleware.js';
import appConfig from '../config/appConfig.js';
import emailVerificationController from '../controllers/emailVerificationController.js';


const maxCountOfImages = appConfig.maxCountOfImageUploads;
const maxFileSize = appConfig.maxImageFileSizeMB;

// Here we define and configure our multer middleware, multer is a middleware plugin that allows us to easily
// parse out "multipart/form-data" form data into a request body. Note that forms using "multipart/form-data" encoding usually send binary file data.
const upload = multer({
    storage: multer.memoryStorage(), // Here we're telling multer to store data in memory, as opposed to writing data on local storage
    limits: {
        fileSize: maxFileSize * 1024 * 1024,  // Limit each image to X MB
    },
    fileFilter: (req, file, callback) => { // here we're telling multer to only allow image file types (jpeg, jpg, and png)
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png'
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new Error('Only JPG, JPEG, and PNG images are allowed.'));
        }
    }
});


// Routed at "/campgrounds"
const campgroundsRouter = express.Router();


// CRUD: Page with the form to create a campground
campgroundsRouter.get('/new',
    requireAuthentication,
    banValidation,
    lockdownCheckMiddleware,
    emailVerificationController.checkIfUserIsVerifiedMiddleware,
    (req, res) => {
        res.render('campgrounds/new.ejs', { currentPage: 'newCampground' });
    });


/**
 * Middleware for buffering multipart/form-data into memory and parsing file data
 * @param {*} maxCountOfImages Max count of images allowed to be buffered
 * @param {*} requireOne If at least one image file is required for uploading in this form
 * @returns 
 */
function uploadMulterImagesMiddleware(maxCountOfImages, requireOne = true) {
    // 1. Return a standard Express middleware function signature
    return (req, res, next) => {

        // 2. Pass req, res, and the callback into Multer
        upload.array('images', maxCountOfImages)(req, res, (err) => {
            // 3. Handle Multer limits or file type errors
            if (err) {
                console.log('Multer Error:', err.message);
                if (err.message === "File too large") {
                    err.message = `File is too large. Images can only be ${maxFileSize} MB or less.`;
                }
                return next(err); // <-- Pass the error to Express error handler
            }

            // 4. Handle validation errors
            if (requireOne) {
                if (!req.files || req.files.length === 0) {
                    return next(new Error('Please upload at least one image')); // <-- Pass custom error to Express
                }
            }


            // 5. Success! Everything is clear. Move to the next middleware or route handler.
            next();
        });
    };
}

// CRUD: Create a new campground
campgroundsRouter.post('/new',
    requireAuthentication,
    banValidation,
    lockdownCheckMiddleware,
    emailVerificationController.checkIfUserIsVerifiedMiddleware,
    uploadMulterImagesMiddleware(maxCountOfImages, false),
    validateCampgroundMiddleware,
    forwardGeocodeLocationMiddleware,
    uploadImagesToCloudinaryMiddleware('YelpCamp'),
    campgroundController.createCampground,
);


// CRUD: Index display of all campgrounds
campgroundsRouter.get('/', campgroundController.indexAllCampgrounds);


// CRUD: READ ONE - Page to show ONE campground
campgroundsRouter.get('/:campId', campgroundController.showOneCampground);


// CRUD: Page to display form to update a campground
campgroundsRouter.get('/:campId/edit', requireAuthentication, banValidation, lockdownCheckMiddleware, isOwnerOfCampground, campgroundController.showEditCampgroundPage);


// CRUD: UPDATE a campground
campgroundsRouter.patch('/:campId',
    requireAuthentication,
    banValidation,
    lockdownCheckMiddleware,
    emailVerificationController.checkIfUserIsVerifiedMiddleware,
    uploadMulterImagesMiddleware(maxCountOfImages, false),
    function (req, res, next) {
        const deleteImages = req.body.deleteImg;

        if (deleteImages && deleteImages.some(x => x === 'seed')) {
            req.flash('error', `You cannot delete seed image data. Please don't be a jerk.`)
            return res.redirect(req.originalUrl);
        }
        next();
    },
    validateCampgroundMiddleware,
    isOwnerOfCampground,
    uploadImagesToCloudinaryMiddleware('YelpCamp'),
    campgroundController.editCampground);


// CRUD: DELETE a YelpCamp campground
campgroundsRouter.delete('/:campId', requireAuthentication, banValidation, lockdownCheckMiddleware, isOwnerOfCampground, campgroundController.deleteCampground);





export default campgroundsRouter;