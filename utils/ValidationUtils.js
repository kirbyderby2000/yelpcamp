import CustomJoi from "./CustomJoi.js";
import ExpressError from "./ExpressError.js";

// This is how we create validation schemas in JOI
// We call JOI.object({}) and declare our validation schema inside of it
// JOI will then return a validation schema, 
const campgroundSchema = CustomJoi.object({
    title: CustomJoi.string().min(1).max(100).trim(true).escapeHTML().required(),
    price: CustomJoi.number().min(0).required(),
    location: CustomJoi.string().min(1).escapeHTML().required(),
    description: CustomJoi.string().escapeHTML().trim(true),
    images: CustomJoi.array(),
    deleteImg: CustomJoi.array(),
})


const reviewSchema = CustomJoi.object({
    rating: CustomJoi.number().min(1).max(5).required(),
    comment: CustomJoi.string().min(1).trim(true).required().escapeHTML(),
    userId: CustomJoi.any(), // This is not a user input field, it's something we retrieve from authentication validation middleware
    campground: CustomJoi.object().required(), // This is also not a user input field, this is a Mongoose Object ID
})


/**
 * Validates an object using the schema provided
 * @param {*} schema JOI Schema Object to test with
 * @param {*} objectTest The object to validate with the schema
 * @returns returns an error string if the validation fails. Otherwise it returns undefined if the schema passes
 */
function validateAgainstSchema(schema, objectTest) {
    if (!objectTest) {
        return 'Empty Object';
    }

    const { error, value } = schema.validate(objectTest);
    if (error) {
        console.log(error);
        console.log(value);
        return error;
    }
    return undefined;
}


/**
 * Validates a campground object against the campgrounds schema
 * @param {*} objectTest Object to test against the campground validation
 * @returns Returns an error string if validation fails. Otherwise returns undefined
 */
function validateCampgroundObjectSchema(objectTest) {
    return validateAgainstSchema(campgroundSchema, objectTest);
}

/**
 * Validates a review object against the reviews schema
 * @param {*} objectTest Object to test against the review validation
 * @returns Returns an error string if validation fails. Otherwise returns undefined
 */
function validateReviewObjectSchema(objectTest) {
    return validateAgainstSchema(reviewSchema, objectTest);
}

/**
 * Middleware that validates the request body for campground data
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const validateCampgroundMiddleware = function (req, res, next) {
    const { title, price, description, location } = req.body;

    const errMsg = validateCampgroundObjectSchema(req.body);
    if (errMsg) {
        throw new ExpressError(errMsg, 400);
    }
    else {
        next();
    }
}

/**
 * Checks if the logged in user is authorized to the campground passed
 * @param {The HTTP Request object} req 
 * @param {The Mongoose campground model object instance} campGroundObject 
 * @returns true or false
 */
const authorizedToCampground = function (req, campGroundObject) {
    if (!req.user) {
        return false;
    }
    if (req.user.admin) {
        return true;
    }
    // Note, when comparing Mongoose object documents, always use its "equals()" method to compare documents
    // If you compare two separate mongoose document objects in memory that link to the same ID, an === operator will fail.
    return campGroundObject.author.equals(req.user._id);
}


const stringSchema = CustomJoi.string().min(1).required();

/**
 * Validates if a given value is a string. Returns an error if the validation fails.
 * @param {*} val 
 * @returns 
 */
function validateIsString(val) {
    const { error } = stringSchema.validate(val);

    if (error) {
        return error;
    }

    return undefined;
}


/**
 * Returns true if the requesting user is an admin
 * @param {*} req 
 * @returns 
 */
function isAdmin(req) {
    if (req.isAuthenticated() === false) {
        return false;
    }
    if (!req.user) {
        return false;
    }

    return req.user.admin === true;
}



export {
    validateCampgroundObjectSchema,
    /**
     * Middleware that validates the request body for campground data
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    validateCampgroundMiddleware,

    validateReviewObjectSchema,

    authorizedToCampground,


    validateIsString,

    isAdmin,

}