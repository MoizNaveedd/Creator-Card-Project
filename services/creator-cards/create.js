const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepo = require('@app/repository/creator-card');

const createSpec = `root {
  title string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string<uppercase>(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedCreateSpec = validator.parse(createSpec);

function generateRandomAlphanumeric(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function isValidSlugChar(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '-' || ch === '_';
}

function generateSlugFromTitle(title) {
  const lowered = title.toLowerCase();
  let slug = '';
  for (let i = 0; i < lowered.length; i++) {
    const ch = lowered[i];
    if (ch === ' ') {
      slug += '-';
    } else if (isValidSlugChar(ch)) {
      slug += ch;
    }
  }
  return slug;
}

function validateSlugFormat(slug) {
  for (let i = 0; i < slug.length; i++) {
    if (!isValidSlugChar(slug[i])) {
      return false;
    }
  }
  return true;
}

function validateAccessCodeChars(code) {
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const isAlphanumeric =
      (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9');
    if (!isAlphanumeric) return false;
  }
  return true;
}

function validateUrl(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

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
    deleted: card.deleted || null,
  };
  return serialized;
}

async function createCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedCreateSpec);

  const accessType = data.access_type || 'public';

  if (accessType === 'private' && !data.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, ERROR_CODE.AC01);
  }

  if (accessType === 'public' && data.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, ERROR_CODE.AC05);
  }

  if (data.access_code && !validateAccessCodeChars(data.access_code)) {
    throwAppError('access_code must be alphanumeric', ERROR_CODE.AC05);
  }

  if (data.links && data.links.length) {
    for (let i = 0; i < data.links.length; i++) {
      if (!validateUrl(data.links[i].url)) {
        throwAppError('Link url must start with http:// or https://', 'SPCL_VALIDATION');
      }
    }
  }

  let slug;

  if (data.slug) {
    if (!validateSlugFormat(data.slug)) {
      throwAppError(
        'Slug must contain only alphanumeric characters, hyphens, and underscores',
        'SPCL_VALIDATION'
      );
    }

    slug = data.slug.toLowerCase();

    const existingCard = await CreatorCardRepo.findOne({
      query: { slug, deleted: null },
    });

    if (existingCard) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
    }
  } else {
    slug = generateSlugFromTitle(data.title);

    if (slug.length < 5) {
      slug = `${slug}-${generateRandomAlphanumeric(6)}`;
    } else {
      const existingCard = await CreatorCardRepo.findOne({
        query: { slug, deleted: null },
      });

      if (existingCard) {
        slug = `${slug}-${generateRandomAlphanumeric(6)}`;
      }
    }
  }

  const cardData = {
    title: data.title,
    description: data.description || null,
    slug,
    creator_reference: data.creator_reference,
    links: data.links || [],
    service_rates: data.service_rates || {},
    status: data.status,
    access_type: accessType,
    access_code: accessType === 'private' ? data.access_code : null,
    deleted: null,
  };

  const createdCard = await CreatorCardRepo.create(cardData);

  return serializeCard(createdCard);
}

module.exports = createCreatorCard;
