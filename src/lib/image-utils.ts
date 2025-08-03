/**
 * Image processing utilities for avatar handling
 */

export interface ProcessedImage {
  dataUrl: string;
  mimeType: string;
  size: number;
}

/**
 * Convert a File to base64 data URL with optional resizing
 */
export async function processImageFile(file: File, maxWidth = 200, maxHeight = 200, quality = 0.8): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress image
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with compression
      const dataUrl = canvas.toDataURL(file.type, quality);
      
      resolve({
        dataUrl,
        mimeType: file.type,
        size: dataUrl.length
      });
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Server-side image processing using Sharp (if available) or Canvas API
 */
export async function processImageBuffer(
  buffer: Buffer, 
  mimeType: string, 
  maxWidth = 200, 
  maxHeight = 200, 
  quality = 80
): Promise<ProcessedImage> {
  try {
    // Try to use Sharp for better server-side image processing
    const sharp = await import('sharp').catch(() => null);
    
    if (sharp) {
      const processedBuffer = await sharp.default(buffer)
        .resize(maxWidth, maxHeight, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality })
        .toBuffer();
      
      const dataUrl = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
      
      return {
        dataUrl,
        mimeType: 'image/jpeg',
        size: dataUrl.length
      };
    }
  } catch (error) {
    console.warn('Sharp not available, using fallback method:', error);
  }
  
  // Fallback: Basic compression by reducing quality and converting to JPEG
  try {
    // For fallback, we'll just convert to base64 with some basic size optimization
    // Convert to JPEG format for better compression if it's not already
    let processedBuffer = buffer;
    let outputMimeType = mimeType;

    // If the original image is too large, we need to reject it since we can't resize without Sharp
    if (buffer.length > 500 * 1024) { // 500KB limit for fallback
      throw new Error('Image too large for processing without Sharp library. Please install Sharp or use a smaller image.');
    }

    // For PNG/GIF/WebP, we'll keep the original format but warn about potential size issues
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/jpg') {
      console.warn(`Using fallback processing for ${mimeType}. Consider installing Sharp for better compression.`);
    }

    const dataUrl = `data:${outputMimeType};base64,${processedBuffer.toString('base64')}`;

    // Check final size
    if (dataUrl.length > 1024 * 1024) { // 1MB limit
      throw new Error('Processed image too large. Please use a smaller image or install Sharp for better compression.');
    }

    return {
      dataUrl,
      mimeType: outputMimeType,
      size: dataUrl.length
    };
  } catch (fallbackError) {
    console.error('Fallback image processing failed:', fallbackError);
    throw new Error(`Image processing failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
  }
}

/**
 * Validate image file (works in both browser and Node.js)
 */
export function validateImageFile(file: File | { type: string; size: number }): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Please upload an image smaller than 5MB.'
    };
  }
  
  return { valid: true };
}

/**
 * Extract image info from data URL
 */
export function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } {
  // Extract the MIME type and base64 data
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  
  if (!matches) {
    throw new Error('Invalid data URL format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');
  
  return { buffer, mimeType };
}

export function isValidImageMimeType(mimeType: string): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  return validTypes.includes(mimeType.toLowerCase());
}

export function getImageExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  };
  
  return extensions[mimeType.toLowerCase()] || 'jpg';
}

/**
 * Generate a data URL for displaying images
 */
export function createImageDataUrl(base64Data: string, mimeType: string = 'image/jpeg'): string {
  if (base64Data.startsWith('data:')) {
    return base64Data; // Already a data URL
  }
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Estimate the file size of a base64 string
 */
export function estimateBase64Size(base64String: string): number {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
  
  // Base64 encoding increases size by ~33%
  return Math.ceil((base64Data.length * 3) / 4);
}
