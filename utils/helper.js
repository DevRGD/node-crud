export const buildScopeQuery = (req, query = {}) => {
  const { scope, _id: userId } = req.user;
  if (scope === 'own') query.user = userId;
  return query;
};
