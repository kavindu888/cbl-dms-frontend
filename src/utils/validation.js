export function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

export function toNumber(value) {
  if (isBlank(value)) return Number.NaN
  return Number(value)
}

export function required(value, message) {
  return isBlank(value) ? message : ''
}

export function requiredWhen(condition, value, message) {
  return condition ? required(value, message) : ''
}

export function positiveNumber(value, message) {
  const numberValue = toNumber(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? '' : message
}

export function nonNegativeNumber(value, message) {
  const numberValue = toNumber(value)
  return Number.isFinite(numberValue) && numberValue >= 0 ? '' : message
}

export function positiveInteger(value, message) {
  const numberValue = toNumber(value)
  return Number.isInteger(numberValue) && numberValue > 0 ? '' : message
}

export function integerInRange(value, min, max, message) {
  const numberValue = toNumber(value)
  return Number.isInteger(numberValue) && numberValue >= min && numberValue <= max ? '' : message
}

export function mustBeDifferent(leftValue, rightValue, message) {
  if (isBlank(leftValue) || isBlank(rightValue)) return ''
  return leftValue === rightValue ? message : ''
}

export function firstValidationMessage(rules) {
  for (const rule of rules) {
    const message = typeof rule === 'function' ? rule() : rule
    if (message) return message
  }
  return ''
}

export function validateFields(fieldRules) {
  return Object.entries(fieldRules).reduce((errors, [fieldName, rules]) => {
    const message = firstValidationMessage(Array.isArray(rules) ? rules : [rules])
    if (message) errors[fieldName] = message
    return errors
  }, {})
}

export function firstFieldError(errors) {
  return Object.values(errors).find(Boolean) || ''
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0
}

