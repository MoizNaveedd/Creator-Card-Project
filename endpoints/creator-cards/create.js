const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const createCreatorCardService = require('@app/services/creator-cards/create');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = rc.body;

    const response = await createCreatorCardService(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.CREATED,
      data: response,
    };
  },
});
