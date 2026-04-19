import { z } from "zod";
import type {
  NbaEventFilters,
  NflEventFilters,
  F1EventFilters,
  IplEventFilters,
} from "@sports-calendar/shared";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const VALID_F1_TYPES = ["1", "2", "3", "4", "6"] as const;

const showPastEventsSchema = z
  .enum(["true", "false"])
  .optional()
  .transform(v => v !== "false");

const teamIdsSchema = z
  .string()
  .optional()
  .transform(v => (v ? v.split(",").filter(id => id.length > 0) : []));

const baseSchema = z.object({
  showPastEvents: showPastEventsSchema,
  teamIds: teamIdsSchema,
});

const f1Schema = z.object({
  showPastEvents: showPastEventsSchema,
  types: z
    .string()
    .optional()
    .transform(v =>
      v ? v.split(",").filter(t => t.length > 0) : [...VALID_F1_TYPES]
    )
    .refine(types => types.every(t => (VALID_F1_TYPES as readonly string[]).includes(t)), {
      message: `Invalid F1 session type. Valid types: ${VALID_F1_TYPES.join(", ")}`,
    }),
});

function safeParse<TSchema extends z.ZodTypeAny, TOut>(
  schema: TSchema,
  query: Record<string, string>
): ParseResult<TOut> {
  const result = schema.safeParse(query);
  if (result.success) return { ok: true, value: result.data as TOut };
  return { ok: false, error: result.error.errors[0]?.message ?? "Invalid params" };
}

export function parseNbaParams(
  query: Record<string, string>
): ParseResult<NbaEventFilters> {
  return safeParse(baseSchema, query);
}

export function parseNflParams(
  query: Record<string, string>
): ParseResult<NflEventFilters> {
  return safeParse(baseSchema, query);
}

export function parseF1Params(
  query: Record<string, string>
): ParseResult<F1EventFilters> {
  return safeParse(f1Schema, query);
}

export function parseIplParams(
  query: Record<string, string>
): ParseResult<IplEventFilters> {
  return safeParse(baseSchema, query);
}
