import { FastifyRequest, FastifyReply } from 'fastify'
import { enqueueSquadExecution, getExecutionStatus, approveCheckpoint, rejectCheckpoint, listExecutionHistory } from './executor.service'

interface StartExecutionBody {
  squadId: string
  inputs: Record<string, string>
}

interface JobIdParams {
  jobId: string
}

interface ListHistoryQuery {
  squadId?: string
  limit?: number
}

export async function startExecutionHandler(
  request: FastifyRequest<{ Body: StartExecutionBody }>,
  reply: FastifyReply
) {
  try {
    const { squadId, inputs } = request.body
    const userId = request.user.userId

    if (!squadId) {
      return reply.status(400).send({
        error: 'Squad ID is required',
        code: 'SQUAD_ID_REQUIRED',
      })
    }

    if (!inputs || typeof inputs !== 'object') {
      return reply.status(400).send({
        error: 'Inputs must be an object',
        code: 'INVALID_INPUTS',
      })
    }

    const jobId = await enqueueSquadExecution(userId, squadId, inputs)

    return reply.send({
      success: true,
      jobId,
      message: 'Execution queued successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'SQUAD_NOT_FOUND') {
      return reply.status(404).send({
        error: 'Squad not found',
        code: 'SQUAD_NOT_FOUND',
      })
    }

    request.log.error(error)
    return reply.status(500).send({
      error: 'Failed to enqueue execution',
      code: 'ENQUEUE_FAILED',
    })
  }
}

export async function getStatusHandler(
  request: FastifyRequest<{ Params: JobIdParams }>,
  reply: FastifyReply
) {
  try {
    const { jobId } = request.params
    const userId = request.user.userId

    const status = await getExecutionStatus(jobId, userId)

    if (!status) {
      return reply.status(404).send({
        error: 'Execution not found',
        code: 'NOT_FOUND',
      })
    }

    return reply.send(status)
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({
      error: 'Failed to get execution status',
      code: 'STATUS_ERROR',
    })
  }
}

export async function listHistoryHandler(
  request: FastifyRequest<{ Querystring: ListHistoryQuery }>,
  reply: FastifyReply
) {
  try {
    const userId = request.user.userId
    const history = await listExecutionHistory(userId, request.query)

    return reply.send({
      executions: history,
    })
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({
      error: 'Failed to list execution history',
      code: 'HISTORY_ERROR',
    })
  }
}

export async function approveCheckpointHandler(
  request: FastifyRequest<{ Params: JobIdParams }>,
  reply: FastifyReply
) {
  try {
    const { jobId } = request.params
    const userId = request.user.userId

    const result = await approveCheckpoint(jobId, userId)

    if (!result) {
      return reply.status(404).send({
        error: 'Execution or checkpoint not found',
        code: 'NOT_FOUND',
      })
    }

    return reply.send({
      success: true,
      message: 'Checkpoint approved',
      execution: result,
    })
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({
      error: 'Failed to approve checkpoint',
      code: 'APPROVE_FAILED',
    })
  }
}

export async function rejectCheckpointHandler(
  request: FastifyRequest<{ Params: JobIdParams }>,
  reply: FastifyReply
) {
  try {
    const { jobId } = request.params
    const userId = request.user.userId

    const result = await rejectCheckpoint(jobId, userId)

    if (!result) {
      return reply.status(404).send({
        error: 'Execution or checkpoint not found',
        code: 'NOT_FOUND',
      })
    }

    return reply.send({
      success: true,
      message: 'Checkpoint rejected',
      execution: result,
    })
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({
      error: 'Failed to reject checkpoint',
      code: 'REJECT_FAILED',
    })
  }
}
