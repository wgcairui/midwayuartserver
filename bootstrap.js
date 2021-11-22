const WebFramework = require('@midwayjs/koa').Framework;
const SocketFramework = require('@midwayjs/socketio').Framework;
const WebSocket = require("@midwayjs/ws").Framework

const web = new WebFramework().configure({
  port: 9010,
  hostname: '0.0.0.0',
});

const socket = new SocketFramework().configure({
  path: '/client',
  /* cors: {
    origin: "http://120.202.61.88:9010",
    methods: ["GET", "POST"]
  } */
});

const ws = new WebSocket().configure({
  path:"/ws"
})

const { Bootstrap } = require('@midwayjs/bootstrap');
Bootstrap
.load(web)
.load(socket)
.load(ws)
.run();
