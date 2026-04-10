# Hero Sections Setup Guide

## Seed Hero Sections

To push existing hero section images to the backend:

```bash
cd "Futureal - Copy/backend"
npm run seed:hero
```

This script will:
- Read hero section data (based on current Hero.jsx component)
- Upload images to Cloudinary from:
  - Deployed site URL (https://kcare.onrender.com)
  - Local file system (if files exist)
- Create/update hero sections in MongoDB
- Set all sections as active

## Frontend Integration

The Hero component (`Futureal - Copy/src/components/Hero.jsx`) now:
- Fetches hero sections from `/api/hero-section/active`
- Displays only active hero sections
- Falls back to default slides if backend fails
- Maintains all existing animations and interactions

## Admin Panel

The Manage Hero Section page allows you to:
- ✅ View all hero sections
- ✅ Create new hero sections
- ✅ Edit existing hero sections
- ✅ Delete hero sections
- ✅ Preview hero sections
- ✅ Upload images via Cloudinary
- ✅ Set order and active status
- ✅ Add CTA buttons

## API Endpoints

- `GET /api/hero-section` - Get all hero sections
- `GET /api/hero-section/active` - Get active hero sections only
- `GET /api/hero-section/:id` - Get single hero section
- `POST /api/hero-section` - Create hero section (protected)
- `PUT /api/hero-section/:id` - Update hero section (protected)
- `DELETE /api/hero-section/:id` - Delete hero section (protected)

## Features

- Images automatically uploaded to Cloudinary
- Responsive design for mobile
- Preview functionality
- Order management
- Active/Inactive toggle

