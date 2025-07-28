import React from 'react';

const UserModal = ({ user, onClose, showMessage }) => (
  <div className="modal" style={{ display: 'block' }}>
    <div className="modal-content">
      <span className="close" onClick={onClose}>&times;</span>
      <h3 id="userModalTitle" data-i18n="create_user">إضافة مستخدم</h3>
      <em>User modal form placeholder</em>
    </div>
  </div>
);

export default UserModal; 