import postgres from "postgres";
import Todo, { TodoProps } from "../src/models/Todo";
import { StatusCode } from "../src/router/Response";
import { HttpResponse, clearCookieJar, makeHttpRequest } from "./client";
import { test, describe, expect, afterEach, beforeEach } from "vitest";
import { createUTCDate } from "../src/utils";
import User, { UserProps } from "../src/models/User";

describe("Todo HTTP operations", () => {
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
		email: string = "user@email.com",
		password: string = "password",
	) => {
		await makeHttpRequest("POST", "/login", {
			email,
			password,
		});
	};

	beforeEach(async () => {
		await createUser();
	});

	/**
	 * Clean up the database after each test. This function deletes all the rows
	 * from the todos and subtodos tables and resets the sequence for each table.
	 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
	 */
	afterEach(async () => {
		const tables = ["todos", "subtodos", "users"];

		try {
			for (const table of tables) {
				await sql.unsafe(`DELETE FROM ${table}`);
				await sql.unsafe(
					`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1;`,
				);
			}
		} catch (error) {
			console.error(error);
		}

		await makeHttpRequest("POST", "/logout");
		clearCookieJar();
	});

	test("Homepage was retrieved successfully.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/",
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe("Homepage!");
	});

	test("Invalid path returned error.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/tods",
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(false);
		expect(body.message).toBe("Invalid route: GET /tods");
	});

	test("Todo was created.", async () => {
		await login();

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/todos",
			{
				title: "Test Todo",
				description: "This is a test todo",
				dueAt: createUTCDate(
					new Date(new Date().setDate(new Date().getDate() + 7)),
				),
				userId: 1,
			},
		);

		expect(statusCode).toBe(StatusCode.Created);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe("Todo created successfully!");
		expect(Object.keys(body.payload.todo).includes("id")).toBe(true);
		expect(Object.keys(body.payload.todo).includes("title")).toBe(true);
		expect(Object.keys(body.payload.todo).includes("description")).toBe(
			true,
		);
		expect(body.payload.todo.id).toBe(1);
		expect(body.payload.todo.title).toBe("Test Todo");
		expect(body.payload.todo.description).toBe("This is a test todo");
		expect(body.payload.todo.status).toBe("incomplete");
		expect(body.payload.todo.createdAt).not.toBeNull();
		expect(body.payload.todo.dueAt).not.toBeNull();
		expect(body.payload.todo.editedAt).toBeNull();
		expect(body.payload.todo.completedAt).toBeNull();
	});

	test("Todo was not created due to missing title.", async () => {
		await login();

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/todos",
			{
				description: "This is a test todo",
				dueAt: createUTCDate(
					new Date(new Date().setDate(new Date().getDate() + 7)),
				),
				userId: 1,
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe(
			"Request body must include title and description.",
		);
		expect(body.payload.todo).toBeUndefined();
	});

	test("Todo was not created by unauthenticated user.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/todos",
			{
				title: "Test Todo",
				description: "This is a test todo",
				dueAt: createUTCDate(
					new Date(new Date().setDate(new Date().getDate() + 7)),
				),
				userId: 1,
			},
		);

		expect(statusCode).toBe(StatusCode.Unauthorized);
		expect(body.message).toBe("Unauthorized");
	});

	test("Todo was retrieved.", async () => {
		await login();

		const todo = await createTodo();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			`/todos/${todo.props.id}`,
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Todo retrieved");
		expect(body.payload.todo.title).toBe(todo.props.title);
		expect(body.payload.todo.description).toBe(todo.props.description);
		expect(body.payload.todo.status).toBe(todo.props.status);
		expect(body.payload.todo.createdAt).toBe(
			todo.props.createdAt.toISOString(),
		);
		expect(body.payload.todo.dueAt).toBe(todo.props.dueAt?.toISOString());
		expect(body.payload.todo.editedAt).toBeNull();
		expect(body.payload.todo.completedAt).toBeNull();
	});

	test("Todo was not retrieved due to invalid ID.", async () => {
		await login();

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/todos/abc",
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Invalid ID");
	});

	test("Todo was not retrieved due to non-existent ID.", async () => {
		await login();

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/todos/1",
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(body.message).toBe("Not found");
	});

	test("Todo was not retrieved by unauthenticated user.", async () => {
		const todo = await createTodo();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			`/todos/${todo.props.id}`,
		);

		expect(statusCode).toBe(StatusCode.Unauthorized);
		expect(body.message).toBe("Unauthorized");
	});

	test("Todo was not retrieved by another user.", async () => {
		await createUser({
			email: "user1@email.com",
		});
		await createUser({
			email: "user2@email.com",
		});
		await login("user1@email.com");

		const todo = await createTodo();

		await makeHttpRequest("POST", "/logout");
		await login("user2@email.com");

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			`/todos/${todo.props.id}`,
		);

		expect(statusCode).toBe(StatusCode.Forbidden);
		expect(body.message).toBe("Forbidden");
	});

	test("Todo was updated.", async () => {
		await login();

		const todo = await createTodo();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/todos/${todo.props.id}`,
			{
				title: "Updated Test Todo",
			},
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Todo updated successfully!");
		expect(body.payload.todo.title).toBe("Updated Test Todo");
		expect(body.payload.todo.description).toBe(todo.props.description);
		expect(body.payload.todo.status).toBe(todo.props.status);
		expect(body.payload.todo.createdAt).toBe(
			todo.props.createdAt.toISOString(),
		);
		expect(body.payload.todo.dueAt).toBe(todo.props.dueAt?.toISOString());
		expect(body.payload.todo.editedAt).not.toBeNull();
		expect(body.payload.todo.completedAt).toBeNull();
	});

	test("Todo was deleted.", async () => {
		await login();

		const todo = await createTodo();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"DELETE",
			`/todos/${todo.props.id}`,
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Todo deleted successfully!");
	});

	test("Todo was marked as complete.", async () => {
		await login();

		const todo = await createTodo();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/todos/${todo.props.id}/complete`,
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Todo marked as complete!");
		expect(body.payload.todo.status).toBe("complete");
		expect(body.payload.todo.completedAt).not.toBeNull();
		expect(body.payload.todo.editedAt).not.toBe(todo.props.editedAt);
	});

	test("Todo was not marked as complete due to invalid ID.", async () => {
		await login();

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			"/todos/abc/complete",
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Invalid ID");
	});

	test("Todo was not marked as complete due to non-existent ID.", async () => {
		await login();

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			"/todos/1/complete",
		);

		expect(statusCode).toBe(StatusCode.NotFound);
		expect(body.message).toBe("Not found");
	});

	test("Todo was not marked as complete by unauthenticated user.", async () => {
		const todo = await createTodo();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/todos/${todo.props.id}/complete`,
		);

		expect(statusCode).toBe(StatusCode.Unauthorized);
		expect(body.message).toBe("Unauthorized");
	});

	test("Todo was not marked as complete by another user.", async () => {
		await createUser({
			email: "user1@example.com",
		});
		await createUser({
			email: "user2@example.com",
		});
		await login("user1@example.com");

		const todo = await createTodo();

		await makeHttpRequest("POST", "/logout");
		await login("user2@example.com");

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"PUT",
			`/todos/${todo.props.id}/complete`,
		);

		expect(statusCode).toBe(StatusCode.Forbidden);
		expect(body.message).toBe("Forbidden");
	});

	test("Todos were listed.", async () => {
		await login();

		const todo1 = await createTodo();
		const todo2 = await createTodo();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/todos",
		);

		expect(statusCode).toBe(StatusCode.OK);
		expect(body.message).toBe("Todo list retrieved");
		expect(body.payload.todos).toBeInstanceOf(Array);
		expect(body.payload.todos[0].title).toBe(todo1.props.title);
		expect(body.payload.todos[0].description).toBe(todo1.props.description);
		expect(body.payload.todos[0].status).toBe(todo1.props.status);
		expect(body.payload.todos[0].createdAt).toBe(
			todo1.props.createdAt.toISOString(),
		);
		expect(body.payload.todos[0].dueAt).toBe(
			todo1.props.dueAt?.toISOString(),
		);
		expect(body.payload.todos[0].editedAt).toBeNull();
		expect(body.payload.todos[0].completedAt).toBeNull();
		expect(body.payload.todos[1].title).toBe(todo2.props.title);
		expect(body.payload.todos[1].description).toBe(todo2.props.description);
		expect(body.payload.todos[1].status).toBe(todo2.props.status);
		expect(body.payload.todos[1].createdAt).toBe(
			todo2.props.createdAt.toISOString(),
		);
		expect(body.payload.todos[1].dueAt).toBe(
			todo2.props.dueAt?.toISOString(),
		);
		expect(body.payload.todos[1].editedAt).toBeNull();
		expect(body.payload.todos[1].completedAt).toBeNull();
	});

	test("Todos were not listed by unauthenticated user.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"GET",
			"/todos",
		);

		expect(statusCode).toBe(StatusCode.Unauthorized);
		expect(body.message).toBe("Unauthorized");
	});
});
