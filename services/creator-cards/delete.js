const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepo = require('@app/repository/creator-card');

const deleteSpec = `root {
  creator_reference string<length:20>
}`;

const parsedDeleteSpec = validator.parse(deleteSpec);

function serializeCard(card) {
  const serialized = {
    id: card._id,
    title: card.title,
    description: card.description || null,
    slug: card.slug,
    creator_reference: card.creator_reference,
    links: card.links || [],
    service_rates: card.service_rates || {},
    status: card.status,
    access_type: card.access_type,
    access_code: card.access_code || null,
    created: card.created,
    updated: card.updated,
    deleted: card.deleted,
  };
  return serialized;
}

async function deleteCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedDeleteSpec);

  const { slug } = serviceData;

  const card = await CreatorCardRepo.findOne({
    query: { slug, deleted: null },
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

  return serializeCard(card);
}

module.exports = deleteCreatorCard;
