import { Queue } from 'bullmq'
import { redis } from './redis.js'

export const executorQueue = new Queue('squad-executor', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
})