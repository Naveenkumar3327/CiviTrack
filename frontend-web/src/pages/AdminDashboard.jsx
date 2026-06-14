import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  fetchComplaints, updateComplaintStatus, resolveComplaint, 
  closeComplaint, fetchAdminAnalytics 
} from '../store/complaintSlice';
import { logout } from '../store/authSlice';
import { 
  ShieldAlert, Sparkles, BarChart3, TrendingUp, Users, LogOut, CheckCircle, 
  Clock, AlertTriangle, Hammer, CheckSquare, Search, Eye, Filter, Upload, MapPin 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, token } = useSelector(state => state.auth);
  const { complaints, analytics, loading, analyticsLoading } = useSelector(state => state.complaints);

  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'analytics' | 'notifications'
  const [selectedAdminComplaint, setSelectedAdminComplaint] = useState(null);
  
  // Admin Action States
  const [actionStatus, setActionStatus] = useState('Under Review');
  const [actionPriority, setActionPriority] = useState('Medium');
  const [actionRemarks, setActionRemarks] = useState('');
  
  // Resolve Form States
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveImages, setResolveImages] = useState([]);
  const resolveFileInputRef = useRef(null);

  // Search & Filters for Admin table
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategory, setAdminCategory] = useState('All');
  const [adminStatus, setAdminStatus] = useState('All');

  // Navigation States
  const [navMode, setNavMode] = useState('driving');
  const [navDetails, setNavDetails] = useState(null);
  const [navLoading, setNavLoading] = useState(false);
  const [adminCoords, setAdminCoords] = useState(null);

  // Verify Role
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    } else {
      dispatch(fetchComplaints());
      dispatch(fetchAdminAnalytics());
    }
  }, [token, user, navigate, dispatch]);

  const handleAdminLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Filter complaints for administrative view
  const getFilteredAdminComplaints = () => {
    let result = complaints;

    if (adminSearch) {
      const q = adminSearch.toLowerCase();
      result = result.filter(c => 
        c.title?.toLowerCase().includes(q) ||
        c.location?.address?.toLowerCase().includes(q) ||
        c._id?.toString().includes(q)
      );
    }

    if (adminCategory !== 'All') {
      result = result.filter(c => c.category === adminCategory);
    }

    if (adminStatus !== 'All') {
      result = result.filter(c => c.status === adminStatus);
    }

    return result;
  };

  // Row selection
  const handleSelectRow = (c) => {
    setSelectedAdminComplaint(c);
    setActionStatus(c.status === 'Resolved' || c.status === 'Closed' ? c.status : 'Under Review');
    setActionPriority(c.priority);
    setActionRemarks('');
    setResolveNotes('');
    setResolveImages([]);
    setNavDetails(null);
    setAdminCoords(null);
    setNavMode('driving');
  };

  // Dispatches status thunk
  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdminComplaint) return;
    
    const id = selectedAdminComplaint._id || selectedAdminComplaint.id;
    await dispatch(updateComplaintStatus({
      id,
      status: actionStatus,
      remarks: actionRemarks || `Administrative remark: Status changed to ${actionStatus}`,
      priority: actionPriority
    }));

    alert(`Status updated to ${actionStatus}`);
    dispatch(fetchAdminAnalytics()); // Refresh analytics
    
    // Refresh local selected
    const updatedList = await dispatch(fetchComplaints());
    const refreshed = updatedList.payload.find(c => c._id === id || c.id === id);
    setSelectedAdminComplaint(refreshed);
  };

  // Dispatches resolution solver thunk
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdminComplaint) return;
    
    const id = selectedAdminComplaint._id || selectedAdminComplaint.id;
    const formData = new FormData();
    formData.append('remarks', resolveNotes || 'Administrative resolution complete.');
    
    resolveImages.forEach((file) => {
      formData.append('images', file);
    });

    await dispatch(resolveComplaint({ id, formData }));
    alert('Complaint successfully marked as Resolved!');
    
    dispatch(fetchAdminAnalytics());
    
    const updatedList = await dispatch(fetchComplaints());
    const refreshed = updatedList.payload.find(c => c._id === id || c.id === id);
    setSelectedAdminComplaint(refreshed);
  };

  // Dispatches close thunk
  const handleCloseSubmit = async () => {
    if (!selectedAdminComplaint) return;
    const id = selectedAdminComplaint._id || selectedAdminComplaint.id;
    
    await dispatch(closeComplaint(id));
    alert('Complaint successfully Closed and archived.');
    
    dispatch(fetchAdminAnalytics());
    
    const updatedList = await dispatch(fetchComplaints());
    const refreshed = updatedList.payload.find(c => c._id === id || c.id === id);
    setSelectedAdminComplaint(refreshed);
  };

  const handleViewLocation = async (complaint) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setNavLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const adminLat = pos.coords.latitude;
        const adminLng = pos.coords.longitude;
        setAdminCoords([adminLat, adminLng]);

        const [destLng, destLat] = complaint.location.coordinates;

        try {
          const res = await fetch(`/api/location/directions?origin=${adminLat},${adminLng}&destination=${destLat},${destLng}&mode=${navMode}`, {
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
        alert('Could not determine admin coordinates. Please enable browser GPS permissions.');
      }
    );
  };

  useEffect(() => {
    if (selectedAdminComplaint && adminCoords) {
      const [destLng, destLat] = selectedAdminComplaint.location.coordinates;
      const [adminLat, adminLng] = adminCoords;
      
      const fetchNewDirections = async () => {
        setNavLoading(true);
        try {
          const res = await fetch(`/api/location/directions?origin=${adminLat},${adminLng}&destination=${destLat},${destLng}&mode=${navMode}`, {
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

  const handleResolveImageChange = (e) => {
    if (e.target.files) {
      setResolveImages(Array.from(e.target.files));
    }
  };

  const categories = [
    'All', 'Road Damage', 'Garbage', 'Street Light', 'Water Leakage', 'Drainage', 
    'Public Property Damage', 'Tourist Place Issue', 'Traffic Problem', 'Safety Issue', 'Other'
  ];
  const statuses = ['All', 'Pending', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

  return (
    <div className="app-container">
      
      {/* ====================================================
          ADMIN SIDEBAR
          ==================================================== */}
      <div className="sidebar" style={{ borderRight: '1px solid var(--border)' }}>
        <div>
          <div className="logo-section">
            <div className="logo-icon" style={{ backgroundColor: 'var(--secondary)' }}>
              <ShieldAlert size={22} />
            </div>
            <span className="logo-text">CiviTrack</span>
          </div>

          <ul className="menu-list">
            <li>
              <button 
                className={`menu-link ${activeSubTab === 'list' ? 'active-admin' : ''}`}
                onClick={() => setActiveSubTab('list')}
              >
                <Clock size={18} /> Grievance Queue
              </button>
            </li>
            <li>
              <button 
                className={`menu-link ${activeSubTab === 'analytics' ? 'active-admin' : ''}`}
                onClick={() => setActiveSubTab('analytics')}
              >
                <BarChart3 size={18} /> System Analytics
              </button>
            </li>
            <li>
              <button 
                className={`menu-link ${activeSubTab === 'notifications' ? 'active-admin' : ''}`}
                onClick={() => setActiveSubTab('notifications')}
              >
                <TrendingUp size={18} /> Notification Logs
              </button>
            </li>
            <li style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button className="menu-link" onClick={() => navigate('/dashboard')}>
                <Users size={18} /> Citizen Mode
              </button>
            </li>
          </ul>
        </div>

        <div>
          <div className="user-sidebar-card">
            <img 
              className="avatar avatar-admin"
              src={user?.profilePicture || "https://images.unsplash.com/photo-1572417884940-c24659be6068?q=80&w=150"} 
              alt={user?.name} 
            />
            <div style={{ overflow: 'hidden' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.name}
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                System Administrator
              </span>
            </div>
          </div>

          <div className="flex-row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%' }} onClick={handleAdminLogout}>
              <LogOut size={14} /> Close Session
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          ADMIN BODY
          ==================================================== */}
      <div className="main-content">
        
        {/* ====================================================
            GRIEVANCE QUEUE TAB
            ==================================================== */}
        {activeSubTab === 'list' && (
          <div className="flex-column fade-in">
            <div>
              <h1 style={{ fontSize: '2rem' }}>Administrative Grievance Queue</h1>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                Update resolution stages, adjust category priorities, and upload solved images.
              </p>
            </div>

            {/* KPI Metrics */}
            {analytics?.stats && (
              <div className="grid-4">
                <div className="card stat-card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Pending Review</span>
                    <div className="stat-value">{analytics.stats.pending + analytics.stats.underReview}</div>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-pending)' }}>
                    <AlertTriangle size={24} />
                  </div>
                </div>

                <div className="card stat-card" style={{ borderLeft: '4px solid var(--status-assigned)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Assigned Tasks</span>
                    <div className="stat-value">{analytics.stats.assigned + analytics.stats.inProgress}</div>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--status-assigned)' }}>
                    <Hammer size={24} />
                  </div>
                </div>

                <div className="card stat-card" style={{ borderLeft: '4px solid var(--status-resolved)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Resolved Issues</span>
                    <div className="stat-value">{analytics.stats.resolved}</div>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-resolved)' }}>
                    <CheckCircle size={24} />
                  </div>
                </div>

                <div className="card stat-card" style={{ borderLeft: '4px solid var(--status-closed)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Closed Grievances</span>
                    <div className="stat-value">{analytics.stats.closed}</div>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)', color: 'var(--status-closed)' }}>
                    <CheckSquare size={24} />
                  </div>
                </div>
              </div>
            )}

            <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
              
              {/* Complaints Table */}
              <div className="card flex-column" style={{ padding: '1rem', overflowX: 'auto' }}>
                
                {/* Search / Filters */}
                <div className="flex-row" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ flex: '2 1 200px', margin: 0 }}>
                    <input 
                      type="text" 
                      placeholder="Search ID, title..." 
                      className="form-control"
                      value={adminSearch}
                      onChange={e => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1 1 120px', margin: 0 }}>
                    <select className="form-control" value={adminCategory} onChange={e => setAdminCategory(e.target.value)}>
                      {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 120px', margin: 0 }}>
                    <select className="form-control" value={adminStatus} onChange={e => setAdminStatus(e.target.value)}>
                      {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Grid Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-light)', fontWeight: 600 }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>ID</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Title</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Priority</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAdminComplaints().map(c => (
                      <tr 
                        key={c._id || c.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border)', 
                          cursor: 'pointer',
                          backgroundColor: (selectedAdminComplaint?._id === c._id || selectedAdminComplaint?.id === c.id) ? 'var(--bg-app)' : 'transparent'
                        }}
                        onClick={() => handleSelectRow(c)}
                      >
                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: 'var(--text-light)' }}>
                          {(c._id || c.id).substring(0, 8)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{c.title}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{c.category}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span className={`badge badge-priority-${c.priority?.toLowerCase()}`}>{c.priority}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span className={`badge badge-${c.status?.toLowerCase().replace(' ', '')}`}>{c.status}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <button className="btn btn-icon" style={{ padding: '0.25rem' }} onClick={() => handleSelectRow(c)}>
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Control Panel */}
              <div className="card flex-column" style={{ position: 'sticky', top: '20px' }}>
                {selectedAdminComplaint ? (
                  <div className="flex-column">
                    <div>
                      <span className="badge badge-assigned" style={{ fontSize: '0.65rem' }}>ID: {selectedAdminComplaint._id || selectedAdminComplaint.id}</span>
                      <h3 style={{ fontSize: '1.2rem', marginTop: '0.25rem' }}>{selectedAdminComplaint.title}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <MapPin size={12} /> {selectedAdminComplaint.location.landmark ? `${selectedAdminComplaint.location.landmark}, ` : ''}{selectedAdminComplaint.location.address}
                      </p>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)' }}>Citizen Complaint:</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                        "{selectedAdminComplaint.description}"
                      </p>
                    </div>

                    {/* Admin Location & Navigation Card */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Complaint Location & GPS</h4>
                      <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                        Coords: {selectedAdminComplaint.location.coordinates[1].toFixed(5)}, {selectedAdminComplaint.location.coordinates[0].toFixed(5)}
                      </p>

                      {/* Embedded Leaflet Map for Single marker */}
                      <div style={{ height: '180px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', margin: '0.5rem 0', position: 'relative', zIndex: 1 }}>
                        <MapContainer 
                          center={[selectedAdminComplaint.location.coordinates[1], selectedAdminComplaint.location.coordinates[0]]} 
                          zoom={14} 
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[selectedAdminComplaint.location.coordinates[1], selectedAdminComplaint.location.coordinates[0]]} />
                          
                          {adminCoords && <Marker position={adminCoords} />}
                          
                          {navDetails?.coordinates && (
                            <Polyline positions={navDetails.coordinates} color="var(--primary)" weight={4} />
                          )}
                        </MapContainer>
                      </div>

                      {/* Directions details */}
                      <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem', marginTop: '0.5rem' }}>
                        {navDetails ? (
                          <div className="flex-column" style={{ gap: '0.5rem' }}>
                            <div className="flex-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>Route Details</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
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
                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                                  >
                                    {mode === 'driving' ? 'Drive' : mode === 'walking' ? 'Walk' : '2-Wh'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&origin=${adminCoords[0]},${adminCoords[1]}&destination=${selectedAdminComplaint.location.coordinates[1]},${selectedAdminComplaint.location.coordinates[0]}&travelmode=${navMode === 'two-wheeler' ? 'bicycling' : navMode}`}
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ width: '100%', textAlign: 'center', fontSize: '0.75rem', textDecoration: 'none', display: 'block', padding: '0.4rem 0' }}
                            >
                              Open Directions in Google Maps
                            </a>
                          </div>
                        ) : (
                          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Navigate to issue</span>
                            <button 
                              type="button" 
                              className="btn btn-outline" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              disabled={navLoading} 
                              onClick={() => handleViewLocation(selectedAdminComplaint)}
                            >
                              {navLoading ? 'Locating...' : 'Get Route'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gemini Assist Box */}
                    {selectedAdminComplaint.geminiSummary && (
                      <div className="glass" style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #A855F7' }}>
                        <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span className="ai-badge" style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}><Sparkles size={8} /> Gemini Suggested</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Priority: <strong>{selectedAdminComplaint.geminiPriority}</strong></span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          "{selectedAdminComplaint.geminiSummary}"
                        </p>
                      </div>
                    )}

                    {/* Status & Priority Modifier Form */}
                    {selectedAdminComplaint.status !== 'Resolved' && selectedAdminComplaint.status !== 'Closed' && (
                      <form onSubmit={handleStatusUpdateSubmit} className="flex-column" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Update Stage Status</h4>
                        
                        <div className="form-group">
                          <label className="form-label">Set Stage</label>
                          <select className="form-control" value={actionStatus} onChange={e => setActionStatus(e.target.value)}>
                            <option value="Under Review">Under Review</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Set Priority</label>
                          <select className="form-control" value={actionPriority} onChange={e => setActionPriority(e.target.value)}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Public remarks</label>
                          <textarea 
                            placeholder="Add updates for subscriber alerts (e.g. Dispatched squad for verification)" 
                            className="form-control"
                            style={{ height: '70px', resize: 'none' }}
                            value={actionRemarks}
                            onChange={e => setActionRemarks(e.target.value)}
                          />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                          Update Grievance
                        </button>
                      </form>
                    )}

                    {/* Resolution Solvers Forms */}
                    {selectedAdminComplaint.status !== 'Resolved' && selectedAdminComplaint.status !== 'Closed' && (
                      <form onSubmit={handleResolveSubmit} className="flex-column" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--secondary)' }}>
                          <CheckCircle size={16} /> Submit Issue Resolution
                        </h4>
                        
                        <div className="form-group">
                          <label className="form-label">Upload Completed Photo Evidence</label>
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem' }}
                            onClick={() => resolveFileInputRef.current.click()}
                          >
                            <Upload size={14} /> {resolveImages.length > 0 ? `${resolveImages.length} Image Selected` : 'Choose After Photo'}
                          </button>
                          <input 
                            type="file" 
                            ref={resolveFileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleResolveImageChange}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Resolution Notes</label>
                          <textarea 
                            placeholder="Add resolution explanation (e.g. Pothole filled and sealed with concrete)" 
                            className="form-control"
                            style={{ height: '70px', resize: 'none' }}
                            value={resolveNotes}
                            onChange={e => setResolveNotes(e.target.value)}
                            required
                          />
                        </div>

                        <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                          Resolve Complaint
                        </button>
                      </form>
                    )}

                    {/* Close Grievance form */}
                    {selectedAdminComplaint.status === 'Resolved' && (
                      <div className="flex-column" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Archive Grievance</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: '1.4' }}>
                          This complaint has been solved. Please verify the resolution note and lock/close the ticket permanently.
                        </p>
                        
                        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--secondary)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>Resolution Note:</span>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            "{selectedAdminComplaint.resolutionDetails?.remarks}"
                          </p>
                        </div>

                        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleCloseSubmit}>
                          Verify & Close Ticket
                        </button>
                      </div>
                    )}

                    {selectedAdminComplaint.status === 'Closed' && (
                      <div className="glass flex-column" style={{ borderLeft: '4px solid var(--status-closed)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', marginTop: '1rem' }}>
                        <CheckSquare size={24} style={{ color: 'var(--status-closed)', alignSelf: 'center' }} />
                        <h4 style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Grievance Closed</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                          This issue has been closed and archived. No further actions can be performed.
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 0' }}>
                    <AlertTriangle size={24} style={{ alignSelf: 'center', marginBottom: '0.5rem', display: 'block', margin: '0 auto' }} />
                    <p style={{ fontSize: '0.85rem' }}>Select a grievance record from the queue table list to load administrative actions.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ====================================================
            ANALYTICS TAB
            ==================================================== */}
        {activeSubTab === 'analytics' && (
          <div className="flex-column fade-in">
            <div>
              <h1 style={{ fontSize: '2rem' }}>Civic Analytics Command Center</h1>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                Live dashboards monitoring city grievance volume, category density, and response times.
              </p>
            </div>

            {analyticsLoading ? (
              <div className="card shimmer-loading" style={{ height: '350px' }}></div>
            ) : analytics ? (
              <div className="flex-column">
                
                {/* Visual Charts Layout */}
                <div className="grid-2">
                  
                  {/* Category split */}
                  <div className="card flex-column">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Category Distribution</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {Object.entries(analytics.categories || {}).map(([key, val]) => {
                        const total = Object.values(analytics.categories).reduce((a, b) => a + b, 0);
                        const percent = total > 0 ? (val / total) * 100 : 0;
                        return (
                          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <span>{key}</span>
                              <strong>{val} ({percent.toFixed(0)}%)</strong>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${percent}%`, backgroundColor: 'var(--primary)', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Areas */}
                  <div className="card flex-column">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Top Neighborhood Hotspots</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-light)' }}>
                          <th style={{ padding: '0.5rem' }}>Area / Ward</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Active Complaints</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topAreas?.map((area, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{area.name}</td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: 'var(--status-pending)', fontWeight: 'bold' }}>{area.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* Monthly Trend simulated block */}
                <div className="card flex-column">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Monthly Volume Trends (Submitted vs. Resolved)</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', padding: '1rem 0', gap: '1rem', borderBottom: '2px solid var(--border)' }}>
                    {analytics.monthlyTrends?.map((item, idx) => {
                      const maxVal = Math.max(...analytics.monthlyTrends.map(t => Math.max(t.submitted, t.resolved))) || 1;
                      const subHeight = (item.submitted / maxVal) * 100;
                      const resHeight = (item.resolved / maxVal) * 100;

                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', width: '100%', gap: '4px', height: '120px', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <div 
                              style={{ width: '15px', height: `${subHeight}%`, backgroundColor: 'var(--primary)', borderRadius: '2px', position: 'relative' }}
                              title={`Submitted: ${item.submitted}`}
                            ></div>
                            <div 
                              style={{ width: '15px', height: `${resHeight}%`, backgroundColor: 'var(--secondary)', borderRadius: '2px', position: 'relative' }}
                              title={`Resolved: ${item.resolved}`}
                            ></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.month}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex-row" style={{ justifyContent: 'center', fontSize: '0.8rem', gap: '2rem', marginTop: '0.5rem' }}>
                    <div className="flex-row" style={{ gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary)', display: 'inline-block', borderRadius: '2px' }}></span>
                      <span>Grievances Filed</span>
                    </div>
                    <div className="flex-row" style={{ gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--secondary)', display: 'inline-block', borderRadius: '2px' }}></span>
                      <span>Tickets Solved</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <p>Failed to compile analytics details.</p>
            )}
          </div>
        )}

        {/* ====================================================
            NOTIFICATION LOGS TAB
            ==================================================== */}
        {activeSubTab === 'notifications' && (
          <div className="flex-column fade-in" style={{ maxWidth: '750px' }}>
            <div>
              <h1 style={{ fontSize: '2rem' }}>FCM Push Notification Simulator</h1>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                Review live notification dispatches triggered during status updates to verify alert payloads.
              </p>
            </div>

            <div className="card flex-column" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                Recent Push Messages Dispatched
              </h3>

              {analytics?.recentNotifications && analytics.recentNotifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {analytics.recentNotifications.map(n => (
                    <div 
                      key={n.id} 
                      className="glass" 
                      style={{ 
                        padding: '1rem', 
                        borderRadius: 'var(--radius-md)', 
                        borderLeft: '4px solid var(--primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}
                    >
                      <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                        <span>Token ID: <span style={{ fontFamily: 'monospace' }}>{(n.token || 'All Subscribers').substring(0, 15)}...</span></span>
                        <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                      </div>
                      
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: '0.25rem 0' }}>🔔 {n.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{n.body}</p>
                      
                      <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-light)', fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', padding: '0.25rem 0.5rem', borderRadius: '3px', alignSelf: 'start' }}>
                        Payload: {JSON.stringify(n.data)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem' }}>
                  <p>No notifications have been dispatched during this session yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
