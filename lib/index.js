const Errors = require('fastify-error')

module.exports = {
  Errors: {
    BAD_PARAMS: Errors(
      'FST_PLUGIN_RACE_BAD_PARAM',
      'Invalid param, expected %s but received %s'
    ),
    ALREADY_ABORTED: Errors(
      'FST_PLUGIN_RACE_ALREADY_ABORTED',
      "Request with ID '%s' already aborted"
    ),
    SOCKET_CLOSED: Errors(
      'FST_PLUGIN_RACE_SOCKET_CLOSED',
      "Socket for request with ID '%s' already closed"
    )
  }
}
