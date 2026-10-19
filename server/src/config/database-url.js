export const buildDatabaseUrl = (databaseUrl, isProduction) => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (!isProduction) return databaseUrl;

  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
  }

  parsedUrl.searchParams.set('connection_limit', '20');
  return parsedUrl.toString();
};
