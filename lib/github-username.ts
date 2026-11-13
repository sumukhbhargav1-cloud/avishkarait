import { z } from 'zod';

// GitHub usernames: 1-39 characters, letters/numbers and single hyphens only,
// and they may not begin or end with a hyphen.
export const GITHUB_USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/**
 * Normalize user input into a bare GitHub username.
 * Accepts `octocat`, `@octocat`, `github.com/octocat` and
 * `https://github.com/octocat` (extra path/query is ignored).
 */
export function normalizeGithubUsername(raw?: string | null): string {
  let value = (raw ?? '').trim();
  if (!value) return '';

  value = value.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '');
  value = value.replace(/^(?:www\.)?github\.com\//i, '');
  value = value.replace(/^@+/, '');
  value = value.split(/[/?#]/)[0];

  return value.trim();
}

/** Empty is valid because the GitHub username is optional. */
export function isValidGithubUsername(value: string): boolean {
  return value === '' || GITHUB_USERNAME_PATTERN.test(value);
}

/** Zod schema shared by every endpoint so client and server agree. */
export const githubUsernameSchema = z
  .string()
  .optional()
  .transform((value) => normalizeGithubUsername(value))
  .refine((value) => isValidGithubUsername(value), {
    message:
      'Use a valid GitHub username: letters, numbers or single hyphens (for example octocat). Profile links and @handles are accepted.',
  });
