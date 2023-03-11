class Consumer {
  constructor(options) {
    // additional packages
    this.amqp = require("amqplib");
    this.EventEmitter = require("events");
    this.uuid = require("uuid");

    // client id
    this.correlationId = options.correlationId || this.uuid.v4();
    this.channel = null;

    // options
    this.connectionAdress = options.connectionAdress || null;
    this.connection = null;
    this.queue = options.queue || "";
    this.replyTo = options.replyTo || "amq.rabbitmq.reply-to";
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

    // If provided adress to connect, connect and return available methods
    if (this.connectionAdress) {
      return this.connect(this.connectionAdress);
    }

    return new Promise((resolve) => resolve(this));
  }

  async connect(connection_adress) {
    return this.amqp
      .connect(connection_adress)
      .then((connection) => {
        this.connectionAdress = connection_adress;
        this.connection = connection;
        this.channel = connection.createChannel();

        return new Promise((resolve) => resolve(this.channel));
      })
      .then((channel) => {
        this.channel = channel;
        this.channel.responseEmitter = new this.EventEmitter();
        this.channel.responseEmitter.setMaxListeners(0);

        this.channel.consume(
          this.replyTo,

          (msg) => {
            this.channel.responseEmitter.emit(
              msg.properties.correlationId,
              this.responseType === "application/json"
                ? Buffer.from(
                    JSON.stringify(msg.content.toString("utf8"))
                  ).toJSON()
                : Buffer.from(msg.content).toString("utf8")
            );
          },
          { noAck: true }
        );

        return this;
      });
  }

  async send(message) {
    if (typeof message === "object") this.contentType = "application/json";

    message =
      this.contentType === "application/json"
        ? Buffer.from(JSON.stringify(message))
        : Buffer.from(message);

    return new Promise((resolve) => {
      this.channel.responseEmitter.once(this.correlationId, resolve);
      this.channel.sendToQueue(this.queue, message, {
        correlationId: this.correlationId,
        replyTo: this.replyTo,
      });
    });
  }
}

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
