import Todo, { TodoProps } from "../models/Todo";
import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import { createUTCDate } from "../utils";

/**
 * Controller for handling Todo CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class TodoController {
	private sql: postgres.Sql<any>;

	constructor(sql: postgres.Sql<any>) {
		this.sql = sql;
	}

	/**
	 * To register a route, call the corresponding method on
	 * the router instance based on the HTTP method of the route.
	 *
	 * @param router Router instance to register routes on.
	 *
	 * @example router.get("/todos", this.getTodoList);
	 */
	registerRoutes(router: Router) {
		router.get("/todos", this.getTodoList);
		router.get("/todos/new", this.getNewTodoForm);
		router.post("/todos", this.createTodo);

		// Any routes that include an `:id` parameter should be registered last.
		router.get("/todos/:id/edit", this.getEditTodoForm);
		router.get("/todos/:id", this.getTodo);
		router.put("/todos/:id", this.updateTodo);
		router.delete("/todos/:id", this.deleteTodo);
		router.put("/todos/:id/complete", this.completeTodo);
	}

	getNewTodoForm = async (req: Request, res: Response) => {
		await res.send({
			statusCode: StatusCode.OK,
			message: "New todo form",
			template: "NewFormView",
			payload: { title: "New Todo" },
		});
	};

	getEditTodoForm = async (req: Request, res: Response) => {
		const id = req.getId();
		let todo: Todo | null = null;

		try {
			todo = await Todo.read(this.sql, id);
		} catch (error) {
			const message = `Error while getting todo list: ${error}`;
			console.error(message);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Edit todo form",
			template: "EditFormView",
			payload: { todo: todo?.props, title: "Edit Todo" },
		});
	};

	/**
	 * This method should be called when a GET request is made to /todos.
	 * It should retrieve all todos from the database and send them as a response.
	 *
	 * @param req The request object.
	 * @param res The response object.
	 *
	 * @example GET /todos
	 */
	getTodoList = async (req: Request, res: Response) => {
		let todos: Todo[] = [];

		try {
			// This will be broken until you implement users since it now requires a user ID.
			todos = await Todo.readAll(this.sql);
		} catch (error) {
			const message = `Error while getting todo list: ${error}`;
			console.error(message);
		}

		const todoList = todos.map((todo) => {
			return {
				...todo.props,
				isComplete: todo.props.status === "complete",
			};
		});

		await res.send({
			statusCode: StatusCode.OK,
			message: "Todo list retrieved",
			payload: {
				title: "Todo List",
				todos: todoList,
			},
			template: "ListView",
		});
	};

	/**
	 * This method should be called when a GET request is made to /todos/:id.
	 * It should retrieve a single todo from the database and send it as a response.
	 *
	 * @param req The request object.
	 * @param res The response object.
	 *
	 * @example GET /todos/1
	 */
	getTodo = async (req: Request, res: Response) => {
		const id = req.getId();
		let todo: Todo | null = null;

		try {
			todo = await Todo.read(this.sql, id);
		} catch (error) {
			const message = `Error while getting todo list: ${error}`;
			console.error(message);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Todo retrieved",
			template: "ShowView",
			payload: {
				todo: todo?.props,
				title: todo?.props.title,
				isComplete: todo?.props.status === "complete",
			},
		});
	};

	/**
	 * This method should be called when a POST request is made to /todos.
	 * It should create a new todo in the database and send it as a response.
	 *
	 * @param req The request object.
	 * @param res The response object.
	 *
	 * @example POST /todos { "title": "New Todo", "description": "A new todo" }
	 */
	createTodo = async (req: Request, res: Response) => {
		let todo: Todo | null = null;

		// This will be broken until you implement users since it now requires a user ID.
		let todoProps: TodoProps = {
			title: req.body.title,
			description: req.body.description,
			status: "incomplete",
			createdAt: createUTCDate(),
		};

		try {
			todo = await Todo.create(this.sql, todoProps);
		} catch (error) {
			console.error("Error while creating todo:", error);
		}

		await res.send({
			statusCode: StatusCode.Created,
			message: "Todo created successfully!",
			payload: { todo: todo?.props },
			redirect: `/todos/${todo?.props.id}`,
		});
	};

	/**
	 * This method should be called when a PUT request is made to /todos/:id.
	 * It should update an existing todo in the database and send it as a response.
	 *
	 * @param req The request object.
	 * @param res The response object.
	 *
	 * @example PUT /todos/1 { "title": "Updated title" }
	 * @example PUT /todos/1 { "description": "Updated description" }
	 * @example PUT /todos/1 { "title": "Updated title", "dueAt": "2022-12-31" }
	 */
	updateTodo = async (req: Request, res: Response) => {
		const id = req.getId();
		const todoProps: Partial<TodoProps> = {};

		if (req.body.title) {
			todoProps.title = req.body.title;
		}

		if (req.body.description) {
			todoProps.description = req.body.description;
		}

		let todo: Todo | null = null;

		try {
			todo = await Todo.read(this.sql, id);
		} catch (error) {
			console.error("Error while updating todo:", error);
		}

		try {
			await todo?.update(todoProps);
		} catch (error) {
			console.error("Error while updating todo:", error);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Todo updated successfully!",
			payload: { todo: todo?.props },
			redirect: `/todos/${id}`,
		});
	};

	/**
	 * This method should be called when a DELETE request is made to /todos/:id.
	 * It should delete an existing todo from the database.
	 *
	 * @param req The request object.
	 * @param res The response object.
	 *
	 * @example DELETE /todos/1
	 */
	deleteTodo = async (req: Request, res: Response) => {
		const id = req.getId();
		let todo: Todo | null = null;

		try {
			todo = await Todo.read(this.sql, id);
		} catch (error) {
			console.error("Error while deleting todo:", error);
		}

		try {
			await todo?.delete();
		} catch (error) {
			console.error("Error while deleting todo:", error);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Todo deleted successfully!",
			payload: { todo: todo?.props },
			redirect: "/todos",
		});
	};

	/**
	 * This method should be called when a PUT request is made to /todos/:id/complete.
	 * It should mark an existing todo as complete in the database and send it as a response.
	 *
	 * @param req The request object.
	 * @param res The response object.
	 *
	 * @example PUT /todos/1/complete
	 */
	completeTodo = async (req: Request, res: Response) => {
		const id = req.getId();
		let todo: Todo | null = null;

		try {
			todo = await Todo.read(this.sql, id);
		} catch (error) {
			console.error("Error while marking todo as complete:", error);
		}

		try {
			await todo?.markComplete();
		} catch (error) {
			console.error("Error while marking todo as complete:", error);
		}

		await res.send({
			statusCode: StatusCode.OK,
			message: "Todo marked as complete!",
			payload: { todo: todo?.props },
			redirect: `/todos/${id}`,
		});
	};
}
