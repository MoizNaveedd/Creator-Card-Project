const validator = require('@app-core/validator');
const PaymentMessages = require('@app/messages/payment');

const spec = `root {
  accounts[] {
    id string
    balance number
    currency string
  }
  instruction string
}`;

const parsedSpec = validator.parse(spec);

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'GHS'];

function splitTokens(str) {
  const tokens = [];
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isValidAccountIdChar(ch) {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '-' ||
    ch === '.' ||
    ch === '@'
  );
}

function isValidAccountId(id) {
  if (!id || id.length === 0) return false;
  for (let i = 0; i < id.length; i++) {
    if (!isValidAccountIdChar(id[i])) return false;
  }
  return true;
}

function parseAmount(amountStr) {
  if (!amountStr || amountStr.length === 0) return null;
  for (let i = 0; i < amountStr.length; i++) {
    if (!isDigit(amountStr[i])) return null;
  }
  const num = parseInt(amountStr, 10);
  if (num <= 0) return null;
  return num;
}

function isSupportedCurrency(currency) {
  const upper = currency.toUpperCase();
  for (let i = 0; i < SUPPORTED_CURRENCIES.length; i++) {
    if (SUPPORTED_CURRENCIES[i] === upper) return true;
  }
  return false;
}

function isValidDateFormat(dateStr) {
  if (dateStr.length !== 10) return false;
  if (dateStr[4] !== '-' || dateStr[7] !== '-') return false;
  for (let i = 0; i < 10; i++) {
    if (i !== 4 && i !== 7 && !isDigit(dateStr[i])) return false;
  }
  return true;
}

function isDateInFuture(dateStr) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const targetDate = new Date(Date.UTC(year, month, day));
  return targetDate.getTime() > todayUTC.getTime();
}

function findAccountById(accounts, id) {
  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].id === id) return accounts[i];
  }
  return null;
}

function buildAccountsResponse(requestAccounts, debitId, creditId, amount, shouldExecute) {
  const result = [];
  for (let i = 0; i < requestAccounts.length; i++) {
    const acc = requestAccounts[i];
    if (acc.id === debitId || acc.id === creditId) {
      let newBalance = acc.balance;
      if (shouldExecute) {
        if (acc.id === debitId) {
          newBalance = acc.balance - amount;
        } else {
          newBalance = acc.balance + amount;
        }
      }
      result.push({
        id: acc.id,
        balance: newBalance,
        balance_before: acc.balance,
        currency: acc.currency.toUpperCase(),
      });
    }
  }
  return result;
}

function buildResponse(fields) {
  return {
    type: fields.type || null,
    amount: fields.amount || null,
    currency: fields.currency || null,
    debit_account: fields.debit_account || null,
    credit_account: fields.credit_account || null,
    execute_by: fields.execute_by || null,
    status: fields.status,
    status_reason: fields.status_reason,
    status_code: fields.status_code,
    accounts: fields.accounts || [],
  };
}

function validateKeywords(tokens, expectedKeywords) {
  const mismatches = [];

  for (let i = 0; i < expectedKeywords.length; i++) {
    const exp = expectedKeywords[i];
    if (tokens[exp.index].toUpperCase() !== exp.keyword) {
      mismatches.push(exp);
    }
  }

  if (mismatches.length === 0) return null;

  for (let m = 0; m < mismatches.length; m++) {
    let foundElsewhere = false;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].toUpperCase() === mismatches[m].keyword) {
        foundElsewhere = true;
        break;
      }
    }
    if (!foundElsewhere) {
      return { code: 'SY01', reason: PaymentMessages.MISSING_KEYWORD };
    }
  }

  return { code: 'SY02', reason: PaymentMessages.INVALID_KEYWORD_ORDER };
}

