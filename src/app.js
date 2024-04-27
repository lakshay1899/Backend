import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
//cors cross -origin to set who can send req //
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
// used for json data
app.use(express.json({ limit: "16kb" }));
// used for url to fetch info from url
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));
// to fetch data from cookies in browser
app.use(cookieParser());
export default app;
