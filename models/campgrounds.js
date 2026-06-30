import mongoose from 'mongoose';
import Review from './reviews.js';
import appConfig from '../config/appConfig.js';
import { deleteFilesFromCloudinary } from '../cloudinary/index.js';

const Schema = mongoose.Schema;


function modifyCloudinaryUrl(imageUrl, modifiers) {
    if (imageUrl.includes('/upload/')) {
        return imageUrl.replace('/upload/', `/upload/${modifiers}/`);
    }
    return imageUrl;
}

function resizeCloudinaryImgUrl(imageUrl, targetSize) {
    return modifyCloudinaryUrl(imageUrl, `w_${targetSize}`);
}

/**
 * We can defined schemas to be used within other schemas without explicitly making models of those sub-documents.
 * Here for example, we're using an image schema and passing it into our campgroundSchema. We don't need to make a model for images.
 */
const imageSchema = new Schema({
    url: {
        type: String,
        required: true,
    },
    public_id: {
        type: String,
        required: true,
    },
    author: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true,
    }
});



// We can declare virtual properties on the schema used in our main model
imageSchema.virtual('thumbnailUrl').get(function () {
    return resizeCloudinaryImgUrl(this.url, appConfig.imageThumbnailWidth);
});

/**
 * Here we're explicitly setting a schema for Geometry,
 * which is a GeoJSON format of data.
 */
const geometrySchema = new Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true,
    },
    coordinates: {
        type: [Number],
        required: true,
    }
});

const campGroundSchema = new Schema({
    title: {
        type: String,
        required: true,

    },
    price: {
        type: Number,
        required: true,
        min: [0, "Price must be $0 or more."],
    },
    description: {
        type: String,
    },
    geometry: {
        type: geometrySchema,
    },
    location: {
        type: String,
        required: true,
    },
    images: [imageSchema],
    author: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    reviews: [
        {
            // Schema types of ObjectId can be directed to a "ref" property which points to the collection Mongoose can find this in
            type: Schema.Types.ObjectId,
            ref: 'Review',
        }
    ]

},
    { // This schema option allows us to setup toJSON options on this schema
        toJSON: {
            virtuals: true, // This enabled global virtual inclusion on campground JSON objects
            // Use transform 
            transform: function (doc, ret) {
                // here we can delete or remove specific items
                // when a campground is converted into a JSON object
                // for example:
                // delete ret.author; // this would delete the author field from the JSON object
                return ret;
            }
        }
    });

// Create a compound text index on the fields we want to search later
campGroundSchema.index({ title: 'text', location: 'text', description: 'text' });

campGroundSchema.methods.truncateDescription = function (charLimit = 170) {
    let description = this.description;
    if (description.length > charLimit) {
        description = description.slice(0, charLimit) + "...";
    }

    return description;

}


campGroundSchema.virtual('coverImage').get(function () {

    return modifyCloudinaryUrl(this.firstImage, appConfig.imageCoverModifiers);
})


campGroundSchema.virtual('firstImage').get(function () {

    if (!this.images || this.images.length === 0) {
        return appConfig.noImageLink;
    }

    return this.images[0].url;
})

// middleware hook to delete linking comments when a campground is deleted
campGroundSchema.pre('deleteOne', async function (queryObj) {
    const filter = this.getFilter();

    const campground = await this.model.findOne(filter);

    if (!campground) {
        return;
    }

    const deletedReviews = await Review.deleteMany({ _id: { $in: campground.reviews } });

    console.log('Deleted Reviews for ' + campground.name);
    console.log(deletedReviews);

    const imagesToDelete = [];

    for (let index = 0; index < campground.images.length; index++) {
        const imageData = campground.images[index];
        if (imageData.public_id !== appConfig.seedConfig.seedImagesPublic_Id) {
            imagesToDelete.push(imageData.public_id);
        }
    }

    if (imagesToDelete.length > 0) {
        await deleteFilesFromCloudinary(imagesToDelete);
        console.log(`Deleted ${imagesToDelete.length} Images from Cloudinary `);
    }

});


campGroundSchema.virtual('descriptionTruncated').get(function () {
    return this.truncateDescription();
});



const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

campGroundSchema.virtual('priceUSD').get(function () {
    return currencyFormatter.format(this.price);
});


const CampGround = mongoose.model("Campground", campGroundSchema);




export default CampGround;