const API_BASE_URL = import.meta.env.VITE_API_URL;

export async function getHello() {
  const res = await fetch(`${API_BASE_URL}/api/hello`);
  return res.json();
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  return res.json();
}