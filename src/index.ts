import cors from "cors";
import express from "express";

const app = express();

const allowlist = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const isVercel = (origin: string) =>
  /^https:\/\/[-a-z0-9]+\.vercel\.app$/i.test(origin);

app.use(
  cors({
    origin: (origin, cb) => {
      // curl / server-to-server では Origin が無いことがある
      if (!origin) return cb(null, true);

      if (allowlist.includes(origin) || isVercel(origin)) {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);