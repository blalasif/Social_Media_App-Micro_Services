const mongoose = require("mongoose");
const mediaSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      require: true,
    },
    originalname: {
      type: String,
      require: true,
    },
    mimeType: {
      type: String,
      require: true,
    },
    url: {
      type: String,
      require: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },
  },
  { timestamps: true }
);

const Media = mongoose.model("Media", mediaSchema);
module.exports = Media;
