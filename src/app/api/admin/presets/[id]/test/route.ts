import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const preset = await prisma.preset.findUnique({
      where: { id },
    })

    if (!preset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    // Mock test result (replace with actual provider call in production)
    const testResult = {
      success: true,
      message: 'Test execution successful',
      preset: {
        id: preset.id,
        title: preset.title,
        provider: preset.provider,
      },
      input: body.inputValues || {},
      output: {
        url: 'https://example.com/test-output.png',
        processingTime: Math.floor(Math.random() * 5000) + 1000,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(testResult)
  } catch (error) {
    console.error('Error testing preset:', error)
    return NextResponse.json(
      { error: 'Failed to test preset' },
      { status: 500 }
    )
  }
}
