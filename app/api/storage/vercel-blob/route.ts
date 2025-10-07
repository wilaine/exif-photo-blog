import { auth } from '@/auth/server';
import { revalidateAdminPaths, revalidatePhotosKey } from '@/photo/cache';
import {
  ACCEPTED_PHOTO_FILE_TYPES,
  MAX_PHOTO_UPLOAD_SIZE_IN_BYTES,
} from '@/photo';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { isUploadPathnameValid } from '@/photo/storage';

export async function POST(request: Request): Promise<NextResponse> {
  const body: HandleUploadBody = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
          const session = await auth();
          if (!session?.user) {
            throw new Error('Unauthorized');
          }
        
          // 确保文件名带扩展名
          if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(pathname)) {
            throw new Error('File must be an image with extension');
          }
        
          return {
            maximumSizeInBytes: MAX_PHOTO_UPLOAD_SIZE_IN_BYTES,
            allowedContentTypes: ACCEPTED_PHOTO_FILE_TYPES,
            addRandomSuffix: false,  // 关掉随机后缀
            pathname: `img/${pathname}`,  // 强制保存到 img/ 下
          };
        }
      },
      // This argument is required, but doesn't seem to fire
      onUploadCompleted: async () => {
        revalidatePhotosKey();
        revalidateAdminPaths();
      },
    });
    revalidatePhotosKey();
    revalidateAdminPaths();
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
