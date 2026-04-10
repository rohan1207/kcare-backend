const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kcare-clinic';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload image to Cloudinary
async function uploadImageToCloudinary(imagePath, folder = 'kcare/blogs', baseUrl = 'https://kcare.onrender.com') {
  try {
    // If it's already a Cloudinary URL, return it
    if (imagePath && imagePath.includes('cloudinary.com')) {
      console.log(`   ✓ Already a Cloudinary URL`);
      return imagePath;
    }

    // If it's a full URL (http/https), upload from URL
    if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
      console.log(`   📤 Uploading from URL: ${imagePath}`);
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: folder,
        resource_type: 'image'
      });
      return result.secure_url;
    }

    // If it's a local file path (starts with /), try to construct full URL or find local file
    if (imagePath && imagePath.startsWith('/')) {
      // First, try to upload from deployed site URL
      const fullUrl = `${baseUrl}${imagePath}`;
      try {
        console.log(`   📤 Trying to upload from: ${fullUrl}`);
        const result = await cloudinary.uploader.upload(fullUrl, {
          folder: folder,
          resource_type: 'image'
        });
        return result.secure_url;
      } catch (urlError) {
        console.log(`   ⚠️  Failed to upload from URL, trying local file...`);
        
        // Try to find the file locally
        const publicPath = path.join(__dirname, '../../public', imagePath);
        const srcPath = path.join(__dirname, '../../src', imagePath);
        const rootPath = path.join(__dirname, '../../', imagePath);
        
        let filePath = null;
        if (fs.existsSync(publicPath)) {
          filePath = publicPath;
        } else if (fs.existsSync(srcPath)) {
          filePath = srcPath;
        } else if (fs.existsSync(rootPath)) {
          filePath = rootPath;
        }

        if (filePath) {
          console.log(`   📤 Uploading local file: ${filePath}`);
          const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: 'image'
          });
          return result.secure_url;
        } else {
          console.log(`   ⚠️  Image not found locally: ${imagePath}`);
          return null;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`   ❌ Error uploading image: ${error.message}`);
    return null;
  }
}

async function updateBlogImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all blogs that don't have Cloudinary URLs
    const blogs = await Blog.find({
      $or: [
        { featuredImage: { $not: { $regex: 'cloudinary.com' } } },
        { featuredImage: { $exists: false } },
        { featuredImage: '' }
      ]
    });

    console.log(`📝 Found ${blogs.length} blogs without Cloudinary URLs`);

    if (blogs.length === 0) {
      console.log('✅ All blogs already have Cloudinary URLs!');
      await mongoose.connection.close();
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;

    for (const blog of blogs) {
      console.log(`\n📤 Processing: ${blog.title}`);
      console.log(`   Current image: ${blog.featuredImage || 'None'}`);

      if (!blog.featuredImage || blog.featuredImage === '') {
        console.log(`   ⚠️  No image found, skipping...`);
        skipped++;
        continue;
      }

      // Upload to Cloudinary
      const cloudinaryUrl = await uploadImageToCloudinary(blog.featuredImage, 'kcare/blogs');

      if (cloudinaryUrl && cloudinaryUrl.includes('cloudinary.com')) {
        blog.featuredImage = cloudinaryUrl;
        await blog.save();
        updated++;
        console.log(`   ✅ Updated with Cloudinary URL: ${cloudinaryUrl}`);
      } else {
        console.log(`   ⚠️  Could not upload image, keeping original`);
        skipped++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🎉 Update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating blog images:', error);
    process.exit(1);
  }
}

updateBlogImages();

