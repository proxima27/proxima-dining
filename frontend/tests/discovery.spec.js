import { test, expect } from "@playwright/test";
test("editorial browsing, menu, favorites, history and theme", async ({
  page: p,
}) => {
  await p.goto("/");
  await expect(
    p.getByRole("heading", { name: "Featured Restaurants" }),
  ).toBeVisible();
  await p.getByRole("button", { name: "Next spotlight" }).click();
  await expect(p.locator(".caption")).toContainText("Bella Napoli");
  await p
    .getByRole("button", { name: "Save Maison Laurent", exact: true })
    .click();
  await p
    .getByRole("link", { name: "Explore Maison Laurent", exact: true })
    .click();
  await expect(p.getByRole("heading", { level: 1 })).toHaveText(
    "Maison Laurent",
  );
  await p.locator(".menurow").first().click();
  await expect(p.getByRole("heading", { level: 1 })).toHaveText(
    "Herb-roasted chicken",
  );
  await p.getByRole("button", { name: "Save Herb-roasted chicken" }).click();
  await p.getByRole("link", { name: "Favorites", exact: true }).click();
  await expect(
    p.getByRole("heading", { name: "Recently Viewed" }),
  ).toBeVisible();
  await expect(p.locator(".grid").first().locator(".card")).toHaveCount(2);
  await p.getByRole("button", { name: "Switch theme" }).click();
  await p.reload();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(p.locator(".grid").first().locator(".card")).toHaveCount(2);
});
test("search, filters, cuisine pages, categories and pagination", async ({
  page: p,
}) => {
  await p.goto("/");
  await p
    .getByRole("textbox", { name: "Search restaurants, cuisines or cities" })
    .fill("Japanese");
  await p.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(
    p.locator(".card h3").filter({ hasText: "Sakura House" }),
  ).toHaveCount(1);
  await p.goto("/cuisines/japanese");
  await expect(p.locator(".card")).toHaveCount(2);
  await p.goto("/restaurants");
  await expect(p.locator(".card")).toHaveCount(9);
  await p.getByRole("button", { name: "Next page" }).click();
  await expect(p.locator(".card")).toHaveCount(9);
  await p.getByLabel("Countries").selectOption("Japan");
  await expect(p.locator(".card")).toHaveCount(2);
  await p.goto("/categories/desserts");
  await expect(p.locator(".card").first()).toContainText("View dish");
});
test("mobile layout and menu", async ({ page: p }) => {
  await p.setViewportSize({ width: 375, height: 812 });
  await p.goto("/");
  await expect(p.locator(".card").first()).toBeVisible();
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await p.getByRole("button", { name: "Toggle navigation" }).click();
  await p.locator("nav").getByText("Cuisines", { exact: true }).click();
  await expect(
    p.getByRole("heading", { name: "Explore Cuisines" }),
  ).toBeVisible();
});
test("protected editor creates, publishes, edits and deletes a restaurant", async ({
  page: p,
}) => {
  const name = "Browser test " + Date.now();
  await p.goto("/admin/dashboard");
  await expect(p).toHaveURL(/\/admin$/);
  await p.getByLabel("Username").fill("admin");
  await p.getByLabel("Password").fill("admin123");
  await p.getByRole("button", { name: "Sign in" }).click();
  await expect(
    p.getByRole("heading", { name: "Studio Overview" }),
  ).toBeVisible();
  await p.locator("aside").getByText("Restaurants", { exact: true }).click();
  await p.getByRole("link", { name: "New record" }).click();
  await p.getByLabel("Name", { exact: true }).fill(name);
  await p.getByLabel("City", { exact: true }).fill("Lagos");
  await p.getByLabel("Country", { exact: true }).fill("Nigeria");
  await p.getByLabel("French", { exact: true }).check();
  await p.getByLabel("Published", { exact: true }).check();
  await p.getByRole("button", { name: "Save record" }).click();
  await expect(p.locator(".recordlist")).toContainText(name);
  const link = "/restaurants/" + name.toLowerCase().replaceAll(" ", "-");
  await p.goto("/restaurants?search=" + encodeURIComponent(name));
  await p.getByRole("link", { name: "View restaurant", exact: true }).click();
  await expect(p.locator("h1")).toHaveText(name);
  await p.goto("/admin/restaurants");
  await p.getByRole("link", { name: "Edit " + name }).click();
  await p
    .getByLabel("Description", { exact: true })
    .fill("An updated editorial description.");
  await p.getByRole("button", { name: "Save record" }).click();
  await expect(p.locator(".recordlist")).toContainText(name);
  await p.goto(link);
  await expect(p.locator(".detailintro")).toContainText(
    "An updated editorial description.",
  );
  await p.goto("/admin/restaurants");
  p.once("dialog", (d) => d.accept());
  await p.getByRole("button", { name: "Delete " + name }).click();
  await expect(p.locator(".recordlist")).not.toContainText(name);
  await p.getByRole("button", { name: "Sign out" }).click();
  await expect(p.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
});
test("newsletter and contact reach the staff inbox", async ({ page: p }) => {
  const key = "browser-" + Date.now(),
    email = key + "@example.org";
  await p.goto("/");
  await p.getByLabel("Email address").fill(email);
  await p.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect(p.locator(".newsletter [role=status]")).toContainText(
    "on the list",
  );
  await p.goto("/contact");
  for (const [n, v] of [
    ["Name", "Demo check"],
    ["Email address", email],
    ["Subject", key],
    ["Message", "A disposable integration test."],
  ])
    await p.getByLabel(n, { exact: true }).fill(v);
  await p.getByRole("button", { name: "Send message" }).click();
  await expect(p.getByRole("status")).toContainText("received");
  await p.goto("/admin");
  await p.getByLabel("Username").fill("admin");
  await p.getByLabel("Password").fill("admin123");
  await p.getByRole("button", { name: "Sign in" }).click();
  await expect(p.locator(".statgrid")).toBeVisible();
  for (const [k, needle] of [
    ["messages", key],
    ["newsletter", email],
  ]) {
    await p.goto("/admin/" + k);
    await p.getByRole("textbox").fill(needle);
    await expect(p.locator(".recordlist")).toContainText(needle);
    p.once("dialog", (d) => d.accept());
    await p.locator('.recordlist button[aria-label^="Delete"]').click();
    await expect(p.getByText("No matching records.")).toBeVisible();
  }
});

test('an open staff inbox receives a visitor message without reloading', async ({page: staff, browser}) => {
  test.setTimeout(40000);
  const ctx = await browser.newContext({baseURL: 'http://127.0.0.1:5173'});
  const visitor = await ctx.newPage();
  const subject = 'Inbox delivery ' + Date.now();
  await staff.goto('/admin');
  await staff.getByLabel('Username').fill('admin');
  await staff.getByLabel('Password').fill('admin123');
  await staff.getByRole('button',{name:'Sign in'}).click();
  await staff.locator('aside').getByRole('link',{name:/Contact messages/}).click();
  await staff.getByRole('textbox').fill(subject);
  await expect(staff.getByText('No matching records.')).toBeVisible();
  await visitor.goto('/contact');
  for (const [label,value] of [['Name','Inbox test'],['Email address','inbox-test@example.org'],['Subject',subject],['Message','Please check the seasonal menu.']]) await visitor.getByLabel(label,{exact:true}).fill(value);
  await visitor.getByRole('button',{name:'Send message'}).click();
  await expect(visitor.getByRole('status')).toContainText('received');
  expect((await ctx.request.get('/api/v1/admin/messages/summary')).status()).toBe(401);
  await staff.bringToFront();
  await expect(staff.locator('.recordlist')).toContainText(subject,{timeout:16000});
  await expect(staff.locator('.recordlist')).toContainText('Unread');
  await expect(staff.locator('aside .inboxbadge')).toBeVisible();
  await staff.getByRole('button',{name:'Read',exact:true}).click();
  await expect(staff.getByRole('dialog')).toContainText('Please check the seasonal menu.');
  await expect(staff.getByRole('dialog')).toContainText('inbox-test@example.org');
  await staff.getByRole('button',{name:'Close'}).click();
  await expect(staff.locator('.recordlist')).toContainText('Inbox test · Read');
  staff.once('dialog',d=>d.accept());
  await staff.getByRole('button',{name:'Delete Inbox test'}).click();
  await expect(staff.getByText('No matching records.')).toBeVisible();
  await ctx.close();
});
