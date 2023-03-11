class Provider {
  constructor(options) {
    this.amqp = require("amqplib");

    this.queue = options.queue || "";
    this.channel = null;
    this.correlationId = options.correlationId;
    this.connectionAdress = options.connectionAdress || null;
    this.connection = null;
    this.contentType = options.contentType
      ? options.contentType == "application/json"
        ? "application/json"
        : "application/textplain"
      : "application/textplain";
    this.responseType = options.contentType
      ? options.contentType == "application/json"
        ? "application/json"
        : "application/textplain"
      : "application/textplain";
    this.responseFn = options.responseFn;
  }

  async connect(connection_adress) {
    return this.amqp
      .connect(connection_adress)
      .then((connection) => {
        this.channel = connection.createChannel();
        return new Promise((resolve) => resolve(this.channel));
      })
      .then((channel) => {
        this.channel = channel;

        return this.channel.assertQueue(this.queue).then(() => {
          return this.channel.consume(this.queue, async (msg) => {
            var message;

            if (msg !== null) {
              const isJson = (str) => {
                try {
                  JSON.parse(str);
                } catch (e) {
                  return false;
                }

                return true;
              };

              message = isJson(
                (message = Buffer.from(
                  JSON.stringify(msg.content.toString("utf8"))
                ).toJSON())
              )
                ? (message = Buffer.from(
                    JSON.stringify(msg.content.toString("utf8"))
                  ).toJSON())
                : Buffer.from(msg.content).toString("utf8");

              const getResponse = await this.responseFn(
                message,
                msg.properties.correlationId
              );
              if (getResponse != undefined) {
                this.channel.sendToQueue(
                  msg.properties.replyTo,
                  typeof getResponse === "object"
                    ? Buffer.from(JSON.stringify(getResponse))
                    : Buffer.from(getResponse),
                  {
                    correlationId: msg.properties.correlationId,
                  }
                );

                this.channel.ack(msg);
              }
            }
          });
        });
      });
  }
}

new Provider({
  queue: "example4",
  responseFn: async (message, reply) => {
    switch (message) {
        case "command1":
            return "Hi there!"
        break;
        case "command2":
            return {status: 200}
        break;
        default: 
            return {result: 404, reason: "not found command."}
        break;
    }
  },
}).connect("amqp://localhost");
