import { getPhotoCached } from '@/photo/cache';
import { NextRequest } from 'next/server';
import { getFileNamePartsFromStorageUrl } from '@/platforms/storage';

// Helper function to get MIME type from file extension
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await context.params;
  
  const photo = await getPhotoCached(photoId);
  
  if (!photo) {
    return new Response('Photo not found', { status: 404 });
  }

  try {
    // Fetch the actual image from storage
    const imageResponse = await fetch(photo.url, { cache: 'no-store' });
    
    if (!imageResponse.ok) {
      return new Response('Image not found in storage', { status: 404 });
    }

    // Get the original file extension from storage URL
    const { fileExtension } = getFileNamePartsFromStorageUrl(photo.url);
    const mimeType = getMimeType(fileExtension || 'jpg');
    
    // Get image buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Return image with proper headers
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new Response('Internal server error', { status: 500 });
  }
}