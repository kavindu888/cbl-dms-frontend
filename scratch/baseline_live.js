const productId = '01HPRD000000000000000000014';

async function run() {
  const loginRes = await fetch('https://staging.ceyservice.store/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '2026Admin@#' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.value?.accessToken || loginData.data?.accessToken;
  
  if (!token) {
    console.error('Could not get token:', loginData);
    return;
  }
  console.log('Login successful. Token acquired.');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Availability
  const availabilityRes = await fetch(`https://staging.ceyservice.store/api/v1/inventory/stock/availability/${productId}`, { headers });
  const availabilityData = await availabilityRes.json();
  console.log('Availability:', JSON.stringify(availabilityData, null, 2));

  // Batches
  const batchesRes = await fetch(`https://staging.ceyservice.store/api/v1/inventory/stock/batches/${productId}`, { headers });
  const batchesData = await batchesRes.json();
  console.log('Batches count:', batchesData.data?.value?.length || batchesData.data?.length || batchesData.length);
  console.log('Batches:', JSON.stringify(batchesData, null, 2));
}

run().catch(console.error);
