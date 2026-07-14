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
  async upsertMany(): Promise<number> {
    return mockReaders.length;
  }

  async findByReaderToken(
    _workspaceId: string,
    readerToken: string,
  ): Promise<ReaderFeaturesRecord | null> {
    const reader = mockReaders.find((r) => r.readerToken === readerToken);
    return reader ?? null;
  }

  async setSubscriptionState(): Promise<void> {}

  async getReaderStats(): Promise<ReaderStatsRecord> {
    return mockReaderStats;
  }
}

export const mockReadersFeaturesRepository = new MockReadersFeaturesRepository();
