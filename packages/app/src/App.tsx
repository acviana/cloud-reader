import { Button } from "@cloudflare/kumo";

export function App() {
  return (
    <div className="flex h-full items-center justify-center bg-kumo-base">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-kumo-default">cloud-reader</h1>
        <p className="text-kumo-dimmed">Phase 2 in progress</p>
        <Button variant="primary">Get started</Button>
      </div>
    </div>
  );
}
