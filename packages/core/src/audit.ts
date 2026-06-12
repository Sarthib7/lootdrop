import type { PrismaClient } from "@lootdrop/db";

const REDEMPTION_KEYS = ["code", "link", "pin", "instructions", "redemption"];

/** Strip redemption-shaped fields so they can never reach an audit row (P0-09). */
export function redactMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (REDEMPTION_KEYS.includes(k.toLowerCase())) continue;
    clean[k] = v;
  }
  return clean;
}

export interface AuditEvent {
  communityId: string;
  actorType: "human" | "agent" | "system";
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function appendAudit(
  db: PrismaClient,
  event: AuditEvent,
): Promise<void> {
  const metadata = redactMetadata(event.metadata);
  await db.auditLog.create({
    data: {
      communityId: event.communityId,
      actorType: event.actorType,
      actorId: event.actorId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
