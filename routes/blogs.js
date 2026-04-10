const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder: 'kcare/blogs' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// Get all blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }).populate('author', 'name email');
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single blog
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'name email');
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create blog (protected)
router.post('/', authenticateToken, upload.single('featuredImage'), async (req, res) => {
  try {
    const { title, excerpt, content, metaTitle, metaDescription, metaKeywords, status } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({ error: 'A blog with this title already exists' });
    }

    // Upload image to Cloudinary
    let featuredImage = '';
    if (req.file) {
      featuredImage = await uploadToCloudinary(req.file.buffer);
    } else if (req.body.featuredImage) {
      featuredImage = req.body.featuredImage; // If URL provided directly
    } else {
      return res.status(400).json({ error: 'Featured image is required' });
    }

    // Parse metaKeywords if it's a string
    const keywords = metaKeywords ? (Array.isArray(metaKeywords) ? metaKeywords : metaKeywords.split(',').map(k => k.trim())) : [];

    const blog = new Blog({
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      metaTitle: metaTitle || title,
      metaDescription,
      metaKeywords: keywords,
      author: req.admin._id,
      status: status || 'draft'
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update blog (protected)
router.put('/:id', authenticateToken, upload.single('featuredImage'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const { title, excerpt, content, metaTitle, metaDescription, metaKeywords, status } = req.body;

    if (title) {
      blog.title = title;
      // Regenerate slug if title changed
      const newSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Check if new slug exists (excluding current blog)
      const existingBlog = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } });
      if (!existingBlog) {
        blog.slug = newSlug;
      }
    }

    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (content) blog.content = content;
    if (metaTitle) blog.metaTitle = metaTitle;
    if (metaDescription !== undefined) blog.metaDescription = metaDescription;
    if (metaKeywords) {
      blog.metaKeywords = Array.isArray(metaKeywords) ? metaKeywords : metaKeywords.split(',').map(k => k.trim());
    }
    if (status) blog.status = status;

    // Upload new image if provided
    if (req.file) {
      blog.featuredImage = await uploadToCloudinary(req.file.buffer);
    } else if (req.body.featuredImage) {
      blog.featuredImage = req.body.featuredImage;
    }

    await blog.save();
    res.json(blog);
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete blog (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

