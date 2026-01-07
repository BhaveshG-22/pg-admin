import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single model
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const model = await prisma.globalModel.findUnique({
      where: { id },
      include: {
        modelUsage: {
          include: {
            preset: {
              select: { id: true, title: true, slug: true },
            },
          },
          orderBy: { usedAt: 'desc' },
        },
      },
    })

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    return NextResponse.json({ model })
  } catch (error) {
    console.error('Error fetching model:', error)
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    )
  }
}

// PATCH - Update model
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, imageUrl, gender, isActive } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (gender !== undefined) {
      if (!['MALE', 'FEMALE'].includes(gender)) {
        return NextResponse.json(
          { error: 'Gender must be MALE or FEMALE' },
          { status: 400 }
        )
      }
      updateData.gender = gender
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const model = await prisma.globalModel.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ model })
  } catch (error: any) {
    console.error('Error updating model:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    )
  }
}

// DELETE model
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.globalModel.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting model:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    )
  }
}
