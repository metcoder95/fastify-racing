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

      if (controllers.has(reqId)) {
        const { controller: ctrl, cbs } = controllers.get(reqId)

        if (cb != null) {
          // TODO: handle when socket is destroyed already
          ctrl.signal.addEventListener('abort', cb, {
            once: true
          })

          raw.once('error', err => {
            if (controllers.has(reqId)) {
              const internalCtrl = controllers.get(reqId)
              if (internalCtrl.signal.aborted === false) internalCtrl.abort(err)
            }
          })

          controllers.set(reqId, { controller: ctrl, cbs: cbs.concat(cb) })
        }

        if (raw.socket.destroyed === true) {
          process.nextTick(() => ctrl.abort(Errors.SOCKET_CLOSED(reqId)))
        }

        return ctrl.signal
      } else {
        // eslint-disable-next-line no-undef
        const controller = new AbortController()

        if (cb != null) {
          controller.signal.addEventListener('abort', cb, {
            once: true
          })
        }

        if (cb == null) controller.signal.then = theneable.bind(this)

        if (raw.socket.destroyed) {
          process.nextTick(() => controller.abort(Errors.SOCKET_CLOSED(reqId)))
        } else {
          raw.once('close', () => {
            if (controllers.has(reqId)) {
              const { controller: ctrl } = controllers.get(reqId)
              if (ctrl.signal.aborted === false) controller.abort()
            }
          })

          if (handleError === true || cb != null) {
            raw.once('error', err => {
              if (controllers.has(reqId)) {
                const { controller: ctrl } = controllers.get(reqId)
                if (ctrl.signal.aborted === false) controller.abort(err)
              }
            })
          }
        }

        controllers.set(reqId, { controller, cbs: cb != null ? [cb] : [] })

        return controller.signal
      }

      function theneable (resolve, reject) {
        const { controller, cbs } = controllers.get(reqId)

        if (raw.socket.destroyed === true) {
          return reject(Errors.SOCKET_CLOSED(reqId))
        }

        if (controller.signal.aborted === true) {
          return reject(Errors.ALREADY_ABORTED(reqId))
        }

        try {
          controller.signal.addEventListener('abort', theneableHandler, {
            once: true
          })

          controllers.set(reqId, {
            controller,
            cbs: cbs.concat(theneableHandler)
          })
        } catch (err) {
          reject(err)
        }

        function theneableHandler (evt) {
          resolve(evt)
        }
      }
    }
  },
  {
    fastify: '>=3.24.1',
    name: 'fastify-racing'
  }
)
