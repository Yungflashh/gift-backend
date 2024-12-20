const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 5000;

app.use(cors()); // Allow all origins by default
app.use(bodyParser.json()); // Body parser middleware

// Simple OTP storage (in-memory for demo purposes)
let otpStorage = {}; // Store OTPs with associated timestamps

// Setup email transporter using nodemailer (use your own email service configuration)
const transporter = nodemailer.createTransport({
  service: "gmail",  // Change to your email service (e.g., Gmail, SendGrid)
  auth: {
    user: "kayskidadenusi@gmail.com",  // Replace with your email
    pass: "lmotnckyffktjfbs",   // Replace with your email password
  },
});

// Route to send OTP (modified for resend functionality)
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Check if an OTP already exists and is still valid
  if (otpStorage[email]) {
    const { timestamp } = otpStorage[email];
    const otpExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

    // If OTP is still valid, don't generate a new one, just resend it
    if (Date.now() - timestamp < otpExpirationTime) {
      try {
        await transporter.sendMail({
          from: "kayskidadenusi@gmail.com",
          to: email,
          subject: "Your OTP Code",
          text: `Your OTP code is: ${otpStorage[email].otp}`,
        });

        return res.status(200).json({ message: "OTP resent successfully" });
      } catch (error) {
        console.error("Error in sending OTP:", error);
        return res.status(500).json({ message: "Error resending OTP" });
      }
    }
  }

  // If OTP doesn't exist or has expired, generate a new OTP
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a new 6-digit OTP
  otpStorage[email] = { otp, timestamp: Date.now() }; // Store OTP and timestamp for expiration

  try {
    // Send new OTP email
    await transporter.sendMail({
      from: "kayskidadenusi@gmail.com",
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
    });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error in sending OTP:", error);  // Log the full error
    res.status(500).json({ message: "Error sending OTP" });
  }
});

// Route to verify OTP (no change in this part)
app.post("/api/verify-otp", (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: "OTP is required" });
  }

  // Iterate through the stored OTPs to check if any matches
  const email = Object.keys(otpStorage).find(email => otpStorage[email].otp === parseInt(otp));

  if (!email) {
    return res.status(400).json({ success: false, message: "OTP not found or invalid" });
  }

  const storedOtpData = otpStorage[email];
  console.log("Stored OTP Data: ", storedOtpData); // Debug log to verify stored OTP data

  const { otp: storedOtp, timestamp } = storedOtpData;

  // Check if the OTP is expired (e.g., expire after 5 minutes)
  const otpExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  if (Date.now() - timestamp > otpExpirationTime) {
    delete otpStorage[email]; // Remove expired OTP
    return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
  }

  // Verify OTP
  if (parseInt(otp) === storedOtp) {
    console.log("OTP verified successfully.");
    delete otpStorage[email]; // OTP is consumed, delete it from storage
    return res.status(200).json({ success: true, message: "OTP verified successfully." });
  } else {
    console.log("OTP verification failed.");
    return res.status(400).json({ success: false, message: "Invalid OTP." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
