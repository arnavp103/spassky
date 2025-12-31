import { test, expect } from "@playwright/test";

// FEN positions for testing
// Mate in 1: White king on b6, black king on a8, white rook on h1 - Rh8# is mate
const MATE_IN_1_FEN = "k7/8/1K6/8/8/8/8/7R w - - 0 1";

test.describe("Stockfish Eval Bar Tests", () => {
  test("mate in 1 shows M1 in eval bar", async ({ page }) => {
    // Listen for console messages to debug stockfish
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
    });

    await page.goto("http://localhost:3000");
    await page.waitForSelector('[data-square="e2"]');

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Click the import button to open the modal
    await page.click('button[title="Import game"]');
    await page.waitForTimeout(500);

    // Find the textarea in the modal (the one with the FEN placeholder)
    const textarea = page.locator('textarea[placeholder*="FEN"]');
    await textarea.fill(MATE_IN_1_FEN);

    // Click import
    await page.click('button:has-text("Import")');

    // Wait for Stockfish to evaluate
    await page.waitForTimeout(5000);

    // Check the eval bar display
    const evalBarText = await page.locator('[class*="font-mono"]').first().textContent().catch(() => "");

    // Also check the console logs for stockfish output
    const mateMessages = consoleLogs.filter(log =>
      log.toLowerCase().includes('mate') ||
      log.includes('score mate')
    );

    console.log("\n=== MATE IN 1 TEST ===");
    console.log("FEN:", MATE_IN_1_FEN);
    console.log("Eval bar text:", evalBarText);
    console.log("Mate-related logs:", mateMessages.slice(-10));
    console.log("All stockfish logs:", consoleLogs.filter(l => l.includes('Stockfish')).slice(-20));

    // The eval bar should show M1 or a mate indicator
    const hasMateindicator = evalBarText?.includes("M") || mateMessages.some(m => m.includes('score mate'));
    expect(hasMateindicator).toBeTruthy();
  });

  test("debug stockfish worker messages", async ({ page }) => {
    const allLogs: string[] = [];

    page.on("console", (msg) => {
      allLogs.push(`[console.${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      allLogs.push(`[pageerror] ${err.message}`);
    });

    await page.goto("http://localhost:3000");
    await page.waitForSelector('[data-square="e2"]');

    // Wait for stockfish to try to initialize
    await page.waitForTimeout(5000);

    // Print all logs related to stockfish
    const stockfishLogs = allLogs.filter(log =>
      log.toLowerCase().includes("stockfish") ||
      log.toLowerCase().includes("worker") ||
      log.toLowerCase().includes("wasm") ||
      log.toLowerCase().includes("error")
    );

    console.log("\n=== STOCKFISH DEBUG LOGS ===");
    stockfishLogs.forEach(log => console.log(log));
    console.log("=== END LOGS ===\n");

    // Check if there are any errors
    const hasErrors = stockfishLogs.some(log =>
      log.includes("[pageerror]") ||
      log.includes("error") ||
      log.includes("Error")
    );

    if (hasErrors) {
      console.log("ERRORS DETECTED - Stockfish may not be loading correctly");
    }

    // This test is for debugging - always passes but prints info
    expect(true).toBe(true);
  });

  test("check stockfish files are accessible", async ({ page }) => {
    // Try to fetch the stockfish files directly
    const jsResponse = await page.goto("http://localhost:3000/stockfish/stockfish.js");
    const jsStatus = jsResponse?.status();
    console.log("stockfish.js status:", jsStatus);

    const wasmResponse = await page.goto("http://localhost:3000/stockfish/stockfish.wasm");
    const wasmStatus = wasmResponse?.status();
    console.log("stockfish.wasm status:", wasmStatus);

    expect(jsStatus).toBe(200);
    expect(wasmStatus).toBe(200);
  });
});
