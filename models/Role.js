import { Schema, model } from 'mongoose';

const permissionSchema = new Schema(
  {
    method: { type: String, enum: ['GET', 'POST', 'PATCH', 'DELETE', 'ALL'], required: true },
    path: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    permissions: [permissionSchema],
  },
  { timestamps: true },
);

const Role = model('roles', roleSchema);

export default Role;
