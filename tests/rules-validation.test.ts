import { registrationInputSchema } from '../lib/registration-schema';
import { eventDomains } from '../lib/domain-content';
import {
  EVENT_DOMAINS,
  COLLEGE_SPOC,
  FACULTY_COORDINATORS,
  STUDENT_COORDINATORS,
  EVENT_LOGISTICS,
  DETAILED_24_HOUR_SCHEDULE,
  REGISTRATION_DEADLINE,
  REGISTRATION_DEADLINE_SHORT,
  REGISTRATION_FEE_INR,
} from '../lib/constants';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting AVISHKAR 2K26 Rules & Registration Validation Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DOMAIN & CHALLENGE SPECIFICATION CHECKS (PDF Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Domain Content & Rules Conformance ---');

runTest('AI in Cybersecurity & FinTech: confirmed team size 2–4 members & 24 hrs', () => {
  const d = eventDomains.find(x => x.slug === 'ai-cybersecurity-fintech')!;
  assert(d !== undefined, 'Domain exists');
  assert(d.minTeamSize === 2, 'Domain min team size is 2');
  assert(d.maxTeamSize === 4, 'Domain max team size is 4');
  assert(d.duration === '24 hours', 'Domain duration is 24 hours');
  assert(d.challenges[0].minTeamSize === 2 && d.challenges[0].maxTeamSize === 4, 'Challenge team size is 2 to 4');
});

runTest('Full Stack Development: confirmed team size 2–4 members & 24 hrs', () => {
  const d = eventDomains.find(x => x.slug === 'full-stack')!;
  assert(d !== undefined, 'Domain exists');
  assert(d.minTeamSize === 2, 'Domain min team size is 2');
  assert(d.maxTeamSize === 4, 'Domain max team size is 4');
  assert(d.duration === '24 hours', 'Domain duration is 24 hours');
  assert(d.challenges[0].minTeamSize === 2 && d.challenges[0].maxTeamSize === 4, 'Challenge team size is 2 to 4');
});

runTest('IoT & Embedded Systems: team size 2–4 members, bring own components', () => {
  const d = eventDomains.find(x => x.slug === 'iot-embedded')!;
  assert(d !== undefined, 'Domain exists');
  assert(d.minTeamSize === 2, 'Domain min team size is 2');
  assert(d.maxTeamSize === 4, 'Domain max team size is 4');
  const c = d.challenges.find(x => x.id === 'iot-embedded')!;
  assert(c.minTeamSize === 2 && c.maxTeamSize === 4, 'Challenge team size is 2 to 4');
  assert(c.requirements.some(r => r.toLowerCase().includes('bring all required components')), 'Must bring components');
  assert(c.requirements.some(r => r.toLowerCase().includes('will not provide components')), 'College does not provide components');
  assert(c.requirements.some(r => r.toLowerCase().includes('pre-built complete projects')), 'No pre-built projects');
});

runTest('MECHSPARK 2K26: max 4 members, 8 hours, 3 specific challenges, PPE & safety', () => {
  const d = eventDomains.find(x => x.slug === 'mechspark')!;
  assert(d !== undefined, 'Domain exists');
  assert(d.maxTeamSize === 4, 'Max team size is 4');
  assert(d.minTeamSize === undefined, 'Min team size is unconfirmed (no minimum invented)');
  assert(d.duration === '8 hours', 'Duration is 8 hours');
  assert(d.challenges.length === 3, 'Has exactly 3 challenges');
  
  const lathe = d.challenges.find(c => c.id === 'lathe-machine-operating')!;
  assert(lathe !== undefined, 'Lathe challenge exists');
  assert(lathe.maxTeamSize === 4, 'Lathe max 4');
  assert(lathe.requirements.some(r => r.includes('PPE')), 'Lathe specifies PPE');
  assert(lathe.requirements.some(r => r.includes('supervision')), 'Lathe specifies faculty supervision');

  const cad = d.challenges.find(c => c.id === 'solid-edge-cad-design')!;
  assert(cad !== undefined, 'Solid Edge CAD challenge exists');
  assert(cad.maxTeamSize === 4, 'Solid Edge max 4');

  const cardboard = d.challenges.find(c => c.id === 'cardboard-mechanical-model')!;
  assert(cardboard !== undefined, 'Cardboard model challenge exists');
  assert(cardboard.maxTeamSize === 4, 'Cardboard model max 4');
});

runTest('THEODO: BRIDGE-X (4), CADATHON (2, offline), SURVEYOR-X (4, calculator)', () => {
  const d = eventDomains.find(x => x.slug === 'theodo')!;
  assert(d !== undefined, 'Domain exists');
  
  const bridge = d.challenges.find(c => c.id === 'bridge-x')!;
  assert(bridge.minTeamSize === 4 && bridge.maxTeamSize === 4, 'BRIDGE-X is exactly 4 members');
  assert(bridge.evaluation.length === 5, 'BRIDGE-X has 5 evaluation criteria');

  const cad = d.challenges.find(c => c.id === 'cadathon')!;
  assert(cad.minTeamSize === 2 && cad.maxTeamSize === 2, 'CADATHON is exactly 2 members');
  assert(cad.requirements.some(r => r.toLowerCase().includes('offline') || r.toLowerCase().includes('internet access is not allowed')), 'CADATHON offline enforced');
  assert(cad.requirements.some(r => r.toLowerCase().includes('templates without pre-drawn geometry')), 'AutoCAD template restriction');

  const surveyor = d.challenges.find(c => c.id === 'surveyor-x')!;
  assert(surveyor.minTeamSize === 4 && surveyor.maxTeamSize === 4, 'SURVEYOR-X is exactly 4 members');
  assert(surveyor.requirements.some(r => r.toLowerCase().includes('calculator')), 'SURVEYOR-X calculator requirement');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. REGISTRATION SCHEMA VALIDATION & TEAM SIZE BOUNDARY TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Team-Size Boundary & Schema Validation ---');

const dummyDomainId = '11111111-1111-1111-1111-111111111111';

function createPayload(challengeId: string, memberCount: number, overrides: any = {}) {
  const members = [];
  for (let i = 1; i <= memberCount; i++) {
    members.push({
      fullName: `Member ${i}`,
      email: `member${i}@example.com`,
      githubUsername: `member${i}`,
    });
  }
  return {
    leaderName: 'Test Leader',
    leaderEmail: 'leader@example.com',
    leaderPhone: '+91 9876543210',
    leaderGithubUsername: 'leader-gh',
    teams: [
      {
        teamName: 'Innovators',
        institution: 'AIT Chikkamagaluru',
        city: 'Chikkamagaluru',
        state: 'Karnataka',
        domainId: dummyDomainId,
        challengeId,
        members,
        repositoryUrl: '',
        rulesAccepted: true,
        ...overrides,
      },
    ],
  };
}

// AI in Cybersecurity & FinTech: 2–4 members
runTest('AI in Cybersecurity & FinTech rejects 1 member (leader only)', () => {
  const res = registrationInputSchema.safeParse(createPayload('ai-cybersecurity-fintech', 0));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('requires at least 2 team members'));
  assert(err !== undefined, 'Gives correct minimum boundary message');
});

runTest('AI in Cybersecurity & FinTech accepts 2 members', () => {
  assert(registrationInputSchema.safeParse(createPayload('ai-cybersecurity-fintech', 1)).success, '2 members valid');
});

runTest('AI in Cybersecurity & FinTech accepts 4 members', () => {
  assert(registrationInputSchema.safeParse(createPayload('ai-cybersecurity-fintech', 3)).success, '4 members valid');
});

runTest('AI in Cybersecurity & FinTech rejects 5 members', () => {
  assert(!registrationInputSchema.safeParse(createPayload('ai-cybersecurity-fintech', 4)).success, '5 members invalid');
});

// Full Stack Development: 2–4 members
runTest('Full Stack Development rejects 1 member (leader only)', () => {
  const res = registrationInputSchema.safeParse(createPayload('full-stack', 0));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('requires at least 2 team members'));
  assert(err !== undefined, 'Gives correct minimum boundary message');
});

runTest('Full Stack Development accepts 2 members', () => {
  assert(registrationInputSchema.safeParse(createPayload('full-stack', 1)).success, '2 members valid');
});

runTest('Full Stack Development accepts 4 members', () => {
  assert(registrationInputSchema.safeParse(createPayload('full-stack', 3)).success, '4 members valid');
});

runTest('Full Stack Development rejects 5 members', () => {
  assert(!registrationInputSchema.safeParse(createPayload('full-stack', 4)).success, '5 members invalid');
});

// IoT & Embedded Systems: 2–4 members (leader + 1 to 3 members)
runTest('IoT rejects 1 member (leader only)', () => {
  const res = registrationInputSchema.safeParse(createPayload('iot-embedded', 0));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('requires at least 2 team members'));
  assert(err !== undefined, 'Gives correct minimum boundary message');
});

