# System Settings Migration Required

## Overview
A new `SystemSetting` model has been added to support global color configuration for the timeline feature.

## Migration Required
Before the global color configuration feature will work properly, you need to run the following migration:

```bash
npx prisma migrate dev --name add-system-settings
```

Or in production:
```bash
npx prisma migrate deploy
```

## What This Adds
- **SystemSetting table**: Stores global application settings including timeline colors
- **Admin-only color configuration**: Only users with admin/superadmin roles can modify colors
- **Global color persistence**: Color changes apply to all users immediately

## New Features
- **Timeline Color Configuration**: Admins can customize crew chief and worker type colors
- **Real-time Updates**: Color changes apply immediately across all user sessions
- **Role-based Access**: Only administrators can modify color settings

## API Endpoint
- `GET /api/timeline-colors` - Load current color settings
- `POST /api/timeline-colors` - Save color settings (admin only)  
- `DELETE /api/timeline-colors` - Reset colors to defaults (admin only)

## Usage
1. Admin users will see clickable badges in the Timeline Color Legend
2. Non-admin users will see the same legend but cannot modify colors
3. All color changes are saved globally and apply to all users immediately