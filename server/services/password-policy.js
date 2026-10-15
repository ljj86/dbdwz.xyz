const MAX_LOGIN_PASSWORD_BYTES = 4096;

function validLoginPassword(value) {
  // Existing bcrypt passwords may exceed its historical 72-byte truncation point.
  return typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= MAX_LOGIN_PASSWORD_BYTES;
}

function validNewPassword(value, minimumCharacters = 8) {
  return typeof value === 'string' && value.length >= minimumCharacters && Buffer.byteLength(value, 'utf8') <= 72;
}

module.exports = { validLoginPassword, validNewPassword };
