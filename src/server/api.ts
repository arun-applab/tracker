import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/** Wraps a route handler: maps AppError / ZodError to JSON error responses. */
export async function handle<T>(fn: () => Promise<T>, status = 200) {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true }, { status });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
      return NextResponse.json({ error: `${path}${first?.message ?? "Invalid input"}` }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
