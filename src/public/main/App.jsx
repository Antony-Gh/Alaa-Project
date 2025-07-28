import React, { useState, useEffect } from 'react';
import './styles/main.css';
import './styles/index.css';

import Header from './components/Header';
import MessageContainer from './components/MessageContainer';
import AuthSection from './components/AuthSection';
import EmployeeTab from './components/EmployeeTab';
import AdminTab from './components/AdminTab';
import UserManagementTab from './components/UserManagementTab';
import DashboardTab from './components/DashboardTab';
import ProfileTab from './components/ProfileTab';
import AppointmentModal from './components/modals/AppointmentModal';
import AdminModal from './components/modals/AdminModal';
import UserModal from './components/modals/UserModal';

function App() {
  // --- State Management ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('employee');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(null);

  // Modal states
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedAdminAppointment, setSelectedAdminAppointment] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // --- Effects ---
  useEffect(() => {
    // Example: Check for user in localStorage
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setIsAuthenticated(true);
      setUser(storedUser);
      if (storedUser.role === 'admin' || storedUser.role === 'moderator') {
        setActiveTab('admin');
      }
    }
  }, []);

  // --- Handlers ---
  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setActiveTab(userData.role === 'admin' || userData.role === 'moderator' ? 'admin' : 'employee');
    setMessage({ type: 'success', text: 'Login successful!' });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('user');
    setMessage({ type: 'info', text: 'Logged out.' });
  };

  const handleTabChange = (tabName) => setActiveTab(tabName);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Modal handlers
  const openAppointmentModal = (appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };
  const closeAppointmentModal = () => {
    setSelectedAppointment(null);
    setIsAppointmentModalOpen(false);
  };
  const openAdminModal = (appointment) => {
    setSelectedAdminAppointment(appointment);
    setIsAdminModalOpen(true);
  };
  const closeAdminModal = () => {
    setSelectedAdminAppointment(null);
    setIsAdminModalOpen(false);
  };
  const openUserModal = (userToEdit = null) => {
    setSelectedUser(userToEdit);
    setIsUserModalOpen(true);
  };
  const closeUserModal = () => {
    setSelectedUser(null);
    setIsUserModalOpen(false);
  };

  return (
    <div className="app-container" dir="rtl">
      <Header
        systemTitle="نظام حجز المواعيد للموظفين"
        systemSubtitle="Employee Scheduling System"
        onLanguageChange={() => { /* Implement language switching */ }}
      />

      <div className="container">
        <MessageContainer message={message} />

        {!isAuthenticated ? (
          <AuthSection onLoginSuccess={handleLoginSuccess} showMessage={showMessage} />
        ) : (
          <div id="app-section" className="app-section">
            <div className="user-info-bar">
              <div className="user-info">
                <div>
                  <span data-i18n="welcome_user">مرحباً</span>
                  <span id="userDisplayName">{user?.full_name || user?.username}</span>
                </div>
                <span id="userRole" className="user-role">{user?.role}</span>
              </div>
              <button id="logoutBtn" className="btn btn-danger" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                <span data-i18n="logout"></span>
              </button>
            </div>

            <nav className="nav-tabs">
              <button
                className={`tab-btn ${activeTab === 'employee' ? 'active' : ''}`}
                onClick={() => handleTabChange('employee')}
              >
                <i className="fas fa-user"></i> <span data-i18n="new_appointment"></span>
              </button>
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <button
                  className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => handleTabChange('admin')}
                  id="adminTab"
                >
                  <i className="fas fa-user-shield"></i>
                  <span data-i18n="admin_panel"></span>
                </button>
              )}
              {user?.role === 'admin' && (
                <button
                  className={`tab-btn ${activeTab === 'user-management' ? 'active' : ''}`}
                  onClick={() => handleTabChange('user-management')}
                  id="userManagementTab"
                >
                  <i className="fas fa-users-cog"></i>
                  <span data-i18n="user_management"></span>
                </button>
              )}
              <button
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleTabChange('dashboard')}
              >
                <i className="fas fa-chart-bar"></i> <span data-i18n="dashboard"></span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => handleTabChange('profile')}
              >
                <i className="fas fa-user-cog"></i> <span data-i18n="profile"></span>
              </button>
            </nav>

            <div className="tab-content-wrapper">
              {activeTab === 'employee' && (
                <EmployeeTab
                  user={user}
                  showMessage={showMessage}
                  openAppointmentModal={openAppointmentModal}
                />
              )}
              {(user?.role === 'admin' || user?.role === 'moderator') && activeTab === 'admin' && (
                <AdminTab
                  user={user}
                  showMessage={showMessage}
                  openAdminModal={openAdminModal}
                />
              )}
              {user?.role === 'admin' && activeTab === 'user-management' && (
                <UserManagementTab
                  user={user}
                  showMessage={showMessage}
                  openUserModal={openUserModal}
                />
              )}
              {activeTab === 'dashboard' && <DashboardTab user={user} showMessage={showMessage} />}
              {activeTab === 'profile' && <ProfileTab user={user} showMessage={showMessage} />}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isAppointmentModalOpen && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={closeAppointmentModal}
        />
      )}
      {isAdminModalOpen && (
        <AdminModal
          appointment={selectedAdminAppointment}
          onClose={closeAdminModal}
          showMessage={showMessage}
        />
      )}
      {isUserModalOpen && (
        <UserModal
          user={selectedUser}
          onClose={closeUserModal}
          showMessage={showMessage}
        />
      )}
    </div>
  );
}

export default App;