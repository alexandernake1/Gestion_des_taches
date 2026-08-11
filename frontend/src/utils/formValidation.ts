type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function isFormControl(target: EventTarget | null): target is FormControl {
  return target instanceof HTMLInputElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLTextAreaElement
}

export function frenchValidationMessage(control: FormControl): string {
  const { validity } = control
  if (validity.valueMissing) return 'Ce champ est obligatoire.'
  if (validity.typeMismatch && control instanceof HTMLInputElement && control.type === 'email') {
    return 'Saisissez une adresse e-mail valide.'
  }
  if (validity.typeMismatch) return 'La valeur saisie est invalide.'
  if (validity.tooShort && control instanceof HTMLInputElement) {
    return `Saisissez au moins ${control.minLength} caractères.`
  }
  if (validity.tooLong && control instanceof HTMLInputElement) {
    return `Saisissez au maximum ${control.maxLength} caractères.`
  }
  if (validity.rangeUnderflow && control instanceof HTMLInputElement) {
    return `La valeur doit être supérieure ou égale à ${control.min}.`
  }
  if (validity.rangeOverflow && control instanceof HTMLInputElement) {
    return `La valeur doit être inférieure ou égale à ${control.max}.`
  }
  if (validity.stepMismatch) return 'La valeur ne respecte pas le pas attendu.'
  if (validity.patternMismatch) return 'Le format saisi est invalide.'
  if (validity.badInput) return 'La valeur saisie est invalide.'
  return ''
}

let installed = false

export function installFrenchFormValidation(): void {
  if (installed || typeof document === 'undefined') return
  installed = true
  document.documentElement.lang = 'fr'

  document.addEventListener('invalid', (event) => {
    if (!isFormControl(event.target)) return
    event.target.setCustomValidity('')
    event.target.setCustomValidity(frenchValidationMessage(event.target))
  }, true)

  document.addEventListener('input', (event) => {
    if (isFormControl(event.target)) event.target.setCustomValidity('')
  }, true)
}
