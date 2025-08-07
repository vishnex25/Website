require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const PdfPrinter = require('pdfmake');
const path = require('path');

const app = express();

// PDF fonts configuration
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

// Rate limiting storage (for demo - use Redis or DB in production)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10;

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const now = Date.now();

  // Clear expired entries
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
      message: 'Too many submissions. Please wait 15 minutes before submitting again.',
    });
  } else {
    clientData.count++;
    next();
  }
};

// Middleware
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// CORS and security headers
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

//app.use(express.static('.'));

// Trust proxy for rate limiting if behind proxies
app.set('trust proxy', true);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Favicon endpoint - serve a simple SVG favicon
app.get('/favicon.ico', (req, res) => {
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#162A80"/>
    <text x="16" y="22" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white">V</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(favicon);
});

// Serve main page (assuming index.html exists)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>;]/g, '') // basic removal of HTML tag brackets and semicolons
    .substring(0, 1000);   // limit to 1000 characters max for safety
};

// Validation function
const validateFormData = (data) => {
  const errors = [];

  // Name
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (data.name && data.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Email – basic regex validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push('Please enter a valid email address');
  }

  // Message
  if (!data.message || data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }
  if (data.message && data.message.length > 2000) {
    errors.push('Message must be less than 2000 characters');
  }

  // Company (optional)
  if (data.company && data.company.length > 100) {
    errors.push('Company name must be less than 100 characters');
  }

  // Spam keyword detection
  const spamKeywords = ['viagra', 'casino', 'lottery', 'winner', 'congratulations', 'click here', 'free money'];
  if (data.message) {
    const msgLower = data.message.toLowerCase();
    for (const keyword of spamKeywords) {
      if (msgLower.includes(keyword)) {
        errors.push('Message contains prohibited content');
        break;
      }
    }
  }

  return errors;
};

// PDF generation function
const generateContactFormPDF = (formData, timestamp) => {
  return new Promise((resolve, reject) => {
    try {
      const { name, email, message, company, interest } = formData;

      // Using pdfmake with printer for consistency

      const currentDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        content: [
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'VISHNOREX', style: 'companyName', alignment: 'left' },
                  { text: 'Custom Software Solutions', style: 'tagline', alignment: 'left' },
                ],
              },
              {
                width: 'auto',
                stack: [
                  { text: 'CONTACT FORM SUBMISSION', style: 'documentTitle', alignment: 'right' },
                  { text: currentDate, style: 'dateText', alignment: 'right' },
                ],
              },
            ],
            margin: [0, 0, 0, 30],
          },
          // Submission Details
          { text: 'SUBMISSION DETAILS', style: 'sectionHeader' },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [{ text: 'Submission ID:', style: 'labelText' }, { text: timestamp.toString(), style: 'valueText' }],
                [{ text: 'Date & Time:', style: 'labelText' }, { text: currentDate, style: 'valueText' }],
              ],
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 20],
          },
          // Contact Info
          { text: 'CONTACT INFORMATION', style: 'sectionHeader' },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [{ text: 'Full Name:', style: 'labelText' }, { text: name, style: 'valueText' }],
                [{ text: 'Email Address:', style: 'labelText' }, { text: email, style: 'valueText' }],
                ...(company ? [[{ text: 'Company:', style: 'labelText' }, { text: company, style: 'valueText' }]] : []),
                ...(interest ? [[{ text: 'Service Interest:', style: 'labelText' }, { text: interest, style: 'valueText' }]] : []),
              ],
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 20],
          },
          // Message
          { text: 'MESSAGE', style: 'sectionHeader' },
          { text: message, style: 'messageText', margin: [0, 10, 0, 20] },
          // Footer note
          {
            text: [
              'This document was automatically generated by the Vishnorex contact form system on ',
              { text: currentDate, italics: true },
              '. For inquiries regarding this submission, please contact the sender directly using the provided email address.',
            ],
            style: 'footerText',
            margin: [0, 30, 0, 0],
          },
        ],
        styles: {
          companyName: { fontSize: 24, bold: true, color: '#162A80' },
          tagline: { fontSize: 10, color: '#666666', margin: [0, 2, 0, 0] },
          documentTitle: { fontSize: 14, bold: true, color: '#162A80' },
          dateText: { fontSize: 10, color: '#666666', margin: [0, 2, 0, 0] },
          sectionHeader: { fontSize: 14, bold: true, color: '#162A80', margin: [0, 20, 0, 10] },
          labelText: { fontSize: 11, bold: true, color: '#4a5568', margin: [0, 5, 0, 5] },
          valueText: { fontSize: 11, color: '#2d3748', margin: [0, 5, 0, 5] },
          messageText: { fontSize: 11, color: '#2d3748', lineHeight: 1.4, alignment: 'justify' },
          footerText: { fontSize: 9, color: '#666666', alignment: 'center', lineHeight: 1.3 },
        },
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

