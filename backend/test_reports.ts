
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testReports() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@ecommerce.com',
      password: 'password123'
    });
    const token = loginRes.data.accessToken;
    const config = { 
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer' as const
    };

    const operacionales = [
      'ordenes',
      'inventario_valorizado',
      'movimientos_inventario',
      'stock_bajo',
      'pagos',
      'devoluciones'
    ];

    console.log('\n--- TESTING OPERATIONAL REPORTS ---');
    for (const tipo of operacionales) {
      try {
        console.log(`Testing: ${tipo}...`);
        const res = await axios.get(`${BASE_URL}/admin/reportes/operacional?tipo=${tipo}`, config);
        console.log(`✅ Success: ${tipo} (${res.data.byteLength} bytes)`);
      } catch (err: any) {
        let errorMsg = err.message;
        if (err.response?.data) {
            try {
                const decoded = JSON.parse(Buffer.from(err.response.data).toString());
                errorMsg = JSON.stringify(decoded);
            } catch (e) {}
        }
        console.error(`❌ Failed: ${tipo} - ${errorMsg}`);
      }
    }

    console.log('\n--- TESTING MANAGEMENT REPORTS ---');
    for (let i = 1; i <= 6; i++) {
      try {
        console.log(`Testing Management Report ${i}...`);
        const res = await axios.get(`${BASE_URL}/admin/reportes/gestion?tipo=${i}`, config);
        console.log(`✅ Success: Management ${i} (${res.data.byteLength} bytes)`);
      } catch (err: any) {
        let errorMsg = err.message;
        if (err.response?.data) {
            try {
                const decoded = JSON.parse(Buffer.from(err.response.data).toString());
                errorMsg = JSON.stringify(decoded);
            } catch (e) {}
        }
        console.error(`❌ Failed: Management ${i} - ${errorMsg}`);
      }
    }

  } catch (err: any) {
    console.error('General Error:', err.message);
  }
}

testReports();
