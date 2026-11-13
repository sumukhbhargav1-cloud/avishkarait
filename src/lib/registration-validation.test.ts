import test from "node:test";
import assert from "node:assert/strict";
import { registrationDomains } from "../config/registration-domains.ts";
import { AT_EVENT_CHALLENGE_ID, MAX_PAYMENT_PROOF_BYTES, validatePaymentProof, validateRegistrationInput } from "./registration-validation.ts";

const valid = {
  domainSlug: "full-stack",
  challengeId: "full-stack",
  teamName: "Byte Builders",
  teamSize: 2,
  acceptedRules: true,
  leader: { fullName: "Asha Dev", email: "asha@example.edu", phone: "+91 98765 43210" },
  members: [{ fullName: "Nikhil Rao", email: "nikhil@example.edu", phone: "+91 98765 43211" }],
  utrReference: "TXN12345678",
};

test("every pre-coded domain has capacity, contact, and challenge rules", () => {
  assert.equal(registrationDomains.length, 5);
  const expectedStudentPhones = ["6364328712", "9113688812", "9380662076", "9964127576", "9110463448"];
  assert.deepEqual(registrationDomains.map((domain) => domain.studentCoordinator.phone), expectedStudentPhones);
  for (const domain of registrationDomains) {
    assert.ok(domain.capacity > 0);
    assert.ok(domain.studentCoordinator.name.length > 0);
    assert.ok(domain.studentCoordinator.phone.length > 0);
    assert.ok(domain.challenges.length > 0);
  }
  assert.equal(registrationDomains.find((domain) => domain.slug === "ai-cybersecurity-fintech")?.facultyCoordinator, undefined);
  assert.equal(registrationDomains.find((domain) => domain.slug === "full-stack")?.facultyCoordinator?.name, "Ms Sana Ara");
  assert.equal(registrationDomains.find((domain) => domain.slug === "iot-embedded")?.facultyCoordinator?.name, "Dr. Raghukumar B S");
  assert.equal(registrationDomains.find((domain) => domain.slug === "mechspark")?.facultyCoordinator?.name, "Mr. Praveen");
  assert.equal(registrationDomains.find((domain) => domain.slug === "theodo")?.facultyCoordinator?.name, "Mr. Naveen");
});

test("accepts a valid team without duplicating the leader", () => {
  assert.equal(validateRegistrationInput(valid).error, undefined);
});

test("rejects team sizes outside the selected challenge range", () => {
  const result = validateRegistrationInput({ ...valid, teamSize: 5, members: Array.from({ length: 4 }, (_, index) => ({ fullName: `Member ${index + 1}`, email: `m${index}@example.edu`, phone: "+919876543210" })) });
  assert.match(result.error ?? "", /Team size/);
});

test("rejects challenge selection during THEODO registration", () => {
  const result = validateRegistrationInput({ ...valid, domainSlug: "theodo", challengeId: "cadathon", teamSize: 3, members: [valid.members[0], { fullName: "Extra Member", email: "extra@example.edu", phone: "+919876543211" }] });
  assert.match(result.error ?? "", /valid challenge/);
});

test("accepts THEODO registration without choosing an event challenge", () => {
  const result = validateRegistrationInput({ ...valid, domainSlug: "theodo", challengeId: AT_EVENT_CHALLENGE_ID, teamSize: 3, members: [valid.members[0], { fullName: "Extra Member", email: "extra@example.edu", phone: "+919876543211" }] });
  assert.equal(result.error, undefined);
});

test("accepts MECHSPARK registration without choosing an event challenge", () => {
  const result = validateRegistrationInput({ ...valid, domainSlug: "mechspark", challengeId: AT_EVENT_CHALLENGE_ID, teamSize: 3, members: [valid.members[0], { fullName: "Extra Member", email: "extra@example.edu", phone: "+919876543211" }] });
  assert.equal(result.error, undefined);
});

test("rejects duplicate leader/member email and malformed UTR", () => {
  const duplicate = validateRegistrationInput({ ...valid, members: [{ ...valid.members[0], email: "ASHA@example.edu" }] });
  assert.match(duplicate.error ?? "", /different email/);
  assert.match(validateRegistrationInput({ ...valid, utrReference: "bad" }).error ?? "", /UTR/);
});

test("requires explicit rules acceptance", () => {
  assert.match(validateRegistrationInput({ ...valid, acceptedRules: false }).error ?? "", /read the selected domain rules/);
});

test("checks image type, size, and actual PNG signature", async () => {
  const validPng = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], "proof.png", { type: "image/png" });
  assert.equal(await validatePaymentProof(validPng), null);
  const spoofed = new File(["not an image"], "proof.png", { type: "image/png" });
  assert.match((await validatePaymentProof(spoofed)) ?? "", /not a valid/);
  const tooLarge = { size: MAX_PAYMENT_PROOF_BYTES + 1, type: "image/png", arrayBuffer: async () => validPng.arrayBuffer() } as File;
  assert.match((await validatePaymentProof(tooLarge)) ?? "", /2 MiB/);
});
