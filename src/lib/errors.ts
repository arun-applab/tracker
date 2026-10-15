export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new AppError(401, "You need to sign in.");
export const forbidden = (msg = "You don't have permission to do that.") => new AppError(403, msg);
export const notFound = (what = "Not found") => new AppError(404, what);
export const badRequest = (msg: string) => new AppError(400, msg);
