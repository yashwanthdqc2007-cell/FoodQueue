import { NextResponse } from "next/server";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      data,
      error: null,
    },
    { status }
  );
}

export function errorResponse(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiResponse<null>>(
    {
      data: null,
      error: {
        code,
        message,
        details: details ?? null,
      },
    },
    { status }
  );
}
