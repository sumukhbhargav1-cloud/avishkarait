import { z } from 'zod';
import { eventDomains } from './domain-content';
import { githubUsernameSchema } from './github-username';

const email = z.string().trim().email().max(254);
// Shared with the participant API so both endpoints accept the same formats.
const github = githubUsernameSchema;
const memberSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email,
  githubUsername: github,
});

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL AVISHKAR 2K26 CHALLENGE TEAM-SIZE CONSTRAINTS
// These enforce the same rules as the server-side Supabase function so that
// the frontend gives immediate, accurate feedback before the round-trip.
//
// Challenge-specific sizes take precedence over domain-level sizes.
// ─────────────────────────────────────────────────────────────────────────────
function getChallengeSizeConstraints(challengeId: string): { min: number | null; max: number | null } {
  for (const domain of eventDomains) {
    const challenge = domain.challenges.find(c => c.id === challengeId);
    if (!challenge) continue;
    const min = challenge.minTeamSize ?? domain.minTeamSize ?? null;
    const max = challenge.maxTeamSize ?? domain.maxTeamSize ?? null;
    return { min, max };
  }
  return { min: null, max: null };
}

export const registrationInputSchema = z.object({
  leaderName: z.string().trim().min(2).max(120),
  leaderEmail: email,
  leaderPhone: z.string().trim().min(7).max(20).regex(/^[+0-9() .-]+$/),
  leaderGithubUsername: github,
  teams: z.array(z.object({
    teamName: z.string().trim().min(2).max(100),
    institution: z.string().trim().min(2).max(180),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    domainId: z.string().uuid(),
    challengeId: z.string().min(2).max(100),
    members: z.array(memberSchema),
    repositoryUrl: z.string().trim().url().max(500).or(z.literal('')),
    rulesAccepted: z.literal(true),
  })).min(1).max(5),
}).superRefine((values, ctx) => {
  // 1. Each domain may appear at most once per registration.
  const domainIds = values.teams.map(team => team.domainId);
  if (new Set(domainIds).size !== domainIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use a separate domain only once in this registration.', path: ['teams'] });
  }

  values.teams.forEach((team, index) => {
    // 2. All member emails (including leader) must be unique within the team.
    const emails = [values.leaderEmail, ...team.members.map(m => m.email)].map(v => v.toLowerCase());
    if (new Set(emails).size !== emails.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each team must use unique member email addresses.', path: ['teams', index, 'members'] });
    }

    // 3. GitHub repository URL must be a valid GitHub URL if provided.
    if (team.repositoryUrl && !/^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i.test(team.repositoryUrl)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid GitHub repository URL.', path: ['teams', index, 'repositoryUrl'] });
    }

    // 4. Enforce challenge-specific team size rules (mirrors the server-side Supabase function).
    //    Team size = members array length + 1 (the leader counts as a member).
    const teamSize = team.members.length + 1;
    const { min, max } = getChallengeSizeConstraints(team.challengeId);

    if (min !== null && teamSize < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `This challenge requires at least ${min} team member${min !== 1 ? 's' : ''} (including the leader). Current: ${teamSize}.`,
        path: ['teams', index, 'members'],
      });
    }
    if (max !== null && teamSize > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `This challenge allows no more than ${max} team member${max !== 1 ? 's' : ''} (including the leader). Current: ${teamSize}.`,
        path: ['teams', index, 'members'],
      });
    }
  });
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;
