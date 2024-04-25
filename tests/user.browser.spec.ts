import { test, expect } from "@playwright/test";
import { getPath } from "../src/url";
import postgres from "postgres";
import { createUTCDate } from "../src/utils";
import User, { UserProps } from "../src/models/User";

let sql = postgres({
	database: "TodoDB",
});

const createUser = async (props: Partial<UserProps> = {}) => {
	return await User.create(sql, {
		email: props.email || "user@email.com",
		password: props.password || "password",
		createdAt: props.createdAt || createUTCDate(),
		// isAdmin: props.isAdmin || false, // Uncomment if implementing admin feature.
	});
};

/**
 * Clean up the database after each test. This function deletes all the rows
 * from the todos and subtodos tables and resets the sequence for each table.
 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
 */
test.afterEach(async () => {
	const tables = ["todos", "subtodos", "users"];

	try {
		for (const table of tables) {
			await sql.unsafe(`DELETE FROM ${table}`);
			await sql.unsafe(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1;`);
		}
	} catch (error) {
		console.error(error);
	}
});

test("User was registered.", async ({ page }) => {
	await page.goto(`register`);

	await page.fill('form#register-form input[name="email"]', "user@email.com");
	await page.fill('form#register-form input[name="password"]', "Password123");
	await page.fill(
		'form#register-form input[name="confirmPassword"]',
		"Password123",
	);
	await page.click("form#register-form #register-form-submit-button");

	expect(await page?.url()).toBe(getPath("login"));
});

test("User was not registered with blank email.", async ({ page }) => {
	await page.goto(`register`);

	await page.fill('form#register-form input[name="password"]', "Password123");
	await page.fill(
		'form#register-form input[name="confirmPassword"]',
		"Password123",
	);
	await page.click("form#register-form #register-form-submit-button");

	expect(await page?.url()).toMatch(getPath("register"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Email is required");
});

test("User was not registered with mismatched passwords.", async ({ page }) => {
	await page.goto(`register`);

	await page.fill('form#register-form input[name="email"]', "user@email.com");
	await page.fill('form#register-form input[name="password"]', "Password123");
	await page.fill(
		'form#register-form input[name="confirmPassword"]',
		"Password124",
	);
	await page.click("form#register-form #register-form-submit-button");

	expect(await page?.url()).toMatch(getPath("register"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Passwords do not match");
});

test("User was logged in.", async ({ page }) => {
	const user = await createUser({ password: "Password123" });

	await page.goto(`/`);

	let loginElement = await page.$(`nav a[href="${getPath("login")}"]`);
	let logoutElement = await page.$(`nav a[href="${getPath("logout")}"]`);

	expect(await loginElement).toBeTruthy();
	expect(await logoutElement).toBeFalsy();

	await loginElement?.click();

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "Password123");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toBe(getPath("todos"));

	loginElement = await page.$(`nav a[href="${getPath("login")}"]`);
	logoutElement = await page.$(`nav a[href="${getPath("logout")}"]`);

	expect(await loginElement).toBeFalsy();
	expect(await logoutElement).toBeTruthy();
});

test("User was not logged in with blank email.", async ({ page }) => {
	const user = await createUser({ password: "Password123" });

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="password"]', "Password123");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toMatch(getPath("login"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Email is required.");
});

test("User was not logged in with incorrect password.", async ({ page }) => {
	const user = await createUser({ password: "Password123" });

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "Password124");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toMatch(getPath("login"));

	const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Invalid credentials.");
});

test("User was logged out.", async ({ page, context }) => {
	const user = await createUser({ password: "Password123" });

	expect((await context.cookies()).length).toBe(0);

	await page.goto(`/login`);

	expect((await context.cookies()).length).toBe(1);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "Password123");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toBe(getPath("todos"));

	const logoutElement = await page.$(`nav a[href="${getPath("logout")}"]`);

	await logoutElement?.click();

	expect(await page?.url()).toBe(getPath(""));

	const loginElement = await page.$(`nav a[href="${getPath("login")}"]`);

	expect(await loginElement).toBeTruthy();
});

test("User's email was remembered.", async ({ page }) => {
	const user = await createUser({ email: "user@email.com" });
	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.check('form#login-form input[name="remember"]');
	await page.click("form#login-form #login-form-submit-button");

	const cookies = await page.context().cookies();

	const emailCookie = cookies.find((cookie) => cookie.name === "email");

	expect(emailCookie).toBeTruthy();
	expect(emailCookie?.value).toBe(user.props.email);
});

/* *** Uncomment if implementing admin feature, as well as the comment above in createUser(). ***

test("Users were listed.", async ({ page }) => {
	const users = [
		await createUser({ email: "user1@example.com" }),
		await createUser({ email: "user2@example.com" }),
		await createUser({ email: "user3@example.com" }),
	];

	const admin = await createUser({
		email: "admin@email.com",
		isAdmin: true,
	});

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', admin.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.click("form#login-form #login-form-submit-button");

	await page.goto(`/users`);

	const userElements = await page.$$(`[user-id]`);

	for (let i = 0; i < users.length; i++) {
		expect(await userElements[i]?.innerText()).toMatch(
			users[i].props.email,
		);
	}

	expect(userElements.length).toBe(4);
});

test("User was made an admin.", async ({ page }) => {
	const user = await createUser();
	const admin = await createUser({
		email: "admin@email.com",
		isAdmin: true,
	});

	// Login as regular user.
	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.click("form#login-form #login-form-submit-button");

	await page.goto(`/users`);

	// Check body for error message.
	const body = await page.textContent("body");
	expect(body).toMatch("You are not authorized to view this page.");

	// Login as admin.
	await page.goto(`/logout`);
	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', admin.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.click("form#login-form #login-form-submit-button");

	await page.goto(`/users`);

	// Make user an admin.
	await page.check(`[user-id="${user.props.id}"] input[type="checkbox"]`);

	// Login as user and check if they can view the users page.
	await page.goto(`/logout`);
	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.click("form#login-form #login-form-submit-button");

	await page.goto(`/users`);

	// Check body for lack of error message.
	const body2 = await page.textContent("body");
	expect(body2).not.toMatch("You are not authorized to view this page.");
});



test("Admin can delete user.", async ({ page }) => {
	const user = await createUser();
	const admin = await createUser({
		email: "admin@example.com",
		isAdmin: true,
	});

	// Login as admin.
	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', admin.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.click("form#login-form #login-form-submit-button");

	await page.goto(`/users`);

	const userCount = (await page.$$(`[user-id]`)).length;

	// Delete user.
	await page.click(
		`[user-id="${user.props.id}"] .delete-user-form-submit-button`,
	);

	// Check if user was deleted.
	expect(await page?.url()).toMatch(getPath(`users`));
	expect(await page?.textContent("body")).toMatch(
		"User deleted successfully!",
	);
	expect((await page.$$(`[user-id]`)).length).toBe(userCount - 1);
});

*/

/* *** Uncomment if implementing profile feature. ***

test("User was updated.", async ({ page }) => {
	const user = await createUser({ password: "Password123" });

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "Password123");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toBe(getPath("todos"));

	await page.goto(`/users/${user.props.id}/edit`);

	await page.fill(
		'form#edit-user-form input[name="email"]',
		"updateduser@email.com",
	);
	await page.fill(
		'form#edit-user-form input[name="password"]',
		"newpassword",
	);
	await page.click("form#edit-user-form #edit-user-form-submit-button");

	expect(await page?.url()).toMatch(getPath(`users/${user.props.id}/edit`));
	expect(await page?.textContent("body")).toMatch(
		"User updated successfully!",
	);

	const updatedUser = await User.read(sql, user.props.id!);

	expect(updatedUser?.props.email).toBe("updateduser@email.com");
	expect(updatedUser?.props.password).not.toBe("newpassword");
	expect(updatedUser?.props.editedAt).toBeTruthy();
});

test("User was not updated with duplicate email.", async ({ page }) => {
	const user1 = await createUser({ email: "user1@email.com" });
	const user2 = await createUser({ email: "user2@email.com" });

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user1.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toBe(getPath("todos"));

	await page.goto(`/users/${user1.props.id}/edit`);

	await page.fill(
		'form#edit-user-form input[name="email"]',
		user2.props.email,
	);

	await page.click("form#edit-user-form #edit-user-form-submit-button");

	expect(await page?.url()).toMatch(getPath(`users/${user1.props.id}/edit`));
	expect(await page?.textContent("body")).toMatch(
		"User with this email already exists",
	);
});

test("User was updated with profile picture.", async ({ page }) => {
	const user = await createUser();

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toBe(getPath("todos"));

	await page.goto(`/users/${user.props.id}/edit`);

	const profilePicturePath = "https://picsum.photos/id/238/100";

	await page.fill(
		'form#edit-user-form input[name="profile"]',
		profilePicturePath,
	);
	await page.click("form#edit-user-form #edit-user-form-submit-button");

	// Get profile picture in nav
	const profilePicture = await page.$("nav img");
	const profilePictureInput = await page.$(
		`form#edit-user-form input[name="profile"]`,
	);

	expect(await page?.url()).toMatch(getPath(`users/${user.props.id}/edit`));
	expect(await page?.textContent("body")).toMatch(
		"User updated successfully!",
	);
	expect(await profilePicture?.getAttribute("src")).toBe(profilePicturePath);
	expect(await profilePictureInput?.getAttribute("value")).toBe(
		profilePicturePath,
	);
});

test("User was able to toggle darkmode.", async ({ page, context }) => {
	const user = await createUser();

	await page.goto(`/login`);

	await page.fill('form#login-form input[name="email"]', user.props.email);
	await page.fill('form#login-form input[name="password"]', "password");
	await page.click("form#login-form #login-form-submit-button");

	expect(await page?.url()).toBe(getPath("todos"));

	await page.goto(`/users/${user.props.id}/edit`);

	await page.check('form#edit-user-form input[name="darkmode"]');
	await page.click("form#edit-user-form #edit-user-form-submit-button");

	// Check if theme cookie is set
	const cookies = await context.cookies();
	const themeCookie = cookies.find((cookie) => cookie.name === "theme");

	expect(themeCookie).toBeTruthy();
	expect(themeCookie?.value).toBe("dark");

	// Toggle darkmode off
	await page.uncheck('form#edit-user-form input[name="darkmode"]');
	await page.click("form#edit-user-form #edit-user-form-submit-button");

	const cookies2 = await context.cookies();
	const themeCookie2 = cookies2.find((cookie) => cookie.name === "theme");

	expect(themeCookie2).toBeTruthy();
	expect(themeCookie2?.value).toBe("light");
});

*/
