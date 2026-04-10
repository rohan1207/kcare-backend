# Seed Data Script

This script allows you to push existing blog posts and testimonials from JSON files to your MongoDB database.

## Usage

1. **Make sure you have:**
   - MongoDB connection configured in `.env`
   - Admin user created (run `npm run seed:admin` first)
   - JSON data files in `src/data/` directory:
     - `blogsData.json`
     - `Testimonials.json`

2. **Run the seed script:**
   ```bash
   npm run seed:data
   ```

## What it does

### Blogs
- Reads `src/data/blogsData.json`
- Converts blog content from JSON format to HTML
- Creates or updates blogs in the database
- Sets status to "published"
- Links blogs to the admin user

### Testimonials
- Reads `src/data/Testimonials.json`
- Creates or updates testimonials in the database
- Sets all testimonials as active
- Maintains order based on array index

## Features

- **Idempotent**: Running the script multiple times won't create duplicates
- **Updates existing**: If a blog/testimonial already exists, it will be updated
- **Error handling**: Gracefully handles missing files or data
- **Progress tracking**: Shows which items were created/updated

## Output Example

```
✅ Connected to MongoDB
📖 Found 3 blogs to seed
💬 Found 30 testimonials to seed

📝 Seeding Blogs...
  ✅ Created: The Robotic Revolution: How da Vinci Surgery is Transforming Patient Outcomes
  ✅ Created: Laparoscopy 101: A Patient's Guide to Minimally Invasive Surgery
  ✅ Created: Beyond the Scalpel: The Top 5 Benefits of Minimally Invasive Surgery

📊 Blogs Summary: 3 created, 0 updated

💬 Seeding Testimonials...
  ✅ Created: Pritesh Bhosale
  ✅ Created: Vaishali Ingle
  ...

📊 Testimonials Summary: 30 created, 0 updated

✅ Database connection closed
🎉 Seeding completed successfully!
```

## Notes

- Blog images will use the first image from the `images` array, or a placeholder if none exists
- Testimonials without images will display a placeholder with the first letter of the name
- All seeded blogs are set to "published" status
- All seeded testimonials are set to "active" status

