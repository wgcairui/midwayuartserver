const WebFramework = require('@midwayjs/koa').Framework;
const SocketFramework = require('@midwayjs/socketio').Framework

const web = new WebFramework().configure({
  port: 9010,
  hostname: "0.0.0.0"
});

const socket = new SocketFramework().configure({
  path: "/client",
  /* cors: {
    origin: "http://120.202.61.88:9010",
    methods: ["GET", "POST"]
  } */
})


const { Bootstrap } = require('@midwayjs/bootstrap');
Bootstrap
  .load(web)
  .load(socket)
  .run();
