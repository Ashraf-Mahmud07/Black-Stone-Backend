/* eslint-disable */

import app from './app';
import config from './app/config/index';
import seedSuperAdmin from './app/DB';
import connectToDatabase from './app/DB/connect';
import seedDevData from './app/DB/devSeed';

async function main() {
	try {
		await connectToDatabase();
		await seedSuperAdmin();

		// optional development data (categories, products, variants, reviews)
		if (config.seed_dev_data && config.NODE_ENV !== 'production') {
			await seedDevData();
		}

		app.listen(config.port, () => {
			console.log(`App running on port ${config.port}`);
			if (config.swagger.enabled) {
				console.log(`Swagger: ${config.swagger.path} | OpenAPI JSON: ${config.swagger.path}.json`);
			}
		});
	} catch (error) {
		console.log(error);
	}
}

main();
