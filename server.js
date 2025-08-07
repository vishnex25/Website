// Client-side JavaScript for contact form handling (to be included in your HTML)

document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.getElementById('contact-form');
  const downloadPdfBtn = document.getElementById('download-pdf-btn');

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

    return errors;
  };

  // Show notification function
  function showNotification(message, type = 'info', duration = 6000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    });

    const notification = document.createElement('div');
    const isMobile = window.innerWidth < 768;

    notification.className = `notification fixed z-[200] rounded-lg shadow-2xl transform transition-all duration-500 ease-in-out ${
      isMobile ? 'top-4 left-4 right-4 translate-y-[-100px] opacity-0' : 'top-4 right-4 max-w-md translate-x-full'
    }`;

    // Enhanced styling based on type
    let bgClasses, textColor, icon;
    switch (type) {
      case 'success':
        bgClasses = ['bg-gradient-to-r', 'from-green-500', 'to-green-600'];
        textColor = 'text-white';
        icon = `
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        `;
        break;
      case 'error':
        bgClasses = ['bg-gradient-to-r', 'from-red-500', 'to-red-600'];
        textColor = 'text-white';
        icon = `
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        `;
        break;
      default:
        bgClasses = ['bg-gradient-to-r', 'from-blue-500', 'to-blue-600'];
        textColor = 'text-white';
        icon = `
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        `;
    }

    notification.classList.add(...bgClasses, textColor, 'border-l-4', 'border-opacity-50');
    notification.classList.add(type === 'success' ? 'border-green-400' : 
                             type === 'error' ? 'border-red-400' : 'border-blue-400');

    notification.innerHTML = `
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0 mr-3">
            ${icon}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium leading-5 break-words">${message}</p>
          </div>
          <div class="ml-4 flex-shrink-0">
            <button class="inline-flex text-white hover:text-gray-200 focus:outline-none focus:text-gray-200 transition-colors duration-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      if (isMobile) {
        notification.classList.remove('translate-y-[-100px]', 'opacity-0');
        notification.classList.add('translate-y-0', 'opacity-100');
      } else {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
      }
    }, 100);

    // Close button handler
    notification.querySelector('button').addEventListener('click', () => {
      if (isMobile) {
        notification.style.transform = 'translateY(-100px)';
        notification.style.opacity = '0';
      } else {
        notification.style.transform = 'translateX(100%)';
      }
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    });

    // Auto remove after specified duration
    setTimeout(() => {
      if (isMobile) {
        notification.style.transform = 'translateY(-100px)';
        notification.style.opacity = '0';
      } else {
        notification.style.transform = 'translateX(100%)';
      }
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 500);
    }, duration);
  }

  // Function to update PDF download button state
  function updatePdfDownloadButton() {
    if (!contactForm || !downloadPdfBtn) return;
    
    const name = contactForm.querySelector('[name="name"]').value.trim();
    const email = contactForm.querySelector('[name="email"]').value.trim();
    const message = contactForm.querySelector('[name="message"]').value.trim();
    
    const isFormValid = name.length >= 2 && 
                       email.includes('@') && 
                       email.includes('.') &&
                       message.length >= 10;
    
    if (downloadPdfBtn) {
      downloadPdfBtn.disabled = !isFormValid;
      const helpText = downloadPdfBtn.parentNode.querySelector('p');
      if (helpText) {
        helpText.textContent = isFormValid ? 
          'Click to download a PDF copy of your submission' : 
          'Fill out the form to enable PDF download';
      }
    }
  }

  // Generate client-side PDF using jsPDF
  function generateClientPDF(formData) {
    // Load jsPDF library dynamically if not already loaded
    if (typeof jsPDF === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        // Once loaded, call the function again
        generateClientPDF(formData);
      };
      document.head.appendChild(script);
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const timestamp = Date.now();
    const currentDate = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Add logo or title
    doc.setFontSize(24);
    doc.setTextColor(22, 42, 128); // #162A80
    doc.text('VISHNOREX', 20, 30);
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text('Custom Software Solutions', 20, 36);

    // Document title and date
    doc.setFontSize(14);
    doc.setTextColor(22, 42, 128);
    doc.text('CONTACT FORM SUBMISSION', 160, 30, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text(currentDate, 160, 36, { align: 'right' });

    // Submission details
    doc.setFontSize(14);
    doc.setTextColor(22, 42, 128);
    doc.text('SUBMISSION DETAILS', 20, 50);
    doc.setFontSize(11);
    doc.setTextColor(74, 85, 104);
    doc.text('Submission ID:', 20, 60);
    doc.setTextColor(45, 55, 72);
    doc.text(timestamp.toString(), 60, 60);
    doc.setTextColor(74, 85, 104);
    doc.text('Date & Time:', 20, 66);
    doc.setTextColor(45, 55, 72);
    doc.text(currentDate, 60, 66);

    // Contact information
    doc.setFontSize(14);
    doc.setTextColor(22, 42, 128);
    doc.text('CONTACT INFORMATION', 20, 80);
    
    doc.setFontSize(11);
    doc.setTextColor(74, 85, 104);
    doc.text('Full Name:', 20, 90);
    doc.setTextColor(45, 55, 72);
    doc.text(formData.name, 60, 90);
    
    doc.setTextColor(74, 85, 104);
    doc.text('Email Address:', 20, 96);
    doc.setTextColor(45, 55, 72);
    doc.text(formData.email, 60, 96);
    
    if (formData.company) {
      doc.setTextColor(74, 85, 104);
      doc.text('Company:', 20, 102);
      doc.setTextColor(45, 55, 72);
      doc.text(formData.company, 60, 102);
    }
    
    if (formData.interest) {
      doc.setTextColor(74, 85, 104);
      doc.text('Service Interest:', 20, 108);
      doc.setTextColor(45, 55, 72);
      doc.text(formData.interest, 60, 108);
    }

    // Message
    doc.setFontSize(14);
    doc.setTextColor(22, 42, 128);
    doc.text('MESSAGE', 20, 122);
    
    doc.setFontSize(11);
    doc.setTextColor(45, 55, 72);
    const messageLines = doc.splitTextToSize(formData.message, 170);
    doc.text(messageLines, 20, 132);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.text('This document was automatically generated by the Vishnorex contact form system.', 105, 280, { align: 'center' });
    doc.text('For inquiries regarding this submission, please contact the sender directly using the provided email address.', 105, 285, { align: 'center' });

    // Save the PDF
    doc.save(`Vishnorex_Contact_Form_${timestamp}.pdf`);
  }

  // Handle form submission
  if (contactForm) {
    // Add input listeners for PDF button state
    const formFields = contactForm.querySelectorAll('input, textarea, select');
    formFields.forEach(field => {
      field.addEventListener('input', updatePdfDownloadButton);
      field.addEventListener('change', updatePdfDownloadButton);
    });

    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const submitButton = contactForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;

      // Get form data
      const formData = {
        name: sanitizeInput(contactForm.querySelector('[name="name"]').value),
        email: sanitizeInput(contactForm.querySelector('[name="email"]').value),
        message: sanitizeInput(contactForm.querySelector('[name="message"]').value),
        company: sanitizeInput(contactForm.querySelector('[name="company"]').value),
        interest: sanitizeInput(contactForm.querySelector('[name="interest"]').value)
      };

      // Validate form data
      const validationErrors = validateFormData(formData);
      if (validationErrors.length > 0) {
        showNotification(validationErrors.join('. '), 'error');
        return;
      }

      // Show loading state
      submitButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Sending...
      `;
      submitButton.disabled = true;

      try {
        // Send data to server
        const response = await fetch('/submit-contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          showNotification('🎉 Thank you! Your message has been sent successfully. We\'ll get back to you soon.', 'success');
          contactForm.reset();
        } else {
          showNotification(result.message || 'There was an error sending your message. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          showNotification('Network error. Please check your connection and try again.', 'error');
        } else {
          showNotification('There was an error sending your message. Please try again later.', 'error');
        }
      } finally {
        // Reset button state
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
        updatePdfDownloadButton();
      }
    });
  }

  // Handle PDF download button
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', function() {
      if (!contactForm) return;
      
      const formData = {
        name: sanitizeInput(contactForm.querySelector('[name="name"]').value),
        email: sanitizeInput(contactForm.querySelector('[name="email"]').value),
        message: sanitizeInput(contactForm.querySelector('[name="message"]').value),
        company: sanitizeInput(contactForm.querySelector('[name="company"]').value),
        interest: sanitizeInput(contactForm.querySelector('[name="interest"]').value)
      };

      // Validate form data
      const validationErrors = validateFormData(formData);
      if (validationErrors.length > 0) {
        showNotification('Please fill out all required fields correctly before downloading PDF.', 'error');
        return;
      }

      // Show loading state
      const originalText = downloadPdfBtn.innerHTML;
      downloadPdfBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Generating PDF...
      `;
      downloadPdfBtn.disabled = true;

      try {
        generateClientPDF(formData);
        showNotification('📄 PDF downloaded successfully!', 'success');
      } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Error generating PDF. Please try again.', 'error');
      } finally {
        // Reset button state
        downloadPdfBtn.innerHTML = originalText;
        updatePdfDownloadButton();
      }
    });
  }

  // Initialize PDF button state
  updatePdfDownloadButton();
});