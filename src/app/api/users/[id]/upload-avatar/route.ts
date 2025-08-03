import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { Storage } from '@google-cloud/storage';

// Configure Google Cloud Storage
const storage = new Storage();
const bucketName = process.env.GCS_AVATAR_BUCKET || 'your-gcs-bucket-name';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!bucketName || bucketName === 'your-gcs-bucket-name') {
    console.error('GCS_AVATAR_BUCKET environment variable not set.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const adminUser = await getCurrentUser(req);
  const { id: targetUserId } = params;

  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (adminUser.role !== UserRole.Admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${targetUserId}-${Date.now()}-${file.name}`;
    
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.type,
    });

    await new Promise((resolve, reject) => {
      blobStream.on('finish', resolve);
      blobStream.on('error', reject);
      blobStream.end(buffer);
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

    await prisma.user.update({
      where: { id: targetUserId },
      data: { avatarUrl: publicUrl },
    });

    return NextResponse.json({ avatarUrl: publicUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}