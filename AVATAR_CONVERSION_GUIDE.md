# Avatar URL to Base64 Conversion Guide

This guide helps you convert image URLs to base64 format for user avatars in your Holitime app.

## 📁 Files Created

- `scripts/convert-avatar-urls.js` - Node.js conversion script
- `scripts/convert-avatar-urls.ps1` - PowerShell conversion script  
- `scripts/update-user-avatars.js` - Database update script
- `avatar-urls.txt` - Input file (you create this)
- `avatar-base64-results.json` - Output file (generated)

## 🚀 Quick Start

### Step 1: Create Input File

Create a file called `avatar-urls.txt` in your project root with your image URLs.

**Format Options:**

#### Option A: Plain URLs (simplest)
```
https://example.com/avatars/user1.jpg
https://example.com/avatars/user2.png
https://example.com/avatars/user3.jpg
```

#### Option B: CSV Format (recommended)
```
user1@company.com,https://example.com/avatars/user1.jpg
user2@company.com,https://example.com/avatars/user2.png
john.doe@company.com,https://example.com/avatars/user3.jpg
```

#### Option C: JSON Format (most flexible)
```json
{"email": "user1@company.com", "url": "https://example.com/avatars/user1.jpg"}
{"email": "user2@company.com", "url": "https://example.com/avatars/user2.png"}
{"id": "user123", "name": "John Doe", "url": "https://example.com/avatars/user3.jpg"}
```

### Step 2: Run Conversion Script

#### Using Node.js (Recommended)
```bash
cd "c:\Users\ryley\WebstormProjects\untitled\my-next-app"
node scripts/convert-avatar-urls.js
```

#### Using PowerShell
```powershell
cd "c:\Users\ryley\WebstormProjects\untitled\my-next-app"
.\scripts\convert-avatar-urls.ps1
```

### Step 3: Review Results

The script will create `avatar-base64-results.json` with:
- Summary statistics
- Successful conversions with base64 data
- Failed conversions with error messages

### Step 4: Update Database (Optional)

If you want to automatically update user avatars in the database:

```bash
# Preview changes (dry run)
node scripts/update-user-avatars.js --dry-run

# Apply changes
node scripts/update-user-avatars.js
```

## ⚙️ Configuration Options

### Node.js Script Options
Edit `scripts/convert-avatar-urls.js`:

```javascript
const CONFIG = {
  inputFile: 'avatar-urls.txt',        // Input file name
  outputFile: 'avatar-base64-results.json', // Output file name
  maxFileSize: 5 * 1024 * 1024,       // 5MB max file size
  timeout: 30000,                      // 30 second timeout
  concurrent: 5,                       // Process 5 images at once
  retries: 3,                         // Retry failed downloads
};
```

### PowerShell Script Options
```powershell
.\scripts\convert-avatar-urls.ps1 -InputFile "my-urls.txt" -OutputFile "results.json" -MaxFileSizeMB 10 -Concurrent 3
```

## 📊 Example Output

### Console Output
```
🖼️  Avatar URL to Base64 Converter
=====================================
📁 Reading input file: avatar-urls.txt
📊 Found 150 URLs to process
⚙️  Max file size: 5.0MB
⚙️  Concurrent downloads: 5
⚙️  Timeout: 30s

Processing batch 1/30 (5 images)
✅ user1@company.com - 45.2KB
✅ user2@company.com - 67.8KB
❌ user3@company.com - HTTP 404: Not Found
✅ user4@company.com - 23.1KB
✅ user5@company.com - 89.4KB

📊 Summary:
✅ Successful: 142
❌ Failed: 8
📦 Total size: 12.45MB
⏱️  Time taken: 45.3s

💾 Results saved to: avatar-base64-results.json
🎉 Conversion complete!
```

### Results File Structure
```json
{
  "summary": {
    "total": 150,
    "successful": 142,
    "failed": 8,
    "totalSizeBytes": 13058234,
    "processingTimeMs": 45300,
    "timestamp": "2024-01-15T10:30:45.123Z"
  },
  "results": [
    {
      "success": true,
      "url": "https://example.com/avatar1.jpg",
      "identifier": "user1@company.com",
      "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
      "size": 46234,
      "contentType": "image/jpeg"
    },
    {
      "success": false,
      "url": "https://example.com/avatar2.jpg",
      "identifier": "user2@company.com",
      "error": "HTTP 404: Not Found"
    }
  ]
}
```

