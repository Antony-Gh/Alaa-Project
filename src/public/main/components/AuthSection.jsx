import React, { useState } from 'react';

const AuthSection = ({ onLoginSuccess, showMessage }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [login_username, setLoginUsername] = useState('');
  const [login_password, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple client-side validation
  const validateLogin = (username, password) => {
    if (!username || username.length < 3) {
      return { isValid: false, message: 'اسم المستخدم مطلوب (٣ أحرف على الأقل)' };
    }
    if (!password || password.length < 4) {
      return { isValid: false, message: 'كلمة المرور مطلوبة (٤ أحرف على الأقل)' };
    }
    return { isValid: true };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const validation = validateLogin(login_username, login_password);
    if (!validation.isValid) {
      showMessage('error', validation.message);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: login_username, password: login_password })
      });
      const result = await response.json();
      if (response.ok && result.data && result.data.user && result.data.token) {
        // Store token in localStorage
        localStorage.setItem('authToken', result.data.token);
        onLoginSuccess(result.data.user);
      } else {
        showMessage('error', result.message || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      showMessage('error', 'خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-section" className="auth-section">
      <div className="auth-container">
        <div className="auth-tabs">
          <button
            className={`auth-tab-btn${activeTab === 'login' ? ' active' : ''}`}
            data-auth="login"
            title="login"
            onClick={() => setActiveTab('login')}
          >
            <i className="fas fa-sign-in-alt"></i> <span data-i18n="login">تسجيل الدخول</span>
          </button>
          <button
            className={`auth-tab-btn${activeTab === 'register' ? ' active' : ''}`}
            data-auth="register"
            title="register_account"
            onClick={() => setActiveTab('register')}
          >
            <i className="fas fa-user-plus"></i> <span data-i18n="register_account">تسجيل حساب</span>
          </button>
        </div>
        <div className={`auth-content${activeTab === 'login' ? ' active' : ''}`} id="login-content">
          {/* Login Form */}
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login_username" data-i18n="username">اسم المستخدم</label>
              <input
                type="text"
                id="login_username"
                name="username"
                required
                placeholder="username"
                value={login_username}
                onChange={e => setLoginUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="login_password" data-i18n="password_title">كلمة المرور</label>
              <input
                type="password"
                id="login_password"
                name="password"
                required
                placeholder="password"
                value={login_password}
                onChange={e => setLoginPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" title="login" disabled={loading}>
              {loading ? (
                <span>جاري الدخول...</span>
              ) : (
                <><i className="fas fa-sign-in-alt"></i> <span data-i18n="login">تسجيل الدخول</span></>
              )}
            </button>
          </form>
        </div>
        <div className={`auth-content${activeTab === 'register' ? ' active' : ''}`} id="register-content">
          {/* Register Form (placeholder) */}
          <form className="auth-form">
            <em>تسجيل حساب (قريباً)</em>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthSection; 