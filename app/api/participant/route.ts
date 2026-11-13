import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { githubUsernameSchema } from '@/lib/github-username';
import { normalizePaymentSettings } from '@/lib/payment';

const rateLimitStore = new Map<string, number[]>();
function checkRateLimit(key: string, maxRequests = 5, windowMs = 10000): boolean {
  const now = Date.now();
  const recent = (rateLimitStore.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) return false;
  recent.push(now);
  rateLimitStore.set(key, recent);
  return true;
}

function generatePassphrase(length: number = 12): string {
  const buffer = crypto.getRandomValues(new Uint32Array(length));
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let passphrase = '';
  for (let i = 0; i < length; i++) passphrase += characters.charAt(buffer[i] % characters.length);
  return passphrase;
}

const participantSchema = z.object({
  leaderName: z.string().trim().min(2).max(120),
  leaderEmail: z.string().trim().email().max(254).toLowerCase(),
  leaderPhone: z.string().trim().min(7).max(20).regex(/^[+0-9() .-]+$/),
  // Accepts 'octocat', '@octocat' and GitHub profile links; empty is allowed.
  leaderGithubUsername: githubUsernameSchema,
  teams: z
    .array(
      z.object({
        teamName: z.string().trim().min(2).max(100),
        institution: z.string().trim().min(2).max(180),
        city: z.string().trim().min(2).max(100),
        state: z.string().trim().max(100),
        domainId: z.string().min(1),
        challengeId: z.string(),
        members: z
          .array(
            z.object({
              fullName: z.string().trim().min(2).max(120),
              email: z.string().trim().email().max(254).toLowerCase(),
              githubUsername: githubUsernameSchema,
            })
          )
          .min(1)
          .max(4),
        rulesAccepted: z.literal(true),
        repositoryUrl: z.string().trim().optional(),
      })
    )
    .min(1)
    .max(4),
});
type ParticipantInput = z.infer<typeof participantSchema>;

