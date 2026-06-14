import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useSelector } from 'react-redux';

const PIN_COLORS = {
  'Pending': 'red',
  'Under Review': 'orange',
  'Assigned': 'blue',
  'In Progress': 'yellow',
  'Resolved': 'green',
  'Closed': 'grey'
};

export default function MapScreen() {
  const { complaints, loading } = useSelector(state => state.complaints);
  const [region, setRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421
  });

  // Adjust center to first complaint
  useEffect(() => {
    if (complaints.length > 0) {
      const first = complaints[0];
      if (first.location?.coordinates) {
        const [lng, lat] = first.location.coordinates;
        setRegion(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
      }
    }
  }, [complaints]);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      )}

      <MapView 
        style={styles.map} 
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {complaints.map((c) => {
          if (!c.location?.coordinates || c.location.coordinates.length < 2) return null;
          const [lng, lat] = c.location.coordinates;
          const pinColor = PIN_COLORS[c.status] || 'red';

          return (
            <Marker
              key={c._id || c.id}
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor={pinColor}
            >
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{c.title}</Text>
                  <Text style={styles.calloutCategory}>Category: {c.category}</Text>
                  <Text style={styles.calloutStatus}>Status: {c.status}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loader: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 9999,
    padding: 6,
  },
  callout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 4,
  },
  calloutCategory: {
    fontSize: 12,
    color: '#64748B',
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 4,
  },
});
