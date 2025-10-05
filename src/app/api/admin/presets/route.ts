import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const provider = searchParams.get('provider')
    const sort = searchParams.get('sort') || 'newest'

    const where: Record<string, unknown> = {}

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Status filter
    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    // Provider filter
    if (provider) {
      where.provider = provider
    }

    // Sort order
    let orderBy: Record<string, unknown> = {}
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' }
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' }
    } else if (sort === 'title') {
      orderBy = { title: 'asc' }
    }

    const presets = await prisma.preset.findMany({
      where,
      orderBy,
    })

    return NextResponse.json(presets)
  } catch (error) {
    console.error('Error fetching presets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch presets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const preset = await prisma.preset.create({
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
      },
    })

    return NextResponse.json(preset)
  } catch (error) {
    console.error('Error creating preset:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create preset' },
      { status: 500 }
    )
  }
}
