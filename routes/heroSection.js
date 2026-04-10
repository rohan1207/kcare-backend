const express = require('express');
const router = express.Router();
const HeroSection = require('../models/HeroSection');
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
      { resource_type: 'image', folder: 'kcare/hero' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// Get all hero sections
router.get('/', async (req, res) => {
  try {
    const heroSections = await HeroSection.find().sort({ order: 1, createdAt: -1 });
    res.json(heroSections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active hero sections
router.get('/active', async (req, res) => {
  try {
    const heroSections = await HeroSection.find({ isActive: true }).sort({ order: 1 });
    res.json(heroSections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single hero section
router.get('/:id', async (req, res) => {
  try {
    const heroSection = await HeroSection.findById(req.params.id);
    if (!heroSection) {
      return res.status(404).json({ error: 'Hero section not found' });
    }
    res.json(heroSection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create hero section (protected)
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, description, imageAlt, ctaText, ctaLink, isActive, order } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Upload image to Cloudinary
    let image = '';
    if (req.file) {
      image = await uploadToCloudinary(req.file.buffer);
    } else if (req.body.image) {
      image = req.body.image; // If URL provided directly
    } else {
      return res.status(400).json({ error: 'Image is required' });
    }

    const heroSection = new HeroSection({
      title,
      subtitle,
      description,
      image,
      imageAlt,
      ctaText,
      ctaLink,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await heroSection.save();
    res.status(201).json(heroSection);
  } catch (error) {
    console.error('Create hero section error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update hero section (protected)
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const heroSection = await HeroSection.findById(req.params.id);
    if (!heroSection) {
      return res.status(404).json({ error: 'Hero section not found' });
    }

    const { title, subtitle, description, imageAlt, ctaText, ctaLink, isActive, order } = req.body;

    if (title) heroSection.title = title;
    if (subtitle !== undefined) heroSection.subtitle = subtitle;
    if (description !== undefined) heroSection.description = description;
    if (imageAlt !== undefined) heroSection.imageAlt = imageAlt;
    if (ctaText !== undefined) heroSection.ctaText = ctaText;
    if (ctaLink !== undefined) heroSection.ctaLink = ctaLink;
    if (isActive !== undefined) heroSection.isActive = isActive;
    if (order !== undefined) heroSection.order = order;

    // Upload new image if provided
    if (req.file) {
      heroSection.image = await uploadToCloudinary(req.file.buffer);
    } else if (req.body.image) {
      heroSection.image = req.body.image;
    }

    await heroSection.save();
    res.json(heroSection);
  } catch (error) {
    console.error('Update hero section error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete hero section (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const heroSection = await HeroSection.findByIdAndDelete(req.params.id);
    if (!heroSection) {
      return res.status(404).json({ error: 'Hero section not found' });
    }
    res.json({ message: 'Hero section deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

