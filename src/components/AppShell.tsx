import Nav from "./Nav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Nav />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-28">
        {children}
      </main>
    </div>
  );
}
