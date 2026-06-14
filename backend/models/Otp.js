const mongoose = require('mongoose');
const mockDb = require('../config/mockDbHelper');

const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // TTL index for 5 mins
});

let OtpModel;
try {
  OtpModel = mongoose.model('Otp', OtpSchema);
} catch (e) {
  OtpModel = mongoose.model('Otp');
}

const OtpWrapper = {
  find: (query) => global.dbConnected ? OtpModel.find(query) : mockDb.getCollection('otps').find(query),
  findOne: (query) => global.dbConnected ? OtpModel.findOne(query) : mockDb.getCollection('otps').findOne(query),
  create: (data) => global.dbConnected ? OtpModel.create(data) : mockDb.getCollection('otps').create(data),
  deleteMany: (query) => global.dbConnected ? OtpModel.deleteMany(query) : mockDb.getCollection('otps').deleteMany(query),
  model: OtpModel
};

module.exports = OtpWrapper;
