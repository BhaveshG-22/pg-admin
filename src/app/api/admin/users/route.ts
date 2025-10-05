import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier')
    const sort = searchParams.get('sort') || 'newest'
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}

    // Search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Tier filter
    if (tier) {
      where.tier = tier
    }

    // Sort order
    let orderBy: Record<string, unknown> = {}
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' }
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' }
    } else if (sort === 'credits') {
      orderBy = { credits: 'desc' }
    }

    const users = await prisma.user.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        _count: {
          select: {
            generations: true,
            images: true,
          },
        },
        generations: {
          select: {
            creditsUsed: true,
          },
        },
      },
    })

    // Calculate actual total credits used from generations
    const usersWithCalculatedCredits = users.map(user => {
      const actualTotalUsed = user.generations.reduce((sum, gen) => sum + (gen.creditsUsed || 0), 0)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { generations, ...userWithoutGenerations } = user
      return {
        ...userWithoutGenerations,
        totalCreditsUsed: actualTotalUsed,
      }
    })

    return NextResponse.json(usersWithCalculatedCredits)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
