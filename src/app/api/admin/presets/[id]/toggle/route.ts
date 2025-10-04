import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const preset = await prisma.preset.findUnique({
      where: { id },
      select: { isActive: true },
    })

    if (!preset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.preset.update({
      where: { id },
      data: { isActive: !preset.isActive },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error toggling preset status:', error)
    return NextResponse.json(
      { error: 'Failed to toggle preset status' },
      { status: 500 }
    )
  }
}
