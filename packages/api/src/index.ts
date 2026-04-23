import { Hono } from "hono";
import { cors } from "hono/cors";
import { nbaRoute } from "./routes/nba";
import { nflRoute } from "./routes/nfl";
import { f1Route } from "./routes/f1";
import { iplRoute } from "./routes/ipl";

const app = new Hono();

app.use(cors({ origin: "*" }));

app.get("/calendar/nba.ics", nbaRoute);
app.get("/calendar/nfl.ics", nflRoute);
app.get("/calendar/f1.ics", f1Route);
app.get("/calendar/ipl.ics", iplRoute);

app.notFound(c => c.text("Not Found", 404));

export default app;
