/** The six UN working languages, listed first in Step 2. */
export const LANGUAGES = ['Arabic', 'Chinese', 'English', 'French', 'Russian', 'Spanish'];

/**
 * Select value for "Other (please specify)". It never reaches the API: the
 * applicant types the language in `languageOther`, and sanitizeForApi sends that
 * name as the language. A saved name outside LANGUAGES loads back as Other.
 */
export const LANGUAGE_OTHER = 'Other';
