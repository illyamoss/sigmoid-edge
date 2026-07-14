import type {
  ConversionLogRepositoryPort,
  ReaderFeaturesRepositoryPort,
  WorkspaceOverridePort,
  WorkspaceRepositoryPort,
} from "@/core/services/repository.interface";

import { workspaceRepository } from "@/lib/integration/workspace.repository";
import { readersFeaturesRepository } from "@/lib/integration/readers-features.repository";
import { conversionLogsRepository } from "@/lib/integration/conversion-logs.repository";
import { workspaceOverrideRepository } from "@/lib/integration/workspace-override.repository";

import { mockWorkspaceRepository } from "@/lib/integration/mock/mock-workspace.repository";
import { mockReadersFeaturesRepository } from "@/lib/integration/mock/mock-readers-features.repository";
import { mockConversionLogsRepository } from "@/lib/integration/mock/mock-conversion-logs.repository";
import { mockWorkspaceOverrideRepository } from "@/lib/integration/mock/mock-workspace-override.repository";

export type RepositoryBundle = {
  workspace: WorkspaceRepositoryPort;
  readers: ReaderFeaturesRepositoryPort;
  conversionLogs: ConversionLogRepositoryPort;
  workspaceOverride: WorkspaceOverridePort;
};

function isTestingMode(): boolean {
  return process.env.MODE === "TESTING";
}

export function createRepositories(): RepositoryBundle {
  if (isTestingMode()) {
    return {
      workspace: mockWorkspaceRepository,
      readers: mockReadersFeaturesRepository,
      conversionLogs: mockConversionLogsRepository,
      workspaceOverride: mockWorkspaceOverrideRepository,
    };
  }

  return {
    workspace: workspaceRepository,
    readers: readersFeaturesRepository,
    conversionLogs: conversionLogsRepository,
    workspaceOverride: workspaceOverrideRepository,
  };
}
