import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pedidos del día — Acceso" },
      { name: "description", content: "Acceso al reporte diario de pedidos programados." },
      { property: "og:title", content: "Pedidos del día — Acceso" },
      { property: "og:description", content: "Consulta los pedidos programados del día." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/pedidos-del-dia" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/pedidos-del-dia" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Te enviamos un enlace de acceso a tu correo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de acceso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="relative flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Truck className="size-5" /></span>
          Pedidos programados
        </div>
        <div className="relative">
          <h1 className="font-display text-5xl font-extrabold leading-tight">
            Cada pedido,<br /><span className="text-sidebar-primary">a tiempo.</span>
          </h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">
            Consulta los pedidos programados del día, su valorizado y volumen, sin capturas de pantalla.
          </p>
        </div>
      </aside>
      <main className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sent ? "Revisa tu correo y abre el enlace para entrar." : "Ingresa tu correo corporativo y te enviaremos un enlace de acceso."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {sent ? "Reenviar enlace" : "Enviar enlace"} <ArrowRight className="size-4" />
          </Button>
        </form>
      </main>
    </div>
  );
}
