import postgres from "postgres";

export interface UserProps {
	id?: number;
	email: string;
	password: string;
	createdAt: Date;
	editedAt?: Date;
}

export class DuplicateEmailError extends Error {
	constructor() {
		super("User with this email already exists.");
	}
}

export class InvalidCredentialsError extends Error {
	constructor() {
		super("Invalid credentials.");
	}
}

export default class User {
	constructor(
		private sql: postgres.Sql<any>,
		public props: UserProps,
	) {}

	/**
	 * TODO: Implement this method. It should insert a new
	 * row into the "users" table with the provided props.
	 */
	static async create(
		sql: postgres.Sql<any>,
		props: UserProps,
	): Promise<User> {}

	/**
	 * TODO: To "log in" a user, we need to check if the
	 * provided email and password match an existing row
	 * in the database. If they do, we return a new User instance.
	 */
	static async login(
		sql: postgres.Sql<any>,
		email: string,
		password: string,
	): Promise<User> {}
}
