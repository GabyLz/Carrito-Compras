import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

async function test() {
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@ecommerce.com',
      password: 'password123'
    });
    const token = loginRes.data.accessToken;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    console.log('--- TESTING /productos?limit=500 ---');
    const resProd = await axios.get(`${BASE_URL}/productos?limit=500`, config);
    console.log('Keys in /productos response:', Object.keys(resProd.data));
    if (resProd.data.data) {
        console.log('Length of resProd.data.data:', resProd.data.data.length);
    }

    console.log('\n--- TESTING /admin/dashboard/data ---');
    const resDash = await axios.get(`${BASE_URL}/admin/dashboard/data`, config);
    console.log('Charts data keys:', Object.keys(resDash.data));

    console.log('\n--- TESTING /admin/usuarios ---');
    const resUsers = await axios.get(`${BASE_URL}/admin/usuarios`, config);
    console.log('Users length:', resUsers.data.length);

    console.log('\n--- TESTING /admin/usuarios/roles ---');
    const resRoles = await axios.get(`${BASE_URL}/admin/usuarios/roles`, config);
    console.log('Roles length:', resRoles.data.length);

    console.log('\n--- TESTING /ordenes/admin/all ---');
    const resOrders = await axios.get(`${BASE_URL}/ordenes/admin/all`, config);
    console.log('Orders length:', resOrders.data.length);

  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();
