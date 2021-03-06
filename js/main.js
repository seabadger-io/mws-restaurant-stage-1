let restaurants;
let neighborhoods;
let cuisines;
var map;
var markers = [];

document.onreadystatechange = () => {
  if (document.readyState === 'interactive') {
    updateRestaurants();
  }
};

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  fetchNeighborhoods();
  fetchCuisines();
  initializeMapToggle();
  document.querySelectorAll('#neighborhoods-select,#cuisines-select').forEach(
    (el) => {
      el.addEventListener('change', updateRestaurants);
    }
  );
});

/**
 * Add event listener to toggle-map link
 */
const initializeMapToggle = () => {
  document.querySelector('#toggle-map').addEventListener('click', (event) => {
    event.preventDefault();
    const map = document.querySelector('#map-container');
    if (event.target.dataset.show === 'false') {
      event.target.innerHTML = 'Hide results map';
      event.target.dataset.show = 'true';
      const ms = document.querySelector('#mapScript');
      if (null === ms) {
        const addMs = document.createElement('script');
        addMs.id = 'mapScript';
        addMs.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCWYfWK4x2AWzzNW1B6YqeMg9JRmBRBygU&libraries=places&callback=initMap';
        document.querySelector('head').append(addMs);
      }
      if (self.markers.length == 0) {
        addMarkersToMap();
      }
    } else {
      event.target.innerHTML = 'Show results on map';
      event.target.dataset.show = 'false';
    }
    map.classList.toggle('hidden');
  });
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach((neighborhood) => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach((cuisine) => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  self.map.addListener('tilesloaded', setMapTitle);
  addMarkersToMap();
};

/**
 * Set title of map iframe
 */
const setMapTitle = () => {
  const mapFrame = document.querySelector('#map').querySelector('iframe');
  mapFrame.setAttribute('title', 'Google maps with restaurant location');
};

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood,
    (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach((m) => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Set inner html and screen reader label of an element
 */
const setupElementWithLabel = (element, label, text) => {
  const labelE = document.createElement('span');
  labelE.className = 'sr-only';
  labelE.innerHTML = label;
  element.append(labelE);
  const textE = document.createTextNode(text);
  element.append(textE);
  return element;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  const lazy = new LazyLoader(LazyLoader.loadPicture);
  restaurants.forEach((restaurant) => {
    const restEntry = createRestaurantHTML(restaurant);
    if (lazy.isEnabled) {
      lazy.observeEntry(restEntry);
    } else {
      LazyLoader.loadPicture(restEntry);
    }
    ul.append(restEntry);
  });
  addMarkersToMap();
};

/**
 * Create picture tag for responsive and optimized images
 */
const createPictureTag = (restaurant) => {
  const imgBase = DBHelper.imageUrlForRestaurant(restaurant);
  const pictureTag = document.createElement('picture');
  const responsiveSet = [
    {
      media: '(max-width: 400px)',
      srcset: ['@400.jpg 1x', '.jpg 2x']
    },
    {
      media: '(max-width: 549px)',
      srcset: ['@550.jpg 1x', '.jpg 2x']
    },
    {
      media: '(min-width: 550px)',
      srcset: ['@400.jpg 1x', '.jpg 2x']
    }
  ];
  responsiveSet.forEach((set) => {
    const sourceTag = document.createElement('data-source');
    sourceTag.setAttribute('media', set.media);
    const srcset = [];
    set.srcset.forEach((img) => {
      srcset.push(`${imgBase}${img}`);
    });
    sourceTag.setAttribute('srcset', srcset.join(', '));
    pictureTag.append(sourceTag);
  });
  const imgTag = document.createElement('img');
  imgTag.setAttribute('data-src', `${imgBase}@550.jpg`);
  imgTag.setAttribute('alt', 'Restaurant ' + restaurant.name);
  pictureTag.append(imgTag);
  return pictureTag;
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.className = 'restaurant-container';

  const imgdiv = document.createElement('div');
  imgdiv.className = 'restaurant-img';
  imgdiv.append(createPictureTag(restaurant));
  li.append(imgdiv);

  const summarydiv = document.createElement('div');
  summarydiv.className = 'restaurant-summary';

  const title = document.createElement('h2');
  title.appendChild(createFavoriteToggle(restaurant));
  const name = document.createTextNode(restaurant.name);
  title.appendChild(name);
  summarydiv.append(title);

  const neighborhood = document.createElement('p');
  neighborhood.className = 'neighborhood pill';
  summarydiv.append(
    setupElementWithLabel(neighborhood,
      'Neighborhood:',
      restaurant.neighborhood
    )
  );

  const address = document.createElement('p');
  address.className = 'address';
  summarydiv.append(
    setupElementWithLabel(address, 'Address:', restaurant.address)
  );

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.className = 'button';
  more.setAttribute('aria-label', 'View details of ' + restaurant.name);
  summarydiv.append(more);

  li.append(summarydiv);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  if (typeof google === 'undefined') {
    return;
  }
  restaurants.forEach((restaurant) => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};

const createFavoriteToggle = (restaurant) => {
  const button = document.createElement('a');
  button.href='#';
  button.className = 'favorite-toggle';
  button.setAttribute('data-restaurant-id', restaurant.id);
  button.setAttribute('role', 'switch');
  const check = restaurant.is_favorite === 'true' ? 'true' : 'false';
  button.setAttribute('aria-checked', check);
  button.setAttribute('title', 'Toggle favorite status of ' +
  restaurant.name);
  button.setAttribute('aria-label', 'Toggle favorite status of ' +
  restaurant.name);
  button.addEventListener('click', toggleFavoriteHandler);
  return button;
};

const toggleFavoriteHandler = (event) => {
  const target = event.currentTarget;
  const rId = target.getAttribute('data-restaurant-id');
  const check = target.getAttribute('aria-checked') === 'false'
  ? 'true' : 'false';
  DBHelper.toggleRestaurantFavorite(rId, check)
  .then(() => {
    target.setAttribute('aria-checked', check);
  });
  event.preventDefault();
};
