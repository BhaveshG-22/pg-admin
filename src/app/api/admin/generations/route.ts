import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const presetId = searchParams.get('presetId')
    const sort = searchParams.get('sort') || 'newest'
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    // Search filter (by user email or preset title)
    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { preset: { title: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Status filter
    if (status) {
      where.status = status
    }

    // User filter
    if (userId) {
      where.userId = userId
    }

    // Preset filter
    if (presetId) {
      where.presetId = presetId
    }

    // Sort order
    let orderBy: any = {}
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' }
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' }
    }

    const generations = await prisma.generation.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            tier: true,
          },
        },
        preset: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
          },
        },
        results: true,
      },
    })

    return NextResponse.json(generations)
  } catch (error) {
    console.error('Error fetching generations:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch generations',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
