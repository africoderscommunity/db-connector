// /utils/editorHelpers.js
import { sql } from '@codemirror/lang-sql'
import { javascript } from '@codemirror/lang-javascript'

export const getEditorLanguage = (type) => {
  if (type === 'redis') return javascript()
  if (type === 'mongodb') return javascript()
  return sql()
}

export const getEditorLabel = (type) => {
  if (type === 'redis') return 'Redis Command'
  if (type === 'mongodb') return 'MongoDB Query'
  return 'SQL Query'
}

export const getPlaceholder = (type) => {
  if (type === 'redis') return 'GET user:123 or HGETALL session:abc'
  if (type === 'mongodb') return "db.collection.find({ status: 'active' })"
  return 'SELECT * FROM users WHERE id = 1;'
}
