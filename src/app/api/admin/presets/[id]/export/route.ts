import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const preset = await prisma.preset.findUnique({
      where: { id },
    })

    if (!preset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    // Clean export (remove IDs and auto-generated fields)
    const exportData = {
      title: preset.title,
      slug: preset.slug,
      description: preset.description,
      category: preset.category,
      provider: preset.provider,
      credits: preset.credits,
      isActive: preset.isActive,
      badge: preset.badge,
      badgeColor: preset.badgeColor,
      thumbnailUrl: preset.thumbnailUrl,
      prompt: preset.prompt,
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="${preset.slug}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting preset:', error)
    return NextResponse.json(
      { error: 'Failed to export preset' },
      { status: 500 }
    )
  }
}
