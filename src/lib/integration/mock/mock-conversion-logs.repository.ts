import type { ConversionLogRepositoryPort } from "@/core/services/repository.interface";
import type {
  ConversionLogRecord,
  VariantAggregationRecord,
} from "@/core/services/repository.interface";
import {
  mockConversionLogs,
  mockVariantAggregations,
} from "@/lib/integration/mock/mock-data";

export class MockConversionLogsRepository
  implements ConversionLogRepositoryPort
{
  async findByWorkspace(): Promise<ConversionLogRecord[]> {
    return mockConversionLogs;
  }

  async countByWorkspace(): Promise<number> {
    return mockConversionLogs.length;
  }

  async aggregateByVariant(): Promise<VariantAggregationRecord[]> {
    return mockVariantAggregations;
  }

  async logConversion(): Promise<void> {}
}

export const mockConversionLogsRepository = new MockConversionLogsRepository();
