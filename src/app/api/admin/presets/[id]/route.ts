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

    return NextResponse.json(preset)
  } catch (error) {
    console.error('Error fetching preset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preset' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    console.log('Updating preset with inputFields:', body.inputFields)

    const preset = await prisma.preset.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description || '',
        category: body.category || '',
        provider: body.provider,
        credits: parseInt(body.credits) || 1,
        isActive: body.isActive ?? true,
        badge: body.badge || '',
        badgeColor: body.badgeColor || '',
        thumbnailUrl: body.thumbnailUrl,
        prompt: body.prompt,
        inputFields: body.inputFields || null,
        slider_img: body.slider_img || null,
        gallery: body.gallery || null,
      },
    })

    return NextResponse.json(preset)
  } catch (error) {
    console.error('Error updating preset:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      )
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update preset' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Cascade delete is enabled in schema - will automatically delete associated generations
    await prisma.preset.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting preset:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete preset' },
      { status: 500 }
    )
  }
}
