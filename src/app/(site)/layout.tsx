
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <>
      <a
        href="#noi-dung"
        className="sr-only focus:not-sr-only"
      >
        Bỏ qua đến nội dung
      </a>

      <SiteHeader
        user={
          user
            ? {
                displayName: user.displayName,
                
              }
            : null
        }
      />

      <main id="noi-dung" className="flex-1">
        {children}
      </main>

      <SiteFooter />

      {/* Chatbot StudyHub AI */}
    
    </>
  );
}
