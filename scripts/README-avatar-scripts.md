# Avatar Management Scripts

This directory contains scripts for managing and maintaining avatar data in the Holitime application.

## Scripts Overview

### 1. `fix-avatar-simple.js`
**Purpose**: Fixes common avatar data formatting issues in the database.

**What it fixes**:
- Missing leading slash in JPEG base64 data (`9j/4AAQ...` → `/9j/4AAQ...`)
- Missing `data:` prefix for raw base64 data
- Incorrect MIME types
- Null/empty avatar data cleanup

**Usage**:
```bash
# Set environment variable and run
$env:DATABASE_URL="your-database-url"; node scripts/fix-avatar-simple.js
```

**Output**: Shows which users were fixed and provides a summary of changes.

### 2. `validate-avatar-data-only.js`
**Purpose**: Validates all avatar data in the database without testing API endpoints.

**What it checks**:
- Correct data URL format (`data:image/type;base64,data`)
- Valid base64 encoding
- Proper image magic numbers (JPEG, PNG, GIF, WebP)
- Reasonable file sizes (500 bytes - 10MB)

**Usage**:
```bash
$env:DATABASE_URL="your-database-url"; node scripts/validate-avatar-data-only.js
```

**Output**: 
- Validation status for each user
- Statistics (image types, sizes, etc.)
- List of any remaining issues

### 3. `validate-avatars.js`
**Purpose**: Comprehensive validation including API endpoint testing.

**What it tests**:
- Avatar data format validation
- API endpoint functionality (`/api/users/[id]/avatar/image`)
- Response headers and content types

**Usage**:
```bash
# Requires development server to be running
$env:DATABASE_URL="your-database-url"; node scripts/validate-avatars.js
```

### 4. `fix-avatar-data.js` (Advanced)
**Purpose**: Comprehensive avatar data analysis and fixing with backup functionality.

**Features**:
- Detailed issue analysis
- Backup creation before making changes
- Dry-run mode
- Advanced error detection

**Usage**:
```bash
# Dry run (recommended first)
$env:DATABASE_URL="your-database-url"; node scripts/fix-avatar-data.js

# Apply fixes with backup
$env:DATABASE_URL="your-database-url"; node scripts/fix-avatar-data.js --apply --backup
```

## Common Issues and Solutions

### Issue: "Missing leading slash in JPEG base64"
**Cause**: JPEG base64 data starts with `9j/4AAQ` instead of `/9j/4AAQ`
**Solution**: Run `fix-avatar-simple.js`

### Issue: "Invalid avatar data format"
**Cause**: Data doesn't match `data:image/type;base64,data` pattern
**Solution**: Run `fix-avatar-data.js` for comprehensive analysis

### Issue: "Avatar not loading in frontend"
**Cause**: Component passing both `src` and `userId` props
**Solution**: Update component to only pass `userId` prop

## Maintenance Schedule

**Recommended**: Run validation scripts after:
- Bulk user imports
- Avatar upload feature changes
- Database migrations
- User reports of missing avatars

## Environment Variables

All scripts require the `DATABASE_URL` environment variable:

```bash
# Development
$env:DATABASE_URL="postgresql://user:password@host:port/database"

# Or set in .env.development file
DATABASE_URL=postgresql://user:password@host:port/database
```

## Current Status (Last Updated)

- **Total Users with Avatars**: 41
- **Valid Avatar Data**: 41/41 (100%)
- **Common Image Type**: JPEG
- **Average Size**: 5KB
- **All API Endpoints**: Working ✅

## Troubleshooting

### Script fails with "Environment variable not found: DATABASE_URL"
**Solution**: Set the DATABASE_URL environment variable before running the script.

### Script fails with "Cannot connect to database"
**Solution**: Check database connection details and network connectivity.

### Validation shows "Invalid avatar data" but image looks correct
**Solution**: The validation might be too strict. Check the specific validation criteria in the script.

### API endpoint returns 404 for avatar
**Solution**: 
1. Verify user ID exists in database
2. Check if user has avatar data
3. Ensure development server is running
4. Check avatar API route implementation