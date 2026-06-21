function serializeCard(card, options = {}) {
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

  if (options.includeAccessCode) {
    serialized.access_code = card.access_code || null;
  }

  return serialized;
}

module.exports = serializeCard;
