import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        if (path.startsWith("/dashboard/admin") && token?.role !== "ADMIN" && token?.role !== "TEACHER") {
            return NextResponse.redirect(new URL("/dashboard/student", req.url));
        }

        if (path === "/dashboard/student" && (token?.role === "ADMIN" || token?.role === "TEACHER")) {
            return NextResponse.redirect(new URL("/dashboard/admin", req.url));
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*"],
};
