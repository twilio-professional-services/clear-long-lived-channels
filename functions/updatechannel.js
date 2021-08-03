exports.handler = async function (context, event, callback) {
  //Constructing Twilio API client
  const { ACCOUNT_SID, AUTH_TOKEN } = context;
  const client = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

  const response = new Twilio.Response();

  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST");
  response.appendHeader("Content-Type", "application/json");
  response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

  //Replace with your own syncService and chatService ID
  const syncService = "IS3a7134931a45629601274a855b9642af";
  const chatService = "IS14251c39981a41308cb433978ab8624d";
  let documents;
  let channel;
  let channelUpdate;

  //Logic to fetch all documents from this sync service
  try {
    documents = await client.sync.services(syncService).documents.list();
  } catch (e) {
    console.error(`Error finding sync doc!`);
    throw e;
  }

  //TODO: using Map to reduce latency
  //TODO: identify the channel depends on last updated timestamp
  for (element of documents) {
    const data = element["data"];
    const eventType = data["eventtype"];
    const channelSid = data["channelsid"];
    if (eventType == "task.completed") {
      try {
        channel = await client.chat
          .services(chatService)
          .channels(channelSid)
          .fetch();
      } catch (e) {
        console.log("problems fetching the channel");
        throw e;
      }

      const channelAttributes = JSON.parse(channel.attributes);
      channelAttributes.long_lived = false;
      channelAttributes.status = "INACTIVE";
      channelUpdate = {
        attributes: JSON.stringify(channelAttributes),
      };
    }
    try {
      await client.chat
        .services(chatService)
        .channels(channelSid)
        .update(channelUpdate);

      response.setBody("Updated channels to short lived");
    } catch (e) {
      console.log("Error update the channel");
      response.setBody("Error updating channel to short lived");
      throw e;
    }
  }

  return callback(null, response);
};
