const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { cloudinary, cloudinaryEnabled } = require('../config/cloudinary');

// Setup local upload directory path
const uploadDir = path.join(__dirname, '../public/uploads');

// Ensure local upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer in-memory storage to process files before saving/sending
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (jpg, jpeg, png, webp, gif) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: fileFilter
});

/**
 * Uploads a file buffer to Cloudinary or writes it locally
 * @param {Object} file - File object from Multer
 * @param {Object} req - Express request to retrieve host name for local uploads
 */
const uploadToStorage = async (file, req) => {
  if (cloudinaryEnabled && cloudinary) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'civitrack_complaints' },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload failed, saving locally instead:", error);
            // Fall back to local on upload failure
            resolve(saveLocally(file, req));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id
            });
          }
        }
      );
      uploadStream.end(file.buffer);
    });
  } else {
    return saveLocally(file, req);
  }
};

// Internal helper to save file to public/uploads
const saveLocally = (file, req) => {
  const uniqueName = `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`;
  const filePath = path.join(uploadDir, uniqueName);
  
  fs.writeFileSync(filePath, file.buffer);
  
  // Build serving URL based on host
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host');
  const url = `${protocol}://${host}/uploads/${uniqueName}`;

  return {
    url,
    publicId: uniqueName
  };
};

module.exports = {
  upload,
  uploadToStorage
};
