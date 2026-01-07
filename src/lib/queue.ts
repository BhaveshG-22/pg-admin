import { Queue, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'

const connection = new Redis(process.env.GENERATE_QUEUE!, {
  maxRetriesPerRequest: null,
})

export const exampleGenerationQueue = new Queue('example-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 100,
    },
  },
})

export const exampleGenerationEvents = new QueueEvents('example-generation', {
  connection,
})

export interface ExampleGenerationJob {
  presetId: string
  prompt: string
  modelId: string
  modelName: string
  modelImageUrl: string
  modelGender: 'MALE' | 'FEMALE'
  provider: string
}
