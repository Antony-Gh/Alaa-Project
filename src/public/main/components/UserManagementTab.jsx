import React from 'react';

const UserManagementTab = ({ user, showMessage, openUserModal }) => (
  <div className="tab-content" data-tab-content="user_management" id="user-management-tab">
    <div className="user-management-header">
      <h2>
        <i className="fas fa-users-cog"></i>
        <span data-i18n="user_management">إدارة المستخدمين</span>
      </h2>
      <button id="createUserBtn" className="btn btn-primary" title="create_user" onClick={() => openUserModal()}>
        <i className="fas fa-user-plus"></i>
        <span data-i18n="create_user">إضافة مستخدم</span>
      </button>
    </div>
    <div className="user-filters">
      <button className="role-filter-btn active" data-role="all">
        <span data-i18n="all_users">كل المستخدمين</span>
      </button>
      <button className="role-filter-btn" data-role="moderator" id="moderatorFilterBtn">
        <span data-i18n="moderators">المشرفون</span>
      </button>
      <button className="role-filter-btn" data-role="employee" id="employeeFilterBtn">
        <span data-i18n="employees">الموظفون</span>
      </button>
    </div>
    <div className="users-container">
      <div id="usersList" className="users-list">
        <em>Users list placeholder</em>
      </div>
    </div>
  </div>
);

export default UserManagementTab; 