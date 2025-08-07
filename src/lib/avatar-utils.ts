import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Downloads an avatar image from a URL and saves it locally
 * @param imageUrl - The URL of the image to download
 * @param userId - The user ID to create a unique filename
 * @returns The local path to the saved image
 */
export async function downloadAndSaveAvatar(imageUrl: string, userId: string): Promise<string> {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public/uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    // Determine file extension from content type or URL
    const contentType = response.headers.get('content-type');
    let extension = 'jpg'; // default
    if (contentType?.includes('png')) extension = 'png';
    else if (contentType?.includes('gif')) extension = 'gif';
    else if (contentType?.includes('webp')) extension = 'webp';

    // Create filename
    const filename = `avatar-${userId}-${Date.now()}.${extension}`;
    const filePath = join(uploadsDir, filename);

    // Save the file
    await writeFile(filePath, buffer);

    // Return the public URL
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error downloading avatar:', error);
    // Return the original URL as fallback
    return imageUrl;
  }
}

/**
 * Validates if a URL is from a trusted avatar source
 * @param url - The URL to validate
 * @returns True if the URL is from a trusted source
 */
export function isTrustedAvatarSource(url: string): boolean {
  const trustedDomains = [
    'lh3.googleusercontent.com',
    'avatars.githubusercontent.com',
    'gravatar.com',
    'secure.gravatar.com'
  ];
  
  try {
    const urlObj = new URL(url);
    return trustedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Gets a user's avatar URL without loading the full base64 data
 * This is optimized for session data to prevent large payloads
 * @param userId - The user ID
 * @returns Promise<string | null> - The avatar URL or null if not found
 */
export async function getUserAvatarUrl(userId: string): Promise<string | null> {
  try {
    const { prisma } = await import('./prisma');
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarData: true,
      }
    });

    if (!user?.avatarData) {
      return null;
    }

    // If it's already a URL, return it
    if (user.avatarData.startsWith('http')) {
      return user.avatarData;
    }

    // If it's base64 data, we could create an endpoint to serve it
    // For now, return null to avoid including large data
    if (user.avatarData.startsWith('data:')) {
      return `/api/users/${userId}/avatar`;
    }

    return user.avatarData;
  } catch (error) {
    console.error('Error fetching user avatar URL:', error);
    return null;
  }
}

/**
 * Checks if avatar data is base64 encoded (and potentially large)
 * @param avatarData - The avatar data string
 * @returns boolean - True if it's base64 data
 */
export function isBase64Avatar(avatarData: string | null): boolean {
  return avatarData?.startsWith('data:') || false;
}