const { createHandler } = require('@app-core/server');

module.exports = createHandler({
  path: '/',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card API is running',
      data: {
        service: 'Creator Card API',
        version: '1.0.0',
        endpoints: {
          'POST /creator-cards': 'Create a new creator card',
          'GET /creator-cards/:slug': 'Retrieve a creator card by slug',
          'DELETE /creator-cards/:slug': 'Delete a creator card by slug',
        },
        docs: '/api-docs',
      },
    };
  },
});
