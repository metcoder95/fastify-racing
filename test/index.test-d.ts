import { expectType } from 'tsd'

import fastify from 'fastify'
import plugin, { AbortEvent, FastifyRacingSignal } from '..'

const serverHttp = fastify()

serverHttp.register(plugin)

serverHttp.register(plugin, {
  handleError: true,
  onRequestClosed: null
})

serverHttp.get(
  '/',
  {
    preHandler: async (request, _reply) => {
      const signal = request.race()
      const signal2 = request.race({
        handleError: true
      })
      const event = await request.race()
      const event2 = await request.race({
        handleError: true
      })

      const asVoid = request.race(evt => {
        expectType<AbortEvent>(evt)
      })

      expectType<void>(asVoid)
      expectType<FastifyRacingSignal>(signal)
      expectType<AbortEvent>(event)
      expectType<FastifyRacingSignal>(signal2)
      expectType<AbortEvent>(event2)
    }
  },
  async (request, reply) => {
    const signal = request.race()
    const signal2 = request.race({
      handleError: true
    })
    const event = await request.race()
    const event2 = await request.race({
      handleError: true
    })

    const asVoid = request.race(evt => {
      expectType<AbortEvent>(evt)
    })

    expectType<void>(asVoid)
    expectType<FastifyRacingSignal>(signal)
    expectType<AbortEvent>(event)
    expectType<FastifyRacingSignal>(signal2)
    expectType<AbortEvent>(event2)
  }
)

// -> Second level
serverHttp.register(
  function (fastifyInstance, opts, done) {
    fastifyInstance.register(plugin)

    fastifyInstance.get(
      '/',
      {
        preHandler: async (request, _reply) => {
          const signal = request.race()
          const signal2 = request.race({
            handleError: true
          })
          const event = await request.race()
          const event2 = await request.race({
            handleError: true
          })
          const asVoid = request.race(evt => {
            expectType<AbortEvent>(evt)
          })

          expectType<void>(asVoid)
          expectType<FastifyRacingSignal>(signal)
          expectType<AbortEvent>(event)
          expectType<FastifyRacingSignal>(signal2)
          expectType<AbortEvent>(event2)
        }
      },
      async (request, reply) => {
        const signal = request.race()
        const signal2 = request.race({
          handleError: true
        })
        const event = await request.race()
        const event2 = await request.race({
          handleError: true
        })

        const asVoid = request.race(evt => {
          expectType<AbortEvent>(evt)
        })

        expectType<void>(asVoid)
        expectType<FastifyRacingSignal>(signal)
        expectType<AbortEvent>(event)
        expectType<FastifyRacingSignal>(signal2)
        expectType<AbortEvent>(event2)
      }
    )

    done()
  },
  { prefix: '/api' }
)

const serverHttp2 = fastify({ http2: true })

serverHttp2.register(plugin, {
  handleError: true,
  onRequestClosed: null
})

serverHttp2.get(
  '/',
  {
    preHandler: async (request, _reply) => {
      const signal = request.race()
      const signal2 = request.race({
        handleError: true
      })
      const event = await request.race()
      const event2 = await request.race({
        handleError: true
      })

      const asVoid = request.race(evt => {
        expectType<AbortEvent>(evt)
      })

      expectType<void>(asVoid)
      expectType<FastifyRacingSignal>(signal)
      expectType<AbortEvent>(event)
      expectType<FastifyRacingSignal>(signal2)
      expectType<AbortEvent>(event2)
    }
  },
  async (request, reply) => {
    const signal = request.race()
    const signal2 = request.race({
      handleError: true
    })
    const event = await request.race()
    const event2 = await request.race({
      handleError: true
    })

    const asVoid = request.race(evt => {
      expectType<AbortEvent>(evt)
    })

    expectType<void>(asVoid)
    expectType<FastifyRacingSignal>(signal)
    expectType<AbortEvent>(event)
    expectType<FastifyRacingSignal>(signal2)
    expectType<AbortEvent>(event2)
  }
)

// -> First plugin
serverHttp2.register(
  function (fastifyInstance, opts, done) {
    fastifyInstance.register(plugin)

    fastifyInstance.get(
      '/',
      {
        preHandler: async (request, _reply) => {
          const signal = request.race()
          const signal2 = request.race({
            handleError: true
          })
          const event = await request.race()
          const event2 = await request.race({
            handleError: true
          })

          const asVoid = request.race(evt => {
            expectType<AbortEvent>(evt)
          })

          expectType<void>(asVoid)
          expectType<FastifyRacingSignal>(signal)
          expectType<AbortEvent>(event)
          expectType<FastifyRacingSignal>(signal2)
          expectType<AbortEvent>(event2)
        }
      },
      async (request, reply) => {
        const signal = request.race()
        const signal2 = request.race({
          handleError: true
        })
        const event = await request.race()
        const event2 = await request.race({
          handleError: true
        })

        const asVoid = request.race(evt => {
          expectType<AbortEvent>(evt)
        })

        expectType<void>(asVoid)
        expectType<FastifyRacingSignal>(signal)
        expectType<AbortEvent>(event)
        expectType<FastifyRacingSignal>(signal2)
        expectType<AbortEvent>(event2)
      }
    )

    done()
  },
  { prefix: '/api' }
)
