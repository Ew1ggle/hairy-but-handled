import Nav from "./Nav";
import PatientSwitcher from "./PatientSwitcher";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Nav />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-28">
        <div className="mb-2"><PatientSwitcher /></div>
        {children}
      </main>
    </div>
  );
}
