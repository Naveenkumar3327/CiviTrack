const cloudinary = require('cloudinary').v2;

let cloudinaryEnabled = false;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("❇️  Cloudinary client initialized successfully.");
  cloudinaryEnabled = true;
} else {
  console.warn("⚠️  Cloudinary keys missing. Images will be stored locally in public/uploads/");
}

module.exports = {
  cloudinary: cloudinaryEnabled ? cloudinary : null,
  cloudinaryEnabled
};
