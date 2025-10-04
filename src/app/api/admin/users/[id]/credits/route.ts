import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { credits, action } = body

    if (typeof credits !== 'number' || credits < 0) {
      return NextResponse.json(
        { error: 'Invalid credits value' },
        { status: 400 }
      )
    }

    let updatedUser

    if (action === 'set') {
      // Set credits to exact value
      updatedUser = await prisma.user.update({
        where: { id },
        data: { credits },
      })
    } else if (action === 'add') {
      // Add credits
      updatedUser = await prisma.user.update({
        where: { id },
        data: { credits: { increment: credits } },
      })
    } else if (action === 'subtract') {
      // Subtract credits
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const newCredits = Math.max(0, user.credits - credits)
      updatedUser = await prisma.user.update({
        where: { id },
        data: { credits: newCredits },
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: set, add, or subtract' },
        { status: 400 }
      )
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating credits:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        error: 'Failed to update credits',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
