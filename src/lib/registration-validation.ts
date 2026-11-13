import { registrationDomains, type RegistrationDomain } from "../config/registration-domains.ts";

export const MAX_PAYMENT_PROOF_BYTES = 3 * 1024 * 1024;
export const ALLOWED_PAYMENT_PROOF_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type RegistrationMemberInput = {
  fullName: string;
  email: string;
  phone: string;
};

export type RegistrationInput = {
  domainSlug: string;
  challengeId: string;
  teamName: string;
  teamSize: number;
  acceptedRules: boolean;
  leader: RegistrationMemberInput;
  members: RegistrationMemberInput[];
  utrReference: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9().\s-]{7,20}$/;
const utrPattern = /^[a-z0-9]{6,40}$/i;

export function validateRegistrationInput(value: unknown): { input?: RegistrationInput; domain?: RegistrationDomain; error?: string } {
  if (!value || typeof value !== "object") return { error: "Registration details are missing." };
  const input = value as Partial<RegistrationInput>;
  if (typeof input.domainSlug !== "string") return { error: "Select a domain." };
  const domain = registrationDomains.find((item) => item.slug === input.domainSlug);
  if (!domain) return { error: "Select a valid domain." };
  if (typeof input.challengeId !== "string") return { error: "Select a challenge." };
  const challenge = domain.challenges.find((item) => item.id === input.challengeId);
  if (!challenge) return { error: "Select a valid challenge." };
  if (typeof input.teamName !== "string" || input.teamName.trim().length < 2 || input.teamName.trim().length > 80) return { error: "Team name must be between 2 and 80 characters." };
  if (!Number.isInteger(input.teamSize) || input.teamSize! < challenge.minimumTeamSize || input.teamSize! > challenge.maximumTeamSize) {
    return { error: `Team size for ${challenge.name} must be ${challenge.minimumTeamSize === challenge.maximumTeamSize ? challenge.minimumTeamSize : `${challenge.minimumTeamSize} to ${challenge.maximumTeamSize}`} members.` };
  }
  if (input.acceptedRules !== true) return { error: "Confirm that you have read the selected domain rules." };
  if (!input.leader || !Array.isArray(input.members)) return { error: "Enter the team leader and member details." };
  const expectedMembers = input.teamSize! - 1;
  if (input.members.length !== expectedMembers) return { error: `Enter details for exactly ${expectedMembers} other team member${expectedMembers === 1 ? "" : "s"}.` };

  const people = [input.leader, ...input.members];
  for (const [index, person] of people.entries()) {
    const label = index === 0 ? "Team leader" : `Team member ${index}`;
    if (!person || typeof person.fullName !== "string" || person.fullName.trim().length < 2 || person.fullName.trim().length > 120) return { error: `${label}: enter a name between 2 and 120 characters.` };
    if (typeof person.email !== "string" || !emailPattern.test(person.email.trim())) return { error: `${label}: enter a valid email address.` };
    if (typeof person.phone !== "string" || !phonePattern.test(person.phone.trim())) return { error: `${label}: enter a valid phone number.` };
  }
  const emails = people.map((person) => person.email.trim().toLowerCase());
  if (new Set(emails).size !== emails.length) return { error: "Each team member must use a different email address." };
  if (typeof input.utrReference !== "string" || !utrPattern.test(input.utrReference.trim())) return { error: "Enter a valid UTR / transaction reference (6–40 letters or numbers)." };
  return { input: input as RegistrationInput, domain };
}

export async function validatePaymentProof(file: Pick<File, "size" | "type" | "arrayBuffer">): Promise<string | null> {
  if (!ALLOWED_PAYMENT_PROOF_TYPES.includes(file.type as (typeof ALLOWED_PAYMENT_PROOF_TYPES)[number])) return "Payment proof must be a PNG, JPEG or WebP image.";
  if (file.size <= 0 || file.size > MAX_PAYMENT_PROOF_BYTES) return "Payment proof must be no larger than 5 MB.";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!png && !jpeg && !webp) return "The uploaded file is not a valid PNG, JPEG or WebP image.";
  return null;
}
