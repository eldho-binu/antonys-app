const API_BASE_URL = import.meta.env.VITE_API_URL;

export async function getHello() {
  const res = await fetch(`${API_BASE_URL}/api/hello`);
  return res.json();
}
