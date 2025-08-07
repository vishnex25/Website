require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');

const app = express();

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 submissions per 15 minutes per IP

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const now = Date.now();

  // Clean up old entries
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now - data.firstRequest > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(ip);
    }
  }

  const clientData = rateLimitStore.get(clientIP);

  if (!clientData) {
    rateLimitStore.set(clientIP, { firstRequest: now, count: 1 });
    next();
  } else if (now - clientData.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(clientIP, { firstRequest: now, count: 1 });
    next();
  } else if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many submissions. Please wait 15 minutes before submitting again.'
    });
  } else {
    clientData.count++;
    next();
  }
};

// Security middleware
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.static('.'));

// Trust proxy for rate limiting
app.set('trust proxy', true);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Enhanced input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

// Enhanced validation function
const validateFormData = (data) => {
  const errors = [];

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (data.name && data.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push('Please enter a valid email address');
  }

  // Message validation
  if (!data.message || data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }
  if (data.message && data.message.length > 2000) {
    errors.push('Message must be less than 2000 characters');
  }

  // Company validation (optional)
  if (data.company && data.company.length > 100) {
    errors.push('Company name must be less than 100 characters');
  }

  // Basic spam detection
  const spamKeywords = ['viagra', 'casino', 'lottery', 'winner', 'congratulations', 'click here', 'free money'];
  const messageText = data.message.toLowerCase();
  const hasSpamKeywords = spamKeywords.some(keyword => messageText.includes(keyword));

  if (hasSpamKeywords) {
    errors.push('Message contains prohibited content');
  }

  return errors;
};

// PDF Generation Function
const generateContactFormPDF = (formData, timestamp) => {
  return new Promise((resolve, reject) => {
    try {
      const { name, email, message, company, interest } = formData;
      
      // Define fonts for pdfmake
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);
      
      const currentDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      // PDF Document Definition
      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        content: [
          // Header
          {
            columns: [
              {
                width: '*',
                stack: [
                  {
                    text: 'VISHNOREX',
                    style: 'companyName',
                    alignment: 'left'
                  },
                  {
                    text: 'Custom Software Solutions',
                    style: 'tagline',
                    alignment: 'left'
                  }
                ]
              },
              {
                width: 'auto',
                stack: [
                  {
                    text: 'CONTACT FORM SUBMISSION',
                    style: 'documentTitle',
                    alignment: 'right'
                  },
                  {
                    text: currentDate,
                    style: 'dateText',
                    alignment: 'right'
                  }
                ]
              }
            ],
            margin: [0, 0, 0, 30]
          },

          // Submission Details Section
          {
            text: 'SUBMISSION DETAILS',
            style: 'sectionHeader'
          },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [
                  { text: 'Submission ID:', style: 'labelText' },
                  { text: timestamp.toString(), style: 'valueText' }
                ],
                [
                  { text: 'Date & Time:', style: 'labelText' },
                  { text: currentDate, style: 'valueText' }
                ]
              ]
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 20]
          },

          // Contact Information Section
          {
            text: 'CONTACT INFORMATION',
            style: 'sectionHeader'
          },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [
                  { text: 'Full Name:', style: 'labelText' },
                  { text: name, style: 'valueText' }
                ],
                [
                  { text: 'Email Address:', style: 'labelText' },
                  { text: email, style: 'valueText' }
                ],
                ...(company ? [[
                  { text: 'Company:', style: 'labelText' },
                  { text: company, style: 'valueText' }
                ]] : []),
                ...(interest ? [[
                  { text: 'Service Interest:', style: 'labelText' },
                  { text: interest, style: 'valueText' }
                ]] : [])
              ]
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 20]
          },

          // Message Section
          {
            text: 'MESSAGE',
            style: 'sectionHeader'
          },
          {
            text: message,
            style: 'messageText',
            margin: [0, 10, 0, 20]
          },

          // Footer
          {
            text: [
              'This document was automatically generated by the Vishnorex contact form system on ',
              { text: currentDate, italics: true },
              '. For inquiries regarding this submission, please contact the sender directly using the provided email address.'
            ],
            style: 'footerText',
            margin: [0, 30, 0, 0]
          }
        ],

        styles: {
          companyName: {
            fontSize: 24,
            bold: true,
            color: '#162A80'
          },
          tagline: {
            fontSize: 10,
            color: '#666666',
            margin: [0, 2, 0, 0]
          },
          documentTitle: {
            fontSize: 14,
            bold: true,
            color: '#162A80'
          },
          dateText: {
            fontSize: 10,
            color: '#666666',
            margin: [0, 2, 0, 0]
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: '#162A80',
            margin: [0, 20, 0, 10]
          },
          labelText: {
            fontSize: 11,
            bold: true,
            color: '#4a5568',
            margin: [0, 5, 0, 5]
          },
          valueText: {
            fontSize: 11,
            color: '#2d3748',
            margin: [0, 5, 0, 5]
          },
          messageText: {
            fontSize: 11,
            color: '#2d3748',
            lineHeight: 1.4,
            alignment: 'justify'
          },
          footerText: {
            fontSize: 9,
            color: '#666666',
            alignment: 'center',
            lineHeight: 1.3
          }
        }
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];

      pdfDoc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      pdfDoc.on('error', (error) => {
        reject(error);
      });

      pdfDoc.end();

    } catch (error) {
      reject(error);
    }
  });
};

