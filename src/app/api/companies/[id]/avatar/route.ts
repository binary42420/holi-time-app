import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('POST /api/companies/[id]/avatar');
  const session = await getServerSession(authOptions);
  console.log('Session:', session);
  if (!session || session.user.role !== 'Admin') {
    console.log('Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = params.id;
  console.log('Company ID:', companyId);

  try {
    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      console.log('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, filename);
    console.log('Saving file to:', filePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(filePath, buffer);
    console.log('File saved successfully');

    const company_logo_url = `/uploads/${filename}`;

    console.log('Updating company in database with new avatar URL:', company_logo_url);
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { company_logo_url },
    });
    console.log('Company updated successfully:', updatedCompany);

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Error uploading company avatar:', error);
    return NextResponse.json({ error: 'Failed to upload company avatar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('DELETE /api/companies/[id]/avatar');
  const session = await getServerSession(authOptions);
  console.log('Session:', session);
  if (!session || session.user.role !== 'Admin') {
    console.log('Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = params.id;
  console.log('Company ID:', companyId);

  try {
    console.log('Fetching company to get avatar URL');
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { company_logo_url: true },
    });

    if (company?.company_logo_url) {
      const oldFilePath = path.join(process.cwd(), 'public', company.company_logo_url);
      console.log('Deleting old avatar file:', oldFilePath);
      try {
        await fs.unlink(oldFilePath);
        console.log('Old avatar file deleted successfully');
      } catch (unlinkError) {
        console.warn(`Could not delete old avatar file ${oldFilePath}:`, unlinkError);
      }
    } else {
      console.log('No avatar URL found for this company.');
    }

    console.log('Updating company in database to remove avatar URL');
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { company_logo_url: null },
    });
    console.log('Company updated successfully:', updatedCompany);

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Error deleting company avatar:', error);
    return NextResponse.json({ error: 'Failed to delete company avatar' }, { status: 500 });
  }
}