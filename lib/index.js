const Errors = require('fastify-error')

module.exports = {
  Errors: {
    BAD_PARAMS: Errors(
      'FST_PLUGIN_RACE_BAD_PARAM',
      'Invalid param, expected %s but received %s'
    )
  }
}
