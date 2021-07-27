// This is your new function. To start, set the name and path on the left.

exports.handler = async function (context, event, callback) {
  // Here's an example of setting up some TWiML to respond to with this function
  const timestamp = event[0]["data"]["timestamp"];
  const payload = event[0]["data"]["payload"];
  const eventType = event[0]["data"]["payload"]["eventtype"];
  const taskattribute = event[0]["data"]["payload"]["task_attributes"];
  const obj = JSON.parse(taskattribute);
  const channelSID = obj["channelSid"];

  //Create Sync doc
  const client = context.getTwilioClient();

  //construncting API response
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

  const syncServiceSid = "IS3a7134931a45629601274a855b9642af";
  const syncDocumentName = "ChannelSIDIS" + channelSID;

  let updatePromises = [];
  try {
    let syncDoc = await client.sync
      .services(syncServiceSid)
      .documents("ChannelSIDIS" + channelSID)
      .fetch();

    updatePromises.push(
      client.sync
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
        })
    );

    Promise.all(updatePromises);
    responseBody.success = true;
    responseBody.payload.message = "Update the sync doc.";
  } catch (e) {
    updatePromises.push(
      client.sync.services(syncServiceSid).documents.create({
        data: {
          eventtype: eventType,
          timestamp: timestamp,
          taskattributes: taskattribute,
          channelsid: channelSID,
          msg: payload,
        },
        uniqueName: syncDocumentName,
      })
    );

    Promise.all(updatePromises);

    console.error(e.message || e);

    response.setStatusCode(e.status || 200);

    responseBody.success = true;
    responseBody.payload.message = "Created sync doc.";
  }
  response.setBody(responseBody);
  return callback(null, response);
};
