import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Modal, ActivityIndicator, Alert 
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginMobile, registerMobile, verifyOtpMobile, clearMobileError, cancelOtpMobile } from '../store/authSlice';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { token, loading, error, otpRequested, otpEmail, otpDebug, otpPayload } = useSelector(state => state.auth);

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [otpInput, setOtpInput] = useState('');

  // Handle successful auth redirect
  useEffect(() => {
    if (token) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [token]);

  // Handle backend errors
  useEffect(() => {
    if (error) {
      Alert.alert('Authentication Error', error, [
        { text: 'OK', onPress: () => dispatch(clearMobileError()) }
      ]);
    }
  }, [error]);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }
    dispatch(loginMobile({ email, password }));
  };

  const handleRegister = () => {
    if (!name || !email || !mobileNumber || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    dispatch(registerMobile({ name, email, mobileNumber, password, address, role: 'citizen' }));
  };

  const handleOtpVerify = () => {
    if (!otpInput) {
      Alert.alert('Empty Code', 'Please enter the OTP verification code.');
      return;
    }
    dispatch(verifyOtpMobile({
      ...otpPayload,
      otp: otpInput
    }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>CiviTrack</Text>
        <Text style={styles.subtitle}>Citizen Issue Reporting & Tracking</Text>
      </View>

      {mode === 'login' ? (
        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="name@email.com" 
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="••••••••" 
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBtn} onPress={() => setMode('register')}>
            <Text style={styles.switchText}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="John Doe" 
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email Address *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="john@email.com" 
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Mobile Number *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="9876543210" 
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={mobileNumber}
            onChangeText={setMobileNumber}
          />

          <Text style={styles.label}>Password *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="••••••••" 
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Home Address</Text>
          <TextInput 
            style={[styles.input, { height: 60 }]} 
            placeholder="123 Civic Lane, Sector 4" 
            placeholderTextColor="#94A3B8"
            multiline
            value={address}
            onChangeText={setAddress}
          />

          <TouchableOpacity style={styles.btnSecondary} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Register Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBtn} onPress={() => setMode('login')}>
            <Text style={styles.switchText}>Already registered? Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OTP Modal */}
      <Modal visible={otpRequested} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify OTP Code</Text>
            <Text style={styles.modalBodyText}>
              A verification passcode has been dispatched to {otpEmail}. Please type it below.
            </Text>

            <TextInput 
              style={[styles.input, styles.otpInput]} 
              placeholder="123456" 
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={otpInput}
              onChangeText={setOtpInput}
            />

            {otpDebug && (
              <View style={styles.debugBox}>
                <Text style={styles.debugLabel}>👨‍💻 Local Debug OTP:</Text>
                <Text style={styles.debugCode}>{otpDebug}</Text>
                <TouchableOpacity onPress={() => setOtpInput(otpDebug)}>
                  <Text style={styles.debugFillBtn}>Auto-Fill Code</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => dispatch(cancelOtpMobile())}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.btnPrimaryCompact} onPress={handleOtpVerify} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2563EB',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  btnPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  btnSecondary: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalBodyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  otpInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 6,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  debugBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  debugLabel: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  debugCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    letterSpacing: 4,
    marginVertical: 4,
  },
  debugFillBtn: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnOutlineText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimaryCompact: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
