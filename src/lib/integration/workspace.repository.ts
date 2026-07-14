import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schemas/publisher.schema";
import type { WorkspaceRepositoryPort } from "@/core/services/repository.interface";
import type { WorkspaceRecord } from "@/core/services/repository.interface";

export class WorkspaceRepository implements WorkspaceRepositoryPort {
  async findBySlug(slug: string): Promise<WorkspaceRecord | null> {
    const rows = await db
      .select({
        id: workspaces.id,
        slug: workspaces.slug,
        overrideRules: workspaces.overrideRules,
      })
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      overrideRules: row.overrideRules ?? null,
    };
  }

  async findById(id: string): Promise<WorkspaceRecord | null> {
    const rows = await db
      .select({
        id: workspaces.id,
        slug: workspaces.slug,
        overrideRules: workspaces.overrideRules,
      })
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      overrideRules: row.overrideRules ?? null,
    };
  }
}

export const workspaceRepository = new WorkspaceRepository();
