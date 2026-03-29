import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { name, description, promptTemplate, isDefault } = await req.json();

    if (isDefault) {
      await prisma.analysisProfile.updateMany({
        data: { isDefault: false },
      });
    }

    const profile = await prisma.analysisProfile.update({
      where: { id },
      data: {
        name,
        description: description || '',
        promptTemplate,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await prisma.analysisProfile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (profile.isSystem) {
    return NextResponse.json({ error: 'Cannot delete system profiles' }, { status: 400 });
  }

  await prisma.analysisProfile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
