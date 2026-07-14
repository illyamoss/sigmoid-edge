import type { WorkspaceOverridePort } from "@/core/services/repository.interface";
import type { WorkspaceOverrideRules } from "@/core/domain/database.types";

export class MockWorkspaceOverrideRepository implements WorkspaceOverridePort {
  async saveOverrideRules(
    _workspaceId: string,
    _rules: WorkspaceOverrideRules,
  ): Promise<void> {}
}

export const mockWorkspaceOverrideRepository =
  new MockWorkspaceOverrideRepository();
