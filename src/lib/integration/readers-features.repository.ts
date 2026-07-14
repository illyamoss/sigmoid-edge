import { and, count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { readersFeatures } from "@/lib/db/schemas/publisher.schema";
import type { ReaderFeaturesRepositoryPort } from "@/core/services/repository.interface";
import type {
  ReaderFeaturesRecord,
  ReaderStatsRecord,
} from "@/core/services/repository.interface";

export class ReadersFeaturesRepository
  implements ReaderFeaturesRepositoryPort
{
  async upsertMany(
    workspaceId: string,
    records: ReaderFeaturesRecord[],
  ): Promise<number> {
    if (records.length === 0) return 0;

    const values = records.map((record) => ({
      workspaceId,
      readerToken: record.readerToken,
      frequency: record.frequency.toString(),
      recency: record.recency.toString(),
      engagement: record.engagement.toString(),
      velocity: record.velocity.toString(),
      hasSubscribed: record.hasSubscribed,
      subscribedAt: record.subscribedAt,
    }));

    const result = await db
      .insert(readersFeatures)
      .values(values)
      .onConflictDoUpdate({
        target: [readersFeatures.workspaceId, readersFeatures.readerToken],
        set: {
          frequency: sql`EXCLUDED.frequency`,
          recency: sql`EXCLUDED.recency`,
          engagement: sql`EXCLUDED.engagement`,
          velocity: sql`EXCLUDED.velocity`,
          hasSubscribed: sql`EXCLUDED.has_subscribed`,
          subscribedAt: sql`EXCLUDED.subscribed_at`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning({ id: readersFeatures.id });

    return result.length;
  }

  async findByReaderToken(
    workspaceId: string,
    readerToken: string,
  ): Promise<ReaderFeaturesRecord | null> {
    const rows = await db
      .select({
        readerToken: readersFeatures.readerToken,
        frequency: readersFeatures.frequency,
        recency: readersFeatures.recency,
        engagement: readersFeatures.engagement,
        velocity: readersFeatures.velocity,
        hasSubscribed: readersFeatures.hasSubscribed,
        subscribedAt: readersFeatures.subscribedAt,
      })
      .from(readersFeatures)
      .where(
        and(
          eq(readersFeatures.workspaceId, workspaceId),
          eq(readersFeatures.readerToken, readerToken),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      readerToken: row.readerToken,
      frequency: Number(row.frequency),
      recency: Number(row.recency),
      engagement: Number(row.engagement),
      velocity: Number(row.velocity),
      hasSubscribed: (row.hasSubscribed as 0 | 1) ?? 0,
      subscribedAt: row.subscribedAt ?? null,
    };
  }

  async logPageView(
    workspaceId: string,
    readerToken: string,
    engagementTimeMsec: number,
  ): Promise<ReaderFeaturesRecord> {
    const engagementParam = engagementTimeMsec.toString();

    const rows = await db
      .insert(readersFeatures)
      .values({
        workspaceId,
        readerToken,
        frequency: "1",
        recency: "0",
        engagement: engagementParam,
        velocity: "1",
        hasSubscribed: 0,
      })
      .onConflictDoUpdate({
        target: [readersFeatures.workspaceId, readersFeatures.readerToken],
        set: {
          frequency: sql`${readersFeatures.frequency} + 1`,
          recency: sql`0`,
          engagement: sql`(${readersFeatures.engagement} * ${readersFeatures.frequency} + ${engagementParam}) / (${readersFeatures.frequency} + 1)`,
          velocity: sql`LEAST(${readersFeatures.velocity} + 1, 50)`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning({
        readerToken: readersFeatures.readerToken,
        frequency: readersFeatures.frequency,
        recency: readersFeatures.recency,
        engagement: readersFeatures.engagement,
        velocity: readersFeatures.velocity,
        hasSubscribed: readersFeatures.hasSubscribed,
        subscribedAt: readersFeatures.subscribedAt,
      });

    const row = rows[0];

    if (!row) {
      throw new Error(`logPageView: no row returned for readerToken=${readerToken}`);
    }

    return {
      readerToken: row.readerToken,
      frequency: Number(row.frequency),
      recency: Number(row.recency),
      engagement: Number(row.engagement),
      velocity: Number(row.velocity),
      hasSubscribed: (row.hasSubscribed as 0 | 1) ?? 0,
      subscribedAt: row.subscribedAt ?? null,
    };
  }

  async setSubscriptionState(
    workspaceId: string,
    readerToken: string,
    hasSubscribed: 0 | 1,
  ): Promise<void> {
    await db
      .update(readersFeatures)
      .set({
        hasSubscribed,
        subscribedAt: hasSubscribed === 1 ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(readersFeatures.workspaceId, workspaceId),
          eq(readersFeatures.readerToken, readerToken),
        ),
      );
  }

  async getReaderStats(workspaceId: string): Promise<ReaderStatsRecord> {
    const rows = await db
      .select({
        totalReaders: count(),
        convertedReaders: sql<number>`SUM(${readersFeatures.hasSubscribed})`,
      })
      .from(readersFeatures)
      .where(eq(readersFeatures.workspaceId, workspaceId));

    const row = rows[0];
    return {
      totalReaders: row?.totalReaders ?? 0,
      convertedReaders: Number(row?.convertedReaders ?? 0),
    };
  }
}

export const readersFeaturesRepository = new ReadersFeaturesRepository();

