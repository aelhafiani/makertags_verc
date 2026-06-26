const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  // Parse the form data from the request body
  const { name, email, message } = JSON.parse(event.body);

  // Configure the Nodemailer transport with your professional email
  let transporter = nodemailer.createTransport({

    host: "smtp.zoho.com",  
    port: 587, // Use 587 for TLS
  secure: false, // false for TLS, true for SSL
    auth: {
      user: "contact@tagprintly.com",
      pass: "aJjt5w@r1",
    }

  });

  transporter.verify(function (error, success) { 
    if (error) {
      console.log('server error',error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  // Email content
  const mailOptions = {
    from: 'contact@tagprintly.com', // Must match GoDaddy's authorized email
    replyTo: email, // Sender's email for replies
    to: 'contact@tagprintly.com', // Your professional email address
    subject: `Contact Form Submission from ${name}`,
    text: `You have a new contact form submission from ${name} (${email}):\n\n${message}`,
  };


  try {
    // Send email
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent successfully!" }),
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send email" }),
    };
  }
}; 
