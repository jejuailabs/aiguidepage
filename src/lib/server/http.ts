import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { PortalError } from "./errors.ts";
import {verifyMutation} from './csrf.ts';

export function assertMutation(request: NextRequest) {
  verifyMutation(request);
}
export async function jsonBody(request: NextRequest) {
  const body = await request.text();
  if (body.length > 100000) throw new PortalError("invalid", 413);
  try {
    return JSON.parse(body);
  } catch {
    throw new PortalError("invalid");
  }
}
export function failure(error: unknown) {
  if (error instanceof PortalError)
    return NextResponse.json(
      { error: error.code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof ZodError)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  console.error(
    "Portal operation failed. Check server configuration and service availability.",
  );
  return NextResponse.json({ error: "unavailable" }, { status: 503 });
}
export function result(data: unknown) {
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
