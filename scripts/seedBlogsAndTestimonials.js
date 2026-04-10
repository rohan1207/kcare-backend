const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const Testimonial = require('../models/Testimonial');
const Admin = require('../models/Admin');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kcare-clinic';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload image to Cloudinary from URL or local path
async function uploadImageToCloudinary(imagePath, folder = 'kcare/blogs') {
  try {
    // If it's already a Cloudinary URL, return it
    if (imagePath && imagePath.includes('cloudinary.com')) {
      return imagePath;
    }

    // If it's a full URL (http/https), upload from URL
    if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: folder,
        resource_type: 'image'
      });
      return result.secure_url;
    }

    // If it's a local file path, check if file exists
    if (imagePath && imagePath.startsWith('/')) {
      // Try to find the file in public directory
      const publicPath = path.join(__dirname, '../../public', imagePath);
      const srcPath = path.join(__dirname, '../../src', imagePath);
      
      let filePath = null;
      if (fs.existsSync(publicPath)) {
        filePath = publicPath;
      } else if (fs.existsSync(srcPath)) {
        filePath = srcPath;
      }

      if (filePath) {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: folder,
          resource_type: 'image'
        });
        return result.secure_url;
      } else {
        console.log(`⚠️  Image not found: ${imagePath}, using placeholder`);
        // Upload a placeholder or return a default Cloudinary URL
        return 'https://via.placeholder.com/800x400?text=Blog+Image';
      }
    }

    // If no valid path, return placeholder
    return 'https://via.placeholder.com/800x400?text=Blog+Image';
  } catch (error) {
    console.error(`❌ Error uploading image ${imagePath}:`, error.message);
    return 'https://via.placeholder.com/800x400?text=Blog+Image';
  }
}

// Helper function to convert blog content array to HTML
function convertContentToHTML(content) {
  if (!Array.isArray(content)) {
    return content; // Already HTML string
  }

  let html = '';
  content.forEach(item => {
    if (item.type === 'paragraph') {
      html += `<p>${item.text}</p>`;
    } else if (item.type === 'heading') {
      html += `<h2>${item.text}</h2>`;
    } else if (item.type === 'list') {
      html += '<ul>';
      item.items.forEach(listItem => {
        html += `<li>${listItem}</li>`;
      });
      html += '</ul>';
    }
  });
  return html;
}

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedBlogsAndTestimonials() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get admin user for blog author
    const admin = await Admin.findOne({ email: 'kcare@admin' });
    if (!admin) {
      console.log('⚠️  Admin user not found. Please run seed:admin first.');
      process.exit(1);
    }

    // Read blogs data
    const blogsDataPath = path.join(__dirname, '../../src/data/blogsData.json');
    let blogsData = [];
    
    if (fs.existsSync(blogsDataPath)) {
      const blogsFile = fs.readFileSync(blogsDataPath, 'utf8');
      blogsData = JSON.parse(blogsFile);
      console.log(`📖 Found ${blogsData.length} blogs to seed`);
    } else {
      console.log('⚠️  blogsData.json not found, skipping blogs');
    }

    // Read testimonials data
    const testimonialsDataPath = path.join(__dirname, '../../src/data/Testimonials.json');
    let testimonialsData = [];
    
    if (fs.existsSync(testimonialsDataPath)) {
      const testimonialsFile = fs.readFileSync(testimonialsDataPath, 'utf8');
      testimonialsData = JSON.parse(testimonialsFile);
      console.log(`💬 Found ${testimonialsData.length} testimonials to seed`);
    } else {
      console.log('⚠️  Testimonials.json not found, skipping testimonials');
    }

    // Seed Blogs
    if (blogsData.length > 0) {
      console.log('\n📝 Seeding Blogs...');
      let blogsCreated = 0;
      let blogsUpdated = 0;

      for (const blogData of blogsData) {
        const slug = blogData.id || generateSlug(blogData.title);
        
        // Check if blog already exists
        const existingBlog = await Blog.findOne({ slug });
        
        const blogContent = convertContentToHTML(blogData.content);
        
        // Upload featured image to Cloudinary
        let featuredImage = 'https://via.placeholder.com/800x400?text=Blog+Image';
        if (blogData.images && blogData.images.length > 0) {
          console.log(`  📤 Uploading image for: ${blogData.title}`);
          featuredImage = await uploadImageToCloudinary(blogData.images[0], 'kcare/blogs');
        }

        const blogDoc = {
          title: blogData.title,
          slug: slug,
          excerpt: blogData.summary || blogData.excerpt || '',
          content: blogContent,
          featuredImage: featuredImage,
          metaTitle: blogData.title,
          metaDescription: blogData.summary || blogData.excerpt || '',
          metaKeywords: blogData.tags || [],
          author: admin._id,
          status: 'published',
          publishedAt: blogData.date ? new Date(blogData.date) : new Date()
        };

        if (existingBlog) {
          // Update existing blog (only update image if it's not already a Cloudinary URL)
          if (!existingBlog.featuredImage || !existingBlog.featuredImage.includes('cloudinary.com')) {
            blogDoc.featuredImage = featuredImage;
          } else {
            blogDoc.featuredImage = existingBlog.featuredImage; // Keep existing Cloudinary URL
          }
          Object.assign(existingBlog, blogDoc);
          await existingBlog.save();
          blogsUpdated++;
          console.log(`  ✅ Updated: ${blogData.title}`);
        } else {
          // Create new blog
          const blog = new Blog(blogDoc);
          await blog.save();
          blogsCreated++;
          console.log(`  ✅ Created: ${blogData.title}`);
        }
      }

      console.log(`\n📊 Blogs Summary: ${blogsCreated} created, ${blogsUpdated} updated`);
    }

    // Seed Testimonials
    if (testimonialsData.length > 0) {
      console.log('\n💬 Seeding Testimonials...');
      let testimonialsCreated = 0;
      let testimonialsUpdated = 0;

      for (let i = 0; i < testimonialsData.length; i++) {
        const testimonialData = testimonialsData[i];
        
        // Check if testimonial already exists by name and content
        const existingTestimonial = await Testimonial.findOne({
          name: testimonialData.name,
          content: testimonialData.text
        });

        const testimonialDoc = {
          name: testimonialData.name,
          designation: testimonialData.designation || '',
          content: testimonialData.text,
          image: testimonialData.image || '',
          rating: testimonialData.rating || 5,
          isActive: true,
          order: i
        };

        if (existingTestimonial) {
          // Update existing testimonial
          Object.assign(existingTestimonial, testimonialDoc);
          await existingTestimonial.save();
          testimonialsUpdated++;
          console.log(`  ✅ Updated: ${testimonialData.name}`);
        } else {
          // Create new testimonial
          const testimonial = new Testimonial(testimonialDoc);
          await testimonial.save();
          testimonialsCreated++;
          console.log(`  ✅ Created: ${testimonialData.name}`);
        }
      }

      console.log(`\n📊 Testimonials Summary: ${testimonialsCreated} created, ${testimonialsUpdated} updated`);
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedBlogsAndTestimonials();

