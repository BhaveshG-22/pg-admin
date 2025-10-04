import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const original = await prisma.preset.findUnique({
      where: { id },
    })

    if (!original) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    // Generate new slug
    const baseSlug = `${original.slug}-copy`
    let newSlug = baseSlug
    let counter = 1

    while (await prisma.preset.findUnique({ where: { slug: newSlug } })) {
      newSlug = `${baseSlug}-${counter}`
      counter++
    }

    const duplicate = await prisma.preset.create({
      data: {
        title: `${original.title} (Copy)`,
        slug: newSlug,
        description: original.description,
        category: original.category,
        provider: original.provider,
        credits: original.credits,
        isActive: false, // Start as inactive
        badge: original.badge,
        badgeColor: original.badgeColor,
        thumbnailUrl: original.thumbnailUrl,
        prompt: original.prompt,
      },
    })

    return NextResponse.json(duplicate)
  } catch (error) {
    console.error('Error duplicating preset:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate preset' },
      { status: 500 }
    )
  }
}
