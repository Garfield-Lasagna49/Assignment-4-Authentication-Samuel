import postgres from "postgres";
import Router from "../router/Router";
import Request from "../router/Request";
import Response from "../router/Response";

export default class AuthController {
	private sql: postgres.Sql<any>;

	constructor(sql: postgres.Sql<any>) {
		this.sql = sql;
	}

	registerRoutes(router: Router) {
		router.get("/register", this.getRegistrationForm);
		router.get("/login", this.getLoginForm);
		router.post("/login", this.login);
		router.get("/logout", this.logout);
	}

	/**
	 * TODO: Render the registration form.
	 */
	getRegistrationForm = async (req: Request, res: Response) => {};

	/**
	 * TODO: Render the login form.
	 */
	getLoginForm = async (req: Request, res: Response) => {};

	/**
	 * TODO: Handle login form submission.
	 */
	login = async (req: Request, res: Response) => {};

	/**
	 * TODO: Handle logout.
	 */
	logout = async (req: Request, res: Response) => {};
}
