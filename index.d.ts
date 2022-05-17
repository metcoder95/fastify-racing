/// <reference types="node" />
import { FastifyPluginCallback } from 'fastify'
import { FastifyError } from '@fastify/error'

export interface FastifyRacingSignal extends AbortSignal {
  then: (
    onFulfilled?: (value: AbortEvent) => void | PromiseLike<unknown>,
    onRejected?: (reason: Error | FastifyError) => void | PromiseLike<unknown>
  ) => void | Promise<unknown>
}

export interface AbortEvent {
  type: 'abort' | string
  reason?: FastifyError | Error
}

export interface FastifyRacingOptions {
  handleError?: boolean
  onRequestClosed?: ((evt: AbortEvent) => void) | null
}

declare module 'fastify' {
  interface FastifyRequest {
    race(cb: FastifyRacingOptions['onRequestClosed']): void
    race(opts: Omit<FastifyRacingOptions, 'onRequestClosed'>): FastifyRacingSignal
    race(opts: Omit<FastifyRacingOptions, 'onRequestClosed'>): Promise<AbortEvent>
    race(): FastifyRacingSignal
    race(): Promise<AbortEvent>
  }
}

declare const FastifyRacing: FastifyPluginCallback<FastifyRacingOptions>

export default FastifyRacing
