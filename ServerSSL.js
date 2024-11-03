const https = require('https');
const axios = require('axios');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');
const dns = require('dns');
require('dotenv').config();  // Load environment variables from .env file

const maillist = [
  'e-mail_1',
  'e-mail_2',
  // e-mail_n
];

let retryCount = 0;
const maxRetries = 3;
const retryDelay = 5000;  // 5 seconds delay between retries

// Function to check if the server is reachable via DNS
const isServerReachable = (hostname) => {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err) => {
      if (err) {
        reject('DNS lookup failed.');
      } else {
        resolve(true);
      }
    });
  });
};

// Function to fetch and extract the fingerprint from the web page
const getFingerprintFromWeb = async () => {
  try {
    const response = await axios.get('http://xxxxxxxxxxxxxxxxxxxxxxxxxxx');
    const rawFingerprint = response.data.trim();

    // Add colons to the fingerprint if needed
    const formattedFingerprint = rawFingerprint.replace(/\s/g, ':');
    
    return formattedFingerprint;
  } catch (error) {
    console.error('Error fetching fingerprint from web:', error.message);
    return null;
  }
};

// Function to fetch fingerprint from the Firebase server
const fetchFingerprint = (hostname) => {
  return new Promise(async (resolve, reject) => {
    try {
      await isServerReachable(hostname);  // Check if the server is reachable before the request
    } catch (error) {
      reject(error);  // Fail early if DNS resolution fails
      return;
    }

    const options = {
      hostname: hostname,
      port: 443,
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 10000, // Set a timeout of 10 seconds
      agent: false,  // Disable keep-alive to ensure fresh connection on each request
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      if (cert && cert.fingerprint) {
        // console.log('Fetched fingerprint:', cert.fingerprint);
        resolve(cert.fingerprint);
      } else {
        reject('No certificate or fingerprint found.');
      }
    });

    req.on('timeout', () => {
      req.abort();  // Abort request on timeout
      reject('Request timed out.');
    });

    req.on('error', (e) => {
      reject(`Request error: ${e.message}`);
    });

    req.end();
  });
};

// Compare the fingerprints
const compareFingerprints = async () => {
  try {
    const webFingerprint = await getFingerprintFromWeb();
    console.log(`Web Fingerprint: ${webFingerprint}`);

    const fetchedFingerprint = await fetchFingerprint('xxxxx.firebaseio.com');  // Replace xxxxx.firebaseio.com with your actual Firebase URL.
    console.log(`Fetched Fingerprint: ${fetchedFingerprint}`);

    if (webFingerprint === fetchedFingerprint) {
      console.log('Fingerprints match!');
    } else {
      console.log('Fingerprints do not match.');
      await sendEmail();
    }
  } catch (error) {
    console.error('Error comparing fingerprints:', error);
    if (retryCount < maxRetries) {
      retryCount++;
      console.log(`Retrying... (${retryCount}/${maxRetries})`);
      setTimeout(compareFingerprints, retryDelay);  // Delay between retries
    } else {
      console.log('Max retry limit reached. Aborting.');
    }
  }
};

// Send email notification
async function sendEmail() {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: '"E-MAIL"',
    to: maillist,
    subject: "SSL Fingerprint is changed, please check it ... !!",
    html: `
      <p>Please check the SSL Fingerprint</p>
      <p>Thanks :)</p>
    `,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Schedule the job to run every 45 minutes
schedule.scheduleJob('*/45 * * * *', () => {
  console.log('Running fingerprint check every 30 minutes...');
  retryCount = 0;  // Reset retry count for each new run
  compareFingerprints();
});
