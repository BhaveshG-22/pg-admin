import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all global models
export async function GET() {
  try {
    const models = await prisma.globalModel.findMany({
      orderBy: [{ gender: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ models })
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

// POST - Create a new global model
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, imageUrl, gender } = body

    if (!name || !imageUrl || !gender) {
      return NextResponse.json(
        { error: 'Missing required fields: name, imageUrl, gender' },
        { status: 400 }
      )
    }

    if (!['MALE', 'FEMALE'].includes(gender)) {
      return NextResponse.json(
        { error: 'Gender must be MALE or FEMALE' },
        { status: 400 }
      )
    }

    const model = await prisma.globalModel.create({
      data: {
        name,
        imageUrl,
        gender,
      },
    })

    return NextResponse.json({ model }, { status: 201 })
  } catch (error) {
    console.error('Error creating model:', error)
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    )
  }
}
