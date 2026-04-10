const mongoose = require('mongoose');

const heroBannerSchema = new mongoose.Schema({
  desktopImage: {
    type: String,
    default: '',
    trim: true,
  },
  mobileImage: {
    type: String,
    default: '',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

heroBannerSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports =
  mongoose.models.HeroBanner || mongoose.model('HeroBanner', heroBannerSchema);

