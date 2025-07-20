const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = {};
    this.initialize();
  }

  async initialize() {
    if (!config.email.enabled) {
      logger.info('📧 Email service disabled');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: config.email.auth,
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Load email templates
      await this.loadTemplates();

      // Verify connection
      await this.transporter.verify();
      logger.info('📧 Email service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize email service', {
        error: error.message,
      });
    }
  }

  async loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates/emails');

    try {
      if (fs.existsSync(templatesDir)) {
        const templateFiles = fs.readdirSync(templatesDir);

        for (const file of templateFiles) {
          if (file.endsWith('.html')) {
            const templateName = path.basename(file, '.html');
            const templatePath = path.join(templatesDir, file);
            this.templates[templateName] = fs.readFileSync(
              templatePath,
              'utf8'
            );
          }
        }
      }
    } catch (error) {
      logger.warn('⚠️ Could not load email templates', {
        error: error.message,
      });
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      logger.warn('⚠️ Email service not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: config.email.from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('📧 Email sent successfully', {
        messageId: result.messageId,
        to,
      });
      return true;
    } catch (error) {
      logger.error('❌ Failed to send email', {
        error: error.message,
        to,
      });
      return false;
    }
  }

  async sendAppointmentConfirmation(appointment, user) {
    const lang = user.language || 'ar';
    const subject = this.t('email.appointment_confirmation_subject', lang);
    const html = this.renderTemplate(
      'appointment-confirmation',
      {
        appointment,
        user,
        systemName: this.t('system_name', lang),
      },
      lang
    );
    return await this.sendEmail(user.email, subject, html);
  }

  async sendAppointmentReminder(appointment, user) {
    const lang = user.language || 'ar';
    const subject = this.t('email.appointment_reminder_subject', lang);
    const html = this.renderTemplate(
      'appointment-reminder',
      {
        appointment,
        user,
        systemName: this.t('system_name', lang),
      },
      lang
    );
    return await this.sendEmail(user.email, subject, html);
  }

  async sendStatusUpdate(appointment, user, oldStatus, newStatus) {
    const lang = user.language || 'ar';
    const subject = this.t('email.status_update_subject', lang, {
      newStatus: this.t(`status.${newStatus}`, lang),
    });
    const html = this.renderTemplate(
      'status-update',
      {
        appointment,
        user,
        oldStatus: this.t(`status.${oldStatus}`, lang),
        newStatus: this.t(`status.${newStatus}`, lang),
        systemName: this.t('system_name', lang),
      },
      lang
    );
    return await this.sendEmail(user.email, subject, html);
  }

  async sendAdminNotification(appointment, adminEmails) {
    // Assume all admins get Arabic for now, or fetch their language if available
    const lang = 'ar';
    const subject = this.t('email.admin_notification_subject', lang);
    const html = this.renderTemplate(
      'admin-notification',
      {
        appointment,
        systemName: this.t('system_name', lang),
      },
      lang
    );
    return await this.sendEmail(adminEmails, subject, html);
  }

  async sendPasswordReset(user, resetToken) {
    const lang = user.language || 'ar';
    const subject = this.t('email.password_reset_subject', lang);
    const resetUrl = `${config.cors.origin}/reset-password?token=${resetToken}`;
    const html = this.renderTemplate(
      'password-reset',
      {
        user,
        resetUrl,
        systemName: this.t('system_name', lang),
      },
      lang
    );
    return await this.sendEmail(user.email, subject, html);
  }

  async sendWelcomeEmail(user) {
    const lang = user.language || 'ar';
    const subject = this.t('email.welcome_subject', lang);
    const html = this.renderTemplate(
      'welcome',
      {
        user,
        systemName: this.t('system_name', lang),
      },
      lang
    );
    return await this.sendEmail(user.email, subject, html);
  }

  renderTemplate(templateName, data) {
    let template =
      this.templates[templateName] || this.getDefaultTemplate(templateName);

    // Replace placeholders with data
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      if (typeof data[key] === 'object') {
        Object.keys(data[key]).forEach(subKey => {
          const subPlaceholder = `{{${key}.${subKey}}}`;
          template = template.replace(
            new RegExp(subPlaceholder, 'g'),
            data[key][subKey] || ''
          );
        });
      } else {
        template = template.replace(
          new RegExp(placeholder, 'g'),
          data[key] || ''
        );
      }
    });

    return template;
  }

  getDefaultTemplate(templateName) {
    const templates = {
      'appointment-confirmation': `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>تأكيد حجز الموعد</h2>
                    <p>مرحباً {{user.full_name}}،</p>
                    <p>تم تأكيد حجز موعدك بنجاح:</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                        <p><strong>العنوان:</strong> {{appointment.title}}</p>
                        <p><strong>التاريخ:</strong> {{appointment.requested_date}}</p>
                        <p><strong>الوقت:</strong> {{appointment.requested_time}}</p>
                        <p><strong>الموقع:</strong> {{appointment.location_name}}</p>
                        <p><strong>القسم:</strong> {{appointment.department_name}}</p>
                    </div>
                    <p>شكراً لك،<br>{{systemName}}</p>
                </div>
            `,
      'appointment-reminder': `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>تذكير بالموعد</h2>
                    <p>مرحباً {{user.full_name}}،</p>
                    <p>هذا تذكير بموعدك غداً:</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                        <p><strong>العنوان:</strong> {{appointment.title}}</p>
                        <p><strong>التاريخ:</strong> {{appointment.requested_date}}</p>
                        <p><strong>الوقت:</strong> {{appointment.requested_time}}</p>
                        <p><strong>الموقع:</strong> {{appointment.location_name}}</p>
                    </div>
                    <p>شكراً لك،<br>{{systemName}}</p>
                </div>
            `,
      'status-update': `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>تحديث حالة الموعد</h2>
                    <p>مرحباً {{user.full_name}}،</p>
                    <p>تم تحديث حالة موعدك من "{{oldStatus}}" إلى "{{newStatus}}":</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                        <p><strong>العنوان:</strong> {{appointment.title}}</p>
                        <p><strong>التاريخ:</strong> {{appointment.requested_date}}</p>
                        <p><strong>الوقت:</strong> {{appointment.requested_time}}</p>
                        <p><strong>الحالة الجديدة:</strong> {{newStatus}}</p>
                    </div>
                    <p>شكراً لك،<br>{{systemName}}</p>
                </div>
            `,
      'admin-notification': `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>طلب موعد جديد</h2>
                    <p>تم استلام طلب موعد جديد:</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                        <p><strong>الموظف:</strong> {{appointment.employee_name}}</p>
                        <p><strong>العنوان:</strong> {{appointment.title}}</p>
                        <p><strong>التاريخ:</strong> {{appointment.requested_date}}</p>
                        <p><strong>الوقت:</strong> {{appointment.requested_time}}</p>
                        <p><strong>الموقع:</strong> {{appointment.location_name}}</p>
                    </div>
                    <p>{{systemName}}</p>
                </div>
            `,
    };

    return templates[templateName] || '<p>Email template not found</p>';
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  async sendBulkEmail(recipients, subject, html, text = null) {
    const results = [];

    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient.email, subject, html, text);
      results.push({ email: recipient.email, success: result });
    }

    return results;
  }
}

module.exports = new EmailService();
