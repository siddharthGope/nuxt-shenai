// Single source of truth for the member id used by both the Shen.AI SDK's
// local memory and the local SQLite store.
export const useCurrentUser = () => {
  const userId = useState('currentUserId', () => 'user123')

  return { userId }
}
