import { Db } from "mongodb";
import { createApp, ExpressApp } from "../../app";
import { createTestDependencies } from "./test-dependencies";
import { createTestDb } from "./test-db";
import { MongoMemoryServer } from "mongodb-memory-server";

export type TestApp = ExpressApp & {
    locals: {
        db: Db;
        mongoServer: MongoMemoryServer;
    };
};

/**
 * Creates the Express application mounting a test db server in memory.
 * - When done with the test application, it should be unmounted using `unmountTestApp`.
 * - The test dependencies are accesible via `app.locals.dependencies`.
 * - It does not use any API prefix for the routes, so they can be accessed at the root level.
 * @returns The created Express application for testing.
 */
export const mountTestApp = async () => {
    const { db, mongoServer } = await createTestDb();
    const app = createApp(createTestDependencies(db), { apiPrefix: '' })
    app.locals.db = db;
    app.locals.mongoServer = mongoServer;
    return app as TestApp;
}

/**
 * Unmounts the test application by dropping the test database, closing the connection and stopping the in-memory server.
 * @param app 
 */
export const unmountTestApp = async (app: TestApp) => {
    if (app.locals.db) {
        await app.locals.db.dropDatabase();
        await app.locals.db.client.close();
    }
    if (app.locals.mongoServer) {
        await app.locals.mongoServer.stop();
    }
}