/**
 * Vercel serverless entry point.
 *
 * Vercel runs this file as a function and hands it the raw request, so the Express
 * application is exported directly instead of calling `app.listen()`. Local development
 * still uses `src/server.ts`, which listens on a port.
 */
export { default } from '../src/app';
