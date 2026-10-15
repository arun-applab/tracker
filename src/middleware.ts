import { withAuth } from "next-auth/middleware";

// Every page requires a session. API routes do their own 401/403 checks.
export default withAuth({ pages: { signIn: "/login" } });

export const config = {
  matcher: ["/((?!api|login|fonts|_next/static|_next/image|favicon.ico|.*\\.(?:woff2?|png|jpg|jpeg|svg|ico|webp|txt|js)$).*)"],
};
