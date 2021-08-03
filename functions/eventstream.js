//This functions subscribes to event stream update of tasks, and update the chat channel accordingly
exports.handler = async function (context, event, callback) {
  //Parse data from event stream
  const timestamp = event[0]["data"]["timestamp"];
  const payload = event[0]["data"]["payload"];
  const eventType = event[0]["data"]["payload"]["eventtype"];
  const taskattribute = event[0]["data"]["payload"]["task_attributes"];
  const obj = JSON.parse(taskattribute);
  const channelSID = obj["channelSid"];

  //Create Sync doc API call client
  const client = context.getTwilioClient();

  //constructing API response
  const response = new Twilio.Response();
  const responseBody = {
    success: false,
    payload: {
      errors: [],
    },
  };
  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST");
  response.appendHeader("Content-Type", "application/json");
  response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

  //Replace with your own syncServiceId
  const syncServiceSid = "IS3a7134931a45629601274a855b9642af";
  const syncDocumentName = "ChannelSIDIS" + channelSID;
  let findAMatch = false;

  //Get all docs from current sync service
  const docList = await client.sync.services(syncServiceSid).documents.list();

  //Compare the unique name from event stream with existing unique name of each doc
  docList.forEach(compareUniqueName);

  function compareUniqueName(value) {
    let uniqueName = value.uniqueName;
    if (syncDocumentName == uniqueName) {
      findAMatch = true;
    }
  }
  console.log("Find A Match value is " + findAMatch);

  if (findAMatch == true) {
    try {
      await client.sync
        .services(syncServiceSid)
        .documents(syncDocumentName)
        .update({
          data: {
            eventtype: eventType,
            timestamp: timestamp,
            taskattributes: taskattribute,
            channelsid: channelSID,
            msg: payload,
          },
          uniqueName: syncDocumentName,
        });
      responseBody.success = true;
      responseBody.payload.message = "Update the sync doc.";
    } catch (e) {
      console.error(e.message || e);
      responseBody.success = false;
      responseBody.payload.message =
        "There was a problems updating the sync doc.";
    }
  } else {
    try {
      await client.sync.services(syncServiceSid).documents.create({
        data: {
          eventtype: eventType,
          timestamp: timestamp,
          taskattributes: taskattribute,
          channelsid: channelSID,
          msg: payload,
        },
        uniqueName: syncDocumentName,
      });
      responseBody.success = true;
      responseBody.payload.message = "Create the sync doc.";
      console.log("create sync doc");
    } catch (e) {
      console.error(e.message || e);
      responseBody.success = false;
      responseBody.payload.message =
        "There was a problem creating the sync doc";
    }
  }
  console.log("Responsebody" + responseBody.payload.message);
  response.setBody(responseBody);
  return callback(null, response);
};
