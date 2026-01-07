import { NextRequest, NextResponse } from 'next/server'
import { exampleGenerationQueue } from '@/lib/queue'

// GET job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const job = await exampleGenerationQueue.getJob(id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const state = await job.getState()
    const progress = job.progress
    const data = job.data
    const returnValue = job.returnvalue

    return NextResponse.json({
      id: job.id,
      state,
      progress,
      data,
      result: returnValue,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}
