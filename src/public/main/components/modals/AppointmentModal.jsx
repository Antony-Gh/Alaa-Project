import React from 'react';

const AppointmentModal = ({ appointment, onClose }) => (
  <div className="modal" style={{ display: 'block' }}>
    <div className="modal-content">
      <span className="close" onClick={onClose}>&times;</span>
      <div id="modalContent">
        <em>Appointment details placeholder</em>
      </div>
    </div>
  </div>
);

export default AppointmentModal; 