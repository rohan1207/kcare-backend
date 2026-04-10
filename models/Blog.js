const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  excerpt: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  featuredImage: {
    type: String,
    required: true
  },
  // SEO Fields
  metaTitle: {
    type: String,
    trim: true
  },
  metaDescription: {
    type: String,
    trim: true
  },
  metaKeywords: {
    type: [String],
    default: []
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  next();
});

module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema);

