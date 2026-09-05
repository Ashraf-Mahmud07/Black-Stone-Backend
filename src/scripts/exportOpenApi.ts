/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { countOperations, openApiDocument } from '../app/docs/openapi';

/**
 * Writes the OpenAPI document to `docs/openapi.json` (`pnpm swagger:json`).
 * Useful for Postman/Insomnia imports, client generators and CI contract checks.
 */
const run = (): void => {
	const target = path.join(process.cwd(), 'docs', 'openapi.json');
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, `${JSON.stringify(openApiDocument, null, 2)}\n`);
	console.log(`OpenAPI document written to ${target} (${countOperations()} operations).`);
};

run();
