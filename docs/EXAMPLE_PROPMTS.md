------------------------------
## AGENT UTILITY PROMPT LIBRARY
Use these precise, copy-pasteable execution commands to drive the Spec-Driven Development loop for various common software engineering tasks.

------------------------------
## 1. SEQUENTIAL FEATURE IMPLEMENTATION (The Standard Loop)
Use this command when moving forward in your roadmap sequence to build a brand-new module.

Read our master vision in `docs/project_context.md`, our base architecture in `docs/ARCHITECTURE.md`, and our engineering standards in `AGENTS.md`. Following those exact clean-code guidelines, completely implement every single step and file mapped out in `docs/specs/[XX_FEATURE_NAME].md`. Do not leave placeholders, summaries, or shorthand omissions. Run a full build check (`npm run build` or `npx tsc --noEmit`) when finished to verify total type-safety across all clean layers.

------------------------------
## 2. MODULAR REVISION PROCESSING (Targeted Appending)
Use this when you have appended a ## REVISION X section to the bottom of an existing spec file and want to iterate without touching stable code.

Review the newly appended `REVISION` section at the bottom of `docs/specs/[XX_FEATURE_NAME].md`. Align these updates with the product vision in `docs/project_context.md`, the code boundaries in `AGENTS.md`, and our structural layers in `docs/ARCHITECTURE.md`. Modify *only* the specific files and components affected by this revision. Do not refactor, rewrite, or break the stable, underlying core features already established in previous runs. Type-check when done.

------------------------------
## 3. STRICT REFACTORING (Major Design Shifts)
Use this when you have rewritten an original spec file because your architectural approach or design needs a total overhaul.

I have completely rewritten the structural requirements inside `docs/specs/[XX_FEATURE_NAME].md`. Cross-reference the core system boundaries defined in `docs/project_context.md` and `docs/ARCHITECTURE.md`. Refactor our existing codebase files to align perfectly with this updated specification layout. Delete any obsolete or unused component files that are no longer requested by this spec. Compile the codebase to confirm zero layout or type regressions.

------------------------------
## 4. DETECTED BUG REFIXING (Zero Human Code Edits)
Use this when you hit a browser layout glitch, an API crash, or a compiler type mismatch. Do not let the agent guess—give it the raw error.

The system encountered a defect following the latest build execution run. 
Error Context / Crash Logs:
------------------------------------------
[PASTE TERMINAL COMPILER ERROR OR BROWSER CONSOLE LOG HERE]
------------------------------------------
Review the files mentioned in the logs alongside the core application intent mapped out in `docs/project_context.md` and the implementation standards in `AGENTS.md`. Rewrite the broken files completely to resolve this issue without introducing any inline or block code comments. Run verification checks to confirm the fix is successful and types compile cleanly.

------------------------------
## 5. GLOBAL INFRASTRUCTURE SWAP (Dependency Inversion)
Use this when you update your macro architecture (e.g., switching from Prisma to Drizzle, or Clerk to Better-Auth) inside docs/ARCHITECTURE.md.

I have updated our foundational technology stack inside `docs/ARCHITECTURE.md`. Review the macro context in `docs/project_context.md` and check all files located strictly within our infrastructure client layer (`src/lib/`). Refactor these integration services to meet the new technological rules. Do not modify, rewrite, or leak side-effects into our presentation views (`src/components/`) or pure business logic use cases (`src/core/`). Run a type-check to prove our horizontal layers remain perfectly decoupled.

------------------------------
## 6. PRE-FLIGHT COMPILATION & ARCHITECTURE AUDIT
Use this prompt as a hygiene check every few features to make sure the agent hasn't sneakily broken boundaries or snuck in any unwanted code comments.

Perform a comprehensive structural audit of our current `src/` directory layout against the core engineering parameters defined in `docs/project_context.md`, `docs/ARCHITECTURE.md`, and `AGENTS.md`. Check for:
1. Any file that contains illegal inline or block code comments.
2. Any boundary violations (e.g., business logic in `src/core/` importing from UI views or infrastructure client wrappers).
3. Any implicit 'any' type omissions or missing schema interface declarations.
Report all architectural violations cleanly in a markdown checklist format. If none are found, output 'System is fully optimized, decoupled, and compliant.'


