import mongoose from 'mongoose';

export type DatabaseStatus = 'connected' | 'connecting' | 'disconnected';

/** Lets the API report on the connection without importing Mongoose itself. */
export function databaseStatus(): DatabaseStatus {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    default:
      return 'disconnected';
  }
}

export function isDatabaseConnected(): boolean {
  return databaseStatus() === 'connected';
}
