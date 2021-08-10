import { DefaultConfig } from "@midwayjs/typegoose"

export const mongoose: DefaultConfig = {
    uri: `mongodb://192.168.1.126:27017/UartServer`,
    options: {
        dbName: "UartServer",
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    }
}