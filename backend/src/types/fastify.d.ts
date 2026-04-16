import '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply
    ) => Promise<void>
  }
  interface FastifyRequest {
    user: {
      userId: string
      email: string
    }
    rawBody?: Buffer | string
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string
      email: string
    }
    user: {
      userId: string
      email: string
    }
  }
}
