const swaggerDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Creator Card API',
    version: '1.0.0',
    description: 'A link-in-bio card microservice with rate card functionality',
  },
  paths: {
    '/creator-cards': {
      post: {
        summary: 'Create a new creator card',
        tags: ['Creator Cards'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCreatorCard' },
              example: {
                title: 'George Cooks',
                description: 'George Cooks is a weekly cooking podcast',
                slug: 'george-cooks',
                creator_reference: 'crt_8f2k1m9x4p7w3q5z',
                links: [{ title: 'Website', url: 'https://example.com' }],
                service_rates: {
                  currency: 'NGN',
                  rates: [{ name: 'Basic Plan', description: 'Basic service', amount: 5000 }],
                },
                status: 'published',
                access_type: 'public',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Creator Card Created Successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Creator Card Created Successfully.' },
                    data: { $ref: '#/components/schemas/CreatorCard' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error or business rule violation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  SL02: {
                    summary: 'Slug taken',
                    value: { status: 'error', message: 'Slug is already taken', code: 'SL02' },
                  },
                  AC01: {
                    summary: 'Missing access_code',
                    value: {
                      status: 'error',
                      message: 'access_code is required when access_type is private',
                      code: 'AC01',
                    },
                  },
                  AC05: {
                    summary: 'Unwanted access_code',
                    value: {
                      status: 'error',
                      message: 'access_code must not be provided when access_type is public',
                      code: 'AC05',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/creator-cards/{slug}': {
      get: {
        summary: 'Retrieve a published creator card by slug',
        tags: ['Creator Cards'],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Card slug',
          },
          {
            name: 'access_code',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Required for private cards (6 alphanumeric chars)',
          },
        ],
        responses: {
          200: {
            description: 'Creator Card Retrieved Successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Creator Card Retrieved Successfully.' },
                    data: { $ref: '#/components/schemas/CreatorCardPublic' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  AC03: {
                    summary: 'Missing access code',
                    value: {
                      status: 'error',
                      message: 'Card is private, access code required',
                      code: 'AC03',
                    },
                  },
                  AC04: {
                    summary: 'Wrong access code',
                    value: { status: 'error', message: 'Invalid access code', code: 'AC04' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Card not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  NF01: {
                    summary: 'Not found',
                    value: { status: 'error', message: 'Creator card not found', code: 'NF01' },
                  },
                  NF02: {
                    summary: 'Draft card',
                    value: { status: 'error', message: 'Creator card not found', code: 'NF02' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Soft-delete a creator card by slug',
        tags: ['Creator Cards'],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Card slug',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['creator_reference'],
                properties: {
                  creator_reference: {
                    type: 'string',
                    minLength: 20,
                    maxLength: 20,
                    description: 'Exactly 20 characters',
                  },
                },
              },
              example: { creator_reference: 'crt_8f2k1m9x4p7w3q5z' },
            },
          },
        },
        responses: {
          200: {
            description: 'Creator Card Deleted Successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Creator Card Deleted Successfully.' },
                    data: { $ref: '#/components/schemas/CreatorCard' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Card not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CreateCreatorCard: {
        type: 'object',
        required: ['title', 'creator_reference', 'status'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          slug: {
            type: 'string',
            minLength: 5,
            maxLength: 50,
            description: 'Auto-generated from title if omitted',
          },
          creator_reference: { type: 'string', minLength: 20, maxLength: 20 },
          links: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 100 },
                url: {
                  type: 'string',
                  maxLength: 200,
                  description: 'Must start with http:// or https://',
                },
              },
            },
          },
          service_rates: {
            type: 'object',
            properties: {
              currency: { type: 'string', enum: ['NGN', 'USD', 'GBP', 'GHS'] },
              rates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', minLength: 3, maxLength: 100 },
                    description: { type: 'string', maxLength: 250 },
                    amount: {
                      type: 'integer',
                      minimum: 1,
                      description: 'Positive integer in minor units',
                    },
                  },
                },
              },
            },
          },
          status: { type: 'string', enum: ['draft', 'published'] },
          access_type: { type: 'string', enum: ['public', 'private'], default: 'public' },
          access_code: {
            type: 'string',
            minLength: 6,
            maxLength: 6,
            description: 'Required if access_type is private',
          },
        },
      },
      CreatorCard: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ULID' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          slug: { type: 'string' },
          creator_reference: { type: 'string' },
          links: { type: 'array', items: { type: 'object' } },
          service_rates: { type: 'object' },
          status: { type: 'string', enum: ['draft', 'published'] },
          access_type: { type: 'string', enum: ['public', 'private'] },
          access_code: { type: 'string', nullable: true },
          created: { type: 'number', description: 'Unix epoch milliseconds' },
          updated: { type: 'number', description: 'Unix epoch milliseconds' },
          deleted: { type: 'number', nullable: true },
        },
      },
      CreatorCardPublic: {
        type: 'object',
        description: 'Same as CreatorCard but without access_code field',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          slug: { type: 'string' },
          creator_reference: { type: 'string' },
          links: { type: 'array', items: { type: 'object' } },
          service_rates: { type: 'object' },
          status: { type: 'string' },
          access_type: { type: 'string' },
          created: { type: 'number' },
          updated: { type: 'number' },
          deleted: { type: 'number', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string' },
          code: {
            type: 'string',
            description: 'Custom error code (SL02, AC01, AC03, AC04, AC05, NF01, NF02)',
          },
        },
      },
    },
  },
};

module.exports = swaggerDoc;
