const axios = require('axios')

const baseUrl = 'https://staging.ceyservice.store'

async function tryLogin(username, password) {
  try {
    const res = await axios.post(`${baseUrl}/login`, { username, password })
    console.log(`Login SUCCESS with ${username}:${password}`)
    return res.data
  } catch (err) {
    console.log(`Login FAILED with ${username}:${password}: ${err.message}`)
    if (err.response) {
      console.log('Response status:', err.response.status)
      console.log('Response data:', JSON.stringify(err.response.data))
    }
    return null
  }
}

async function run() {
  const credentials = [
    { u: 'admin', p: 'admin' },
    { u: 'admin', p: 'admin123' },
    { u: 'admin', p: 'password' },
    { u: 'admin', p: 'Password123' },
    { u: 'admin@cblfoods.lk', p: 'admin' },
    { u: 'admin@cblfoods.lk', p: 'admin123' },
    { u: 'admin@cblfoods.lk', p: 'password' },
  ]

  for (const cred of credentials) {
    const res = await tryLogin(cred.u, cred.p)
    if (res) {
      console.log('Auth result:', JSON.stringify(res))
      const token = res.data?.value?.accessToken || res.data?.accessToken
      if (token) {
        console.log('Got token, fetching products...')
        try {
          const prodListRes = await axios.get(`${baseUrl}/api/v1/master-data/products`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          console.log('Product list response keys:', Object.keys(prodListRes.data))
          console.log('Product list data success:', prodListRes.data.success)
          const products = prodListRes.data?.data?.items || prodListRes.data?.data || []
          console.log('Number of products returned:', products.length)
          if (products.length > 0) {
            console.log('First product sample:', JSON.stringify(products[0], null, 2))
            const firstId = products[0].id
            console.log(`Fetching detail for product ID: ${firstId}...`)
            try {
              const detailRes = await axios.get(
                `${baseUrl}/api/v1/master-data/products/${firstId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              )
              console.log('Product detail response:', JSON.stringify(detailRes.data, null, 2))
            } catch (detailErr) {
              console.error('Detail fetch error:', detailErr.message)
            }
          }
        } catch (prodErr) {
          console.error('Products fetch error:', prodErr.message)
        }
      }
      break
    }
  }
}

run()
