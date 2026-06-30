import mongoose from "mongoose";


const Schema = mongoose.Schema;

let dummies = 0;

const reviewSchema = new Schema({
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
    },
    comment: {
        type: String,
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    campground: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Campground',
    }
});




reviewSchema.pre('deleteOne', async function (queryObj) {
    const filter = this.getFilter();
    const deletedReview = await this.model.findOne(filter);

    if (!deletedReview) {
        return;
    }
    // Note here we can reference the campground model simply by specifying the path
    // At this point, if this runs, Mongoose will have already cached the schema 
    // of 'Campground' at the specified path so we can just reference it here.
    const CampGround = mongoose.model('Campground');

    const editedCampground = await CampGround.findByIdAndUpdate(deletedReview.campground, {
        $pull: { reviews: deletedReview.id }
    }, {
        returnDocument: 'after',
    });
});

reviewSchema.methods.isUserOwner = function (userObject) {
    if (userObject) {
        if (userObject.admin) {
            return true;
        }
        return this.userId.equals(userObject._id);
    }
    return false;
}





const Review = mongoose.model('Review', reviewSchema);




export default Review;






