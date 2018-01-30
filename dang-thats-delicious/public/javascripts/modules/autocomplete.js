function autoComplete(input, latInput, lngInput) {
    if (!input) return //Skip function if no input

    const dropdown = new google.maps.places.Autocomplete(input);
    dropdown.addListener('place_changed', () => {
        const place = dropdown.getPlace();
        latInput.value = place.geometry.location.lat()
        lngInput.value = place.geometry.location.lng()
    });

    //On enter of address field dont submit form
    input.on('keydown', (e) => {
        if (e.keyCode === 13) e.preventDefault();
    });
}

export default autoComplete;