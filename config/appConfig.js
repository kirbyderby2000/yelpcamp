/**
 * General configuration settings for the YelpCamp project
 */
const appConfig = {

    /**
     * The port which this application runs
     */
    port: parseInt(process.env.PORT) || 3001,

    /**
     * This is the MongoDB connection URL
     */
    mongoDbUrl: process.env.MONGO_DB_ATLAS_URL || 'mongodb://127.0.0.1:27017/yelp-camp',

    /**
     * Production domain
     */
    prodDomain: 'https://yelpcampproject.com',

    /**
     * Developers domain
     */
    devDomain: 'http://localhost:3001',

    /**
     * URL link to the "No Image Avialable" cover
     */
    noImageLink: 'noImgLinkUrlHere',

    /**
     * Max filesize of images allows in MB
     */
    maxImageFileSizeMB: 5,

    /**
     * Max count of image uploads per campground creation / update
     */
    maxCountOfImageUploads: 5,

    /**
     * Count of campgrounds per page for campgrounds pagination
     */
    campgroundsPaginationCount: 5,

    /**
     * Count of reviews per page for reviews pagination
     */
    reviewsPaginationCount: 3,

    /**
     * Width of image thumbnails
     */
    imageThumbnailWidth: 300,

    /**
     * Campground cover image modifiers added to the Cloudinary URL
     */
    imageCoverModifiers: 'w_600,h_450,c_fill',

    /**
     * Options specific to the email verification process
     */
    emailVerificationOptions: {
        /**
         * The time interval (in hours) for measuring the max verification emails sent to a user.
         * For example: maxEmailTimeInterval = 24 hours & maxEmailsSentInInterval = 5, this means we cannot send more than 5 verification emails in 24 hours.
         */
        maxEmailTimeInterval: 24,
        /**
         * Max count of verification emails we can send to a user in the max time interval.
         * For example: maxEmailTimeInterval = 24 hours & maxEmailsSentInInterval = 5, this means we cannot send more than 5 verification emails in 24 hours.
         */
        maxEmailsSentInInterval: 5,
        /**
         * Verification token expiration time (in hours)
         */
        verificationTokenExpiration: 24,

    },
    /**
     * Options specific to the password reset process
     */
    passwordResetOptions: {
        /**
         * The time interval (in hours) for measuring the max password resets.
         * For example: maxResetsTimeInterval = 24 hours & maxResetsCount = 5, this means we cannot send more than 5 resets in 24 hours.
         */
        maxResetsTimeInterval: 24,
        /**
         * Max count of password resets we can send to a user in the max time interval.
         * For example: maxResetsTimeInterval = 24 hours & maxResetsCount = 5, this means we cannot send more than 5 resets in 24 hours.
         */
        maxResetsCount: 5,

        /**
         * Verification token expiration time (in hours)
         */
        resetExpiration: 24,

    },

    /**
     * Config options related to the execution of seeding data
     */
    seedConfig: {
        /**
         * The email address that will be linked to the user account of the seed data
         */
        seedUserEmailAddress: 'seed_data_user_email_address_here',

        /**
         * The injected user Object ID of the seed data account
         */
        seedUserId: '6a29f6e923d790e7f3b6631a',

        /**
         * Public_ID value for seed images that aren't allowed to be deleted.
         * Deleting seed images from Cloudinary would make the seed data useless on reseeds
         */
        seedImagesPublic_Id: 'seed',
    },
    /**
     * List of admin user account emails
     * User accounts created with emails in this list will be granted access to the admin dashboard
     */
    adminEmailAddresses: [
        'amin_user_email_address_here'
    ],
    /**
     * How many users are displayed per page on the admin dashboard
     */
    adminDashboardUsersPerPage: 50,
}


export default appConfig;