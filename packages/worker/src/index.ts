import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.get("/calendar/nba.ics", c => c.text("Not implemented", 501));
app.get("/calendar/nfl.ics", c => c.text("Not implemented", 501));
app.get("/calendar/f1.ics", c => c.text("Not implemented", 501));
app.get("/calendar/ipl.ics", c => c.text("Not implemented", 501));

export default app;
