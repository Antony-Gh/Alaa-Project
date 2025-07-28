import React from 'react';

const AdminTab = ({ user, showMessage, openAdminModal }) => (
  <div className="tab-content" data-tab-content="admin_panel" id="admin-tab">
    <div className="admin-header">
      <h2>
        <i className="fas fa-user-shield"></i>
        <span data-i18n="admin_panel">لوحة الإدارة</span>
      </h2>
      <div className="status-filters">
        <button className="status-btn active" data-status="all">الكل</button>
        <button className="status-btn" data-status="pending">في الانتظار</button>
        <button className="status-btn" data-status="approved">مقبول</button>
        <button className="status-btn" data-status="rejected">مرفوض</button>
        <button className="status-btn" data-status="done">مكتمل</button>
        <button className="status-btn" data-status="missed">فات</button>
      </div>
    </div>
    <div className="appointments-container">
      <div id="adminAppointmentsList" className="appointments-list">
        <em>Admin appointments list placeholder</em>
      </div>
    </div>
  </div>
);

export default AdminTab; 