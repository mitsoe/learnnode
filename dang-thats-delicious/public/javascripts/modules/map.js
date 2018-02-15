const axios = require('axios');
import { $ } from './bling';
const mapOptions = {
    center: { lat: 43.2, lng: -79.8 },
    zoom: 11
}

function loadPlaces(map, lat = 43.2, lng = -79.8) {
    axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
        .then(res => {
            const places = res.data;
            if (!places.length) {
                alert('No places found')
                return
            }

            // Create bounds

            const bounds = new google.maps.LatLngBounds();
            const infoWindow = new google.maps.InfoWindow();

            const markers = places.map(place => {
                const [placeLng, placeLat] = place.location.coordinates;
                const position = {
                    lat: placeLat,
                    lng: placeLng
                }
                bounds.extend(position);
                const marker = new google.maps.Marker({ map, position })
                marker.place = place;
                return marker;
            });

            // Click marker show info window
            markers.forEach(marker => {
                marker.addListener('click', function () {
                    infoWindow.setContent(this.place.name);
                    infoWindow.open(map, this);
                    console.log(this.place)
                })
            })

            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);
        })
}

function makeMap(mapDiv) {
    if (!mapDiv) return;

    // Make the map
    const map = new google.maps.Map(mapDiv, mapOptions);
    loadPlaces(map);

    const input = $('[name="geolocate"');
    const autocomplete = new google.maps.places.Autocomplete(input);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        const location = place.geometry.location;
        loadPlaces(map, location.lat(), location.lng());
    });
}

export default makeMap;