# Avatar Conversion to Google Cloud Storage

This script converts all base64 encoded avatar images stored in the database to Google Cloud Storage URLs, improving performance and enabling smart cache compatibility.

## Benefits of Converting to GCS URLs

### Performance Improvements
- **Faster page loads**: No base64 decoding required on the client
- **Reduced database size**: Removes large base64 strings from database
- **Better caching**: CDN caching with 1-year cache headers
- **Mobile optimization**: Smaller payload sizes for mobile devices
- **Smart cache compatibility**: Works with the existing smart cache system

### Technical Benefits
- **Scalability**: Offloads image serving to Google Cloud Storage
- **Bandwidth optimization**: Images served from Google's CDN
- **Automatic optimization**: Can be combined with image optimization services
- **Backup and redundancy**: Images stored in Google Cloud's reliable infrastructure

## Prerequisites

1. **Google Cloud Storage bucket** configured and accessible
2. **Environment variables** set up:
   - `PROJECT_ID`: Your Google Cloud project ID
   - `GCS_AVATAR_BUCKET`: Your GCS bucket name for avatars
3. **Google Cloud credentials** configured (service account or default credentials)

## Usage

### 1. Dry Run (Recommended First Step)
```bash
npm run convert:avatars:dry-run
```
This will show you:
- How many users have base64 avatars
- The size of each avatar
- Total database size that will be saved
- **No changes will be made**

### 2. Safety Check
```bash
npm run convert:avatars
```
This will show a warning and require the `--force` flag to proceed.

### 3. Actual Conversion
```bash
npm run convert:avatars:force
```
This will perform the actual conversion.

## What the Script Does

### For Each User with Base64 Avatar Data:

1. **Parses** the base64 data URL to extract:
   - MIME type (image/jpeg, image/png, etc.)
   - Base64 encoded image data

2. **Generates** a unique filename:
   - Format: `avatars/{userId}-{timestamp}-{hash}.{extension}`
   - Example: `avatars/cmdw7yvy0000navzm50t18x3c-1754287890123-a1b2c3d4.jpg`

3. **Uploads** to Google Cloud Storage:
   - Converts base64 to binary buffer
   - Sets appropriate content type
   - Makes file publicly accessible
   - Sets cache headers (1 year)

4. **Updates** the database:
   - Replaces base64 data URL with GCS public URL
   - Example: `https://storage.googleapis.com/your-bucket/avatars/user-123-timestamp-hash.jpg`

## File Naming Convention

The script generates unique filenames to prevent conflicts:
- **User ID**: Ensures uniqueness per user
- **Timestamp**: Prevents caching issues when avatars are updated
- **Hash**: Additional uniqueness guarantee
- **Extension**: Proper file extension based on MIME type

## Error Handling

The script handles various error scenarios:
- Invalid base64 data URLs
- GCS upload failures
- Database update failures
- Network connectivity issues

Failed conversions are logged but don't stop the process for other users.

## Monitoring and Verification

After conversion, you can verify success by:

1. **Check the console output** for conversion summary
2. **Verify in GCS console** that files were uploaded
3. **Test avatar loading** in the application
4. **Check database** that URLs were updated correctly

## Rollback Considerations

⚠️ **Important**: This conversion is not easily reversible because:
- Original base64 data is replaced with GCS URLs
- You would need to download images from GCS and re-encode them

**Recommendations**:
- Always run `--dry-run` first
- Consider backing up your database before conversion
- Test with a small subset of users first (modify the script if needed)

## Example Output

```
🚀 Starting avatar conversion to Google Cloud Storage...

✅ Connected to GCS bucket: your-avatar-bucket

Found 41 users with base64 avatar data

Processing Ryley Holmes (ryley92@gmail.com)...
✅ Ryley Holmes: Converted to https://storage.googleapis.com/your-bucket/avatars/cmdtftrs70007kz8x7q3kt4km-1754287890123-a1b2c3d4.jpg

Processing Sarah Mogan (sarahmogan63@gmail.com)...
✅ Sarah Mogan: Converted to https://storage.googleapis.com/your-bucket/avatars/cmdw7z6mh00b8avzm01u5lt8r-1754287890456-e5f6g7h8.jpg

📊 Conversion Summary:
✅ Successfully converted: 41 avatars
❌ Failed conversions: 0 avatars
💾 Total database size saved: 220 KB

🎉 Avatar conversion completed successfully!
Benefits:
   • Faster page load times (no base64 decoding)
   • Reduced database size
   • Better caching with CDN
   • Improved mobile performance
   • Smart cache system compatibility
```

## Integration with Existing Avatar System

The converted URLs work seamlessly with your existing avatar system:
- The `Avatar` component will detect URL-based avatars
- Smart caching will work with GCS URLs
- No changes needed to the frontend code
- Fallback to initials still works if GCS URLs fail

## Cost Considerations

- **Storage cost**: Minimal for small avatar images
- **Bandwidth cost**: Reduced overall due to CDN caching
- **Operations cost**: One-time upload cost during conversion

The performance benefits typically outweigh the minimal storage costs.

## Troubleshooting

### Common Issues:

1. **GCS bucket not accessible**
   - Check your Google Cloud credentials
   - Verify bucket exists and has proper permissions

2. **Upload failures**
   - Check network connectivity
   - Verify bucket permissions allow uploads

3. **Invalid base64 data**
   - Some users may have corrupted avatar data
   - These will be skipped and logged as failures

### Getting Help:

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your GCS bucket configuration
3. Test with a single user first by modifying the script