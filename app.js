require('dotenv').config();
const { startAutoReplyJob } = require('./controller/AutoReplyController');
// Here the express server is configured and all other configurations are done which are required at the global level in the app.

// Starting the auto reply job.
startAutoReplyJob();