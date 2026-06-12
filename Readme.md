# Manipal Uninav: Map Service

This branch of the repository contains the frontend map application for **Manipal Uninav**. We have deployed the map service and the main website separately via Netlify.

### Features
* **Campus Routing:** Computes walking paths across the Manipal University Jaipur campus.
* **OpenStreetMap Integration:** Uses [Leaflet.js](https://leafletjs.com/) and open-source tile services to render the interactive map.
* **Offline Support:** Features a Service Worker to cache map tiles so navigation works even when moving through campus dead-zones. 
* **Dark Mode:** Integrated CartoDB dark tiles for nighttime navigation.
