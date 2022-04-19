'use strict'
const { setTimeout } = require('timers/promises')

const tap = require('tap')
const fastify = require('fastify')
const { request } = require('undici')

const plugin = require('../.')

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

tap.test('fastify-racing#promise', subtest => {
  subtest.plan(1)

  subtest.test('Should handle a request aborted', t => {
    t.plan(3)

    const app = fastify()
    // eslint-disable-next-line no-undef
    const abtCtlr = new AbortController()
    app.register(plugin)

    t.teardown(() => app.close())

    app.get('/', async (req, reply) => {
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
          (err, response, body) => {
            t.ok(err)
          }
        )

        // Allow a full event loop cycle
        await setTimeout(5)
        abtCtlr.abort()
      })
  })

  async function dummy (signal) {
    await setTimeout(3000, null, { signal })
    return 'hello'
  }
})