// eslint-disable-next-line no-unused-vars
async function parseInstruction(serviceData, options = {}) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  const instruction = data.instruction.trim();
  const { accounts } = data;

  const tokens = splitTokens(instruction);

  if (tokens.length === 0) {
    response = buildResponse({
      status: 'failed',
      status_reason: PaymentMessages.MALFORMED_INSTRUCTION,
      status_code: 'SY03',
    });
    return response;
  }

  const typeToken = tokens[0].toUpperCase();

  if (typeToken !== 'DEBIT' && typeToken !== 'CREDIT') {
    response = buildResponse({
      status: 'failed',
      status_reason: PaymentMessages.MALFORMED_INSTRUCTION,
      status_code: 'SY03',
    });
    return response;
  }

  if (tokens.length !== 11 && tokens.length !== 13) {
    response = buildResponse({
      type: typeToken,
      status: 'failed',
      status_reason:
        tokens.length < 11
          ? PaymentMessages.MISSING_KEYWORD
          : PaymentMessages.MALFORMED_INSTRUCTION,
      status_code: tokens.length < 11 ? 'SY01' : 'SY03',
    });
    return response;
  }

  let expectedKeywords;
  let debitAccountId;
  let creditAccountId;

  if (typeToken === 'DEBIT') {
    expectedKeywords = [
      { index: 3, keyword: 'FROM' },
      { index: 4, keyword: 'ACCOUNT' },
      { index: 6, keyword: 'FOR' },
      { index: 7, keyword: 'CREDIT' },
      { index: 8, keyword: 'TO' },
      { index: 9, keyword: 'ACCOUNT' },
    ];
  } else {
    expectedKeywords = [
      { index: 3, keyword: 'TO' },
      { index: 4, keyword: 'ACCOUNT' },
      { index: 6, keyword: 'FOR' },
      { index: 7, keyword: 'DEBIT' },
      { index: 8, keyword: 'FROM' },
      { index: 9, keyword: 'ACCOUNT' },
    ];
  }

  if (tokens.length === 13) {
    expectedKeywords.push({ index: 11, keyword: 'ON' });
  }

  const keywordError = validateKeywords(tokens, expectedKeywords);

  if (keywordError) {
    response = buildResponse({
      type: typeToken,
      status: 'failed',
      status_reason: keywordError.reason,
      status_code: keywordError.code,
    });
    return response;
  }

  if (typeToken === 'DEBIT') {
    [, , , , , debitAccountId, , , , , creditAccountId] = tokens;
  } else {
    [, , , , , creditAccountId, , , , , debitAccountId] = tokens;
  }

  const amountStr = tokens[1];
  const currencyStr = tokens[2];
  let executeBy = null;

  if (tokens.length === 13) {
    [, , , , , , , , , , , , executeBy] = tokens;
  }

  const parsedAmount = parseAmount(amountStr);
  if (parsedAmount === null) {
    response = buildResponse({
      type: typeToken,
      currency: currencyStr.toUpperCase(),
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.INVALID_AMOUNT,
      status_code: 'AM01',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
    return response;
  }

  if (!isValidAccountId(debitAccountId)) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: currencyStr.toUpperCase(),
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.INVALID_ACCOUNT_ID,
      status_code: 'AC04',
      accounts: [],
    });
    return response;
  }

  if (!isValidAccountId(creditAccountId)) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: currencyStr.toUpperCase(),
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.INVALID_ACCOUNT_ID,
      status_code: 'AC04',
      accounts: [],
    });
    return response;
  }

  if (executeBy !== null && !isValidDateFormat(executeBy)) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: currencyStr.toUpperCase(),
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.INVALID_DATE_FORMAT,
      status_code: 'DT01',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
    return response;
  }

  const upperCurrency = currencyStr.toUpperCase();

  if (!isSupportedCurrency(upperCurrency)) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: upperCurrency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.UNSUPPORTED_CURRENCY,
      status_code: 'CU02',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
    return response;
  }

  if (debitAccountId === creditAccountId) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: upperCurrency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.SAME_ACCOUNT,
      status_code: 'AC02',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
    return response;
  }

  const debitAccount = findAccountById(accounts, debitAccountId);
  const creditAccount = findAccountById(accounts, creditAccountId);

  if (!debitAccount || !creditAccount) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: upperCurrency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.ACCOUNT_NOT_FOUND,
      status_code: 'AC03',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
    return response;
  }

  if (debitAccount.currency.toUpperCase() !== creditAccount.currency.toUpperCase()) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: upperCurrency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.CURRENCY_MISMATCH,
      status_code: 'CU01',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
    return response;
  }

  if (debitAccount.currency.toUpperCase() !== upperCurrency) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: upperCurrency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.CURRENCY_MISMATCH,
      status_code: 'CU01',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
    return response;
  }

  if (debitAccount.balance < parsedAmount) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: upperCurrency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'failed',
      status_reason: PaymentMessages.INSUFFICIENT_FUNDS,
      status_code: 'AC01',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
    return response;
  }

  const isPending = executeBy !== null && isDateInFuture(executeBy);

  if (isPending) {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: upperCurrency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'pending',
      status_reason: PaymentMessages.TRANSACTION_PENDING,
      status_code: 'AP02',
      accounts: buildAccountsResponse(accounts, debitAccountId, creditAccountId, 0, false),
    });
  } else {
    response = buildResponse({
      type: typeToken,
      amount: parsedAmount,
      currency: upperCurrency,
      debit_account: debitAccountId,
      credit_account: creditAccountId,
      execute_by: executeBy,
      status: 'successful',
      status_reason: PaymentMessages.TRANSACTION_SUCCESSFUL,
      status_code: 'AP00',
      accounts: buildAccountsResponse(
        accounts,
        debitAccountId,
        creditAccountId,
        parsedAmount,
        true
      ),
    });
  }

  return response;
}

module.exports = parseInstruction;
