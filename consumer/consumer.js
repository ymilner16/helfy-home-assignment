// consumer.js

// connect to kafka broker
const { Kafka } = require('kafkajs');
const kafka = new Kafka({
  clientId: 'consumer-app',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

// create the consumer instance
const consumer = kafka.consumer({ groupId: 'monitoring-group' });

// run the consumer
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'user-activity', fromBeginning: false });
  console.log('Consumer connected and subscribed to topic: user-activity');
  // listen for messages
  await consumer.eachMessage(async ({ message }) => {
    if (!message.value) return;
    const payload = JSON.parse(message.value.toString());

    const {before, after, op} = payload || {};
    let operationType = '';
    if (op === 'c') {
      operationType = 'INSERT';
    }
    if (op === 'u') {
      operationType = 'UPDATE';
    }
    if (op === 'd') {
      operationType = 'DELETE';
    }
// log the structured message to console
    const structuredLog = {
        timestamp: new Date().toISOString(),
        eventSource: 'MYSQL',
        operationType: operationType,
        dataBefore: before,
        dataAfter: after
    };
    console.log(JSON.stringify(structuredLog, null, 2));
    });
};
// start the consumer
run().catch(console.error);