type DbDomain = {
  id: string;
  slug: string;
  name: string;
  registration_open: boolean;
  event_details: { challenges?: Array<{ id: string; name: string }> } | null;
};
type ResolvedTeam = ParticipantInput['teams'][number] & {
  domainId: string;
  challengeId: string;
  domainName: string;
};

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Service-role client: bypasses RLS for registration writes.
let serviceDb: SupabaseClient | null = null;
try {
  if (serviceRoleKey && supabaseUrl) {
    serviceDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
} catch {
  serviceDb = null;
}

// Resolve domain slug/uuid to the real domains.id and validate the challenge.
async function resolveTeams(
  input: ParticipantInput
): Promise<{ ok: true; teams: ResolvedTeam[] } | { ok: false; error: string }> {
  if (!serviceDb) return { ok: false, error: 'Registration database is not configured.' };

  const { data, error } = await serviceDb
    .from('domains')
    .select('id, slug, name, registration_open, event_details')
    .eq('is_active', true);
  if (error) return { ok: false, error: `Could not load event domains: ${error.message}` };

  const domains = (data ?? []) as DbDomain[];
  const bySlug = new Map(domains.map((d) => [d.slug, d]));
  const byId = new Map(domains.map((d) => [d.id, d]));
  const teams: ResolvedTeam[] = [];

  for (const team of input.teams) {
    const domain = bySlug.get(team.domainId) ?? byId.get(team.domainId);
    if (!domain) {
      return {
        ok: false,
        error: `Unknown domain "${team.domainId}". Choose one of the active event domains.`,
      };
    }
    if (!domain.registration_open) {
      return { ok: false, error: `Registration is not open for ${domain.name}.` };
    }
    const challenges = domain.event_details?.challenges ?? [];
    let challengeId = team.challengeId;
    if (!challengeId && challenges.length === 1) challengeId = challenges[0].id;
    if (challenges.length > 0 && !challenges.some((c) => c.id === challengeId)) {
      return { ok: false, error: `Choose a valid challenge for ${domain.name}.` };
    }
    teams.push({ ...team, domainId: domain.id, challengeId, domainName: domain.name });
  }
  return { ok: true, teams };
}
export async function POST(request: NextRequest) {
  const ip = request.ip ?? 'unknown';
  if (!checkRateLimit(`participant-register-${ip}`, 5, 10_000)) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try later.' },
      { status: 429, headers: { 'cache-control': 'no-store' } }
    );
  }

  if (!serviceRoleKey || !supabaseUrl) {
    const missing = [
      !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
      !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
    ].filter(Boolean);
    console.error('Participant registration missing configuration:', missing);
    return NextResponse.json(
      { error: `Participant registration is not configured (missing: ${missing.join(', ')}).` },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }

  const db = serviceDb;
  if (!db) {
    return NextResponse.json(
      { error: 'Supabase admin client could not be initialised.' },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'The registration data could not be read.' },
      { status: 400, headers: { 'cache-control': 'no-store' } }
    );
  }

  const captchaToken =
    typeof body === 'object' && body !== null && 'captchaToken' in body &&
    typeof (body as { captchaToken?: unknown }).captchaToken === 'string'
      ? (body as { captchaToken: string }).captchaToken
      : '';
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

  // Fail closed: never create participant accounts if server-side CAPTCHA
  // verification is unavailable or the submitted token is invalid.
  if (!turnstileSecret) {
    console.error('Participant registration blocked: TURNSTILE_SECRET_KEY is not configured.');
    return NextResponse.json(
      { error: 'Registration security verification is not configured. Please contact the organisers.' },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }
  if (!captchaToken) {
    return NextResponse.json(
      { error: 'Complete the CAPTCHA verification before submitting your registration.' },
      { status: 400, headers: { 'cache-control': 'no-store' } }
    );
  }

  try {
    const verificationBody = new URLSearchParams({
      secret: turnstileSecret,
      response: captchaToken,
    });
    if (ip !== 'unknown') verificationBody.set('remoteip', ip);

    const verificationResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: verificationBody,
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      }
    );
    const verification = (await verificationResponse.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (!verificationResponse.ok || verification.success !== true) {
      console.warn('Turnstile verification rejected a registration attempt:', verification['error-codes'] ?? []);
      return NextResponse.json(
        { error: 'CAPTCHA verification failed or expired. Please complete it again.' },
        { status: 400, headers: { 'cache-control': 'no-store' } }
      );
    }
  } catch (error) {
    console.error('Turnstile verification service unavailable:', error);
    return NextResponse.json(
      { error: 'CAPTCHA verification is temporarily unavailable. Please try again.' },
      { status: 502, headers: { 'cache-control': 'no-store' } }
    );
  }

  const parsed = participantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Check the required fields and try again.',
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: { 'cache-control': 'no-store' } }
    );
  }

  const input = parsed.data;
  const resolution = await resolveTeams(input);
  if (!resolution.ok) {
    return NextResponse.json(
      { error: resolution.error },
      { status: 400, headers: { 'cache-control': 'no-store' } }
    );
  }
  const teams = resolution.teams;
  const passphrase = generatePassphrase();

  const { data: settingsRow } = await db
    .from('registration_settings')
    .select('upi_id, beneficiary_name, registration_fee, official_qr_image_url, payment_enabled')
    .eq('singleton', true)
    .maybeSingle();
  const payment = normalizePaymentSettings(settingsRow);

  // 1. auth user
  const { data: authData, error: signUpError } = await db.auth.admin.createUser({
    email: input.leaderEmail,
    password: passphrase,
    email_confirm: true,
  });

  if (signUpError) {
    console.error('AUTH createUser ERROR:', {
      code: signUpError.code,
      message: signUpError.message,
      status: signUpError.status,
    });
    if (
      signUpError.message &&
      (signUpError.message.includes('already registered') ||
        signUpError.message.includes('already been registered') ||
        signUpError.message.includes('duplicate key'))
    ) {
      return NextResponse.json(
        { error: 'An account with this email is already registered.' },
        { status: 409, headers: { 'cache-control': 'no-store' } }
      );
    }
    return NextResponse.json(
      { error: `Could not create participant account: ${signUpError.message}` },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    );
  }
  if (!authData.user) {
    return NextResponse.json(
      { error: 'An account with this email is already registered.' },
      { status: 409, headers: { 'cache-control': 'no-store' } }
    );
  }
  const userId = authData.user.id;

  const createdTeamIds: string[] = [];
  const createdRegistrationIds: string[] = [];

  // Declared as an arrow function so TypeScript keeps the narrowed (non-null)
  // type of `db` established above; a hoisted function declaration widens it.
  const rollback = async () => {
    for (const teamId of createdTeamIds) {
      await db.from('team_members').delete().eq('team_id', teamId);
      await db.from('teams').delete().eq('id', teamId);
    }
    for (const regId of createdRegistrationIds) {
      await db.from('registrations').delete().eq('id', regId);
    }
    // registrations/teams reference profiles with ON DELETE RESTRICT, so they
    // must be removed first. Deleting the auth user cascades to profiles.
    await db.auth.admin.deleteUser(userId);
  };

  // 2. profile: `on_auth_user_created` already inserted this row, so update it.
  const { data: updatedProfiles, error: profileError } = await db
    .from('profiles')
    .update({
      full_name: input.leaderName,
      phone: input.leaderPhone,
      github_username: input.leaderGithubUsername || null,
    })
    .eq('id', userId)
    .select('id');

  if (profileError) {
    console.error('PROFILE UPDATE ERROR:', {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    });
    await rollback();
    return NextResponse.json(
      { error: `Could not update participant profile: ${profileError.message}` },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    );
  }

  // Defensive fallback if the trigger is not installed.
  if (!updatedProfiles || updatedProfiles.length === 0) {
    const { error: insertError } = await db.from('profiles').insert({
      id: userId,
      full_name: input.leaderName,
      email: input.leaderEmail,
      phone: input.leaderPhone,
      github_username: input.leaderGithubUsername || null,
      role: 'participant',
    });
    if (insertError) {
      console.error('PROFILE INSERT FALLBACK ERROR:', {
        code: insertError.code,
        message: insertError.message,
      });
      await rollback();
      return NextResponse.json(
        { error: `Could not create participant profile: ${insertError.message}` },
        { status: 500, headers: { 'cache-control': 'no-store' } }
      );
    }
  }

  // 3-5. registrations, teams and members
  const saved: Array<{
    referenceId: string;
    teamId: string;
    teamUid: string | null;
    domain: string;
    status: string;
    paymentStatus: string;
  }> = [];

  for (const team of teams) {
    const { data: reg, error: regError } = await db
      .from('registrations')
      .insert({
        leader_id: userId,
        team_name: team.teamName,
        institution: team.institution,
        domain_id: team.domainId,
        challenge_id: team.challengeId,
        repository_url: team.repositoryUrl?.trim() || null,
        rules_accepted_at: new Date().toISOString(),
        status: 'pending',
        payment_amount: payment.fee,
        payment_status: 'NOT PAID',
      })
      .select('id, reference_id, status, team_uid')
      .single();

    if (regError || !reg) {
      console.error('REGISTRATION INSERT ERROR:', {
        code: regError?.code,
        message: regError?.message,
        details: regError?.details,
        hint: regError?.hint,
      });
      await rollback();
      return NextResponse.json(
        {
          error: `Could not create registration for ${team.teamName}: ${
            regError?.message ?? 'no row returned'
          }`,
        },
        { status: 500, headers: { 'cache-control': 'no-store' } }
      );
    }
    createdRegistrationIds.push(reg.id);

    const { data: teamRow, error: teamError } = await db
      .from('teams')
      .insert({
        registration_id: reg.id,
        name: team.teamName,
        institution: team.institution,
        domain_id: team.domainId,
        challenge_id: team.challengeId,
        leader_id: userId,
      })
      .select('id')
      .single();

    if (teamError || !teamRow) {
      console.error('TEAM INSERT ERROR:', {
        code: teamError?.code,
        message: teamError?.message,
        details: teamError?.details,
        hint: teamError?.hint,
      });
      await rollback();
      return NextResponse.json(
        {
          error: `Could not create team ${team.teamName}: ${
            teamError?.message ?? 'no row returned'
          }`,
        },
        { status: 500, headers: { 'cache-control': 'no-store' } }
      );
    }
    createdTeamIds.push(teamRow.id);

    // leader is the single is_leader row for this team
    const { error: leaderError } = await db.from('team_members').insert({
      team_id: teamRow.id,
      profile_id: userId,
      full_name: input.leaderName,
      email: input.leaderEmail,
      github_username: input.leaderGithubUsername || null,
      is_leader: true,
    });

    if (leaderError) {
      console.error('LEADER MEMBER INSERT ERROR:', {
        code: leaderError.code,
        message: leaderError.message,
        details: leaderError.details,
      });
      await rollback();
      return NextResponse.json(
        { error: `Could not add the team leader: ${leaderError.message}` },
        { status: 500, headers: { 'cache-control': 'no-store' } }
      );
    }

    for (const member of team.members) {
      if (member.email === input.leaderEmail) continue; // already added above
      const { error: memberError } = await db.from('team_members').insert({
        team_id: teamRow.id,
        full_name: member.fullName,
        email: member.email,
        github_username: member.githubUsername || null,
        is_leader: false,
      });
      if (memberError) {
        console.error('MEMBER INSERT ERROR:', {
          code: memberError.code,
          message: memberError.message,
          details: memberError.details,
        });
        await rollback();
        return NextResponse.json(
          { error: `Could not add team member ${member.email}: ${memberError.message}` },
          { status: 500, headers: { 'cache-control': 'no-store' } }
        );
      }
    }

    saved.push({
      referenceId: reg.reference_id as string,
      teamId: teamRow.id,
      teamUid: (reg.team_uid as string | null) ?? null,
      domain: team.domainName,
      status: reg.status as string,
      paymentStatus: 'NOT PAID',
    });
  }

  return NextResponse.json(
    {
      success: true,
      participantId: userId,
      email: input.leaderEmail,
      passphrase,
      message:
        'Account created successfully. Your passphrase is displayed above - please copy and save it securely.',
      paymentEnabled: payment.enabled,
      upiId: payment.upiId,
      beneficiaryName: payment.beneficiaryName,
      registrationFee: payment.fee,
      qrCodeUrl: payment.qrCodeUrl,
      registrations: saved,
    },
    {
      status: 201,
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
      },
    }
  );
}
