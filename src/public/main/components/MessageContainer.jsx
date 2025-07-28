import React from 'react';

const MessageContainer = ({ message }) => {
  if (!message) return null;
  return (
    <div className={`message-container message-${message.type}`}>{message.text}</div>
  );
};

export default MessageContainer; 