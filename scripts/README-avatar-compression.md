# Avatar Compression Scripts

This directory contains scripts to compress large base64 avatar images in the database to improve performance and reduce session data size.

## Problem

Large base64-encoded avatar images in the `users.avatarData` column can cause:
- Session data to exceed 128KB limit (causing Next.js warnings)
- Slow API responses
- High memory usage
- Poor user experience

## Solution

These scripts compress avatar images to:
- **128x128 pixels** (optimal for UI display)
- **JPEG format** with progressive encoding
- **Maximum 50KB** per avatar
- **75% quality** (with fallback to 60% if needed)

## Available Scripts

### 1. Command Line Scripts

```bash
# TypeScript version (recommended)
npm run compress:avatars

# Dry run (see what would be compressed without making changes)
npm run compress:avatars:dry-run

# JavaScript version (fallback)
npm run compress:avatars:js
```

### 2. API Endpoint

Access via admin panel or direct API call:

```bash
# Get compression statistics
GET /api/admin/compress-avatars

# Run compression (dry run)
POST /api/admin/compress-avatars
{
  "dryRun": true
}

# Run actual compression
POST /api/admin/compress-avatars
{
  "dryRun": false
}
```

## Configuration

Edit the `CONFIG` object in the scripts to customize:

```typescript
const CONFIG = {
  width: 128,        // Target width in pixels
  height: 128,       // Target height in pixels
  quality: 75,       // JPEG quality (1-100)
  maxSizeKB: 50,     // Maximum size in KB
  batchSize: 10,     // Users processed per batch
  dryRun: false      // Set to true for testing
};
```

## What Gets Processed

The script will:
- ✅ **Process**: Base64 data URLs (`data:image/...;base64,`)
- ⏭️ **Skip**: External URLs (`http://`, `https://`)
- ⏭️ **Skip**: Already small images (≤50KB)
- ⏭️ **Skip**: Users without avatar data

## Output Example

```
🚀 Starting avatar compression process...

📋 Configuration:
   Target size: 128x128
   Quality: 75%
   Max size: 50KB
   Batch size: 10
   Dry run: NO

🔍 Finding users with avatar data...
📊 Found 15 users with avatar data

📦 Processing batch 1/2 (10 users)

📸 Processing avatar for: John Doe (john@example.com)
   User ID: user_123
   📊 Original size: 245KB, type: image/png
    Original: 512x512, png, 245KB
    Compressed: 128x128, jpeg, 32KB
   📉 Compression: 245KB → 32KB (87% reduction)
   ✅ Avatar compressed and updated successfully

============================================================
📊 COMPRESSION SUMMARY
============================================================
Total users processed: 15
✅ Compressed: 12
⏭️  Skipped: 2
❌ Errors: 1

💾 Storage Impact:
   Before: 1,847KB
   After: 456KB
   Saved: 1,391KB (75% reduction)

✅ Avatar compression process completed!
```

## Safety Features

- **Dry Run Mode**: Test without making changes
- **Batch Processing**: Prevents database overload
- **Error Handling**: Continues processing if individual avatars fail
- **Backup Recommendation**: Always backup your database first
- **Rollback**: Original images are replaced (backup recommended)

## Before Running

1. **Backup your database**:
   ```bash
   # Example for PostgreSQL
   pg_dump your_database > backup_before_compression.sql
   ```

2. **Test with dry run**:
   ```bash
   npm run compress:avatars:dry-run
   ```

3. **Check results** and verify they look reasonable

4. **Run actual compression**:
   ```bash
   npm run compress:avatars
   ```

## Troubleshooting

### Common Issues

1. **"Sharp not found"**:
   ```bash
   npm install sharp
   ```

2. **"Permission denied"**:
   - Ensure you have database write permissions
   - Check if any users are currently logged in (sessions might lock records)

3. **"Out of memory"**:
   - Reduce `batchSize` in configuration
   - Process during low-traffic periods

### Monitoring

After compression, monitor:
- Session data size warnings should disappear
- API response times should improve
- Avatar loading should be faster

## Integration with Session Fix

This script is part of the larger session data optimization that includes:
1. ✅ Excluding `avatarData` from auth queries
2. ✅ Using safe user query helpers
3. ✅ Serving avatars via `/api/users/[id]/avatar/image`
4. ✅ Compressing existing large avatars (this script)

## Maintenance

Run periodically to compress new large avatars:
- Weekly/monthly via cron job
- After bulk user imports
- When session warnings reappear

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify Sharp is properly installed
3. Ensure database connectivity
4. Try with a smaller batch size
5. Run in dry-run mode first to identify problematic images