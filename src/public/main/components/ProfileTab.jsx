import React from 'react';

const ProfileTab = ({ user, showMessage }) => (
  <div className="tab-content" data-tab-content="profile" id="profile-tab">
    <div className="profile-header">
      <h2>
        <i className="fas fa-user-cog"></i> <span data-i18n="profile">الملف الشخصي</span>
      </h2>
    </div>
    <div className="profile-content">
      <div className="change-password-section">
        <h3>
          <i className="fas fa-user"></i>
          <span data-i18n="your_information">معلوماتك</span>
        </h3>
        <em>Profile info form placeholder</em>
      </div>
      <div className="change-password-section">
        <h3>
          <i className="fas fa-key"></i>
          <span data-i18n="change_password">تغيير كلمة المرور</span>
        </h3>
        <em>Change password form placeholder</em>
      </div>
    </div>
  </div>
);

export default ProfileTab; 