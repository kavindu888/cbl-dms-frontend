const baseUrl = 'https://staging.ceyservice.store';

async function run() {
  const loginRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '2026Admin@#' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.value?.accessToken;

  const headers = { 'Authorization': `Bearer ${token}` };
  const res = await fetch(`${baseUrl}/api/v1/master-data/products?page=1&pageSize=150`, { headers });
  const data = await res.json();
  console.log('Products response status:', res.status);
  console.log('Products response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
}

run().catch(console.error);
