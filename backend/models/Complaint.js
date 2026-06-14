const mongoose = require('mongoose');
const mockDb = require('../config/mockDbHelper');

const ComplaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: [
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
    ]
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium' 
  },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String, default: '' }
  }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    address: { type: String, required: true },
    landmark: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' }
  },
  isAnonymous: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
    default: 'Pending'
  },
  statusTimeline: [{
    status: { type: String, required: true },
    remarks: { type: String, default: '' },
    updatedBy: { type: String, default: 'System' }, // User role or name
    timestamp: { type: Date, default: Date.now }
  }],
  upvotes: [{ type: String }], // Array of User IDs
  followers: [{ type: String }], // Array of User IDs
  resolutionDetails: {
    beforeImages: [{ type: String }],
    afterImages: [{ type: String }],
    remarks: { type: String, default: '' },
    resolvedAt: { type: Date },
    closedAt: { type: Date }
  },
  citizen: {
    id: { type: String, required: true },
    name: { type: String, required: true }
  },
  geminiSummary: { type: String, default: '' },
  geminiPriority: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create geospatial 2dsphere index for location field
ComplaintSchema.index({ location: '2dsphere' });

let ComplaintModel;
try {
  ComplaintModel = mongoose.model('Complaint', ComplaintSchema);
} catch (e) {
  ComplaintModel = mongoose.model('Complaint');
}

const ComplaintWrapper = {
  find: (query) => global.dbConnected ? ComplaintModel.find(query) : mockDb.getCollection('complaints').find(query),
  findOne: (query) => global.dbConnected ? ComplaintModel.findOne(query) : mockDb.getCollection('complaints').findOne(query),
  findById: (id) => global.dbConnected ? ComplaintModel.findById(id) : mockDb.getCollection('complaints').findById(id),
  create: (data) => global.dbConnected ? ComplaintModel.create(data) : mockDb.getCollection('complaints').create(data),
  findByIdAndUpdate: (id, update, options) => global.dbConnected ? ComplaintModel.findByIdAndUpdate(id, update, options) : mockDb.getCollection('complaints').findByIdAndUpdate(id, update, options),
  updateOne: (query, update) => global.dbConnected ? ComplaintModel.updateOne(query, update) : mockDb.getCollection('complaints').updateOne(query, update),
  deleteMany: (query) => global.dbConnected ? ComplaintModel.deleteMany(query) : mockDb.getCollection('complaints').deleteMany(query),
  countDocuments: (query) => global.dbConnected ? ComplaintModel.countDocuments(query) : mockDb.getCollection('complaints').countDocuments(query),
  model: ComplaintModel
};

module.exports = ComplaintWrapper;
