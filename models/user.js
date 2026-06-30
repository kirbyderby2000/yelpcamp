import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

const Schema = mongoose.Schema;

// Here we define our user schema, just adding the email address
const UserSchema = new Schema({
    email: {
        type: String,
        lowercase: true,
        required: true,
        unique: true, // <- This is not an actual validator, this just adds an index to the field. This only serves validation middleware purposes which we'll go over later
        // This will throw an error if we call "await Model.init()" to build any indexes in the field. 
        // Without doing this, we actually can create duplicate field values across documents
    },
    // Add these fields for Google OAuth
    googleId: {
        type: String,
        unique: true,
        sparse: true, // 'sparse' allows multiple documents to have 'null/undefined' for users who sign up locally!
    },
    displayName: {
        type: String,
        required: true,
    },
    /**
     * If the user has been onboarded after a Google OAuth
     */
    googleAuthOnboarded: {
        type: Boolean,
    },
    /**
     * If the user has had their email verified
     */
    emailVerified: {
        type: Boolean,
    },
    /**
     * If the user is an admin
     */
    admin: {
        type: Boolean,
        default: false,
    },
    /**
     * If the user is banned
     */
    banned: {
        type: Boolean,
        default: false,
    }

});

// Under the hood, this will add onto our schema a username, password, 
// and make sure the usernames are unique / not duplicated, and adds additional methods
UserSchema.plugin(passportLocalMongoose.default);

// Compile our schema into a model
const User = mongoose.model('User', UserSchema);

export default User;