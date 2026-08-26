import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

const LoginRedirectPage = async () => {
  // =====================================================
  // RECUPERA A SESSÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  // =====================================================
  // USUÁRIO NÃO AUTENTICADO
  // =====================================================

  if (!session?.user?.id) {
    redirect("/login");
  }

  // =====================================================
  // BARBEIRO
  // =====================================================
  //
  // Se o usuário possuir role BARBER,
  // vai para o dashboard.
  // =====================================================

  if (session.user.role === "BARBER") {
    redirect("/barbeiro/dashboard");
  }

  // =====================================================
  // CLIENTE
  // =====================================================
  //
  // CUSTOMER volta para a página principal.
  // =====================================================

  redirect("/");
};

export default LoginRedirectPage;
