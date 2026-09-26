import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface AuthLayoutProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>

          {children}
        </div>

        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}
