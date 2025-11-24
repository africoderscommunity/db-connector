// /hooks/useQueryDefaults.js
export default function useQueryDefaults({ queryText, type, setQueryText }) {
  if (queryText) return

  if (type === 'redis') setQueryText('GET mykey')
  else if (type === 'mongodb') setQueryText('db.users.find({})')
  else setQueryText('SELECT * FROM users LIMIT 10;')
}
