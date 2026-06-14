import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutMobile } from '../store/authSlice';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { complaints } = useSelector(state => state.complaints);

  const handleLogout = () => {
    dispatch(logoutMobile());
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const citizenComplaintsCount = complaints.filter(c => c.citizen?.id === user?.id).length;
  const activeFollowsCount = complaints.filter(c => c.followers?.includes(user?.id)).length;

  return (
    <View style={styles.container}>
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: user?.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150" }} 
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.name || 'Citizen User'}</Text>
        <Text style={styles.email}>{user?.email || 'citizen@civitrack.org'}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{user?.role?.toUpperCase()} ACCOUNT</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{citizenComplaintsCount}</Text>
          <Text style={styles.statLabel}>Filed Issues</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{activeFollowsCount}</Text>
          <Text style={styles.statLabel}>Follows</Text>
        </View>
      </View>

      <View style={styles.detailsBlock}>
        <Text style={styles.label}>Mobile Contact</Text>
        <Text style={styles.value}>{user?.mobileNumber || 'Not provided'}</Text>

        <Text style={styles.label}>Home Ward Address</Text>
        <Text style={styles.value}>{user?.address || 'Not registered'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log Out Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  cardHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#2563EB',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  email: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  badgeText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flex: 0.48,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  detailsBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    marginBottom: 16,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
