import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Linking, Platform, Dimensions 
} from 'react-native';
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../store/authSlice';

const { width, height } = Dimensions.get('window');

export default function NavigationScreen({ route, navigation }) {
  const { token } = useSelector(state => state.auth);
  const { complaint } = route.params || {};

  // Destination coordinates
  const destLat = complaint?.location?.coordinates?.[1];
  const destLng = complaint?.location?.coordinates?.[0];
  const destAddress = complaint?.location?.address || 'Destination';

  const mapRef = useRef(null);

  // States
  const [userCoords, setUserCoords] = useState(null);
  const [lastFetchedCoords, setLastFetchedCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState('Calculating...');
  const [duration, setDuration] = useState('Calculating...');
  const [steps, setSteps] = useState([]);
  const [mode, setMode] = useState('driving'); // driving | walking | two-wheeler
  const [loading, setLoading] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Request location permission & watch location
  useEffect(() => {
    let watchSubscription = null;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permissions are required for real-time navigation.');
          setLoading(false);
          return;
        }

        // Get initial position
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const currentCoords = {
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        };
        setUserCoords(currentCoords);
        setIsTracking(true);

        // Start watching position
        watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 10,
          },
          (newLocation) => {
            setUserCoords({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            });
          }
        );
      } catch (err) {
        console.error('Error starting location tracking:', err);
        setLoading(false);
      }
    };

    startTracking();

    return () => {
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, []);

  // Distance helper (Haversine formula in meters)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
  };

  // Fetch route and instructions
  const fetchRouteDetails = async (originCoords) => {
    if (!originCoords || !destLat || !destLng) return;

    try {
      const originParam = `${originCoords.latitude},${originCoords.longitude}`;
      const destParam = `${destLat},${destLng}`;
      const url = `${API_URL}/api/location/directions?origin=${originParam}&destination=${destParam}&mode=${mode}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        // Map backend coordinate arrays [lat, lng] to react-native-maps format {latitude, longitude}
        const parsedCoords = data.coordinates.map(coord => ({
          latitude: coord[0],
          longitude: coord[1]
        }));
        setRouteCoords(parsedCoords);
        setDistance(data.distance);
        setDuration(data.duration);
        setSteps(data.steps || []);
        setLastFetchedCoords(originCoords);

        // Autofit map markers
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(
              [originCoords, { latitude: destLat, longitude: destLng }],
              {
                edgePadding: { top: 50, right: 50, bottom: 250, left: 50 },
                animated: true,
              }
            );
          }
        }, 500);
      } else {
        console.warn('Backend directions failure:', data.message);
      }
    } catch (err) {
      console.error('Error fetching directions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate route when user moves > 20 meters or switches transportation mode
  useEffect(() => {
    if (userCoords) {
      if (!lastFetchedCoords) {
        fetchRouteDetails(userCoords);
      } else {
        const movedMeters = getDistance(
          userCoords.latitude,
          userCoords.longitude,
          lastFetchedCoords.latitude,
          lastFetchedCoords.longitude
        );
        if (movedMeters > 20) {
          fetchRouteDetails(userCoords);
        }
      }
    }
  }, [userCoords]);

  // Recalculate route when mode is changed explicitly
  useEffect(() => {
    if (userCoords) {
      setLoading(true);
      fetchRouteDetails(userCoords);
    }
  }, [mode]);

  // Launch directions in native Google Maps app
  const openExternalMap = () => {
    if (!destLat || !destLng) return;
    const latLng = `${destLat},${destLng}`;
    const label = encodeURIComponent(complaint?.title || 'Complaint Location');
    
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback web url
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
      }
    }).catch(() => {
      Alert.alert('Error', 'Unable to launch Google Maps app.');
    });
  };

  if (!destLat || !destLng) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorText}>No coordinates found for this complaint.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Upper Issue Details Panel */}
      <View style={styles.headerPanel}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{complaint?.title || 'Grievance Route'}</Text>
            <Text style={styles.headerAddress} numberOfLines={1}>📍 {destAddress}</Text>
          </View>
          <TouchableOpacity style={styles.googleMapsBtn} onPress={openExternalMap}>
            <Ionicons name="logo-google" size={16} color="#FFFFFF" />
            <Text style={styles.googleMapsBtnText}>Maps</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Map Visualizer */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: (userCoords?.latitude + destLat) / 2 || destLat,
          longitude: (userCoords?.longitude + destLng) / 2 || destLng,
          latitudeDelta: Math.abs(userCoords?.latitude - destLat) * 1.5 || 0.02,
          longitudeDelta: Math.abs(userCoords?.longitude - destLng) * 1.5 || 0.02,
        }}
      >
        {/* User live position marker */}
        {userCoords && (
          <Marker 
            coordinate={userCoords} 
            title="Your Position"
            pinColor="#2563EB"
          >
            <View style={styles.userMarkerContainer}>
              <View style={styles.userMarkerPulse} />
              <View style={styles.userMarkerDot} />
            </View>
          </Marker>
        )}

        {/* Complaint Destination Pin */}
        <Marker 
          coordinate={{ latitude: destLat, longitude: destLng }} 
          title="Complaint Location"
          description={complaint?.title}
        />

        {/* Navigation Polyline Route Path */}
        {routeCoords.length > 0 && (
          <Polyline 
            coordinates={routeCoords} 
            strokeWidth={5} 
            strokeColor="#2563EB"
          />
        )}
      </MapView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Fetching route instructions...</Text>
        </View>
      )}

      {/* Bottom Floating Navigation Drawer */}
      <View style={[styles.drawerCard, showSteps && styles.drawerCardExpanded]}>
        {/* Header Drag Bar indicator */}
        <TouchableOpacity 
          style={styles.dragBarContainer}
          onPress={() => setShowSteps(!showSteps)}
        >
          <View style={styles.dragBar} />
        </TouchableOpacity>

        {/* Travel Summary metrics */}
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.durationText}>{duration}</Text>
            <Text style={styles.distanceText}>{distance} remaining</Text>
          </View>
          
          {/* Mode Switchers */}
          <View style={styles.modeButtonGroup}>
            <TouchableOpacity 
              style={[styles.modeBtn, mode === 'driving' && styles.modeBtnActive]}
              onPress={() => setMode('driving')}
            >
              <Ionicons name="car" size={18} color={mode === 'driving' ? '#FFFFFF' : '#475569'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeBtn, mode === 'two-wheeler' && styles.modeBtnActive]}
              onPress={() => setMode('two-wheeler')}
            >
              <Ionicons name="bicycle" size={18} color={mode === 'two-wheeler' ? '#FFFFFF' : '#475569'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeBtn, mode === 'walking' && styles.modeBtnActive]}
              onPress={() => setMode('walking')}
            >
              <Ionicons name="walk" size={18} color={mode === 'walking' ? '#FFFFFF' : '#475569'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Current / Immediate Next Step guidance */}
        {!showSteps && steps.length > 0 && (
          <View style={styles.nextStepBox}>
            <View style={styles.nextStepIconContainer}>
              <Ionicons name="arrow-redo-sharp" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextStepText} numberOfLines={2}>
                {steps[0]?.instruction || 'Follow route'}
              </Text>
              <Text style={styles.nextStepMetric}>
                {steps[0]?.distance} ({steps[0]?.duration})
              </Text>
            </View>
          </View>
        )}

        {/* Full Turn-by-Turn Instruction Scroll List */}
        {showSteps && (
          <View style={{ flex: 1, marginTop: 12 }}>
            <Text style={styles.stepsHeading}>Turn-by-Turn Directions</Text>
            <ScrollView 
              style={styles.stepsScroll} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              {steps.length === 0 ? (
                <Text style={styles.noStepsText}>No detailed steps available.</Text>
              ) : (
                steps.map((step, idx) => (
                  <View key={idx} style={styles.stepItem}>
                    <View style={styles.stepNumberContainer}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepInstruction}>{step.instruction}</Text>
                      <Text style={styles.stepDistance}>{step.distance} - {step.duration}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  googleMapsBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  googleMapsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  map: {
    width: width,
    height: height,
  },
  userMarkerContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
  },
  drawerCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 220,
  },
  drawerCardExpanded: {
    maxHeight: height * 0.55,
  },
  dragBarContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  distanceText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  modeButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: '#2563EB',
  },
  nextStepBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nextStepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextStepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  nextStepMetric: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stepsHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  stepsScroll: {
    flex: 1,
  },
  noStepsText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 20,
    fontSize: 13,
  },
  stepItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  stepNumberContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    lineHeight: 18,
  },
  stepDistance: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
