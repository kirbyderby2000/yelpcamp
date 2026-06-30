import CampGround from "../models/campgrounds.js";
import mongoose from "mongoose";
import { authorizedToCampground } from "../utils/ValidationUtils.js";
import { deleteFilesFromCloudinary } from "../cloudinary/index.js";


/**
 * Controller object with route handler functions for controlling Campground resources
 */
const campgroundController = {};


/**
 * CRUD: POST - CREATE a campground
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
campgroundController.createCampground = async function (req, res, next) {
    const { title, price, description, location } = req.body;

    const author = req.user._id;


    const images = req.cloudFiles.map((img) => {
        return {
            url: img.secure_url,
            public_id: img.public_id,
            author: req.user._id,
        }
    });

    /**
     * Parsed geometry from MapBox middleware
     */
    const geometry = req.geometry;

    const newCampground = new CampGround({
        title,
        price,
        description,
        geometry,
        location,
        images,
        author,
    });

    await newCampground.save();

    req.flash('success', 'Successfully Made a New Campground!');

    return res.redirect('/campgrounds/' + newCampground._id);
}

/**
 * Returns an array of relevant location / geometry data for maps
 * @param {Array} campgroundsData  the relevant campground data
 */
function getClusterMapFeatureCollection(campgroundsData) {



    const data = campgroundsData.map(campground => {
        return {
            type: 'Feature',
            geometry: campground.geometry,
            properties: {
                id: campground._id,
                title: campground.title,
                location: campground.location,
            }
        }
    });

    const featureCollection = {
        type: 'FeatureCollection',
        features: data
    };


    return featureCollection;
}


/**
 * CRUD: READ ALL - Index page to display ALL campgrounds
 * @param {*} req 
 * @param {*} res 
 */
campgroundController.indexAllCampgrounds = async function (req, res) {

    let campgrounds;

    let titleHeader = 'All Campgrounds';

    if (req.query.q) {
        campgrounds = await CampGround.find(
            { $text: { $search: req.query.q } },
            { score: { $meta: "textScore" } } // Optional: gets a relevance score
        ).sort({ score: { $meta: "textScore" } }); // Sorts by best match

        const totalCamps = await CampGround.countDocuments(
            { $text: { $search: req.query.q } },
            { score: { $meta: "textScore" } } // Optional: gets a relevance score
        );

        titleHeader = `Found ${totalCamps} Result${totalCamps === 1 ? '' : 's'} Searching for: ${req.query.q}`;
    }
    else {
        campgrounds = await CampGround.find({});
    }


    const clusterMapData = getClusterMapFeatureCollection(campgrounds);

    const clusterMapDataJSON = JSON.stringify(clusterMapData);

    res.render('campgrounds/index.ejs', { campgrounds, clusterMapDataJSON, titleHeader, currentPage: 'campgrounds' });
}

/**
 * CRUD: READ ONE - Page to show ONE campground
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
campgroundController.showOneCampground = async function (req, res, next) {
    const { campId } = req.params;

    if (!mongoose.isValidObjectId(campId)) {
        req.flash('error', 'Campground Not Found');
        return res.redirect('/campgrounds');
    }

    // When we call populate() on a field, we can provide an object with settings {}, provide a path of the field we want to populate,
    // Then inside of that object, we can add nested populate to populate something in that field
    // We can also specify a "select" property and provide fields we want populated.
    const campFound = await CampGround.findById(campId).populate({
        path: 'reviews',
        populate: {
            path: 'userId',
            select: 'username displayName',
        }
    }).populate('author', 'username displayName');

    if (!campFound) {
        req.flash('error', 'Campground Not Found');
        return res.redirect('/campgrounds');
    }

    campFound.reviews.reverse();
    // Only display the edit button if authorized
    const displayEdit = authorizedToCampground(req, campFound);

    res.render('campgrounds/show.ejs', { campground: campFound, displayEdit });
}



/**
 * CRUD: Page to display form to update a campground
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
campgroundController.showEditCampgroundPage = async function (req, res, next) {
    const campground = req.campground;

    res.render('campgrounds/edit.ejs', { campground: campground });
}


/**
 * CRUD: UPDATE a campground
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
campgroundController.editCampground = async function (req, res, next) {
    const { title, price, description, location } = req.body;
    const campground = req.campground;

    try {


        Object.assign(campground, {
            title,
            price,
            description,
            location
        });

        if (req.cloudFiles) {
            req.cloudFiles.forEach(img => {

                const imgData = {
                    url: img.secure_url,
                    public_id: img.public_id,
                    author: req.user._id,
                }

                campground.images.push(imgData);
            });
        }

        // If the form has an array of images to delete, then remove all of them from Cloudinary
        const imagesToDelete = req.body.deleteImg;


        const campgroundImages = campground.images;

        if (imagesToDelete && imagesToDelete.length > 0) {

            campground.images = campground.images.filter(img => {
                return !imagesToDelete.includes(img.public_id);
            })

            await deleteFilesFromCloudinary(imagesToDelete);

        }


        // Note: calling .save() on a Mongoose object will automatically run validators
        // Run validators is only relevant in query updates because we bypass the schema system by default with queries.
        await campground.save();



        req.flash('success', 'Successfully Updated Campground');

        return res.redirect('/campgrounds/' + campground._id);
    }
    catch (e) {
        // The error object usually has at least the following properties
        // e.name - error name
        // e.message - human readable error message
        // e.stack - trace stack
        console.log('Error saving campground', e.message);
        return next(e);
        // res.status(400).send(e.message);
    }

}


/**
 * CRUD: DELETE a campground
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
campgroundController.deleteCampground = async function (req, res, next) {
    const campground = req.campground;

    try {

        // deleteOne() will delete this object
        await campground.deleteOne();


        req.flash('success', 'Successfully Deleted Campground: ' + campground.title);

        res.redirect('/campgrounds/');
    }
    catch (e) {
        res.send('An Error Occured: ' + e.message);
    }
}




export default campgroundController;