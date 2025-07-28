import React from 'react';

const EmployeeTab = ({ user, showMessage, openAppointmentModal }) => (
  <div className="tab-content active" data-tab-content="new_appointment" id="employee-tab">
    <div className="booking-form">
      <h2>
        <i className="fas fa-plus-circle"></i>
        <span data-i18n="new_appointment">حجز موعد جديد</span>
      </h2>
      {/* Booking form goes here */}
      <div style={{ background: '#f8f8f8', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <em>Booking form placeholder</em>
      </div>
    </div>
    <div className="my-appointments">
      <h3 className="mb-1">
        <i className="fas fa-list"></i>
        <span data-i18n="my_appointments">مواعيدي</span>
      </h3>
      {/* Appointments list goes here */}
      <div id="myAppointmentsList" className="appointments-list">
        <em>Appointments list placeholder</em>
      </div>
    </div>
  </div>
);

export default EmployeeTab; 