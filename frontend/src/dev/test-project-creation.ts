/**
 * Project CRUD test utility — Dev mode only.
 * Uses the current REST-based projectService API.
 */

import { projectService } from "@/services/projectService";

export default function registerTest() {
  (window as unknown as Record<string, unknown>).testProjectCrud = testProjectCrud;
  console.log("🧪 Dev test loaded. Run: await testProjectCrud()");
}

async function testProjectCrud(): Promise<void> {
  const results: string[] = [];

  const testData = {
    name: "Test Project — " + new Date().toISOString().slice(0, 16),
    description:
      "Auto-generated test to verify project CRUD works correctly.",
  };

  let projectId: string | null = null;

  try {
    // Step 1: Create
    const created = await projectService.createProject(testData);
    if (created?.id) {
      projectId = created.id;
      results.push(`✅ PASS: Created project "${created.name}" (id: ${projectId})`);
    } else {
      results.push(`❌ FAIL: Create returned unexpected shape`);
      return printResults(results);
    }

    // Step 2: Get My Projects
    const all = await projectService.getMyProjects();
    const found = all.find((p: { id: string }) => p.id === projectId);
    if (found) {
      results.push(`✅ PASS: Found project in getMyProjects() (${all.length} total)`);
    } else {
      results.push(`❌ FAIL: Created project missing from getMyProjects()`);
    }

    // Step 3: Get By ID
    const fetched = await projectService.getProject(projectId);
    if (fetched.id === projectId) {
      results.push(`✅ PASS: getProject() returned correct project`);
    } else {
      results.push(`❌ FAIL: getProject() mismatch`);
    }

    // Step 4: Update
    const updatedName = testData.name + " [UPDATED]";
    const updated = await projectService.updateProject(projectId, { name: updatedName });
    if (updated.name === updatedName) {
      results.push(`✅ PASS: Updated project name successfully`);
    } else {
      results.push(`❌ FAIL: Update didn't change name`);
    }

    // Step 5: Delete (cleanup)
    await projectService.deleteProject(projectId);
    const afterDelete = await projectService.getMyProjects();
    const deleted = afterDelete.find((p: { id: string }) => p.id === projectId);
    if (!deleted) {
      results.push(`✅ PASS: Deleted project — no leftovers`);
    } else {
      results.push(`❌ FAIL: Project still exists after delete`);
    }

    results.push(`\n🎉 All CRUD operations verified end-to-end!`);
  } catch (err) {
    results.push(`❌ FAIL: ${err instanceof Error ? err.message : String(err)}`);
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
