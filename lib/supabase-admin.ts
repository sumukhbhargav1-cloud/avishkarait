import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isLiveSupabaseConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes('placeholder') &&
  Boolean(serviceRoleKey) &&
  !serviceRoleKey.includes('placeholder');

export const supabaseAdmin = isLiveSupabaseConfigured
  ? createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// ==============================================================================
// LOCAL PERSISTENT STORE (USED AS SEAMLESS LOCAL RUNTIME WHEN SUPABASE IS NOT LINKED)
// ==============================================================================
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

interface LocalDbStructure {
  sequences: Record<string, number>;
  events: any[];
  teams: any[];
  participants: any[];
  payments: any[];
  payment_submissions: any[];
  email_logs: any[];
  admin_audit_logs: any[];
  visitor_analytics: any[];
  site_settings: any;
}

function initLocalDb(): LocalDbStructure {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      return data;
    } catch {
      // parse failed, fallback
    }
  }

  const initialDb: LocalDbStructure = {
    sequences: {
      CYB: 0,
      FSD: 0,
      IOT: 0,
      THE: 0,
      MEC: 0,
    },
    events: [
      {
        id: '1',
        event_code: 'CYB',
        event_name: 'AI IN CYBERSECURITY AND FINTECH',
        category: 'Artificial Intelligence, Cybersecurity and Financial Technology',
        description: 'Build intelligent solutions for digital security, financial technology, fraud detection and emerging cyber threats.',
        team_size_min: 2,
        team_size_max: 4,
        registration_open: true,
      },
      {
        id: '2',
        event_code: 'FSD',
        event_name: 'FULL STACK DEVELOPMENT',
        category: 'Software Development and Web Technologies',
        description: 'Transform ideas into functional digital products through frontend, backend and database development.',
        team_size_min: 2,
        team_size_max: 4,
        registration_open: true,
      },
      {
        id: '3',
        event_code: 'IOT',
        event_name: 'IOT AND EMBEDDED SYSTEMS',
        category: 'Internet of Things and Embedded Engineering',
        description: 'Create practical hardware-based innovations by integrating sensors, electronics, embedded systems and intelligent technology.',
        team_size_min: 2,
        team_size_max: 4,
        registration_open: true,
      },
      {
        id: '4',
        event_code: 'THE',
        event_name: 'THEODO',
        category: 'Civil Engineering and Structural Innovation',
        description: 'Three challenges. Three ways to engineer the future.',
        team_size_min: 2,
        team_size_max: 4,
        registration_open: true,
      },
      {
        id: '5',
        event_code: 'MEC',
        event_name: 'MECHSPARK',
        category: 'Mechanical Engineering Challenge',
        description: 'MECHSPARK 2K26 – Mechanical Engineering Challenge. THINK. DESIGN. BUILD. WIN.',
        team_size_min: 2,
        team_size_max: 4,
        registration_open: true,
      },
    ],
    teams: [],
    participants: [],
    payments: [],
    payment_submissions: [],
    email_logs: [],
    admin_audit_logs: [],
    visitor_analytics: [],
    site_settings: {
      id: 1,
      hackathon_name: 'NATIONAL LEVEL HACKATHON 2K26',
      edition: '2K26',
      institution_name: 'COLLEGE OF ENGINEERING & TECHNOLOGY',
      trust_name: 'EDUCATIONAL TRUST',
      trust_description: 'A premier educational trust committed to excellence in technical education, research, and innovation.',
      college_description: 'An autonomous institution dedicated to nurturing engineering talents with cutting-edge laboratories and industry partnerships.',
      venue_address: 'Main Campus Auditorium, Engineering College Campus',
      google_maps_embed_url: null,
      registration_fee: 1500,
      total_prize_pool: '₹1,00,000',
      registrations_globally_open: true,
      official_qr_image_url: null,
      upi_id: 'organisers@upi',
      beneficiary_name: 'COLLEGE EVENT ACCOUNT',
      contact_email: 'hackathon@college.edu.in',
      contact_phone: '+91 9876543210',
    },
  };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch {}

  return initialDb;
}

function saveLocalDb(db: LocalDbStructure) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local db:', err);
  }
}

// ==============================================================================
// SERVICE LAYER
// ==============================================================================

export interface RegistrationInput {
  eventCode: string;
  selectedChallenge?: string | null;
  teamName: string;
  collegeName: string;
  teamLead: {
    fullName: string;
    email: string;
    phone: string;
  };
  participants: Array<{
    fullName: string;
    email: string;
    phone: string;
  }>;
}

