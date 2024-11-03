# Testing-Fingerprint-Authentication-for-Firebase-with-Node.js

-- The main purpose of running this server is to check every 45 minutes whether the fingerprint has changed. The issue causing fingerprint differences is related to the fact that not all connected units are yet able to save data to Firebase and control the system due to remote communication interruptions.

-- Since the server performs a check every 45 minutes, if it detects a fingerprint change, it will send an email to the technical manager. The manager can then take the necessary steps to adjust the fingerprint by following the steps outlined in the SSL certificate update guide.
