const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const isCloudinaryConfigured = () => Boolean(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET &&
  CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
  CLOUDINARY_API_KEY !== 'your_api_key' &&
  CLOUDINARY_API_SECRET !== 'your_api_secret'
);

const uploadBufferToCloudinary = (buffer, options = {}) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) return reject(error);
    resolve(result);
  });

  stream.end(buffer);
});

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
};
