const EmailService =  require("../services/Email/EmailService")
const {randomIntFromInterval, delay } = require("../utils/helper");

const startAutoReplyJob = async () => {
    try{
        const minWaitTime = 45; // in seconds
        const maxWaitTime = 120; // in seconds
        const emailServiceName = "google";
        while(true){

            const emailService = new EmailService(emailServiceName);
            await emailService.authorize();
            const labels = await emailService.getAllLabels();
            console.log("Label Ids: ",labels);
            console.log("Process start for auto replying to new threads");
            const test = await emailService.autoRespondToNewEmails();
            console.log("Process stop for auto replying to new threads");
            // console.log("Send Email Response: ",test);
            // const result = await emailService.fetchNewUnreadThreads();
            // console.log("Result: ",result);
            const waitTime = randomIntFromInterval(minWaitTime,maxWaitTime);
            console.log(`Waiting for ${waitTime} seconds before starting the next check`);
            await delay(waitTime*1000);

        }
    }catch(error){
        // Perform Error Handling Here
        console.log(`Error during starting the auto reply job. Error Message: ${error}`);
        throw error;
    }
    
}
module.exports = {
    startAutoReplyJob
}