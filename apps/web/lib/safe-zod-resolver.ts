import type { FieldErrors, FieldValues, Resolver, ResolverResult } from "react-hook-form";

export interface ZodLikeSchema {
  safeParse?: (input: unknown) => any;
  safeParseAsync?: (input: unknown) => Promise<any>;
  parse?: (input: unknown) => any;
  parseAsync?: (input: unknown) => Promise<any>;
}

/**
 * Universal safe resolver for React Hook Form.
 * Works seamlessly with Zod 3 and Zod 4 across bundlers, preventing unhandled
 * promise rejections (`Uncaught (in promise) ZodError`) when validation fails.
 */
export function safeZodResolver<TFieldValues extends FieldValues = FieldValues>(
  schema: ZodLikeSchema | any,
): Resolver<TFieldValues> {
  return async (values: TFieldValues): Promise<ResolverResult<TFieldValues>> => {
    try {
      const result =
        typeof schema?.safeParseAsync === "function"
          ? await schema.safeParseAsync(values)
          : typeof schema?.safeParse === "function"
            ? schema.safeParse(values)
            : { success: true, data: values };

      if (result?.success) {
        return {
          values: result.data as TFieldValues,
          errors: {},
        };
      }

      const issues = result?.error?.issues ?? result?.error?.errors ?? [];
      const errors: FieldErrors<TFieldValues> = {};

      if (Array.isArray(issues) && issues.length > 0) {
        for (const issue of issues) {
          const field =
            Array.isArray(issue.path) && issue.path.length > 0
              ? (String(issue.path[0]) as keyof TFieldValues)
              : ("root" as keyof TFieldValues);

          if (!errors[field]) {
            (errors as Record<string, any>)[field as string] = {
              type: issue.code || "validation",
              message: issue.message || "Invalid input",
            };
          }
        }
      } else if (result?.error?.message) {
        (errors as Record<string, any>).root = {
          type: "validation",
          message: result.error.message,
        };
      }

      return {
        values: {} as Record<string, never>,
        errors,
      };
    } catch (caught: any) {
      // Always catch any unexpected throw and translate to FieldErrors
      const issues = caught?.issues ?? caught?.errors ?? [];
      const errors: FieldErrors<TFieldValues> = {};

      if (Array.isArray(issues) && issues.length > 0) {
        for (const issue of issues) {
          const field =
            Array.isArray(issue.path) && issue.path.length > 0
              ? (String(issue.path[0]) as keyof TFieldValues)
              : ("root" as keyof TFieldValues);

          if (!errors[field]) {
            (errors as Record<string, any>)[field as string] = {
              type: issue.code || "validation",
              message: issue.message || "Invalid input",
            };
          }
        }
      } else {
        (errors as Record<string, any>).root = {
          type: "validation",
          message: caught?.message || "Validation failed",
        };
      }

      return {
        values: {} as Record<string, never>,
        errors,
      };
    }
  };
}
