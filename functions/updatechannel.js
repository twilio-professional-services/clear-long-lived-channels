
// This is your new function. To start, set the name and path on the left.

exports.handler = async function(context, event, callback) {
  const {
    ACCOUNT_SID, 
    AUTH_TOKEN,
  } = context;
  const client = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);
  
  const response = new Twilio.Response();
  
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST');
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const syncService = 'IS3a7134931a45629601274a855b9642af';
  const chatService = 'IS14251c39981a41308cb433978ab8624d';
  let documents;
  let channel;
  let channelUpdate;
  
  //logic to find current channel 
  try {
    documents = await client.sync.services(syncService)
           .documents
           .list({limit: 20})
    
  } catch(e){
    console.error(`Error finding sync doc!`);
    throw e;
  }
  
  for (const element of documents) {
    let data = element['data'];
    console.log("This is data" + data);
    let eventType = data['eventtype'];
    let channelSid = data['channelsid'];
    if (eventType == "task.completed") {
      try {
         channel = await client
           .chat
          .services(chatService)
          .channels(channelSid)
          .fetch()
      } catch(e){
           console.log("problems fetching the channel")
           throw e;
      }
      
      let channelAttributes = JSON.parse(channel.attributes);
      channelAttributes.long_lived = false;
      channelAttributes.status = "INACTIVE";
      channelUpdate = {
         attributes: JSON.stringify(channelAttributes)}
    }
       try {
         await client.chat.services(chatService)
                .channels(channelSid)
                .update(channelUpdate)
         
       } catch(e){
         console.log("Error update the channel");
         throw e;
       }
  }
  
  response.setBody("Updated channel to short lived");
  return callback(null, response);
};