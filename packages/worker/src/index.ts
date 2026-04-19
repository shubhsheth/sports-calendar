import { Hono } from "hono";
import { cors } from "hono/cors";
import { nbaRoute } from "./routes/nba.ts";
import { nflRoute } from "./routes/nfl.ts";
import { f1Route } from "./routes/f1.ts";
import { iplRoute } from "./routes/ipl.ts";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.route("/calendar/nba.ics", nbaRoute);
app.route("/calendar/nfl.ics", nflRoute);
app.route("/calendar/f1.ics", f1Route);
app.route("/calendar/ipl.ics", iplRoute);

app.all("*", c => c.text("Not found", 404));

export default app;
