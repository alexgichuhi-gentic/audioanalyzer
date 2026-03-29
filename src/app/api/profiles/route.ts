import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedProfiles } from '@/lib/seed-profiles';

export async function GET() {
  await seedProfiles();

  const profiles = await prisma.analysisProfile.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, promptTemplate, isDefault } = await req.json();

    if (!name || !promptTemplate) {
      return NextResponse.json({ error: 'Name and prompt template are required' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.analysisProfile.updateMany({
        data: { isDefault: false },
      });
    }

    const profile = await prisma.analysisProfile.create({
      data: {
        name,
        description: description || '',
        promptTemplate,
        isDefault: isDefault || false,
        isSystem: false,
      },
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create profile' }, { status: 500 });
  }
}
