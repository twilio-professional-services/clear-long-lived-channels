# Initiating Outbound SMS From Flex and keeping the chat channel long_lived

The functions in this repository provide support for initiating outbound SMS - either as an agent, via a Task (see `functions\flex-initiate-outbound-sms-task.js`) or as an external system or any other fire-and-forget message sending source (see `functions\flex-initiate-outbound-sms.js`. **NOTE:** This README presently only covers the Task creation approach, but the other function is very similar and just doesn't use a Task Flex Flow.

When creating the Flex flow before calling the function above, setting the LongLived to true will make every channel created from the Flex flow stay long lived, which means even after the agent wraps up and completes the task, the next time when a customer writes to the same number, a new task will be created, but all the chat history from this channel will be retained - https://github.com/twilio-professional-services/function-flex-outbound-sms/blob/master/README.md#create-direct-to-task-flex-flow

Using long-lived Chat Channels, while helpful for the agent experience, could present problems with security and performance at scale. Learn more about scaling and securing a chat application to learn more about useful considerations for maintaining long-lived Chat Channels. Hence this github repo will introduce the design to clean these chat channels.

## Example Use Cases for cleanning long-lived chat channel

1. When agent initiates outbound SMS message, and doesn't hear back from the customer for a long period of time (i.e several days), the agent closes the task in Flex UI. Sometime after the agent does that, you might want to consider to reset this channel and remove the long lived setting.
2. When agent initiates outbound SMS message, the customer responds late but still within the time before you reset the channel. For example, your design is to reset the channel two days after the agent closes the task, and the customer replies 1 day after task closing. In that case, you might want to reset the timestamp, and only consider to reset the channel to short lived sometime after the agent closes the task next time.
3. By resetting the channel to LongLived = false, and status = inactive. Next time when the customer or the agent communicates using the same phone numbers, a new task will be created with new chat channel, the chat history will not show up in the Flex message canvas. However, since the channel was deleted, there's still a way to retrieve the chat history through API call. If you would like to delete the channel completely instead of setting it to inactive, you can consider to use the channel delete API instead- https://www.twilio.com/docs/chat/rest/channel-resource.

# Twilio Function: update the channel task status to Twilio Sync Document

## Overview

This function serves as a webhook endpoint and listen to Twilio event stream updates to receive the latest status of the channel, including task status and the corresponding timestamp. After receiving these data from event stream in real time, the function will create or update the document under Twilio Sync. In this design, one chat channel SID relates one document in Twilio Sync Service, upcoming task status update will only update the Sync Doc if it already exists without creating new document.

## Register to event stream

Event Streams is an API that allows you to tap into a unified stream of every interaction sent or received on Twilio.

We are using the function URL as a webhook endpoint, so creating a webhook sink:

twilio api:events:v1:sinks:create --description <add sink description here> \
--sink-configuration '{"destination":"${your webhook endpoint}","method":"${POST or GET}","batch_events":${true or false}}' \
--sink-type webhook

Keep the Sink ID once the Sink is created successfully, and register the Sink to listen to task router events:
https://www.twilio.com/docs/events/event-types#taskrouter

For task wraps and completes, we need the following events:
com.twilio.taskrouter.task.completed
com.twilio.taskrouter.task.wrapup

For new task creation, we need this event:
com.twilio.taskrouter.task.created

Sample SINK and Event registration commands:

twilio api:events:v1:sinks:create --description webhookfortask \
--sink-configuration '{"destination":"https://webhookeventstream-5008.twil.io/eventstream","method":"POST”, ”batch_events":true}’ \
--sink-type webhook

twilio api:events:v1:subscriptions:create --description "all messages" --sink-sid DG7b3791ffc9ff8**\*\*** --types '{"type":"com.twilio.taskrouter.task.created","schema_version":1}'

## Create Sync Doc

Try to fetch the Sync Doc by the doc's unique name, here we use prefix + Channel SID. If an existing Sync Doc with the Channel SID related to the task from event stream doesn't exist, we will use this API to create a new Sync Doc.

https://www.twilio.com/docs/sync/api/document-resource

## Update Sync doc

When a Sync Doc already exists after calling the fetch API, we can update the same Sync Doc when there's a new task router event.

# Twilio function: read Sync Doc and clean channel periodically using batch API call

The Twilio function (updatechannel.js) servers the purpose of reading the current Sync Document, finding out the document with the chat channel of which eventtype equals "task.completed" and the timestamp matches the requirement (for example current time is two days after task.complete).

Then the function will look up the channel, find out the current channel attribute, and then update it with

channelAttributes.long_lived = false;
channelAttributes.status = "INACTIVE";

After resetting this channel attribute, next time when a customer texts the number, or agent initiates outbound SMS with the same customer's phone number, a new channel will be created. Since the new channel is created using the same long-lived Flex Flow, this channel will be long-lived from the beginning.