export async function generateTeamUid(eventCode: string): Promise<string> {
  const code = eventCode.toUpperCase();
  const validPrefixes: Record<string, string> = {
    CYB: 'CYB',
    FSD: 'FSD',
    IOT: 'IOT',
    THE: 'THE',
    MEC: 'MEC',
  };

  const prefix = validPrefixes[code] || 'HAC';

  if (isLiveSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await (supabaseAdmin as any).rpc('generate_next_team_uid', {
      p_event_code: code,
    });
    if (!error && data) {
      return data;
    }
    console.warn('Live Supabase RPC error, calculating sequence:', error);
  }

  // Fallback atomic counter via local DB
  const db = initLocalDb();
  const current = db.sequences[code] || 0;
  const nextVal = current + 1;
  db.sequences[code] = nextVal;
  saveLocalDb(db);

  const formattedNum = String(nextVal).padStart(4, '0');
  return `${prefix}-26-${formattedNum}`;
}

export async function registerTeam(input: RegistrationInput) {
  const eventCode = input.eventCode.toUpperCase();

  // 1. Validation checks
  if (!input.teamName?.trim()) {
    throw new Error('Team name is required.');
  }
  if (!input.collegeName?.trim()) {
    throw new Error('College name is required.');
  }
  if (!input.teamLead?.fullName?.trim()) {
    throw new Error('Team lead full name is required.');
  }
  if (!input.teamLead?.email?.trim() || !input.teamLead.email.includes('@')) {
    throw new Error('Valid team lead Gmail/email address is required.');
  }
  if (!input.teamLead?.phone?.trim() || input.teamLead.phone.length < 10) {
    throw new Error('Valid team lead 10-digit contact number is required.');
  }

  const allEmails = [
    input.teamLead.email.toLowerCase().trim(),
    ...input.participants.map((p) => p.email.toLowerCase().trim()),
  ];
  const uniqueEmails = new Set(allEmails);
  if (uniqueEmails.size !== allEmails.length) {
    throw new Error('Duplicate email addresses detected within the team members.');
  }

  const totalMembers = 1 + input.participants.length;

  // Domain & challenge-specific checks
  if (eventCode === 'THE') {
    if (!input.selectedChallenge) {
      throw new Error('Please select a challenge for THEODO.');
    }
    if (input.selectedChallenge === 'BRIDGE-X' && totalMembers !== 4) {
      throw new Error('THEODO BRIDGE-X requires exactly 4 team members.');
    }
    if (input.selectedChallenge === 'CADATHON' && totalMembers !== 2) {
      throw new Error('THEODO CADATHON requires exactly 2 team members.');
    }
    if (input.selectedChallenge === 'SURVEYOR-X' && totalMembers !== 4) {
      throw new Error('THEODO SURVEYOR-X requires exactly 4 team members.');
    }
  } else {
    if (totalMembers < 2) {
      throw new Error('At least one additional participant is required (Minimum 2 team members).');
    }
    if (totalMembers > 4) {
      throw new Error('Total team size cannot exceed 4 members.');
    }
  }

  // 2. Generate unique atomic Team ID
  const teamUid = await generateTeamUid(eventCode);

  // 3. Persist registration
  if (isLiveSupabaseConfigured && supabaseAdmin) {
    // Live Supabase flow
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select('id, registration_open')
      .eq('event_code', eventCode)
      .single();

    if (eventData && !eventData.registration_open) {
      throw new Error('Registrations for this event are currently closed by the administrator.');
    }

    const eventId = eventData?.id || '00000000-0000-0000-0000-000000000000';

    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        team_uid: teamUid,
        team_name: input.teamName.trim(),
        event_id: eventId,
        selected_challenge: input.selectedChallenge || null,
        college_name: input.collegeName.trim(),
        team_lead_name: input.teamLead.fullName.trim(),
        team_lead_email: input.teamLead.email.toLowerCase().trim(),
        team_lead_phone: input.teamLead.phone.trim(),
        registration_status: 'REGISTERED',
      })
      .select()
      .single();

    if (teamError) {
      throw new Error(`Database registration failed: ${teamError.message}`);
    }

    // Insert participants
    if (input.participants.length > 0) {
      const pRows = input.participants.map((p, idx) => ({
        team_id: teamData.id,
        participant_name: p.fullName.trim(),
        participant_email: p.email.toLowerCase().trim(),
        participant_phone: p.phone.trim(),
        member_position: idx + 1,
      }));
      await supabaseAdmin.from('participants').insert(pRows);
    }

    // Insert initial payment record
    await supabaseAdmin.from('payments').insert({
      team_id: teamData.id,
      amount: 1500,
      currency: 'INR',
      payment_gateway: 'RAZORPAY',
      payment_method: 'GATEWAY',
      payment_status: 'NOT PAID',
    });

    return {
      success: true,
      teamId: teamData.id,
      teamUid: teamData.team_uid,
      teamName: teamData.team_name,
    };
  }

  // Local fallback storage flow
  const db = initLocalDb();
  const teamId = `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newTeam = {
    id: teamId,
    team_uid: teamUid,
    team_name: input.teamName.trim(),
    event_id: eventCode,
    event_code: eventCode,
    selected_challenge: input.selectedChallenge || null,
    college_name: input.collegeName.trim(),
    team_lead_name: input.teamLead.fullName.trim(),
    team_lead_email: input.teamLead.email.toLowerCase().trim(),
    team_lead_phone: input.teamLead.phone.trim(),
    registration_status: 'REGISTERED',
    created_at: now,
    updated_at: now,
  };

  db.teams.push(newTeam);

  input.participants.forEach((p, idx) => {
    db.participants.push({
      id: `p_${teamId}_${idx + 1}`,
      team_id: teamId,
      participant_name: p.fullName.trim(),
      participant_email: p.email.toLowerCase().trim(),
      participant_phone: p.phone.trim(),
      member_position: idx + 1,
      created_at: now,
    });
  });

  db.payments.push({
    id: `pay_${teamId}`,
    team_id: teamId,
    amount: 1500,
    currency: 'INR',
    payment_gateway: 'RAZORPAY',
    gateway_order_id: null,
    gateway_payment_id: null,
    transaction_reference: null,
    payment_method: 'GATEWAY',
    payment_status: 'NOT PAID',
    paid_at: null,
    created_at: now,
    updated_at: now,
  });

  saveLocalDb(db);

  return {
    success: true,
    teamId,
    teamUid,
    teamName: newTeam.team_name,
  };
}

export async function getTeamByUid(teamUid: string) {
  const cleanUid = teamUid.trim().toUpperCase();

  if (isLiveSupabaseConfigured && supabaseAdmin) {
    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .select('*, events(event_code, event_name, category), participants(*), payments(*), payment_submissions(*)')
      .eq('team_uid', cleanUid)
      .single();

    if (!error && team) {
      return team;
    }
  }

  // Local DB lookup
  const db = initLocalDb();
  const team = db.teams.find((t) => t.team_uid === cleanUid);
  if (!team) return null;

  const participants = db.participants.filter((p) => p.team_id === team.id);
  const payment = db.payments.find((p) => p.team_id === team.id) || {
    amount: 1500,
    payment_status: 'NOT PAID',
  };
  const submissions = db.payment_submissions.filter((s) => s.team_id === team.id);
  const event = db.events.find((e) => e.event_code === team.event_id || e.id === team.event_id);

  return {
    ...team,
    events: event,
    participants,
    payments: [payment],
    payment_submissions: submissions,
  };
}

export async function submitStaticQrPayment(params: {
  teamUid: string;
  utrReference: string;
  screenshotPath?: string;
}) {
  const { teamUid, utrReference, screenshotPath } = params;
  const team = await getTeamByUid(teamUid);
  if (!team) throw new Error('Team not found');

  const now = new Date().toISOString();

  if (isLiveSupabaseConfigured && supabaseAdmin) {
    await supabaseAdmin.from('payment_submissions').insert({
      team_id: team.id,
      utr_reference: utrReference.trim(),
      screenshot_storage_path: screenshotPath || null,
      verification_status: 'PENDING',
    });

    await supabaseAdmin
      .from('payments')
      .update({
        payment_method: 'STATIC_QR',
        payment_status: 'PENDING',
        transaction_reference: utrReference.trim(),
        updated_at: now,
      })
      .eq('team_id', team.id);

    return { success: true };
  }

  const db = initLocalDb();
  db.payment_submissions.push({
    id: `sub_${Date.now()}`,
    team_id: team.id,
    utr_reference: utrReference.trim(),
    screenshot_storage_path: screenshotPath || null,
    verification_status: 'PENDING',
    verified_by: null,
    verification_timestamp: null,
    rejection_reason: null,
    created_at: now,
  });

  const pay = db.payments.find((p) => p.team_id === team.id);
  if (pay) {
    pay.payment_method = 'STATIC_QR';
    pay.payment_status = 'PENDING';
    pay.transaction_reference = utrReference.trim();
    pay.updated_at = now;
  }

  saveLocalDb(db);
  return { success: true };
}

export async function updatePaymentToPaid(params: {
  teamId: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  transactionRef?: string;
  method?: 'GATEWAY' | 'STATIC_QR';
}) {
  const now = new Date().toISOString();

  if (isLiveSupabaseConfigured && supabaseAdmin) {
    await supabaseAdmin
      .from('payments')
      .update({
        payment_status: 'PAID',
        paid_at: now,
        gateway_order_id: params.gatewayOrderId || null,
        gateway_payment_id: params.gatewayPaymentId || null,
        transaction_reference: params.transactionRef || params.gatewayPaymentId || null,
        payment_method: params.method || 'GATEWAY',
        updated_at: now,
      })
      .eq('team_id', params.teamId);

    await supabaseAdmin
      .from('teams')
      .update({
        registration_status: 'CONFIRMED',
        updated_at: now,
      })
      .eq('id', params.teamId);

    return { success: true };
  }

  const db = initLocalDb();
  const pay = db.payments.find((p) => p.team_id === params.teamId);
  if (pay) {
    pay.payment_status = 'PAID';
    pay.paid_at = now;
    pay.gateway_order_id = params.gatewayOrderId || null;
    pay.gateway_payment_id = params.gatewayPaymentId || null;
    pay.transaction_reference = params.transactionRef || params.gatewayPaymentId || null;
    pay.payment_method = params.method || 'GATEWAY';
    pay.updated_at = now;
  }

  const t = db.teams.find((tm) => tm.id === params.teamId);
  if (t) {
    t.registration_status = 'CONFIRMED';
    t.updated_at = now;
  }

  saveLocalDb(db);
  return { success: true };
}

export async function verifySubmissionByAdmin(params: {
  submissionId: string;
  status: 'APPROVED' | 'REJECTED';
  adminEmail: string;
  rejectionReason?: string;
}) {
  const { submissionId, status, adminEmail, rejectionReason } = params;
  const now = new Date().toISOString();

  if (isLiveSupabaseConfigured && supabaseAdmin) {
    const { data: sub } = await supabaseAdmin
      .from('payment_submissions')
      .update({
        verification_status: status,
        verified_by: adminEmail,
        verification_timestamp: now,
        rejection_reason: rejectionReason || null,
      })
      .eq('id', submissionId)
      .select('team_id')
      .single();

    if (sub && status === 'APPROVED') {
      await updatePaymentToPaid({
        teamId: sub.team_id,
        method: 'STATIC_QR',
        transactionRef: 'VERIFIED_QR',
      });
    } else if (sub && status === 'REJECTED') {
      await supabaseAdmin
        .from('payments')
        .update({
          payment_status: 'FAILED',
          updated_at: now,
        })
        .eq('team_id', sub.team_id);
    }

    return { success: true };
  }

  const db = initLocalDb();
  const sub = db.payment_submissions.find((s) => s.id === submissionId);
  if (!sub) throw new Error('Submission not found');

  sub.verification_status = status;
  sub.verified_by = adminEmail;
  sub.verification_timestamp = now;
  sub.rejection_reason = rejectionReason || null;

  if (status === 'APPROVED') {
    const pay = db.payments.find((p) => p.team_id === sub.team_id);
    if (pay) {
      pay.payment_status = 'PAID';
      pay.paid_at = now;
      pay.payment_method = 'STATIC_QR';
      pay.transaction_reference = sub.utr_reference;
      pay.updated_at = now;
    }
    const t = db.teams.find((tm) => tm.id === sub.team_id);
    if (t) {
      t.registration_status = 'CONFIRMED';
      t.updated_at = now;
    }
  } else {
    const pay = db.payments.find((p) => p.team_id === sub.team_id);
    if (pay) {
      pay.payment_status = 'FAILED';
      pay.updated_at = now;
    }
  }

  saveLocalDb(db);
  return { success: true };
}

export async function getAdminMetrics() {
  if (isLiveSupabaseConfigured && supabaseAdmin) {
    const [{ count: totalTeams }, { count: totalParticipants }, { data: payments }, { count: visitors }] =
      await Promise.all([
        supabaseAdmin.from('teams').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('participants').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('payments').select('payment_status, amount'),
        supabaseAdmin.from('visitor_analytics').select('*', { count: 'exact', head: true }),
      ]);

    const paidTeams = payments?.filter((p) => p.payment_status === 'PAID').length || 0;
    const pendingPayments = payments?.filter((p) => p.payment_status === 'PENDING').length || 0;
    const failedPayments = payments?.filter((p) => p.payment_status === 'FAILED').length || 0;
    const revenue =
      payments
        ?.filter((p) => p.payment_status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

    return {
      totalRegistrations: (totalTeams || 0),
      totalTeams: totalTeams || 0,
      totalParticipants: (totalTeams || 0) + (totalParticipants || 0),
      paidTeams,
      pendingPayments,
      failedPayments,
      revenue,
      totalVisitors: visitors || 0,
      uniqueVisitors: visitors || 0,
    };
  }

  const db = initLocalDb();
  const totalTeams = db.teams.length;
  const totalParticipants = db.teams.length + db.participants.length;
  const paidTeams = db.payments.filter((p) => p.payment_status === 'PAID').length;
  const pendingPayments = db.payments.filter((p) => p.payment_status === 'PENDING').length;
  const failedPayments = db.payments.filter((p) => p.payment_status === 'FAILED').length;
  const revenue = db.payments
    .filter((p) => p.payment_status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const uniqueVisitorSet = new Set(db.visitor_analytics.map((v) => v.anonymous_visitor_id));

  return {
    totalRegistrations: totalTeams,
    totalTeams,
    totalParticipants,
    paidTeams,
    pendingPayments,
    failedPayments,
    revenue,
    totalVisitors: db.visitor_analytics.length,
    uniqueVisitors: uniqueVisitorSet.size,
  };
}

export async function getAllRegistrations() {
  if (isLiveSupabaseConfigured && supabaseAdmin) {
    const { data: teams, error } = await supabaseAdmin
      .from('teams')
      .select('*, events(event_code, event_name), participants(*), payments(*), payment_submissions(*)')
      .order('created_at', { ascending: false });

    if (!error && teams) return teams;
  }

  const db = initLocalDb();
  return db.teams.map((t) => {
    const participants = db.participants.filter((p) => p.team_id === t.id);
    const payments = db.payments.filter((p) => p.team_id === t.id);
    const submissions = db.payment_submissions.filter((s) => s.team_id === t.id);
    const event = db.events.find((e) => e.event_code === t.event_id || e.id === t.event_id);

    return {
      ...t,
      events: event,
      participants,
      payments,
      payment_submissions: submissions,
    };
  });
}

export async function getSiteSettings() {
  if (isLiveSupabaseConfigured && supabaseAdmin) {
    const { data } = await supabaseAdmin.from('site_settings').select('*').single();
    if (data) return data;
  }

  const db = initLocalDb();
  return db.site_settings;
}

export async function updateSiteSettings(settings: Partial<Database['public']['Tables']['site_settings']['Row']>) {
  const { id, ...updateFields } = settings as any;

  if (isLiveSupabaseConfigured && supabaseAdmin) {
    const { data } = await (supabaseAdmin as any)
      .from('site_settings')
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();
    return data;
  }

  const db = initLocalDb();
  db.site_settings = { ...db.site_settings, ...settings, updated_at: new Date().toISOString() };
  saveLocalDb(db);
  return db.site_settings;
}

export async function logVisitor(params: {
  anonymousVisitorId: string;
  pagePath: string;
  referralSource?: string;
  deviceCategory?: string;
}) {
  const { anonymousVisitorId, pagePath, referralSource, deviceCategory } = params;

  if (isLiveSupabaseConfigured && supabaseAdmin) {
    await supabaseAdmin.from('visitor_analytics').insert({
      anonymous_visitor_id: anonymousVisitorId,
      page_path: pagePath,
      referral_source: referralSource || null,
      device_category: deviceCategory || 'desktop',
    });
    return;
  }

  const db = initLocalDb();
  db.visitor_analytics.push({
    id: `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    anonymous_visitor_id: anonymousVisitorId,
    page_path: pagePath,
    referral_source: referralSource || null,
    device_category: deviceCategory || 'desktop',
    visited_at: new Date().toISOString(),
  });
  saveLocalDb(db);
}
