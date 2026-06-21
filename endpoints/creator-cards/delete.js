const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const deleteCreatorCardService = require('@app/services/creator-cards/delete');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = {
      ...rc.body,
      slug: rc.params.slug,
    };

    const response = await deleteCreatorCardService(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.DELETED,
      data: response,
    };
  },
});
