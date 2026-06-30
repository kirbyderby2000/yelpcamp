// Run this script to seed the Yelpcamp database with data
import mongoose from "mongoose";
// Note, we NEED to append the "with {type:'json'}" at the end of the import
import data from './campgrounds.json' with {type: 'json'};
import CampGround from "../models/campgrounds.js";
import appConfig from "../config/appConfig.js";
import Review from "../models/reviews.js";

mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp')
    .then(async () => {

        await seedDatabase();

        await mongoose.disconnect();
        console.log('Disconnected from Database');

    })
    .catch((e) => {
        console.log('SEED: Error connecting to database!');
        console.log(e);
    });


/**
 * Clears the entire campground database
 */
async function clearDatabase() {
    await CampGround.deleteMany({});
    await Review.deleteMany({});
    console.log('SEED: DELETED DOCUMENTS');
}

/**
 * Configures seed entries so the author of campground and images are the same in the appConfig
 */
async function configureSeedData() {
    for (let index = 0; index < data.length; index++) {
        const campData = data[index];

        if (!campData.author) {
            campData.author = appConfig.seedConfig.seedUserId;
        }
        if (campData.images && Array.isArray(campData.images) && campData.images.length > 0) {
            for (let imgIndex = 0; imgIndex < campData.images.length; imgIndex++) {
                const campImg = campData.images[imgIndex];

                if (!campImg.author) {
                    campImg.author = appConfig.seedConfig.seedUserId;
                }
                if (!campImg.public_id) {
                    campImg.public_id = appConfig.seedConfig.seedImagesPublic_Id;
                }

            }
        }
    }
}

async function seedData() {
    try {
        configureSeedData();
        await CampGround.insertMany(data);
        console.log('SEED: INSERTED SEED DOCUMENTS');
    }
    catch (e) {
        console.log('SEED: ERROR SEEDING DATA INTO DATABASE: ', e);
    }
}


async function seedDatabase() {
    await clearDatabase();

    await seedData();
}



