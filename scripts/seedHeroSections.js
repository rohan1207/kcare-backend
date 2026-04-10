const mongoose = require('mongoose');
const HeroSection = require('../models/HeroSection');
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

// Hero sections data based on current Hero.jsx component
const heroSectionsData = [
  {
    title: "K Care Clinic",
    subtitle: "Precision Care, Trusted Hands",
    description: "PRECISION-DRIVEN ROBOTIC SURGERY",
    image: "/p1.jpg",
    imageAlt: "Robotic Surgery",
    ctaText: "Book Appointment",
    ctaLink: "/book",
    isActive: true,
    order: 0
  },
  {
    title: "K Care Clinic",
    subtitle: "Precision Care, Trusted Hands",
    description: "MINIMALLY INVASIVE • MAXIMUM CARE",
    image: "/p2.jpg",
    imageAlt: "Minimally Invasive Surgery",
    ctaText: "Book Appointment",
    ctaLink: "/book",
    isActive: true,
    order: 1
  },
  {
    title: "K Care Clinic",
    subtitle: "Precision Care, Trusted Hands",
    description: "FASTER RECOVERY THROUGH MODERN LAPAROSCOPY",
    image: "/p3.jpg",
    imageAlt: "Laparoscopic Surgery",
    ctaText: "Book Appointment",
    ctaLink: "/book",
    isActive: true,
    order: 2
  },
  {
    title: "K Care Clinic",
    subtitle: "Precision Care, Trusted Hands",
    description: "ADVANCED CARE • HUMAN TOUCH",
    image: "/p4.JPG",
    imageAlt: "Advanced Care",
    ctaText: "Book Appointment",
    ctaLink: "/book",
    isActive: true,
    order: 3
  },
  {
    title: "K Care Clinic",
    subtitle: "Precision Care, Trusted Hands",
    description: "ADVANCED CARE • HUMAN TOUCH",
    image: "/p5.jpg",
    imageAlt: "Advanced Care",
    ctaText: "Book Appointment",
    ctaLink: "/book",
    isActive: true,
    order: 4
  }
];

// Helper function to upload image to Cloudinary
async function uploadImageToCloudinary(imagePath, folder = 'kcare/hero', baseUrl = 'https://kcare.onrender.com') {
  try {
    // If it's already a Cloudinary URL, return it
    if (imagePath && imagePath.includes('cloudinary.com')) {
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

async function seedHeroSections() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log(`📸 Seeding Hero Sections...`);
    let sectionsCreated = 0;
    let sectionsUpdated = 0;

    for (const heroData of heroSectionsData) {
      // Check if hero section already exists by order and title
      const existingHero = await HeroSection.findOne({
        order: heroData.order,
        title: heroData.title
      });

      // Upload image to Cloudinary
      let imageUrl = heroData.image;
      if (heroData.image && !heroData.image.includes('cloudinary.com')) {
        console.log(`  📤 Uploading image for: ${heroData.description}`);
        const uploadedUrl = await uploadImageToCloudinary(heroData.image, 'kcare/hero');
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const heroDoc = {
        title: heroData.title,
        subtitle: heroData.subtitle,
        description: heroData.description,
        image: imageUrl,
        imageAlt: heroData.imageAlt,
        ctaText: heroData.ctaText,
        ctaLink: heroData.ctaLink,
        isActive: heroData.isActive,
        order: heroData.order
      };

      if (existingHero) {
        // Update existing hero section (only update image if it's not already a Cloudinary URL)
        if (!existingHero.image || !existingHero.image.includes('cloudinary.com')) {
          heroDoc.image = imageUrl;
        } else {
          heroDoc.image = existingHero.image; // Keep existing Cloudinary URL
        }
        Object.assign(existingHero, heroDoc);
        await existingHero.save();
        sectionsUpdated++;
        console.log(`  ✅ Updated: ${heroData.description}`);
      } else {
        // Create new hero section
        const heroSection = new HeroSection(heroDoc);
        await heroSection.save();
        sectionsCreated++;
        console.log(`  ✅ Created: ${heroData.description}`);
      }
    }

    console.log(`\n📊 Hero Sections Summary: ${sectionsCreated} created, ${sectionsUpdated} updated`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🎉 Hero sections seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding hero sections:', error);
    process.exit(1);
  }
}

seedHeroSections();

