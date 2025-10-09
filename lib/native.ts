export function isCapacitorEnvironment() {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean((window as any).Capacitor?.isNativePlatform?.());
}

export function bindBackButton(callback: () => void) {
  if (typeof window === "undefined" || !(window as any).Capacitor?.App) {
    return () => undefined;
  }

  const App = (window as any).Capacitor.App;
  App.addListener("backButton", callback);

  return () => {
    App.removeAllListeners("backButton");
  };
}

export function setStatusBarStyle(style: "dark" | "light") {
  if (typeof window === "undefined" || !(window as any).Capacitor?.StatusBar) {
    return;
  }

  const StatusBar = (window as any).Capacitor.StatusBar;
  StatusBar.setStyle({ style: style === "dark" ? "DARK" : "LIGHT" });
}
