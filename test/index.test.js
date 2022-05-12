'use strict'
const { setTimeout } = require('timers/promises')

const tap = require('tap')
const fastify = require('fastify')
const { request } = require('undici')

const plugin = require('../.')
const { Errors } = require('../lib')

tap.plan(2)

tap.test('fastify-racing#decoration', subtest => {
  subtest.plan(4)

  subtest.test('Should decorate the request properly', async t => {
    t.plan(3)

    const app = fastify()
    app.register(plugin)

    app.get('/', (req, reply) => {
      t.ok(req.race, 'should decorate request object')
      t.equal(typeof req.race, 'function', 'should be a function')

      return 'hello'
    })

    const response = await app.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.body, 'hello')
  })

  subtest.test('Should throw if invalid Global opts', async t => {
    t.plan(3)

    const app = fastify()
    try {
      await app.register(plugin, 'invalid').ready()
    } catch (err) {
      t.ok(err, 'should throw')
      t.equal(err.code, 'FST_PLUGIN_RACE_BAD_PARAM')
      t.equal(err.message, 'Invalid param, expected object but received string')
    }
  })

  subtest.test('Should throw if invalid Global opts.handleOnError', async t => {
    t.plan(3)

    const app = fastify()
    try {
      await app.register(plugin, { handleOnError: 'invalid' }).ready()
    } catch (err) {
      t.ok(err, 'should throw')
      t.equal(err.code, 'FST_PLUGIN_RACE_BAD_PARAM')
      t.equal(
        err.message,
        'Invalid param, expected boolean but received string'
      )
    }
  })

  subtest.test(
    'Should throw if invalid Global opts.onRequestClosed',
    async t => {
      t.plan(3)

      const app = fastify()
      try {
        await app.register(plugin, { onRequestClosed: 1 }).ready()
      } catch (err) {
        t.ok(err, 'should throw')
        t.equal(err.code, 'FST_PLUGIN_RACE_BAD_PARAM')
        t.equal(
          err.message,
          'Invalid param, expected function but received number'
        )
      }
    }
  )
})

// TODO: find what's hanging the tests
// TODO: remove "only" once done
tap.test('fastify-racing#promise', { only: true }, subtest => {
  subtest.plan(4)

  subtest.test('Should handle a request aborted', t => {
    t.plan(3)

    const app = fastify()
    // eslint-disable-next-line no-undef
    const abtCtlr = new AbortController()
    app.register(plugin)

    t.teardown(() => app.close())

    app.get('/', async (req, _reply) => {
      const signal = req.race()
      const result = await Promise.race([signal, dummy(signal)])

      t.equal(typeof result, 'object')
      t.equal(result.type, 'abort')

      if (result.type === 'aborted') return ''
      else return `${result}-world`
    })

    app
      .ready()
      .then(() => app.listen())
      .then(async () => {
        request(
          `http://localhost:${app.server.address().port}`,
          {
            method: 'GET',
            path: '/',
            signal: abtCtlr.signal
          },
          err => {
            t.ok(err)
          }
        )

        // Allow a full event loop cycle
        await setTimeout(5)
        abtCtlr.abort()
      })
  })

  subtest.test(
    'Should be able to handle more than one race check within a request',
    t => {
      const app = fastify()
      // eslint-disable-next-line no-undef
      const abtCtlr = new AbortController()
      let starter

      t.plan(10)

      app.register(plugin)

      app.get(
        '/',
        {
          preHandler: [
            async (req, _reply) => {
              starter = req.race()
              const result = await Promise.race([starter, dummy(starter, 10)])
              t.equal(result, 'hello')
            },
            async (req, _reply) => {
              const second = req.race()
              const result = await Promise.race([second, dummy(second, 10)])

              t.equal(result, 'hello')
              t.equal(
                starter,
                second,
                'Should use the same AbortController instance'
              )
            },
            async (req, _reply) => {
              const third = req.race()
              const result = await Promise.race([third, dummy(third, 10)])
              t.equal(result, 'hello')
              t.equal(
                starter,
                third,
                'Should use the same AbortController instance'
              )
            }
          ]
        },
        async (req, _reply) => {
          const final = req.race()

          const result = await Promise.race([final, dummy(final, 2000)])

          t.ok(final.aborted)
          t.equal(final, starter, 'Should reuse the initial controller')

          t.equal(typeof result, 'object')
          t.equal(result.type, 'abort')

          return ''
        }
      )

      t.teardown(() => app.close())

      app
        .ready()
        .then(() => app.listen())
        .then(async () => {
          request(
            `http://localhost:${app.server.address().port}`,
            {
              method: 'GET',
              path: '/',
              signal: abtCtlr.signal
            },
            err => {
              t.ok(err)
            }
          )

          // Allow a full event loop cycle
          await setTimeout(500)
          abtCtlr.abort()
        })
    }
  )

  subtest.test(
    'Should reuse AbortController for the single request',
    async t => {
      let first
      const app = fastify()

      t.plan(5)

      app.register(plugin)

      app.get(
        '/',
        {
          preHandler: (req, _reply, done) => {
            first = req.race()

            t.ok(first)
            done()
          }
        },
        (req, _reply) => {
          const second = req.race()

          t.notOk(second.aborted)
          t.equal(second, first, 'Should reuse the initial controller')

          return 'Hello World'
        }
      )

      t.teardown(() => app.close())

      await app.listen()

      const response = await request(
        `http://localhost:${app.server.address().port}`,
        {
          method: 'GET',
          path: '/'
        }
      )

      t.equal(response.statusCode, 200)
      t.equal(await response.body.text(), 'Hello World')
      t.end()
    }
  )

  // TODO: Find how to close the socket after request finished
  subtest.test(
    'Should throw on already closed request',
    { skip: false },
    async t => {
      let first
      const app = fastify()

      t.plan(7)

      app.register(plugin)

      app.get(
        '/',
        {
          onResponse: async (req, _reply, done) => {
            req.raw.destroy()

            try {
              first = await req.race()
            } catch (err) {
              t.ok(err)
              t.ok(err instanceof Errors.SOCKET_CLOSED)
              t.equal(err.code, 'FST_PLUGIN_RACE_SOCKET_CLOSED')
              t.equal(err.statusCode, 500)
            }

            t.notOk(first)
            done()
          }
        },
        (req, _reply) => {
          return 'Hello World'
        }
      )

      t.teardown(() => app.close())

      await app.listen()

      const response = await request(
        `http://localhost:${app.server.address().port}`,
        {
          method: 'GET',
          path: '/'
        }
      )

      t.equal(response.statusCode, 200)
      t.equal(await response.body.text(), 'Hello World')
    }
  )

  async function dummy (signal, ms = 3000) {
    await setTimeout(ms, null, { signal, ref: false })
    return 'hello'
  }
})
