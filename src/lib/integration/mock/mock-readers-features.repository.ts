import type { ReaderFeaturesRepositoryPort } from "@/core/services/repository.interface";
import type {
  ReaderFeaturesRecord,
  ReaderStatsRecord,
} from "@/core/services/repository.interface";
import {
  mockReaders,
  mockReaderStats,
} from "@/lib/integration/mock/mock-data";

export class MockReadersFeaturesRepository
  implements ReaderFeaturesRepositoryPort
{
  private readonly store: Map<string, ReaderFeaturesRecord>;

  constructor() {
    this.store = new Map(
      mockReaders.map((r) => [r.readerToken, { ...r }]),
    );
  }

  async upsertMany(): Promise<number> {
    return mockReaders.length;
  }

  async findByReaderToken(
    _workspaceId: string,
    readerToken: string,
  ): Promise<ReaderFeaturesRecord | null> {
    return this.store.get(readerToken) ?? null;
  }

  async logPageView(
    _workspaceId: string,
    readerToken: string,
    engagementTimeMsec: number,
  ): Promise<ReaderFeaturesRecord> {
    const existing = this.store.get(readerToken);

    if (!existing) {
      const created: ReaderFeaturesRecord = {
        readerToken,
        frequency: 1,
        recency: 0,
        engagement: engagementTimeMsec,
        velocity: 1,
        hasSubscribed: 0,
        subscribedAt: null,
      };
      this.store.set(readerToken, created);
      return { ...created };
    }

    const newFrequency = existing.frequency + 1;
    const newEngagement =
      (existing.engagement * existing.frequency + engagementTimeMsec) / newFrequency;

    const updated: ReaderFeaturesRecord = {
      ...existing,
      frequency: newFrequency,
      recency: 0,
      engagement: newEngagement,
      velocity: Math.min(existing.velocity + 1, 50),
    };
    this.store.set(readerToken, updated);
    return { ...updated };
  }

  async setSubscriptionState(): Promise<void> {}

  async getReaderStats(): Promise<ReaderStatsRecord> {
    return mockReaderStats;
  }
}

export const mockReadersFeaturesRepository = new MockReadersFeaturesRepository();
