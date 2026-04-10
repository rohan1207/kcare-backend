# Update Blog Images to Cloudinary

This script updates existing blogs in MongoDB to use Cloudinary URLs instead of local paths.

## Usage

1. **Make sure your `.env` file has Cloudinary credentials:**
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   MONGODB_URI=your_mongodb_uri
   ```

2. **Run the update script:**
   ```bash
   npm run update:blog-images
   ```

## What it does

- Finds all blogs that don't have Cloudinary URLs
- Attempts to upload images from:
  1. Deployed site URL (e.g., `https://kcare.onrender.com/blog1_1.jpg`)
  2. Local file system (if files exist)
- Updates the blog's `featuredImage` field with the Cloudinary URL
- Skips blogs that already have Cloudinary URLs

## Options

You can modify the `baseUrl` in the script if your site is deployed at a different URL. By default, it uses `https://kcare.onrender.com`.

## Example Output

```
✅ Connected to MongoDB
📝 Found 3 blogs without Cloudinary URLs

📤 Processing: The Robotic Revolution: How da Vinci Surgery is Transforming Patient Outcomes
   Current image: /blog1_1.jpg
   📤 Trying to upload from: https://kcare.onrender.com/blog1_1.jpg
   ✅ Updated with Cloudinary URL: https://res.cloudinary.com/...

📊 Summary:
   ✅ Updated: 3
   ⚠️  Skipped: 0

✅ Database connection closed
🎉 Update completed successfully!
```

## Notes

- The script will skip blogs that already have Cloudinary URLs
- If an image can't be found or uploaded, the blog will be skipped (original URL kept)
- Make sure your Cloudinary credentials are correct in `.env`

