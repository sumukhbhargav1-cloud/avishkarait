import { NextResponse } from "next/server";
import { paymentConfig, registrationDomains } from "@/config/registration-domains";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("registration_domain_counts");
    if (error) throw error;
    const countRows = (data ?? []) as { domain_slug: string; registered_teams: number | string }[];
    const counts = new Map<string, number>(countRows.map((row) => [row.domain_slug, Number(row.registered_teams)]));
    const domains = registrationDomains.map((domain) => {
      const registeredTeams = counts.get(domain.slug) ?? 0;
      return {
        ...domain,
        registeredTeams,
        remainingSlots: Math.max(0, domain.capacity - registeredTeams),
        full: registeredTeams >= domain.capacity,
      };
    });
    return NextResponse.json({ domains, payment: paymentConfig }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Registration configuration could not load:", error);
    return NextResponse.json({ error: "Registration is temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
