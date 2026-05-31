export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRule = {
  id: string;
  label: string;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "min_length",
    label: `לפחות ${PASSWORD_MIN_LENGTH} תווים`,
  },
  {
    id: "uppercase",
    label: "לפחות אות גדולה באנגלית",
  },
  {
    id: "lowercase",
    label: "לפחות אות קטנה באנגלית",
  },
  {
    id: "digit",
    label: "לפחות ספרה אחת",
  },
  {
    id: "special",
    label: "לפחות תו מיוחד (!@#$%^&* וכו')",
  },
];

const RULE_TESTS: Record<string, (value: string) => boolean> = {
  min_length: (value) => value.length >= PASSWORD_MIN_LENGTH,
  uppercase: (value) => /[A-Z]/.test(value),
  lowercase: (value) => /[a-z]/.test(value),
  digit: (value) => /\d/.test(value),
  special: (value) => /[^A-Za-z0-9]/.test(value),
};

export function validatePassword(password: string): string[] {
  return PASSWORD_RULES.filter(
    (rule) => !RULE_TESTS[rule.id]?.(password)
  ).map((rule) => rule.label);
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password).length === 0;
}

export function getPasswordRuleStates(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: RULE_TESTS[rule.id]?.(password) ?? false,
  }));
}
