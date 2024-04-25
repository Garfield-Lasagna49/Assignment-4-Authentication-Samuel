import postgres from "postgres";
import Request from "../router/Request";
import Response from "../router/Response";
import Router from "../router/Router";

/**
 * Controller for handling User CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class UserController {
	private sql: postgres.Sql<any>;

	constructor(sql: postgres.Sql<any>) {
		this.sql = sql;
	}

	registerRoutes(router: Router) {
		router.post("/users", this.createUser);

		// Any routes that include an `:id` parameter should be registered last.
	}

	/**
	 * TODO: Upon form submission, this controller method should
	 * validate that no fields are blank/missing, that the passwords
	 * match, and that there isn't already a user with the given email.
	 * If there are any errors, redirect back to the registration form
	 * with an error message.
	 * @param req
	 * @param res
	 */
	createUser = async (req: Request, res: Response) => {};
}
