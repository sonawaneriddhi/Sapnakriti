import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { loginSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

// Auth.js's Credentials provider only works with JWT sessions. The JWT carries the
// user id; anything security-critical (admin access) is re-checked against the
// database via requireAdmin() so a demoted admin loses access immediately.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Throttle repeated guesses against one account (per server instance).
        if (!rateLimit(`login:${email}`, 8, 15 * 60 * 1000)) return null;

        await connectDB();
        const user = await User.findOne({ email }).select("+passwordHash");
        if (!user) {
          // Burn comparable time so response timing doesn't reveal which emails exist.
          await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuuAbCdEfGhIjKlMnOpQrStUvWxYz012345");
          return null;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "customer";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = (token.role as "customer" | "admin") ?? "customer";
      return session;
    },
  },
});
