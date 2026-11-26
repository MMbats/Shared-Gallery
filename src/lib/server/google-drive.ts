import "server-only";

import { google } from "googleapis";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth configuration is incomplete.");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

function getEncryptionKey() {
  const value = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY;

  if (!value) {
    throw new Error("Google Drive encryption key is missing.");
  }

  const key = Buffer.from(value, "base64");

  if (key.length !== 32) {
    throw new Error("Google Drive encryption key must be 32 bytes.");
  }

  return key;
}

export function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function decryptRefreshToken(value: string) {
  const parts = value.split(".");

  if (parts.length !== 3) {
    throw new Error("Stored Google token has an invalid format.");
  }

  const [ivPart, encryptedPart, tagPart] = parts;

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivPart, "base64url")
  );

  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createGoogleDriveClient(refreshToken: string) {
  const auth = createGoogleOAuthClient();

  auth.setCredentials({
    refresh_token: refreshToken,
  });

  return google.drive({
    version: "v3",
    auth,
  });
}
