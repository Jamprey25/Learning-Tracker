#!/usr/bin/env node
/**
 * One-time OAuth setup: opens a browser (or prints a URL) to authorize YouTube read-only access,
 * then prints a refresh token to add to `.env` as YOUTUBE_REFRESH_TOKEN.
 *
 * Prereqs in Google Cloud Console:
 * - Enable "YouTube Data API v3"
 * - OAuth client: "Desktop app" or "Web" with redirect URI exactly:
 *   http://127.0.0.1:8765/oauth2callback
 *
 * Usage (from project root):
 *   node scripts/youtube-oauth-setup.mjs
 *
 * Requires in `.env`: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const REDIRECT = "http://127.0.0.1:8765/oauth2callback";
const PORT = 8765;

const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env (create an OAuth client in Google Cloud).",
  );
  process.exit(1);
}

function openBrowser(url) {
  const bin = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  const child =
    process.platform === "win32"
      ? spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true })
      : spawn(bin, [url], { stdio: "ignore", detached: true });
  child.unref();
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");

  if (err) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<p>Authorization error: ${err}</p>`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Missing code.</p>");
    server.close();
    process.exit(1);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokenJson = await tokenRes.json();

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  if (!tokenRes.ok) {
    res.end(`<p>Token exchange failed: ${JSON.stringify(tokenJson)}</p>`);
    server.close();
    process.exit(1);
  }

  const refresh = tokenJson.refresh_token;
  if (!refresh) {
    res.end(
      "<p>No refresh_token returned. Revoke app access in Google Account settings and run again with prompt=consent (this script already sets that).</p>",
    );
    server.close();
    process.exit(1);
  }

  console.log("\n--- Add this line to your .env ---\n");
  console.log(`YOUTUBE_REFRESH_TOKEN="${refresh}"`);
  console.log("\n--- Also set a strong SYNC_SECRET for API routes (cron / push-links) ---\n");

  res.end(
    "<p>Success. You can close this tab. Check the terminal for <code>YOUTUBE_REFRESH_TOKEN</code>.</p>",
  );
  server.close();
  process.exit(0);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\nOpen this URL in your browser (or it may open automatically):\n");
  console.log(authUrl.toString());
  console.log("");
  try {
    openBrowser(authUrl.toString());
  } catch {
    // ignore
  }
});
