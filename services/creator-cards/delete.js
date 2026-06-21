const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepo = require('@app/repository/creator-card');
const serializeCard = require('./serialize');

const deleteSpec = `root {
  slug string<trim|minLength:1>
  creator_reference string<length:20>
}`;

const parsedDeleteSpec = validator.parse(deleteSpec);

// eslint-disable-next-line no-unused-vars
async function deleteCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedDeleteSpec);

  const card = await CreatorCardRepo.findOne({
    query: { slug: data.slug, deleted: null },
  });

  if (!card) {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.NF01);
  }

  const now = Date.now();

  await CreatorCardRepo.updateOne({
    query: { _id: card._id },
    updateValues: { deleted: now, updated: now },
  });

  card.deleted = now;
  card.updated = now;

  const response = serializeCard(card, { includeAccessCode: true });

  return response;
}

module.exports = deleteCreatorCard;
