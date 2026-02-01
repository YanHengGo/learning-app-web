import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAllowedOrigin,
  CORS_METHODS,
  CORS_ALLOWED_HEADERS,
} from "@/lib/cors";

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? null;
  const allowedOrigin = origin !== null ? getAllowedOrigin(origin) : null;

  // Origin present but not in allowlist → block
  if (origin !== null && allowedOrigin === null) {
    return new NextResponse("Not allowed by CORS", { status: 403 });
  }

  const corsHeaders: Record<string, string> = {};
  if (allowedOrigin) {
    corsHeaders["Access-Control-Allow-Origin"] = allowedOrigin;
    corsHeaders["Access-Control-Allow-Methods"] = CORS_METHODS;
    corsHeaders["Access-Control-Allow-Headers"] = CORS_ALLOWED_HEADERS;
  }

  // Preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}
