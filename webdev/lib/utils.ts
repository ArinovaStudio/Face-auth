import { z } from "zod";

export const formatZodErrors = (error: unknown) => {
  if (!(error instanceof z.ZodError)) {
    return { _error: "Invalid request data" };
  }

  const errors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0];
    if (field) {
      errors[field as string] = issue.message;
    }
  });

  return errors;
};
