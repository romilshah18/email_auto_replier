const { EmailClients } = require('../../constants/EmailClientsConstants')
const GmailService  = require ('./GmailService');
const { google } = require('googleapis');

class EmailService {    
    constructor(emailServiceName){  
        
        switch(emailServiceName){
            case EmailClients.GOOGLE:
                this.emailService = new GmailService();
                break;
            default:
                throw Error('Invalid email service name.');
        }
    }
    async authorize(){
        const auth  = await this.emailService.authorize();
        this.emailClient = google.gmail({version: 'v1', auth});
    }
    async getAllLabels(){
        return await this.emailService.getAllLabels(this.emailClient);
    }
    async getNewUnreadThreads(labelId){
        const allThread = await this.emailService.getNewUnreadThreads(this.emailClient, labelId);
        return allThread;
    }
    async modifyThread(threadId, labelIds){
        return await this.emailService.modifyThread(this.emailClient, threadId, labelIds);
    }
    async getFirstMessageOfThread(threadId){
        if(!threadId){
            throw Error("Thread Id cannot be null or empty. Please send a valid threadId value.");
        }
        return await this.emailService.getFirstMessageOfThread(this.emailClient, threadId);
    }
    async getSenderDataFromMessage(messageDetails){
        if(!messageDetails){
            throw Error("Message Details cannot be null or empty. Please send a valid messageDetails Object");
        }
        return await this.emailService.getSenderDataFromMessage(this.emailClient,messageDetails);
    }
    async sendEmail(threadId, message, receiver){
        return await this.emailService.sendEmail(this.emailClient, threadId, message, receiver);
    }
    async createNewLabel(labelName){
        return await this.emailService.createNewLabel(this.emailClient,labelName);
    }
    async addAutoReplyReplyToThread(threadId,message,receiver) {
        await this.sendEmail(threadId, message, receiver);
    }

    async autoRespondToNewEmails(){
        try{
            const allLabels = await this.getAllLabels();
            let labelDetails = null;
            for(const label of allLabels){
                if(label.name == process.env.AUTO_REPLY_LABEL_NAME){
                    labelDetails =  label;
                    break;
                }
            }
            if(!labelDetails){
                labelDetails = await this.createNewLabel(process.env.AUTO_REPLY_LABEL_NAME);
            }
            const unreadThreads = await this.getNewUnreadThreads(labelDetails.id);
            for(const thread of unreadThreads){
                const threadId = thread.id;
                const firstThreadMessage = await this.getFirstMessageOfThread(thread?.id);
                const senderEmail = await this.getSenderDataFromMessage(firstThreadMessage);
                const message = "This is an auto reply from NODE JS application for Listed Assignment.";
                await this.addAutoReplyReplyToThread(threadId,message,senderEmail);
                await this.modifyThread(threadId, [labelDetails.id]);
            }
        }catch(error){
            console.log("Error occured while autoResponding emails to unread threads. Error Message:",error);
        }
        
    } 
};
module.exports = EmailService;