runTest('IoT accepts 2 members (leader + 1 member)', () => {
  const res = registrationInputSchema.safeParse(createPayload('iot-embedded', 1));
  assert(res.success, 'Should succeed with 2 members');
});

runTest('IoT accepts 4 members (leader + 3 members)', () => {
  const res = registrationInputSchema.safeParse(createPayload('iot-embedded', 3));
  assert(res.success, 'Should succeed with 4 members');
});

runTest('IoT rejects 5 members (leader + 4 members)', () => {
  const res = registrationInputSchema.safeParse(createPayload('iot-embedded', 4));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('allows no more than 4 team members'));
  assert(err !== undefined, 'Gives correct maximum boundary message');
});

// MECHSPARK: max 4 members, no minimum invented
runTest('MECHSPARK Lathe accepts 1 member (leader only, no minimum invented)', () => {
  const res = registrationInputSchema.safeParse(createPayload('lathe-machine-operating', 0));
  assert(res.success, 'Should succeed with leader only');
});

runTest('MECHSPARK Lathe accepts 4 members (leader + 3)', () => {
  const res = registrationInputSchema.safeParse(createPayload('lathe-machine-operating', 3));
  assert(res.success, 'Should succeed with 4 members');
});

runTest('MECHSPARK Lathe rejects 5 members (leader + 4)', () => {
  const res = registrationInputSchema.safeParse(createPayload('lathe-machine-operating', 4));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('allows no more than 4 team members'));
  assert(err !== undefined, 'Gives correct maximum boundary message');
});

