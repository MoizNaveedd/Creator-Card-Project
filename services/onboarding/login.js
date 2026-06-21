const validator = require('@app-core/validator');

const loginSpec = `root {
  username any
}`;

const parsedLoginSpec = validator.parse(loginSpec);

// eslint-disable-next-line no-unused-vars
async function login(serviceData, options = {}) {
  const validatedData = validator.validate(serviceData, parsedLoginSpec);

  return validatedData;
}

module.exports = login;
