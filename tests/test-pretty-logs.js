const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testPrettyLogs() {
    console.log('🧪 Testing Pretty Print Logging...\n');
    
    try {
        // Test 1: Health check
        console.log('1️⃣ Testing health endpoint...');
        await axios.get(`${BASE_URL}/health`);
        
        // Test 2: Get departments
        console.log('2️⃣ Testing departments endpoint...');
        await axios.get(`${BASE_URL}/appointments/departments`);
        
        // Test 3: Register a new user
        console.log('3️⃣ Testing user registration...');
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
            username: 'prettytest',
            password: 'testpass123',
            email: 'pretty@test.com',
            full_name: 'Pretty Test User',
            role: 'employee'
        });
        
        // Test 4: Login
        console.log('4️⃣ Testing user login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'prettytest',
            password: 'testpass123'
        });
        
        const token = loginResponse.data.data.token;
        
        // Test 5: Create appointment with auth
        console.log('5️⃣ Testing appointment creation with auth...');
        await axios.post(`${BASE_URL}/appointments`, {
            title: 'Test Pretty Logs',
            description: 'Testing the pretty print logging system',
            employee_name: 'Pretty Test User',
            employee_id: 'PT001',
            department_id: 1,
            location_id: 1,
            requested_date: '2024-12-25',
            requested_time: '10:00'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Test 6: Get appointments with auth
        console.log('6️⃣ Testing appointments retrieval...');
        await axios.get(`${BASE_URL}/appointments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Test 7: Test validation error
        console.log('7️⃣ Testing validation error...');
        try {
            await axios.post(`${BASE_URL}/appointments`, {
                title: 'Invalid Appointment',
                requested_date: '2020-01-01', // Past date should fail validation
                requested_time: '10:00'
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            // Expected error
        }
        
        console.log('\n✅ All tests completed! Check the logs for pretty print formatting.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testPrettyLogs(); 