import { ConnectOptions } from 'mongoose';

export const mongoose = {
  uri: 'mongodb://127.0.0.1:27017/UartServer',
  options: {
    dbName: 'UartServer',
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  } as ConnectOptions,
};
