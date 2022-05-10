'use strict'
const fp = require('fastify-plugin')

const { Errors } = require('./lib/index')

module.exports = fp(
  function fastifyRacePlugin (fastify, globalOpts, next) {
    const controllers = new Map()
    let error

    if (globalOpts != null && typeof globalOpts !== 'object') {
      return next(new Errors.BAD_PARAMS('object', typeof globalOpts))
    }

    globalOpts = Object.assign(
      {},
      { handleOnError: true, onRequestClosed: null },
      globalOpts
    )

    if (typeof globalOpts.handleOnError !== 'boolean') {
      error = new Errors.BAD_PARAMS('boolean', typeof globalOpts.handleOnError)
    } else if (
      globalOpts.onRequestClosed != null &&
      typeof globalOpts.onRequestClosed !== 'function'
    ) {
      error = new Errors.BAD_PARAMS(
        'function',
        typeof globalOpts.onRequestClosed
      )
    }

    fastify.decorateRequest('race', race)
    fastify.addHook('onResponse', onResponseCleaner)

    return next(error)

    function onResponseCleaner (request, _reply, done) {
      if (controllers.has(request.id)) {
        const { controller, cbs } = controllers.get(request.id)

        if (controller.signal.aborted === false) {
          for (const cb of cbs) {
            controller.signal.removeEventListener('abort', cb, {
              once: true
            })
          }
        }

        controllers.delete(request.id)
      }

      done()
    }

    function race (opts = globalOpts) {
      const { raw, id: reqId } = this
      const handleError = typeof opts === 'function' ? true : opts.handleOnError
      const cb = typeof opts === 'function' ? opts : opts.onRequestClosed

      const controller = controllers.has(reqId)
        ? controllers.get(reqId) // eslint-disable-next-line no-undef
        : (controllers.set(reqId, new AbortController()),
          controllers.get(reqId))
      const bindedCleaner = cleaner.bind(this)

      if (cb != null) {
        controller.signal.addEventListener('abort', cb, {
          once: true
        })

        bindedCleaner(cb)
      }

      if (cb == null) controller.signal.then = theneable.bind(this)

      if (raw.socket.destroyed) {
        controller.abort(new Error('Socket already closed'))
      } else {
        raw.once('close', () => {
          if (controller.signal.aborted === false) controller.abort()

          if (controllers.has(reqId)) {
            const controllerSignal = controllers.get(reqId).signal
            controllerSignal.removeEventListener('abort', cb, {
              once: true
            })
            controllers.delete(reqId)
          }
        })

        if (handleError || cb != null) {
          raw.once('error', err => {
            if (controller.signal.aborted === false) controller.abort(err)
          })
        }
      }

      return controller.signal

      function theneable (resolve) {
        try {
          const theneableHandler = evt => {
            resolve(evt)

            if (controllers.has(reqId)) {
              const controllerSignal = controllers.get(reqId).signal
              controllerSignal.removeEventListener('abort', cb, {
                once: true
              })
              controllers.delete(reqId)
            }
          }

          controller.signal.throwIfAborted()
          controller.signal.addEventListener('abort', theneableHandler, {
            once: true
          })
          bindedCleaner(theneableHandler)
        } catch (err) {
          resolve(err)
        }
      }
    }
  },
  {
    fastify: '>=3.24.1',
    name: 'fastify-racing'
  }
)
