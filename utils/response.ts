import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status, headers: corsHeaders });
}

export function errorResponse(message: string, status = 400, errors?: unknown) {
  return NextResponse.json({ success: false, message, ...(errors ? { errors } : {}) }, { status, headers: corsHeaders });
}

function errorText(error: unknown) {
  if (!error) return "";

  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message, error.name, error.stack || "");
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["code", "errno", "syscall", "cause"]) {
      const value = record[key];
      if (typeof value === "string") parts.push(value);
      if (value instanceof Error) parts.push(value.message, value.name);
    }
  }

  if (typeof error === "string") parts.push(error);
  return parts.join(" ").toLowerCase();
}

export function isNetworkError(error: unknown) {
  const text = errorText(error);

  return [
    "p1001",
    "p1002",
    "p1008",
    "can't reach database server",
    "could not connect",
    "connection refused",
    "connection terminated",
    "connection timeout",
    "connect etimedout",
    "econnrefused",
    "enotfound",
    "etimedout",
    "eai_again",
    "fetch failed",
    "failed to fetch",
    "getaddrinfo",
    "network",
    "socket",
    "timeout",
  ].some((needle) => text.includes(needle));
}

export function serverErrorResponse(error: unknown) {
  if (isNetworkError(error)) {
    return errorResponse("No internet connection", 503);
  }

  return errorResponse("Internal server error", 500);
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }, { headers: corsHeaders });
}
