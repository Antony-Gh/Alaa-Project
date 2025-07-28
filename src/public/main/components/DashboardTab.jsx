import React from 'react';

const DashboardTab = ({ user, showMessage }) => (
  <div className="tab-content" data-tab-content="dashboard" id="dashboard-tab">
    <div className="dashboard-header">
      <h2>
        <i className="fas fa-chart-bar"></i>
        <span data-i18n="dashboard">لوحة المعلومات</span>
      </h2>
    </div>
    <div className="stats-grid">
      <em>Stats cards placeholder</em>
    </div>
    <div className="calendar-section">
      <em>Calendar placeholder</em>
    </div>
    <div className="recent-appointments">
      <h3 className="mb-1">
        <i className="fas fa-history"></i>
        <span data-i18n="recent_appointments">المواعيد الأخيرة</span>
      </h3>
      <div id="recentAppointmentsList" className="appointments-list">
        <em>Recent appointments list placeholder</em>
      </div>
    </div>
  </div>
);

export default DashboardTab; 