import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";

export interface ZodIssueLike {
  path?: (string | number)[];
  message?: string;
  code?: string;
}

export interface ZodErrorLike {
  issues?: ZodIssueLike[];
  errors?: ZodIssueLike[];
  message?: string;
}

export interface ZodLikeSchema<T> {
  safeParse: (
    input: unknown,
  ) => { success: true; data: T } | { success: false; error: ZodErrorLike };
  safeParseAsync?: (
    input: unknown,
  ) => Promise<{ success: true; data: T } | { success: false; error: ZodErrorLike }>;
}

/**
 * Universal safe resolver for React Hook Form.
 * Works seamlessly with Zod 3 and Zod 4 across bundlers, preventing unhandled
 * promise rejections (`Uncaught (in promise) ZodError`) when validation fails.
 */
export function safeZodResolver<TFieldValues extends FieldValues>(
  schema: ZodLikeSchema<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values) => {
    try {
      const result =
        typeof schema.safeParseAsync === "function"
          ? await schema.safeParseAsync(values)
          : schema.safeParse(values);

      if (result.success) {
        return {
          values: result.data as TFieldValues,
          errors: {},
        };
      }

      const issues = result.error?.issues ?? result.error?.errors ?? [];
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
      } else if (result.error?.message) {
        (errors as Record<string, any>).root = {
          type: "validation",
          message: result.error.message,
        };
      }

      return {
        values: {} as TFieldValues,
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
        values: {} as TFieldValues,
        errors,
      };
    }
  };
}
