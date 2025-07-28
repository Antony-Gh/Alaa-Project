import React from 'react';

const AdminModal = ({ appointment, onClose, showMessage }) => (
  <div className="modal" style={{ display: 'block' }}>
    <div className="modal-content">
      <span className="close" onClick={onClose}>&times;</span>
      <h3 id="adminModalTitle" data-i18n="update_appointment_status">تحديث حالة الموعد</h3>
      <em>Admin modal form placeholder</em>
    </div>
  </div>
);

export default AdminModal; 