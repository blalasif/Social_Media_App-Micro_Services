const cloudinary = require("cloudinary").v2;
const logger = require("../utils/logger");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (err, result) => {
        if (err) {
          logger.error("Error while uploading Media", err);
          reject(err);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

module.exports = uploadMediaToCloudinary;
