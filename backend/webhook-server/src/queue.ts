import { Queue } from 'bullmq'
import { config } from './config'

const connection = {
  host: config.redis.host,
  port: config.redis.port,
}

export const transactionQueue = new Queue('transaction-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 20,    // keep last 1000 completed jobs for debugging
    },
    removeOnFail: {
      count: 5000,    // keep last 5000 failed jobs for investigation
    },
  },
})

console.log('Transaction queue connected to Redis')

export default transactionQueue