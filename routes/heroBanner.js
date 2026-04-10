const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const HeroBanner = require('../models/HeroBanner');
const { authenticateToken } = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadToCloudinary = (buffer, publicIdHint) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'kcare/hero-banners',
        public_id: publicIdHint,
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

async function getSingleton() {
  const existing = await HeroBanner.findOne().sort({ createdAt: -1 });
  if (existing) return existing;
  const created = new HeroBanner({ desktopImage: '', mobileImage: '' });
  return await created.save();
}

// Public: fetch current banner URLs (singleton)
router.get('/', async (req, res) => {
  try {
    const banner = await getSingleton();
    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected: update desktop/mobile images (multipart)
router.put(
  '/',
  authenticateToken,
  upload.fields([
    { name: 'desktopImage', maxCount: 1 },
    { name: 'mobileImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const banner = await getSingleton();

      const desktopFile = req.files?.desktopImage?.[0] || null;
      const mobileFile = req.files?.mobileImage?.[0] || null;

      if (!desktopFile && !mobileFile && !req.body.desktopImage && !req.body.mobileImage) {
        return res.status(400).json({
          error: 'Provide at least one of desktopImage or mobileImage',
        });
      }

      if (desktopFile) {
        banner.desktopImage = await uploadToCloudinary(desktopFile.buffer, 'desktop');
      } else if (typeof req.body.desktopImage === 'string') {
        banner.desktopImage = req.body.desktopImage.trim();
      }

      if (mobileFile) {
        banner.mobileImage = await uploadToCloudinary(mobileFile.buffer, 'mobile');
      } else if (typeof req.body.mobileImage === 'string') {
        banner.mobileImage = req.body.mobileImage.trim();
      }

      await banner.save();
      res.json(banner);
    } catch (error) {
      console.error('Update hero banner error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;

