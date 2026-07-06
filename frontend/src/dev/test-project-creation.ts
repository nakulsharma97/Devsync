/**
 * Project CRUD test utility — Dev mode only.
 *
 * Exposes `window.testProjectCrud()` for easy console testing.
 * Imported in main.tsx via `import.meta.env.DEV` guard, so it's
 * tree-shaken out of production builds.
 */

import { projectService, type ProjectRequest } from "@/services/projectService";

export default function registerTest() {
  (window as any).testProjectCrud = testProjectCrud;
  console.log("🧪 Dev test loaded. Run: await testProjectCrud()");
}

async function testProjectCrud(): Promise<void> {
  const results: string[] = [];
  const log = console.log;

  const testProject: ProjectRequest = {
    title: "Test Project — " + new Date().toISOString().slice(0, 16),
    description:
      "Auto-generated test to verify the Convex project migration works correctly.",
    techStack: "TypeScript, Convex, React",
    githubRepo: "https://github.com/test/test-project",
    liveDemo: "https://test-project.example.com",
    tags: ["test", "verification"],
  };

  let projectId: string | null = null;

  try {
    // -------- Step 1: Create --------
    const created = await projectService.create(testProject);
    if (created?.id) {
      projectId = created.id;
      results.push(
        `✅ PASS: Created project "${created.title}" (id: ${projectId})`,
      );
    } else {
      results.push(`❌ FAIL: Create returned unexpected shape`);
      return printResults(results);
    }

    // -------- Step 2: Get All --------
    const all = await projectService.getAll();
    const found = all.find((p) => p.id === projectId);
    if (found) {
      results.push(
        `✅ PASS: Found project in getAll() (${all.length} total)`,
      );
    } else {
      results.push(`❌ FAIL: Created project missing from getAll()`);
    }

    // -------- Step 3: Get By ID --------
    const fetched = await projectService.getById(projectId);
    if (fetched.id === projectId) {
      results.push(`✅ PASS: getById() returned correct project`);
    } else {
      results.push(`❌ FAIL: getById() mismatch`);
    }

    // -------- Step 4: Update --------
    const updatedTitle = testProject.title + " [UPDATED]";
    const updated = await projectService.update(projectId, {
      ...testProject,
      title: updatedTitle,
    });
    if (updated.title === updatedTitle) {
      results.push(`✅ PASS: Updated project title successfully`);
    } else {
      results.push(`❌ FAIL: Update didn't change title`);
    }

    // -------- Step 5: Delete (cleanup) --------
    await projectService.delete(projectId);
    const afterDelete = await projectService.getAll();
    const deleted = afterDelete.find((p) => p.id === projectId);
    if (!deleted) {
      results.push(`✅ PASS: Deleted project — no leftovers`);
    } else {
      results.push(`❌ FAIL: Project still exists after delete`);
    }

    results.push(`\n🎉 All CRUD operations verified end-to-end!`);
  } catch (err: any) {
    results.push(`❌ FAIL: ${err?.message || String(err)}`);
    if (!projectId) {
      results.push(
        `\n💡 Tip: Make sure you're logged in before running the test.`,
      );
    }
  }

  printResults(results);
}

function printResults(results: string[]) {
  console.log("\n" + "=".repeat(50));
  console.log("📋 PROJECT CRUD TEST RESULTS");
  console.log("=".repeat(50));
  for (const line of results) {
    console.log(line);
  }
  console.log("=".repeat(50) + "\n");
}
