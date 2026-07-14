import { count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { conversionLogs } from "@/lib/db/schemas/publisher.schema";
import type { PaywallVariant } from "@/core/domain/database.types";
import type {
  ConversionLogRepositoryPort,
  ConversionLogRecord,
  VariantAggregationRecord,
} from "@/core/services/repository.interface";

export class ConversionLogsRepository
  implements ConversionLogRepositoryPort
{
  async findByWorkspace(workspaceId: string): Promise<ConversionLogRecord[]> {
    const rows = await db
      .select({
        id: conversionLogs.id,
        readerToken: conversionLogs.readerToken,
        variant: conversionLogs.variant,
        probabilityScore: conversionLogs.probabilityScore,
        eventTimestamp: conversionLogs.eventTimestamp,
      })
      .from(conversionLogs)
      .where(eq(conversionLogs.workspaceId, workspaceId));

    return rows.map((row) => ({
      id: row.id,
      readerToken: row.readerToken,
      variant: row.variant as PaywallVariant,
      probabilityScore: Number(row.probabilityScore),
      eventTimestamp: row.eventTimestamp,
    }));
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const result = await db
      .select({ value: count() })
      .from(conversionLogs)
      .where(eq(conversionLogs.workspaceId, workspaceId));

    const row = result[0];
    return row?.value ?? 0;
  }

  async aggregateByVariant(
    workspaceId: string,
  ): Promise<VariantAggregationRecord[]> {
    const rows = await db
      .select({
        variant: conversionLogs.variant,
        readerCount: count(),
        avgScore: sql<number>`AVG(${conversionLogs.probabilityScore}::numeric)`,
      })
      .from(conversionLogs)
      .where(eq(conversionLogs.workspaceId, workspaceId))
      .groupBy(conversionLogs.variant);

    return rows.map((row) => ({
      variant: row.variant as PaywallVariant,
      readerCount: row.readerCount,
      avgScore: Number(row.avgScore ?? 0),
    }));
  }

  async logConversion(
    workspaceId: string,
    readerToken: string,
    variant: PaywallVariant,
    probabilityScore: number,
  ): Promise<void> {
    await db.insert(conversionLogs).values({
      workspaceId,
      readerToken,
      variant,
      probabilityScore: probabilityScore.toString(),
    });
  }
}

export const conversionLogsRepository = new ConversionLogsRepository();
