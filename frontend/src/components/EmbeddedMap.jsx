import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import './EmbeddedMap.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const EmbeddedMap = ({ donation, onClose }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [routeInfo, setRouteInfo] = useState({ distance: '', time: '' });
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);

  // Extract food location coordinates from donation data
  const getFoodLocation = () => {
    console.log('🔍 Extracting food location from donation:', donation);
    
    if (donation.location?.coordinates?.latitude && donation.location?.coordinates?.longitude) {
      const coords = {
        lat: donation.location.coordinates.latitude,
        lng: donation.location.coordinates.longitude
      };
      console.log('✅ Found food location coordinates:', coords);
      return coords;
    }
    
    // Fallback for testing - use a nearby location
    if (userLocation) {
      const fallback = {
        lat: userLocation.lat + 0.01,
        lng: userLocation.lng + 0.01
      };
      console.log('⚠️ Using fallback food location:', fallback);
      return fallback;
    }
    
    console.log('❌ No food location coordinates found');
    return null;
  };

  // Initialize Leaflet map
  const initializeMap = (userPos, foodPos) => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('🗺️ Initializing Leaflet map with:', { userPos, foodPos });

    // Create map instance
    const map = L.map(mapRef.current).setView([userPos.lat, userPos.lng], 13);
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Create custom icons
    const userIcon = L.divIcon({
      className: 'custom-marker user-marker',
      html: '<div class="marker-pin user-pin">📍</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    const foodIcon = L.divIcon({
      className: 'custom-marker food-marker',
      html: '<div class="marker-pin food-pin">🍽️</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    // Add markers
    const userMarker = L.marker([userPos.lat, userPos.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('📍 Your Location')
      .openPopup();

    const foodMarker = L.marker([foodPos.lat, foodPos.lng], { icon: foodIcon })
      .addTo(map)
      .bindPopup('🍽️ Food Donation Location');

    // Add routing control with custom styling
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userPos.lat, userPos.lng),
        L.latLng(foodPos.lat, foodPos.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: () => null, // Don't create default markers
      lineOptions: {
        styles: [{
          color: '#22c55e',
          weight: 6,
          opacity: 0.8
        }]
      },
      show: false, // Hide the default route instructions panel
      collapsible: false
    }).on('routesfound', function(e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      
      // Update route info
      const distance = (summary.totalDistance / 1000).toFixed(1); // Convert to km
      const time = Math.round(summary.totalTime / 60); // Convert to minutes
      
      setRouteInfo({
        distance: `${distance} km`,
        time: `${time} min`
      });
      
      console.log('✅ Route calculated:', { distance: `${distance} km`, time: `${time} min` });
    }).addTo(map);

    routingControlRef.current = routingControl;

    // Fit map to show both markers and route
    const group = new L.featureGroup([userMarker, foodMarker]);
    map.fitBounds(group.getBounds().pad(0.1));

    setLoading(false);
  };

  // Get user's current location
  const getUserLocation = () => {
    console.log('🔍 Starting geolocation request...');
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    console.log('📍 Requesting current position...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        console.log('✅ Got user location:', userPos);
        console.log('📊 Position accuracy:', position.coords.accuracy, 'meters');
        setUserLocation(userPos);
        
        const foodPos = getFoodLocation();
        if (foodPos) {
          // Clean up existing map
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }
          initializeMap(userPos, foodPos);
        } else {
          setError('Food location coordinates not available');
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        let errorMessage = 'Unable to get your location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied. Please enable location permissions.';
            console.log('🚫 User denied location permission');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable.';
            console.log('📍 Position unavailable');
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            console.log('⏰ Location request timeout');
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            console.log('❓ Unknown geolocation error');
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 60000 // Reduced cache age
      }
    );
  };

  // Geocode manual address
  const geocodeAddress = async (address) => {
    setGeocoding(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const userPos = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        
        console.log('✅ Geocoded address to:', userPos);
        setUserLocation(userPos);
        setShowLocationOptions(false);
        setManualAddress('');
        
        const foodPos = getFoodLocation();
        if (foodPos) {
          // Clean up existing map
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }
          initializeMap(userPos, foodPos);
        } else {
          setError('Food location coordinates not available');
        }
      } else {
        setError('Address not found. Please try a different address.');
      }
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      setError('Failed to find address. Please try again.');
    } finally {
      setGeocoding(false);
    }
  };

  // Initialize on component mount
  useEffect(() => {
    getUserLocation();
    
    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="embedded-map-overlay">
      <div className="embedded-map-modal">
        {/* Header */}
        <div className="map-header">
          <div className="map-title">
            <h3>🗺️ Route to Food Donation</h3>
          </div>
          <button className="close-map-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="map-loading">
            <div className="loading-spinner"></div>
            <p>Getting your location and calculating route...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="map-error">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <div className="error-actions">
                <button 
                  className="retry-btn"
                  onClick={getUserLocation}
                >
                  🔄 Try Again
                </button>
                <button 
                  className="manual-location-btn"
                  onClick={() => setShowLocationOptions(true)}
                >
                  📍 Enter Address Manually
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location Options Modal */}
        {showLocationOptions && (
          <div className="location-options-modal">
            <div className="location-options-content">
              <h4>📍 Set Your Location</h4>
              <div className="location-input-group">
                <input
                  type="text"
                  placeholder="Enter your address..."
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="address-input"
                />
                <button 
                  className="geocode-btn"
                  onClick={() => geocodeAddress(manualAddress)}
                  disabled={!manualAddress.trim() || geocoding}
                >
                  {geocoding ? '🔍 Searching...' : '🔍 Find'}
                </button>
              </div>
              <div className="location-options-actions">
                <button 
                  className="gps-btn"
                  onClick={() => {
                    setShowLocationOptions(false);
                    getUserLocation();
                  }}
                >
                  📡 Use GPS
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => setShowLocationOptions(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Route Info */}
        {routeInfo.distance && !loading && (
          <div className="route-info-header">
            <div className="route-stats">
              <span className="route-distance">📏 {routeInfo.distance}</span>
              <span className="route-time">⏱️ {routeInfo.time}</span>
            </div>
            <button 
              className="change-location-btn"
              onClick={() => setShowLocationOptions(true)}
            >
              📍 Change Location
            </button>
          </div>
        )}

        {/* Map Container */}
        <div className="leaflet-map-container">
          <div 
            ref={mapRef} 
            className="leaflet-map"
            style={{ height: '500px', width: '100%' }}
          />
        </div>

        {/* Map Actions */}
        {!loading && !error && (
          <div className="map-actions">
            <button 
              className="external-maps-btn"
              onClick={() => {
                const foodPos = getFoodLocation();
                if (userLocation && foodPos) {
                  const googleMapsUrl = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${foodPos.lat},${foodPos.lng}`;
                  window.open(googleMapsUrl, '_blank');
                }
              }}
            >
              🗺️ Open in Google Maps
            </button>
            <button 
              className="share-location-btn"
              onClick={() => {
                const foodPos = getFoodLocation();
                if (foodPos) {
                  const coords = `${foodPos.lat}, ${foodPos.lng}`;
                  navigator.clipboard.writeText(coords);
                  alert('📋 Coordinates copied to clipboard!');
                }
              }}
            >
              📋 Copy Coordinates
            </button>
          </div>
        )}

        {/* Map Attribution */}
        <div className="map-attribution">
          <p>🗺️ Powered by OpenStreetMap • 🚗 Routing by OSRM • 100% Free & Open Source</p>
        </div>
      </div>
    </div>
  );
};

export default EmbeddedMap;
