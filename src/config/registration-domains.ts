export type ChallengeConfig = {
  id: string;
  name: string;
  description: string;
  rules: string[];
  minimumTeamSize: number;
  maximumTeamSize: number;
};

export type RegistrationDomain = {
  slug: string;
  code: string;
  name: string;
  description: string;
  rules: string[];
  minimumTeamSize: number;
  maximumTeamSize: number;
  challengeSelection?: "registration" | "at_event";
  capacity: number;
  studentCoordinator: { name: string; phone: string };
  facultyCoordinator?: { name: string; phone: string };
  challenges: ChallengeConfig[];
};

// Domain requirements are copied from the reference project's verified
// AVISHKAR 2K26 domain content. Capacity 20/domain was supplied by the organiser.
export const registrationDomains: RegistrationDomain[] = [
  {
    slug: "ai-cybersecurity-fintech",
    code: "CYB",
    name: "AI in Cybersecurity & FinTech",
    description: "Artificial intelligence applications in cybersecurity, financial technology, intelligent security systems and innovative financial solutions.",
    rules: [
      "Team size: 2 to 4 members.",
      "Duration: 24 hours.",
      "No pre-built complete project.",
      "Disclose external libraries, APIs and AI tools.",
      "Submit source code, README or documentation, and a working demonstration.",
      "Plagiarism and copied submissions are prohibited.",
    ],
    minimumTeamSize: 2,
    maximumTeamSize: 4,
    capacity: 20,
    studentCoordinator: { name: "Yogin", phone: "6364328712" },
    challenges: [{
      id: "ai-cybersecurity-fintech",
      name: "AI in Cybersecurity & FinTech",
      description: "Develop the assigned problem statement during the 24-hour hackathon.",
      rules: [
        "Problem relevance and innovation: 25%",
        "Technical implementation and architecture: 30%",
        "Working demonstration: 25%",
        "Documentation and presentation: 20%",
      ],
      minimumTeamSize: 2,
      maximumTeamSize: 4,
    }],
  },
  {
    slug: "full-stack",
    code: "FSD",
    name: "Full Stack Development",
    description: "Develop functional, innovative and user-oriented digital applications using frontend and backend technologies.",
    rules: [
      "Team size: 2 to 4 members.",
      "Duration: 24 hours.",
      "No pre-built complete projects.",
      "Disclose APIs, libraries and AI tools.",
      "Submit source code, a working demo and documentation.",
      "Plagiarism is prohibited.",
    ],
    minimumTeamSize: 2,
    maximumTeamSize: 4,
    capacity: 20,
    studentCoordinator: { name: "Likeeth G Urs", phone: "9113688812" },
    facultyCoordinator: { name: "Ms Sana Ara", phone: "9148845386" },
    challenges: [{
      id: "full-stack",
      name: "Full Stack Development",
      description: "Develop the assigned problem statement during the 24-hour hackathon.",
      rules: [
        "Functionality and feature completeness: 30%",
        "Frontend UI/UX and responsiveness: 25%",
        "Backend architecture and API integration: 25%",
        "Code quality and live demonstration: 20%",
      ],
      minimumTeamSize: 2,
      maximumTeamSize: 4,
    }],
  },
  {
    slug: "iot-embedded",
    code: "IOT",
    name: "IoT & Embedded Systems",
    description: "Build a complete connected or embedded project during the hackathon.",
    rules: [
      "Team size: 2 to 4 members.",
      "Participants must bring all required components, sensors, microcontrollers and hardware tools. The college will not provide components.",
      "Build the complete hardware and software prototype during the hackathon.",
      "Pre-built complete projects or ready-made circuits are not permitted.",
    ],
    minimumTeamSize: 2,
    maximumTeamSize: 4,
    capacity: 20,
    studentCoordinator: { name: "Divya P", phone: "9380662076" },
    facultyCoordinator: { name: "Dr. Raghukumar B S", phone: "+91 91642 80757" },
    challenges: [{
      id: "iot-embedded",
      name: "IoT & Embedded Systems",
      description: "Build and demonstrate a complete IoT or embedded hardware and software prototype.",
      rules: ["Demonstrate the complete working prototype."],
      minimumTeamSize: 2,
      maximumTeamSize: 4,
    }],
  },
  {
    slug: "mechspark",
    code: "MEC",
    name: "MECHSPARK 2K26",
    description: "MECHSPARK 2K26 – Mechanical Engineering. IDEAS THAT MOVE THE WORLD.",
    rules: [
      "Maximum team size: 4. No official minimum team size is specified.",
      "Duration: 8 hours.",
      "Use required Personal Protective Equipment and follow workshop safety instructions.",
      "Unsafe behaviour or equipment misuse may result in disqualification.",
    ],
    minimumTeamSize: 1,
    maximumTeamSize: 4,
    challengeSelection: "at_event",
    capacity: 20,
    studentCoordinator: { name: "Kishan", phone: "9964127576" },
    facultyCoordinator: { name: "Mr. Praveen", phone: "8762006969" },
    challenges: [
      {
        id: "lathe-machine-operating",
        name: "Lathe Machine Operating",
        description: "Complete an assigned practical machining and lathe operation task under faculty supervision.",
        rules: [
          "Complete the assigned task within the 8-hour duration.",
          "Organisers provide the required machines, materials and equipment.",
          "Only authorised participants may operate machines under faculty supervision.",
          "Use required Personal Protective Equipment (PPE) and follow all workshop safety instructions.",
          "Unsafe behaviour or equipment misuse may result in disqualification.",
          "Evaluation: dimensional accuracy, surface finish, machine handling, time management and safety.",
        ],
        minimumTeamSize: 1,
        maximumTeamSize: 4,
      },
      {
        id: "solid-edge-cad-design",
        name: "Solid Edge CAD Design",
        description: "Create the assigned 3D model announced at the venue using Solid Edge.",
        rules: [
          "Complete the assigned task within the 8-hour duration.",
          "Organisers provide the required machines, materials and equipment.",
          "Previously prepared models are not permitted.",
          "Submit the final design files at the end of the session.",
        ],
        minimumTeamSize: 1,
        maximumTeamSize: 4,
      },
      {
        id: "cardboard-mechanical-model",
        name: "Cardboard Mechanical Model Making",
        description: "Build a working mechanical model using organiser-provided cardboard and permitted materials.",
        rules: [
          "Complete the assigned task within the 8-hour duration.",
          "Organisers provide the required materials, including cardboard and permitted construction materials.",
          "Pre-built models are not permitted.",
          "Demonstrate the working mechanism and explain its engineering principle.",
        ],
        minimumTeamSize: 1,
        maximumTeamSize: 4,
      },
    ],
  },
  {
    slug: "theodo",
    code: "CIV",
    name: "THEODO – Civil Engineering & Structural Innovation",
    description: "Apply civil engineering skills to structural design, AutoCAD drafting and field surveying challenges.",
    rules: ["Choose a challenge at the event after arrival; team size is 2 to 4 members."],
    minimumTeamSize: 2,
    maximumTeamSize: 4,
    challengeSelection: "at_event",
    capacity: 20,
    studentCoordinator: { name: "Rahul", phone: "9110463448" },
    facultyCoordinator: { name: "Mr. Naveen", phone: "+91 95917 93656" },
    challenges: [
      {
        id: "bridge-x",
        name: "BRIDGE-X",
        description: "Build a bridge using organiser-provided materials. Completed bridges undergo gradual load testing to assess structural performance.",
        rules: [
          "Team size: exactly 4 members.",
          "Bridge materials are provided by organisers; no external materials are permitted.",
          "Build the bridge within the allotted time.",
          "Evaluation: load capacity 30%, structural stability 25%, material efficiency 15%, innovation/design 15%, construction quality 15%.",
        ],
        minimumTeamSize: 4,
        maximumTeamSize: 4,
      },
      {
        id: "cadathon",
        name: "CADATHON",
        description: "Round 1: an offline quiz of approximately 20–30 MCQs in 20–30 minutes. The top 10 teams advance to Round 2: a 90-minute offline AutoCAD residential building design challenge.",
        rules: [
          "Team size: exactly 2 members.",
          "The challenge is entirely offline. Internet access is not allowed.",
          "Basic AutoCAD templates without pre-drawn geometry are permitted.",
          "No pre-made drawings or pre-drafted geometry are allowed.",
          "Submit a floor plan, elevation, cross-section and schedule of openings.",
        ],
        minimumTeamSize: 2,
        maximumTeamSize: 2,
      },
      {
        id: "surveyor-x",
        name: "SURVEYOR-X",
        description: "Round 1: an offline quiz of approximately 20–30 MCQs in 20–30 minutes. Round 2: practical field levelling – record staff readings and calculate reduced levels and elevation differences.",
        rules: [
          "Team size: exactly 4 members.",
          "Participants must bring a scientific calculator.",
          "Organisers provide a Dumpy/Auto Level, levelling staff, tripod and field sheet.",
          "Record staff readings accurately and calculate reduced levels and elevation differences.",
        ],
        minimumTeamSize: 4,
        maximumTeamSize: 4,
      },
    ],
  },
];

export const paymentConfig = {
  upiId: "8618376684@ibl",
  amountInr: 1500,
  qrImagePath: null as string | null,
  instructions: "Pay ₹1,500 per team to the UPI ID below. Upload the payment confirmation screenshot and enter the UTR / transaction reference. The payment will be verified by the organisers.",
};
