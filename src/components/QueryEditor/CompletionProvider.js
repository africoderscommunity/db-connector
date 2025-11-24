// /components/QueryEditor/CompletionProvider.js
import { autocompletion } from "@codemirror/autocomplete"
import { redisKeywords, mongoKeywords, sqlKeywords } from "../../utils/queryKeywords"

export default function CompletionProvider(schemaMetadata, type) {
  return autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/\w*/)
        if (!word || (word.from === word.to && !context.explicit)) return null

        const schemaItems = []

        if (schemaMetadata) {
          Object.entries(schemaMetadata).forEach(([table, cols]) => {
            schemaItems.push({
              label: table,
              type: "table",
              info: `${cols.length} columns`,
            })
            cols.forEach((c) =>
              schemaItems.push({
                label: c,
                type: "field",
                info: `Column in ${table}`,
              })
            )
          })
        }

        let keywords =
          type === "redis"
            ? redisKeywords
            : type === "mongodb"
            ? mongoKeywords
            : sqlKeywords

        return {
          from: word.from,
          options: [
            ...keywords.map((kw) => ({ label: kw, type: "keyword" })),
            ...schemaItems,
          ],
        }
      },
    ],
  })
}
