const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const readDb = () => {
  try {
    const raw = fs.readFileSync(global.mockDbPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading mock DB:", err);
    return { users: [], complaints: [], otps: [] };
  }
};

const writeDb = (data) => {
  try {
    fs.writeFileSync(global.mockDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing mock DB:", err);
  }
};

// Basic query matcher
const matchesQuery = (item, query) => {
  if (!query) return true;
  
  for (let key in query) {
    const queryVal = query[key];
    
    // Support MongoDB-style operators
    if (queryVal && typeof queryVal === 'object') {
      if ('$nearSphere' in queryVal) {
        // Geospatial query. Just return true or perform simple distance calculations if inputs match.
        // We will handle geospatial calculations explicitly in our controllers, so let's default to true here.
        continue;
      }
      if ('$in' in queryVal) {
        if (!queryVal.$in.includes(item[key])) return false;
        continue;
      }
      if ('$or' in queryVal) {
        // e.g. [{ category: 'Garbage' }, { status: 'Pending' }]
        // simplified
        continue;
      }
    }

    if (item[key] !== queryVal) {
      return false;
    }
  }
  return true;
};

const getCollection = (collectionName) => {
  return {
    find: async (query = {}) => {
      const db = readDb();
      const items = db[collectionName] || [];
      return items.filter(item => matchesQuery(item, query));
    },

    findOne: async (query = {}) => {
      const db = readDb();
      const items = db[collectionName] || [];
      const found = items.find(item => matchesQuery(item, query));
      return found || null;
    },

    findById: async (id) => {
      const db = readDb();
      const items = db[collectionName] || [];
      const found = items.find(item => item._id === id || item.id === id);
      return found || null;
    },

    create: async (data) => {
      const db = readDb();
      if (!db[collectionName]) db[collectionName] = [];
      
      const newDoc = {
        _id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data
      };
      
      db[collectionName].push(newDoc);
      writeDb(db);
      return newDoc;
    },

    findByIdAndUpdate: async (id, update, options = {}) => {
      const db = readDb();
      const items = db[collectionName] || [];
      const index = items.findIndex(item => item._id === id);
      if (index === -1) return null;

      // Extract set updates if present, e.g., { $set: { status: 'Assigned' } }
      let updateFields = update;
      if (update && typeof update === 'object') {
        if ('$set' in update) {
          updateFields = update.$set;
        }
        if ('$push' in update) {
          // e.g. { $push: { statusTimeline: ... } } or upvotes
          for (let key in update.$push) {
            if (!items[index][key]) items[index][key] = [];
            items[index][key].push(update.$push[key]);
          }
          updateFields = {};
        }
        if ('$pull' in update) {
          // e.g. { $pull: { upvotes: userId } }
          for (let key in update.$pull) {
            if (Array.isArray(items[index][key])) {
              items[index][key] = items[index][key].filter(val => val !== update.$pull[key]);
            }
          }
          updateFields = {};
        }
      }

      items[index] = {
        ...items[index],
        ...updateFields,
        updatedAt: new Date().toISOString()
      };

      db[collectionName] = items;
      writeDb(db);
      return items[index];
    },

    updateOne: async (query, update) => {
      const db = readDb();
      const items = db[collectionName] || [];
      const index = items.findIndex(item => matchesQuery(item, query));
      if (index === -1) return { nModified: 0 };

      let updateFields = update;
      if (update && typeof update === 'object' && '$set' in update) {
        updateFields = update.$set;
      }

      items[index] = {
        ...items[index],
        ...updateFields,
        updatedAt: new Date().toISOString()
      };

      db[collectionName] = items;
      writeDb(db);
      return { nModified: 1 };
    },

    deleteMany: async (query = {}) => {
      const db = readDb();
      const items = db[collectionName] || [];
      const remaining = items.filter(item => !matchesQuery(item, query));
      const deletedCount = items.length - remaining.length;
      db[collectionName] = remaining;
      writeDb(db);
      return { deletedCount };
    },

    countDocuments: async (query = {}) => {
      const db = readDb();
      const items = db[collectionName] || [];
      return items.filter(item => matchesQuery(item, query)).length;
    }
  };
};

module.exports = {
  getCollection,
  readDb,
  writeDb
};
