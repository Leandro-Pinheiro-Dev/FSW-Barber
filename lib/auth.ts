import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { db } from "./prisma";

// =====================================================
// E-MAIL DO ÚNICO BARBEIRO
// =====================================================

const BARBER_EMAIL =
  "[rafael.spacovip26@gmail.com](mailto:rafael.spacovip26@gmail.com)";

// =====================================================
// CONFIGURAÇÃO DO NEXTAUTH
// =====================================================

export const authOptions: AuthOptions = {
  // =====================================================
  // PRISMA ADAPTER
  // =====================================================

  adapter: PrismaAdapter(db),

  // =====================================================
  // SESSÃO
  // =====================================================

  session: {
    strategy: "jwt",
  },

  // =====================================================
  // GOOGLE
  // =====================================================

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,

      // Permite vincular a conta Google a um usuário
      // existente com o mesmo e-mail.
      allowDangerousEmailAccountLinking: true,

      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],

  // =====================================================
  // CALLBACKS
  // =====================================================

  callbacks: {
    // ===================================================
    // SIGN IN
    // ===================================================

    async signIn({ user }) {
      console.log("=================================");
      console.log("GOOGLE LOGIN");
      console.log("USER ID:", user.id);
      console.log("EMAIL:", user.email);
      console.log("=================================");

      // -------------------------------------------------
      // Verifica o e-mail
      // -------------------------------------------------

      if (!user.email) {
        console.log("LOGIN NEGADO: usuário sem e-mail.");
        return false;
      }

      const email = user.email.toLowerCase();

      // -------------------------------------------------
      // BARBEIRO
      // -------------------------------------------------

      if (email === BARBER_EMAIL.toLowerCase()) {
        console.log("USUÁRIO IDENTIFICADO COMO BARBEIRO");

        // Procuramos pelo e-mail, e não pelo user.id
        // retornado pelo callback.
        const barber = await db.user.findUnique({
          where: {
            email: user.email,
          },
          select: {
            id: true,
            role: true,
          },
        });

        // Se o usuário já existir, garantimos BARBER.
        if (barber) {
          await db.user.update({
            where: {
              email: user.email,
            },
            data: {
              role: "BARBER",
              needsRoleSelection: false,
            },
          });

          console.log("BARBER ATUALIZADO:", barber.id);
        }

        return true;
      }

      // -------------------------------------------------
      // CLIENTE
      // -------------------------------------------------

      //
      // Usuários normais permanecem CUSTOMER.
      //
      // O schema já possui:
      //
      // role @default(CUSTOMER)
      //
      // Portanto não precisamos fazer update aqui.
      //

      console.log("USUÁRIO IDENTIFICADO COMO CUSTOMER");

      return true;
    },

    // ===================================================
    // JWT
    // ===================================================

    async jwt({ token, user }) {
      console.log("=================================");
      console.log("JWT CALLBACK");
      console.log("TOKEN SUB:", token.sub);
      console.log("TOKEN ROLE:", token.role);
      console.log("USER ID:", user?.id);
      console.log("USER EMAIL:", user?.email);
      console.log("=================================");

      // -------------------------------------------------
      // PRIMEIRO LOGIN
      // -------------------------------------------------

      if (user?.email) {
        const dbUser = await db.user.findUnique({
          where: {
            email: user.email,
          },
          select: {
            id: true,
            role: true,
          },
        });

        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;

          console.log("USUÁRIO ENCONTRADO NO BANCO");
          console.log("ID:", dbUser.id);
          console.log("ROLE:", dbUser.role);
        } else {
          console.log("USUÁRIO AINDA NÃO ENCONTRADO NO BANCO");
        }
      }

      // -------------------------------------------------
      // REQUISIÇÕES POSTERIORES
      // -------------------------------------------------

      if (token.sub && !token.role) {
        const dbUser = await db.user.findUnique({
          where: {
            id: token.sub,
          },
          select: {
            role: true,
          },
        });

        if (dbUser) {
          token.role = dbUser.role;

          console.log("ROLE RECUPERADA DO BANCO:", dbUser.role);
        }
      }

      console.log("TOKEN FINAL:");
      console.log("SUB:", token.sub);
      console.log("ROLE:", token.role);

      return token;
    },

    // ===================================================
    // SESSION
    // ===================================================

    async session({ session, token }) {
      console.log("=================================");
      console.log("SESSION CALLBACK");
      console.log("TOKEN SUB:", token.sub);
      console.log("TOKEN ROLE:", token.role);
      console.log("=================================");

      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "CUSTOMER" | "BARBER";
      }

      return session;
    },

    // ===================================================
    // REDIRECT
    // ===================================================

    async redirect({ url, baseUrl }) {
      console.log("=================================");
      console.log("REDIRECT CALLBACK");
      console.log("URL:", url);
      console.log("BASE URL:", baseUrl);
      console.log("=================================");

      if (url.startsWith(baseUrl)) {
        return url;
      }

      return baseUrl;
    },
  },
};
