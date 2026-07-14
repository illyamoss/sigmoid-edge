import type { WorkspaceRepositoryPort } from "@/core/services/repository.interface";
import type { WorkspaceRecord } from "@/core/services/repository.interface";
import {
  mockWorkspace,
  DEMO_WORKSPACE_ID,
} from "@/lib/integration/mock/mock-data";

export class MockWorkspaceRepository implements WorkspaceRepositoryPort {
  async findBySlug(slug: string): Promise<WorkspaceRecord | null> {
    if (slug === mockWorkspace.slug) return mockWorkspace;
    return null;
  }

  async findById(id: string): Promise<WorkspaceRecord | null> {
    if (id === DEMO_WORKSPACE_ID) return mockWorkspace;
    if (id === mockWorkspace.id) return mockWorkspace;
    return null;
  }
}

export const mockWorkspaceRepository = new MockWorkspaceRepository();
