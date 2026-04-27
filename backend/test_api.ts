
import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/v1/productos?limit=500');
    console.log('Status:', res.status);
    console.log('Data count:', res.data.data?.length);
    console.log('First product:', res.data.data?.[0]);
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

test();
