export type DomainChallenge = {
  id: string;
  name: string;
  summary: string;
  requirements: string[];
  evaluation: string[];
  minTeamSize?: number;
  maxTeamSize?: number;
  duration?: string;
  provisional?: boolean;
};

export type EventDomain = {
  number: string;
  code: string;
  slug: string;
  name: string;
  short: string;
  description: string;
  focus: string[];
  minTeamSize?: number;
  maxTeamSize?: number;
  duration?: string;
  coordinators: { role: string; name: string; phone: string }[];
  challenges: DomainChallenge[];
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL AVISHKAR 2K26 DOMAIN AND CHALLENGE RULES
// Source: AVISHKAR 2K26 Event Information Reference
// Items marked provisional = true are pending organiser confirmation.
// ─────────────────────────────────────────────────────────────────────────────
export const eventDomains: EventDomain[] = [
  // ── 01 · AI IN CYBERSECURITY & FINTECH ─────────────────────────────────────
  // Team size: 2–4 members (confirmed).
  // Duration: 24 hours (confirmed).
  {
    number: '01', code: 'CYB', slug: 'ai-cybersecurity-fintech',
    coordinators: [
      { role: 'Student Coordinator', name: 'Yogin', phone: '+91 6364328712' },
    ],
    name: 'AI in Cybersecurity & FinTech',
    short: 'Intelligent systems built for trust and financial security.',
    description: 'Artificial intelligence applications in cybersecurity, financial technology, intelligent security systems and innovative financial solutions.',
    focus: ['AI-based cybersecurity solutions', 'Fraud detection and financial security', 'Intelligent financial applications', 'Threat detection and analysis', 'Secure digital systems'],
    minTeamSize: 2, maxTeamSize: 4, duration: '24 hours',
    challenges: [{
      id: 'ai-cybersecurity-fintech',
      name: 'AI in Cybersecurity & FinTech',
      summary: 'Develop the assigned problem statement during the 24-hour hackathon.',
      minTeamSize: 2, maxTeamSize: 4, duration: '24 hours',
      requirements: [
        'Team size: 2 to 4 members.',
        'Duration: 24 hours.',
        'No pre-built complete project.',
        'Disclose external libraries, APIs and AI tools.',
        'Submit source code, README or documentation, and a working demonstration.',
        'Plagiarism and copied submissions are prohibited.',
      ],
      evaluation: [
        'Problem relevance and innovation: 25%',
        'Technical implementation and architecture: 30%',
        'Working demonstration: 25%',
        'Documentation and presentation: 20%',
      ],
    }],
  },

  // ── 02 · FULL STACK DEVELOPMENT ────────────────────────────────────────────
  // Team size: 2–4 members (confirmed).
  // Duration: 24 hours (confirmed).
  {
    number: '02', code: 'FSD', slug: 'full-stack',
    coordinators: [
      { role: 'Student Coordinator', name: 'Likeeth G Urs', phone: '+91 9113688812' },
      { role: 'Faculty Coordinator', name: 'Ms Sana Ara', phone: '+91 9148845386' },
    ],
    name: 'Full Stack Development',
    short: 'Functional software from polished interface to connected data.',
    description: 'Develop functional, innovative and user-oriented digital applications using frontend and backend technologies.',
    focus: ['Web application development', 'Backend and API integration', 'Database-driven applications', 'UI/UX design', 'Functional software solutions'],
    minTeamSize: 2, maxTeamSize: 4, duration: '24 hours',
    challenges: [{
      id: 'full-stack',
      name: 'Full Stack Development',
      summary: 'Develop the assigned problem statement during the 24-hour hackathon.',
      minTeamSize: 2, maxTeamSize: 4, duration: '24 hours',
      requirements: [
        'Team size: 2 to 4 members.',
        'Duration: 24 hours.',
        'No pre-built complete projects.',
        'Disclose APIs, libraries and AI tools.',
        'Submit source code, a working demo and documentation.',
        'Plagiarism is prohibited.',
      ],
      evaluation: [
        'Functionality and feature completeness: 30%',
        'Frontend UI/UX and responsiveness: 25%',
        'Backend architecture and API integration: 25%',
        'Code quality and live demonstration: 20%',
      ],
    }],
  },

  // ── 03 · IoT & EMBEDDED SYSTEMS ────────────────────────────────────────────
  // Team size: 2–4 members (confirmed).
  // Bring own components. College provides nothing.
  // Build complete prototype during the event. No pre-built projects.
  {
    number: '03', code: 'IOT', slug: 'iot-embedded',
    coordinators: [
      { role: 'Student Coordinator', name: 'Divya P', phone: '+91 9380662076' },
      { role: 'Faculty Coordinator', name: 'Dr. Raghukumar B S', phone: '+91 91642 80757' },
    ],
    name: 'IoT & Embedded Systems',
    short: 'Connect software, sensing and the physical world.',
    description: 'Build a complete connected or embedded project during the hackathon.',
    minTeamSize: 2, maxTeamSize: 4,
    focus: ['Connected devices', 'Embedded systems', 'Intelligent sensing'],
    challenges: [{
      id: 'iot-embedded',
      name: 'IoT & Embedded Systems',
      summary: 'Build and demonstrate a complete IoT or embedded hardware and software prototype.',
      minTeamSize: 2, maxTeamSize: 4,
      requirements: [
        'Team size: 2 to 4 members.',
        'Participants must bring all required components, sensors, microcontrollers and hardware tools. The college will not provide components.',
        'Build the complete hardware and software prototype during the hackathon.',
        'Pre-built complete projects or ready-made circuits are not permitted.',
      ],
      evaluation: [
        'Demonstrate the complete working prototype.',
        'Additional evaluation criteria: To be announced.',
      ],
    }],
  },

  // ── 04 · MECHSPARK 2K26 ────────────────────────────────────────────────────
  // Maximum team size: 4 (confirmed). Minimum: not specified in event reference.
  // Duration: 8 hours (confirmed).
  // Three challenges: Lathe Machine, Solid Edge CAD, Cardboard Model.
  // Equipment provided by organisers. Faculty supervision for lathe.
  // PPE and workshop safety rules mandatory.
  {
    number: '04', code: 'MEC', slug: 'mechspark',
    coordinators: [
      { role: 'Student Coordinator', name: 'Kishan', phone: '+91 9964127576' },
      { role: 'Faculty Coordinator', name: 'Mr. Praveen', phone: '+91 8762006969' },
    ],
    name: 'MECHSPARK 2K26',
    short: 'IDEAS THAT MOVE THE WORLD.',
    description: 'MECHSPARK 2K26 – Mechanical Engineering. IDEAS THAT MOVE THE WORLD.',
    maxTeamSize: 4, duration: '8 hours',
    focus: ['Mechanical design', 'Applied engineering', 'Fabrication and modelling'],
    challenges: [
      {
        id: 'lathe-machine-operating',
        name: 'Lathe Machine Operating',
        summary: 'Complete an assigned practical machining and lathe operation task under faculty supervision.',
        maxTeamSize: 4, duration: '8 hours',
        requirements: [
          'Complete the assigned task within the 8-hour duration.',
          'Organisers provide the required machines, materials and equipment.',
          'Only authorised participants may operate machines under faculty supervision.',
          'Use required Personal Protective Equipment (PPE) and follow all workshop safety instructions.',
          'Unsafe behaviour or equipment misuse may result in disqualification.',
        ],
        evaluation: ['Dimensional accuracy', 'Surface finish', 'Machine handling', 'Time management', 'Safety'],
      },
      {
        id: 'solid-edge-cad-design',
        name: 'Solid Edge CAD Design',
        summary: 'Create the assigned 3D model announced at the venue using Solid Edge.',
        maxTeamSize: 4, duration: '8 hours',
        requirements: [
          'Complete the assigned task within the 8-hour duration.',
          'Organisers provide the required machines, materials and equipment.',
          'Previously prepared models are not permitted.',
          'Submit the final design files at the end of the session.',
        ],
        evaluation: ['Design accuracy', 'Creativity', 'Modelling skills', 'Dimensions', 'Completion time'],
      },
      {
        id: 'cardboard-mechanical-model',
        name: 'Cardboard Mechanical Model Making',
        summary: 'Build a working mechanical model using organiser-provided cardboard and permitted materials.',
        maxTeamSize: 4, duration: '8 hours',
        requirements: [
          'Complete the assigned task within the 8-hour duration.',
          'Organisers provide the required materials, including cardboard and permitted construction materials.',
          'Pre-built models are not permitted.',
          'Demonstrate the working mechanism and explain its engineering principle.',
        ],
        evaluation: ['Innovation', 'Working mechanism', 'Strength and stability', 'Engineering application', 'Presentation'],
      },
    ],
  },

  // ── 05 · THEODO ────────────────────────────────────────────────────────────
  // Three sub-challenges with distinct team sizes (all confirmed):
  //   BRIDGE-X: exactly 4 members
  //   CADATHON: exactly 2 members; offline; AutoCAD residential building design
  //   SURVEYOR-X: exactly 4 members; participants bring calculator; practical levelling
  {
    number: '05', code: 'CIV', slug: 'theodo',
    coordinators: [
      { role: 'Student Coordinator', name: 'Rahul', phone: '+91 9110463448' },
      { role: 'Faculty Coordinator', name: 'Mr. Naveen', phone: '+91 95917 93656' },
    ],
    name: 'THEODO – Civil Engineering & Structural Innovation',
    short: 'Structural thinking, drafting and field engineering.',
    description: 'Apply civil engineering skills to structural design, AutoCAD drafting and field surveying challenges.',
    focus: ['Structural design and innovation', 'Civil CAD and building design', 'Surveying and field levelling'],
    challenges: [
      {
        id: 'bridge-x',
        name: 'BRIDGE-X',
        summary: 'Build a bridge using organiser-provided materials. Completed bridges undergo gradual load testing to assess structural performance.',
        minTeamSize: 4, maxTeamSize: 4,
        requirements: [
          'Team size: exactly 4 members.',
          'Bridge materials are provided by organisers; no external materials are permitted.',
          'Build the bridge within the allotted time.',
        ],
        evaluation: [
          'Load capacity: 30%',
          'Structural stability: 25%',
          'Material efficiency: 15%',
          'Innovation and design: 15%',
          'Construction quality: 15%',
        ],
      },
      {
        id: 'cadathon',
        name: 'CADATHON',
        summary: 'Round 1: an offline quiz of approximately 20–30 MCQs in 20–30 minutes. The top 10 teams advance to Round 2: a 90-minute offline AutoCAD residential building design challenge.',
        minTeamSize: 2, maxTeamSize: 2, duration: '90 minutes',
        requirements: [
          'Team size: exactly 2 members.',
          'The challenge is entirely offline. Internet access is not allowed.',
          'Basic AutoCAD templates without pre-drawn geometry are permitted.',
          'No pre-made drawings or pre-drafted geometry are allowed.',
          'Submit a floor plan, elevation, cross-section and schedule of openings.',
        ],
        evaluation: [
          'Planning and space utilisation: 25%',
          'Vastu: 15%',
          'Sustainability: 15%',
          'Drawing accuracy: 20%',
          'Elevation/section quality: 15%',
          'Presentation: 10%',
        ],
      },
      {
        id: 'surveyor-x',
        name: 'SURVEYOR-X',
        summary: 'Round 1: an offline quiz of approximately 20–30 MCQs in 20–30 minutes. Round 2: practical field levelling – record staff readings and calculate reduced levels and elevation differences.',
        minTeamSize: 4, maxTeamSize: 4,
        requirements: [
          'Team size: exactly 4 members.',
          'Participants must bring a scientific calculator.',
          'Organisers provide a Dumpy/Auto Level, levelling staff, tripod and field sheet.',
          'Record staff readings accurately and calculate reduced levels and elevation differences.',
        ],
        evaluation: [
          'Accuracy: 30%',
          'RL/HI calculations: 25%',
          'Instrument handling: 15%',
          'Field book: 15%',
          'Time: 10%',
          'Coordination: 5%',
        ],
      },
    ],
  },
];

export const registrationFeePerTeam = 1500;
export const registrationDeadline = '21 November 2026';
export const registrationDeadlineFormatted = '21-11-2026';

export const collegeSpoc = {
  role: 'College SPOC',
  name: 'Mr. Ravikumar',
  phone: '+91 97419 70005',
};

export const facultyCoordinators = [
  { role: 'Faculty Coordinator', name: 'Mrs. Sana Ara', phone: '+91 91488 45386' },
  { role: 'Faculty Coordinator', name: 'Ms. Sonia Fathima', phone: '+91 82770 71071' },
];

export const studentCoordinators = [
  { role: 'Student Coordinator', name: 'Chirag K P', phone: '+91 6362391028' },
  { role: 'Student Coordinator', name: 'Sumukh Bhargav', phone: '+91 8618376684' },
];

export const eventLogistics = {
  registrationDeadline: '21 November 2026',
  registrationDeadlineFormatted: '21-11-2026',
  registrationFeeINR: 1500,
  paymentMethods: 'Payment Gateway / UPI (QR code & UPI ID)',
  collegeSpoc,
  facultyCoordinators,
  studentCoordinators,
};
