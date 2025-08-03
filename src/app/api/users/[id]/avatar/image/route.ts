import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDataUrl } from '@/lib/image-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get user's avatar data from database
    const user = await prisma.user.findUnique({
      where: { id },
      select: { avatarData: true, name: true }
    });

    if (!user) {
      console.log(`Avatar request: User not found for ID: ${id}`);
      // Return a fallback avatar instead of JSON error
      const fallbackUrl = `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128`;
      return NextResponse.redirect(fallbackUrl);
    }

    // Check for avatar data
    let avatarData = user.avatarData;
    
    // If still no avatar data, generate fallback
    if (!avatarData || avatarData === '<null>' || avatarData === 'null') {
      // Generate fallback avatar URL using UI Avatars
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name
      )}&background=random&color=fff&size=128`;
      
      console.log(`Avatar request: No avatar data found for user ${user.name} (${id}), redirecting to fallback: ${fallbackUrl}`);
      return NextResponse.redirect(fallbackUrl);
    }

    // If it's a data URL, parse it
    if (avatarData.startsWith('data:')) {
      try {
        const { buffer, mimeType } = parseDataUrl(avatarData);
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (parseError) {
        console.error('Error parsing avatar data URL:', parseError);
        // Return a fallback avatar instead of JSON error
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name
        )}&background=random&color=fff&size=128`;
        return NextResponse.redirect(fallbackUrl);
      }
    }

    // If it's an external URL, fetch, convert to base64, and save permanently
    if (avatarData.startsWith('http://') || avatarData.startsWith('https://')) {
      console.log(`Avatar request: Converting external URL to local storage for user ${user.name} (${id}): ${avatarData}`);
      
      try {
        const externalResponse = await fetch(avatarData, {
          headers: {
            'User-Agent': 'Holitime-Avatar-Cache/1.0',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        
        if (!externalResponse.ok) {
          console.error(`Failed to fetch external avatar for ${user.name}: ${externalResponse.status} ${externalResponse.statusText}`);
          // Fall back to UI Avatars
          const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.name
          )}&background=random&color=fff&size=128`;
          return NextResponse.redirect(fallbackUrl);
        }

        const imageBuffer = await externalResponse.arrayBuffer();
        const contentType = externalResponse.headers.get('content-type') || 'image/png';
        
        // Convert to base64 data URL
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        // Permanently save the converted data to database (async, don't wait)
        prisma.user.update({
          where: { id },
          data: { avatarData: dataUrl }
        }).then(() => {
          console.log(`✅ Successfully converted and saved avatar for ${user.name} (${id})`);
          console.log(`📦 Original URL: ${avatarData}`);
          console.log(`💾 Converted to: ${dataUrl.substring(0, 50)}... (${base64.length} chars)`);
        }).catch((error) => {
          console.error(`❌ Failed to save converted avatar for ${user.name}:`, error);
        });

        // Serve the converted image immediately
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year since it's now local
            'X-Avatar-Source': 'external-converted',
            'X-Original-URL': avatarData,
            'X-Conversion-Status': 'converted-and-saved',
          },
        });
      } catch (error) {
        console.error(`Error converting external avatar for ${user.name}:`, error);
        // Fall back to UI Avatars
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name
        )}&background=random&color=fff&size=128`;
        return NextResponse.redirect(fallbackUrl);
      }
    }

    // If we reach here, avatarData format is not supported
    console.error(`Unsupported avatar data format for user ${user.name} (${id}): ${avatarData.substring(0, 50)}...`);
    // Return a fallback avatar instead of JSON error
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.name
    )}&background=random&color=fff&size=128`;
    return NextResponse.redirect(fallbackUrl);

  } catch (error) {
    console.error('Error serving avatar:', error);
    // Return a fallback avatar instead of JSON error
    const fallbackUrl = `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128`;
    return NextResponse.redirect(fallbackUrl);
  }
}

// Handle HEAD requests (used by browsers to check if image exists)
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get user's avatar data from database
    const user = await prisma.user.findUnique({
      where: { id },
      select: { avatarData: true, name: true }
    });

    if (!user) {
      console.log(`Avatar HEAD request: User not found for ID: ${id}`);
      return new NextResponse(null, { status: 404 });
    }

    // Check for avatar data
    let avatarData = user.avatarData;
    
    // Handle cases where no avatar data is available
    if (!avatarData || avatarData === '<null>' || avatarData === 'null') {
      // For HEAD requests, return success since we can generate a fallback
      console.log(`Avatar HEAD request: No avatar data found for user ${user.name} (${id}), but fallback available`);
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If it's a data URL, return success with content type
    if (avatarData.startsWith('data:')) {
      try {
        const { mimeType } = parseDataUrl(avatarData);
        
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (parseError) {
        return new NextResponse(null, { status: 400 });
      }
    }

    // If it's an external URL, return success
    if (avatarData.startsWith('http://') || avatarData.startsWith('https://')) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': 'image/png', // Assume PNG for external URLs
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If we reach here, avatarData format is not supported
    return new NextResponse(null, { status: 400 });

  } catch (error) {
    console.error('Error checking avatar:', error);
    return new NextResponse(null, { status: 500 });
  }
}
