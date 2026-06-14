const mongoose = require('mongoose');
const mockDb = require('../config/mockDbHelper');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, required: true },
  password: { type: String, required: true },
  address: { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  role: { type: String, enum: ['citizen', 'admin'], default: 'citizen' },
  complaintHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],
  createdAt: { type: Date, default: Date.now }
});

let UserModel;
try {
  UserModel = mongoose.model('User', UserSchema);
} catch (e) {
  UserModel = mongoose.model('User');
}

const UserWrapper = {
  find: (query) => global.dbConnected ? UserModel.find(query) : mockDb.getCollection('users').find(query),
  findOne: (query) => global.dbConnected ? UserModel.findOne(query) : mockDb.getCollection('users').findOne(query),
  findById: (id) => global.dbConnected ? UserModel.findById(id) : mockDb.getCollection('users').findById(id),
  create: (data) => global.dbConnected ? UserModel.create(data) : mockDb.getCollection('users').create(data),
  findByIdAndUpdate: (id, update, options) => global.dbConnected ? UserModel.findByIdAndUpdate(id, update, options) : mockDb.getCollection('users').findByIdAndUpdate(id, update, options),
  updateOne: (query, update) => global.dbConnected ? UserModel.updateOne(query, update) : mockDb.getCollection('users').updateOne(query, update),
  deleteMany: (query) => global.dbConnected ? UserModel.deleteMany(query) : mockDb.getCollection('users').deleteMany(query),
  countDocuments: (query) => global.dbConnected ? UserModel.countDocuments(query) : mockDb.getCollection('users').countDocuments(query),
  model: UserModel
};

module.exports = UserWrapper;
