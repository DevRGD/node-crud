import { Schema, model } from 'mongoose';

const permission = new Schema(
  {
    role: { type: String, enum: ['superadmin', 'admin', 'manager', 'user'], default: 'user', trim: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permissions: [
      {
        method: { type: String, enum: ['GET', 'POST', 'PATCH', 'DELETE', 'ALL'], required: true },
        path: { type: String, required: true },
        isEnabled: { type: Boolean, default: true },
        scope: { type: String, enum: ['own', 'all'], default: 'own' },
      },
    ],
  },
  { timestamps: true },
);

const Permission = model('permissions', permission);

export default Permission;
