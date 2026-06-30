

const mapElement = document.querySelector('#map');


const geometryString = mapElement.getAttribute('data-geometry');
const token = mapElement.getAttribute('data-mapbox');
const mapLocation = mapElement.getAttribute('data-location');

const geometry = JSON.parse(geometryString);


const map = new mapboxgl.Map({
    accessToken: token, // associates the map with your Mapbox account and its permissions
    container: 'map', // container ID
    center: geometry.coordinates,  // starting position [lng, lat]. Note that lat must be set between -90 and 90
    zoom: 11,// starting zoom
});

const mapPopUp = new mapboxgl.Popup({ offset: 25 });

mapPopUp.setHTML(`<h3>${mapLocation}<h3>`);

// Create a map marker
const mapMarker = new mapboxgl.Marker()
    // Set the long/lat and add it to our map
    .setLngLat(geometry.coordinates)
    .setPopup(mapPopUp)
    .addTo(map);

// Add Navigation Controls
map.addControl(new mapboxgl.NavigationControl());