runTest('MECHSPARK Solid Edge CAD enforces max 4 members', () => {
  assert(registrationInputSchema.safeParse(createPayload('solid-edge-cad-design', 3)).success, '4 members valid');
  assert(!registrationInputSchema.safeParse(createPayload('solid-edge-cad-design', 4)).success, '5 members invalid');
});

runTest('MECHSPARK Cardboard Model enforces max 4 members', () => {
  assert(registrationInputSchema.safeParse(createPayload('cardboard-mechanical-model', 3)).success, '4 members valid');
  assert(!registrationInputSchema.safeParse(createPayload('cardboard-mechanical-model', 4)).success, '5 members invalid');
});

// THEODO BRIDGE-X: exactly 4 members
runTest('BRIDGE-X rejects 3 members (leader + 2)', () => {
  const res = registrationInputSchema.safeParse(createPayload('bridge-x', 2));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('requires at least 4 team members'));
  assert(err !== undefined, 'Requires at least 4');
});

runTest('BRIDGE-X accepts exactly 4 members (leader + 3)', () => {
  const res = registrationInputSchema.safeParse(createPayload('bridge-x', 3));
  assert(res.success, 'Should succeed with exactly 4 members');
});

runTest('BRIDGE-X rejects 5 members (leader + 4)', () => {
  const res = registrationInputSchema.safeParse(createPayload('bridge-x', 4));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('allows no more than 4 team members'));
  assert(err !== undefined, 'Allows no more than 4');
});

