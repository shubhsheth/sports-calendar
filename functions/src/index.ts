import {
  onRequest,
  type Request as HttpsRequest,
} from "firebase-functions/v2/https";
import type { Response as ExpressResponse } from "express";
import { getRequestListener } from "@hono/node-server";
import { app } from "./app";

/**
 * The feed backend as a single Cloud Functions 2nd-gen HTTP function. Firebase
 * Hosting rewrites `/calendar/**` here (see firebase.json), so feeds share the
 * site's origin. `getRequestListener` adapts the Hono app's fetch handler to a
 * Node `(req, res)` listener, which is what `onRequest` invokes.
 */
const listener = getRequestListener(app.fetch);

export const calendar = onRequest(
  { region: "us-central1" },
  (req: HttpsRequest, res: ExpressResponse) => listener(req, res)
);
