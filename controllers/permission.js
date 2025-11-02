import Permission from '../models/Permission.js';
import { isValidObjectId } from 'mongoose';

export const list = async (req, res) => {
  if (req.user.scope !== 'all') {
    return res
      .status(403)
      .json({ success: false, message: 'Forbidden: You do not have "all" scope for this resource.' });
  }

  try {
    const permissions = await Permission.find().populate('user', 'name email');

    res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const update = async (req, res) => {
  if (req.user.scope !== 'all') {
    return res
      .status(403)
      .json({ success: false, message: 'Forbidden: You do not have "all" scope for this resource.' });
  }

  const { id: userId } = req.params;
  const { role, permissions } = req.body;

  if (!isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  if (!role || !Array.isArray(permissions)) {
    return res
      .status(400)
      .json({ success: false, message: 'Missing required fields: "role" and "permissions" array.' });
  }

  try {
    const updatedPermissionDoc = await Permission.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          role: role,
          permissions: permissions,
        },
      },
      { new: true, runValidators: true },
    ).populate('user', 'name email');

    if (!updatedPermissionDoc) {
      return res.status(404).json({ success: false, message: 'Permission document not found for this user.' });
    }

    res.status(200).json({ success: true, data: updatedPermissionDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const role = async (req, res) => {
  if (req.user.scope !== 'all') {
    return res
      .status(403)
      .json({ success: false, message: 'Forbidden: You do not have "all" scope for this resource.' });
  }

  const { roleName } = req.params;
  const { method, path, isEnabled, scope } = req.body;

  if (!method || !path) {
    return res.status(400).json({ success: false, message: 'Missing required fields: "method" and "path".' });
  }

  const updates = {};
  if (isEnabled !== undefined) updates['permissions.$[elem].isEnabled'] = isEnabled;
  if (scope) updates['permissions.$[elem].scope'] = scope;

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: 'No updates provided. Must provide "isEnabled" or "scope".' });
  }

  try {
    const result = await Permission.updateMany(
      { role: roleName },
      { $set: updates },
      { arrayFilters: [{ 'elem.method': method, 'elem.path': path }] },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: `No users found with role "${roleName}".` });
    }

    res.status(200).json({
      success: true,
      message: `Permissions updated for ${result.modifiedCount} of ${result.matchedCount} users with role "${roleName}".`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
