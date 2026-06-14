const geocodeCoordinates = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(googleUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const address = result.formatted_address;
        
        let city = '';
        let state = '';
        let country = '';
        let postalCode = '';

        result.address_components.forEach(comp => {
          if (comp.types.includes('locality')) {
            city = comp.long_name;
          } else if (!city && comp.types.includes('administrative_area_level_2')) {
            city = comp.long_name; // fallback to district
          }
          if (comp.types.includes('administrative_area_level_1')) {
            state = comp.long_name;
          }
          if (comp.types.includes('country')) {
            country = comp.long_name;
          }
          if (comp.types.includes('postal_code')) {
            postalCode = comp.long_name;
          }
        });

        return res.status(200).json({
          success: true,
          address,
          city,
          state,
          country,
          postalCode
        });
      }
    } catch (err) {
      console.warn("⚠️ Google Maps Geocoding failed, trying fallback:", err.message);
    }
  }

  // Fallback: OpenStreetMap Nominatim
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'CiviTrack-Civic-App/1.0'
      }
    });
    const data = await response.json();

    if (data && data.address) {
      const address = data.display_name;
      const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
      const state = data.address.state || '';
      const country = data.address.country || '';
      const postalCode = data.address.postcode || '';

      return res.status(200).json({
        success: true,
        address,
        city,
        state,
        country,
        postalCode
      });
    }

    return res.status(200).json({
      success: true,
      address: `Coordinates: ${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`,
      city: 'Local Area',
      state: 'State',
      country: 'Country',
      postalCode: ''
    });
  } catch (err) {
    console.error("❌ Geocoding fallback error:", err.message);
    return res.status(500).json({ success: false, message: 'Geocoding request failed' });
  }
};

const getRouteDirections = async (req, res) => {
  const { origin, destination, mode } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ success: false, message: 'Origin and destination are required (format: lat,lng)' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const navMode = mode || 'driving'; // driving | walking | two-wheeler

  if (apiKey) {
    try {
      // Map mode for Google
      let googleMode = 'driving';
      if (navMode === 'walking') googleMode = 'walking';
      else if (navMode === 'two-wheeler') googleMode = 'bicycling'; // closest equivalent

      const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=${googleMode}&key=${apiKey}`;
      const response = await fetch(googleUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        const distance = leg.distance.text;
        const duration = leg.duration.text;

        // Decode Polyline points simple helper
        const decodePolyline = (encoded) => {
          let index = 0, len = encoded.length;
          let lat = 0, lng = 0;
          const coordinates = [];

          while (index < len) {
            let b, shift = 0, result = 0;
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            coordinates.push([lat / 1e5, lng / 1e5]);
          }
          return coordinates;
        };

        const coordinates = decodePolyline(route.overview_polyline.points);
        const steps = leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text
        }));

        return res.status(200).json({
          success: true,
          distance,
          duration,
          coordinates,
          steps
        });
      }
    } catch (err) {
      console.warn("⚠️ Google Maps Directions failed, trying fallback:", err.message);
    }
  }

  // Fallback: OSRM
  try {
    const [origLat, origLng] = origin.split(',');
    const [destLat, destLng] = destination.split(',');

    // Map mode for OSRM profiles
    let osrmProfile = 'driving';
    if (navMode === 'walking') {
      osrmProfile = 'foot';
    }

    const osrmUrl = `http://router.project-osrm.org/route/v1/${osrmProfile}/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(osrmUrl);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];

      // OSRM coordinates are in [lng, lat] format; map them to [lat, lng] for Leaflet
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

      const distanceKm = (route.distance / 1000).toFixed(1);
      const distance = distanceKm >= 1.0 ? `${distanceKm} km` : `${Math.round(route.distance)} m`;

      const durationMinutes = Math.round(route.duration / 60);
      const duration = durationMinutes > 0 ? `${durationMinutes} mins` : '1 min';

      const formatOSRMStep = (step) => {
        const type = step.maneuver.type;
        const modifier = step.maneuver.modifier || '';
        const street = step.name ? ` onto ${step.name}` : '';
        
        let readableType = type;
        if (type === 'turn') readableType = `Turn ${modifier}`;
        else if (type === 'new name') readableType = 'Continue';
        else if (type === 'depart') readableType = 'Head';
        else if (type === 'arrive') readableType = 'Arrive at destination';

        return `${readableType.charAt(0).toUpperCase() + readableType.slice(1)}${street}`.trim();
      };

      const steps = leg.steps.map(step => {
        const stepDist = step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`;
        const stepDurSecs = Math.round(step.duration);
        const stepDur = stepDurSecs >= 60 ? `${Math.round(stepDurSecs / 60)} mins` : `${stepDurSecs}s`;

        return {
          instruction: formatOSRMStep(step),
          distance: stepDist,
          duration: stepDur
        };
      });

      return res.status(200).json({
        success: true,
        distance,
        duration,
        coordinates,
        steps
      });
    }

    return res.status(400).json({ success: false, message: 'Could not calculate route instructions' });
  } catch (err) {
    console.error("❌ Directions fallback error:", err.message);
    return res.status(500).json({ success: false, message: 'Directions request failed' });
  }
};

module.exports = {
  geocodeCoordinates,
  getRouteDirections
};
