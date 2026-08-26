import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { db } from "./prisma";

// =====================================================
// E-MAIL DO ÚNICO BARBEIRO
// =====================================================
// Somente este usuário terá acesso ao painel do barbeiro.
//
// Todos os demais usuários que entrarem pelo Google
// serão automaticamente cadastrados como CUSTOMER.
const BARBER_EMAIL = "rafael.spacovip26@gmail.com";

export const authOptions: AuthOptions = {
  // =====================================================
  // PRISMA
  // =====================================================
  // O NextAuth utiliza o Prisma para armazenar usuários,
  // contas Google, sessões etc.
  adapter: PrismaAdapter(db),

  // =====================================================
  // SESSÃO
  // =====================================================
  // Estamos utilizando JWT.
  //
  // O role será colocado dentro do token para que
  // possamos saber se o usuário é BARBER ou CUSTOMER.
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

      // Permite vincular uma conta Google a um usuário
      // existente com o mesmo e-mail.
      allowDangerousEmailAccountLinking: true,

      authorization: {
        params: {
          // Mostra a tela do Google para escolher
          // qual conta será utilizada.
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
      console.log("USER:", user);
      console.log("EMAIL:", user.email);
      console.log("=================================");

      // -------------------------------------------------
      // Verifica se o Google retornou um e-mail.
      // -------------------------------------------------
      if (!user.email) {
        console.log("LOGIN NEGADO: usuário sem e-mail.");
        return false;
      }

      // -------------------------------------------------
      // REGRA DE ACESSO
      // -------------------------------------------------
      //
      // Rafael:
      //     BARBER
      //
      // Qualquer outro usuário:
      //     CUSTOMER
      //
      const role =
        user.email.toLowerCase() === BARBER_EMAIL.toLowerCase()
          ? "BARBER"
          : "CUSTOMER";

      // -------------------------------------------------
      // Atualiza o papel do usuário no banco.
      // -------------------------------------------------
      //
      // Isso é importante porque novos usuários criados
      // pelo Google receberão CUSTOMER automaticamente.
      //
      // Se for Rafael, garantimos BARBER.
      // -------------------------------------------------
      await db.user.update({
        where: {
          id: user.id,
        },
        data: {
          role,
        },
      });

      console.log("ROLE DEFINIDA:", role);

      return true;
    },

    // ===================================================
    // JWT
    // ===================================================
    async jwt({ token, user }) {
      console.log("JWT CALLBACK");

      console.log("USER ID:", user?.id);
      console.log("USER ROLE:", user?.role);

      console.log("TOKEN ID:", token.sub);
      console.log("TOKEN ROLE:", token.role);

      // -------------------------------------------------
      // PRIMEIRO LOGIN
      // -------------------------------------------------
      //
      // Quando o usuário entra pela primeira vez,
      // colocamos o role no JWT.
      // -------------------------------------------------
      if (user) {
        token.role = user.role;
      }

      return token;
    },

    // ===================================================
    // SESSION
    // ===================================================
    async session({ session, token }) {
      console.log("SESSION CALLBACK");

      if (session.user) {
        // ID do usuário
        session.user.id = token.sub!;

        // Papel do usuário
        session.user.role = token.role!;
      }

      return session;
    },

    // ===================================================
    // REDIRECT
    // ===================================================
    async redirect({ url, baseUrl }) {
      // Mantém URLs internas da aplicação.
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Caso contrário, retorna para a página inicial.
      return baseUrl;
    },
  },
};
