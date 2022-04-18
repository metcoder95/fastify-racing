const Errors = require('fastify-error')

module.exports = {
  Errors: {
    BAD_PARAMS: Errors(
      'FST_RACE_BAD_PARAM',
      'Invalid param, expected %s but received %s'
    )
  }
}
