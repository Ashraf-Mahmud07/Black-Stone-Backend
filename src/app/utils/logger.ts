/* eslint-disable no-console */
import config from '../config';

/**
 * Minimal structured logger. Kept dependency free on purpose - it writes one JSON line per
 * event so a hosting platform (Vercel) can index it, and stays quiet during tests.
 */

type TLogContext = Record<string, unknown>;

const write = (level: 'info' | 'warn' | 'error', message: string, context?: TLogContext): void => {
	if (config.NODE_ENV === 'test') return;

	const entry = JSON.stringify({ level, message, at: new Date().toISOString(), ...(context ?? {}) });
	if (level === 'error') console.error(entry);
	else if (level === 'warn') console.warn(entry);
	else console.log(entry);
};

const logger = {
	info: (message: string, context?: TLogContext) => write('info', message, context),
	warn: (message: string, context?: TLogContext) => write('warn', message, context),
	error: (message: string, context?: TLogContext) => write('error', message, context)
};

export default logger;
