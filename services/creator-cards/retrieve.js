const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepo = require('@app/repository/creator-card');
const serializeCard = require('./serialize');

const retrieveSpec = `root {
  slug string<trim|minLength:1>
  access_code? string
}`;

const parsedRetrieveSpec = validator.parse(retrieveSpec);

// eslint-disable-next-line no-unused-vars
async function retrieveCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedRetrieveSpec);

  const card = await CreatorCardRepo.findOne({
    query: { slug: data.slug, deleted: null },
  });

  if (!card) {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.NOTFOUND);
  }

  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.NOTFOUND);
  }

  if (card.access_type === 'private') {
    if (!data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_MISSING, ERROR_CODE.INVLDREQ);
    }

    if (data.access_code !== card.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_INVALID, ERROR_CODE.INVLDREQ);
    }
  }

  const response = serializeCard(card);

  return response;
}

module.exports = retrieveCreatorCard;
