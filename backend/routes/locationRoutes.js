const express = require('express');
const router = express.Router();
const { geocodeCoordinates, getRouteDirections } = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure these endpoints

router.get('/geocode', geocodeCoordinates);
router.get('/directions', getRouteDirections);

module.exports = router;
