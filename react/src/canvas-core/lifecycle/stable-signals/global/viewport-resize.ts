const subscribers = new Map<string, () => void>();
let windowListenerInstalled = false;

function onWindowResize() {
  for (const refresh of subscribers.values()) refresh();
}

export function registerViewportSubscriber(id: string, onResize: () => void): () => void {
  if (!windowListenerInstalled) {
    window.addEventListener("resize", onWindowResize);
    windowListenerInstalled = true;
  }
  subscribers.set(id, onResize);
  return () => {
    subscribers.delete(id);
    if (subscribers.size === 0) {
      window.removeEventListener("resize", onWindowResize);
      windowListenerInstalled = false;
    }
  };
}