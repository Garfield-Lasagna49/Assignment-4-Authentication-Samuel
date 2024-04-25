import postgres from "postgres";
import Todo, { TodoProps } from "../src/models/Todo";
import { test, describe, expect, afterEach, beforeEach } from "vitest";
import { createUTCDate } from "../src/utils";
import User, { UserProps } from "../src/models/User";

describe("Todo CRUD operations", () => {
	// Set up the connection to the DB.
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
	});

	test("Todo was created.", async () => {
		// Create a new todo.
		const todo = await createTodo({ title: "Test Todo 2" });

		// Check if the title, description, and status of the created todo are as expected.
		expect(todo.props.title).toBe("Test Todo 2");
		expect(todo.props.description).toBe("This is a test todo");
		expect(todo.props.status).toBe("incomplete");
	});

	test("Todo was retrieved.", async () => {
		// Create a new todo.
		const todo = await createTodo();

		/**
		 * ! is a non-null assertion operator. It tells TypeScript that the value is not null or undefined.
		 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator
		 */
		const readTodo = await Todo.read(sql, todo.props.id!);

		/**
		 * Check if the title, description, and status of the read todo are as expected.
		 * ?. is the optional chaining operator. It allows reading the value of a property
		 * located deep within a chain of connected objects without having to expressly validate that each reference in the chain is valid.
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
		 */
		expect(readTodo?.props.title).toBe("Test Todo");
		expect(readTodo?.props.description).toBe("This is a test todo");
		expect(readTodo?.props.status).toBe("incomplete");
	});

	test("Todos were listed.", async () => {
		// Create a new todo.
		const todo1 = await createTodo();
		const todo2 = await createTodo();
		const todo3 = await createTodo();

		// List all the todos from the database.
		const todos = await Todo.readAll(sql, 1);

		// Check if the created todo is in the list of todos.
		expect(todos).toBeInstanceOf(Array);
		expect(todos).toContainEqual(todo1);
		expect(todos).toContainEqual(todo2);
		expect(todos).toContainEqual(todo3);
	});

	test("Todos were listed by status.", async () => {
		// Create a new todo.
		const todo1 = await createTodo();
		const todo2 = await createTodo({ status: "complete" });
		const todo3 = await createTodo();

		// List all the incomplete todos from the database.
		const incompleteTodos = await Todo.readAll(sql, 1, {
			status: "incomplete",
		});

		// Check if the created todo is in the list of incomplete todos.
		expect(incompleteTodos).toBeInstanceOf(Array);
		expect(incompleteTodos).toContainEqual(todo1);
		expect(incompleteTodos).toContainEqual(todo3);

		// List all the complete todos from the database.
		const completeTodos = await Todo.readAll(sql, 1, {
			status: "complete",
		});

		// Check if the created todo is in the list of complete todos.
		expect(completeTodos).toBeInstanceOf(Array);
		expect(completeTodos).toContainEqual(todo2);
	});

	test("Todo was updated.", async () => {
		// Create a new todo.
		const todo = await createTodo();

		// Update the todo in the database.
		await todo.update({ title: "Updated Test Todo" });

		// Read the updated todo from the database.
		const updatedTodo = await Todo.read(sql, todo.props.id!);

		// Check if the title of the updated todo is as expected.
		expect(updatedTodo).not.toBeNull();
		expect(updatedTodo?.props.title).toBe("Updated Test Todo");
	});

	test("Todo was deleted.", async () => {
		// Create a new todo.
		const todo = await createTodo();

		// Delete the todo from the database.
		await todo.delete();

		// Read the deleted todo from the database.
		const deletedTodo = await Todo.read(sql, todo.props.id!);

		// Check if the deleted todo is null.
		expect(deletedTodo).toBeNull();
	});

	test("Todo was marked as complete.", async () => {
		// Create a new todo.
		const todo = await createTodo();

		// Check if the status of the todo is incomplete.
		expect(todo.props.status).toBe("incomplete");

		// Mark the todo as complete.
		await todo.markComplete();

		// Read the completed todo from the database.
		const completedTodo = await Todo.read(sql, todo.props.id!);

		// Check if the status of the todo is complete.
		expect(completedTodo?.props.status).toBe("complete");
	});
});
