/* eslint-disable no-console */
import mongoose from 'mongoose';
import config from './app/config';
import seedSuperAdmin from './app/DB';
import seedDevData from './app/DB/devSeed';

/**
 * Standalone seeding entry point: `pnpm seed`.
 * Creates the admin account, sample categories, products, variants, reviews and
 * delivery settings so a fresh environment is immediately usable.
 */
const run = async () => {
	try {
		await mongoose.connect(config.database_url as string);
		await seedSuperAdmin();
		await seedDevData();
		console.log('Seeding completed.');
		process.exit(0);
	} catch (error) {
		console.error('Seeding failed:', error);
		process.exit(1);
	}
};

run();
