
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAdminEndpoints() {
  try {
    console.log('--- LOGGING IN ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@ecommerce.com',
      password: 'password123'
    });
    const token = loginRes.data.accessToken;
    console.log('Token obtained');

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    const endpoints = [
              { name: 'Dashboard KPIs', url: '/admin/dashboard/kpis' },
              { name: 'Dashboard Data', url: '/admin/dashboard/data' },
              { name: 'Stock', url: '/inventario/stock' },
              { name: 'Usuarios', url: '/admin/usuarios' },
              { name: 'Roles', url: '/admin/usuarios/roles' },
              { name: 'Ordenes', url: '/ordenes/admin/all' },
              { name: 'Productos', url: '/productos?limit=500' }
            ];

            for (const endpoint of endpoints) {
              console.log(`\n--- TESTING ${endpoint.name} (${endpoint.url}) ---`);
              try {
                const res = await axios.get(`${BASE_URL}${endpoint.url}`, config);
                console.log('Status:', res.status);
                if (endpoint.name === 'Stock') {
                    console.log('Stock data length:', res.data.length);
                    console.log('First stock item:', JSON.stringify(res.data[0], null, 2));
                }
                if (Array.isArray(res.data)) {
          console.log('Count:', res.data.length);
          if (res.data.length > 0) console.log('First item sample:', JSON.stringify(res.data[0], null, 2).substring(0, 200));
        } else if (res.data.data && Array.isArray(res.data.data)) {
          console.log('Count (data.data):', res.data.data.length);
          if (res.data.data.length > 0) console.log('First item sample:', JSON.stringify(res.data.data[0], null, 2).substring(0, 200));
        } else {
          console.log('Data:', JSON.stringify(res.data, null, 2).substring(0, 500));
        }
      } catch (e: any) {
        console.error(`Error in ${endpoint.name}:`, e.response?.status, e.response?.data || e.message);
      }
    }

  } catch (e: any) {
    console.error('Login failed:', e.response?.status, e.response?.data || e.message);
  }
}

testAdminEndpoints();
