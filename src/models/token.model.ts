import mongoose, { Model, Schema } from 'mongoose';
import { IToken } from '../types/IToken';
import toJSON from './plugins/toJSON.plugin';
import { tokenTypes } from '../config/tokens';

const tokenSchema = new mongoose.Schema<IToken>(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: function(this: IToken) {
        // Require user ID for all token types except EMAIL_LOGIN
        return this.type !== tokenTypes.EMAIL_LOGIN;
      },
    },
    email: {
      type: String,
      required: function(this: IToken) {
        // Require email for EMAIL_LOGIN tokens
        return this.type === tokenTypes.EMAIL_LOGIN;
      },
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: [tokenTypes.REFRESH, tokenTypes.RESET_PASSWORD, tokenTypes.VERIFY_EMAIL, tokenTypes.EMAIL_LOGIN],
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
tokenSchema.plugin(toJSON);

const Token = mongoose.model<IToken>('Token', tokenSchema);

export default Token;