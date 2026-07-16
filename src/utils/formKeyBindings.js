const focusableSelector = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled]):not([data-skip-focus="true"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(',')

function isVisible(element) {
  if (!(element instanceof HTMLElement)) return false
  return Boolean(element.offsetParent || element.getClientRects().length)
}

function isEditableTextTarget(element) {
  if (!(element instanceof HTMLElement)) return false
  return element.tagName === 'TEXTAREA' || element.isContentEditable
}

function isButtonTarget(element) {
  if (!(element instanceof HTMLElement)) return false
  return element.tagName === 'BUTTON' || element.getAttribute('role') === 'button'
}

function getFormFields(form) {
  return Array.from(form.querySelectorAll(focusableSelector)).filter((element) => {
    if (!isVisible(element)) return false
    if (element.hasAttribute('data-form-key-skip')) return false
    if (element.getAttribute('aria-hidden') === 'true') return false
    return true
  })
}

function submitForm(form) {
  if (typeof form.requestSubmit === 'function') {
    form.requestSubmit()
    return
  }

  const submitButton = form.querySelector('button[type="submit"], input[type="submit"]')
  if (submitButton instanceof HTMLElement) {
    submitButton.click()
  }
}

export function handleFormKeyboardEvent(event) {
  if (event.defaultPrevented || event.isComposing) return
  if (!(event.target instanceof HTMLElement)) return

  const form = event.target.closest('form')
  if (!form || form.hasAttribute('data-form-keys-disabled')) return

  if (event.key === 'Escape') {
    event.target.blur()
    return
  }

  if (event.key !== 'Enter') return

  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    submitForm(form)
    return
  }

  if (event.shiftKey || isEditableTextTarget(event.target) || isButtonTarget(event.target)) return

  const fields = getFormFields(form)
  const currentIndex = fields.indexOf(event.target)
  if (currentIndex === -1) return

  event.preventDefault()

  const nextField = fields[currentIndex + 1]
  if (nextField instanceof HTMLElement) {
    nextField.focus()
    if (typeof nextField.select === 'function' && nextField.tagName === 'INPUT') {
      nextField.select()
    }
    return
  }

  submitForm(form)
}
