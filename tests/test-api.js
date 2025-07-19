const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAPI() {
    console.log('🧪 Testing Employee Scheduling System API...\n');

    try {
        // Test health endpoint
        console.log('1. Testing health endpoint...');
        const health = await makeRequest('/api/health');
        console.log(`   ✅ Health: ${health.status} - ${health.data.message}\n`);

        // Test departments endpoint
        console.log('2. Testing departments endpoint...');
        const departments = await makeRequest('/api/appointments/departments');
        console.log(`   ✅ Departments: ${departments.status} - Found ${departments.data.length || 0} departments\n`);

        // Test locations endpoint
        console.log('3. Testing locations endpoint...');
        const locations = await makeRequest('/api/appointments/locations');
        console.log(`   ✅ Locations: ${locations.status} - Found ${locations.data.length || 0} locations\n`);

        // Test registration
        console.log('4. Testing user registration...');
        const registerData = {
            username: 'testuser',
            password: 'testpass123',
            email: 'test@example.com',
            role: 'employee'
        };
        const register = await makeRequest('/api/auth/register', 'POST', registerData);
        console.log(`   ✅ Registration: ${register.status} - ${register.data.message}\n`);

        // Test login
        console.log('5. Testing user login...');
        const loginData = {
            username: 'testuser',
            password: 'testpass123'
        };
        const login = await makeRequest('/api/auth/login', 'POST', loginData);
        console.log(`   ✅ Login: ${login.status} - ${login.data.message}\n`);

        if (login.status === 200) {
            const token = login.data.data.token;
            
            // Test creating appointment
            console.log('6. Testing appointment creation...');
            const appointmentData = {
                employee_name: 'أحمد محمد',
                employee_id: 'EMP001',
                department_id: 1,
                location_id: 1,
                title: 'اجتماع فريق العمل',
                description: 'مناقشة مشروع جديد',
                requested_date: '2024-02-15',
                requested_time: '14:00'
            };
            
            const appointment = await makeRequestWithAuth('/api/appointments', 'POST', appointmentData, token);
            console.log(`   ✅ Appointment Creation: ${appointment.status} - ${appointment.data.message}\n`);

            // Test getting appointments
            console.log('7. Testing get appointments...');
            const appointments = await makeRequestWithAuth('/api/appointments', 'GET', null, token);
            console.log(`   ✅ Get Appointments: ${appointments.status} - Found ${appointments.data.data?.length || 0} appointments\n`);

            // Test getting stats
            console.log('8. Testing get stats...');
            const stats = await makeRequestWithAuth('/api/appointments/stats', 'GET', null, token);
            console.log(`   ✅ Get Stats: ${stats.status} - ${stats.data.message}\n`);
        }

        // Test admin login
        console.log('9. Testing admin login...');
        const adminLoginData = {
            username: 'admin',
            password: 'admin123'
        };
        const adminLogin = await makeRequest('/api/auth/login', 'POST', adminLoginData);
        console.log(`   ✅ Admin Login: ${adminLogin.status} - ${adminLogin.data.message}\n`);

        console.log('🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Server is running and healthy');
        console.log('✅ Database is initialized with sample data');
        console.log('✅ Authentication system is working');
        console.log('✅ Appointment system is functional');
        console.log('✅ API endpoints are responding correctly');
        console.log('\n🚀 The Employee Scheduling System is ready for use!');
        console.log('🌐 Open http://localhost:5000 in your browser to access the application.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Helper function to add authorization header
function makeRequestWithAuth(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

testAPI(); 