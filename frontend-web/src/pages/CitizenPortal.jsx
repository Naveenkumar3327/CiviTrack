import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchComplaints, createNewComplaint, upvoteComplaint, followComplaint, resetCurrentComplaint } from '../store/complaintSlice';
import { logout } from '../store/authSlice';
import MapDashboard from '../components/MapDashboard';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import { 
  FileText, Map, User, LogOut, Sun, Moon, PlusCircle, Sparkles, Upload, 
  MapPin, CheckCircle, ArrowRight, Eye, ThumbsUp, Bell, Heart, ShieldAlert,
  Menu, X
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon in React
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Click map to place marker helper
function MapClickEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function CitizenPortal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { user, token } = useSelector(state => state.auth);
  const { complaints, loading, submitLoading, error } = useSelector(state => state.complaints);

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'report' | 'profile' | 'map'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Filter States
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSort, setFilterSort] = useState('newest');

  // Report Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Road Damage');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState([12.9716, 77.5946]); // default Bangalore
  const [images, setImages] = useState([]);
  const [compressedImages, setCompressedImages] = useState([]);
  
  const [city, setCity] = useState('');
  const [locState, setLocState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Navigation States
  const [navMode, setNavMode] = useState('driving');
  const [navDetails, setNavDetails] = useState(null);
  const [navLoading, setNavLoading] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // Duplicate State Trigger
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Detail Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Profile Update Form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    mobileNumber: user?.mobileNumber || '',
    address: user?.address || ''
  });

  // Track reference to file selector
  const fileInputRef = useRef(null);

  // Check Auth
  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else {
      dispatch(fetchComplaints({
        category: filterCategory,
        status: filterStatus,
        sortBy: filterSort
      }));
    }
  }, [token, navigate, filterCategory, filterStatus, filterSort, dispatch]);

  // Load theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle Theme
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Reverse Geocoding via Backend API
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`/api/location/geocode?lat=${lat}&lng=${lng}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data && data.success) {
        setAddress(data.address);
        setCity(data.city);
        setLocState(data.state);
        setCountry(data.country);
        setPostalCode(data.postalCode);
      } else {
        setAddress(`Coordinate: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err) {
      setAddress(`Coordinate: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  // Trigger GPS detection
  const handleGPSDetect = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords([lat, lng]);
          reverseGeocode(lat, lng);
        },
        (err) => {
          alert('GPS detection failed. Please drop a pin manually on the map.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Click on selector map
  const handleMapClick = (latlng) => {
    setCoords(latlng);
    reverseGeocode(latlng[0], latlng[1]);
  };

  // HTML Canvas Image Compression before transmission
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 750;
          const MAX_HEIGHT = 750;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              width = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve({
              file: compressedFile,
              previewUrl: URL.createObjectURL(compressedFile)
            });
          }, 'image/jpeg', 0.70); // 70% quality factor
        };
      };
    });
  };

  const handleImageChange = async (e) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    const compressedList = [];
    for (const file of filesArray) {
      const result = await compressImage(file);
      compressedList.push(result);
    }
    
    setCompressedImages([...compressedImages, ...compressedList]);
  };

  const handleRemoveImage = (index) => {
    const list = [...compressedImages];
    URL.revokeObjectURL(list[index].previewUrl);
    list.splice(index, 1);
    setCompressedImages(list);
  };

  // Submit Complaint Workflow (Includes geo-spatial duplicate checks)
  const handleComplaintSubmit = async (e, bypass = false) => {
    if (e) e.preventDefault();

    if (!title || !description || !address) {
      alert('Please fill in all mandatory fields.');
      return;
    }

    // Prepare Multipart FormData payload
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('latitude', coords[0]);
    formData.append('longitude', coords[1]);
    formData.append('address', address);
    formData.append('landmark', landmark);
    formData.append('city', city);
    formData.append('state', locState);
    formData.append('country', country);
    formData.append('postalCode', postalCode);
    formData.append('isAnonymous', isAnonymous ? 'true' : 'false');
    
    if (bypass) {
      formData.append('bypassDuplicate', 'true');
    }

    compressedImages.forEach((imgObj) => {
      formData.append('images', imgObj.file);
    });

    try {
      // First attempt, let backend evaluate proximity checks
      const resultAction = await dispatch(createNewComplaint(formData));
      
      if (createNewComplaint.rejected.match(resultAction)) {
        const payload = resultAction.payload;
        if (payload && payload.isDuplicate) {
          // Triggers visual warning card popup
          setDuplicateWarning(payload.complaint);
        } else {
          alert(payload?.message || 'Failed to submit complaint.');
        }
      } else {
        // Success
        alert('Complaint successfully filed!');
        // Reset states
        setTitle('');
        setDescription('');
        setLandmark('');
        setCity('');
        setLocState('');
        setCountry('');
        setPostalCode('');
        setIsAnonymous(false);
        setCompressedImages([]);
        setDuplicateWarning(null);
        setActiveTab('feed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action for resolving Duplicate trigger: citizen supports existing instead
  const handleSupportExisting = async () => {
    if (!duplicateWarning) return;
    const compId = duplicateWarning._id || duplicateWarning.id;
    
    await dispatch(upvoteComplaint(compId));
    await dispatch(followComplaint(compId));
    
    alert('Thank you! You upvoted and followed the existing complaint. Submitting duplicate cancelled.');
    
    // Clean states & redirect to feed
    setTitle('');
    setDescription('');
    setLandmark('');
    setCompressedImages([]);
    setDuplicateWarning(null);
    setActiveTab('feed');
  };

  // Detail View Click
  const handleViewDetails = (id) => {
    const found = complaints.find(c => c._id === id || c.id === id);
    if (found) {
      setSelectedComplaint(found);
    }
  };

  const handleCloseDetailModal = () => {
    setSelectedComplaint(null);
    setNavDetails(null);
    setUserCoords(null);
    setNavMode('driving');
  };

  const handleViewLocation = async (complaint) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setNavLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserCoords([userLat, userLng]);

        const [destLng, destLat] = complaint.location.coordinates;

        try {
          const res = await fetch(`/api/location/directions?origin=${userLat},${userLng}&destination=${destLat},${destLng}&mode=${navMode}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (data && data.success) {
            setNavDetails(data);
          } else {
            alert(data.message || 'Failed to fetch navigation directions.');
          }
        } catch (err) {
          alert('Error retrieving route directions.');
        } finally {
          setNavLoading(false);
        }
      },
      (err) => {
        setNavLoading(false);
        alert('Could not determine starting coordinates. Please enable browser GPS permissions.');
      }
    );
  };

  useEffect(() => {
    if (selectedComplaint && userCoords) {
      const [destLng, destLat] = selectedComplaint.location.coordinates;
      const [userLat, userLng] = userCoords;
      
      const fetchNewDirections = async () => {
        setNavLoading(true);
        try {
          const res = await fetch(`/api/location/directions?origin=${userLat},${userLng}&destination=${destLat},${destLng}&mode=${navMode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data && data.success) {
            setNavDetails(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setNavLoading(false);
        }
      };
      fetchNewDirections();
    }
  }, [navMode]);

  // Upvote Details click
  const handleDetailUpvote = async (id) => {
    await dispatch(upvoteComplaint(id));
    // refresh details
    const refreshed = complaints.find(c => c._id === id || c.id === id);
    setSelectedComplaint(refreshed);
  };

  // Follow Details click
  const handleDetailFollow = async (id) => {
    await dispatch(followComplaint(id));
    // refresh details
    const refreshed = complaints.find(c => c._id === id || c.id === id);
    setSelectedComplaint(refreshed);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="logo-icon" style={{ width: '32px', height: '32px' }}>
            <Sparkles size={16} />
          </div>
          <span className="logo-text" style={{ fontSize: '1.2rem' }}>CiviTrack</span>
        </div>
        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={20} />
        </button>
      </div>

      <div className="app-container">
        
        {/* Sidebar Overlay for mobile backdrop */}
        <div 
          className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
        
        {/* ====================================================
            SIDEBAR NAVIGATION
            ==================================================== */}
        <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div>
            <div className="logo-section" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="logo-icon">
                  <Sparkles size={22} />
                </div>
                <span className="logo-text">CiviTrack</span>
              </div>
              <button 
                type="button"
                className="btn-icon mobile-only-close" 
                style={{ display: 'none' }} 
                onClick={() => setIsSidebarOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

          <ul className="menu-list">
            <li>
              <button 
                className={`menu-link ${activeTab === 'feed' ? 'active' : ''}`}
                onClick={() => { setActiveTab('feed'); setIsSidebarOpen(false); }}
              >
                <FileText size={18} /> Community Feed
              </button>
            </li>
            <li>
              <button 
                className={`menu-link ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => { setActiveTab('map'); setIsSidebarOpen(false); }}
              >
                <Map size={18} /> Interactive Map
              </button>
            </li>
            <li>
              <button 
                className={`menu-link ${activeTab === 'report' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('report');
                  reverseGeocode(coords[0], coords[1]);
                  setIsSidebarOpen(false);
                }}
              >
                <PlusCircle size={18} style={{ color: 'var(--secondary)' }} /> Report Grievance
              </button>
            </li>
            <li>
              <button 
                className={`menu-link ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
              >
                <User size={18} /> Citizen Profile
              </button>
            </li>

            {user?.role === 'admin' && (
              <li style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button 
                  className="menu-link active-admin"
                  onClick={() => { navigate('/admin'); setIsSidebarOpen(false); }}
                >
                  <Sparkles size={18} /> Admin Command
                </button>
              </li>
            )}
          </ul>
        </div>

        <div>
          {/* User badge */}
          <div className="user-sidebar-card">
            <img 
              className="avatar"
              src={user?.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150"} 
              alt={user?.name} 
            />
            <div style={{ overflow: 'hidden' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.name}
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>
                {user?.role} Portal
              </span>
            </div>
          </div>

          {/* Theme & Logout Buttons */}
          <div className="flex-row" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
            <button className="btn-icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} 
              onClick={() => { handleLogout(); setIsSidebarOpen(false); }}
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          MAIN APP PANEL
          ==================================================== */}
      <div className="main-content">
        
        {/* ====================================================
            FEED TAB
            ==================================================== */}
        {activeTab === 'feed' && (
          <div className="flex-column fade-in">
            <div className="flex-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: '2rem' }}>Civic Grievances</h1>
                <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                  Review and support infrastructure complaints reported by other local residents.
                </p>
              </div>
              
              <button className="btn btn-primary" onClick={() => setActiveTab('report')}>
                <PlusCircle size={18} /> File New Grievance
              </button>
            </div>

            {/* Filter controls */}
            <div className="card grid-3" style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="All">All Categories</option>
                  <option value="Road Damage">Road Damage</option>
                  <option value="Garbage">Garbage</option>
                  <option value="Street Light">Street Light</option>
                  <option value="Water Leakage">Water Leakage</option>
                  <option value="Drainage">Drainage</option>
                  <option value="Public Property Damage">Public Property Damage</option>
                  <option value="Tourist Place Issue">Tourist Place Issue</option>
                  <option value="Traffic Problem">Traffic Problem</option>
                  <option value="Safety Issue">Safety Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sort By</label>
                <select className="form-control" value={filterSort} onChange={e => setFilterSort(e.target.value)}>
                  <option value="newest">Newest First</option>
                  <option value="upvotes">Most Voted (Top Priority)</option>
                </select>
              </div>
            </div>

            {/* Grid layout */}
            {loading ? (
              <div className="grid-2">
                {[1, 2, 3, 4].map(idx => (
                  <div key={idx} className="card shimmer-loading" style={{ height: '220px' }}></div>
                ))}
              </div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">
                <MapPin className="empty-icon" />
                <h3>No Complaints Found</h3>
                <p style={{ color: 'var(--text-light)', maxWidth: '400px', margin: '0.5rem 0 1.5rem 0' }}>
                  There are currently no reported issues matching your filter criteria. Be the first to file!
                </p>
                <button className="btn btn-primary" onClick={() => setActiveTab('report')}>
                  Report an Issue
                </button>
              </div>
            ) : (
              <div className="grid-2">
                {complaints.map((c) => (
                  <div key={c._id || c.id} className="card card-hover flex-column" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span className={`badge badge-${c.status.toLowerCase().replace(' ', '')}`}>
                          {c.status}
                        </span>
                        <span className={`badge badge-priority-${c.priority.toLowerCase()}`}>
                          {c.priority}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>{c.title}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.description}
                      </p>

                      <div className="flex-row" style={{ marginTop: '0.75rem', color: 'var(--text-light)', fontSize: '0.8rem' }}>
                        <MapPin size={14} />
                        <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', flex: 1 }}>
                          {c.location.landmark ? `${c.location.landmark}, ` : ''}{c.location.address}
                        </span>
                      </div>

                      <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Reported by: <strong>{c.isAnonymous ? 'Anonymous Citizen' : (c.citizen?.name || 'Citizen')}</strong>
                      </div>
                    </div>

                    <div className="flex-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '1rem', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        Upvotes: <strong>{c.upvotes?.length || 0}</strong>
                      </span>
                      
                      <button className="btn btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handleViewDetails(c._id || c.id)}>
                        <Eye size={12} /> View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            MAP TAB
            ==================================================== */}
        {activeTab === 'map' && (
          <div className="flex-column fade-in" style={{ height: '100%' }}>
            <div>
              <h1 style={{ fontSize: '2rem' }}>Interactive Mapping Command</h1>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                Visualize reported grievances in your area. Markers indicate current status.
              </p>
            </div>

            <MapDashboard complaints={complaints} onViewDetails={handleViewDetails} />
          </div>
        )}

        {/* ====================================================
            REPORT TAB
            ==================================================== */}
        {activeTab === 'report' && (
          <div className="flex-column fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div>
              <h1 style={{ fontSize: '2rem' }}>Report Civic Issue</h1>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                Submit accurate coordinates and image evidence. Our Gemini AI will index category priorities automatically.
              </p>
            </div>

            <form onSubmit={e => handleComplaintSubmit(e, false)} className="card flex-column" style={{ padding: '2rem' }}>
              
              <div className="form-group">
                <label className="form-label">Issue Title *</label>
                <input 
                  type="text" 
                  placeholder="Provide a short descriptive title (e.g. Large pothole in center lane)" 
                  className="form-control"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Category Selector</label>
                  <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Road Damage">Road Damage</option>
                    <option value="Garbage">Garbage</option>
                    <option value="Street Light">Street Light</option>
                    <option value="Water Leakage">Water Leakage</option>
                    <option value="Drainage">Drainage</option>
                    <option value="Public Property Damage">Public Property Damage</option>
                    <option value="Tourist Place Issue">Tourist Place Issue</option>
                    <option value="Traffic Problem">Traffic Problem</option>
                    <option value="Safety Issue">Safety Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Landmark / Sub-Area</label>
                  <input 
                    type="text" 
                    placeholder="Near City Central Park / Bank ATM" 
                    className="form-control"
                    value={landmark}
                    onChange={e => setLandmark(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Grievance Description *</label>
                <textarea 
                  placeholder="Detail the issue. Describe size, damage level, safety hazards, or duration if known." 
                  className="form-control"
                  style={{ height: '100px', resize: 'vertical' }}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group flex-row" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input 
                  type="checkbox" 
                  id="isAnonymous" 
                  checked={isAnonymous} 
                  onChange={e => setIsAnonymous(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isAnonymous" style={{ fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 500 }}>
                  Submit Complaint Anonymously (Hide your name from public views)
                </label>
              </div>

              {/* Photos Gallery */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Image Evidence Upload</span>
                  <span className="ai-badge"><Sparkles size={10} /> Gemini Auto-Categorize</span>
                </label>
                
                <div 
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => fileInputRef.current.click()}
                >
                  <Upload size={24} style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                    Click to drag & drop photos here. Supports PNG, JPG, WebP up to 5MB.
                  </p>
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef}
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleImageChange}
                  />
                </div>

                {compressedImages.length > 0 && (
                  <div className="image-grid">
                    {compressedImages.map((img, idx) => (
                      <div key={idx} className="image-preview">
                        <img src={img.previewUrl} alt="Compressed evidence" />
                        <button type="button" className="remove-btn" onClick={() => handleRemoveImage(idx)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Coordinates Selector Leaflet Map */}
              <div className="form-group">
                <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                  <label className="form-label">Pinpoint Exact Location *</label>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={handleGPSDetect}>
                    <MapPin size={12} /> Auto-Detect Current GPS
                  </button>
                </div>

                <div style={{ height: '250px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', margin: '0.5rem 0' }}>
                  <MapContainer center={coords} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={coords} />
                    <MapClickEvents onMapClick={handleMapClick} />
                  </MapContainer>
                </div>

                <input 
                  type="text" 
                  readOnly 
                  className="form-control" 
                  style={{ backgroundColor: 'var(--bg-app)', fontSize: '0.85rem' }}
                  value={address}
                  placeholder="Click on the map above to select address"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={submitLoading}>
                {submitLoading ? 'Analyzing image & submitting complaint...' : 'File Official Grievance'}
              </button>

            </form>
          </div>
        )}

        {/* ====================================================
            PROFILE TAB
            ==================================================== */}
        {activeTab === 'profile' && (
          <div className="flex-column fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card flex-row" style={{ padding: '2rem' }}>
              <img 
                className="avatar" 
                src={user?.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150"} 
                alt={user?.name}
                style={{ width: '80px', height: '80px' }}
              />
              <div>
                <h2>{user?.name}</h2>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{user?.email}</p>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="badge badge-assigned">{user?.role} Account</span>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card flex-column">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Account Details</h3>
                <div className="form-group">
                  <span className="form-label">Mobile Number</span>
                  <input type="text" className="form-control" readOnly value={user?.mobileNumber || ''} />
                </div>
                <div className="form-group">
                  <span className="form-label">Primary Residence Address</span>
                  <textarea className="form-control" readOnly style={{ height: '70px', resize: 'none' }} value={user?.address || ''} />
                </div>
              </div>

              <div className="card flex-column">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Account Statistics</h3>
                <div className="responsive-grid-2" style={{ height: '100%' }}>
                  <div className="glass flex-column" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', alignContent: 'center', textAlign: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Reported Grievances</span>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {complaints.filter(c => c.citizen?.id === user?.id).length}
                    </span>
                  </div>
                  <div className="glass flex-column" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', alignContent: 'center', textAlign: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Active Subscriptions</span>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      {complaints.filter(c => c.followers?.includes(user?.id)).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ====================================================
          MODAL: DUPLICATE COMPLAINT DETECTED INTERCEPT
          ==================================================== */}
      {duplicateWarning && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', border: '2px solid var(--status-progress)' }}>
            <div className="modal-header" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-progress)', fontSize: '1.2rem' }}>
                <ShieldAlert size={22} />
                Duplicate Complaint Detected!
              </h3>
            </div>
            
            <div className="modal-body flex-column">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Another citizen has already reported a similar issue within 100 meters of your selected location:
              </p>
              
              <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                  <span className={`badge badge-${duplicateWarning.status.toLowerCase().replace(' ', '')}`}>{duplicateWarning.status}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{new Date(duplicateWarning.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.1rem' }}>{duplicateWarning.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>📍 {duplicateWarning.location.address}</p>
                {duplicateWarning.images && duplicateWarning.images.length > 0 && (
                  <div style={{ width: '100%', height: '120px', overflow: 'hidden', borderRadius: '4px', marginTop: '0.5rem' }}>
                    <img src={duplicateWarning.images[0].url} alt="Duplicate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-light)', lineHeight: '1.4' }}>
                💡 Recommendation: Upvote and Follow this existing grievance. Most voted issues bubble to the top of the Admin dashboard, accelerating resolution!
              </p>
            </div>

            <div className="modal-footer" style={{ backgroundColor: 'var(--bg-app)' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => handleComplaintSubmit(null, true)} // bypass=true
                disabled={submitLoading}
              >
                File Anyway
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSupportExisting}
              >
                <ThumbsUp size={16} /> Upvote & Follow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: VIEW DETAILED COMPLAINT DETAILS & TIMELINE
          ==================================================== */}
      {selectedComplaint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <span className="badge badge-assigned" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                  Grievance ID: {selectedComplaint._id || selectedComplaint.id}
                </span>
                <h3 style={{ fontSize: '1.3rem' }}>{selectedComplaint.title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                  Reported by: <strong>{selectedComplaint.isAnonymous ? 'Anonymous Citizen' : (selectedComplaint.citizen?.name || 'Citizen')}</strong>
                  {selectedComplaint.isAnonymous && <span style={{ marginLeft: '0.5rem', color: 'var(--secondary)', fontWeight: 600 }}>(Anonymous Submit)</span>}
                </div>
              </div>
              <button className="btn-icon" onClick={handleCloseDetailModal}>×</button>
            </div>

            <div className="modal-body flex-column">
              <div className="flex-row" style={{ flexWrap: 'wrap' }}>
                <span className={`badge badge-${selectedComplaint.status.toLowerCase().replace(' ', '')}`}>
                  {selectedComplaint.status}
                </span>
                <span className={`badge badge-priority-${selectedComplaint.priority.toLowerCase()}`}>
                  {selectedComplaint.priority} Priority
                </span>
                <span className="badge badge-priority-low">
                  Category: {selectedComplaint.category}
                </span>
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <h5 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Description</h5>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-muted)' }}>{selectedComplaint.description}</p>
              </div>

              {selectedComplaint.geminiSummary && (
                <div className="glass" style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #A855F7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                    <span className="ai-badge" style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}><Sparkles size={8} /> AI Summary</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{selectedComplaint.geminiSummary}"</p>
                </div>
              )}

              {/* Exact Location details and Map */}
              <div>
                <h5 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Address details & Coordinates</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>📍 {selectedComplaint.location.address}</p>
                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-light)' }}>
                  GPS: {selectedComplaint.location.coordinates[1].toFixed(5)}, {selectedComplaint.location.coordinates[0].toFixed(5)}
                </p>

                {/* Single Complaint Leaflet Map */}
                <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', margin: '0.75rem 0', position: 'relative', zIndex: 1 }}>
                  <MapContainer 
                    center={[selectedComplaint.location.coordinates[1], selectedComplaint.location.coordinates[0]]} 
                    zoom={14} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {/* Destination Marker */}
                    <Marker position={[selectedComplaint.location.coordinates[1], selectedComplaint.location.coordinates[0]]} />
                    
                    {/* User Starting Marker */}
                    {userCoords && <Marker position={userCoords} />}
                    
                    {/* Route Polyline */}
                    {navDetails?.coordinates && (
                      <Polyline positions={navDetails.coordinates} color="var(--primary)" weight={4} />
                    )}
                  </MapContainer>
                </div>

                {/* View Location Navigation Card */}
                <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem', marginTop: '0.5rem' }}>
                  {navDetails ? (
                    <div className="flex-column" style={{ gap: '0.5rem' }}>
                      <div className="flex-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>Route Details</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            🚗 {navDetails.distance} ({navDetails.duration})
                          </span>
                        </div>
                        
                        <div className="flex-row" style={{ gap: '0.25rem' }}>
                          {['driving', 'walking', 'two-wheeler'].map(mode => (
                            <button 
                              key={mode} 
                              type="button" 
                              onClick={() => setNavMode(mode)}
                              className={`btn ${navMode === mode ? 'btn-primary' : 'btn-outline'}`}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              {mode === 'driving' ? 'Driving' : mode === 'walking' ? 'Walking' : '2-Wheeler'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Turn-by-Turn Instruction List */}
                      <div style={{ maxHeight: '110px', overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)' }}>Turn-by-Turn Directions:</span>
                        {navDetails.steps && navDetails.steps.length > 0 ? (
                          navDetails.steps.map((step, idx) => (
                            <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{idx + 1}. {step.instruction}</span>
                              <span style={{ color: 'var(--text-light)', fontSize: '0.7rem' }}>{step.distance}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>No step details available</div>
                        )}
                      </div>

                      {/* Google Maps link */}
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${selectedComplaint.location.coordinates[1]},${selectedComplaint.location.coordinates[0]}&travelmode=${navMode === 'two-wheeler' ? 'bicycling' : navMode}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', textDecoration: 'none', display: 'block', padding: '0.5rem 0' }}
                      >
                        Open Route in Google Maps App
                      </a>
                    </div>
                  ) : (
                    <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Need directions?</span>
                        <h6 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Calculate path to complaint</h6>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        disabled={navLoading} 
                        onClick={() => handleViewLocation(selectedComplaint)}
                      >
                        {navLoading ? 'Locating...' : 'View Location & Navigate'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos before/after */}
              <div>
                <h5 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Photo Evidence</h5>
                <div className="responsive-grid-2">
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Reported State (Before)</span>
                    <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img 
                        src={selectedComplaint.images && selectedComplaint.images.length > 0 ? selectedComplaint.images[0].url : "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?q=80&w=300"} 
                        alt="Before" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem' }}>Resolution State (After)</span>
                    <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedComplaint.resolutionDetails?.afterImages?.length > 0 ? (
                        <img 
                          src={selectedComplaint.resolutionDetails.afterImages[0]} 
                          alt="After" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Pending Resolution</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline tracking */}
              <div>
                <h5 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Resolution Timeline</h5>
                <div className="timeline">
                  {selectedComplaint.statusTimeline?.map((node, index) => (
                    <div key={index} className="timeline-item">
                      <div className={`timeline-badge ${node.status === 'Resolved' ? 'status-resolved' : 'active'}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-date">
                          {new Date(node.timestamp).toLocaleString()} • Updated by {node.updatedBy}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                          Transitioned to: <span style={{ color: 'var(--primary)' }}>{node.status}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{node.remarks}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div className="flex-row">
                <button 
                  className="btn btn-outline"
                  style={{
                    backgroundColor: selectedComplaint.upvotes?.includes(user?.id) ? 'rgba(37, 99, 235, 0.1)' : '',
                    borderColor: selectedComplaint.upvotes?.includes(user?.id) ? 'var(--primary)' : ''
                  }}
                  onClick={() => handleDetailUpvote(selectedComplaint._id || selectedComplaint.id)}
                >
                  <ThumbsUp size={14} style={{ color: selectedComplaint.upvotes?.includes(user?.id) ? 'var(--primary)' : '' }} /> 
                  Upvote ({selectedComplaint.upvotes?.length || 0})
                </button>
                <button 
                  className="btn btn-outline"
                  style={{
                    backgroundColor: selectedComplaint.followers?.includes(user?.id) ? 'rgba(16, 185, 129, 0.1)' : '',
                    borderColor: selectedComplaint.followers?.includes(user?.id) ? 'var(--secondary)' : ''
                  }}
                  onClick={() => handleDetailFollow(selectedComplaint._id || selectedComplaint.id)}
                >
                  <Heart size={14} style={{ color: selectedComplaint.followers?.includes(user?.id) ? 'var(--secondary)' : '' }} />
                  {selectedComplaint.followers?.includes(user?.id) ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>
              <button className="btn btn-primary" onClick={handleCloseDetailModal}>Close Pane</button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