// THEODO CADATHON: exactly 2 members
runTest('CADATHON rejects 1 member (leader only)', () => {
  const res = registrationInputSchema.safeParse(createPayload('cadathon', 0));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('requires at least 2 team members'));
  assert(err !== undefined, 'Requires at least 2');
});

runTest('CADATHON accepts exactly 2 members (leader + 1)', () => {
  const res = registrationInputSchema.safeParse(createPayload('cadathon', 1));
  assert(res.success, 'Should succeed with exactly 2 members');
});

runTest('CADATHON rejects 3 members (leader + 2)', () => {
  const res = registrationInputSchema.safeParse(createPayload('cadathon', 2));
  assert(!res.success, 'Should fail validation');
  const err = res.error?.issues.find(i => i.message.includes('allows no more than 2 team members'));
  assert(err !== undefined, 'Allows no more than 2');
});

// THEODO SURVEYOR-X: exactly 4 members
runTest('SURVEYOR-X rejects 3 members (leader + 2)', () => {
  const res = registrationInputSchema.safeParse(createPayload('surveyor-x', 2));
  assert(!res.success, 'Should fail validation');
});

runTest('SURVEYOR-X accepts exactly 4 members (leader + 3)', () => {
  const res = registrationInputSchema.safeParse(createPayload('surveyor-x', 3));
  assert(res.success, 'Should succeed with exactly 4 members');
});

