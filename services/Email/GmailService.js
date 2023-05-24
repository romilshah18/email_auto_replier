const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');
const { encode } = require ('js-base64');

const SCOPES = ['https://mail.google.com/'];
class GmailService {

    async loadSavedCredentialsIfExist(tokenPath) {
        try {
          const content = await fs.readFile(tokenPath);
          const credentials = JSON.parse(content);
          return google.auth.fromJSON(credentials);
        } catch (err) {
          return null;
        }
    }
      
    /**
     * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
     *
     * @param {OAuth2Client} client
     * @return {Promise<void>}
     */
    async saveCredentials(client,credentialsPath,tokenPath) {
        const content = await fs.readFile(credentialsPath);
        const keys = JSON.parse(content);
        const key = keys.installed || keys.web;
        const payload = JSON.stringify({
            type: 'authorized_user',
            client_id: key.client_id,
            client_secret: key.client_secret,
            refresh_token: client.credentials.refresh_token,
        });
        await fs.writeFile(tokenPath, payload);
    }
      
    /**
     * Load or request or authorization to call APIs.
     *
     */
    async authorize() {
        const tokenPath = process.env.TOKEN_PATH;
        const credentialsPath = process.env.CREDENTIALS_PATH;
        let client = await this.loadSavedCredentialsIfExist(tokenPath);
        if (client) {
            return client;
        }
        client = await authenticate({
            scopes: SCOPES,
            keyfilePath: credentialsPath,
        });
        if (client.credentials) {
            await this.saveCredentials(client,credentialsPath, tokenPath);
        }
        return client;
    }

    /**
     * Lists the labels in the user's account.
     *
     * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
     */
    async getAllLabels(gmail) {
        const res = await gmail.users.labels.list({
            userId: 'me',
        });
        const labels = res.data.labels;
        if (!labels || labels.length === 0) {
            console.log('No labels found.');
            return;
        }
        return labels;
    }
    async getAllLabelIds(gmail){
        const allLabels = await this.getAllLabels(gmail);
        return allLabels.map((label)=>label.id);
    }

    async getNewUnreadThreads(gmail, labelId){
        // TODO: IMPLEMENT PAGINATION IN THIS API
        const unreadThreadsList = [];
        const threadsList = await gmail.users.threads.list({
            userId: 'me',
            // Filtering out those threads which are already applied.
            q:`label:{-${process.env.AUTO_REPLY_LABEL_NAME}} after:2023/5/22`,
        })
        const allThreads = threadsList?.data?.threads ? threadsList?.data?.threads : [];
        for(const thread of allThreads){
            const threadDetails = await this.getThreadDetails(gmail, thread.id);
            const threadMessages = threadDetails.data.messages;
            let isSkip = false;
            for(const message of threadMessages){
                const messageLabelIds = message.labelIds;
                const filterMessages = messageLabelIds.filter((messageLabelId)=>messageLabelId==labelId);
                if(filterMessages && filterMessages.length>0){
                    isSkip = true;
                    break;
                }
            }
            if(!isSkip){
                unreadThreadsList.push(thread);
            }
        }
        return unreadThreadsList;
    }

    async getThreadDetails(gmail, threadId){
        const threadDetails = await gmail.users.threads.get({
            id: threadId,
            userId: 'me'
        });
        return threadDetails;
    }

    async getFirstMessageOfThread(gmail, threadId){
        const threadDetails = await this.getThreadDetails(gmail, threadId);
        return threadDetails?.data?.messages[0];
    }
    async getMessageMetaDataDetails(gmail,messageId){
        // const gmail = google.gmail({version: 'v1', auth});

        const messageDetails = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'METADATA',
            metadataHeaders: [
                'Subject',
                'Message-ID',
                'From'
            ]
        });
        return messageDetails;
    }
    async getSenderDataFromMessage(gmail, messageDetails){
       
        if(messageDetails){
            const messageMetaDataDetails = await this.getMessageMetaDataDetails(gmail, messageDetails.id);
            const data = {};
            for(const headers of messageMetaDataDetails?.data?.payload?.headers){
                if(headers.name == "From"){
                    data.senderEmail = headers.value;
                }else if(headers.name == "Subject"){
                    data.subject = "Re: "+headers.value;
                }else if(headers.name == "References"){
                    data.references = headers.value;
                }else if(headers.name == "In-Reply-To"){
                    data.inReplyTo = headers.value;
                }else if(headers.name == "Message-ID"){
                    data.messageId = headers.value;
                }
            }
            return data;
        }
        throw new Error("Message Details not found. Please send valid message details.");
    }
    async modifyThread(gmail, threadId, labelIds){
        const modifyData = {
            id: threadId,
            userId: 'me',
            // requestBody: {
            //     addLabelIds: [
            //         labelIds
            //     ]
            // }
        }
        if(labelIds && labelIds.length>0){
            modifyData.requestBody = {};
            modifyData.requestBody.addLabelIds = labelIds;
        }
        const result = await gmail.users.threads.modify(modifyData);
        return result;
    }
    async sendEmail(gmail, threadId, message, receiver){
        const rawMessage = 
`From: Romil Shah <romilshah1545@gmail.com> 
To: ${receiver.senderEmail}
In-Reply-To: ${receiver.messageId}
References: ${receiver.messageId}
Subject: ${receiver.subject}

${message}`;

        const encodedMessage = encode(rawMessage, true);
        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {  
                threadId: threadId,
                raw: encodedMessage
            }
        });
    }

    async createNewLabel(gmail, labelName){
        const labelDetails  = await gmail.users.labels.create({
            userId: 'me',
            requestBody:{
                name: labelName,
                messageListVisibility: 'show',
                labelListVisibility: 'labelShow',
                type: 'user'
            }
        })
        return labelDetails;
    }
}
module.exports = GmailService;