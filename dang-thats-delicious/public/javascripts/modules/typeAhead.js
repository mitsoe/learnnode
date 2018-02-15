const axios = require('axios');

function searchResultsHTML(stores) {
    return stores.map(store => {
        return `
        <a href='/store/${store.slug}' class='search__result'>
            <strong>${store.name}</strong>
        </a>
        `
    }).join('');
}

function typeAhead(search) {
    if (!search) return;

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');

    searchInput.on('input', function () {
        // If no value hide result
        if (!this.value) {
            searchResults.style.display = 'none';
            return;
        }
        // Show search result
        searchResults.style.display = 'block';

        axios
            .get(`/api/search?q=${this.value}`)
            .then(res => {
                if (res.data.length) {
                    const html = searchResultsHTML(res.data);
                    searchResults.innerHTML = html;
                } else {
                    searchResults.innerHTML = `<div class="search__result">
                    No result found for ${this.value}</div>`;
                }
            }).catch(err => {
                console.error(err);
            })
    })

    // Handle keyboard inputs
    searchInput.on('keyup', (e) => {
        if (![38, 40, 13].includes(e.keyCode)) return; //Skip it

        const activeClass = 'search__result--active';
        const current = search.querySelector(`.${activeClass}`);
        const items = search.querySelectorAll('.search__result');
        let next;
        if (e.keyCode === 40 && current) {
            next = current.nextElementSibling || items[0];
        } else if (e.keyCode === 40) {
            next = items[0];
        } else if (e.keyCode === 38 && current) {
            next = current.previousElementSibling || items[items.length - 1]
        } else if (e.keyCode === 38) {
            next = items[items.length - 1]
        } else if (e.keyCode === 13 && current.href) {
            window.location = current.href;
            return;
        }

        if (current) {
            current.classList.remove(activeClass);
        }
        next.classList.add(activeClass);
    })
}

export default typeAhead