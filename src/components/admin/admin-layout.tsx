import AdminSidebar from "./admin-sidebar";

type AdminLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function AdminLayout({
  title,
  description,
  children,
}: AdminLayoutProps) {
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-slate-950">
      <div className="flex">
        <AdminSidebar />

        <section className="min-h-screen flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {title}
              </h1>

              {description && (
                <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}