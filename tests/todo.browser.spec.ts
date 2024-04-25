import postgres from "postgres";
import { test, expect, Page } from "@playwright/test";
import { getPath } from "../src/url";
import Todo, { TodoProps } from "../src/models/Todo";
import User, { UserProps } from "../src/models/User";
import { createUTCDate } from "../src/utils";

const sql = postgres({
	database: "TodoDB",
});

/**
 * Helper function to create a Todo with default or provided properties.
 * @see https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR#short-circuit_evaluation
 * @param props The properties of the Todo.
 * @default title: "Test Todo"
 * @default description: "This is a test todo"
 * @default status: "incomplete"
 * @default dueAt: A week from today
 * @default createdAt: The current date/time
 * @returns A new Todo object that has been persisted in the DB.
 */
const createTodo = async (props: Partial<TodoProps> = {}) => {
	const todoProps: TodoProps = {
		title: props.title || "Test Todo",
		description: props.description || "This is a test todo",
		status: props.status || "incomplete",
		dueAt:
			props.dueAt ||
			createUTCDate(
				new Date(new Date().setDate(new Date().getDate() + 7)),
			),
		createdAt: props.createdAt || createUTCDate(),
		userId: props.userId || 1,
	};

	return await Todo.create(sql, todoProps);
};

const createUser = async (props: Partial<UserProps> = {}) => {
	return await User.create(sql, {
		email: props.email || "user@email.com",
		password: props.password || "password",
		createdAt: props.createdAt || createUTCDate(),
		// isAdmin: props.isAdmin || false, // Uncomment if implementing admin feature.
	});
};

const login = async (
	page: Page,
	email: string = "user@email.com",
	password: string = "password",
) => {
	await page.goto(`/login`);
	await page.fill('form#login-form input[name="email"]', email);
	await page.fill('form#login-form input[name="password"]', password);
	await page.click("form#login-form #login-form-submit-button");
};

const logout = async (page: Page) => {
	await page.goto("/logout");
};

test.beforeEach(async () => {
	await createUser();
});

/**
 * Clean up the database after each test. This function deletes all the rows
 * from the todos and subtodos tables and resets the sequence for each table.
 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
 */
test.afterEach(async ({ page }) => {
	const tables = ["todos", "subtodos", "users"];

	try {
		for (const table of tables) {
			await sql.unsafe(`DELETE FROM ${table}`);
			await sql.unsafe(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1;`);
		}
	} catch (error) {
		console.error(error);
	}

	await logout(page);
});

test("Homepage was retrieved successfully", async ({ page }) => {
	await page.goto("/");

	expect(await page?.title()).toBe("Todo App");
});

test("Todo retrieved successfully.", async ({ page }) => {
	await login(page);
	const todo = await createTodo();

	await page.goto(`todos/${todo.props.id}`);

	const titleElement = await page.$("#title");
	const descriptionElement = await page.$("#description");
	const statusElement = await page.$(`[status="${todo.props.status}"]`);

	expect(await titleElement?.innerText()).toBe(todo.props.title);
	expect(await descriptionElement?.innerText()).toBe(todo.props.description);
	expect(await statusElement?.innerText()).not.toBeNull();
});

test("Todo not retrieved while logged out.", async ({ page }) => {
	const todo = await createTodo();

	await page.goto(`todos/${todo.props.id}`);

	expect(await page?.url()).toBe(getPath("login"));
});

test("All Todos were retrieved.", async ({ page }) => {
	await login(page);
	const todos = [await createTodo(), await createTodo(), await createTodo()];

	await page.goto("/todos");

	const h1 = await page.$("h1");
	const todoElements = await page.$$("[todo-id]");

	expect(await h1?.innerText()).toMatch("Todos");
	expect(todoElements.length).toBe(todos.length);

	for (let i = 0; i < todoElements.length; i++) {
		const status = await todoElements[i].getAttribute("status");
		expect(await todoElements[i].innerText()).toMatch(todos[i].props.title);
		expect(status).toMatch(todos[i].props.status);
	}
});

test("All todos not retrieved while logged out.", async ({ page }) => {
	const todo = await createTodo();

	await page.goto(`todos`);

	expect(await page?.url()).toBe(getPath("login"));
});

test("Todo created successfully.", async ({ page }) => {
	await login(page);
	const todo = {
		title: "Test Todo",
		description: "This is a test todo",
		status: "incomplete",
	};

	await page.goto("/todos/new");

	const h1 = await page.$("h1");

	expect(await h1?.innerText()).toMatch("Create Todo");

	await page.fill('form#new-todo-form input[name="title"]', todo.title);
	await page.fill(
		'form#new-todo-form textarea[name="description"]',
		todo.description,
	);
	await page.click("form#new-todo-form #new-todo-form-submit-button");

	expect(await page?.url()).toBe(getPath(`todos/1`));

	const titleElement = await page.$("#title");
	const descriptionElement = await page.$("#description");
	const statusElement = await page.$(`[status="${todo.status}"]`);

	expect(await titleElement?.innerText()).toBe(todo.title);
	expect(await descriptionElement?.innerText()).toBe(todo.description);
	expect(statusElement).not.toBeNull();
});

test("Todo not created while logged out.", async ({ page }) => {
	await page.goto(`/todos/new`);

	expect(await page?.url()).toBe(getPath("login"));
});

test("Todo updated successfully.", async ({ page }) => {
	await login(page);
	const todo = await createTodo();

	await page.goto(`todos/${todo.props.id}/edit`);

	const h1 = await page.$("h1");

	expect(await h1?.innerText()).toMatch("Edit Todo");

	const newTitle = "Updated Test Todo";
	const newDescription = "This is an updated test todo";

	await page.fill('form#edit-todo-form input[name="title"]', newTitle);
	await page.fill(
		'form#edit-todo-form textarea[name="description"]',
		newDescription,
	);
	await page.click("form#edit-todo-form #edit-todo-form-submit-button");

	expect(await page?.url()).toBe(getPath(`todos/${todo.props.id}`));

	const titleElement = await page.$("#title");
	const descriptionElement = await page.$("#description");

	expect(await titleElement?.innerText()).toBe(newTitle);
	expect(await descriptionElement?.innerText()).toBe(newDescription);
});

test("Todo not updated while logged out.", async ({ page }) => {
	const todo = await createTodo();

	await page.goto(`todos/${todo.props.id}/edit`);

	expect(await page?.url()).toBe(getPath("login"));
});

test("Todo deleted successfully.", async ({ page }) => {
	await login(page);
	const todo = await createTodo();

	await page.goto(`todos/${todo.props.id}`);

	await page.click("form#delete-todo-form button");

	expect(await page?.url()).toBe(getPath(`todos`));

	const body = await page.$("body");

	expect(await body?.innerText()).toMatch("No todos found");
});

test("Todo completed successfully.", async ({ page }) => {
	await login(page);
	const todo = await createTodo();

	await page.goto(`todos/${todo.props.id}`);

	await page.click("form#complete-todo-form button");

	expect(await page?.url()).toBe(getPath(`todos/${todo.props.id}`));

	const statusElement = await page.$(`[status="complete"]`);

	expect(statusElement).not.toBeNull();
});