// Contact form submission route
app.post(['/contact', '/submit-contact'], async (req, res) => {
  console.log('Contact form submission received:', req.body);

  // Ensure we always send a JSON response
  let responseSent = false;
  const sendResponse = (statusCode, data) => {
    if (!responseSent) {
      responseSent = true;
      res.status(statusCode).json(data);
    }
  };

  try {
    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(req.body.name),
      email: sanitizeInput(req.body.email),
      message: sanitizeInput(req.body.message),
      company: sanitizeInput(req.body.company),
      interest: sanitizeInput(req.body.interest),
    };

    // Validation
    const validationErrors = validateFormData(sanitizedData);
    if (validationErrors.length > 0) {
      return sendResponse(400, { success: false, message: validationErrors.join('. '), errors: validationErrors });
    }

    const { name, email, message, company, interest } = sanitizedData;

    // Prepare email transport configuration
    const emailUser = process.env.EMAIL_USER || 'your-email@gmail.com';
    const emailPass = process.env.EMAIL_PASS || 'your-app-password';

    let transporterConfig;
    if (emailUser.includes('@gmail.com')) {
      transporterConfig = {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: emailUser, pass: emailPass },
      };
    } else if (
      emailUser.includes('@outlook.com') ||
      emailUser.includes('@hotmail.com') ||
      emailUser.includes('@live.com')
    ) {
      transporterConfig = {
        service: 'hotmail',
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: { user: emailUser, pass: emailPass },
      };
    } else if (process.env.SMTP_HOST) {
      transporterConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: emailUser, pass: emailPass },
      };
    } else {
      transporterConfig = {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: emailUser, pass: emailPass },
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    // Unique submission timestamp
    const timestamp = Date.now();

    // Current date string for email HTML body
    const currentDate = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Generate PDF buffer
    console.log('Generating PDF attachment...');
    const pdfBuffer = await generateContactFormPDF(sanitizedData, timestamp);
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Compose email with all details inside the body and PDF attached
    const mailOptions = {
      from: `"Vishnorex Contact Form" <${emailUser}>`,
      to: process.env.ADMIN_EMAIL || 'recipient@example.com',
      subject: `🔔 New Contact Form Submission - ${name} (${interest || 'General Inquiry'})`,
      html: `
        <h2>🔔 New Contact Form Submission</h2>
        <p><strong>Date & Time:</strong> ${currentDate}</p>

        <h3>Contact Details:</h3>
        <table cellpadding="6" border="0">
          <tr>
            <td><strong>Full Name</strong></td>
            <td>${name}</td>
          </tr>
          <tr>
            <td><strong>Email</strong></td>
            <td>${email}</td>
          </tr>
          ${company ? `<tr><td><strong>Company</strong></td><td>${company}</td></tr>` : ''}
          ${interest ? `<tr><td><strong>Service Interest</strong></td><td>${interest}</td></tr>` : ''}
        </table>

        <h3>Message:</h3>
        <div style="background:#f9f9f9;border:1px solid #eee;padding:12px;margin-bottom:16px;">
          ${message.replace(/\n/g, '<br>')}
        </div>

        <p>A PDF copy of this submission is attached for your records.</p>

        <hr>
        <p style="font-size:12px;color:#888;">
          This message was automatically generated by the Vishnorex contact form system.
        </p>
      `,
      attachments: [
        {
          filename: `ContactForm-${name.replace(/\s/g, '_')}-${timestamp}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Send email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Contact form email sent:', info.response);
      sendResponse(200, { success: true, message: 'Contact form submitted successfully' });
    } catch (emailError) {
      console.error('Error sending contact form email:', emailError);
      sendResponse(500, { success: false, message: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error handling contact form submission:', error);
    sendResponse(500, { success: false, message: 'Server error processing submission' });
  }
});

// PDF Download endpoint
app.post('/download-pdf', rateLimit, (req, res) => {
  console.log('PDF download request received:', req.body);

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

  // Generate unique filename for PDF
  const timestamp = Date.now();
  const pdfFilename = `contact-form-preview-${timestamp}.pdf`;

  // Generate PDF with enhanced formatting (same as email PDF)
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [50, 70, 50, 70],
    content: [
      // Header with company branding
      {
        columns: [
          {
            text: 'VISHNOREX',
            style: 'companyName',
            width: '*'
          },
          {
            text: `Preview ID: ${timestamp}`,
            style: 'submissionId',
            alignment: 'right',
            width: 'auto'
          }
        ],
        margin: [0, 0, 0, 20]
      },

      // Title
      {
        text: 'Contact Form Preview',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },

      // Generation date
      {
        text: `Generated on: ${new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })}`,
        style: 'subheader',
        alignment: 'center',
        margin: [0, 0, 0, 30]
      },

      // Contact Information Section
      {
        text: 'Contact Information',
        style: 'sectionHeader',
        margin: [0, 0, 0, 15]
      },
      {
        table: {
          widths: ['25%', '75%'],
          body: [
            [
              { text: 'Full Name:', style: 'fieldLabel' },
              { text: name || 'Not provided', style: 'fieldValue' }
            ],
            [
              { text: 'Email Address:', style: 'fieldLabel' },
              { text: email || 'Not provided', style: 'fieldValue' }
            ],
            [
              { text: 'Company:', style: 'fieldLabel' },
              { text: company || 'Not provided', style: 'fieldValue' }
            ],
            [
              { text: 'Service Interest:', style: 'fieldLabel' },
              { text: interest || 'Not specified', style: 'fieldValue' }
            ]
          ]
        },
        layout: {
          fillColor: function (rowIndex) {
            return (rowIndex % 2 === 0) ? '#f8fafc' : null;
          },
          hLineWidth: function (i, node) {
            return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
          },
          vLineWidth: function (i, node) {
            return (i === 0 || i === node.table.widths.length) ? 1 : 0.5;
          },
          hLineColor: function () {
            return '#e2e8f0';
          },
          vLineColor: function () {
            return '#e2e8f0';
          }
        },
        margin: [0, 0, 0, 25]
      },

      // Message Section
      {
        text: 'Message',
        style: 'sectionHeader',
        margin: [0, 0, 0, 15]
      },
      {
        table: {
          widths: ['100%'],
          body: [
            [{
              text: message || 'No message provided',
              style: 'messageText',
              margin: [10, 10, 10, 10]
            }]
          ]
        },
        layout: {
          fillColor: '#f8fafc',
          hLineWidth: 1,
          vLineWidth: 1,
          hLineColor: '#e2e8f0',
          vLineColor: '#e2e8f0'
        },
        margin: [0, 0, 0, 30]
      },

      // Footer
      {
        text: 'This is a preview document generated from the Vishnorex contact form. This is not a submitted form.',
        style: 'footer',
        alignment: 'center'
      }
    ],
    styles: {
      companyName: {
        fontSize: 16,
        bold: true,
        color: '#162A80',
        letterSpacing: 2
      },
      submissionId: {
        fontSize: 10,
        color: '#6b7280',
        italics: true
      },
      header: {
        fontSize: 24,
        bold: true,
        color: '#162A80',
        decoration: 'underline'
      },
      subheader: {
        fontSize: 12,
        color: '#6b7280',
        italics: true
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
        color: '#1e40af',
        decoration: 'underline'
      },
      fieldLabel: {
        fontSize: 12,
        bold: true,
        color: '#374151'
      },
      fieldValue: {
        fontSize: 12,
        color: '#111827'
      },
      messageText: {
        fontSize: 11,
        color: '#111827',
        lineHeight: 1.4
      },
      footer: {
        fontSize: 9,
        color: '#9ca3af',
        italics: true
      }
    }
  };

  try {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);

    // Pipe the PDF directly to the response
    pdfDoc.pipe(res);
    pdfDoc.end();

    console.log('PDF download completed successfully');

  } catch (error) {
    console.log('Error generating PDF for download:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF. Please try again.'
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(express.static('.'));
