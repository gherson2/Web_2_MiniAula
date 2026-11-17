const key = "miniaula.session";

export function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(key));
    return session?.token && session?.usuario ? session : null;
  } catch {
    return null;
  }
}
export function saveSession(session) {
  localStorage.setItem(key, JSON.stringify(session));
}
export function clearSession() {
  localStorage.removeItem(key);
}
