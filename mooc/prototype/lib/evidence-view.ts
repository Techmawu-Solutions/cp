import { credentialById, projectById } from "@/lib/data/graph";
import type { OpenState } from "@/lib/store";
import type { IssuedCredential } from "@/lib/types";

/**
 * Credential verification data (spec section 16). In production /verify is public and
 * server-side (the signed Verifiable Credential is the source of truth). The
 * prototype checks this browser's data, plus one built-in sample so the page
 * can be tried from any browser.
 */
export const SAMPLE_CODE = "SAMP-LE26-OPEN";

export interface VerifiedCredential {
  cred: IssuedCredential;
  holder: string;
  sample: boolean;
}

export function lookupCredential(code: string, s: OpenState): VerifiedCredential | null {
  const upper = code.toUpperCase();
  if (upper === SAMPLE_CODE)
    return {
      sample: true,
      holder: "Kwesi Mensah",
      cred: { code: SAMPLE_CODE, defId: "cred-data-analysis", issuedAt: "2026-09-18T10:00:00.000Z", status: "active", evidence: ["Spreadsheet functions — Applied", "Grouping and totals (SQL) — Applied", "Mean, median and mode — Verified", "Telling a story with data — Applied", "Project “What does a trotro ride really cost?” — 86%, peer + instructor reviewed"] },
    };
  const cred = s.credentials.find((c) => c.code === upper);
  return cred && s.profile ? { cred, holder: s.profile.name, sample: false } : null;
}

/** An Open Badges 3.0-shaped Verifiable Credential (illustrative; production signs it with the issuer's Ed25519 key). */
export function asVerifiableCredential(v: VerifiedCredential) {
  const def = credentialById.get(v.cred.defId)!;
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2", "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"],
    id: `https://open.classproject.com/verify/${v.cred.code}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: { id: "did:web:open.classproject.com", type: ["Profile"], name: def.issuer },
    validFrom: v.cred.issuedAt,
    credentialSubject: {
      type: ["AchievementSubject"],
      name: v.holder,
      achievement: {
        id: `https://open.classproject.com/credentials/${def.id}`,
        type: ["Achievement"],
        achievementType: def.kind === "competency" ? "Competency" : def.kind === "badge" ? "Badge" : "Certificate",
        name: def.name,
        description: def.description,
        criteria: { narrative: def.criteria.map((c) => (c.kind === "project" ? `Pass project: ${projectById.get(c.projectId)?.title}` : c.kind === "mastery_check" ? `Pass mastery check (${c.minPct}%+)` : `${c.skill} at ${c.min}`)).join("; ") },
      },
    },
    evidence: v.cred.evidence.map((e) => ({ type: ["Evidence"], narrative: e })),
    proof: { type: "DataIntegrityProof", cryptosuite: "eddsa-rdfc-2022", proofValue: "z…(signed in production)" },
  };
}