runTest('SURVEYOR-X rejects 5 members (leader + 4)', () => {
  const res = registrationInputSchema.safeParse(createPayload('surveyor-x', 4));
  assert(!res.success, 'Should fail validation');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. INTEGRITY & SECURITY VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Integrity & Security Validations ---');

runTest('Duplicate email detection (leader email reused by member)', () => {
  const payload = createPayload('iot-embedded', 1);
  payload.teams[0].members[0].email = 'leader@example.com';
  const res = registrationInputSchema.safeParse(payload);
  assert(!res.success, 'Should detect duplicate email');
  assert(Boolean(res.error?.issues.some(i => i.message.includes('unique member email'))), 'Unique email message');
});

runTest('Duplicate domain registration prevention', () => {
  const payload = createPayload('iot-embedded', 1);
  payload.teams.push({
    ...payload.teams[0],
    teamName: 'Second Team',
    challengeId: 'lathe-machine-operating',
  });
  const res = registrationInputSchema.safeParse(payload);
  assert(!res.success, 'Should prevent same domain registered twice');
  assert(Boolean(res.error?.issues.some(i => i.message.includes('separate domain only once'))), 'Separate domain message');
});

runTest('Rules must be explicitly accepted', () => {
  const payload = createPayload('cadathon', 1, { rulesAccepted: false });
  const res = registrationInputSchema.safeParse(payload);
  assert(!res.success, 'rulesAccepted: false must fail validation');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. EVENT LOGISTICS, COORDINATORS & 24-HOUR SCHEDULE CONFORMANCE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Event Logistics, Coordinators & 24-Hour Schedule Conformance ---');

runTest('Event logistics: registration deadline 21-11-2026 / 21 November 2026', () => {
  assert(REGISTRATION_DEADLINE === '21 November 2026', 'Deadline is 21 November 2026');
  assert(REGISTRATION_DEADLINE_SHORT === '21-11-2026', 'Short deadline is 21-11-2026');
  assert(EVENT_LOGISTICS.registrationDeadline === '21 November 2026', 'Logistics object matches deadline');
  assert(EVENT_LOGISTICS.registrationDeadlineShort === '21-11-2026', 'Logistics object matches short deadline');
  assert(EVENT_LOGISTICS.registrationFeeINR === 1500, 'Registration fee is 1500 INR');
  assert(EVENT_LOGISTICS.paymentMethods.includes('UPI') && EVENT_LOGISTICS.paymentMethods.includes('Payment Gateway'), 'Payment methods documented');
});

runTest('College SPOC contact details: Mr. Ravikumar (+91 97419 70005)', () => {
  assert(COLLEGE_SPOC.name === 'Mr. Ravikumar', 'SPOC name is Mr. Ravikumar');
  assert(COLLEGE_SPOC.phone === '+91 97419 70005', 'SPOC phone is +91 97419 70005');
  assert(COLLEGE_SPOC.phoneRaw === '+919741970005', 'SPOC raw phone is +919741970005');
});

runTest('Faculty Coordinators: Mrs. Sana Ara & Ms. Sonia Fathima', () => {
  assert(FACULTY_COORDINATORS.length === 2, 'Two faculty coordinators');
  const sana = FACULTY_COORDINATORS.find(f => f.name.includes('Sana Ara'))!;
  assert(sana !== undefined, 'Mrs. Sana Ara exists');
  assert(sana.phone === '+91 91488 45386', 'Mrs. Sana Ara phone is +91 91488 45386');

  const sonia = FACULTY_COORDINATORS.find(f => f.name.includes('Sonia Fathima'))!;
  assert(sonia !== undefined, 'Ms. Sonia Fathima exists');
  assert(sonia.phone === '+91 82770 71071', 'Ms. Sonia Fathima phone is +91 82770 71071');
});

runTest('Student Coordinators: Chirag K P & Sumukh Bhargav', () => {
  assert(STUDENT_COORDINATORS.length === 2, 'Two student coordinators');
  const chirag = STUDENT_COORDINATORS.find(s => s.name.includes('Chirag K P'))!;
  assert(chirag !== undefined, 'Chirag K P exists');
  assert(chirag.phone === '+91 6362391028', 'Chirag K P phone is +91 6362391028');

  const sumukh = STUDENT_COORDINATORS.find(s => s.name.includes('Sumukh Bhargav'))!;
  assert(sumukh !== undefined, 'Sumukh Bhargav exists');
  assert(sumukh.phone === '+91 8618376684', 'Sumukh Bhargav phone is +91 8618376684');
});

runTest('Detailed 24-hour hour-by-hour schedule completeness', () => {
  assert(DETAILED_24_HOUR_SCHEDULE.length === 24, 'Exactly 24 hour slots present');
  for (let i = 1; i <= 24; i++) {
    const slot = DETAILED_24_HOUR_SCHEDULE.find(s => s.hourNumber === i);
    assert(slot !== undefined, `Hour slot ${i} exists`);
    assert(slot!.timeRange.length > 0, `Hour ${i} has time range`);
    assert(slot!.title.length > 0, `Hour ${i} has title`);
    assert(slot!.focus.length > 0, `Hour ${i} has focus description`);
  }
  // Check start and end
  assert(DETAILED_24_HOUR_SCHEDULE[0].timeRange === '11:30 – 12:30', 'Hour 1 starts at 11:30');
  assert(DETAILED_24_HOUR_SCHEDULE[23].timeRange === '10:30 – 11:30', 'Hour 24 completes at 11:30');
});

runTest('EVENT_DOMAINS software duration & team size alignment', () => {
  const cyb = EVENT_DOMAINS['ai-cybersecurity-fintech'];
  assert(cyb.teamSizeMin === 2 && cyb.teamSizeMax === 4, 'Cybersecurity team size 2-4');
  assert(cyb.duration === '24 Hours', 'Cybersecurity duration 24 Hours');

  const fsd = EVENT_DOMAINS['full-stack'];
  assert(fsd.teamSizeMin === 2 && fsd.teamSizeMax === 4, 'Full Stack team size 2-4');
  assert(fsd.duration === '24 Hours', 'Full Stack duration 24 Hours');
});

console.log(`\n========================================`);
console.log(`Summary: ${passedTests} / ${totalTests} tests passed`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}

