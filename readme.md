# RabbitMQ amqplib RPC helper class (Reply-to)
## Instalation 

```bash
npm install amqplib
```

## Server side (Provider)

```javascript
const Provider = require("./provider")

new Provider({
  queue: "example4",
  
  // this function will reply consumers messages
  responseFn: async (message, reply) => {
    switch (message) {
        case "command1":
            return "Hi there!";
        break;
        case "command2":
            return {status: 200};
        break;
        default: 
            return {result: 404, reason: "not found command."};
        break;
    }
  },
}).connect("amqp://localhost");
```

Note you should use responseFn to reply the answer, if you don't wanna answer, just return nothing.

## Client side (Consumer)

```javascript
const Consumer = require("./consumer")

new Consumer({
  queue: "example4",
}).then((client) => {
  client
    .connect("amqp://localhost")
    .then((client) => {
      return client.send({ text: "hello" });
    })
    .then((response) => {
      console.log(response);
    });
});
```

### Express.js example

```bash
npm install express
```

```javascript
const express = require("express");
const app = express();
const Consumer = require("./consumer")

app.get("/test", async (req, res) => {
    const client = await new Consumer({
        queue: "example4"
    });
    
    // Send message and receive the answer from provider
    const response = await client.connect("amqp://localhost")
      .then((client) => client.send("hello"))
      .then(res);

    res.send(response);
})

app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});
```

### Advanced parameters:

- **queue**: *required.*, Set your queue.
- **correlationId**: Set correlation ID for receiver.
- **replyTo**: *required.* Client to receive reply from provider.
- **contentType**: "*application/json*" or "*application/textplain*", it used for format message, in any case it will do automatically.
- **responseType**: "application/json" or "application/textplain", it used for format message, in any case it will do automatically.
- **connectionAdress**: Connection adress, for example: ```amqp://localhost/```
