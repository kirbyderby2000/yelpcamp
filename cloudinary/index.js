import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// 1. Initialize and configure the Cloudinary SDK using environment variables
// This authenticates your application with Cloudinary's servers.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


/**
 * Uploads a single file buffer to Cloudinary using Node.js streams.
 * @param {Buffer} buffer - The raw binary data of the file.
 * @param {Object} options - Optional configuration for Cloudinary (e.g., folder, transformation).
 * @returns {Promise} Resolves with the Cloudinary upload API result, or rejects with an error.
 */
function uploadBufferToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {

        // Create a Cloudinary upload stream that waits for data
        const uploadStream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error)
                    return reject(error); // If Cloudinary fails, reject the promise
                resolve(result); // If successful, resolve with Cloudinary's response data
            });

        // Convert the raw buffer into a readable stream, pipe (feed) it into 
        // Cloudinary's upload stream, and catch any pipeline errors.
        Readable.from([buffer]).pipe(uploadStream).on('error', reject);
    });
}

/**
 * Uploads an array of buffers concurrently using Promise.all.
 * @param {Buffer[]} buffers - Array of raw file buffers.
 * @param {Object} options - Optional configuration for Cloudinary.
 * @returns {Promise<Array>} Resolves with an array of Cloudinary API results.
 */
async function uploadBuffersToCloudinary(buffers, options = {}) {
    // Map each buffer to a pending upload promise
    const bufferPromises = buffers.map((buffer) => {
        return uploadBufferToCloudinary(buffer, options)
    });

    // Wait for all uploads to finish simultaneously and return the results
    return await Promise.all(bufferPromises);
}

/**
 * Handler for uploading multiple images from an Express request object (e.g., via Multer).
 * @param {Object} req - The Express request object, containing `req.files`.
 * @param {Object} options - Optional configuration for Cloudinary.
 */
async function uploadImagesToCloudinary(req, options = {}) {

    // If there are no files parsed, return nothing
    if (!req.files || req.files.length === 0) {
        return [];
    }

    // Extract the raw buffer from each uploaded file
    const buffers = req.files.map(file => file.buffer);
    // Upload all of them and wait for the results
    const image = await uploadBuffersToCloudinary(buffers, options);
    return image;
}

/**
 * Handler for uploading a single image from an Express request object (e.g., via Multer).
 * @param {Object} req - The Express request object, containing `req.file`.
 * @param {Object} options - Optional configuration for Cloudinary.
 */
async function uploadImageToCloudinary(req, options = {}) {

    if (!req.file) {
        return undefined;
    }


    // Extract the buffer from the single file and upload it
    const image = await uploadBufferToCloudinary(req.file.buffer, options);
    return image;
}


/**
 * Uploads all files in req.files to Cloudinary. Attaches the file data to req.cloudFiles.
 * @param {*} path where the files should be uploaded on cloudinary 
 */
function uploadImagesToCloudinaryMiddleware(folderPath = 'YelpCamp') {
    return async function (req, res, next) {

        const imageData = await uploadImagesToCloudinary(req, { folder: folderPath });


        req.cloudFiles = imageData;

        next();
    }
}

/**
 * Uploads the single file in req.file to Cloudinary. Attaches the file data to req.cloudFile.
 * @param {*} path where the file should be uploaded on cloudinary 
 */
function uploadImageToCloudinaryMiddleware(folderPath = 'YelpCamp') {
    return async function (req, res, next) {

        const imageData = await uploadImageToCloudinary(req, { folder: folderPath });


        req.cloudFile = imageData;

        next();
    }
}


/**
 * Deletes a file from Cloudinary
 * @param {*} the public_id of the file to delete 
 * @returns 
 */
async function deleteFileFromCloudinary(public_id) {
    return cloudinary.uploader.destroy(public_id);
}

/**
 * Deletes an array of files from Cloudinary
 * @param {*} Array of public_ids corresponding to the files to delete.
 * @returns 
 */
async function deleteFilesFromCloudinary(public_idArray) {

    return cloudinary.api.delete_resources(public_idArray);
}

// Export the primary handler functions for use in other parts of the app
export { uploadImagesToCloudinary, uploadImageToCloudinary, uploadImagesToCloudinaryMiddleware, uploadImageToCloudinaryMiddleware, deleteFileFromCloudinary, deleteFilesFromCloudinary }