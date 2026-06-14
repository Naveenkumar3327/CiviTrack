import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, 
  TouchableOpacity, Modal, Image, ActivityIndicator 
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import MapView, { Marker } from 'react-native-maps';
import { fetchComplaintsMobile, upvoteComplaintMobile, followComplaintMobile } from '../store/complaintSlice';

const STATUS_BADGE_COLORS = {
  'Pending': '#EF4444',
  'Under Review': '#F97316',
  'Assigned': '#3B82F6',
  'In Progress': '#F59E0B',
  'Resolved': '#10B981',
  'Closed': '#64748B'
};

export default function FeedScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { complaints, loading } = useSelector(state => state.complaints);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    dispatch(fetchComplaintsMobile());
  }, []);

  const handleRefresh = () => {
    dispatch(fetchComplaintsMobile());
  };

  const handleUpvote = (id) => {
    dispatch(upvoteComplaintMobile(id));
  };

  const handleFollow = (id) => {
    dispatch(followComplaintMobile(id));
  };

  // Filter local array based on query
  const getFilteredComplaints = () => {
    if (!searchQuery) return complaints;
    const q = searchQuery.toLowerCase();
    return complaints.filter(c => 
      c.title?.toLowerCase().includes(q) ||
      c.location?.address?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    );
  };

  const renderItem = ({ item }) => {
    const statusColor = STATUS_BADGE_COLORS[item.status] || '#CBD5E1';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.priorityText}>{item.priority} Priority</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>

        <Text style={styles.location}>📍 {item.location?.address}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.voteCount}>Upvotes: {item.upvotes?.length || 0}</Text>
          <TouchableOpacity 
            style={styles.detailBtn} 
            onPress={() => setSelectedItem(item)}
          >
            <Text style={styles.detailBtnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput 
        style={styles.searchBar}
        placeholder="Search neighborhood issues..."
        placeholderTextColor="#94A3B8"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : complaints.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No complaints reported yet.</Text>
        </View>
      ) : (
        <FlatList 
          data={getFilteredComplaints()}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Details Modal */}
      {selectedItem && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                  <TouchableOpacity onPress={() => setSelectedItem(null)}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tagRow}>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_BADGE_COLORS[selectedItem.status] }]}>
                    <Text style={styles.statusText}>{selectedItem.status}</Text>
                  </View>
                  <Text style={styles.priorityBadge}>{selectedItem.priority} Priority</Text>
                  <Text style={styles.categoryBadge}>{selectedItem.category}</Text>
                </View>

                <Text style={styles.modalLabel}>Reported By</Text>
                <Text style={styles.modalBody}>
                  {selectedItem.isAnonymous ? '🔒 Anonymous Citizen' : (selectedItem.citizen?.name || 'Citizen')}
                </Text>

                <Text style={styles.modalLabel}>Description</Text>
                <Text style={styles.modalBody}>{selectedItem.description}</Text>

                {selectedItem.geminiSummary && (
                  <View style={styles.aiBox}>
                    <Text style={styles.aiLabel}>🤖 AI Summary</Text>
                    <Text style={styles.aiText}>"{selectedItem.geminiSummary}"</Text>
                  </View>
                )}

                {selectedItem.images && selectedItem.images.length > 0 && (
                  <View style={styles.imageSection}>
                    <Text style={styles.modalLabel}>Photo Evidence</Text>
                    <Image source={{ uri: selectedItem.images[0].url }} style={styles.evidenceImage} />
                  </View>
                )}

                {/* Map View & Navigation Button */}
                {selectedItem.location?.coordinates?.[1] && selectedItem.location?.coordinates?.[0] && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.modalLabel}>Issue Location & Coordinates</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                      📍 {selectedItem.location.address} (Lat: {selectedItem.location.coordinates[1].toFixed(5)}, Lng: {selectedItem.location.coordinates[0].toFixed(5)})
                    </Text>
                    <View style={styles.mapContainer}>
                      <MapView 
                        style={styles.map} 
                        initialRegion={{
                          latitude: selectedItem.location.coordinates[1],
                          longitude: selectedItem.location.coordinates[0],
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                      >
                        <Marker coordinate={{ 
                          latitude: selectedItem.location.coordinates[1], 
                          longitude: selectedItem.location.coordinates[0] 
                        }} />
                      </MapView>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.navigateBtn} 
                      onPress={() => {
                        setSelectedItem(null);
                        navigation.navigate('Navigation', { 
                          complaint: selectedItem 
                        });
                      }}
                    >
                      <Text style={styles.navigateBtnText}>🚗 Navigate to Issue</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Status Timeline */}
                <Text style={styles.modalLabel}>Status Timeline</Text>
                {selectedItem.statusTimeline?.map((node, index) => (
                  <View key={index} style={styles.timelineNode}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineCard}>
                      <Text style={styles.timelineDate}>{new Date(node.timestamp).toLocaleString()}</Text>
                      <Text style={styles.timelineStatus}>Stage: {node.status}</Text>
                      <Text style={styles.timelineRemarks}>{node.remarks}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.socialBtn, selectedItem.upvotes?.includes(user?.id) && styles.socialBtnActive]} 
                  onPress={() => handleUpvote(selectedItem._id || selectedItem.id)}
                >
                  <Text style={styles.socialBtnText}>
                    👍 Upvote ({selectedItem.upvotes?.length || 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialBtn, selectedItem.followers?.includes(user?.id) && styles.socialBtnActive]} 
                  onPress={() => handleFollow(selectedItem._id || selectedItem.id)}
                >
                  <Text style={styles.socialBtnText}>
                    🔔 {selectedItem.followers?.includes(user?.id) ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  priorityText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  location: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  voteCount: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  detailBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  detailBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '85%',
    padding: 20,
  },
  modalScroll: {
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  closeIcon: {
    fontSize: 20,
    color: '#64748B',
    padding: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    marginTop: 16,
  },
  modalBody: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  aiBox: {
    backgroundColor: '#F5F3FF',
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
    padding: 10,
    borderRadius: 4,
    marginTop: 12,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 2,
  },
  aiText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#4C1D95',
  },
  imageSection: {
    marginTop: 12,
  },
  evidenceImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: 4,
  },
  timelineNode: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    marginTop: 16,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineDate: {
    fontSize: 10,
    color: '#64748B',
  },
  timelineStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginVertical: 2,
  },
  timelineRemarks: {
    fontSize: 12,
    color: '#475569',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginTop: 16,
  },
  socialBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    flex: 0.48,
    alignItems: 'center',
  },
  socialBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  socialBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  mapContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  navigateBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
