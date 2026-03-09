import { google, Auth } from 'googleapis';
import { config } from '../config.js';

let cachedAuth: Auth.OAuth2Client | null = null;

/**
 * Returns an authenticated OAuth2 client using stored refresh token.
 * Throws if credentials are not configured.
 */
export function getAuthClient() {
  if (cachedAuth) return cachedAuth;

  const clientId = config.GOOGLE_CLIENT_ID;
  const clientSecret = config.GOOGLE_CLIENT_SECRET;
  const refreshToken = config.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Google OAuth2 not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  cachedAuth = oauth2Client;
  return oauth2Client;
}

/**
 * Check if Google OAuth2 is configured.
 */
export function isGoogleConfigured(): boolean {
  return !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_REFRESH_TOKEN);
}
