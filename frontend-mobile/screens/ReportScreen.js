import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  Image, ActivityIndicator, Alert, Modal 
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import MapView, { Marker } from 'react-native-maps';
import { createComplaintMobile, upvoteComplaintMobile, followComplaintMobile, fetchComplaintsMobile } from '../store/complaintSlice';
import { API_URL } from '../store/authSlice';

const CATEGORIES = [
  'Road Damage', 'Garbage', 'Street Light', 'Water Leakage', 'Drainage', 
  'Public Property Damage', 'Tourist Place Issue', 'Traffic Problem', 'Safety Issue', 'Other'
];

export default function ReportScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, token } = useSelector(state => state.auth);
  const { submitLoading } = useSelector(state => state.complaints);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Road Damage');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [imageUri, setImageUri] = useState(null);
  
  // Geocode address components
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  
  // Duplicate State
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Request Permissions on mount
  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const handleGPSDetect = async () => {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable location access in settings.');
      return;
    }

    const pos = await Location.getCurrentPositionAsync({});
    const newCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setCoords(newCoords);
    reverseGeocode(newCoords.latitude, newCoords.longitude);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(`${API_URL}/api/location/geocode?lat=${lat}&lng=${lng}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAddress(data.address || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        setCity(data.city || '');
        setStateName(data.state || '');
        setCountry(data.country || '');
        setPostalCode(data.postalCode || '');
      } else {
        setAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
      }
    } catch (e) {
      setAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
    }
  };

  // Snaps/picks image, then compresses using Expo ImageManipulator
  const handlePickImage = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
      const originalUri = pickerResult.assets[0].uri;
      
      // Perform local compression to 70% quality and max 800px width
      const compressedResult = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      setImageUri(compressedResult.uri);
    }
  };

  const handleReportSubmit = async (bypass = false) => {
    if (!title || !description || !address) {
      Alert.alert('Incomplete Form', 'Please provide a title, description, and location pin.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('latitude', coords.latitude);
    formData.append('longitude', coords.longitude);
    formData.append('address', address);
    formData.append('landmark', landmark);
    formData.append('city', city);
    formData.append('state', stateName);
    formData.append('country', country);
    formData.append('postalCode', postalCode);
    formData.append('isAnonymous', isAnonymous ? 'true' : 'false');
    
    if (bypass) {
      formData.append('bypassDuplicate', 'true');
    }

    if (imageUri) {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image';
      
      formData.append('images', {
        uri: imageUri,
        name: filename,
        type
      });
    }

    const actionResult = await dispatch(createComplaintMobile(formData));

    if (createComplaintMobile.rejected.match(actionResult)) {
      const payload = actionResult.payload;
      if (payload && payload.isDuplicate) {
        setDuplicateWarning(payload.complaint);
      } else {
        Alert.alert('Report Failed', payload?.message || 'Error creating complaint.');
      }
    } else {
      Alert.alert('Grievance Filed', 'Thank you! Your complaint is registered.');
      
      // Reset
      setTitle('');
      setDescription('');
      setLandmark('');
      setAddress('');
      setCity('');
      setStateName('');
      setCountry('');
      setPostalCode('');
      setIsAnonymous(false);
      setImageUri(null);
      setDuplicateWarning(null);
      navigation.navigate('Feed');
    }
  };

  const handleSupportDuplicate = async () => {
    if (!duplicateWarning) return;
    const compId = duplicateWarning._id || duplicateWarning.id;
    
    await dispatch(upvoteComplaintMobile(compId));
    await dispatch(followComplaintMobile(compId));
    
    Alert.alert('Upvoted and Subscribed', 'You have supported the existing nearby issue.');
    
    // Reset
    setTitle('');
    setDescription('');
    setLandmark('');
    setImageUri(null);
    setDuplicateWarning(null);
    navigation.navigate('Feed');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>File Grievance</Text>
      
      <Text style={styles.label}>Issue Title *</Text>
      <TextInput 
        style={styles.input}
        placeholder="Brief description (e.g. Street lamp broken)"
        placeholderTextColor="#94A3B8"
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Category Selector</Text>
          <View style={styles.pickerBox}>
            <TextInput 
              style={[styles.input, { borderWidth: 0 }]}
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Street Light"
            />
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.label}>Landmark / Ward</Text>
          <TextInput 
            style={styles.input}
            placeholder="Near Main Library"
            placeholderTextColor="#94A3B8"
            value={landmark}
            onChangeText={setLandmark}
          />
        </View>
      </View>

      <Text style={styles.label}>Full Description *</Text>
      <TextInput 
        style={[styles.input, { height: 80 }]}
        placeholder="Detailed information regarding the issue..."
        placeholderTextColor="#94A3B8"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* Image Picker */}
      <Text style={styles.label}>Upload Evidence Picture</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <Text style={styles.imagePickerText}>📷 Select or Take Photo</Text>
        )}
      </TouchableOpacity>

      {/* Anonymous Checkbox */}
      <TouchableOpacity 
        style={styles.anonymousContainer} 
        onPress={() => setIsAnonymous(!isAnonymous)}
      >
        <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
          {isAnonymous && <Text style={styles.checkboxCheckmark}>✓</Text>}
        </View>
        <View style={styles.anonymousTextContainer}>
          <Text style={styles.anonymousLabel}>Submit Complaint Anonymously</Text>
          <Text style={styles.anonymousSublabel}>Your identity will be hidden from the public feed and other citizens.</Text>
        </View>
      </TouchableOpacity>

      {/* Location Map */}
      <View style={styles.locationHeader}>
        <Text style={styles.label}>Map Location Pin *</Text>
        <TouchableOpacity style={styles.gpsBtn} onPress={handleGPSDetect}>
          <Text style={styles.gpsBtnText}>GPS Detect</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView 
          style={styles.map} 
          region={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005
          }}
          onPress={(e) => {
            const loc = e.nativeEvent.coordinate;
            setCoords(loc);
            reverseGeocode(loc.latitude, loc.longitude);
          }}
        >
          <Marker coordinate={coords} />
        </MapView>
      </View>
      <Text style={styles.addressDisplay} numberOfLines={2}>📍 {address || 'No location selected'}</Text>

      <TouchableOpacity style={styles.submitBtn} onPress={() => {
        if (!title || !description || !address) {
          Alert.alert('Incomplete Form', 'Please provide a title, description, and location pin.');
          return;
        }
        setConfirmModalVisible(true);
      }} disabled={submitLoading}>
        {submitLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Complaint</Text>}
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Confirm Grievance Details</Text>
            
            <ScrollView style={styles.confirmScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.confirmMapContainer}>
                <MapView 
                  style={styles.confirmMap}
                  region={{
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker coordinate={coords} />
                </MapView>
              </View>

              <View style={styles.confirmDetailItem}>
                <Text style={styles.confirmDetailLabel}>Title</Text>
                <Text style={styles.confirmDetailValue}>{title}</Text>
              </View>

              <View style={styles.confirmDetailItem}>
                <Text style={styles.confirmDetailLabel}>Category</Text>
                <Text style={styles.confirmDetailValue}>{category}</Text>
              </View>

              <View style={styles.confirmDetailItem}>
                <Text style={styles.confirmDetailLabel}>Address</Text>
                <Text style={styles.confirmDetailValue}>{address}</Text>
              </View>

              <View style={styles.confirmDetailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmDetailLabel}>City</Text>
                  <Text style={styles.confirmDetailValue}>{city || 'N/A'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.confirmDetailLabel}>Postal Code</Text>
                  <Text style={styles.confirmDetailValue}>{postalCode || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.confirmDetailItem}>
                <Text style={styles.confirmDetailLabel}>Privacy Mode</Text>
                <Text style={[styles.confirmDetailValue, { color: isAnonymous ? '#F59E0B' : '#10B981', fontWeight: '700' }]}>
                  {isAnonymous ? '🔒 Anonymous Citizen' : '🔓 Publicly Named'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.confirmModalButtons}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.confirmCancelBtnText}>Edit Details</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmSubmitBtn} onPress={() => {
                setConfirmModalVisible(false);
                handleReportSubmit(false);
              }} disabled={submitLoading}>
                {submitLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmSubmitBtnText}>Confirm & Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Alert Overlay Modal */}
      {duplicateWarning && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>⚠️ Similar Issue Nearby!</Text>
              <Text style={styles.modalText}>
                An identical issue has already been reported within 100m. Upvoting/following ensures municipal attention without filing duplication.
              </Text>

              <View style={styles.duplicateCard}>
                <Text style={styles.duplicateTitle}>{duplicateWarning.title}</Text>
                <Text style={styles.duplicateAddress}>📍 {duplicateWarning.location?.address}</Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.btnOutline} onPress={() => handleReportSubmit(true)}>
                  <Text style={styles.btnOutlineText}>Bypass & File</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnPrimaryCompact} onPress={handleSupportDuplicate}>
                  <Text style={styles.btnPrimaryText}>Support Existing</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
  },
  pickerBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  imagePicker: {
    height: 120,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  imagePickerText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  gpsBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gpsBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  mapContainer: {
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  addressDisplay: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 40,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  duplicateCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  duplicateTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#0F172A',
  },
  duplicateAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  btnOutlineText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  btnPrimaryCompact: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  anonymousContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  anonymousTextContainer: {
    flex: 1,
  },
  anonymousLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  anonymousSublabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmScroll: {
    marginBottom: 16,
  },
  confirmMapContainer: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  confirmMap: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmDetailItem: {
    marginBottom: 12,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  confirmDetailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  confirmDetailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  confirmCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmSubmitBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