## 🔧 Advanced Usage

### Custom Input File Processing

If you have a complex data format, you can modify the `parseInputFile` function:

```javascript
// Example: Processing CSV with custom columns
function parseCustomCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').slice(1); // Skip header
  
  return lines.map(line => {
    const [id, name, email, avatarUrl, department] = line.split(',');
    return {
      identifier: email.trim(),
      url: avatarUrl.trim(),
      metadata: {
        id: id.trim(),
        name: name.trim(),
        department: department.trim()
      }
    };
  }).filter(item => item.url);
}
```

### Batch Processing Large Lists

For very large lists (1000+ images), consider:

1. **Split into smaller files**:
   ```bash
   split -l 100 avatar-urls.txt batch_
   ```

2. **Process each batch separately**:
   ```bash
   node scripts/convert-avatar-urls.js batch_aa
   node scripts/convert-avatar-urls.js batch_ab
   ```

3. **Merge results**:
   ```javascript
   // Custom script to merge multiple result files
   ```

### Error Handling and Retries

The script automatically handles:
- Network timeouts
- HTTP redirects
- File size limits
- Invalid image formats
- Rate limiting (with delays)

## 🗄️ Database Integration

### Manual Integration

Use the results to update your database manually:

```javascript
const results = JSON.parse(fs.readFileSync('avatar-base64-results.json'));

for (const result of results.results) {
  if (result.success) {
    await prisma.user.update({
      where: { email: result.identifier },
      data: { avatarData: result.base64 }
    });
  }
}
```

### Automated Integration

Use the provided update script:

```bash
# Preview changes
node scripts/update-user-avatars.js --dry-run

# Apply changes
node scripts/update-user-avatars.js
```

## 🚨 Troubleshooting

### Common Issues

1. **"File too large" errors**
   - Increase `maxFileSize` in config
   - Or pre-process images to reduce size

2. **"Request timeout" errors**
   - Increase `timeout` value
   - Check network connectivity
   - Some servers may be slow

3. **"HTTP 403/404" errors**
   - URLs may be invalid or expired
   - Server may block automated requests
   - Try adding User-Agent header

4. **"Invalid content type" errors**
   - URL doesn't point to an image
   - Server returns HTML instead of image

### Performance Tips

1. **Adjust concurrency**: Lower for slower networks, higher for faster
2. **Use smaller batches**: If memory usage is high
3. **Add delays**: If servers are rate-limiting
4. **Filter URLs first**: Remove obviously invalid URLs

### Memory Considerations

- Each image is loaded into memory during conversion
- 5MB limit per image = ~25MB memory per batch of 5
- For large batches, consider processing in smaller chunks

## 📋 Checklist

Before running:
- [ ] Created input file with correct format
- [ ] Verified URLs are accessible
- [ ] Configured appropriate file size limits
- [ ] Set reasonable timeout values
- [ ] Have sufficient disk space for results

After running:
- [ ] Check summary statistics
- [ ] Review failed conversions
- [ ] Verify base64 data is valid
- [ ] Test a few conversions manually
- [ ] Backup database before applying updates

## 🎯 Best Practices

1. **Start small**: Test with 10-20 URLs first
2. **Use identifiers**: Always include user identifiers for matching
3. **Backup first**: Create database backup before updates
4. **Validate results**: Spot-check converted images
5. **Monitor resources**: Watch memory and disk usage
6. **Handle failures**: Plan for partial failures
7. **Rate limiting**: Be respectful to source servers

## 🔗 Integration with Holitime

The converted base64 images can be used directly in your Holitime app:

```javascript
// In your user profile component
<img 
  src={user.avatarData || '/default-avatar.png'} 
  alt={user.name}
  className="w-10 h-10 rounded-full"
/>
```

The base64 format is perfect for:
- Immediate display (no additional HTTP requests)
- Offline functionality
- Consistent loading times
- No external dependencies