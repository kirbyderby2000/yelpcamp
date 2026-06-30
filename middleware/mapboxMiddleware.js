/**
 * Here's we're importing the MapBox Geocoding service
 * Refer to the Mapbox SDK Page: https://github.com/mapbox/mapbox-sdk-js
 */
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding.js';



const mapBoxToken = process.env.MAPBOX_TOKEN_PRIVATE_SERVER;

// Here's we're creating a geocoding client
/**
 * The MapBox Client for Geocoding Services
 * Refer to the MapBox SDK JS Docs for Geocoding Services Info: https://github.com/mapbox/mapbox-sdk-js/blob/314e747d3e43cd5299a9b255c0cadb60940d9435/docs/services.md#geocoding
 */
const geocodingClient = mbxGeocoding({
    accessToken: mapBoxToken,
});



/**
 * Middleware that will parse the req.body.location and forwardGeocode it
 * into a GeoJSON object into req.geometry.
 */
async function forwardGeocodeLocationMiddleware(req, res, next) {
    const { location } = req.body;

    if (!location) {
        return next(new Error('A location was not provided'));
    }

    // Tell our geocoding client to convert our location string into one result of potential locations
    // forwardGeocoding is the process of converting human-readable street address or place name into a corresponding geographic coordinates (longitude and latitude)

    let geoData;


    try {
        geoData = await geocodingClient.forwardGeocode({
            query: location,
            limit: 1,
        }).send();
    }
    catch (e) {
        if (!e.stack) {
            e.stack = new Error().stack;
        }
        e.message = 'MapBox Error: ' + e.message;
        return next(e);
    }


    if (!geoData || geoData.length === 0) {
        return next(new Error(`Could not find the location: ${location}`));
    }

    const feature = geoData.body.features[0];


    const geometry = feature.geometry;

    req.geometry = geometry;

    console.log(feature);

    console.log(geometry);

    next();
}



export { forwardGeocodeLocationMiddleware };