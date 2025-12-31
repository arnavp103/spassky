import { test, expect } from "@playwright/test";

test.describe("Spassky Chess Coach - Visibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForSelector('[data-square="e2"]');
  });

  test("chessboard is visible", async ({ page }) => {
    const board = page.locator("#chessboard-board");
    await expect(board).toBeVisible();
  });

  test("all chess pieces are visible", async ({ page }) => {
    // Check white pieces
    const whitePawns = page.locator('[data-piece="wP"]');
    await expect(whitePawns).toHaveCount(8);

    // Check black pieces
    const blackPawns = page.locator('[data-piece="bP"]');
    await expect(blackPawns).toHaveCount(8);

    // Check kings
    const whiteKing = page.locator('[data-piece="wK"]');
    const blackKing = page.locator('[data-piece="bK"]');
    await expect(whiteKing).toBeVisible();
    await expect(blackKing).toBeVisible();
  });

  test("move list panel is visible", async ({ page }) => {
    const movesHeader = page.locator("text=MOVES");
    await expect(movesHeader).toBeVisible();
  });

  test("coach panel is visible", async ({ page }) => {
    const coachHeader = page.getByRole("heading", { name: "Coach" });
    await expect(coachHeader).toBeVisible();
  });

  test("welcome message is visible", async ({ page }) => {
    const welcomeText = page.locator("text=Hey! I'm your chess coach");
    await expect(welcomeText).toBeVisible();
  });

  test("study option buttons are visible", async ({ page }) => {
    // Check for opening studies
    const berlinWall = page.locator("text=Berlin Wall");
    await expect(berlinWall).toBeVisible();

    const openSicilian = page.locator("text=Open Sicilian");
    await expect(openSicilian).toBeVisible();

    // Check for endgame studies
    const lucenaPosition = page.locator("text=Lucena Position");
    await expect(lucenaPosition).toBeVisible();

    // Check for famous games
    const kasparovGame = page.locator("text=Kasparov vs Topalov");
    await expect(kasparovGame).toBeVisible();
  });

  test("chat input is visible", async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="PGN"]');
    await expect(chatInput).toBeVisible();
  });

  test("navigation buttons are visible", async ({ page }) => {
    // Check for navigation buttons
    const goToStart = page.locator('button[title="Go to start"]');
    const prevMove = page.locator('button[title="Previous move"]');
    const nextMove = page.locator('button[title="Next move"]');
    const goToEnd = page.locator('button[title="Go to end"]');
    const flipBoard = page.locator('button[title="Flip board"]');

    await expect(goToStart).toBeVisible();
    await expect(prevMove).toBeVisible();
    await expect(nextMove).toBeVisible();
    await expect(goToEnd).toBeVisible();
    await expect(flipBoard).toBeVisible();
  });

  test("import button is visible", async ({ page }) => {
    const importButton = page.locator('button[title="Import game"]');
    await expect(importButton).toBeVisible();
  });

  test("evaluation bar is visible", async ({ page }) => {
    // The eval bar should show the score
    // It starts at 0.0 or +0.0 for the starting position
    const evalScore = page.locator("text=/[+-]?0\\.0/");
    await expect(evalScore).toBeVisible({ timeout: 5000 });
  });

  test("clicking on piece shows legal moves", async ({ page }) => {
    // Click on e2 pawn
    await page.click('[data-square="e2"]');

    // Wait for legal move indicators to appear
    await page.waitForTimeout(500);

    // Check that e3 and e4 have legal move indicators
    // The squareRenderer adds a div inside for legal moves
    const e3Content = await page.locator('[data-square="e3"]').innerHTML();
    const e4Content = await page.locator('[data-square="e4"]').innerHTML();

    // Legal move squares should have more content (the dot div)
    expect(e3Content.length).toBeGreaterThan(50);
    expect(e4Content.length).toBeGreaterThan(50);
  });

  test("clicking study button loads content", async ({ page }) => {
    // Click on "Berlin Wall" opening
    await page.click("text=Berlin Wall");

    // Wait for the game to load
    await page.waitForTimeout(2000);

    // The move list should now show moves - check for Start button
    const startButton = page.locator("text=Start");
    await expect(startButton).toBeVisible({ timeout: 10000 });

    // Should see some move buttons with SAN notation (the move list contains buttons with moves)
    const moveButtons = page.locator('button:has-text("e")').first();
    await expect(moveButtons).toBeVisible({ timeout: 5000 });
  });

  test("import modal opens and closes", async ({ page }) => {
    // Click import button
    await page.click('button[title="Import game"]');

    // Modal should be visible
    const modalTitle = page.locator("text=Import Game");
    await expect(modalTitle).toBeVisible();

    // Close modal
    const closeButton = page.locator('button:has(svg line[x1="18"][y1="6"])');
    await closeButton.click();

    // Modal should be gone
    await expect(modalTitle).not.toBeVisible();
  });
});
