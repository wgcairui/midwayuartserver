const WebFramework = require('@midwayjs/koa').Framework;
const SocketFramework = require('@midwayjs/socketio').Framework
const WsFramework = require('@midwayjs/ws').Framework

const web = new WebFramework().configure({
  port: 9010,
});

const socket = new SocketFramework().configure({
  path: "/client",
  /* cors: {
    origin: "http://120.202.61.88:9010",
    methods: ["GET", "POST"]
  } */
})

const ws = new WsFramework().configure({
  path: '/wx',
})

const { Bootstrap } = require('@midwayjs/bootstrap');
Bootstrap
  .load(web)
  .load(socket)
  //.load(ws)
  .run();
