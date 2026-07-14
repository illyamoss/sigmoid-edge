import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schemas/publisher.schema";
import type { WorkspaceOverrideRules } from "@/core/domain/database.types";
import type { WorkspaceOverridePort } from "@/core/services/repository.interface";

export class WorkspaceOverrideRepository implements WorkspaceOverridePort {
  async saveOverrideRules(
    workspaceId: string,
    rules: WorkspaceOverrideRules,
  ): Promise<void> {
    await db
      .update(workspaces)
      .set({
        overrideRules: rules,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));
  }
}

export const workspaceOverrideRepository = new WorkspaceOverrideRepository();
