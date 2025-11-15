import React, { useState } from 'react'
import { Book, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

const MONGO_QUERIES = {
  'Read Operations': [
    {
      name: 'Find All Documents',
      query: 'db.collection_name.find({})',
      description: 'Retrieve all documents from a collection',
    },
    {
      name: 'Find with Filter',
      query: 'db.collection_name.find({"field": "value"})',
      description: 'Find documents matching a condition',
    },
    {
      name: 'Find with Comparison',
      query: 'db.collection_name.find({"age": {"$gt": 25}})',
      description: 'Use operators: $gt, $lt, $gte, $lte, $ne, $in',
    },
    {
      name: 'Find One Document',
      query: 'db.collection_name.findOne({"_id": "507f1f77bcf86cd799439011"})',
      description: 'Get a single document',
    },
    {
      name: 'Find with Projection',
      query: 'db.collection_name.find({}, {"name": 1, "email": 1, "_id": 0})',
      description: 'Select specific fields (1 = include, 0 = exclude)',
    },
    {
      name: 'Find with AND',
      query:
        'db.collection_name.find({"age": {"$gt": 18}, "status": "active"})',
      description: 'Multiple conditions (implicit AND)',
    },
    {
      name: 'Find with OR',
      query:
        'db.collection_name.find({"$or": [{"age": {"$lt": 18}}, {"age": {"$gt": 65}}]})',
      description: 'OR conditions',
    },
  ],
  'Write Operations': [
    {
      name: 'Insert One',
      query:
        'db.collection_name.insertOne({"name": "John", "email": "john@example.com", "age": 30})',
      description: 'Insert a single document',
    },
    {
      name: 'Insert Many',
      query:
        'db.collection_name.insertMany([{"name": "Alice", "age": 25}, {"name": "Bob", "age": 30}])',
      description: 'Insert multiple documents',
    },
    {
      name: 'Update One',
      query:
        'db.collection_name.updateOne({"name": "John"}, {"$set": {"age": 31}})',
      description: 'Update first matching document',
    },
    {
      name: 'Update Many',
      query:
        'db.collection_name.updateMany({"status": "pending"}, {"$set": {"status": "active"}})',
      description: 'Update all matching documents',
    },
    {
      name: 'Increment Value',
      query:
        'db.collection_name.updateOne({"_id": "123"}, {"$inc": {"views": 1}})',
      description: 'Increment a numeric field',
    },
    {
      name: 'Push to Array',
      query:
        'db.collection_name.updateOne({"_id": "123"}, {"$push": {"tags": "new-tag"}})',
      description: 'Add item to array field',
    },
    {
      name: 'Delete One',
      query:
        'db.collection_name.deleteOne({"_id": "507f1f77bcf86cd799439011"})',
      description: 'Delete first matching document',
    },
    {
      name: 'Delete Many',
      query: 'db.collection_name.deleteMany({"status": "inactive"})',
      description: 'Delete all matching documents',
    },
  ],
  Aggregation: [
    {
      name: 'Count Documents',
      query: 'db.collection_name.countDocuments({"status": "active"})',
      description: 'Count documents matching filter',
    },
    {
      name: 'Group By',
      query:
        'db.collection_name.aggregate([{"$group": {"_id": "$city", "count": {"$sum": 1}}}])',
      description: 'Group documents and count',
    },
    {
      name: 'Group with Sum',
      query:
        'db.collection_name.aggregate([{"$group": {"_id": "$category", "total": {"$sum": "$price"}}}])',
      description: 'Group and sum values',
    },
    {
      name: 'Group with Average',
      query:
        'db.collection_name.aggregate([{"$group": {"_id": "$department", "avgSalary": {"$avg": "$salary"}}}])',
      description: 'Group and calculate average',
    },
    {
      name: 'Match and Group',
      query:
        'db.collection_name.aggregate([{"$match": {"status": "active"}}, {"$group": {"_id": "$city", "count": {"$sum": 1}}}])',
      description: 'Filter then group',
    },
    {
      name: 'Sort Results',
      query: 'db.collection_name.aggregate([{"$sort": {"createdAt": -1}}])',
      description: 'Sort documents (1 = asc, -1 = desc)',
    },
    {
      name: 'Distinct Values',
      query: 'db.collection_name.distinct("city", {"active": true})',
      description: 'Get unique values of a field',
    },
  ],
  'Advanced Queries': [
    {
      name: 'Text Search',
      query: 'db.collection_name.find({"$text": {"$search": "keyword"}})',
      description: 'Full-text search (requires text index)',
    },
    {
      name: 'Regex Search',
      query:
        'db.collection_name.find({"name": {"$regex": "^John", "$options": "i"}})',
      description: 'Pattern matching (i = case insensitive)',
    },
    {
      name: 'Array Contains',
      query: 'db.collection_name.find({"tags": "mongodb"})',
      description: 'Check if array contains value',
    },
    {
      name: 'Array Size',
      query: 'db.collection_name.find({"tags": {"$size": 3}})',
      description: 'Match arrays with specific length',
    },
    {
      name: 'Exists Check',
      query: 'db.collection_name.find({"email": {"$exists": true}})',
      description: 'Check if field exists',
    },
    {
      name: 'Lookup (Join)',
      query:
        'db.collection_name.aggregate([{"$lookup": {"from": "other_collection", "localField": "_id", "foreignField": "userId", "as": "user_data"}}])',
      description: 'Join with another collection',
    },
  ],
}

export default function MongoQueryHelper({ onSelectQuery, activeConnection }) {
  const [expandedCategories, setExpandedCategories] = useState({})
  const [copiedQuery, setCopiedQuery] = useState(null)

  // Only show for MongoDB connections
  if (!activeConnection || activeConnection.type !== 'mongodb') {
    return null
  }

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const handleCopyQuery = (query, index) => {
    navigator.clipboard.writeText(query)
    setCopiedQuery(index)
    setTimeout(() => setCopiedQuery(null), 2000)
  }

  const handleSelectQuery = (query) => {
    // Replace placeholder with actual collection name if available
    if (onSelectQuery) {
      onSelectQuery(query)
    }
  }

  return (
    <div className="bg-gray-800 border-r border-gray-700 w-80 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Book className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">
            MongoDB Query Helper
          </h2>
        </div>

        <div className="space-y-2">
          {Object.entries(MONGO_QUERIES).map(([category, queries]) => (
            <div
              key={category}
              className="border border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 bg-gray-750 hover:bg-gray-700 transition"
              >
                <span className="text-sm font-medium text-gray-300">
                  {category}
                </span>
                {expandedCategories[category] ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {expandedCategories[category] && (
                <div className="bg-gray-800 divide-y divide-gray-700">
                  {queries.map((item, idx) => {
                    const uniqueId = `${category}-${idx}`
                    return (
                      <div
                        key={idx}
                        className="p-3 hover:bg-gray-750 transition"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-sm font-medium text-blue-300">
                            {item.name}
                          </h4>
                          <button
                            onClick={() =>
                              handleCopyQuery(item.query, uniqueId)
                            }
                            className="p-1 hover:bg-gray-600 rounded"
                            title="Copy query"
                          >
                            {copiedQuery === uniqueId ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {item.description}
                        </p>
                        <code
                          onClick={() => handleSelectQuery(item.query)}
                          className="block text-xs bg-gray-900 p-2 rounded cursor-pointer hover:bg-gray-850 transition font-mono text-green-300 break-all"
                        >
                          {item.query}
                        </code>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Tips:</h3>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Click any query to insert it into the editor</li>
            <li>• Replace collection_name with your actual collection</li>
            <li>• Modify field names and values as needed</li>
            <li>• Queries are limited to 100 results</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
