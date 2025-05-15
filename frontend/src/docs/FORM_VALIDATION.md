# Form Validation Framework

This document outlines the form validation framework implemented in the Dexter frontend application.

## Overview

The form validation framework provides a consistent, reusable approach to validating form inputs across the application. It includes:

- A comprehensive set of predefined validation rules
- Support for custom validation rules
- Real-time validation feedback
- Field-level and form-level validation
- Accessible error messaging

## Implementation

The core validation functionality is implemented in `/src/utils/formValidation.ts`, which provides:

1. **Field-level validation**: Validate individual form fields using specified rules
2. **Form-level validation**: Validate an entire form with multiple fields and rules
3. **Predefined rules**: A collection of common validation rules ready to use
4. **Custom rule creation**: Support for creating specialized validation rules

## Usage Examples

### Basic Form Validation

```typescript
import { validateForm, required, email } from '../utils/formValidation';

// Define validation rules
const validationRules = {
  username: [required('Username is required')],
  email: [required('Email is required'), email('Must be a valid email address')]
};

// Form values
const formValues = {
  username: 'john_doe',
  email: 'invalid-email'
};

// Validate the form
const result = validateForm(formValues, validationRules);
console.log(result.isValid); // false
console.log(result.errors); // { username: null, email: 'Must be a valid email address' }
```

### Using Touch State for Better UX

For a better user experience, validation errors should typically only be shown after a field has been "touched" (visited by the user). This pattern is implemented in the enhanced form components:

```typescript
// Form state
const [values, setValues] = useState({ email: '' });
const [errors, setErrors] = useState({ email: null });
const [touched, setTouched] = useState({ email: false });

// Handle blur event
const handleBlur = (field) => {
  setTouched(prev => ({ ...prev, [field]: true }));
  validateField(field, values[field]);
};

// In the render function
<TextInput
  value={values.email}
  onChange={(e) => {
    setValues(prev => ({ ...prev, email: e.target.value }));
    if (touched.email) {
      validateField('email', e.target.value);
    }
  }}
  onBlur={() => handleBlur('email')}
  error={touched.email ? errors.email : null}
/>
```

## Available Validation Rules

### Core Rules

- **required(message?)**: Field must have a value
- **minLength(min, message?)**: Field must be at least `min` characters long
- **maxLength(max, message?)**: Field must not exceed `max` characters
- **pattern(regex, message)**: Field must match the specified regex pattern

### Data Type Rules

- **email(message?)**: Field must be a valid email address
- **url(message?)**: Field must be a valid URL
- **number(message?)**: Field must be a valid number
- **integer(message?)**: Field must be a valid integer

### Range Rules

- **min(min, message?)**: Numeric field must be at least `min`
- **max(max, message?)**: Numeric field must not exceed `max`

### Format Rules

- **slug(message?)**: Field must be a valid slug (lowercase letters, numbers, and hyphens)
- **alphanumeric(message?)**: Field must contain only letters and numbers

### Other Rules

- **oneOf(options, message?)**: Field value must be one of the provided options
- **matches(getCompareValue, message?)**: Field must match another value (e.g., password confirmation)
- **custom(testFn, message)**: Custom validation function

## Enhanced Components

The following components have been enhanced with form validation:

1. **SettingsInput**: Uses form validation for organization and project slugs
2. **AIModelSettings**: Uses form validation for model configuration settings

## Accessibility Considerations

- Error states are properly associated with input fields using the `aria-invalid` and `aria-describedby` attributes (handled by Mantine components)
- Error messages are clearly displayed and associated with their respective inputs
- Summary of form errors is shown at the top of the form when multiple errors exist
- Visual indicators (red borders) make it clear which fields need attention
- Disabled submit buttons when form is invalid to prevent form submission attempts

## Future Improvements

- Add support for async validation rules
- Create a form hook for reducing validation boilerplate
- Implement form field arrays validation
- Add support for conditional validation rules