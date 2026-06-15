import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Search, Filter, Calendar, MapPin, Eye } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Status color mapping
const STATUS_COLORS = {
  'Pending': '#EF4444',      // Red
  'Under Review': '#F97316',  // Orange
  'Assigned': '#3B82F6',      // Blue
  'In Progress': '#F59E0B',  // Yellow
  'Resolved': '#10B981',      // Green
  'Closed': '#64748B'        // Slate Gray
};

// Map Recenter Helper Component
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function MapDashboard({ complaints = [], onViewDetails }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Default: Bangalore coordinates
  const [selectedId, setSelectedId] = useState(null);

  // Categories list
  const categories = [
    'All',
    'Road Damage', 
    'Garbage', 
    'Street Light', 
    'Water Leakage', 
    'Drainage', 
    'Public Property Damage', 
    'Tourist Place Issue', 
    'Traffic Problem', 
    'Safety Issue', 
    'Other'
  ];

  // Statuses list
  const statuses = ['All', 'Pending', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

  // Apply filters locally for real-time map updates
  useEffect(() => {
    let result = complaints;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        c.title?.toLowerCase().includes(q) || 
        c.location?.address?.toLowerCase().includes(q) ||
        c._id?.toString().includes(q)
      );
    }

    if (category !== 'All') {
      result = result.filter(c => c.category === category);
    }

    if (status !== 'All') {
      result = result.filter(c => c.status === status);
    }

    setFilteredComplaints(result);

    // Center map around first filtered issue if available
    if (result.length > 0 && result[0].location?.coordinates) {
      const [lng, lat] = result[0].location.coordinates;
      setMapCenter([lat, lng]);
    }
  }, [complaints, search, category, status]);

  return (
    <div className="card fade-in" style={{ padding: 0, overflow: 'hidden', height: '650px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Map Control Bar */}
      <div className="flex-row" style={{ padding: '1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', backgroundColor: 'var(--bg-card)' }}>
        
        {/* Search */}
        <div className="form-group" style={{ flex: '2 1 200px', margin: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input 
              type="text" 
              placeholder="Search complaints by ID, title, or area..." 
              className="form-control" 
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="form-group" style={{ flex: '1 1 150px', margin: 0 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Filter size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }} />
            <select 
              className="form-control" 
              style={{ paddingLeft: '2.2rem', width: '100%' }}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div className="form-group" style={{ flex: '1 1 150px', margin: 0 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }} />
            <select 
              className="form-control" 
              style={{ paddingLeft: '2.2rem', width: '100%' }}
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {statuses.map(st => (
                <option key={st} value={st}>{st === 'All' ? 'All Statuses' : st}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Map Content */}
      <div className="map-dashboard-layout">
        
        {/* Left Sidebar List */}
        <div className="map-dashboard-list">
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>
            Matching Complaints ({filteredComplaints.length})
          </div>
          
          {filteredComplaints.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              No complaints match filters
            </div>
          ) : (
            filteredComplaints.map(c => {
              const isSelected = selectedId === (c._id || c.id);
              return (
                <div 
                  key={c._id || c.id} 
                  onClick={() => {
                    setSelectedId(c._id || c.id);
                    if (c.location?.coordinates) {
                      const [lng, lat] = c.location.coordinates;
                      setMapCenter([lat, lng]);
                    }
                  }}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--bg-app)' : 'transparent',
                    borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className={`badge badge-${c.status.toLowerCase().replace(' ', '')}`} style={{ fontSize: '0.65rem' }}>
                      {c.status}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                      {c.priority}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.title}
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-light)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    📍 {c.location.address}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right Map View */}
        <div className="map-dashboard-view">
          {selectedId ? (
            (() => {
              const selectedComplaint = filteredComplaints.find(c => (c._id || c.id) === selectedId);
              if (!selectedComplaint || !selectedComplaint.location?.coordinates) return null;
              const [lng, lat] = selectedComplaint.location.coordinates;
              const markerColor = STATUS_COLORS[selectedComplaint.status] || '#CBD5E1';

              return (
                <MapContainer 
                  center={mapCenter} 
                  zoom={14} 
                  className="map-container-style"
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap center={mapCenter} />
                  
                  <CircleMarker
                    center={[lat, lng]}
                    radius={12}
                    fillColor={markerColor}
                    color="#FFFFFF"
                    weight={2.5}
                    fillOpacity={0.9}
                  >
                    <Popup>
                      <div style={{ minWidth: '220px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span className={`badge badge-${selectedComplaint.status.toLowerCase().replace(' ', '')}`}>
                            {selectedComplaint.status}
                          </span>
                          <span className={`badge badge-priority-${selectedComplaint.priority.toLowerCase()}`}>
                            {selectedComplaint.priority} Priority
                          </span>
                        </div>
                        <h4 style={{ margin: '0.25rem 0', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 'bold' }}>{selectedComplaint.title}</h4>
                        <p style={{ margin: '0.25rem 0', color: 'var(--text-light)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={12} /> {selectedComplaint.location.landmark ? `${selectedComplaint.location.landmark}, ` : ''}{selectedComplaint.location.address}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                          Category: <strong>{selectedComplaint.category}</strong>
                        </p>
                        
                        {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                          <div style={{ width: '100%', height: '80px', borderRadius: '4px', overflow: 'hidden', margin: '0.5rem 0' }}>
                            <img src={selectedComplaint.images[0].url} alt={selectedComplaint.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}

                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: '100%', marginTop: '0.5rem' }}
                          onClick={() => onViewDetails(selectedComplaint._id || selectedComplaint.id)}
                        >
                          <Eye size={12} /> View Complete Details
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                </MapContainer>
              );
            })()
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', color: 'var(--text-light)', flexDirection: 'column', padding: '2rem', textAlign: 'center' }}>
              <MapPin size={32} style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }} />
              <h4 style={{ fontWeight: 600, color: 'var(--text-main)' }}>No Complaint Selected</h4>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px', marginTop: '0.25rem' }}>
                Select a complaint from the sidebar list to view its location details on the map.
              </p>
            </div>
          )}

          {/* Floating Legend */}
          <div 
            className="glass" 
            style={{ 
              position: 'absolute', 
              bottom: '20px', 
              right: '20px', 
              padding: '0.85rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              zIndex: 1000, 
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border)'
            }}
          >
            <h5 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Issue Status Colors</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
              {Object.entries(STATUS_COLORS).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: val, display: 'inline-block', border: '1px solid #FFF' }}></span>
                  <span>{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
