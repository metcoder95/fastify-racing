/// <reference types="node" />
import { FastifyPluginCallback } from 'fastify';
import { FastifyError } from 'fastify-error';


interface AbortEvent {
    type: 'abort' | string;
    reason?: FastifyError | Error
}

interface FastifyRacing {
  handleError?: boolean;
  onRequestClosed?: (evt: AbortEvent) => void;
}

declare module 'fastify' {
  interface FastifyInstance {
      race(cb: FastifyRacing['onRequestClosed']): void
      race(opts: FastifyRacing): Promise<AbortEvent>
      race(): Promise<AbortEvent>
  }
}

declare const FastifyRacing: FastifyPluginCallback<FastifyRacing>;

export default FastifyRacing;