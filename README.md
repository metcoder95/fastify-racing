# fastify-racing

[![CI](https://github.com/metcoder95/fastify-racing/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/metcoder95/fastify-racing/actions/workflows/ci.yml) [![CodeQL](https://github.com/metcoder95/fastify-racing/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/metcoder95/fastify-racing/actions/workflows/codeql-analysis.yml)

---

`fastify-racing` is a plugin which allows you handle possible client request abortions by exposing an `AbortSignal` instance that will be aborted just and only when the client has closed the request abruptly (e.g. by closing the browser tab).

## How it works?

On every request and after a first invocation, the plugin well schedule event listeners to the [`close`](https://nodejs.org/api/net.html#event-close_1) event triggered by the [Socket](https://nodejs.org/api/net.html#new-netsocketoptions) instance attached to the  request object.

Along with that, the plugin will instanciate and cache an [`AbortController`](https://nodejs.org/api/globals.html#class-abortcontroller) instance for each request.

When the `close` event is triggered, the plugin will check if the [`AbortSignal`](https://nodejs.org/api/globals.html#class-abortsignal) instance is already aborted, and if not will abort it using the `AbortController` instance.

Is guaranteed that one and just one `AbortController` and `AbortSignal` will be made per request.

If the request was not aborted during its lifetime, the plugin will remove the `AbortController` and `AbortSignal` from the cache. This by scheduling a callback on the hook `onResponse`.

If the request aborted, the same hook will be used for cleaning resources.

A [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) is used under the hood for caching, ensuring that the `AbortController` and `AbortSignal` instances can be unliked if not needed anymore, and for instance GC'ed.

## Setup

Install by running `npm install fastify-racing`.

Then register the plugin to your fastify instance:

```js
const fastify = require('fastify')({
  logger: true
})

fastify.register(require('fastify-racing'), {
    handleError: true,
})
```

### Options

**On Setup**

- `handleError`: Indicates to the pluging if an event listener to the Socket [`error`](https://nodejs.org/api/net.html#event-error_1) event should be attached or not. Default `true`.

- `onRequestClosed`: Default callback to be used of none is passed during runtime It will receive as argument the event object similar to the `abort` event handler. Default `null`


## How to use it?

There are two ways to use this plugin:

### Promise

It will return a promise that will be resolved when the request is aborted. It will be resolved with the result of the [`abort`](https://nodejs.org/api/globals.html#event-abort) event object of the `AbortSignal` instance. This only if no `cb` has been passed as argument.

It supports an object as argument:

- `opts.handleError`: [Optional] Indicates to the plugin to ignore or listen to the Socket [`error`](https://nodejs.org/api/net.html#event-error_1) event. Default to `pluginOption.handleError` passed when registering the pluging or `false`.

**JavaScript**

```js
app.get('/', async (req, _reply) => {
    const signal = req.race()
    const result = await Promise.race([signal, asyncOp(signal)])

    if (result.type === 'aborted') return ''
    else return `${result}-world`
})
```

**TypeScript**
```ts
app.post('/', (request: FastifyRequest, reply: FastifyReply) => {
    const signal = req.race()
    const result: AbortEvent | unknown = await Promise.race([signal, asyncOp(signal)])

    if ((<AbortEvent>result).type === 'aborted') return ''
    else return `${result}-world`
});
```


### Callback

If a callback is provided, no promise will be scheduled/returned during the lifetime of the request.

- `cb`: Similar signature as `onRequestClosed`. Default `undefined` or to `onRequestClosed` if passed when registering the plugin.

**JavaScript**

```js
app.get('/', (req, reply) => {
    const signal = req.race((evt) => {
        const result = result.type === 'aborted' ? '' : `${result}-world`

        reply.send(result)
    })
})
```

**TypeScript**

```ts
app.post('/', (request: FastifyRequest, reply: FastifyReply) => {
    const signal = req.race((evt: AbortEvent) => {
        reply.send('')
    })
});
```

## Type Definitions

```ts
interface AbortEvent {
    type: 'abort' | string;
    reason?: FastifyError | Error
}

interface FastifyRacing {
  handleError?: boolean;
  onRequestClosed?: (evt: AbortEvent) => void;
}

interface FastifyInstance {
    race(cb: FastifyRacing['onRequestClosed']): void
    race(opts: Omit<FastifyRacing, 'onRequestClosed'>): Promise<AbortEvent>
    race(): Promise<AbortEvent>
}
```


> See [test](test/index.test.js) for more examples.