// Add route for both /contact and /submit-contact to handle frontend requests
app.post(['/contact', '/submit-contact'], rateLimit, async (req, res) => {
  console.log('Contact form submission received:', req.body);
  
  try {
    // Sanitize input data
    const sanitizedData = {
      name: sanitizeInput(req.body.name),
      email: sanitizeInput(req.body.email),
      message: sanitizeInput(req.body.message),
      company: sanitizeInput(req.body.company),
      interest: sanitizeInput(req.body.interest)
    };

    const { name, email, message, company, interest } = sanitizedData;

    // Enhanced validation
    const validationErrors = validateFormData(sanitizedData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join('. '),
        errors: validationErrors
      });
    }

    // Enhanced email transporter configuration with multiple provider support
    let transporterConfig;
    const emailUser = process.env.EMAIL_USER || 'your-email@gmail.com';
    const emailPass = process.env.EMAIL_PASS || 'your-app-password';

    // Determine email provider based on email address
    if (emailUser.includes('@gmail.com')) {
      transporterConfig = {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };
    } else if (emailUser.includes('@outlook.com') || emailUser.includes('@hotmail.com') || emailUser.includes('@live.com')) {
      transporterConfig = {
        service: 'hotmail',
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };
    } else if (process.env.SMTP_HOST) {
      // Custom SMTP configuration
      transporterConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };
    } else {
      // Default to Gmail configuration
      transporterConfig = {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    // Generate unique submission ID
    const timestamp = Date.now();

    // Enhanced email template with professional styling
    const currentDate = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Generate PDF attachment
    console.log('Generating PDF attachment...');
    const pdfBuffer = await generateContactFormPDF(sanitizedData, timestamp);
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    const mailOptions = {
      from: `"Vishnorex Contact Form" <${emailUser}>`,
      to: process.env.ADMIN_EMAIL || 'recipient@example.com',
      subject: `🔔 New Contact Form Submission - ${name} (${interest || 'General Inquiry'})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #162A80 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
            .content { padding: 30px; }
            .info-section { margin-bottom: 25px; }
            .info-section h3 { color: #162A80; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-bottom: 15px; }
            .info-label { font-weight: bold; color: #4a5568; }
            .info-value { color: #2d3748; }
            .message-box { background-color: #f8fafc; border-left: 4px solid #162A80; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .message-text { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { margin: 0; color: #6b7280; font-size: 14px; }
            .attachment-notice { background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
            .attachment-notice strong { color: #1e40af; }
            @media (max-width: 600px) {
              .info-grid { grid-template-columns: 1fr; }
              .container { margin: 10px; }
              .content { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>VISHNOREX</h1>
              <p>New Contact Form Submission</p>
            </div>

            <div class="content">
              <div class="info-section">
                <h3>📋 Submission Details</h3>
                <div class="info-grid">
                  <span class="info-label">Submission ID:</span>
                  <span class="info-value">${timestamp}</span>
                </div>
                <div class="info-grid">
                  <span class="info-label">Date & Time:</span>
                  <span class="info-value">${currentDate}</span>
                </div>
              </div>

              <div class="info-section">
                <h3>👤 Contact Information</h3>
                <div class="info-grid">
                  <span class="info-label">Full Name:</span>
                  <span class="info-value">${name}</span>
                </div>
                <div class="info-grid">
                  <span class="info-label">Email Address:</span>
                  <span class="info-value"><a href="mailto:${email}" style="color: #1e40af; text-decoration: none;">${email}</a></span>
                </div>
                ${company ? `
                <div class="info-grid">
                  <span class="info-label">Company:</span>
                  <span class="info-value">${company}</span>
                </div>
                ` : ''}
                ${interest ? `
                <div class="info-grid">
                  <span class="info-label">Service Interest:</span>
                  <span class="info-value"><strong>${interest}</strong></span>
                </div>
                ` : ''}
              </div>

              <div class="info-section">
                <h3>💬 Message</h3>
                <div class="message-box">
                  <p class="message-text">${message.replace(/\n/g, '\n')}</p>
                </div>
              </div>

              <div class="attachment-notice">
                <strong>📎 PDF Attachment Included</strong><br>
                A detailed PDF version of this submission has been attached to this email for your records.
              </div>
            </div>

            <div class="footer">
              <p>This email was automatically generated by the Vishnorex contact form system.</p>
              <p>Please do not reply to this email. Contact the sender directly using the provided email address.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Vishnorex_Contact_Submission_${timestamp}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Send email with PDF attachment
    console.log('Sending email to:', process.env.ADMIN_EMAIL);
    console.log('Email configuration:', {
      service: transporterConfig.service,
      host: transporterConfig.host,
      port: transporterConfig.port,
      user: emailUser
    });
    
    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully with PDF attachment');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      throw emailError;
    }

    // Log successful submission
    console.log('Contact form submission processed successfully:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Company:', company);
    console.log('Interest:', interest);
    console.log('Message:', message);
    console.log('Timestamp:', timestamp);
    console.log('PDF Size:', pdfBuffer.length, 'bytes');
    
    // Return success response
    res.status(200).json({ 
      success: true, 
      message: 'Thank you! Your message has been sent successfully. We will get back to you soon.' 
    });

  } catch (mainError) {
    console.error('Main error in contact form handler:', mainError);
    res.status(500).json({ 
      success: false, 
      message: 'Server error occurred. Please try again later.' 
    });
  }
});

// PDF Download endpoint for users
app.post('/download-pdf', rateLimit, async (req, res) => {
  console.log('PDF download request received:', req.body);
  
  try {
    // Sanitize input data
    const sanitizedData = {
      name: sanitizeInput(req.body.name),
      email: sanitizeInput(req.body.email),
      message: sanitizeInput(req.body.message),
      company: sanitizeInput(req.body.company),
      interest: sanitizeInput(req.body.interest)
    };

    // Enhanced validation
    const validationErrors = validateFormData(sanitizedData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join('. '),
        errors: validationErrors
      });
    }

    // Generate unique submission ID for PDF
    const timestamp = Date.now();

    // Generate PDF
    console.log('Generating PDF for download...');
    const pdfBuffer = await generateContactFormPDF(sanitizedData, timestamp);
    console.log('PDF generated successfully for download, size:', pdfBuffer.length, 'bytes');

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Vishnorex_Contact_Form_${timestamp}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

    console.log('PDF download completed successfully');

  } catch (error) {
    console.error('Error generating PDF for download:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating PDF. Please try again later.' 
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});