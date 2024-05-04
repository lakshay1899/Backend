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

//routes import

import userRouter from "./routes/user.routes.js";
// humne yha pr app.get nahi likha because humne yha router dia hai ab jaise hi   /api/v1/users/register dalega vo yha ayega or yha s userouter pr chala jayega and then vha jo bhi function hoga use run kr lega

app.use("/api/v1/users", userRouter);

export default app;
