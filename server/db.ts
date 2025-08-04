// DISABLED - Using Azure Table Storage exclusively, no PostgreSQL
// This file is kept for compatibility but all functions throw errors

export const pool = null;
export const db = null;

// If anyone tries to use this, they'll get a clear error
console.warn("PostgreSQL database connection disabled - using Azure Table Storage exclusively");