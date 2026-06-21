const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepo = require('@app/repository/creator-card');

function serializeCardForRetrieval(card) {
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
    created: card.created,
    updated: card.updated,
    deleted: card.deleted || null,
  };
  return serialized;
}

async function retrieveCreatorCard(serviceData) {
  const { slug, access_code: accessCode } = serviceData;

  const card = await CreatorCardRepo.findOne({
    query: { slug, deleted: null },
  });

  if (!card) {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.NF01);
  }

  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.NF02);
  }

  if (card.access_type === 'private') {
    if (!accessCode) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_MISSING, ERROR_CODE.AC03);
    }

    if (accessCode !== card.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_INVALID, ERROR_CODE.AC04);
    }
  }

  return serializeCardForRetrieval(card);
}

module.exports = retrieveCreatorCard;
