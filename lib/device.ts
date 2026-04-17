export function getDeviceId() {

  if (typeof window === "undefined") return "server";

  let id = localStorage.getItem("device-id");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device-id", id);
  }

  return id;
}